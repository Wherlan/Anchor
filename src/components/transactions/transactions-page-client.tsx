"use client"

import { useMemo, useState } from "react"

import type { TransactionRow } from "@/lib/data"
import { TransactionSummary } from "@/components/transactions/transaction-summary"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { TransactionActions } from "@/components/transactions/transaction-actions"

export function TransactionsPageClient({ transactions }: { transactions: TransactionRow[] }) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category).filter((c): c is string => !!c))
    return Array.from(cats).sort()
  }, [transactions])

  const filteredData = useMemo(() => {
    let data = transactions

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (t) =>
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.category ?? "").toLowerCase().includes(q) ||
          (t.accountNickname ?? "").toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== "all") {
      data = data.filter((t) => t.category === categoryFilter)
    }

    if (statusFilter !== "all") {
      data = data.filter((t) => t.status === statusFilter)
    }

    if (typeFilter !== "all") {
      data = data.filter((t) => t.direction === typeFilter)
    }

    return data
  }, [transactions, search, categoryFilter, statusFilter, typeFilter])

  function handleExport() {
    const selected = transactions.filter((t) => selectedIds.has(t.id))
    const header = "Description,Category,Amount,Direction,Date,Status,Account"
    const rows = selected.map(
      (t) =>
        `"${t.description ?? ""}","${t.category ?? ""}",${t.amount},"${t.direction}","${t.createdAt}","${t.status}","${t.accountNickname ?? ""}"`
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "transactions.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <TransactionSummary transactions={filteredData} />

      <TransactionFilters
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categories={categories}
      />

      <TransactionTable
        transactions={filteredData}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
      />

      <TransactionActions
        selectedCount={selectedIds.size}
        onExport={handleExport}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  )
}
