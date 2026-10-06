import type { Prisma } from "@prisma/client"

type TxClient = Prisma.TransactionClient

export async function notify(
  tx: TxClient,
  params: { userId: string; title: string; body: string; type?: "TRANSACTION" | "SECURITY" | "SYSTEM" }
) {
  await tx.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      body: params.body,
      type: params.type ?? "SYSTEM",
    },
  })
}
