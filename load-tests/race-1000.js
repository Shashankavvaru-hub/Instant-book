import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

/**
 * ============================================================================
 * InstantBook 1,000 Request Concurrency & Race Collision Test (k6)
 * ============================================================================
 * Objective:
 *   Fire exactly 1,000 rapid requests across 50 concurrent Virtual Users (VUs)
 *   targeting the exact same seat on Event #6 to verify:
 *     1. Exactly ONE request succeeds (HTTP 200).
 *     2. Exactly 999 requests are rejected with HTTP 409 Conflict.
 *     3. ZERO double bookings occur under 1,000 requests.
 * ============================================================================
 */

export const successfulLocks = new Counter("successful_seat_locks");
export const rejectedLocks = new Counter("rejected_seat_locks");
export const doubleBookingDetected = new Counter("double_booking_failures");

export const options = {
  scenarios: {
    thousand_requests_race: {
      executor: "shared-iterations",
      vus: 50,             // 50 concurrent users
      iterations: 1000,    // exactly 1,000 total requests
      maxDuration: "1m",
    },
  },
  thresholds: {
    // Assert exactly 1 lock succeeds across all 1,000 requests
    successful_seat_locks: ["count==1"],
    // Assert zero double bookings occurred
    double_booking_failures: ["count==0"],
    // Assert 999 requests were correctly blocked
    rejected_seat_locks: ["count==999"],
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000/api";
const TARGET_EVENT_ID = Number(__ENV.EVENT_ID || 6);
const TARGET_SEAT_ID = Number(__ENV.SEAT_ID || 846); // Seat A6

const TEST_EMAIL = __ENV.TEST_EMAIL || "testuser@rgukt.ac.in";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "password123";

export function setup() {
  console.log(`[setup] Connecting to ${BASE_URL}...`);

  let loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (loginRes.status !== 200) {
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

  const cookieJar = http.cookieJar();
  const cookies = cookieJar.cookiesForURL(BASE_URL);
  const token = cookies.token ? cookies.token[0] : null;

  let targetEventId = TARGET_EVENT_ID;
  let targetSeatId = TARGET_SEAT_ID;
  let targetSeatCode = "A6";

  // Auto-discover the first currently AVAILABLE seat for Event 6
  if (token) {
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
            `[setup] 🎯 Target Seat verified: Event #${targetEventId}, Seat #${targetSeatId} (${targetSeatCode})`
          );
        }
      } catch (e) {
        console.warn("[setup] Fallback to default target seat");
      }
    }
  }

  return { token, targetEventId, targetSeatId, targetSeatCode };
}

export default function (data) {
  const headers = { "Content-Type": "application/json" };
  if (data.token) {
    headers["Cookie"] = `token=${data.token}`;
  }

  const payload = JSON.stringify({
    eventId: data.targetEventId || TARGET_EVENT_ID,
    eventSeatIds: [data.targetSeatId || TARGET_SEAT_ID],
  });

  const res = http.post(`${BASE_URL}/bookings`, payload, { headers });

  if (res.status === 200) {
    successfulLocks.add(1);
    console.log(`✅ [Req #${__ITER + 1} | VU ${__VU}] Lock ACQUIRED for Seat #${data.targetSeatId}`);
  } else if (res.status === 409 || res.status === 400) {
    rejectedLocks.add(1);
  } else {
    doubleBookingDetected.add(1);
    console.error(`❌ [VU ${__VU}] Unexpected status ${res.status}: ${res.body}`);
  }
}

export function teardown(data) {
  console.log("==================================================");
  console.log("🏁 1,000-Request Concurrency Collision Test Finished");
  console.log("All 1,000 requests processed against single seat.");
  console.log("==================================================");
}
