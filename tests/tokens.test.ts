import { test } from "node:test"
import assert from "node:assert/strict"
import { generateVerificationToken, hashToken } from "../src/lib/tokens"

test("tokens are unique and 64 hex chars", () => {
  const a = generateVerificationToken()
  const b = generateVerificationToken()
  assert.match(a, /^[0-9a-f]{64}$/)
  assert.notEqual(a, b)
})

test("hashToken is deterministic and never equals its input", () => {
  const raw = generateVerificationToken()
  assert.equal(hashToken(raw), hashToken(raw))
  assert.notEqual(hashToken(raw), raw)
  assert.match(hashToken(raw), /^[0-9a-f]{64}$/)
})
