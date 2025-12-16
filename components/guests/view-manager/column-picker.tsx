"use client"

import { useState } from "react"
import { GripVertical, Eye, EyeOff, Columns3 } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  GUEST_COLUMNS,
  COLUMN_GROUP_LABELS,
  type GuestListViewColumnConfig,
  type GuestColumnId,
} from "@/lib/guest-columns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ColumnPickerProps {
  columns: GuestListViewColumnConfig[]
  onColumnsChange: (columns: GuestListViewColumnConfig[]) => void
}

export function ColumnPicker({ columns, onColumnsChange }: ColumnPickerProps) {
  const [open, setOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columns.findIndex((c) => c.id === active.id)
    const newIndex = columns.findIndex((c) => c.id === over.id)

    onColumnsChange(arrayMove(columns, oldIndex, newIndex))
  }

  const handleToggleVisibility = (id: string, visible: boolean) => {
    onColumnsChange(
      columns.map((col) => (col.id === id ? { ...col, visible } : col))
    )
  }

  // Filter out fixed columns from draggable list
  const draggableColumns = columns.filter((col) => {
    const def = GUEST_COLUMNS.find((d) => d.id === col.id)
    return !def?.fixed
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Customize columns</h4>
          <p className="text-xs text-muted-foreground">
            Drag to reorder, toggle to show/hide
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={draggableColumns.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="p-2 space-y-1">
                {draggableColumns.map((col) => {
                  const definition = GUEST_COLUMNS.find((d) => d.id === col.id)
                  if (!definition) return null
                  return (
                    <SortableColumnItem
                      key={col.id}
                      column={col}
                      label={definition.label}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface SortableColumnItemProps {
  column: GuestListViewColumnConfig
  label: string
  onToggleVisibility: (id: string, visible: boolean) => void
}

function SortableColumnItem({
  column,
  label,
  onToggleVisibility,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted",
        isDragging && "opacity-50 bg-muted"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm truncate">{label}</span>
      <Switch
        checked={column.visible}
        onCheckedChange={(checked) => onToggleVisibility(column.id, checked)}
        aria-label={`Toggle ${label} visibility`}
      />
    </div>
  )
}
