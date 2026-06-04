export type OutputActivation = {
  digit: number
  value: number
}

/**
 * Chiffre gagnant parmi les activations de sortie :
 * uniquement les valeurs strictement > 0 concourent ;
 * en cas d'égalité au maximum, le premier candidat l'emporte.
 */
export function resolveWinningDigit(
  activations: OutputActivation[]
): number | null {
  const active = activations.filter((a) => a.value > 0)
  if (active.length === 0) return null
  return active.reduce((best, curr) =>
    curr.value > best.value ? curr : best
  ).digit
}

export function getOutputVerdictLabel(
  neuronDigit: number,
  winningDigit: number | null,
  options: { allOutputsValidated: boolean; neuronValidated: boolean }
): string | null {
  if (!options.neuronValidated || !options.allOutputsValidated) return null
  if (winningDigit === null) {
    return `✗ Ce n'est pas un ${neuronDigit}`
  }
  return neuronDigit === winningDigit
    ? `✓ C'est un ${neuronDigit}`
    : `✗ Ce n'est pas un ${neuronDigit}`
}
