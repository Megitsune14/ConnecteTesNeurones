import { NETWORK_STRUCTURE } from './constants'
import type { NeuronData } from './types'

export const STORAGE_KEY_SAVED_THRESHOLDS = 'gameSavedThresholds'

export function getDefaultThresholds(): Record<string, number> {
  const defaults: Record<string, number> = {}
  for (const id of NETWORK_STRUCTURE.hidden) {
    defaults[id] = NETWORK_STRUCTURE.hiddenThresholds[id] ?? 0
  }
  for (const id of NETWORK_STRUCTURE.output) {
    defaults[id] = NETWORK_STRUCTURE.outputThresholds[id] ?? 0
  }
  return defaults
}

export function loadSavedThresholds(): Record<string, number> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SAVED_THRESHOLDS)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }
    const out: Record<string, number> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && typeof value === 'number' && !Number.isNaN(value)) {
        out[key] = value
      }
    }
    return Object.keys(out).length > 0 ? out : null
  } catch {
    return null
  }
}

export function saveSavedThresholds(thresholds: Record<string, number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_SAVED_THRESHOLDS, JSON.stringify(thresholds))
  } catch {
    /* ignore */
  }
}

export function clearSavedThresholds(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY_SAVED_THRESHOLDS)
  } catch {
    /* ignore */
  }
}

export function hasSavedThresholds(): boolean {
  return loadSavedThresholds() != null
}

export function buildThresholdsFromNeurons(
  hiddenNeurons: NeuronData[],
  outputNeurons: NeuronData[]
): Record<string, number> {
  const thresholds: Record<string, number> = {}
  for (const neuron of [...hiddenNeurons, ...outputNeurons]) {
    thresholds[neuron.id] = neuron.threshold
  }
  return thresholds
}

export function resolveInitialThreshold(
  neuronId: string,
  layer: 'hidden' | 'output'
): number {
  const saved = loadSavedThresholds()
  if (saved?.[neuronId] != null) return saved[neuronId]!
  if (layer === 'hidden') {
    return (
      NETWORK_STRUCTURE.hiddenThresholds[
        neuronId as keyof typeof NETWORK_STRUCTURE.hiddenThresholds
      ] ?? 0
    )
  }
  return (
    NETWORK_STRUCTURE.outputThresholds[
      neuronId as keyof typeof NETWORK_STRUCTURE.outputThresholds
    ] ?? 0
  )
}
