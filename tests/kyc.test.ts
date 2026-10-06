import { test } from "node:test"
import assert from "node:assert/strict"
import {
  detectFileType,
  normalizeSsn,
  ssnVariants,
  sanitizeFileName,
  transferLimitFor,
  maskKycText,
} from "../src/lib/kyc"
import { readLimitedFormData } from "../src/lib/kyc-upload"

test("detectFileType trusts bytes, not names", () => {
  assert.equal(detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0])), "image/jpeg")
  assert.equal(detectFileType(new TextEncoder().encode("%PDF-1.7\n")), "application/pdf")
  assert.equal(detectFileType(new TextEncoder().encode("<script>alert(1)</script>")), null)
  assert.equal(detectFileType(new Uint8Array([])), null)
})

test("normalizeSsn accepts real formats and rejects invalid ranges", () => {
  assert.equal(normalizeSsn("123-45-6789"), "123456789")
  assert.equal(normalizeSsn(" 123 45 6789 "), "123456789")
  assert.equal(normalizeSsn("000-12-3456"), null)
  assert.equal(normalizeSsn("666-12-3456"), null)
  assert.equal(normalizeSsn("900-12-3456"), null)
  assert.equal(normalizeSsn("123-00-4567"), null)
  assert.equal(normalizeSsn("123-45-0000"), null)
  assert.equal(normalizeSsn("12345678"), null)
  assert.equal(normalizeSsn("abc-de-fghi"), null)
})

test("ssnVariants covers both stored formats", () => {
  assert.deepEqual(ssnVariants("123456789"), ["123456789", "123-45-6789"])
})

test("sanitizeFileName strips unsafe characters", () => {
  assert.equal(sanitizeFileName('a"b\r\nc/../d.jpg'), "a_b__c_.._d.jpg")
  assert.equal(sanitizeFileName("   "), "document")
  assert.ok(sanitizeFileName("x".repeat(500)).length <= 100)
})

test("KYC limits rise with level and unknown levels fall back to level 1", () => {
  assert.ok(transferLimitFor(1) < transferLimitFor(2))
  assert.ok(transferLimitFor(2) < transferLimitFor(3))
  assert.equal(transferLimitFor(99), transferLimitFor(1))
})

test("maskKycText keeps only the last four", () => {
  assert.equal(maskKycText("123-45-6789".replace(/-/g, "")), "••••••6789")
  assert.equal(maskKycText("12"), "••••")
})

function multipart(file: File, extra: Record<string, string> = {}) {
  const form = new FormData()
  for (const [k, v] of Object.entries(extra)) form.set(k, v)
  form.set("file", file)
  return new Request("http://localhost/api/kyc", { method: "POST", body: form })
}

test("readLimitedFormData parses a normal upload", async () => {
  const req = multipart(new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], "id.jpg", { type: "image/jpeg" }), { type: "TAX_ID" })
  const result = await readLimitedFormData(req, 1024 * 1024)
  assert.ok(result instanceof FormData)
  assert.equal(result.get("type"), "TAX_ID")
  const file = result.get("file")
  assert.ok(file instanceof File)
  assert.equal(file.size, 6)
})

test("readLimitedFormData cuts off oversized bodies", async () => {
  const req = new Request("http://localhost/api/kyc", {
    method: "POST",
    headers: { "content-type": "multipart/form-data; boundary=test" },
    body: new Uint8Array(200_000),
  })
  assert.equal(await readLimitedFormData(req, 100_000), "too_large")
})

test("readLimitedFormData rejects non-multipart bodies", async () => {
  const req = new Request("http://localhost/api/kyc", { method: "POST", body: JSON.stringify({ a: 1 }), headers: { "content-type": "application/json" } })
  assert.equal(await readLimitedFormData(req, 1024), null)
})
