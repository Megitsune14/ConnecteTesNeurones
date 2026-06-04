import { useState, useCallback, useEffect } from 'react'
import { Button } from '../../ui'

const ROWS = 9
const COLS = 6

interface DigitSelectionStepProps {
  onValidateGrid: (grid: number[][]) => void
  initialGrid?: number[][]
}

const createEmptyGrid = (): number[][] =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0))

const DigitSelectionStep = ({ onValidateGrid, initialGrid }: DigitSelectionStepProps) => {
  const [grid, setGrid] = useState<number[][]>(() => initialGrid ?? createEmptyGrid())

  useEffect(() => {
    if (!initialGrid) return
    setGrid(initialGrid)
  }, [initialGrid])

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      const current = next[row]?.[col] ?? 0
      next[row][col] = current === 1 ? 0 : 1
      return next
    })
  }, [])

  const handleValidate = useCallback(() => {
    onValidateGrid(grid)
  }, [grid, onValidateGrid])

  return (
    <section className="mx-auto max-w-xl bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 shadow-sm animate-fade-in-up overflow-hidden">
      <div className="flex flex-col items-center">
        <p className="text-astro text-center text-base font-medium leading-relaxed mb-6">
          Cliquez sur les carrés pour composer votre chiffre (9 lignes × 6 colonnes), puis validez.
        </p>
          <div className="border-2 border-grey rounded-xl p-3 bg-gray-50 inline-block">
            <div className="flex flex-col gap-1">
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {row.map((value, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      type="button"
                      onClick={() => toggleCell(rowIndex, colIndex)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 min-h-[44px] min-w-[44px] border-2 rounded transition-colors ${
                        value === 1
                          ? 'bg-black border-black'
                          : 'bg-grey/50 border-grey hover:border-blue/50 hover:bg-blue/20'
                      }`}
                      aria-pressed={value === 1}
                      aria-label={`Ligne ${rowIndex + 1}, colonne ${colIndex + 1}, ${value === 1 ? 'rempli' : 'vide'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setGrid(createEmptyGrid())}
            >
              Réinitialiser la grille
            </Button>
            <Button onClick={handleValidate} size="lg">
              Valider
            </Button>
          </div>
        </div>
    </section>
  )
}

export default DigitSelectionStep
