# Load test results

Status: NOT EXECUTED for this milestone. No throughput, concurrency percentile or error-rate claim is made.

Existing20-request sequential loopback timing samples in `.qa/api-timings.json` are latency smoke checks, not load tests. Browser tests running concurrently also do not establish traffic capacity.

Required authorized local/staging scenarios: concurrent name searches, deduplicated market requests under source delay, version-conflicting build/composition writes, guild RSVPs and database/cache outage recovery. Record dataset, workers, duration, request rate, p50/p95/p99, errors, CPU/memory and connection use. External Albion/Discord load testing is prohibited. Do not run an unbounded test against production or a shared user database.
