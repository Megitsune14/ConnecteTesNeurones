import { useEffect, useMemo, useState } from 'react'
import { RECOGNIZED_DIGITS } from './constants'
import MiniDigitGrid from './MiniDigitGrid'
import {
  computeAllDigitRecognitions,
  computeCurrentGridRecognition,
  DIGIT_MARK_BADGE_CLASSES,
  type DigitRecognitionResult,
  type DigitVariantTag,
} from './referenceDigitSums'
import type { SessionDigitEntry } from './sessionDigits'
import {
  formatAmbiguityMessage,
} from './networkDecision'

interface ThresholdDigitSidePanelProps {
  thresholdValues: Record<string, number>
  pattern?: number[][] | null
  selectedDigit?: number | null
  sessionDigits: SessionDigitEntry[]
  onSaveCurrent: () => void
  onRemoveSessionDigit: (id: string) => void
  /** Contrôle l’état ouvert / replié (ex. déplié en mode seuil, replié en mode calcul). */
  defaultOpen?: boolean
}

const VARIANT_LABELS: Record<DigitVariantTag, string> = {
  p: 'Parfait',
  g: 'Bien dessiné',
  current: 'Chiffre en cours',
  s: 'Session',
}

function recognitionStatusLabel(result: DigitRecognitionResult): string {
  if (result.isAmbiguous) {
    return formatAmbiguityMessage(result.ambiguousDigits)
  }
  if (result.isRecognized) return `Reconnu comme ${result.digit}`
  if (result.recognizedDigit === null) return 'Non reconnu'
  return `Confondu avec ${result.recognizedDigit}`
}

function recognitionCardClasses(result: DigitRecognitionResult): string {
  if (result.isRecognized) {
    return 'border-green/50 bg-green/10'
  }
  if (result.isAmbiguous) {
    return 'border-yellow-hover/60 bg-yellow/15'
  }
  if (result.recognizedDigit === null) {
    return 'border-grey bg-white'
  }
  return 'border-red/40 bg-red/5'
}

function recognitionTextClasses(result: DigitRecognitionResult): string {
  if (result.isRecognized) return 'text-green'
  if (result.isAmbiguous) return 'text-darkBlue'
  if (result.recognizedDigit === null) return 'text-astro'
  return 'text-red'
}

function recognitionSymbol(result: DigitRecognitionResult): string {
  if (result.isRecognized) return '✓'
  if (result.isAmbiguous) return '↔'
  if (result.recognizedDigit === null) return '—'
  return `→ ${result.recognizedDigit}`
}

const ThresholdDigitSidePanel = ({
  thresholdValues,
  pattern = null,
  selectedDigit = null,
  sessionDigits,
  onSaveCurrent,
  onRemoveSessionDigit,
  defaultOpen = false,
}: ThresholdDigitSidePanelProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  useEffect(() => {
    setIsOpen(defaultOpen)
  }, [defaultOpen])

  const recognitions = useMemo(
    () => computeAllDigitRecognitions(thresholdValues, sessionDigits),
    [thresholdValues, sessionDigits]
  )

  const sessionRecognitions = useMemo(
    () => recognitions.filter((r) => r.variant === 's'),
    [recognitions]
  )

  const currentRecognition = useMemo(
    () =>
      pattern != null
        ? computeCurrentGridRecognition(
            thresholdValues,
            pattern,
            selectedDigit
          )
        : null,
    [thresholdValues, pattern, selectedDigit]
  )

  const recognizedCount = recognitions.filter((r) => r.isRecognized).length
  const allReferencesOk = recognizedCount === recognitions.length
  const canSaveCurrent = pattern != null && selectedDigit != null

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
                allReferencesOk
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
          {!allReferencesOk && (
            <div
              className="mb-3 rounded-lg border border-red/40 bg-red/5 px-2.5 py-2 text-xs font-semibold text-red"
              role="alert"
            >
              Certains chiffres de référence ne sont plus reconnus avec les
              seuils actuels.
            </div>
          )}

          <p className="mb-3 text-xs font-medium leading-relaxed text-astro">
            Suivi en temps réel
          </p>

          {currentRecognition != null && pattern != null && (
            <div className="mb-4 rounded-xl border-2 border-darkBlue/30 bg-blue/5 p-2.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-darkBlue">
                Chiffre en cours
              </p>
              <div
                className={[
                  'rounded-lg border px-2.5 py-2 text-xs',
                  recognitionCardClasses(currentRecognition),
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <MiniDigitGrid
                    pattern={pattern}
                    cellPx={4}
                    aria-label={`Dessin du chiffre en cours${selectedDigit != null ? ` (${selectedDigit})` : ''}`}
                  />
                  <span
                    className={`shrink-0 font-semibold ${recognitionTextClasses(currentRecognition)}`}
                  >
                    {recognitionSymbol(currentRecognition)}
                  </span>
                </div>
                <p
                  className={`mt-2 font-semibold ${recognitionTextClasses(currentRecognition)}`}
                >
                  {recognitionStatusLabel(currentRecognition)}
                </p>
                <button
                  type="button"
                  onClick={onSaveCurrent}
                  disabled={!canSaveCurrent}
                  className="mt-2 w-full rounded-lg border-2 border-blue bg-white px-3 py-1.5 text-xs font-semibold text-blue transition-colors hover:bg-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sauvegarder dans la session
                </button>
              </div>
            </div>
          )}

          {sessionRecognitions.length > 0 && (
            <div className="mb-4 rounded-xl border border-grey bg-gray-50/80 p-2.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-darkBlue">
                Chiffres de la session
              </p>
              <ul className="space-y-2">
                {sessionRecognitions.map((result) => {
                  const entry = sessionDigits.find((e) => e.id === result.sessionId)
                  if (!entry) return null
                  return (
                    <li
                      key={result.sessionId}
                      className={[
                        'rounded-lg border px-2.5 py-2 text-xs',
                        recognitionCardClasses(result),
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <MiniDigitGrid
                          pattern={entry.grid}
                          cellPx={4}
                          aria-label={`Dessin session — chiffre ${entry.digit}`}
                        />
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`font-semibold ${recognitionTextClasses(result)}`}
                          >
                            {recognitionSymbol(result)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveSessionDigit(entry.id)}
                            className="text-[10px] font-medium text-astro underline hover:text-red"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                      <p className="mt-1.5 font-medium text-astro">
                        {VARIANT_LABELS.s} — attendu {entry.digit}
                      </p>
                      <p
                        className={`mt-0.5 font-semibold ${recognitionTextClasses(result)}`}
                      >
                        {recognitionStatusLabel(result)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {RECOGNIZED_DIGITS.map((digit) => {
              const digitResults = recognitions.filter(
                (r) => r.digit === digit && (r.variant === 'p' || r.variant === 'g')
              )
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
                          recognitionCardClasses(result),
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
                            className={`font-semibold ${recognitionTextClasses(result)}`}
                          >
                            {recognitionSymbol(result)}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-astro">
                          {VARIANT_LABELS[result.variant]}
                        </p>
                        <p
                          className={`mt-0.5 font-semibold ${recognitionTextClasses(result)}`}
                        >
                          {recognitionStatusLabel(result)}
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
