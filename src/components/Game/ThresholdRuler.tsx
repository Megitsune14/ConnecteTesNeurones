import { useEffect, useMemo, useState } from 'react'
import MiniDigitGrid from './MiniDigitGrid'
import { DIGIT_MARK_BADGE_CLASSES, formatSeuilRulerBadgeLabel, type DigitReferenceMark } from './referenceDigitSums'

export const THRESHOLD_RULER_MIN = -50
export const THRESHOLD_RULER_MAX = 50
export const THRESHOLD_RULER_VISIBLE_CELLS = 21
export const THRESHOLD_RULER_BAR_HEIGHT_PX = 52

const GRID_COLUMNS = `repeat(${THRESHOLD_RULER_VISIBLE_CELLS}, minmax(0, 1fr))`

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const maxViewStart =
  THRESHOLD_RULER_MAX - THRESHOLD_RULER_VISIBLE_CELLS + 1

function clampViewStart(start: number): number {
  return clamp(start, THRESHOLD_RULER_MIN, maxViewStart)
}

function computeInitialViewStart(
  threshold: number,
  focalSum: number | null
): number {
  const focal =
    focalSum != null
      ? Math.round((focalSum + threshold) / 2)
      : Math.round(threshold)
  return clampViewStart(
    focal - Math.floor(THRESHOLD_RULER_VISIBLE_CELLS / 2)
  )
}

function ensureValueVisible(viewStart: number, value: number): number {
  const viewEnd = viewStart + THRESHOLD_RULER_VISIBLE_CELLS - 1
  if (value < viewStart) {
    return clampViewStart(value - 2)
  }
  if (value > viewEnd) {
    return clampViewStart(value - THRESHOLD_RULER_VISIBLE_CELLS + 3)
  }
  return viewStart
}

interface ThresholdRulerProps {
  neuronId: string
  thresholdValue: number
  refMarks: DigitReferenceMark[]
  displayedSum: number | null
  hasCurrentGrid: boolean
}

