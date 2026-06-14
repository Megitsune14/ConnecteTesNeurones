import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InputNeuronData, NeuronData } from '../types'
import NetworkVisualization from '../NetworkVisualization'
import { NETWORK_STRUCTURE, NEURONE_FORMULAS } from '../constants'
import {
  DIGIT_MARK_BADGE_CLASSES,
  getReferenceMarksForHiddenNeuron,
  getReferenceMarksForOutputNeuron,
} from '../referenceDigitSums'
import ThresholdDigitSidePanel from '../ThresholdDigitSidePanel'
import MiniDigitGrid from '../MiniDigitGrid'
import { useSessionDigits } from '../sessionDigits'
import {
  getOutputVerdictLabel,
  resolveWinningDigit,
  type OutputActivation,
} from '../networkDecision'

/** Mini-grille « Grille de départ » : même logique que la division 9×6, cellules 28px. */
const PREVIEW_CELL_PX = 28
const PREVIEW_COL_GROUP_W = PREVIEW_CELL_PX * 2
const PREVIEW_SEP_MARGIN_PX = 2
const PREVIEW_SEP_W_PX = 3
const PREVIEW_V_LINE_LEFT = [
  PREVIEW_COL_GROUP_W + PREVIEW_SEP_MARGIN_PX,
  PREVIEW_COL_GROUP_W +
    PREVIEW_SEP_MARGIN_PX +
    PREVIEW_SEP_W_PX +
    PREVIEW_SEP_MARGIN_PX +
    PREVIEW_COL_GROUP_W +
    PREVIEW_SEP_MARGIN_PX,
] as const
const PREVIEW_ROWS_PER_BAND = 3
const PREVIEW_H_BAND_PX = PREVIEW_ROWS_PER_BAND * PREVIEW_CELL_PX
const PREVIEW_H_SEP_BEFORE_PX = PREVIEW_SEP_MARGIN_PX
const PREVIEW_H_LINE_TOP = [
  PREVIEW_H_BAND_PX + PREVIEW_H_SEP_BEFORE_PX,
  PREVIEW_H_BAND_PX +
    (PREVIEW_SEP_MARGIN_PX * 2 + PREVIEW_SEP_W_PX) +
    PREVIEW_H_BAND_PX +
    PREVIEW_H_SEP_BEFORE_PX,
] as const
/** Débords des lignes de séparation (mini-grille). Bas du rouge réduit pour rester dans le cadre. */
const PREVIEW_V_EXTEND_TOP_PX = 36
const PREVIEW_V_EXTEND_BOTTOM_PX = 0
const PREVIEW_H_EXTEND_LEFT_PX = 56
const PREVIEW_H_EXTEND_RIGHT_PX = 0

type ParsedTerm = {
  id: string
  sign: 1 | -1
}

const parseFormula = (formula: string): ParsedTerm[] => {
  if (!formula) return []
  const tokens = formula.replace(/\s+/g, ' ').trim().split(' ')
  const terms: ParsedTerm[] = []
  let currentSign: 1 | -1 = 1
  for (const token of tokens) {
    if (token === '+') {
      currentSign = 1
    } else if (token === '-') {
      currentSign = -1
    } else if (token.length > 0) {
      terms.push({ id: token, sign: currentSign })
    }
  }
  return terms
}

interface NetworkInteractionStepProps {
  pattern: number[][] | null
  inputNeurons: InputNeuronData[]
  hiddenNeurons: NeuronData[]
  outputNeurons: NeuronData[]
  onNeuronClick: (neuronId: string) => void
  onAutoCalculateHidden: () => void
  onAutoCalculateOutput: () => void
  finalDecision: number | null
  selectedDigit: number | null
  onReset: () => void
  onApplySeuilThreshold: (neuronId: string, threshold: number) => void
  onResetThresholds: () => void
}

