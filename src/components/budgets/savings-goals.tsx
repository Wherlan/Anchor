"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"

type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  monthlyContribution: number
}

function readGoals(storageKey: string): SavingsGoal[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []
    const parsed = JSON.parse(stored) as SavingsGoal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function SavingsGoals({ userId }: { userId: string }) {
  const storageKey = `anchor-savings-goals:${userId}`
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [monthlyContribution, setMonthlyContribution] = useState("")

  // localStorage only exists in the browser, so it can't seed initial state without
  // a server/client hydration mismatch. Loading it once after mount is the intended pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGoals(readGoals(storageKey))
    setHydrated(true)
  }, [storageKey])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(storageKey, JSON.stringify(goals))
    }
  }, [goals, hydrated, storageKey])

  function resetForm() {
    setEditingId(null)
    setName("")
    setTargetAmount("")
    setCurrentAmount("")
    setDeadline("")
    setMonthlyContribution("")
  }

  function openEdit(goal: SavingsGoal) {
    setEditingId(goal.id)
    setName(goal.name)
    setTargetAmount(String(goal.targetAmount))
    setCurrentAmount(String(goal.currentAmount))
    setDeadline(goal.deadline)
    setMonthlyContribution(String(goal.monthlyContribution))
    setOpen(true)
  }

  function saveGoal() {
    const values = {
      name: name.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount),
      deadline,
      monthlyContribution: Number(monthlyContribution),
    }
    if (
      !values.name ||
      !values.deadline ||
      !Number.isFinite(values.targetAmount) ||
      values.targetAmount <= 0 ||
      !Number.isFinite(values.currentAmount) ||
      values.currentAmount < 0 ||
      !Number.isFinite(values.monthlyContribution) ||
      values.monthlyContribution <= 0 ||
      values.currentAmount > values.targetAmount
    ) return

    if (editingId) {
      setGoals((current) => current.map((goal) => goal.id === editingId ? { ...goal, ...values } : goal))
    } else {
      setGoals((current) => [...current, { id: crypto.randomUUID(), ...values }])
    }
    setOpen(false)
    resetForm()
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">Savings Goals</CardTitle>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value)
            if (!value) resetForm()
          }}
        >
          <DialogTrigger render={<Button size="sm" />}>
            <PlusIcon />
            Add goal
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit savings goal" : "Add savings goal"}</DialogTitle>
              <DialogDescription>
                Savings goals are saved on this device until account-level goal storage is added to Anchor.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="goal-name" className="text-xs font-medium">Goal name</label>
                <Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Emergency Fund" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-target" className="text-xs font-medium">Target</label>
                <Input id="goal-target" type="number" min="0" step="0.01" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="5000" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-current" className="text-xs font-medium">Saved so far</label>
                <Input id="goal-current" type="number" min="0" step="0.01" value={currentAmount} onChange={(event) => setCurrentAmount(event.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-deadline" className="text-xs font-medium">Target month</label>
                <Input id="goal-deadline" type="month" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="goal-contribution" className="text-xs font-medium">Monthly contribution</label>
                <Input id="goal-contribution" type="number" min="0" step="0.01" value={monthlyContribution} onChange={(event) => setMonthlyContribution(event.target.value)} placeholder="400" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveGoal}>Save goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm font-medium">No savings goals yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a goal to track a target, deadline, and monthly contribution.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {goals.map((goal) => {
              const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              const monthsLeft = Math.ceil((goal.targetAmount - goal.currentAmount) / goal.monthlyContribution)
              const projectedDate = new Date()
              projectedDate.setMonth(projectedDate.getMonth() + Math.max(monthsLeft, 0))
              const deadlineDate = new Date(`${goal.deadline}-01T00:00:00`)
              const onTrack = projectedDate <= deadlineDate

              return (
                <div key={goal.id} className="group relative flex gap-4 rounded-xl border p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 pr-14">
                      <p className="text-sm font-semibold">{goal.name}</p>
                      <Badge variant={onTrack ? "secondary" : "destructive"} className="text-[10px]">
                        {onTrack ? "On track" : "Behind"}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold tabular-nums">${goal.currentAmount.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/ ${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>${goal.monthlyContribution.toLocaleString()}/mo</span>
                      <span>Target: {goal.deadline}</span>
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-xs" onClick={() => openEdit(goal)} aria-label={`Edit ${goal.name}`}><PencilIcon /></Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => setGoals((current) => current.filter((item) => item.id !== goal.id))} aria-label={`Delete ${goal.name}`}><Trash2Icon /></Button>
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
