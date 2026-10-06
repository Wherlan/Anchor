import { test } from "node:test"
import assert from "node:assert/strict"
import { recordRateLimitFailure, clearRateLimit } from "../src/lib/rate-limit"

test("allows up to the limit then blocks", () => {
  clearRateLimit("t1")
  for (let i = 0; i < 3; i += 1) assert.equal(recordRateLimitFailure("t1", 3, 60_000).allowed, true)
  const blocked = recordRateLimitFailure("t1", 3, 60_000)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSeconds >= 1)
  clearRateLimit("t1")
})

test("keys are independent and clearing resets", () => {
  clearRateLimit("a")
  clearRateLimit("b")
  for (let i = 0; i < 4; i += 1) recordRateLimitFailure("a", 3, 60_000)
  assert.equal(recordRateLimitFailure("b", 3, 60_000).allowed, true)
  clearRateLimit("a")
  assert.equal(recordRateLimitFailure("a", 3, 60_000).allowed, true)
  clearRateLimit("a")
  clearRateLimit("b")
})
