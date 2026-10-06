import { NextResponse } from "next/server"
import { recordRateLimitFailure } from "@/lib/rate-limit"

/**
 * Counts one hit against `key` and returns a 429 response when the limit is
 * exceeded, otherwise null. (Built on the shared limiter in "@/lib/rate-limit".)
 */
export function limitOrResponse(key: string, limit: number, windowMs: number) {
  const result = recordRateLimitFailure(key, limit, windowMs)
  if (result.allowed) return null
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  )
}
