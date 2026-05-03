import { useEffect, useMemo, useState } from 'react'
import type { InputNeuronData, NeuronData } from '../types'
import NetworkVisualization from '../NetworkVisualization'
import { NETWORK_STRUCTURE } from '../constants'

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
}: NetworkInteractionStepProps) => {
  type InteractionMode = 'calcul' | 'seuil'
  type ThresholdLayer = 'hidden' | 'output'
  const [mode, setMode] = useState<InteractionMode>('calcul')
  const [thresholdLayer, setThresholdLayer] = useState<ThresholdLayer>('output')
  const [thresholdValues, setThresholdValues] = useState<Record<string, number>>({})

  const allCalculDone =
    hiddenNeurons.length >= NETWORK_STRUCTURE.hidden.length &&
    hiddenNeurons.every((n) => n.sumValidated)

  const allOutputsDone = NETWORK_STRUCTURE.output.every((outputId) => {
    const neuron = outputNeurons.find((n) => n.id === outputId)
    return neuron?.outputValidated === true
  })
  const winningDigit = (() => {
    const validatedOutputs = outputNeurons
      .filter((n) => n.outputValidated)
      .map((n) => ({
        digit: n.digit ?? (parseInt(n.id.replace('NEURONE', ''), 10) || 0),
        value: n.calculatedOutput ?? 0,
      }))
    if (validatedOutputs.length === 0) return null
    return validatedOutputs.reduce((a, b) => (a.value > b.value ? a : b)).digit
  })()

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

  const getNeuronLabel = (neuron: NeuronData) =>
    neuron.layer === 'output' ? `Neurone ${neuron.digit ?? ''}`.trim() : `Neurone ${neuron.id}`

  const updateThreshold = (neuronId: string, nextValue: number) => {
    setThresholdValues((prev) => ({
      ...prev,
      [neuronId]: Math.round(nextValue),
    }))
  }

  const beforePanel = (
    <section className="bg-white border-2 border-grey rounded-2xl p-8 shadow-sm animate-fade-in-up">
      <h2 className="text-darkBlue text-2xl font-bold tracking-wide mb-6 text-center">
        Grille de départ
      </h2>
      <div className="flex justify-center">
        {pattern != null ? (
          <div className="relative inline-block">
            <div className="border-4 border-grey rounded-2xl p-2 bg-gray-50 shadow-sm relative">
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
              <div className="ml-12 mt-7 flex flex-col gap-0 relative">
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
                                      style={{ width: '28px', height: '28px' }}
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
                                  className="bg-red relative z-[5]"
                                  style={{
                                    width: '3px',
                                    marginLeft: '2px',
                                    marginRight: '2px',
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    {ligGroup < 2 && (
                      <div
                        className="w-full bg-yellow relative z-[5]"
                        style={{
                          height: '3px',
                          marginTop: '2px',
                          marginBottom: '2px',
                        }}
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
    <section className="bg-white border-2 border-grey rounded-2xl p-6 shadow-sm animate-fade-in-up">
      <div className="mb-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setThresholdLayer('hidden')}
          className={[
            'rounded-xl px-5 py-2 text-sm font-semibold transition-colors border-2',
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
            'rounded-xl px-5 py-2 text-sm font-semibold transition-colors border-2',
            thresholdLayer === 'output'
              ? 'bg-blue text-white border-blue hover:bg-blue-hover'
              : 'bg-white text-blue border-blue/30 hover:bg-blue/10',
          ].join(' ')}
        >
          Neurones de sortie
        </button>
      </div>

      <div className="space-y-5">
        {neuronsForThresholdMode.map((neuron) => {
          const sumValue =
            neuron.calculatedSum ??
            Object.values(neuron.inputs).reduce(
              (acc, value) => acc + (Number(value) || 0),
              0
            )
          const thresholdValue = thresholdValues[neuron.id] ?? neuron.threshold
          const minValue = Math.min(-8, Math.floor(Math.min(sumValue, thresholdValue) - 4))
          const maxValue = Math.max(12, Math.ceil(Math.max(sumValue, thresholdValue) + 4))
          const rulerValues = Array.from(
            { length: maxValue - minValue + 1 },
            (_, index) => minValue + index
          )

          const neuronDigit =
            neuron.digit ?? (parseInt(neuron.id.replace('NEURONE', ''), 10) || 0)
          const outputVerdict =
            thresholdLayer === 'output' &&
            neuron.outputValidated &&
            winningDigit !== null
              ? neuronDigit === winningDigit
                ? `✓ C'est un ${neuronDigit}`
                : `✗ Ce n'est pas un ${neuronDigit}`
              : null

          return (
            <div key={neuron.id} className="rounded-xl border-2 border-grey p-3">
              <div className="mb-2 text-center text-darkBlue font-bold text-lg">
                {getNeuronLabel(neuron)}
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

                  <div
                    className="mt-1 grid border-2 border-grey rounded"
                    style={{
                      gridTemplateColumns: `repeat(${rulerValues.length}, 38px)`,
                    }}
                  >
                    {rulerValues.map((value) => (
                      <div
                        key={`${neuron.id}-mid-${value}`}
                        className={`h-10 border-r border-grey/70 last:border-r-0 ${
                          value >= thresholdValue ? 'bg-green/20' : 'bg-red/20'
                        }`}
                      >
                        {Math.round(sumValue) === value && (
                          <div className="mx-auto mt-1 h-8 w-8 rounded border-2 border-red bg-skyBlue text-darkBlue font-bold flex items-center justify-center">
                            {Math.round(sumValue)}
                          </div>
                        )}
                      </div>
                    ))}
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
                  onClick={() => updateThreshold(neuron.id, thresholdValue - 1)}
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
                  onChange={(e) => updateThreshold(neuron.id, Number(e.target.value))}
                  className="w-full accent-blue"
                />
                <button
                  type="button"
                  onClick={() => updateThreshold(neuron.id, thresholdValue + 1)}
                  className="rounded-lg border-2 border-blue/40 px-3 py-1 text-blue font-bold hover:bg-blue/10 transition-colors"
                >
                  +
                </button>
              </div>

              {outputVerdict && (
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
      <div className="mb-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setMode('calcul')}
          className={[
            'rounded-xl px-6 py-3 text-sm font-semibold transition-colors border-2',
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
            'rounded-xl px-6 py-3 text-sm font-semibold transition-colors border-2',
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
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-start gap-6 min-w-max">
          {mode === 'calcul' ? (
            <div className="w-[360px] shrink-0 pt-[120px]">{beforePanel}</div>
          ) : (
            <div className="w-[360px] shrink-0 pt-[120px]" />
          )}
          <div className="w-[980px] shrink-0">
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
          <div className="w-[360px] shrink-0 pt-[120px]">
            {mode === 'calcul' ? (
              <section className="bg-white border-2 border-grey rounded-2xl p-8 shadow-sm animate-fade-in-up min-h-[220px] flex items-center justify-center">
                {finalDecision !== null ? (
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
            ) : (
              <div className="min-h-[220px]" />
            )}
          </div>
        </div>
      </div>
      <div className="text-center">
        <button
          onClick={onReset}
          className="rounded-xl bg-blue px-12 py-4 text-lg font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors"
        >
          Tester un nouveau chiffre
        </button>
      </div>
    </>
  )
}

export default NetworkInteractionStep
