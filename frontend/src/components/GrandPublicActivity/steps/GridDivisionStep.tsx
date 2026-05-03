interface GridDivisionStepProps {
  /** Grille 9×6 dessinée par l'utilisateur (pas DIGIT_PATTERNS). */
  pattern: number[][]
  onNext: () => void
}

/** 3×2 cellules 48px + séparateurs 2+4+2 px entre groupes de colonnes. */
const CELL_PX = 48
const COL_GROUP_W = CELL_PX * 2
const SEP_MARGIN_PX = 2
const SEP_W_PX = 4
const V_LINE_LEFT = [
  COL_GROUP_W + SEP_MARGIN_PX,
  COL_GROUP_W + SEP_MARGIN_PX * 3 + SEP_W_PX + COL_GROUP_W + SEP_MARGIN_PX,
] as const
const ROWS_PER_BAND = 3
const H_BAND_PX = ROWS_PER_BAND * CELL_PX
const H_SEP_BEFORE_PX = SEP_MARGIN_PX
const H_LINE_TOP = [
  H_BAND_PX + H_SEP_BEFORE_PX,
  H_BAND_PX + (SEP_MARGIN_PX * 2 + SEP_W_PX) + H_BAND_PX + H_SEP_BEFORE_PX,
] as const
/** Déborde vers les labels COL (haut) / LIG (gauche) pour mieux cadrer le texte. */
const V_EXTEND_TOP_PX = 40
const V_EXTEND_BOTTOM_PX = 0
const H_EXTEND_LEFT_PX = 64

const GridDivisionStep = ({ pattern, onNext }: GridDivisionStepProps) => {
  return (
    <section className="bg-white border-2 border-grey rounded-2xl p-8 shadow-sm animate-fade-in-up">
      <h2 className="text-darkBlue text-3xl font-bold tracking-wide mb-6 text-center">
        Division de la grille 9×6
      </h2>
      <div className="text-center space-y-6">
        <p className="text-astro text-lg font-medium leading-relaxed">
          La grille va être divisée en 6 bandelettes : 3 verticales (COL) et 3
          horizontales (LIG).
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="relative inline-block">
            <div className="border-4 border-grey rounded-2xl p-2 bg-gray-50 shadow-md relative overflow-visible">
              <div
                className="absolute left-16 top-2 grid items-center"
                style={{ gridTemplateColumns: '96px 8px 96px 8px 96px' }}
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
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-sm"
                  style={{ top: '72px' }}
                >
                  LIG1
                </div>
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-sm"
                  style={{ top: '224px' }}
                >
                  LIG2
                </div>
                <div
                  className="absolute left-0 -translate-y-1/2 text-darkBlue font-bold text-sm"
                  style={{ top: '376px' }}
                >
                  LIG3
                </div>
              </div>
              <div className="relative ml-14 mt-8 flex flex-col gap-0 overflow-visible">
                <div
                  className="pointer-events-none absolute inset-0 z-[6] overflow-visible"
                  aria-hidden
                >
                  {V_LINE_LEFT.map((left) => (
                    <div
                      key={`v-${left}`}
                      className="absolute bg-red"
                      style={{
                        left,
                        width: SEP_W_PX,
                        top: -V_EXTEND_TOP_PX,
                        height: `calc(100% + ${V_EXTEND_TOP_PX + V_EXTEND_BOTTOM_PX}px)`,
                      }}
                    />
                  ))}
                  {H_LINE_TOP.map((top) => (
                    <div
                      key={`h-${top}`}
                      className="absolute bg-yellow"
                      style={{
                        left: -H_EXTEND_LEFT_PX,
                        width: `calc(100% + ${H_EXTEND_LEFT_PX}px)`,
                        top,
                        height: SEP_W_PX,
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
                                        width: CELL_PX,
                                        height: CELL_PX,
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
                                    width: SEP_W_PX,
                                    marginLeft: SEP_MARGIN_PX,
                                    marginRight: SEP_MARGIN_PX,
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
                          height: SEP_W_PX,
                          marginTop: SEP_MARGIN_PX,
                          marginBottom: SEP_MARGIN_PX,
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
            className="rounded-xl bg-blue px-12 py-4 text-lg font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors"
          >
            Comptez les pixels noirs
          </button>
        </div>
      </div>
    </section>
  )
}

export default GridDivisionStep
