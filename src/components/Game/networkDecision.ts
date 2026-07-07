export type OutputActivation = {
  digit: number
  value: number
}

export type NetworkDecision =
  | { status: 'none' }
  | { status: 'clear'; digit: number }
  | { status: 'ambiguous'; digits: number[] }

/** Décision du réseau : aucun actif, un seul actif (clair), ou plusieurs actifs (ambigu). */
export function resolveNetworkDecision(
  activations: OutputActivation[]
): NetworkDecision {
  const active = activations
    .filter((a) => a.value > 0)
    .sort((a, b) => a.digit - b.digit)
  if (active.length === 0) return { status: 'none' }
  if (active.length === 1) return { status: 'clear', digit: active[0]!.digit }
  return { status: 'ambiguous', digits: active.map((a) => a.digit) }
}

/** Chiffre unique reconnu, ou null si aucun ou ambiguïté. */
export function resolveWinningDigit(
  activations: OutputActivation[]
): number | null {
  const decision = resolveNetworkDecision(activations)
  return decision.status === 'clear' ? decision.digit : null
}

export function formatDigitsList(digits: number[]): string {
  if (digits.length === 0) return ''
  if (digits.length === 1) return String(digits[0])
  if (digits.length === 2) return `${digits[0]} et ${digits[1]}`
  const last = digits[digits.length - 1]!
  const rest = digits.slice(0, -1).join(', ')
  return `${rest} et ${last}`
}

export function formatAmbiguityMessage(digits: number[]): string {
  return `Ambiguïté : le réseau active ${formatDigitsList(digits)}`
}

export function getOutputVerdictLabel(
  neuronDigit: number,
  decision: NetworkDecision,
  options: {
    allOutputsValidated: boolean
    neuronValidated: boolean
    activation?: number
    /** `compact` : libellé court (ex. graphe Cytoscape). */
    labelStyle?: 'full' | 'compact'
  }
): string | null {
  if (!options.neuronValidated || !options.allOutputsValidated) return null

  const activation = options.activation ?? 0
  const labelStyle = options.labelStyle ?? 'full'

  if (decision.status === 'none') {
    return `✗ Ce n'est pas un ${neuronDigit}`
  }

  if (decision.status === 'ambiguous') {
    if (activation > 0) {
      return labelStyle === 'compact'
        ? 'Ambiguïté'
        : `↔ Actif — ${formatAmbiguityMessage(decision.digits)}`
    }
    return `✗ Ce n'est pas un ${neuronDigit}`
  }

  return neuronDigit === decision.digit
    ? `✓ C'est un ${neuronDigit}`
    : `✗ Ce n'est pas un ${neuronDigit}`
}

export type VerdictOutcome = 'winner' | 'loser' | 'ambiguous'

export function getOutputVerdictOutcome(
  neuronDigit: number,
  decision: NetworkDecision,
  options: {
    allOutputsValidated: boolean
    neuronValidated: boolean
    activation?: number
  }
): VerdictOutcome {
  if (!options.neuronValidated || !options.allOutputsValidated) return 'loser'
  if (decision.status === 'clear' && neuronDigit === decision.digit) return 'winner'
  if (
    decision.status === 'ambiguous' &&
    (options.activation ?? 0) > 0
  ) {
    return 'ambiguous'
  }
  return 'loser'
}
