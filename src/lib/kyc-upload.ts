/**
 * Reads a multipart body while enforcing a hard byte cap, so an oversized upload
 * is cut off instead of being buffered whole before the size check.
 */
export async function readLimitedFormData(req: Request, maxBytes: number): Promise<FormData | "too_large" | null> {
  const contentType = req.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("multipart/form-data") || !req.body) return null

  const declared = Number(req.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > maxBytes) return "too_large"

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return "too_large"
    }
    chunks.push(value)
  }

  try {
    return await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "content-type": contentType },
    }).formData()
  } catch {
    return null
  }
}
