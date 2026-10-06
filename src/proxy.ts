import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Next.js 16 renamed the "middleware" file convention to "proxy".
export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isStaffRoute = req.nextUrl.pathname.startsWith("/staff")
  const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/accounts") ||
    req.nextUrl.pathname.startsWith("/transactions") ||
    req.nextUrl.pathname.startsWith("/transfers") ||
    req.nextUrl.pathname.startsWith("/bills") ||
    req.nextUrl.pathname.startsWith("/cards") ||
    req.nextUrl.pathname.startsWith("/budgets") ||
    req.nextUrl.pathname.startsWith("/more") ||
    req.nextUrl.pathname.startsWith("/notifications") ||
    req.nextUrl.pathname.startsWith("/settings")

  if (isStaffRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/staff-login", req.nextUrl.origin))
    }
    const role = (req.auth?.user as { role?: string } | undefined)?.role
    if (role !== "STAFF") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
    }
    return
  }

  if (isDashboardRoute && !isLoggedIn) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin)
    return NextResponse.redirect(signInUrl)
  }
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/transactions/:path*",
    "/transfers/:path*",
    "/bills/:path*",
    "/cards/:path*",
    "/budgets/:path*",
    "/more/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/staff/:path*",
  ],
}
