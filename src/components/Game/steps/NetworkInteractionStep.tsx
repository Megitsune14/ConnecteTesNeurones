import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InputNeuronData, NeuronData } from '../types'
import NetworkVisualization from '../NetworkVisualization'
import { NETWORK_STRUCTURE, NEURONE_FORMULAS } from '../constants'
import {
  getReferenceMarksForHiddenNeuron,
  getReferenceMarksForOutputNeuron,
} from '../referenceDigitSums'
import ThresholdDigitSidePanel from '../ThresholdDigitSidePanel'
import ThresholdRuler, {
  THRESHOLD_RULER_MAX,
  THRESHOLD_RULER_MIN,
} from '../ThresholdRuler'
import { useSessionDigits } from '../sessionDigits'
import {
  formatAmbiguityMessage,
  getOutputVerdictLabel,
  resolveNetworkDecision,
  type NetworkDecision,
  type OutputActivation,
} from '../networkDecision'
import { TutorialCoachMark } from '../../Tutorial'

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
    const clamped = Math.max(
      THRESHOLD_RULER_MIN,
      Math.min(THRESHOLD_RULER_MAX, Math.round(nextValue))
    )
    setThresholdValues((prev) => ({
      ...prev,
      [neuronId]: clamped,
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
    <section className="mx-auto w-full max-w-5xl bg-white border-2 border-grey rounded-2xl p-3 sm:p-4 shadow-sm animate-fade-in-up">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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

      <div className="space-y-4">
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
          const displayedSum = Math.round(sumValue)

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
            <div key={neuron.id} className="rounded-xl border-2 border-grey p-2.5 sm:p-3">
              <div className="mb-1.5 text-center text-darkBlue font-bold text-base">
                {getNeuronLabel(neuron)}
              </div>
              <div className="mb-2 rounded-lg border border-grey bg-gray-50 px-2.5 py-1.5 text-[11px] text-darkBlue">
                <p className="font-semibold">
                  Formule : {formula || '—'} | Calcul : {calcExpression}
                </p>
              </div>

              <ThresholdRuler
                neuronId={neuron.id}
                thresholdValue={thresholdValue}
                refMarks={refMarks}
                displayedSum={displayedSum}
                hasCurrentGrid={pattern != null}
              />

              <div className="mx-auto mt-2 flex w-full items-center gap-2">
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
                  min={THRESHOLD_RULER_MIN}
                  max={THRESHOLD_RULER_MAX}
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
      <TutorialCoachMark
        step={
          mode === 'seuil' ? 'network-interaction-seuil' : 'network-interaction'
        }
      />
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
            />
          ) : (
            thresholdPanel
          )}
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
