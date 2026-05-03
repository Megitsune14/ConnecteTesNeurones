interface GridDivisionStepProps {
  /** Grille 9×6 dessinée par l'utilisateur (pas DIGIT_PATTERNS). */
  pattern: number[][]
  onNext: () => void
}

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
            <div className="border-4 border-grey rounded-2xl p-2 bg-gray-50 shadow-md relative">
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
              <div className="ml-14 mt-8 flex flex-col gap-0 relative">
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
                            <div key={`col-${colGroup}`} className="flex gap-0 relative">
                              <div className="flex gap-0 relative">
                                {Array.from({ length: 2 }).map((_, colCol) => {
                                  const gridCol = colGroup * 2 + colCol
                                  const pixel = pattern[gridRow]?.[gridCol] ?? 0
                                  return (
                                    <div
                                      key={`${gridRow}-${gridCol}`}
                                      className="relative border border-black/20 bg-grey/40"
                                      style={{ width: '48px', height: '48px' }}
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
                                    width: '4px',
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
                          height: '4px',
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
