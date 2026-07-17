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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

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
    <div className="fixed inset-0 bg-darkBlue/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-8 max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4 sm:mb-6 gap-3">
          <h2 className="text-darkBlue text-xl sm:text-3xl font-bold tracking-wide">
            Neurone {isOutput ? neuron.digit : neuronId}
          </h2>
          <button
            onClick={onClose}
            className="text-astro hover:text-blue text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {neuron.needsRecalculation && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border-2 border-yellow bg-yellow/15 px-4 py-3 text-darkBlue"
            role="status"
          >
            <span className="text-2xl leading-none" aria-hidden>
              ⚠️
            </span>
            <p className="text-sm font-semibold leading-relaxed">
              Le seuil a été modifié en mode seuil : la sortie affichée est
              recalculée avec le nouveau seuil. Validez à nouveau les étapes
              ci-dessous pour confirmer.
            </p>
          </div>
        )}

        {(!neuron.sumValidated || neuron.outputValidated) && (
        <div className="space-y-6">
          <div className="bg-gray-50 border border-grey rounded-xl p-4">
            <h3 className="text-darkBlue text-xl font-bold mb-4">
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
                <div className="text-astro font-mono bg-white border border-grey rounded-lg p-3 text-lg font-medium">
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
                  className="w-full bg-white border border-grey rounded-lg px-4 py-2 text-darkBlue text-lg font-bold"
                  placeholder="Entrez la somme"
                />
              </div>
              <button
                onClick={handleSumValidation}
                className="w-full px-6 py-3 bg-blue text-white border border-blue rounded hover:bg-blue-hover transition-colors font-semibold"
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
        </div>
        )}

        {neuron.sumValidated && !neuron.outputValidated && (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-grey rounded-xl p-4">
              <h3 className="text-darkBlue text-xl font-bold mb-4">
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
                <div>
                  <div className="text-darkBlue font-semibold mb-2">
                    Somme validée :
                  </div>
                  <div className="text-darkBlue text-2xl font-bold">
                    {neuron.calculatedSum}
                  </div>
                </div>
                <div>
                  <div className="text-darkBlue font-semibold mb-2">
                    Seuil :
                  </div>
                  <div className="text-yellow-hover text-xl font-bold">
                    {neuron.threshold}
                  </div>
                </div>
                <div>
                  <div className="text-darkBlue font-semibold mb-2">
                    Règle de calcul :
                  </div>
                  <div className="text-astro text-sm mb-2 font-medium leading-relaxed">
                    Si (somme - seuil) &lt; 0 alors sortie = 0,
                    <br />
                    sinon sortie = somme - seuil
                  </div>
                  <div className="rounded-lg border-2 border-grey bg-white p-3">
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
                    className="w-full bg-white border border-grey rounded-lg px-4 py-2 text-darkBlue text-lg font-bold"
                    placeholder="Entrez la sortie"
                  />
                </div>
                <button
                  onClick={handleOutputValidation}
                  className="w-full px-6 py-3 bg-blue text-white border border-blue rounded hover:bg-blue-hover transition-colors font-semibold"
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
          </div>
        )}
      </div>
    </div>
  )
}

export default NeuronPanel