const NetworkInteractionStep = ({
  pattern,
  inputNeurons,
  hiddenNeurons,
  outputNeurons,
  onNeuronClick,
  onAutoCalculateHidden,
  onAutoCalculateOutput,
  finalDecision,
  selectedDigit,
  onReset,
  onApplySeuilThreshold,
  onResetThresholds,
}: NetworkInteractionStepProps) => {
  type InteractionMode = 'calcul' | 'seuil'
  type ThresholdLayer = 'hidden' | 'output'
  const { sessionDigits, saveDigit, removeDigit } = useSessionDigits()
  const [mode, setMode] = useState<InteractionMode>('calcul')
  const [thresholdLayer, setThresholdLayer] = useState<ThresholdLayer>('output')
  const [thresholdValues, setThresholdValues] = useState<Record<string, number>>({})
  const seuilDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleApplySeuilThreshold = useCallback(
    (neuronId: string, value: number) => {
      if (seuilDebounceRef.current) clearTimeout(seuilDebounceRef.current)
      seuilDebounceRef.current = setTimeout(() => {
        seuilDebounceRef.current = null
        onApplySeuilThreshold(neuronId, value)
      }, 280)
    },
    [onApplySeuilThreshold]
  )

  useEffect(() => {
    return () => {
      if (seuilDebounceRef.current) clearTimeout(seuilDebounceRef.current)
    }
  }, [])

  const allCalculDone =
    hiddenNeurons.length >= NETWORK_STRUCTURE.hidden.length &&
    hiddenNeurons.every((n) => n.sumValidated)

  const allOutputsDone = NETWORK_STRUCTURE.output.every((outputId) => {
    const neuron = outputNeurons.find((n) => n.id === outputId)
    return neuron?.outputValidated === true
  })
  const winningDigit = resolveWinningDigit(
    NETWORK_STRUCTURE.output
      .map((outputId) => outputNeurons.find((n) => n.id === outputId))
      .filter((n): n is NeuronData => n != null && n.outputValidated)
      .map(
        (n): OutputActivation => ({
          digit:
            n.digit ?? (parseInt(n.id.replace('NEURONE', ''), 10) || 0),
          value: n.calculatedOutput ?? 0,
        })
      )
  )

  useEffect(() => {
    setThresholdValues((prev) => {
      const next = { ...prev }
      ;[...hiddenNeurons, ...outputNeurons].forEach((neuron) => {
        if (next[neuron.id] === undefined) {
          next[neuron.id] = neuron.threshold
        }
      })
      return next
    })
  }, [hiddenNeurons, outputNeurons])

  const neuronsForThresholdMode = useMemo(
    () => (thresholdLayer === 'output' ? outputNeurons : hiddenNeurons),
    [thresholdLayer, outputNeurons, hiddenNeurons]
  )

  const effectiveThresholds = useMemo(() => {
    if (mode === 'seuil') return thresholdValues
    const fromNeurons: Record<string, number> = {}
    for (const neuron of [...hiddenNeurons, ...outputNeurons]) {
      fromNeurons[neuron.id] = neuron.threshold
    }
    return fromNeurons
  }, [mode, thresholdValues, hiddenNeurons, outputNeurons])

  const getNeuronLabel = (neuron: NeuronData) =>
    neuron.layer === 'output' ? `Neurone ${neuron.digit ?? ''}`.trim() : `Neurone ${neuron.id}`

  const updateThreshold = (neuronId: string, nextValue: number) => {
    setThresholdValues((prev) => ({
      ...prev,
      [neuronId]: Math.round(nextValue),
    }))
  }

  const handleResetThresholds = () => {
    onResetThresholds()
    const defaults: Record<string, number> = {}
    for (const id of NETWORK_STRUCTURE.hidden) {
      defaults[id] = NETWORK_STRUCTURE.hiddenThresholds[id] ?? 0
    }
    for (const id of NETWORK_STRUCTURE.output) {
      defaults[id] = NETWORK_STRUCTURE.outputThresholds[id] ?? 0
    }
    setThresholdValues(defaults)
  }

  const handleSaveCurrentDigit = () => {
    if (pattern == null || selectedDigit == null) return
    saveDigit(selectedDigit, pattern)
  }

  const beforePanel = (
    <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm animate-fade-in-up">
      <h2 className="text-darkBlue text-2xl font-bold tracking-wide mb-6 text-center">
        Grille de départ
      </h2>
      <div className="flex justify-center">
        {pattern != null ? (
          <div className="relative inline-block">
            <div className="border-4 border-grey rounded-2xl p-2 bg-gray-50 shadow-sm relative overflow-visible">
              <div
                className="absolute left-14 top-2 grid items-center"
                style={{ gridTemplateColumns: '56px 7px 56px 7px 56px' }}
              >
                {[0, 1, 2].map((colGroup) => (
                  <div
                    key={`col-label-${colGroup}`}
                    className="text-darkBlue font-bold text-xs text-center"
                    style={{ gridColumnStart: colGroup * 2 + 1 }}
                  >
                    {`COL${colGroup + 1}`}
                  </div>
                ))}
              </div>
              <div className="absolute left-2 top-8">
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-xs"
                  style={{ top: '42px' }}
                >
                  LIG1
                </div>
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-xs"
                  style={{ top: '133px' }}
                >
                  LIG2
                </div>
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-xs"
                  style={{ top: '224px' }}
                >
                  LIG3
                </div>
              </div>
              <div className="relative ml-12 mt-7 flex flex-col gap-0 overflow-visible">
                <div
                  className="pointer-events-none absolute inset-0 z-[6] overflow-visible"
                  aria-hidden
                >
                  {PREVIEW_V_LINE_LEFT.map((left) => (
                    <div
                      key={`preview-v-${left}`}
                      className="absolute bg-red"
                      style={{
                        left,
                        width: PREVIEW_SEP_W_PX,
                        top: -PREVIEW_V_EXTEND_TOP_PX,
                        height: `calc(100% + ${PREVIEW_V_EXTEND_TOP_PX + PREVIEW_V_EXTEND_BOTTOM_PX}px)`,
                      }}
                    />
                  ))}
                  {PREVIEW_H_LINE_TOP.map((top) => (
                    <div
                      key={`preview-h-${top}`}
                      className="absolute bg-yellow"
                      style={{
                        left: -PREVIEW_H_EXTEND_LEFT_PX,
                        width: `calc(100% + ${PREVIEW_H_EXTEND_LEFT_PX + PREVIEW_H_EXTEND_RIGHT_PX}px)`,
                        top,
                        height: PREVIEW_SEP_W_PX,
                      }}
                    />
                  ))}
                </div>
                {[0, 1, 2].map((ligGroup) => (
                  <div key={`lig-${ligGroup}`} className="flex flex-col gap-0">
                    {Array.from({ length: 3 }).map((_, ligRow) => {
                      const gridRow = ligGroup * 3 + ligRow
                      return (
                        <div key={`row-${gridRow}`} className="flex gap-0 relative">
                          {[0, 1, 2].map((colGroup) => (
                            <div key={`col-${colGroup}`} className="flex gap-0 relative">
                              <div className="flex gap-0 relative">
                                {Array.from({ length: 2 }).map((_, colCol) => {
                                  const gridCol = colGroup * 2 + colCol
                                  const pixel = pattern[gridRow]?.[gridCol] ?? 0
                                  return (
                                    <div
                                      key={`${gridRow}-${gridCol}`}
                                      className="relative border border-black/20 bg-grey/40"
                                      style={{
                                        width: PREVIEW_CELL_PX,
                                        height: PREVIEW_CELL_PX,
                                      }}
                                    >
                                      {pixel === 1 && (
                                        <div className="absolute inset-0 bg-black border border-black/50 z-[2]" />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                              {colGroup < 2 && (
                                <div
                                  className="shrink-0"
                                  style={{
                                    width: PREVIEW_SEP_W_PX,
                                    marginLeft: PREVIEW_SEP_MARGIN_PX,
                                    marginRight: PREVIEW_SEP_MARGIN_PX,
                                  }}
                                  aria-hidden
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    {ligGroup < 2 && (
                      <div
                        className="shrink-0"
                        style={{
                          height: PREVIEW_SEP_W_PX,
                          marginTop: PREVIEW_SEP_MARGIN_PX,
                          marginBottom: PREVIEW_SEP_MARGIN_PX,
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-astro font-medium text-center">
            Aucune grille disponible.
          </p>
        )}
      </div>
    </section>
  )

  const thresholdPanel = (
    <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in-up">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setThresholdLayer('hidden')}
            className={[
              'rounded-xl px-4 sm:px-5 py-2 text-sm font-semibold transition-colors border-2 min-h-11',
              thresholdLayer === 'hidden'
                ? 'bg-blue text-white border-blue hover:bg-blue-hover'
                : 'bg-white text-blue border-blue/30 hover:bg-blue/10',
            ].join(' ')}
          >
            Neurones cachés
          </button>
          <button
            type="button"
            onClick={() => setThresholdLayer('output')}
            className={[
              'rounded-xl px-4 sm:px-5 py-2 text-sm font-semibold transition-colors border-2 min-h-11',
              thresholdLayer === 'output'
                ? 'bg-blue text-white border-blue hover:bg-blue-hover'
                : 'bg-white text-blue border-blue/30 hover:bg-blue/10',
            ].join(' ')}
          >
            Neurones de sortie
          </button>
        </div>
        <button
          type="button"
          onClick={handleResetThresholds}
          className="rounded-xl border-2 border-blue/40 bg-white px-4 py-2 text-sm font-semibold text-blue transition-colors hover:bg-blue/10 min-h-11"
        >
          Remettre les seuils par défaut
        </button>
      </div>

      {thresholdLayer === 'output' && allOutputsDone && winningDigit === null && (
        <p className="mb-4 rounded-xl border border-grey bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-astro">
          Aucun chiffre reconnu
        </p>
      )}

      <div className="space-y-5">
        {neuronsForThresholdMode.map((neuron) => {
          const sumValue =
            neuron.calculatedSum ??
            Object.values(neuron.inputs).reduce(
              (acc, value) => acc + (Number(value) || 0),
              0
            )
          const thresholdValue = thresholdValues[neuron.id] ?? neuron.threshold
          const refMarks =
            neuron.layer === 'hidden'
              ? getReferenceMarksForHiddenNeuron(
                  neuron.id,
                  pattern,
                  selectedDigit,
                  sessionDigits
                )
              : getReferenceMarksForOutputNeuron(
                  neuron.id,
                  pattern,
                  selectedDigit,
                  effectiveThresholds,
                  sessionDigits
                )
          const refSums = refMarks.map((m) => m.sum)
          const minValue = Math.min(
            -8,
            Math.floor(Math.min(sumValue, thresholdValue, ...refSums) - 4)
          )
          const maxValue = Math.max(
            12,
            Math.ceil(Math.max(sumValue, thresholdValue, ...refSums) + 4)
          )
          const rulerValues = Array.from(
            { length: maxValue - minValue + 1 },
            (_, index) => minValue + index
          )
          const displayedSum = Math.round(sumValue)
          const cellCount = Math.max(1, rulerValues.length)
          const clampPercent = (v: number) => Math.max(0, Math.min(100, v))
          const thresholdPosition = clampPercent(
            ((thresholdValue - minValue + 1) / cellCount) * 100
          )

          const refByRounded = new Map<number, typeof refMarks>()
          for (const m of refMarks) {
            const r = Math.round(m.sum)
            const list = refByRounded.get(r) ?? []
            list.push(m)
            refByRounded.set(r, list)
          }
          for (const list of refByRounded.values()) {
            list.sort(
              (a, b) =>
                a.digit - b.digit || a.variant.localeCompare(b.variant)
            )
          }

          const rulerMarkerPositions = Array.from(
            new Set([
              ...refByRounded.keys(),
              ...(pattern != null ? [displayedSum] : []),
            ])
          ).sort((a, b) => a - b)

          const neuronDigit =
            neuron.digit ?? (parseInt(neuron.id.replace('NEURONE', ''), 10) || 0)
          const formula = NEURONE_FORMULAS[neuron.id] ?? ''
          const parsedTerms = parseFormula(formula)
          const calcParts = parsedTerms.map((term, index) => {
            const rawValue = Number(neuron.inputs[term.id] ?? 0)
            const absValue = Math.abs(rawValue)
            const prefix = index === 0 ? '' : term.sign === 1 ? ' + ' : ' - '
            return `${prefix}${absValue}`
          })
          const computedFromFormula = parsedTerms.reduce((acc, term) => {
            const rawValue = Number(neuron.inputs[term.id] ?? 0)
            return acc + term.sign * Math.abs(rawValue)
          }, 0)
          const calcExpression =
            parsedTerms.length > 0
              ? `${calcParts.join('')} = ${computedFromFormula}`
              : `${displayedSum}`
          const outputVerdict = getOutputVerdictLabel(neuronDigit, winningDigit, {
            allOutputsValidated: allOutputsDone,
            neuronValidated: neuron.outputValidated,
          })

          return (
            <div key={neuron.id} className="rounded-xl border-2 border-grey p-3">
              <div className="mb-2 text-center text-darkBlue font-bold text-lg">
                {getNeuronLabel(neuron)}
              </div>
              <div className="mb-3 rounded-lg border border-grey bg-gray-50 px-3 py-2 text-xs text-darkBlue">
                <p className="font-semibold">
                  Formule : {formula || '—'} | Calcul : {calcExpression}
                </p>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div
                    className="grid text-center text-xs font-bold text-astro"
                    style={{
                      gridTemplateColumns: `repeat(${rulerValues.length}, 38px)`,
                    }}
                  >
                    {rulerValues.map((value) => (
                      <div key={`${neuron.id}-top-${value}`}>{value}</div>
                    ))}
                  </div>

                  <div className="relative mt-1 rounded border-2 border-grey">
                    <div
                      className="grid min-h-[68px] items-center bg-grey/40"
                      style={{
                        gridTemplateColumns: `repeat(${rulerValues.length}, 38px)`,
                      }}
                    >
                      {rulerValues.map((value) => (
                        <div
                          key={`${neuron.id}-mid-${value}`}
                          className={`h-full min-h-[68px] border-r border-grey/70 last:border-r-0 ${
                            value > thresholdValue ? 'bg-green/20' : 'bg-red/20'
                          }`}
                        />
                      ))}
                    </div>
                    <div
                      className="pointer-events-none absolute inset-y-0 z-20 w-[3px] bg-darkBlue"
                      style={{
                        left: `${thresholdPosition}%`,
                        transform: 'translateX(-50%)',
                      }}
                      aria-hidden
                    />
                    {rulerMarkerPositions.map((rounded) => {
                      const marks = refByRounded.get(rounded) ?? []
                      if (marks.length === 0) return null

                      const leftPct = clampPercent(
                        ((rounded - minValue + 0.5) / cellCount) * 100
                      )
                      return (
                        <div
                          key={`${neuron.id}-marker-${rounded}`}
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
                                    ? `${neuron.id}-session-${m.sessionId}`
                                    : `${neuron.id}-current-${rounded}`
                                }
                                pattern={m.grid}
                              />
                            ) : m.variant === 'p' || m.variant === 'g' ? (
                              <span
                                key={`${neuron.id}-${m.digit}-${m.variant}`}
                                className={[
                                  'inline-flex rounded border-2 px-1 py-px text-[10px] font-bold leading-none shadow-sm',
                                  DIGIT_MARK_BADGE_CLASSES[m.digit] ??
                                    'border-grey bg-white text-darkBlue',
                                ].join(' ')}
                                title={`Chiffre ${m.digit}, motif ${
                                  m.variant === 'p' ? 'perfect' : 'good'
                                } (DIGIT_EXAMPLES) — somme ${m.sum}`}
                              >
                                {m.digit}
                                {m.variant}
                              </span>
                            ) : null
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div
                    className="grid text-center text-xs font-bold text-astro mt-1"
                    style={{
                      gridTemplateColumns: `repeat(${rulerValues.length}, 38px)`,
                    }}
                  >
                    {rulerValues.map((value) => (
                      <div key={`${neuron.id}-bot-${value}`}>
                        {Math.max(0, value - thresholdValue)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const next = thresholdValue - 1
                    updateThreshold(neuron.id, next)
                    onApplySeuilThreshold(neuron.id, next)
                  }}
                  className="rounded-lg border-2 border-blue/40 px-3 py-1 text-blue font-bold hover:bg-blue/10 transition-colors"
                >
                  -
                </button>
                <input
                  type="range"
                  min={minValue}
                  max={maxValue}
                  step={1}
                  value={thresholdValue}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    updateThreshold(neuron.id, next)
                    scheduleApplySeuilThreshold(neuron.id, next)
                  }}
                  className="w-full accent-blue"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = thresholdValue + 1
                    updateThreshold(neuron.id, next)
                    onApplySeuilThreshold(neuron.id, next)
                  }}
                  className="rounded-lg border-2 border-blue/40 px-3 py-1 text-blue font-bold hover:bg-blue/10 transition-colors"
                >
                  +
                </button>
              </div>

              {outputVerdict && thresholdLayer === 'output' && (
                <p
                  className={`mt-3 text-center text-sm font-semibold ${
                    outputVerdict.startsWith('✓') ? 'text-green' : 'text-red'
                  }`}
                >
                  {outputVerdict}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )

  return (
    <>
      <ThresholdDigitSidePanel
        thresholdValues={effectiveThresholds}
        pattern={pattern}
        selectedDigit={selectedDigit}
        sessionDigits={sessionDigits}
        onSaveCurrent={handleSaveCurrentDigit}
        onRemoveSessionDigit={removeDigit}
        defaultOpen={mode === 'seuil'}
      />
      <div className="md:ml-11 min-w-0">
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setMode('calcul')}
          className={[
            'rounded-xl px-5 sm:px-6 py-3 text-sm font-semibold transition-colors border-2 min-h-11',
            mode === 'calcul'
              ? 'bg-blue text-white border-blue hover:bg-blue-hover'
              : 'bg-white text-blue border-blue/30 hover:bg-blue/10',
          ].join(' ')}
        >
          Mode calcul
        </button>
        <button
          type="button"
          onClick={() => {
            if (allOutputsDone) setMode('seuil')
          }}
          disabled={!allOutputsDone || mode === 'seuil'}
          className={[
            'rounded-xl px-5 sm:px-6 py-3 text-sm font-semibold transition-colors border-2 min-h-11',
            mode === 'seuil'
              ? 'bg-blue text-white border-blue hover:bg-blue-hover'
              : 'bg-white text-blue border-blue/30 hover:bg-blue/10',
            (!allCalculDone || mode === 'seuil') ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
          aria-disabled={!allCalculDone}
        >
          Mode seuil
        </button>
      </div>
      <div className="w-full min-w-0 overflow-x-auto pb-2">
        <div className="flex w-full min-w-0 max-w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-4 xl:gap-6">
          {mode === 'calcul' ? (
            <div className="mx-auto w-full max-w-[360px] lg:mx-0 lg:w-[260px] lg:shrink-0 xl:w-[300px] min-[1800px]:w-[360px] lg:pt-4 xl:pt-8">
              {beforePanel}
            </div>
          ) : (
            <div className="hidden lg:block lg:w-[260px] lg:shrink-0 xl:w-[300px] min-[1800px]:w-[360px] lg:pt-4 xl:pt-8" />
          )}
          <div className="mx-auto w-full min-w-0 max-w-full lg:mx-0 lg:min-w-[280px] lg:flex-1 xl:max-w-[680px] min-[1800px]:max-w-[980px]">
            {mode === 'calcul' ? (
              <NetworkVisualization
                inputNeurons={inputNeurons}
                hiddenNeurons={hiddenNeurons}
                outputNeurons={outputNeurons}
                onNeuronClick={onNeuronClick}
                onAutoCalculateHidden={onAutoCalculateHidden}
                onAutoCalculateOutput={onAutoCalculateOutput}
              />
            ) : (
              thresholdPanel
            )}
          </div>
          <div className="mx-auto w-full max-w-[360px] lg:mx-0 lg:w-[260px] lg:shrink-0 xl:w-[300px] min-[1800px]:w-[360px] lg:pt-4 xl:pt-8">
            {mode === 'calcul' ? (
              <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm animate-fade-in-up min-h-[220px] flex items-center justify-center">
                {allOutputsDone ? (
                  finalDecision !== null ? (
                    <div className="text-center space-y-4">
                      <h2 className="text-darkBlue text-2xl font-bold tracking-wide">
                        Décision finale
                      </h2>
                      <div
                        className={`text-7xl font-bold ${
                          finalDecision === selectedDigit ? 'text-green' : 'text-red'
                        }`}
                      >
                        {finalDecision}
                      </div>
                      <div
                        className={`text-lg font-medium ${
                          finalDecision === selectedDigit ? 'text-green' : 'text-red'
                        }`}
                      >
                        {finalDecision === selectedDigit
                          ? '✓ Reconnaissance réussie !'
                          : `✗ Erreur : ${selectedDigit} reconnu comme ${finalDecision}`}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <h2 className="text-darkBlue text-2xl font-bold tracking-wide">
                        Décision finale
                      </h2>
                      <p className="text-lg font-semibold text-astro">
                        Aucun chiffre reconnu
                      </p>
                      <p className="text-sm font-medium text-astro">
                        Aucun neurone de sortie n&apos;est activé (sortie &gt; 0).
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    <h2 className="text-darkBlue text-2xl font-bold tracking-wide mb-3">
                      Décision finale
                    </h2>
                    <p className="text-astro font-medium">
                      Validez les neurones de sortie pour afficher le résultat.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
      <div className="text-center mt-8">
        <button
          onClick={onReset}
          className="rounded-xl bg-blue px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors min-h-11"
        >
          Tester un nouveau chiffre
        </button>
      </div>
      </div>
    </>
  )
}

export default NetworkInteractionStep
