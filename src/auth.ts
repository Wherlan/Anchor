import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/rate-limit"

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials"
}

class LoginRateLimitError extends CredentialsSignin {
  code = "rate_limited"
}

// Compared against when the email is unknown so response time does not reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync("anchor-timing-equalizer", 10)

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_EMAIL_IP_LIMIT = 8
const LOGIN_IP_LIMIT = 30

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown"
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = normalizeEmail(credentials?.email)
        const password = typeof credentials?.password === "string" ? credentials.password : ""
        if (!email || !password) throw new InvalidCredentialsError()

        const ipAddress = getRequestIp(request)
        const emailIpKey = `login:email-ip:${email}:${ipAddress}`
        const ipKey = `login:ip:${ipAddress}`
        const emailIpLimit = checkRateLimit(emailIpKey, LOGIN_EMAIL_IP_LIMIT, LOGIN_WINDOW_MS)
        const ipLimit = checkRateLimit(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS)
        if (!emailIpLimit.allowed || !ipLimit.allowed) throw new LoginRateLimitError()

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH)
          recordRateLimitFailure(emailIpKey, LOGIN_EMAIL_IP_LIMIT, LOGIN_WINDOW_MS)
          recordRateLimitFailure(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS)
          throw new InvalidCredentialsError()
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash)

        await prisma.loginActivity.create({
          data: {
            userId: user.id,
            ipAddress,
            userAgent: request.headers.get("user-agent"),
            success: validPassword,
          },
        })

        if (!validPassword) {
          recordRateLimitFailure(emailIpKey, LOGIN_EMAIL_IP_LIMIT, LOGIN_WINDOW_MS)
          recordRateLimitFailure(ipKey, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS)
          throw new InvalidCredentialsError()
        }

        clearRateLimit(emailIpKey)
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          sessionVersion: user.sessionVersion,
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
        token.sessionVersion = user.sessionVersion
      } else if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            sessionVersion: true,
          },
        })

        // Account deleted, or password/email changed since this token was issued:
        // returning null ends the session.
        if (!currentUser || currentUser.sessionVersion !== token.sessionVersion) {
          return null
        }

        token.email = currentUser.email
        token.name = `${currentUser.firstName} ${currentUser.lastName}`
        token.role = currentUser.role
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
})
