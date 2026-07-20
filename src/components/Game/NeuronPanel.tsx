import { useEffect, useMemo, useRef } from 'react'
import type { NeuronPanelProps } from './types'
import { NEURONE_FORMULAS } from './constants'

/** Marge minimale de chaque côté de la somme sur la règlette. */
const RULER_SUM_MARGIN = 15
const RULER_MIN_CELL_WIDTH_PX = 28

function computeRulerBounds(
  sum: number,
  threshold: number
): { rulerMin: number; rulerMax: number } {
  const low = Math.min(sum, threshold)
  const high = Math.max(sum, threshold)
  const span = Math.max(high - low, 1)
  const proportionalMin = Math.floor(low - span - 4)
  const proportionalMax = Math.ceil(high + span + 2)
  return {
    rulerMin: Math.min(sum - RULER_SUM_MARGIN, proportionalMin),
    rulerMax: Math.max(sum + RULER_SUM_MARGIN, proportionalMax),
  }
}

function reluOutput(x: number, threshold: number): number {
  return Math.max(0, x - threshold)
}

function buildAxisTicks(min: number, max: number, maxCount = 7): number[] {
  if (max <= min) return [min]
  const span = max - min
  const step = Math.max(1, Math.ceil(span / Math.max(maxCount - 1, 1)))
  const ticks: number[] = []
  const start = Math.floor(min / step) * step
  for (let value = start; value <= max; value += step) {
    if (value >= min - step * 0.001) ticks.push(value)
  }
  if (!ticks.includes(max)) ticks.push(max)
  if (!ticks.includes(min)) ticks.unshift(min)
  return [...new Set(ticks)].sort((a, b) => a - b)
}

