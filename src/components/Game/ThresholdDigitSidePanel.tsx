import { useMemo, useState } from 'react'
import { RECOGNIZED_DIGITS } from './constants'
import {
  computeAllDigitRecognitions,
  DIGIT_MARK_BADGE_CLASSES,
  type DigitVariantTag,
} from './referenceDigitSums'

interface ThresholdDigitSidePanelProps {
  thresholdValues: Record<string, number>
}

const VARIANT_LABELS: Record<DigitVariantTag, string> = {
  p: 'Parfait',
  g: 'Bien dessiné',
}

const ThresholdDigitSidePanel = ({
  thresholdValues,
}: ThresholdDigitSidePanelProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const recognitions = useMemo(
    () => computeAllDigitRecognitions(thresholdValues),
    [thresholdValues]
  )

  const recognizedCount = recognitions.filter((r) => r.isRecognized).length

  return (
    <aside
      className={[
        'flex flex-col border border-grey bg-white shadow-sm transition-[width] duration-300',
        'max-md:relative max-md:z-auto max-md:mb-4 max-md:w-full max-md:rounded-xl',
        'md:fixed md:left-0 md:top-24 md:z-10 md:rounded-r-xl md:border-l-0',
        isOpen ? 'md:w-72' : 'md:w-11',
      ].join(' ')}
      aria-label="Chiffres de référence et reconnaissance"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={[
          'flex shrink-0 items-center gap-2 border-b border-grey text-darkBlue transition-colors hover:bg-blue/5',
          isOpen
            ? 'justify-between px-4 py-3'
            : 'max-md:flex-row max-md:justify-between max-md:px-4 max-md:py-3 md:h-full md:min-h-[220px] md:flex-col md:justify-center md:px-1 md:py-4',
        ].join(' ')}
        aria-expanded={isOpen}
        title={isOpen ? 'Replier le panneau' : 'Déplier le panneau'}
      >
        {isOpen ? (
          <>
            <span className="text-lg font-bold text-blue" aria-hidden>
              ‹
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold tracking-wide">
                Chiffres de référence
              </p>
              <p className="text-xs font-medium text-astro">
                {recognizedCount}/{recognitions.length} reconnus
              </p>
            </div>
          </>
        ) : (
          <>
            <span
              className="text-xs font-bold text-blue max-md:[writing-mode:horizontal-tb] md:[writing-mode:vertical-rl]"
              aria-hidden
            >
              Chiffres
            </span>
            <span
              className={`max-md:mt-0 md:mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                recognizedCount === recognitions.length
                  ? 'bg-green/20 text-green'
                  : recognizedCount === 0
                    ? 'bg-red/15 text-red'
                    : 'bg-yellow/25 text-darkBlue'
              }`}
            >
              {recognizedCount}/{recognitions.length}
            </span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-3 py-3">
          <p className="mb-3 text-xs font-medium leading-relaxed text-astro">
            Suivi en temps réel
          </p>
          <div className="space-y-4">
            {RECOGNIZED_DIGITS.map((digit) => {
              const digitResults = recognitions.filter((r) => r.digit === digit)
              const digitOk = digitResults.every((r) => r.isRecognized)
              return (
                <div
                  key={digit}
                  className="rounded-xl border border-grey bg-gray-50/80 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={[
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 text-base font-bold',
                        DIGIT_MARK_BADGE_CLASSES[digit] ??
                          'border-grey bg-white text-darkBlue',
                      ].join(' ')}
                    >
                      {digit}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        digitOk ? 'text-green' : 'text-astro'
                      }`}
                    >
                      {digitOk
                        ? 'Reconnu'
                        : `${digitResults.filter((r) => r.isRecognized).length}/${digitResults.length}`}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {digitResults.map((result) => (
                      <li
                        key={`${result.digit}-${result.variant}`}
                        className={[
                          'rounded-lg border px-2.5 py-2 text-xs',
                          result.isRecognized
                            ? 'border-green/50 bg-green/10'
                            : result.recognizedDigit === null
                              ? 'border-grey bg-white'
                              : 'border-red/40 bg-red/5',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={[
                              'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none',
                              DIGIT_MARK_BADGE_CLASSES[result.digit] ??
                                'border-grey bg-white text-darkBlue',
                            ].join(' ')}
                          >
                            {result.digit}
                            {result.variant}
                          </span>
                          <span
                            className={`font-semibold ${
                              result.isRecognized
                                ? 'text-green'
                                : result.recognizedDigit === null
                                  ? 'text-astro'
                                  : 'text-red'
                            }`}
                          >
                            {result.isRecognized
                              ? '✓'
                              : result.recognizedDigit === null
                                ? '—'
                                : `→ ${result.recognizedDigit}`}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-astro">
                          {VARIANT_LABELS[result.variant]}
                        </p>
                        <p
                          className={`mt-0.5 font-semibold ${
                            result.isRecognized
                              ? 'text-green'
                              : result.recognizedDigit === null
                                ? 'text-astro'
                                : 'text-red'
                          }`}
                        >
                          {result.isRecognized
                            ? `Reconnu comme ${result.digit}`
                            : result.recognizedDigit === null
                              ? 'Non reconnu'
                              : `Confondu avec ${result.recognizedDigit}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}

export default ThresholdDigitSidePanel
