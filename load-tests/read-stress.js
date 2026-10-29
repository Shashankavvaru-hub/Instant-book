import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

/**
 * ============================================================================
 * InstantBook Read Stress & Load Test (k6)
 * ============================================================================
 * Objective:
 *   Simulate realistic traffic ramping up to 100 concurrent users browsing:
 *     1. GET /api/events (Event list)
 *     2. GET /api/events/:id (Event detail)
 *     3. GET /api/events/:id/seats (Live seat map)
 *
 * Metrics & SLA Thresholds:
 *   - 95% of requests must complete in under 300ms (p95 < 300ms)
 *   - HTTP Failure rate must stay below 1%
 * ============================================================================
 */

const eventListDuration = new Trend("event_list_duration");
const seatMapDuration = new Trend("seat_map_duration");
const errorRate = new Rate("error_rate");

export const options = {
  stages: [
    { duration: "15s", target: 20 },  // Ramp-up to 20 users
    { duration: "30s", target: 50 },  // Scale to 50 users
    { duration: "30s", target: 100 }, // Peak load: 100 concurrent users
    { duration: "15s", target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],          // Less than 1% errors
    http_req_duration: ["p(95)<300"],        // 95% of all requests under 300ms
    event_list_duration: ["p(95)<200"],      // Event listing p95 < 200ms
    seat_map_duration: ["p(95)<350"],        // Seat map p95 < 350ms
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000/api";
const EVENT_ID = __ENV.EVENT_ID || "6";

export function setup() {
  // Login or sign up a user to obtain token for authenticated endpoints like /seats
  const res = http.post(
    `${BASE_URL}/auth/signup`,
    JSON.stringify({
      firstName: "Stress",
      lastName: "Tester",
      email: `stresstester_${Date.now()}@rgukt.ac.in`,
      password: "password123",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(BASE_URL);
  const token = cookies.token ? cookies.token[0] : null;

  return { token };
}

export default function (data) {
  const headers = { "Content-Type": "application/json" };
  if (data.token) {
    headers["Cookie"] = `token=${data.token}`;
  }

  // 1. Browse all events
  const resEvents = http.get(`${BASE_URL}/events`, { headers });
  eventListDuration.add(resEvents.timings.duration);
  const okEvents = check(resEvents, {
    "events status 200": (r) => r.status === 200,
  });
  errorRate.add(!okEvents);

  sleep(1);

  // 2. Fetch specific event detail
  const resDetail = http.get(`${BASE_URL}/events/${EVENT_ID}`, { headers });
  check(resDetail, {
    "event detail status 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Fetch seat matrix (simulating user opening the seat map)
  const resSeats = http.get(`${BASE_URL}/events/${EVENT_ID}/seats`, { headers });
  seatMapDuration.add(resSeats.timings.duration);
  const okSeats = check(resSeats, {
    "seats status 200": (r) => r.status === 200,
    "has seats array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.seats);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!okSeats);

  sleep(1 + Math.random() * 2); // Random think time between 1-3 seconds
}
