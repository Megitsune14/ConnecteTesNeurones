import { useEffect } from 'react'
import type { NeuronPanelProps } from './types'
import { NEURONE_FORMULAS } from './constants'

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

  const displayedSum = neuron.calculatedSum ?? expectedSum
  const MIN_TICK_COUNT = 17
  const rawMin = Math.floor(Math.min(displayedSum, neuron.threshold, 0)) - 4
  const rawMax = Math.ceil(Math.max(displayedSum, neuron.threshold, 0)) + 4
  let rulerMin = rawMin
  let rulerMax = rawMax
  const currentTickCount = rulerMax - rulerMin + 1
  if (currentTickCount < MIN_TICK_COUNT) {
    const missingTicks = MIN_TICK_COUNT - currentTickCount
    const extraLeft = Math.floor(missingTicks / 2)
    const extraRight = missingTicks - extraLeft
    rulerMin -= extraLeft
    rulerMax += extraRight
  }
  const rulerValues: number[] = []
  for (let value = rulerMin; value <= rulerMax; value += 1) {
    rulerValues.push(value)
  }
  const cellCount = Math.max(1, rulerValues.length)
  const clampPercent = (value: number) => Math.max(0, Math.min(100, value))
  // Zone verte : valeur strictement supérieure au seuil (à l’égalité, sortie ReLU = 0 → rouge).
  const thresholdPosition = clampPercent(
    ((neuron.threshold - rulerMin) / cellCount) * 100
  )
  // La somme est matérialisée au centre de sa case.
  const sumPosition = clampPercent(
    ((displayedSum - rulerMin + 0.5) / cellCount) * 100
  )

  // Verrouille le scroll de la page pendant l'ouverture de la modale.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-darkBlue/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-grey rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-darkBlue text-3xl font-bold tracking-wide">
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
                  ✗ Somme incorrecte. Attendu : {expectedSum}
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
                    <div className="overflow-x-auto">
                      <div className="inline-block min-w-full">
                        <div
                          className="grid text-center text-xs font-bold text-astro"
                          style={{
                            gridTemplateColumns: `repeat(${rulerValues.length}, 32px)`,
                          }}
                        >
                          {rulerValues.map((value) => (
                            <div key={`top-${value}`}>{value}</div>
                          ))}
                        </div>

                        <div
                          className="relative mt-1 grid rounded border-2 border-grey bg-grey/40"
                          style={{
                            gridTemplateColumns: `repeat(${rulerValues.length}, 32px)`,
                          }}
                        >
                          {rulerValues.map((value, index) => {
                            const isGreenZone = value > neuron.threshold
                            return (
                              <div
                                key={`cell-${value}-${index}`}
                                className={`h-14 border-r border-grey/70 last:border-r-0 ${
                                  isGreenZone ? 'bg-green/20' : 'bg-red/20'
                                }`}
                              />
                            )
                          })}

                          <div
                            className="pointer-events-none absolute inset-y-0 w-[3px] bg-darkBlue z-20"
                            style={{
                              left: `${thresholdPosition}%`,
                              transform: 'translateX(-50%)',
                            }}
                          />

                          {neuron.calculatedSum !== null && (
                            <div
                              className="pointer-events-none absolute top-1/2 z-30 h-4 w-4 -translate-y-1/2 rounded-sm border-2 border-yellow-hover bg-yellow shadow-sm"
                              style={{
                                left: `${sumPosition}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              title={`Somme: ${neuron.calculatedSum}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-center text-xs font-semibold text-darkBlue">
                      Seuil : {neuron.threshold}
                    </div>
                    {neuron.calculatedSum !== null && (
                      <div className="mt-1 text-center text-xs font-semibold text-yellow-hover">
                        Somme : {neuron.calculatedSum}
                      </div>
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
                    ✗ Sortie incorrecte. Attendu : {expectedOutput}
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