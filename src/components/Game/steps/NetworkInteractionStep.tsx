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
  formatAmbiguityMessage,
  getOutputVerdictLabel,
  resolveNetworkDecision,
  type NetworkDecision,
  type OutputActivation,
} from '../networkDecision'

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
  networkDecision: NetworkDecision
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
  networkDecision,
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
  const outputActivations: OutputActivation[] = NETWORK_STRUCTURE.output
    .map((outputId) => outputNeurons.find((n) => n.id === outputId))
    .filter((n): n is NeuronData => n != null && n.outputValidated)
    .map((n) => ({
      digit: n.digit ?? (parseInt(n.id.replace('NEURONE', ''), 10) || 0),
      value: n.calculatedOutput ?? 0,
    }))

  const localNetworkDecision = allOutputsDone
    ? resolveNetworkDecision(outputActivations)
    : networkDecision

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

      {thresholdLayer === 'output' &&
        allOutputsDone &&
        localNetworkDecision.status === 'ambiguous' && (
        <p className="mb-4 rounded-xl border border-yellow-hover/60 bg-yellow/15 px-4 py-3 text-center text-sm font-semibold text-darkBlue">
          {formatAmbiguityMessage(localNetworkDecision.digits)}
        </p>
      )}

      {thresholdLayer === 'output' &&
        allOutputsDone &&
        localNetworkDecision.status === 'none' && (
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
          const outputVerdict = getOutputVerdictLabel(neuronDigit, localNetworkDecision, {
            allOutputsValidated: allOutputsDone,
            neuronValidated: neuron.outputValidated,
            activation: neuron.calculatedOutput ?? 0,
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
                    outputVerdict.startsWith('✓')
                      ? 'text-green'
                      : outputVerdict.startsWith('↔')
                        ? 'text-darkBlue'
                        : 'text-red'
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
        <div className="mx-auto w-full min-w-0 max-w-full min-[1800px]:max-w-[1400px]">
          {mode === 'calcul' ? (
            <NetworkVisualization
              inputNeurons={inputNeurons}
              hiddenNeurons={hiddenNeurons}
              outputNeurons={outputNeurons}
              onNeuronClick={onNeuronClick}
              onAutoCalculateHidden={onAutoCalculateHidden}
              onAutoCalculateOutput={onAutoCalculateOutput}
              pattern={pattern}
              finalDecision={finalDecision}
              selectedDigit={selectedDigit}
            />
          ) : (
            thresholdPanel
          )}
<<<<<<< HEAD
=======
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
                  networkDecision.status === 'clear' ? (
                    <div className="text-center space-y-4">
                      <h2 className="text-darkBlue text-2xl font-bold tracking-wide">
                        Décision finale
                      </h2>
                      <div
                        className={`text-7xl font-bold ${
                          networkDecision.digit === selectedDigit
                            ? 'text-green'
                            : 'text-red'
                        }`}
                      >
                        {networkDecision.digit}
                      </div>
                      <div
                        className={`text-lg font-medium ${
                          networkDecision.digit === selectedDigit
                            ? 'text-green'
                            : 'text-red'
                        }`}
                      >
                        {networkDecision.digit === selectedDigit
                          ? '✓ Reconnaissance réussie !'
                          : `✗ Erreur : ${selectedDigit} reconnu comme ${networkDecision.digit}`}
                      </div>
                    </div>
                  ) : networkDecision.status === 'ambiguous' ? (
                    <div className="text-center space-y-4">
                      <h2 className="text-darkBlue text-2xl font-bold tracking-wide">
                        Décision finale
                      </h2>
                      <p className="text-3xl font-bold text-yellow-hover">
                        Ambiguïté
                      </p>
                      <p className="text-lg font-semibold text-darkBlue">
                        {formatAmbiguityMessage(networkDecision.digits)}
                      </p>
                      <p className="text-sm font-medium text-astro">
                        {selectedDigit != null &&
                        networkDecision.digits.includes(selectedDigit)
                          ? `Le chiffre attendu (${selectedDigit}) fait partie des candidats actifs, mais le réseau ne tranche pas.`
                          : selectedDigit != null
                            ? `Le chiffre attendu (${selectedDigit}) ne correspond pas à cette ambiguïté.`
                            : null}
                      </p>
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
>>>>>>> refs/remotes/origin/main
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
