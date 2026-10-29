import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

/**
 * ============================================================================
 * InstantBook 1,000 Requests Read & Browsing Benchmark (k6)
 * ============================================================================
 * Objective:
 *   Execute exactly 1,000 requests across 50 concurrent Virtual Users browsing
 *   events and fetching full seat matrices (375 seats per event).
 * ============================================================================
 */

const eventListDuration = new Trend("event_list_duration");
const seatMapDuration = new Trend("seat_map_duration");
const errorRate = new Rate("error_rate");

export const options = {
  scenarios: {
    thousand_reads: {
      executor: "shared-iterations",
      vus: 50,
      iterations: 1000,
      maxDuration: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],          // Error rate under 1%
    http_req_duration: ["p(95)<250"],        // 95% of requests under 250ms
    event_list_duration: ["p(95)<150"],      // Event listing p95 < 150ms
    seat_map_duration: ["p(95)<300"],        // Seat map p95 < 300ms
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000/api";
const EVENT_ID = __ENV.EVENT_ID || "6";

export function setup() {
  const cookieJar = http.cookieJar();
  http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: "testuser@rgukt.ac.in", password: "password123" }),
    { headers: { "Content-Type": "application/json" } }
  );

  const cookies = cookieJar.cookiesForURL(BASE_URL);
  const token = cookies.token ? cookies.token[0] : null;

  return { token };
}

export default function (data) {
  const headers = { "Content-Type": "application/json" };
  if (data.token) {
    headers["Cookie"] = `token=${data.token}`;
  }

  // Alternate between fetching event listing and seat matrix
  if (__ITER % 2 === 0) {
    const res = http.get(`${BASE_URL}/events`, { headers });
    eventListDuration.add(res.timings.duration);
    const ok = check(res, { "status 200": (r) => r.status === 200 });
    errorRate.add(!ok);
  } else {
    const res = http.get(`${BASE_URL}/events/${EVENT_ID}/seats`, { headers });
    seatMapDuration.add(res.timings.duration);
    const ok = check(res, {
      "status 200": (r) => r.status === 200,
      "has seats": (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).seats);
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  }
}

export function teardown() {
  console.log("==========================================");
  console.log("🏁 1,000 Reads Benchmark Completed");
  console.log("==========================================");
}
