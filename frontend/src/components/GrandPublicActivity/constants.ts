/** Matrices 9 lignes × 6 colonnes pour chaque chiffre (pixels 0 ou 1). */
export const DIGIT_PATTERNS: Record<number, number[][]> = {
  0: [
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  3: [
    [1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 0, 0],
    [0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 0, 0],
  ],
  6: [
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 0],
  ],
  9: [
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [0, 0, 1, 1, 0, 0],
  ],
}

const clonePattern = (pattern: number[][]): number[][] =>
  pattern.map((row) => [...row])

const EXAMPLE_DIGITS = [0, 3, 6, 9] as const
type ExampleDigit = (typeof EXAMPLE_DIGITS)[number]

export const DIGIT_EXAMPLES: Record<
  ExampleDigit,
  {
    perfect: number[][]
    good: number[][]
  }
> = {
  0: {
    perfect: clonePattern(DIGIT_PATTERNS[0]),
    good: (() => {
      const grid = clonePattern(DIGIT_PATTERNS[0])
      grid[1][1] = 0
      grid[7][4] = 0
      return grid
    })(),
  },
  3: {
    perfect: clonePattern(DIGIT_PATTERNS[3]),
    good: (() => {
      const grid = clonePattern(DIGIT_PATTERNS[3])
      grid[0][3] = 0
      grid[8][2] = 0
      return grid
    })(),
  },
  6: {
    perfect: clonePattern(DIGIT_PATTERNS[6]),
    good: (() => {
      const grid = clonePattern(DIGIT_PATTERNS[6])
      grid[2][0] = 0
      grid[6][4] = 0
      return grid
    })(),
  },
  9: {
    perfect: clonePattern(DIGIT_PATTERNS[9]),
    good: (() => {
      const grid = clonePattern(DIGIT_PATTERNS[9])
      grid[3][0] = 0
      grid[6][4] = 0
      return grid
    })(),
  },
}

export const NETWORK_STRUCTURE = {
  input: ['COL1', 'COL2', 'COL3', 'LIG1', 'LIG2', 'LIG3'] as const,
  hidden: ['A', 'B', 'C', 'D', 'E', 'F'] as const,
  output: ['NEURONE0', 'NEURONE3', 'NEURONE6', 'NEURONE9'] as const,
  hiddenThresholds: {
    A: 8,
    B: 7,
    C: 17,
    D: 7,
    E: 16,
    F: 5,
  },
  outputThresholds: {
    NEURONE0: 6,
    NEURONE3: 6,
    NEURONE6: 7,
    NEURONE9: 4,
  },
} as const

export const NEURONE_FORMULAS: Record<string, string> = {
  A: 'COL2 + COL3 - COL1',
  B: 'COL2 + LIG2 - LIG3',
  C: 'COL3 + LIG1 + LIG2',
  D: 'COL2 + LIG3 - LIG1',
  E: 'COL1 + LIG2 + LIG3',
  F: 'LIG1 + LIG3 - LIG2',
  NEURONE0: 'C + E + F - A - B - D',
  NEURONE3: 'A + B + D - C - E',
  NEURONE6: 'B + D + E - A - C - F',
  NEURONE9: 'A + B + C - D - E',
}