function ReLuThresholdChart({
  sum,
  threshold,
}: {
  sum: number
  threshold: number
}) {
  const output = reluOutput(sum, threshold)
  const width = 280
  const height = 168
  const pad = { top: 4, right: 6, bottom: 22, left: 24 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const xMin = Math.min(sum, threshold) - 8
  const xMax = Math.max(sum, threshold) + 8
  const yMax = Math.max(3, output + 2)

  const toX = (x: number) =>
    pad.left + ((x - xMin) / Math.max(xMax - xMin, 1)) * plotW
  const toY = (y: number) => pad.top + plotH - (y / yMax) * plotH

  const xTicks = buildAxisTicks(Math.floor(xMin), Math.ceil(xMax), 8)
  const yTicks = buildAxisTicks(0, Math.ceil(yMax), 6)

  const kneeX = threshold
  const pathD = [
    `M ${toX(xMin)} ${toY(0)}`,
    `L ${toX(kneeX)} ${toY(0)}`,
    `L ${toX(xMax)} ${toY(reluOutput(xMax, threshold))}`,
  ].join(' ')

  const thresholdLineX = toX(kneeX)
  const sumPointX = toX(sum)
  const sumPointY = toY(output)
  const axisBottom = pad.top + plotH

  return (
    <div className="w-full min-w-0">
      <p className="mb-1 text-center text-xs font-semibold text-darkBlue">
        Courbe de sortie
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full max-h-[220px] rounded-md border border-grey bg-white sm:max-h-none"
        role="img"
        aria-label={`Courbe ReLU : plat sous le seuil ${threshold}, puis croissance linéaire. Somme ${sum}, sortie ${output}.`}
      >
        <rect
          x={pad.left}
          y={pad.top}
          width={Math.max(0, thresholdLineX - pad.left)}
          height={plotH}
          fill="#DC143C"
          fillOpacity={0.08}
        />
        <rect
          x={thresholdLineX}
          y={pad.top}
          width={Math.max(0, pad.left + plotW - thresholdLineX)}
          height={plotH}
          fill="#00A19A"
          fillOpacity={0.08}
        />

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              y1={toY(tick)}
              x2={pad.left + plotW}
              y2={toY(tick)}
              stroke="#EBEBEC"
              strokeWidth={1}
            />
            <text
              x={pad.left - 4}
              y={toY(tick) + 3}
              textAnchor="end"
              className="fill-astro text-[9px] font-medium"
            >
              {tick}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={toX(tick)}
              y1={pad.top}
              x2={toX(tick)}
              y2={axisBottom}
              stroke="#EBEBEC"
              strokeWidth={1}
            />
            <text
              x={toX(tick)}
              y={axisBottom + 12}
              textAnchor="middle"
              className="fill-astro text-[9px] font-medium"
            >
              {tick}
            </text>
          </g>
        ))}

        <line
          x1={pad.left}
          y1={axisBottom}
          x2={pad.left + plotW}
          y2={axisBottom}
          stroke="#2A233E"
          strokeWidth={1.5}
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={axisBottom}
          stroke="#2A233E"
          strokeWidth={1.5}
        />

        <path
          d={pathD}
          fill="none"
          stroke="#00A19A"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line
          x1={thresholdLineX}
          y1={pad.top}
          x2={thresholdLineX}
          y2={axisBottom}
          stroke="#1A182D"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        <circle
          cx={sumPointX}
          cy={sumPointY}
          r={5}
          fill="#F9BB12"
          stroke="#E6A610"
          strokeWidth={2}
        />

        <text
          x={pad.left + plotW / 2}
          y={height - 2}
          textAnchor="middle"
          className="fill-darkBlue text-[10px] font-semibold"
        >
          Somme
        </text>
        <text
          x={7}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 7 ${pad.top + plotH / 2})`}
          className="fill-darkBlue text-[10px] font-semibold"
        >
          Sortie
        </text>
      </svg>
    </div>
  )
}

function Phase2ThresholdRuler({
  sum,
  threshold,
  neuronId,
}: {
  sum: number
  threshold: number
  neuronId: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { rulerMin, rulerMax } = computeRulerBounds(sum, threshold)

  const rulerValues = useMemo(() => {
    const values: number[] = []
    for (let value = rulerMin; value <= rulerMax; value += 1) {
      values.push(value)
    }
    return values
  }, [rulerMin, rulerMax])

  const cellCount = Math.max(1, rulerValues.length)
  const gridColumns = `repeat(${cellCount}, minmax(0, 1fr))`
  const trackMinWidthPx = cellCount * RULER_MIN_CELL_WIDTH_PX

  const clampPercent = (value: number) => Math.max(0, Math.min(100, value))
  const thresholdPosition = clampPercent(
    ((threshold - rulerMin + 1) / cellCount) * 100
  )
  const sumPosition = clampPercent(
    ((sum - rulerMin + 0.5) / cellCount) * 100
  )

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const frame = requestAnimationFrame(() => {
      const track = container.firstElementChild as HTMLElement | null
      if (!track) return

      const cellWidth = track.scrollWidth / cellCount
      const sumCenterPx = (sum - rulerMin + 0.5) * cellWidth
      const targetScroll = sumCenterPx - container.clientWidth / 2
      container.scrollLeft = Math.max(
        0,
        Math.min(targetScroll, container.scrollWidth - container.clientWidth)
      )
    })

    return () => cancelAnimationFrame(frame)
  }, [sum, threshold, neuronId, rulerMin, rulerMax, cellCount])

  return (
    <div className="w-full min-w-0">
      <div ref={scrollRef} className="w-full overflow-x-auto">
        <div
          className="w-full"
          style={{ minWidth: `max(100%, ${trackMinWidthPx}px)` }}
        >
          <div
            className="grid w-full text-center text-xs font-bold text-astro"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {rulerValues.map((value) => (
              <div key={`${neuronId}-top-${value}`}>{value}</div>
            ))}
          </div>

          <div
            className="relative mt-1 grid w-full rounded border-2 border-grey bg-grey/40"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {rulerValues.map((value) => (
              <div
                key={`${neuronId}-cell-${value}`}
                className={`h-14 border-r border-grey/70 last:border-r-0 ${
                  value > threshold ? 'bg-green/20' : 'bg-red/20'
                }`}
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

            <div
              className="pointer-events-none absolute top-1/2 z-30 h-4 w-4 rounded-sm border-2 border-yellow-hover bg-yellow shadow-sm"
              style={{
                left: `${sumPosition}%`,
                transform: 'translate(-50%, -50%)',
              }}
              title={`Somme: ${sum}`}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-xs font-semibold text-darkBlue">
        Seuil : {threshold}
      </div>
      <div className="mt-1 text-center text-xs font-semibold text-yellow-hover">
        Somme : {sum}
      </div>
    </div>
  )
}

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

const NeuronPanel = ({
  neuronId,
  neuron,
  inputNeurons,
  hiddenNeurons,
  onClose,
  onValidateSum,
  onValidateOutput,
  onReturnToPhase1,
  onUpdateSumInput,
  onUpdateOutputInput,
}: NeuronPanelProps) => {
  const contentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [neuronId, neuron?.sumValidated, neuron?.outputValidated, neuron?.needsRecalculation])

  if (!neuron) return null

  const isOutput = neuron.layer === 'output'
  const expectedSum = Object.values(neuron.inputs).reduce(
    (acc, val) => acc + (Number(val) || 0),
    0
  )
  const expectedOutput = Math.max(
    0,
    (neuron.calculatedSum || 0) - neuron.threshold
  )
  const formula = NEURONE_FORMULAS[neuronId] ?? ''
  const parsedTerms = parseFormula(formula)
  const signByInput = new Map<string, 1 | -1>(
    parsedTerms.map((term) => [term.id, term.sign])
  )

  const getInputValues = () => {
    const values: { id: string; value: number }[] = []
    Object.keys(neuron.inputs).forEach((inputId) => {
      let actualValue = 0
      if (isOutput) {
        const hiddenNeuron = hiddenNeurons.find((n) => n.id === inputId)
        actualValue = hiddenNeuron?.calculatedOutput ?? 0
      } else {
        const inputNeuron = inputNeurons.find((n) => n.id === inputId)
        actualValue = inputNeuron?.value ?? 0
      }
      values.push({ id: inputId, value: actualValue })
    })
    return values
  }

  const handleSumValidation = () => {
    const userSum = parseFloat(neuron.userSumInput)
    if (!Number.isNaN(userSum)) onValidateSum(neuronId, userSum)
  }

  const handleOutputValidation = () => {
    const userOutput = parseFloat(neuron.userOutputInput)
    if (!Number.isNaN(userOutput)) onValidateOutput(neuronId, userOutput)
  }


  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-darkBlue/40 sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neuron-panel-title"
    >
      <div className="flex max-h-[92dvh] w-full min-h-0 flex-col overflow-hidden rounded-t-2xl border-2 border-grey bg-white shadow-xl sm:max-h-[90dvh] sm:max-w-3xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-grey/80 px-3 py-2 sm:px-5 sm:py-3">
          <h2
            id="neuron-panel-title"
            className="min-w-0 truncate text-lg font-bold tracking-wide text-darkBlue sm:text-2xl md:text-3xl"
          >
            Neurone {isOutput ? neuron.digit : neuronId}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-2xl font-bold text-astro transition-colors hover:bg-grey/40 hover:text-blue"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div
          ref={contentScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4 sm:py-3"
        >
        {neuron.needsRecalculation && (
          <div
            className="mb-2 flex items-start gap-2 rounded-lg border-2 border-yellow bg-yellow/15 px-2.5 py-2 text-darkBlue sm:mb-3 sm:px-3"
            role="status"
          >
            <span className="text-xl leading-none sm:text-2xl" aria-hidden>
              ⚠️
            </span>
            <p className="min-w-0 text-sm font-semibold leading-relaxed">
              Le seuil a été modifié en mode seuil : la sortie affichée est
              recalculée avec le nouveau seuil. Validez à nouveau les étapes
              ci-dessous pour confirmer.
            </p>
          </div>
        )}

        {(!neuron.sumValidated || neuron.outputValidated) && (
        <div className="min-w-0 rounded-xl border border-grey bg-gray-50 p-2 sm:p-2.5 md:p-3">
            <h3 className="mb-2 text-base font-bold text-darkBlue sm:text-lg">
              Phase 1 : Calcul de la somme
            </h3>
            <div className="space-y-4">
              {neuron.outputValidated && (
                <div className="bg-green/10 border border-green/60 rounded-lg p-3 text-sm text-darkBlue">
                  <div className="font-semibold text-green mb-2">
                    Récapitulatif de la précédente tentative
                  </div>
                  <p>
                    Somme précédente :{' '}
                    <span className="font-bold">{neuron.calculatedSum}</span>
                  </p>
                  <p>
                    Seuil précédent :{' '}
                    <span className="font-bold">{neuron.threshold}</span>
                  </p>
                  <p>
                    Sortie précédente :{' '}
                    <span className="font-bold">
                      {neuron.calculatedOutput}
                    </span>
                  </p>
                </div>
              )}
              {!neuron.outputValidated &&
                neuron.sumValidated &&
                neuron.calculatedSum !== null && (
                  <div className="bg-green/10 border border-green/60 rounded-lg p-3 text-sm text-darkBlue">
                    <div className="font-semibold text-green mb-1">
                      Somme précédente
                    </div>
                    <p>
                      Somme précédente :{' '}
                      <span className="font-bold">{neuron.calculatedSum}</span>
                    </p>
                  </div>
                )}
              <div>
                <div className="text-darkBlue font-semibold mb-2">
                  Formule :
                </div>
                <div className="overflow-x-auto rounded-lg border border-grey bg-white p-3 font-mono text-base font-medium text-astro sm:text-lg">
                  {parsedTerms.length === 0
                    ? formula
                    : parsedTerms.map((term, index) => {
                        const colorClass =
                          term.sign === 1 ? 'text-green' : 'text-red'
                        const isFirst = index === 0
                        return (
                          <span key={`${term.id}-${index}`}>
                            {!isFirst && (
                              <span className={colorClass}>
                                {term.sign === 1 ? ' + ' : ' - '}
                              </span>
                            )}
                            <span className={colorClass}>{term.id}</span>
                          </span>
                        )
                      })}
                </div>
              </div>
              <div>
                <div className="text-darkBlue font-semibold mb-2">
                  Valeurs des entrées :
                </div>
                <div className="space-y-2">
                  {getInputValues().map(({ id, value }) => (
                    <div
                      key={id}
                      className="flex justify-between text-sm text-darkBlue"
                    >
                      {(() => {
                        const sign = signByInput.get(id) ?? 1
                        const colorClass =
                          sign === 1 ? 'text-green' : 'text-red'
                        return (
                          <>
                            <span className={colorClass}>{id} :</span>
                            <span className={colorClass}>{value}</span>
                          </>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-darkBlue font-semibold block mb-2">
                  Somme = ?
                </label>
                  <input
                    type="number"
                    value={neuron.userSumInput}
                    onChange={(e) => onUpdateSumInput(neuronId, e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-grey bg-white px-4 py-2 text-base font-bold text-darkBlue sm:text-lg"
                    placeholder="Entrez la somme"
                  />
              </div>
              <button
                type="button"
                onClick={handleSumValidation}
                className="w-full min-h-11 rounded-lg border border-blue bg-blue px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-hover sm:px-6"
              >
                Valider la somme
              </button>
              {neuron.userSumInput &&
              Math.abs(parseFloat(neuron.userSumInput) - expectedSum) < 0.1 ? (
                <div className="bg-green/20 border border-green text-green text-center py-2 rounded">
                  ✓ Somme correcte !
                </div>
              ) : neuron.userSumInput &&
                Math.abs(
                  parseFloat(neuron.userSumInput) - expectedSum
                ) >= 0.1 ? (
                <div className="bg-red/20 border border-red text-red text-center py-2 rounded">
                  ✗ Somme incorrecte
                </div>
              ) : null}
            </div>
          </div>
        )}

        {neuron.sumValidated && !neuron.outputValidated && (
            <div className="min-w-0 rounded-xl border border-grey bg-gray-50 p-2 sm:p-2.5 md:p-3">
              <h3 className="mb-2 text-base font-bold text-darkBlue sm:text-lg">
                Phase 2 : Application du seuil
              </h3>
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => onReturnToPhase1(neuronId)}
                  className="inline-flex items-center gap-2 text-astro hover:text-blue transition-colors duration-200 text-sm font-medium tracking-wide"
                >
                  ← Retour à la phase 1
                </button>
                {neuron.calculatedOutput !== null && (
                  <div className="bg-green/10 border border-green/60 rounded-lg p-3 text-sm text-darkBlue">
                    <div className="font-semibold text-green mb-2">
                      Récapitulatif précédent
                    </div>
                    <p>
                      Somme précédente :{' '}
                      <span className="font-bold">
                        {neuron.calculatedSum}
                      </span>
                    </p>
                    <p>
                      Seuil précédent :{' '}
                      <span className="font-bold">{neuron.threshold}</span>
                    </p>
                    <p>
                      Sortie précédente :{' '}
                      <span className="font-bold">
                        {neuron.calculatedOutput}
                      </span>
                    </p>
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="flex shrink-0 flex-col gap-3">
                    <div>
                      <div className="mb-1 text-sm font-semibold text-darkBlue sm:mb-2">
                        Somme validée :
                      </div>
                      <div className="text-xl font-bold text-darkBlue sm:text-2xl">
                        {neuron.calculatedSum}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-semibold text-darkBlue sm:mb-2">
                        Seuil :
                      </div>
                      <div className="text-lg font-bold text-yellow-hover sm:text-xl">
                        {neuron.threshold}
                      </div>
                    </div>
                  </div>
                  {neuron.calculatedSum !== null && (
                    <div className="min-w-0 w-full md:max-w-[320px] md:flex-1">
                      <ReLuThresholdChart
                        sum={neuron.calculatedSum}
                        threshold={neuron.threshold}
                      />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-2 font-semibold text-darkBlue">
                    Règle de calcul :
                  </div>
                  <div className="mb-2 text-sm font-medium leading-relaxed text-astro">
                    Si (somme - seuil) &lt; 0 alors sortie = 0, sinon sortie =
                    somme - seuil
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-lg border-2 border-grey bg-white p-2 sm:p-3">
                    {neuron.calculatedSum !== null && (
                      <Phase2ThresholdRuler
                        sum={neuron.calculatedSum}
                        threshold={neuron.threshold}
                        neuronId={neuronId}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-darkBlue font-semibold block mb-2">
                    Sortie = ?
                  </label>
                  <input
                    type="number"
                    value={neuron.userOutputInput}
                    onChange={(e) =>
                      onUpdateOutputInput(neuronId, e.target.value)
                    }
                    className="w-full min-h-11 rounded-lg border border-grey bg-white px-4 py-2 text-base font-bold text-darkBlue sm:text-lg"
                    placeholder="Entrez la sortie"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOutputValidation}
                  className="w-full min-h-11 rounded-lg border border-blue bg-blue px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-hover sm:px-6"
                >
                  Valider la sortie
                </button>
                {neuron.userOutputInput &&
                Math.abs(
                  parseFloat(neuron.userOutputInput) - expectedOutput
                ) < 0.1 ? (
                  <div className="bg-green/20 border border-green text-green text-center py-2 rounded">
                    ✓ Sortie correcte !
                  </div>
                ) : neuron.userOutputInput &&
                  Math.abs(
                    parseFloat(neuron.userOutputInput) - expectedOutput
                  ) >= 0.1 ? (
                  <div className="bg-red/20 border border-red text-red text-center py-2 rounded">
                    ✗ Sortie incorrecte
                  </div>
                ) : null}
              </div>
            </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default NeuronPanel