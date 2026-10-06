import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { randomBytes, randomInt } from "crypto"

const prisma = new PrismaClient()

function randomAccountNumber() {
  return randomInt(1_000_000_000, 10_000_000_000).toString()
}

// Never seed known credentials into a production database.
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  console.error("Refusing to seed: NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true to override (not recommended).")
  process.exit(1)
}

// Demo passwords can be overridden via env; the admin password is random unless provided,
// so there is no well-known staff login.
const TONY_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Stark@Anchor1"
const ADMIN_PASSWORD_PROVIDED = process.env.SEED_ADMIN_PASSWORD
const ADMIN_PASSWORD = ADMIN_PASSWORD_PROVIDED ?? randomBytes(12).toString("base64url") + "!1aA"

async function main() {
  const adminExisted = !!(await prisma.user.findUnique({ where: { email: "admin@anchor.bank" }, select: { id: true } }))

  await prisma.user.upsert({
    where: { email: "admin@anchor.bank" },
    update: {
      kycLevel: 3,
      ...(ADMIN_PASSWORD_PROVIDED
        ? {
            passwordHash: await bcrypt.hash(ADMIN_PASSWORD_PROVIDED, 10),
            sessionVersion: { increment: 1 },
          }
        : {}),
    },
    create: {
      kycLevel: 3,
      email: "admin@anchor.bank",
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      firstName: "Anchor",
      lastName: "Admin",
      dateOfBirth: new Date("1990-01-01"),
      address: "Internal",
      role: "STAFF",
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
  })

  const tony = await prisma.user.upsert({
    where: { email: "tony@anchor.bank" },
    update: { kycLevel: 3 },
    create: {
      kycLevel: 3,
      email: "tony@anchor.bank",
      passwordHash: await bcrypt.hash(TONY_PASSWORD, 10),
      firstName: "Tony",
      lastName: "Stark",
      dateOfBirth: new Date("1970-05-29"),
      address: "10880 Malibu Point, Malibu, CA",
      role: "USER",
      kycStatus: "VERIFIED",
      emailVerified: true,
    },
  })

  const existing = await prisma.account.findFirst({ where: { userId: tony.id } })
  if (!existing) {
    const checking = await prisma.account.create({
      data: {
        userId: tony.id,
        type: "CHECKING",
        nickname: "Everyday Checking",
        accountNumber: randomAccountNumber(),
        routingNumber: "021000021",
        balance: 100000,
        card: {
          create: { last4: "0079", network: "MASTERCARD", expiryMonth: 12, expiryYear: 2030, spendLimit: 50000 },
        },
      },
    })
    await prisma.account.create({
      data: {
        userId: tony.id,
        type: "SAVINGS",
        nickname: "Savings",
        accountNumber: randomAccountNumber(),
        routingNumber: "021000021",
        balance: 0,
      },
    })
    await prisma.transaction.create({
      data: {
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: 100000,
        category: "Opening Deposit",
        description: "Anchor opening deposit",
        destinationAccountId: checking.id,
        completedAt: new Date(),
      },
    })
    console.log("Tony's checking account number:", checking.accountNumber)
  }

  console.log("\nSeed complete.")
  console.log("  Customer: tony@anchor.bank /", TONY_PASSWORD)
  if (adminExisted) {
    console.log(
      ADMIN_PASSWORD_PROVIDED
        ? "  Admin:    admin@anchor.bank (password updated from SEED_ADMIN_PASSWORD)"
        : "  Admin:    admin@anchor.bank (already existed; password unchanged)"
    )
  } else {
    console.log("  Admin:    admin@anchor.bank /", ADMIN_PASSWORD, "(sign in at /staff-login)")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
