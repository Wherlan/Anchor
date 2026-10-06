import { test } from "node:test"
import assert from "node:assert/strict"
import { toCents, centsToDollars } from "../src/lib/money"

test("toCents rounds to whole cents", () => {
  assert.equal(toCents(10), 1000)
  assert.equal(toCents(0.1 + 0.2), 30) // classic float drift case
  assert.equal(toCents(19.999), 2000)
})

test("toCents rejects amounts that round to nothing", () => {
  assert.equal(toCents(0.001), null)
  assert.equal(toCents(0.004), null)
  assert.equal(toCents(0), null)
  assert.equal(toCents(-5), null)
  assert.equal(toCents(Number.NaN), null)
  assert.equal(toCents(Number.POSITIVE_INFINITY), null)
})

test("toCents accepts exactly one cent", () => {
  assert.equal(toCents(0.01), 1)
  assert.equal(toCents(0.005), 1) // rounds half up to a cent
})

test("centsToDollars is the inverse", () => {
  assert.equal(centsToDollars(1234), 12.34)
})
