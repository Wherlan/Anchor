import "next-auth"
import type { DefaultSession } from "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role?: string
    sessionVersion?: number
  }

  interface Session {
    user: {
      id: string
      role?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    sessionVersion?: number
  }
}
