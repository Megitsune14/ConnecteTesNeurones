/**
 * Sommes « de référence » pour les pastilles sur la règlette mode seuil :
 * chaque grille vient de DIGIT_EXAMPLES (perfect = DIGIT_PATTERNS, good = variante).
 * Les entrées COL/LIG sont dérivées comme à l’étape comptage ; les seuils ReLU
 * cachés / de sortie sont ceux de NETWORK_STRUCTURE (réseau nominal).
 */
import {
  DIGIT_EXAMPLES,
  NETWORK_STRUCTURE,
  RECOGNIZED_DIGITS,
} from './constants'

export type DigitVariantTag = 'p' | 'g'

export type DigitReferenceMark = {
  digit: number
  variant: DigitVariantTag
  /** Somme affichée sur l’axe de la règlette (avant seuil du neurone courant). */
  sum: number
}

const hiddenInputsMap: Record<
  string,
  (inputValues: Record<string, number>) => Record<string, number>
> = {
  A: (v) => ({
    COL2: Number(v.COL2) || 0,
    COL3: Number(v.COL3) || 0,
    COL1: -(Number(v.COL1) || 0),
  }),
  B: (v) => ({
    COL2: Number(v.COL2) || 0,
    LIG2: Number(v.LIG2) || 0,
    LIG3: -(Number(v.LIG3) || 0),
  }),
  C: (v) => ({
    COL3: Number(v.COL3) || 0,
    LIG1: Number(v.LIG1) || 0,
    LIG2: Number(v.LIG2) || 0,
  }),
  D: (v) => ({
    COL2: Number(v.COL2) || 0,
    LIG3: Number(v.LIG3) || 0,
    LIG1: -(Number(v.LIG1) || 0),
  }),
  E: (v) => ({
    COL1: Number(v.COL1) || 0,
    LIG2: Number(v.LIG2) || 0,
    LIG3: Number(v.LIG3) || 0,
  }),
  F: (v) => ({
    LIG1: Number(v.LIG1) || 0,
    LIG3: Number(v.LIG3) || 0,
    LIG2: -(Number(v.LIG2) || 0),
  }),
}

function countPixelsForInput(neuronId: string, pattern: number[][]): number {
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

function patternToInputValues(pattern: number[][]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of NETWORK_STRUCTURE.input) {
    out[id] = countPixelsForInput(id, pattern)
  }
  return out
}

function hiddenPreReLuSum(
  hiddenId: string,
  inputValues: Record<string, number>
): number {
  const inputs = hiddenInputsMap[hiddenId](inputValues)
  return Object.values(inputs).reduce((a, b) => a + (Number(b) || 0), 0)
}

function hiddenReLuOutput(
  hiddenId: string,
  inputValues: Record<string, number>
): number {
  const s = hiddenPreReLuSum(hiddenId, inputValues)
  const th =
    NETWORK_STRUCTURE.hiddenThresholds[
      hiddenId as keyof typeof NETWORK_STRUCTURE.hiddenThresholds
    ] ?? 0
  return Math.max(0, s - th)
}

function outputPreReLuSum(
  outputId: string,
  inputValues: Record<string, number>
): number {
  const getH = (id: string) => hiddenReLuOutput(id, inputValues)
  const inputs: Record<string, number> = {}
  switch (outputId) {
    case 'NEURONE0':
      inputs.C = getH('C')
      inputs.E = getH('E')
      inputs.F = getH('F')
      inputs.A = -getH('A')
      inputs.B = -getH('B')
      inputs.D = -getH('D')
      break
    case 'NEURONE3':
      inputs.A = getH('A')
      inputs.B = getH('B')
      inputs.D = getH('D')
      inputs.C = -getH('C')
      inputs.E = -getH('E')
      break
    case 'NEURONE6':
      inputs.B = getH('B')
      inputs.D = getH('D')
      inputs.E = getH('E')
      inputs.A = -getH('A')
      inputs.C = -getH('C')
      inputs.F = -getH('F')
      break
    case 'NEURONE9':
      inputs.A = getH('A')
      inputs.B = getH('B')
      inputs.C = getH('C')
      inputs.D = -getH('D')
      inputs.E = -getH('E')
      break
    default:
      break
  }
  return Object.values(inputs).reduce((a, b) => a + (Number(b) || 0), 0)
}

function exampleGrid(digit: number, variant: DigitVariantTag): number[][] {
  const entry = DIGIT_EXAMPLES[digit as keyof typeof DIGIT_EXAMPLES]
  return variant === 'p' ? entry.perfect : entry.good
}

const hiddenMarksCache = new Map<string, DigitReferenceMark[]>()
const outputMarksCache = new Map<string, DigitReferenceMark[]>()

export function getReferenceMarksForHiddenNeuron(
  hiddenId: string
): DigitReferenceMark[] {
  const cached = hiddenMarksCache.get(hiddenId)
  if (cached) return cached
  const marks: DigitReferenceMark[] = []
  for (const digit of RECOGNIZED_DIGITS) {
    if (!(digit in DIGIT_EXAMPLES)) continue
    for (const variant of ['p', 'g'] as const) {
      const grid = exampleGrid(digit, variant)
      const inputValues = patternToInputValues(grid)
      const sum = hiddenPreReLuSum(hiddenId, inputValues)
      marks.push({ digit, variant, sum })
    }
  }
  hiddenMarksCache.set(hiddenId, marks)
  return marks
}

export function getReferenceMarksForOutputNeuron(
  outputId: string
): DigitReferenceMark[] {
  const cached = outputMarksCache.get(outputId)
  if (cached) return cached
  const marks: DigitReferenceMark[] = []
  for (const digit of RECOGNIZED_DIGITS) {
    if (!(digit in DIGIT_EXAMPLES)) continue
    for (const variant of ['p', 'g'] as const) {
      const grid = exampleGrid(digit, variant)
      const inputValues = patternToInputValues(grid)
      const sum = outputPreReLuSum(outputId, inputValues)
      marks.push({ digit, variant, sum })
    }
  }
  outputMarksCache.set(outputId, marks)
  return marks
}

/** Classes Tailwind par chiffre (repères visuels, comme la maquette). */
export const DIGIT_MARK_BADGE_CLASSES: Record<number, string> = {
  0: 'border-green bg-green/25 text-darkBlue',
  3: 'border-blue bg-blue/15 text-darkBlue',
  6: 'border-red/70 bg-red/15 text-darkBlue',
  9: 'border-yellow-hover bg-yellow/35 text-darkBlue',
}
