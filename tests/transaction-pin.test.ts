import { test } from "node:test"
import assert from "node:assert/strict"
import { isTransactionPin } from "../src/lib/transaction-pin"

test("transaction PINs must contain exactly four digits", () => {
  assert.equal(isTransactionPin("0123"), true)
  assert.equal(isTransactionPin("9876"), true)
  assert.equal(isTransactionPin("123"), false)
  assert.equal(isTransactionPin("12345"), false)
  assert.equal(isTransactionPin("12a4"), false)
  assert.equal(isTransactionPin(1234), false)
})