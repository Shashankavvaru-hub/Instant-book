# InstantBook — k6 Performance & Concurrency Testing

This directory contains automated **k6** load and stress testing scripts tailored specifically to validate InstantBook's core architectural claim: **zero double bookings under high-concurrency race conditions**.

---

## 1. Prerequisites: Installing k6 on Windows

Open PowerShell or Command Prompt:

### Option A: Via Windows Package Manager (winget) — Recommended
```powershell
winget install k6 --source winget
```

### Option B: Via Chocolatey
```powershell
choco install k6
```

### Verify Installation
```powershell
k6 version
```

---

## 2. Test Scenarios

### Test 1: Concurrency & Double-Booking Race Condition (`concurrency-race.js`)
- **What it does**: Bursts 20 Virtual Users (VUs) simultaneously against `POST /api/bookings` targeting the **exact same seat** at the same millisecond.
- **Assertion**:
  - Exactly **1 user** obtains `HTTP 200` (`successful_seat_locks == 1`).
  - The other **19 users** receive `HTTP 409 Conflict` (`rejected_seat_locks == 19`).
  - Zero double bookings occur (`double_booking_failures == 0`).

#### Run Command:
```powershell
# Defaults to Event 6 (RGUKT Auditorium Event), Seat 842 (A2) with automatic fallback discovery
k6 run load-tests/concurrency-race.js

# Or pass custom Event/Seat IDs explicitly:
k6 run -e EVENT_ID=6 -e SEAT_ID=842 load-tests/concurrency-race.js
```

---

### Test 2: Read & Polling Stress Test (`read-stress.js`)
- **What it does**: Ramps up traffic from 20 to 100 concurrent users browsing event listings and polling live seat maps (`GET /api/events` and `GET /api/events/:id/seats`).
- **SLAs Verified**:
  - `http_req_duration`: 95th percentile under 300ms (`p(95) < 300ms`).
  - `http_req_failed`: Error rate lower than 1% (`rate < 0.01`).

#### Run Command:
```powershell
k6 run load-tests/read-stress.js
```

---

## 3. Interpreting k6 Results

When the test completes, k6 displays a terminal dashboard:

- **`http_req_duration`**: Response time breakdown (avg, min, med, max, p90, p95).
- **`http_req_failed`**: Percentage of requests that failed.
- **`successful_seat_locks`**: Custom counter verifying only 1 lock succeeded.
- **`✓ / ✗` thresholds**: If all checks pass green `✓`, your concurrency engine is 100% resilient.