const ThresholdRuler = ({
  neuronId,
  thresholdValue,
  refMarks,
  displayedSum,
  hasCurrentGrid,
}: ThresholdRulerProps) => {
  const [viewStart, setViewStart] = useState(() =>
    computeInitialViewStart(thresholdValue, displayedSum)
  )

  useEffect(() => {
    setViewStart((prev) => {
      const next = computeInitialViewStart(thresholdValue, displayedSum)
      if (displayedSum != null) return next
      return ensureValueVisible(prev, thresholdValue)
    })
  }, [thresholdValue, displayedSum])

  const viewEnd = viewStart + THRESHOLD_RULER_VISIBLE_CELLS - 1
  const rulerValues = useMemo(
    () =>
      Array.from(
        { length: THRESHOLD_RULER_VISIBLE_CELLS },
        (_, index) => viewStart + index
      ),
    [viewStart]
  )
  const cellCount = THRESHOLD_RULER_VISIBLE_CELLS
  const clampPercent = (v: number) => Math.max(0, Math.min(100, v))
  const thresholdPosition = clampPercent(
    ((thresholdValue - viewStart + 1) / cellCount) * 100
  )

  const refByRounded = useMemo(() => {
    const map = new Map<number, DigitReferenceMark[]>()
    for (const m of refMarks) {
      const r = Math.round(m.sum)
      const list = map.get(r) ?? []
      list.push(m)
      map.set(r, list)
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => a.digit - b.digit || a.variant.localeCompare(b.variant)
      )
    }
    return map
  }, [refMarks])

  const visibleMarkerPositions = useMemo(() => {
    const positions = new Set<number>()
    for (const r of refByRounded.keys()) {
      if (r >= viewStart && r <= viewEnd) positions.add(r)
    }
    if (hasCurrentGrid && displayedSum != null) {
      const rounded = Math.round(displayedSum)
      if (rounded >= viewStart && rounded <= viewEnd) positions.add(rounded)
    }
    return Array.from(positions).sort((a, b) => a - b)
  }, [refByRounded, viewStart, viewEnd, hasCurrentGrid, displayedSum])

  const scrollSpan = maxViewStart - THRESHOLD_RULER_MIN
  const thumbWidthPct =
    (THRESHOLD_RULER_VISIBLE_CELLS /
      (THRESHOLD_RULER_MAX - THRESHOLD_RULER_MIN + 1)) *
    100
  const thumbLeftPct =
    scrollSpan === 0
      ? 0
      : ((viewStart - THRESHOLD_RULER_MIN) / scrollSpan) *
        (100 - thumbWidthPct)

  return (
    <div className="w-full min-w-0">
      <div
        className="grid text-center text-xs font-bold text-astro"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        {rulerValues.map((value) => (
          <div key={`${neuronId}-top-${value}`}>{value}</div>
        ))}
      </div>

      <div
        className="relative mt-0.5 grid w-full items-center rounded border-2 border-grey bg-grey/40"
        style={{
          gridTemplateColumns: GRID_COLUMNS,
          minHeight: THRESHOLD_RULER_BAR_HEIGHT_PX,
        }}
      >
        {rulerValues.map((value) => (
          <div
            key={`${neuronId}-mid-${value}`}
            className={`h-full border-r border-grey/70 last:border-r-0 ${
              value > thresholdValue ? 'bg-green/20' : 'bg-red/20'
            }`}
            style={{ minHeight: THRESHOLD_RULER_BAR_HEIGHT_PX }}
          />
        ))}
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-[3px] bg-darkBlue"
          style={{
            left: `${thresholdPosition}%`,
            transform: 'translateX(-50%)',
          }}
          aria-hidden
        />
        {visibleMarkerPositions.map((rounded) => {
          const marks = refByRounded.get(rounded) ?? []
          if (marks.length === 0) return null

          const leftPct = clampPercent(
            ((rounded - viewStart + 0.5) / cellCount) * 100
          )
          return (
            <div
              key={`${neuronId}-marker-${rounded}`}
              className="pointer-events-none absolute top-1/2 z-30 flex flex-col items-center gap-0.5"
              style={{
                left: `${leftPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {marks.map((m) =>
                (m.variant === 'current' || m.variant === 's') &&
                m.grid != null ? (
                  <MiniDigitGrid
                    key={
                      m.sessionId
                        ? `${neuronId}-session-${m.sessionId}`
                        : `${neuronId}-current-${rounded}`
                    }
                    pattern={m.grid}
                  />
                ) : m.variant === 'p' || m.variant === 'g' ? (
                  <span
                    key={`${neuronId}-${m.digit}-${m.variant}`}
                    className={[
                      'inline-flex rounded border-2 px-1 py-px text-[10px] font-bold leading-none shadow-sm',
                      DIGIT_MARK_BADGE_CLASSES[m.digit] ??
                        'border-grey bg-white text-darkBlue',
                    ].join(' ')}
                    title={`Chiffre ${m.digit}, motif ${
                      m.variant === 'p' ? 'bien reconnu' : 'reconnu'
                    } (DIGIT_EXAMPLES) — somme ${m.sum}`}
                  >
                    {formatSeuilRulerBadgeLabel(m.digit, m.variant)}
                  </span>
                ) : null
              )}
            </div>
          )
        })}
      </div>

      <div
        className="mt-1 grid text-center text-xs font-bold text-astro"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        {rulerValues.map((value) => (
          <div key={`${neuronId}-bot-${value}`}>
            {Math.max(0, value - thresholdValue)}
          </div>
        ))}
      </div>

      <div className="mt-2 flex w-full items-center gap-1.5">
        <span className="shrink-0 w-7 text-right text-[10px] font-bold text-astro">
          {THRESHOLD_RULER_MIN}
        </span>
        <div className="relative h-3 min-w-0 flex-1 rounded-full bg-grey/35">
          <div
            className="pointer-events-none absolute top-0 h-full rounded-full border border-grey/60 bg-grey/75 shadow-sm"
            style={{
              left: `${thumbLeftPct}%`,
              width: `${thumbWidthPct}%`,
            }}
            aria-hidden
          />
          <input
            type="range"
            min={THRESHOLD_RULER_MIN}
            max={maxViewStart}
            step={1}
            value={viewStart}
            onChange={(e) =>
              setViewStart(clampViewStart(Number(e.target.value)))
            }
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            aria-label={`Déplacer la vue sur la règlette (${viewStart} à ${viewEnd})`}
          />
        </div>
        <span className="shrink-0 w-7 text-[10px] font-bold text-astro">
          {THRESHOLD_RULER_MAX}
        </span>
      </div>
    </div>
  )
}

export default ThresholdRuler
