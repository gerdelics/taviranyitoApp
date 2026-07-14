import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import OverlayModal from './OverlayModal'
import { getPoiTypeLabel, getPoiTypeIcon } from '../../utils/poiTypes'
import { haversineKm } from '../../utils/geo'

function formatCreatedAt(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDist(driverLocation, poi) {
  if (!driverLocation) return null
  const km = haversineKm(driverLocation, poi)
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function SortableRow({ id, index, poi, driverLocation }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = { transform: CSS.Transform.toString(transform), transition }

  const typeLabel = `${getPoiTypeIcon(poi.type)} ${getPoiTypeLabel(poi.type)}`.trim()
  const dist = formatDist(driverLocation, poi)
  const createdAt = formatCreatedAt(poi.createdAt)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
        isDragging ? 'border-cyan-500 opacity-90 shadow-lg' : 'border-slate-700'
      }`}
    >
      {/* drag handle */}
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-slate-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      {/* sequence badge */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
        {index + 1}
      </span>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">
          {poi.description || typeLabel}
        </p>
        <p className="truncate text-xs text-slate-400">
          {poi.description ? typeLabel : null}
          {poi.description && createdAt ? ' · ' : null}
          {createdAt}
        </p>
      </div>

      {/* distance */}
      {dist && (
        <span className="shrink-0 text-xs font-semibold text-cyan-400">{dist}</span>
      )}
    </div>
  )
}

export default function PoiReorderDialog({ open, onClose, pois, onReorder, driverLocation }) {
  const [orderedIds, setOrderedIds] = useState([])

  useEffect(() => {
    if (!open) return
    const activeSet = new Set(pois.filter((p) => !p.done).map((p) => p.id))
    setOrderedIds((prev) => {
      const kept = prev.filter((id) => activeSet.has(id))
      const incoming = [...activeSet].filter((id) => !kept.includes(id))
      return [...kept, ...incoming]
    })
  }, [open, pois])

  const poiById = Object.fromEntries(pois.map((p) => [p.id, p]))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIndex = orderedIds.indexOf(active.id)
    const newIndex = orderedIds.indexOf(over.id)
    const next = arrayMove(orderedIds, oldIndex, newIndex)
    setOrderedIds(next)
    onReorder(next)
  }

  return (
    <OverlayModal open={open} onClose={onClose} title="Reorder" showHeaderClose={false} maxWidthClassName="max-w-sm">
      {orderedIds.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No active POIs.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-2 pr-1">
              {orderedIds.map((id, index) => {
                const poi = poiById[id]
                if (!poi) return null
                return (
                  <SortableRow
                    key={id}
                    id={id}
                    index={index}
                    poi={poi}
                    driverLocation={driverLocation}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:text-slate-100"
      >
        Done
      </button>
    </OverlayModal>
  )
}
