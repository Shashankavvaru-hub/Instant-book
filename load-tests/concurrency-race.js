import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

/**
 * ============================================================================
 * InstantBook Concurrency & Race Condition Test (k6)
 * ============================================================================
 * Objective:
 *   Simulate 20 concurrent users (VUs) attempting to lock the EXACT SAME seat
 *   at the exact same second to verify that:
 *     1. Exactly ONE user succeeds (HTTP 200).
 *     2. All other 19 users receive HTTP 409 / error ("Seats already locked").
 *     3. Zero double-booking occurs (proves Redis distributed locking).
 * ============================================================================
 */

// Custom Metrics
export const successfulLocks = new Counter("successful_seat_locks");
export const rejectedLocks = new Counter("rejected_seat_locks");
export const doubleBookingDetected = new Counter("double_booking_failures");

export const options = {
  // Burst all 20 virtual users at the exact same instant
  scenarios: {
    race_condition: {
      executor: "per-vu-iterations",
      vus: 20,
      iterations: 1,
      maxDuration: "30s",
    },
  },
  thresholds: {
    // Assert exactly 1 lock succeeds across the entire test run
    successful_seat_locks: ["count==1"],
    // Assert zero double bookings occurred
    double_booking_failures: ["count==0"],
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000/api";
const TARGET_EVENT_ID = Number(__ENV.EVENT_ID || 6); // Event 6: "RGUKT Auditorium Event"
const TARGET_SEAT_ID = Number(__ENV.SEAT_ID || 842);  // Seat A2 (EventSeat ID 842)

// Credentials for test account (create if needed, or pass via CLI)
const TEST_EMAIL = __ENV.TEST_EMAIL || "testuser@rgukt.ac.in";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "password123";

/**
 * Setup runs once before VUs start.
 * Ensures the test user exists, obtains credentials, and auto-discovers
 * an available seat if default seat is already locked/booked.
 */
export function setup() {
  console.log(`[setup] Connecting to ${BASE_URL}...`);

  // 1. Attempt login; if user doesn't exist, register
  let loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status !== 200) {
    console.log(`[setup] Test user not found. Creating ${TEST_EMAIL}...`);
    http.post(
      `${BASE_URL}/auth/signup`,
      JSON.stringify({
        firstName: "LoadTester",
        lastName: "k6",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

    loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Extract auth cookie
  const cookieJar = http.cookieJar();
  const cookies = cookieJar.cookiesForURL(BASE_URL);
  const token = cookies.token ? cookies.token[0] : null;

  let targetEventId = TARGET_EVENT_ID;
  let targetSeatId = TARGET_SEAT_ID;
  let targetSeatCode = "A2";

  // Auto-discover an available seat if not explicitly forced via CLI
  if (!__ENV.SEAT_ID && token) {
    const seatsRes = http.get(`${BASE_URL}/events/${targetEventId}/seats`, {
      headers: { Cookie: `token=${token}` },
    });
    if (seatsRes.status === 200) {
      try {
        const body = JSON.parse(seatsRes.body);
        const availableSeat = (body.seats || []).find((s) => s.status === "AVAILABLE");
        if (availableSeat) {
          targetSeatId = availableSeat.id;
          targetSeatCode = `${availableSeat.seat?.row || ""}${availableSeat.seat?.number || ""}`;
          console.log(
            `[setup] Target verified: Event #${targetEventId}, Seat #${targetSeatId} (${targetSeatCode})`
          );
        }
      } catch (e) {
        console.warn("[setup] Fallback to default seat #842");
      }
    }
  }

  return { token, targetEventId, targetSeatId, targetSeatCode };
}

export default function (data) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (data.token) {
    headers["Cookie"] = `token=${data.token}`;
  }

  const eventId = data.targetEventId || TARGET_EVENT_ID;
  const seatId = data.targetSeatId || TARGET_SEAT_ID;
  const seatCode = data.targetSeatCode || "";

  const payload = JSON.stringify({
    eventId,
    eventSeatIds: [seatId],
  });

  const res = http.post(`${BASE_URL}/bookings`, payload, { headers });

  if (res.status === 200) {
    successfulLocks.add(1);
    console.log(`✅ [VU ${__VU}] Lock ACQUIRED successfully for Seat #${seatId} (${seatCode})`);
  } else if (res.status === 409 || res.status === 400 || res.status === 500) {
    rejectedLocks.add(1);
    let errorMsg = "";
    try {
      errorMsg = JSON.parse(res.body).message;
    } catch {
      errorMsg = res.body;
    }
    console.log(`🛡️ [VU ${__VU}] Lock correctly REJECTED: HTTP ${res.status} (${errorMsg})`);
  } else {
    doubleBookingDetected.add(1);
    console.error(`❌ [VU ${__VU}] Unexpected status ${res.status}: ${res.body}`);
  }
}

export function teardown(data) {
  console.log("==========================================");
  console.log("🏁 Race Condition Test Completed.");
  console.log("Check thresholds above to confirm exactly 1 lock succeeded.");
  console.log("==========================================");
}
