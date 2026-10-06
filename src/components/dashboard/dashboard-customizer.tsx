"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  pointerWithin,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { GripVerticalIcon, LayoutGridIcon, LockIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FinancialOverview } from "@/components/dashboard/financial-overview"
import { QuickTransfer } from "@/components/dashboard/quick-transfer"
import { SpendingLimit } from "@/components/dashboard/spending-limit"
import { MoneyMovement } from "@/components/dashboard/money-movement"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { HealthScore } from "@/components/dashboard/health-score"
import type { AccountWithCard, BalancePoint, DashboardSummary, FinancialHealthData, MoneyMovementData, SpendingLimitData, TransactionRow } from "@/lib/data"

type WidgetSize = "sm" | "lg" | "full"

type Block = {
  id: string
  label: string
  size: WidgetSize
  component: React.ReactNode
}

type DashboardCustomizerProps = {
  balanceHistory: BalancePoint[]
  summary: DashboardSummary
  transactions: TransactionRow[]
  accounts: AccountWithCard[]
  moneyMovement: MoneyMovementData
  financialHealth: FinancialHealthData
  spendingLimit: SpendingLimitData
}

const sizeClass: Record<WidgetSize, string> = {
  sm: "col-span-12 lg:col-span-4",
  lg: "col-span-12 lg:col-span-8",
  full: "col-span-12",
}

const STORAGE_KEY = "anchor-dashboard-order"

// ── Null strategy: let CSS Grid handle layout, not dnd-kit transforms ──
const nullStrategy = () => null

function SortableWidget({
  block,
  editing,
}: {
  block: Block
  editing: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: block.id,
    disabled: !editing,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        sizeClass[block.size],
        "relative transition-opacity duration-200",
        isDragging && "opacity-30",
        editing && !isDragging && "rounded-xl ring-2 ring-dashed ring-primary/20",
      )}
    >
      {editing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 cursor-grab items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground shadow-md active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-3" />
          {block.label}
        </div>
      )}
      <div className={cn("h-full [&>*]:h-full", editing && "pointer-events-none select-none")}>
        {block.component}
      </div>
    </div>
  )
}

export function DashboardCustomizer({ balanceHistory, summary, transactions, accounts, moneyMovement, financialHealth, spendingLimit }: DashboardCustomizerProps) {
  const defaultBlocks: Block[] = useMemo(
    () => [
      {
        id: "financial-overview",
        label: "Financial Overview",
        size: "lg",
        component: <FinancialOverview history={balanceHistory} currentBalance={summary.totalBalance} accounts={accounts} />,
      },
      { id: "transfer-spending", label: "Transfer & Spending", size: "sm", component: <div className="flex flex-col gap-4 [&>*]:flex-1"><QuickTransfer accounts={accounts} /><SpendingLimit data={spendingLimit} /></div> },
      { id: "money-movement", label: "Money Movement", size: "sm", component: <MoneyMovement data={moneyMovement} /> },
      { id: "health-score", label: "Financial Health", size: "sm", component: <HealthScore data={financialHealth} /> },
      { id: "recent-transactions", label: "Recent Transactions", size: "full", component: <RecentTransactions transactions={transactions} /> },
    ],
    [balanceHistory, summary, transactions, accounts, moneyMovement, financialHealth, spendingLimit]
  )

  const [editing, setEditing] = useState(false)
  // Only the ORDER of widget ids is persisted/stateful — the widget content
  // itself is always re-derived from defaultBlocks above, so fresh data
  // (e.g. after a transfer) is never trapped in stale closures.
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultBlocks.map((b) => b.id)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const savedOrder: string[] = JSON.parse(saved)
        const known = new Set(defaultBlocks.map((b) => b.id))
        const filtered = savedOrder.filter((id) => known.has(id))
        for (const b of defaultBlocks) {
          if (!filtered.includes(b.id)) filtered.push(b.id)
        }
        return filtered
      }
    } catch {}
    return defaultBlocks.map((b) => b.id)
  })

  const blocks = useMemo(
    () => order.map((id) => defaultBlocks.find((b) => b.id === id)).filter((b): b is Block => !!b),
    [order, defaultBlocks]
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    setOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as string)
      const newIndex = prev.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return prev
      const next = arrayMove(prev, oldIndex, newIndex)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const handleReset = () => {
    setOrder(defaultBlocks.map((b) => b.id))
    localStorage.removeItem(STORAGE_KEY)
  }

  const activeBlock = blocks.find((b) => b.id === activeId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Edit toggle */}
      <div className="flex items-center justify-end gap-2">
        {editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={handleReset}
          >
            Reset layout
          </Button>
        )}
        <Button
          variant={editing ? "default" : "outline"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setEditing(!editing)}
        >
          {editing ? (
            <>
              <LockIcon className="size-3" />
              Lock
            </>
          ) : (
            <>
              <LayoutGridIcon className="size-3" />
              Customize
            </>
          )}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={nullStrategy}
        >
          <div className="grid grid-cols-12 gap-4">
            {blocks.map((block) => (
              <SortableWidget
                key={block.id}
                block={block}
                editing={editing}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay — renders outside the grid, no distortion */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeBlock ? (
            <div className="rounded-xl bg-card p-4 shadow-2xl ring-2 ring-primary/30 rotate-[1deg] scale-[1.02]">
              <p className="text-sm font-medium text-muted-foreground">
                {activeBlock.label}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
