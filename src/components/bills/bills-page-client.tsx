"use client"

import { AddPayee } from "@/components/bills/add-payee"
import { PayeeList } from "@/components/bills/payee-list"
import type { AccountWithCard, PayeeRow } from "@/lib/data"

export function BillsPageClient({
  accounts,
  payees,
}: {
  accounts: AccountWithCard[]
  payees: PayeeRow[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PayeeList payees={payees} />
      </div>
      <div>
        <AddPayee accounts={accounts} />
      </div>
    </div>
  )
}
