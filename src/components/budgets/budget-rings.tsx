"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { motion } from "motion/react"
import {
  UtensilsIcon,
  CarIcon,
  Gamepad2Icon,
  ShoppingBagIcon,
  RepeatIcon,
  HeartPulseIcon,
  GraduationCapIcon,
  PlaneIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type BudgetTransaction = {
  amount: number
  category: string | null
  createdAt: string
  sourceAccountId: string | null
  destinationAccountId: string | null
}

type Budget = {
  id: string
  category: string
  budget: number
}

const iconMap: Record<string, React.ReactNode> = {
  utensils: <UtensilsIcon className="size-5" />,
  car: <CarIcon className="size-5" />,
  "gamepad-2": <Gamepad2Icon className="size-5" />,
  "shopping-bag": <ShoppingBagIcon className="size-5" />,
  repeat: <RepeatIcon className="size-5" />,
  "heart-pulse": <HeartPulseIcon className="size-5" />,
  "graduation-cap": <GraduationCapIcon className="size-5" />,
  plane: <PlaneIcon className="size-5" />,
}

const categoryIcons: Record<string, string> = {
  "Food & Dining": "utensils",
  Transport: "car",
  Entertainment: "gamepad-2",
  Shopping: "shopping-bag",
  Subscriptions: "repeat",
  "Health & Fitness": "heart-pulse",
  Education: "graduation-cap",
  Travel: "plane",
}

const colors = [
  "text-orange-500",
  "text-blue-500",
  "text-purple-500",
  "text-pink-500",
  "text-cyan-500",
  "text-emerald-500",
  "text-amber-500",
  "text-rose-500",
]

export const BUDGETS_UPDATED_EVENT = "anchor-budgets-updated"
const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function budgetStorageKey(userId: string) {
  return `anchor-budgets:${userId}`
}

function readBudgets(storageKey: string): Budget[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Budget[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function BudgetRings({ userId, transactions }: { userId: string; transactions: BudgetTransaction[] }) {
  const storageKey = budgetStorageKey(userId)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")

  // localStorage only exists in the browser, so it can't seed initial state without
  // a server/client hydration mismatch. Loading it once after mount is the intended pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBudgets(readBudgets(storageKey))
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(storageKey, JSON.stringify(budgets))
      window.dispatchEvent(new Event(BUDGETS_UPDATED_EVENT))
    }
  }, [budgets, hydrated, storageKey])

  const spending = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const totals = new Map<string, number>()

    for (const transaction of transactions) {
      const date = new Date(transaction.createdAt)
      if (date < start || date > now || !transaction.category) continue
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount)
    }

    return totals
  }, [transactions])

  function resetForm() {
    setCategory("")
    setAmount("")
    setEditingId(null)
  }

  function openEdit(budget: Budget) {
    setEditingId(budget.id)
    setCategory(budget.category)
    setAmount(String(budget.budget))
    setOpen(true)
  }

  function saveBudget() {
    const trimmedCategory = category.trim()
    const budgetAmount = Number(amount)
    if (!trimmedCategory || !Number.isFinite(budgetAmount) || budgetAmount <= 0) return

    if (editingId) {
      setBudgets((current) =>
        current.map((budget) =>
          budget.id === editingId
            ? { ...budget, category: trimmedCategory, budget: budgetAmount }
            : budget
        )
      )
    } else {
      setBudgets((current) => [
        ...current,
        { id: crypto.randomUUID(), category: trimmedCategory, budget: budgetAmount },
      ])
    }

    setOpen(false)
    resetForm()
  }

  function removeBudget(id: string) {
    setBudgets((current) => current.filter((budget) => budget.id !== id))
  }

  const items = budgets.map((budget, index) => ({
    ...budget,
    spent: spending.get(budget.category) ?? 0,
    iconName: categoryIcons[budget.category] ?? "shopping-bag",
    color: colors[index % colors.length],
  }))

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">Monthly Budgets</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value)
            if (!value) resetForm()
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <PlusIcon />
            Add budget
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit budget" : "Add budget"}</DialogTitle>
              <DialogDescription>
                Set the monthly spending limit for a category. Your spending is calculated from completed transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="budget-category" className="text-xs font-medium">Category</label>
                <Input
                  id="budget-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Food & Dining"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="budget-amount" className="text-xs font-medium">Monthly limit</label>
                <Input
                  id="budget-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveBudget}>Save budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No budgets set yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a monthly category limit to start tracking your spending.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {items.map((budget, index) => {
              const percent = Math.min((budget.spent / budget.budget) * 100, 100)
              const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE
              const isOver = budget.spent > budget.budget

              return (
                <div key={budget.id} className="group relative flex flex-col items-center gap-2">
                  <div className="absolute right-0 top-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(budget)} aria-label={`Edit ${budget.category} budget`}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => removeBudget(budget.id)} aria-label={`Delete ${budget.category} budget`}>
                      <Trash2Icon />
                    </Button>
                  </div>
                  <div className="relative size-24">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                      <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" className="text-muted" strokeWidth="8" />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        fill="none"
                        stroke="currentColor"
                        className={isOver ? "text-destructive" : budget.color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        initial={{ strokeDashoffset: CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ strokeDashoffset: { duration: 1, delay: index * 0.1, ease: "easeOut" } }}
                      />
                    </svg>
                    <div className={cn("absolute inset-0 flex items-center justify-center", isOver ? "text-destructive" : budget.color)}>
                      {iconMap[budget.iconName]}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">{budget.category}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      ${budget.spent.toLocaleString()} <span className="text-muted-foreground/60">/ ${budget.budget.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
