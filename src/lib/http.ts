import { NextResponse } from "next/server"

/** Parse a JSON body without throwing. Returns undefined when the body is missing or malformed. */
export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json()
  } catch {
    return undefined
  }
}

export function badJson() {
  return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
}

/** Best-effort client IP for rate-limit keys. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown"
}
