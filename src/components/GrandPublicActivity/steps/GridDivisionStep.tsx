import { useEffect, useMemo, useState } from 'react'

interface GridDivisionStepProps {
  /** Grille 9×6 dessinée par l'utilisateur (pas DIGIT_PATTERNS). */
  pattern: number[][]
  onNext: () => void
}

const FULL_CELL_PX = 48
const MIN_CELL_PX = 28
const ROWS_PER_BAND = 3

function computeCellPx(viewportWidth: number): number {
  const available = viewportWidth - 64
  const fullGridWidth = 6 * FULL_CELL_PX + 16 + 56 + 32
  if (available >= fullGridWidth) return FULL_CELL_PX
  const forCells = available - 56 - 32 - 16
  return Math.max(MIN_CELL_PX, Math.floor(forCells / 6))
}

const GridDivisionStep = ({ pattern, onNext }: GridDivisionStepProps) => {
  const [cellPx, setCellPx] = useState(FULL_CELL_PX)

  useEffect(() => {
    const update = () => setCellPx(computeCellPx(window.innerWidth))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const layout = useMemo(() => {
    const colGroupW = cellPx * 2
    const sepMarginPx = Math.max(1, Math.round(cellPx / 24))
    const sepWPx = Math.max(2, Math.round(cellPx / 12))
    const vLineLeft = [
      colGroupW + sepMarginPx,
      colGroupW + sepMarginPx * 3 + sepWPx + colGroupW + sepMarginPx,
    ] as const
    const hBandPx = ROWS_PER_BAND * cellPx
    const hSepBlock = sepMarginPx * 2 + sepWPx
    const hLineTop = [
      hBandPx + sepMarginPx,
      hBandPx + hSepBlock + hBandPx + sepMarginPx,
    ] as const
    const labelMarginLeft = Math.max(32, Math.round(cellPx * 1.17))
    const vExtendTopPx = Math.max(24, Math.round(cellPx * 0.83))
    const hExtendLeftPx = Math.max(40, Math.round(cellPx * 1.33))
    const ligTops = [0, 1, 2].map(
      (group) => group * (hBandPx + hSepBlock) + hBandPx / 2
    )
    const colLabelTemplate = `${colGroupW}px ${sepMarginPx * 2 + sepWPx}px ${colGroupW}px ${sepMarginPx * 2 + sepWPx}px ${colGroupW}px`

    return {
      colGroupW,
      sepMarginPx,
      sepWPx,
      vLineLeft,
      hLineTop,
      labelMarginLeft,
      vExtendTopPx,
      hExtendLeftPx,
      ligTops,
      colLabelTemplate,
    }
  }, [cellPx])

  return (
    <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm animate-fade-in-up">
      <h2 className="text-darkBlue text-2xl sm:text-3xl font-bold tracking-wide mb-6 text-center">
        Division de la grille 9×6
      </h2>
      <div className="text-center space-y-6">
        <p className="text-astro text-base sm:text-lg font-medium leading-relaxed">
          La grille va être divisée en 6 bandelettes : 3 verticales (COL) et 3
          horizontales (LIG).
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="relative inline-block max-w-full overflow-x-auto">
            <div className="border-4 border-grey rounded-2xl p-2 bg-gray-50 shadow-md relative overflow-visible">
              <div
                className="absolute top-2 grid items-center"
                style={{
                  left: layout.labelMarginLeft,
                  gridTemplateColumns: layout.colLabelTemplate,
                }}
              >
                {[0, 1, 2].map((colGroup) => (
                  <div
                    key={`col-label-${colGroup}`}
                    className="text-darkBlue font-bold text-sm text-center"
                    style={{ gridColumnStart: colGroup * 2 + 1 }}
                  >
                    {`COL${colGroup + 1}`}
                  </div>
                ))}
              </div>
              <div className="absolute left-2 top-10">
                {layout.ligTops.map((top, index) => (
                  <div
                    key={`lig-label-${index}`}
                    className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-sm"
                    style={{ top: `${top}px` }}
                  >
                    {`LIG${index + 1}`}
                  </div>
                ))}
              </div>
              <div
                className="relative mt-8 flex flex-col gap-0 overflow-visible"
                style={{ marginLeft: layout.labelMarginLeft }}
              >
                <div
                  className="pointer-events-none absolute inset-0 z-[6] overflow-visible"
                  aria-hidden
                >
                  {layout.vLineLeft.map((left) => (
                    <div
                      key={`v-${left}`}
                      className="absolute bg-red"
                      style={{
                        left,
                        width: layout.sepWPx,
                        top: -layout.vExtendTopPx,
                        height: `calc(100% + ${layout.vExtendTopPx}px)`,
                      }}
                    />
                  ))}
                  {layout.hLineTop.map((top) => (
                    <div
                      key={`h-${top}`}
                      className="absolute bg-yellow"
                      style={{
                        left: -layout.hExtendLeftPx,
                        width: `calc(100% + ${layout.hExtendLeftPx}px)`,
                        top,
                        height: layout.sepWPx,
                      }}
                    />
                  ))}
                </div>
                {[0, 1, 2].map((ligGroup) => (
                  <div key={`lig-${ligGroup}`} className="flex flex-col gap-0">
                    {Array.from({ length: 3 }).map((_, ligRow) => {
                      const gridRow = ligGroup * 3 + ligRow
                      return (
                        <div
                          key={`row-${gridRow}`}
                          className="flex gap-0 relative"
                        >
                          {[0, 1, 2].map((colGroup) => (
                            <div
                              key={`col-${colGroup}`}
                              className="flex gap-0 relative"
                            >
                              <div className="flex gap-0 relative">
                                {Array.from({ length: 2 }).map((_, colCol) => {
                                  const gridCol = colGroup * 2 + colCol
                                  const pixel = pattern[gridRow]?.[gridCol] ?? 0
                                  return (
                                    <div
                                      key={`${gridRow}-${gridCol}`}
                                      className="relative border border-black/20 bg-grey/40"
                                      style={{
                                        width: cellPx,
                                        height: cellPx,
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
                                    width: layout.sepWPx,
                                    marginLeft: layout.sepMarginPx,
                                    marginRight: layout.sepMarginPx,
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
                          height: layout.sepWPx,
                          marginTop: layout.sepMarginPx,
                          marginBottom: layout.sepMarginPx,
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="text-center pt-2">
          <button
            onClick={onNext}
            className="rounded-xl bg-blue px-8 sm:px-12 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors min-h-11"
          >
            Comptez les pixels noirs
          </button>
        </div>
      </div>
    </section>
  )
}

export default GridDivisionStep
