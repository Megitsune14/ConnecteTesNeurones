import { NETWORK_STRUCTURE } from '../constants'

interface PixelCountingStepProps {
  /** Grille 9×6 dessinée par l'utilisateur (pas DIGIT_PATTERNS). */
  pattern: number[][]
  userCounts: { [key: string]: number }
  onUpdateCount: (bandeletteId: string, count: number) => void
  allCountsEntered: boolean
  onProceed: () => void
}

const PixelCountingStep = ({
  pattern,
  userCounts,
  onUpdateCount,
  allCountsEntered,
  onProceed,
}: PixelCountingStepProps) => {
  const getActualCount = (neuronId: string): number => {
    const isCol = neuronId.startsWith('COL')
    const num = neuronId.slice(3)
    let count = 0

    if (isCol) {
      const colStart = (parseInt(num, 10) - 1) * 2
      const colEnd = colStart + 2
      for (let gridRow = 0; gridRow < 9; gridRow++) {
        for (let gridCol = colStart; gridCol < colEnd; gridCol++) {
          if ((pattern[gridRow]?.[gridCol] ?? 0) === 1) count++
        }
      }
      return count
    }

    const rowStart = (parseInt(num, 10) - 1) * 3
    const rowEnd = rowStart + 3
    for (let gridRow = rowStart; gridRow < rowEnd; gridRow++) {
      for (let gridCol = 0; gridCol < 6; gridCol++) {
        if ((pattern[gridRow]?.[gridCol] ?? 0) === 1) count++
      }
    }
    return count
  }

  const handleAutoCount = () => {
    NETWORK_STRUCTURE.input.forEach((neuronId) => {
      onUpdateCount(neuronId, getActualCount(neuronId))
    })
  }

  return (
    <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm animate-fade-in-up">
      <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-darkBlue text-2xl sm:text-3xl font-bold tracking-wide text-center sm:flex-1">
          Comptage des pixels
        </h2>
        <button
          type="button"
          onClick={handleAutoCount}
          className="rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors shrink-0 min-h-11 w-full sm:w-auto"
        >
          Compter automatiquement
        </button>
      </div>
      <div className="space-y-6">
        <p className="text-astro text-center text-base sm:text-lg font-medium leading-relaxed">
          Comptez le nombre de pixels noirs dans chaque bandelette et entrez
          les valeurs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NETWORK_STRUCTURE.input.map((neuronId) => {
            const isCol = neuronId.startsWith('COL')
            const num = neuronId.slice(3)
            let bandelettePixels: number[][] = []

            if (isCol) {
              const colStart = (parseInt(num, 10) - 1) * 2
              const colEnd = colStart + 2
              for (let gridRow = 0; gridRow < 9; gridRow++) {
                const row: number[] = []
                for (let gridCol = colStart; gridCol < colEnd; gridCol++) {
                  row.push(pattern[gridRow]?.[gridCol] ?? 0)
                }
                bandelettePixels.push(row)
              }
            } else {
              const rowStart = (parseInt(num, 10) - 1) * 3
              const rowEnd = rowStart + 3
              for (let gridRow = rowStart; gridRow < rowEnd; gridRow++) {
                const row: number[] = []
                for (let gridCol = 0; gridCol < 6; gridCol++) {
                  row.push(pattern[gridRow]?.[gridCol] ?? 0)
                }
                bandelettePixels.push(row)
              }
            }

            const actualCount = getActualCount(neuronId)

            return (
              <div
                key={neuronId}
                className="bg-gray-50 border-2 border-grey rounded-xl p-6 space-y-4"
              >
                <div className="text-center">
                  <h4
                    className={`text-xl font-bold ${
                      isCol ? 'text-red' : 'text-yellow-hover'
                    }`}
                  >
                    {neuronId}
                  </h4>
                  <p className="text-astro text-sm mt-1 font-medium">
                    {isCol ? 'Colonne' : 'Ligne'} {num} -{' '}
                    {isCol ? '2×9' : '6×3'} pixels
                  </p>
                  <p className="text-astro text-xs mt-1 font-medium">
                    Comptez les pixels (noirs)
                  </p>
                </div>
                <div className="flex justify-center">
                  <div
                    className={`border-2 ${
                      isCol ? 'border-red/50' : 'border-yellow/50'
                    } rounded p-3 bg-grey/40`}
                  >
                    {isCol ? (
                      <div className="flex gap-1">
                        {bandelettePixels[0].map((_, colIdx) => (
                          <div
                            key={`col-${colIdx}`}
                            className="flex flex-col gap-1"
                          >
                            {bandelettePixels.map((row, rowIdx) => (
                              <div
                                key={`${rowIdx}-${colIdx}`}
                                className={`w-10 h-10 border-2 rounded-sm ${
                                  row[colIdx] === 1
                                    ? 'bg-black border-black'
                                    : 'bg-grey/60 border-grey'
                                }`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {bandelettePixels.map((row, rowIdx) => (
                          <div
                            key={`row-${rowIdx}`}
                            className="flex gap-1"
                          >
                            {row.map((pixel, colIdx) => (
                              <div
                                key={`${rowIdx}-${colIdx}`}
                                className={`w-10 h-10 border-2 rounded-sm ${
                                  pixel === 1
                                    ? 'bg-black border-black'
                                    : 'bg-grey/60 border-grey'
                                }`}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-darkBlue font-semibold text-sm">
                    Nombre de pixels noirs :
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={18}
                    value={userCounts[neuronId] ?? ''}
                    onChange={(e) =>
                      onUpdateCount(
                        neuronId,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="w-full bg-white border border-grey rounded-lg px-3 py-2 text-darkBlue text-center text-lg font-bold"
                    placeholder="0"
                  />
                  {userCounts[neuronId] !== undefined && (
                    <div
                      className={`text-center py-1 rounded text-sm ${
                        userCounts[neuronId] === actualCount
                          ? 'bg-green/20 text-green'
                          : 'bg-red/20 text-red'
                      }`}
                    >
                      {userCounts[neuronId] === actualCount
                        ? '✓ Correct !'
                        : `✗ Correct: ${actualCount}`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {allCountsEntered && (
          <div className="text-center mt-8">
            <button
              onClick={onProceed}
              className="rounded-xl bg-blue px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors min-h-11"
            >
              Voir le réseau de neurones
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default PixelCountingStep
