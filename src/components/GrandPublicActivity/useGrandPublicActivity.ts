import { useState, useEffect, useCallback } from 'react'
import type { ProgressStep, InputNeuronData, NeuronData } from './types'
import { NETWORK_STRUCTURE, DIGIT_PATTERNS, DIGIT_EXAMPLES } from './constants'
import { resolveWinningDigit, type OutputActivation } from './networkDecision'

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

function buildOutputInputsFromHidden(
  hiddenList: NeuronData[],
  outputNeuronId: string
): Record<string, number> {
  const getH = (id: string) =>
    hiddenList.find((n) => n.id === id)?.calculatedOutput ?? 0
  const inputs: Record<string, number> = {}
  switch (outputNeuronId) {
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
  return Object.fromEntries(
    Object.entries(inputs).map(([k, v]) => [k, Number(v) || 0])
  )
}

function applyHiddenThresholdMap(
  prev: NeuronData[],
  neuronId: string,
  t: number
): NeuronData[] {
  return prev.map((n) => {
    if (n.id !== neuronId) return n
    if (n.threshold === t) return n
    const nextCalcOut =
      n.sumValidated && n.calculatedSum != null
        ? Math.max(0, n.calculatedSum - t)
        : n.calculatedOutput
    return {
      ...n,
      threshold: t,
      calculatedOutput:
        n.sumValidated && n.calculatedSum != null
          ? nextCalcOut ?? null
          : n.calculatedOutput,
      outputValidated: false,
      needsRecalculation: true,
      userOutputInput: '',
    }
  })
}

function cascadeInvalidateOutputs(
  nextHidden: NeuronData[],
  prevOutputs: NeuronData[]
): NeuronData[] {
  return prevOutputs.map((outputNeuron) => {
    const inputs = buildOutputInputsFromHidden(nextHidden, outputNeuron.id)
    return {
      ...outputNeuron,
      inputs,
      sumValidated: false,
      calculatedSum: null,
      outputValidated: false,
      calculatedOutput: null,
      needsRecalculation: true,
      userSumInput: '',
      userOutputInput: '',
    }
  })
}

const STORAGE_KEY_STEP = 'grandPublicStep'
const STORAGE_KEY_DRAWN_GRID = 'grandPublicDrawnGrid'
const STORAGE_KEY_SELECTED_DIGIT = 'grandPublicSelectedDigit'
const STORAGE_KEY_USER_COUNTS = 'grandPublicUserCounts'
const STORAGE_KEY_HIDDEN_NEURONS = 'grandPublicHiddenNeurons'
const STORAGE_KEY_OUTPUT_NEURONS = 'grandPublicOutputNeurons'

const STEPS_ORDER: ProgressStep[] = [
  'digit-selection',
  'grid-division',
  'pixel-counting',
  'network-interaction',
]

type RecognizedDigit = 0 | 3 | 6 | 9

function getPreviousStep(step: ProgressStep): ProgressStep | null {
  const i = STEPS_ORDER.indexOf(step)
  return i > 0 ? STEPS_ORDER[i - 1]! : null
}

function loadStep(): ProgressStep {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_STEP)
    if (s && STEPS_ORDER.includes(s as ProgressStep)) return s as ProgressStep
  } catch {
    /* ignore */
  }
  return 'digit-selection'
}

function loadDrawnGrid(): number[][] | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_DRAWN_GRID)
    if (!s) return null
    const parsed = JSON.parse(s) as unknown
    if (!Array.isArray(parsed) || parsed.length !== 9) return null
    const ok = parsed.every(
      (row) => Array.isArray(row) && row.length === 6 && row.every((v) => v === 0 || v === 1)
    )
    return ok ? (parsed as number[][]) : null
  } catch {
    return null
  }
}

function loadSelectedDigit(): number | null {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_SELECTED_DIGIT)
    if (s == null) return null
    const n = parseInt(s, 10)
    return [0, 3, 6, 9].includes(n) ? n : null
  } catch {
    return null
  }
}

function loadUserCounts(): { [key: string]: number } {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_USER_COUNTS)
    if (!s) return {}
    const parsed = JSON.parse(s) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return {}
    const out: { [key: string]: number } = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === 'string' && typeof v === 'number' && !Number.isNaN(v))
        out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function loadHiddenNeurons(): NeuronData[] {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_HIDDEN_NEURONS)
    if (!s) return []
    const parsed = JSON.parse(s) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (n): n is NeuronData =>
        n != null &&
        typeof n === 'object' &&
        typeof (n as NeuronData).id === 'string' &&
        (n as NeuronData).layer === 'hidden'
    ) as NeuronData[]
  } catch {
    return []
  }
}

function loadOutputNeurons(): NeuronData[] {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY_OUTPUT_NEURONS)
    if (!s) return []
    const parsed = JSON.parse(s) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (n): n is NeuronData =>
        n != null &&
        typeof n === 'object' &&
        typeof (n as NeuronData).id === 'string' &&
        (n as NeuronData).layer === 'output'
    ) as NeuronData[]
  } catch {
    return []
  }
}

export function useGrandPublicActivity() {
  const [currentStep, setCurrentStep] = useState<ProgressStep>(loadStep)
  const [userDrawnGrid, setUserDrawnGrid] = useState<number[][] | null>(loadDrawnGrid)
  const [selectedDigit, setSelectedDigit] = useState<number | null>(loadSelectedDigit)
  const [userCounts, setUserCounts] = useState<{ [key: string]: number }>(loadUserCounts)
  const [inputLayerNeurons, setInputLayerNeurons] = useState<InputNeuronData[]>([])
  const [hiddenNeurons, setHiddenNeurons] = useState<NeuronData[]>([])
  const [outputNeurons, setOutputNeurons] = useState<NeuronData[]>([])
  const [activeNeuronId, setActiveNeuronId] = useState<string | null>(null)
  const [finalDecision, setFinalDecision] = useState<number | null>(null)

  const selectDigit = useCallback((digit: number) => {
    setSelectedDigit(digit)
  }, [])

  const loadDigitExample = useCallback(
    (digit: RecognizedDigit, type: 'perfect' | 'good') => {
      const examples = DIGIT_EXAMPLES[digit]
      const grid = examples?.[type]
      if (!grid) return
      setUserDrawnGrid(grid)
      setSelectedDigit(digit)
      setCurrentStep('digit-selection')
    },
    []
  )

  /** Compare la grille 9×6 aux motifs 9×6, enregistre la grille dessinée et passe à l'étape suivante. */
  const validateDigitGrid = useCallback((grid9x6: number[][]) => {
    const digits = [0, 3, 6, 9] as const
    let bestDigit = 0
    let bestScore = -1
    for (const d of digits) {
      const pattern = DIGIT_PATTERNS[d]
      let score = 0
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 6; c++) {
          if ((grid9x6[r]?.[c] ?? 0) === (pattern[r]?.[c] ?? 0)) score++
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestDigit = d
      }
    }
    setUserDrawnGrid(grid9x6)
    setSelectedDigit(bestDigit)
    setCurrentStep('grid-division')
    try {
      sessionStorage.setItem(STORAGE_KEY_DRAWN_GRID, JSON.stringify(grid9x6))
      sessionStorage.setItem(STORAGE_KEY_SELECTED_DIGIT, String(bestDigit))
      sessionStorage.setItem(STORAGE_KEY_STEP, 'grid-division')
    } catch {
      /* ignore */
    }
  }, [])

  const updateUserCount = useCallback((bandeletteId: string, count: number) => {
    setUserCounts((prev) => ({ ...prev, [bandeletteId]: count }))
  }, [])

  const allCountsEntered = NETWORK_STRUCTURE.input.every(
    (id) => userCounts[id] !== undefined
  )

  /** Au montage : restaure hidden/output neurons si on est sur l'étape réseau. */
  useEffect(() => {
    if (currentStep !== 'network-interaction') return
    const savedHidden = loadHiddenNeurons()
    const savedOutput = loadOutputNeurons()
    if (savedHidden.length > 0 && savedOutput.length > 0) {
      setHiddenNeurons(savedHidden)
      setOutputNeurons(savedOutput)
      setInputLayerNeurons(
        NETWORK_STRUCTURE.input.map((id) => ({
          id,
          value: userCounts[id] ?? 0,
        }))
      )
      return
    }
    if (NETWORK_STRUCTURE.input.every((id) => userCounts[id] !== undefined)) {
      computeInputs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const computeInputs = useCallback(() => {
    const newInputNeurons: InputNeuronData[] = NETWORK_STRUCTURE.input.map(
      (neuronId) => ({
        id: neuronId,
        value: userCounts[neuronId] ?? 0,
      })
    )
    setInputLayerNeurons(newInputNeurons)

    const inputValues = newInputNeurons.reduce(
      (acc, neuron) => {
        acc[neuron.id] = Number(neuron.value) || 0
        return acc
      },
      {} as Record<string, number>
    )

    const newHiddenNeurons: NeuronData[] = NETWORK_STRUCTURE.hidden.map(
      (neuronId) => {
        const inputs = hiddenInputsMap[neuronId](inputValues)
        const threshold =
          NETWORK_STRUCTURE.hiddenThresholds[neuronId] ?? 0
        return {
          id: neuronId,
          layer: 'hidden',
          threshold,
          inputs: Object.fromEntries(
            Object.entries(inputs).map(([k, v]) => [k, Number(v) || 0])
          ),
          calculatedSum: null,
          sumValidated: false,
          calculatedOutput: null,
          outputValidated: false,
          needsRecalculation: false,
          userSumInput: '',
          userOutputInput: '',
        }
      }
    )
    setHiddenNeurons(newHiddenNeurons)
    setCurrentStep('network-interaction')
  }, [userCounts])

  const autoCalculateHiddenNeurons = useCallback(() => {
    setHiddenNeurons((prev) =>
      prev.map((neuron) => {
        const sum = Object.values(neuron.inputs).reduce(
          (acc, val) => acc + (Number(val) || 0),
          0
        )
        const output = Math.max(0, sum - neuron.threshold)
        return {
          ...neuron,
          calculatedSum: sum,
          sumValidated: true,
          calculatedOutput: output,
          outputValidated: true,
          needsRecalculation: false,
          userSumInput: String(sum),
          userOutputInput: String(output),
        }
      })
    )
    setActiveNeuronId(null)
  }, [])

  const autoCalculateOutputNeurons = useCallback(() => {
    const allHiddenValidated =
      hiddenNeurons.length >= NETWORK_STRUCTURE.hidden.length &&
      hiddenNeurons.every((n) => n.outputValidated)
    if (!allHiddenValidated) return

    const getHidden = (id: string) =>
      hiddenNeurons.find((n) => n.id === id)?.calculatedOutput ?? 0

    setOutputNeurons((prev) =>
      prev.map((neuron) => {
        const inputs: Record<string, number> = {}
        switch (neuron.id) {
          case 'NEURONE0':
            inputs.C = getHidden('C')
            inputs.E = getHidden('E')
            inputs.F = getHidden('F')
            inputs.A = -getHidden('A')
            inputs.B = -getHidden('B')
            inputs.D = -getHidden('D')
            break
          case 'NEURONE3':
            inputs.A = getHidden('A')
            inputs.B = getHidden('B')
            inputs.D = getHidden('D')
            inputs.C = -getHidden('C')
            inputs.E = -getHidden('E')
            break
          case 'NEURONE6':
            inputs.B = getHidden('B')
            inputs.D = getHidden('D')
            inputs.E = getHidden('E')
            inputs.A = -getHidden('A')
            inputs.C = -getHidden('C')
            inputs.F = -getHidden('F')
            break
          case 'NEURONE9':
            inputs.A = getHidden('A')
            inputs.B = getHidden('B')
            inputs.C = getHidden('C')
            inputs.D = -getHidden('D')
            inputs.E = -getHidden('E')
            break
        }
        const sum = Object.values(inputs).reduce(
          (acc, val) => acc + (Number(val) || 0),
          0
        )
        const output = Math.max(0, sum - neuron.threshold)
        return {
          ...neuron,
          inputs: Object.fromEntries(
            Object.entries(inputs).map(([k, v]) => [k, Number(v) || 0])
          ),
          calculatedSum: sum,
          sumValidated: true,
          calculatedOutput: output,
          outputValidated: true,
          needsRecalculation: false,
          userSumInput: String(sum),
          userOutputInput: String(output),
        }
      })
    )
    setActiveNeuronId(null)
  }, [hiddenNeurons])

  const applySeuilThreshold = useCallback(
    (neuronId: string, newThreshold: number) => {
      const t = Math.round(newThreshold)
      const hiddenIds = NETWORK_STRUCTURE.hidden as readonly string[]
      const outputIds = NETWORK_STRUCTURE.output as readonly string[]

      if (hiddenIds.includes(neuronId)) {
        const target = hiddenNeurons.find((n) => n.id === neuronId)
        if (!target || target.threshold === t) return
        setFinalDecision(null)
        setHiddenNeurons((prevH) => {
          const nextH = applyHiddenThresholdMap(prevH, neuronId, t)
          setOutputNeurons((prevO) => cascadeInvalidateOutputs(nextH, prevO))
          return nextH
        })
        return
      }

      if (outputIds.includes(neuronId)) {
        const target = outputNeurons.find((n) => n.id === neuronId)
        if (!target || target.threshold === t) return
        setFinalDecision(null)
        setOutputNeurons((prev) =>
          prev.map((n) => {
            if (n.id !== neuronId) return n
            if (n.threshold === t) return n
            const nextCalcOut =
              n.calculatedSum != null
                ? Math.max(0, n.calculatedSum - t)
                : n.calculatedOutput
            return {
              ...n,
              threshold: t,
              calculatedOutput: nextCalcOut ?? null,
              outputValidated: false,
              needsRecalculation: true,
              userOutputInput: '',
            }
          })
        )
      }
    },
    [hiddenNeurons, outputNeurons]
  )

  useEffect(() => {
    if (hiddenNeurons.length === 0) return

    setOutputNeurons((prev) => {
      if (prev.length === 0) {
        return NETWORK_STRUCTURE.output.map((neuronId) => {
          const threshold =
            NETWORK_STRUCTURE.outputThresholds[neuronId] ?? 0
          const digit = parseInt(neuronId.replace('NEURONE', ''), 10) || 0
          return {
            id: neuronId,
            layer: 'output' as const,
            threshold,
            inputs: {},
            calculatedSum: null,
            sumValidated: false,
            calculatedOutput: null,
            outputValidated: false,
            needsRecalculation: false,
            userSumInput: '',
            userOutputInput: '',
            digit,
          }
        })
      }
      return prev.map((outputNeuron) => {
        const inputs = buildOutputInputsFromHidden(
          hiddenNeurons,
          outputNeuron.id
        )
        return {
          ...outputNeuron,
          inputs,
        }
      })
    })
  }, [hiddenNeurons])

  const handleValidateSum = useCallback(
    (neuronId: string, sum: number) => {
      const neuron =
        hiddenNeurons.find((n) => n.id === neuronId) ||
        outputNeurons.find((n) => n.id === neuronId)
      const expectedSum = Object.values(neuron?.inputs ?? {}).reduce(
        (acc, val) => acc + (Number(val) || 0),
        0
      )
      if (Math.abs(sum - expectedSum) >= 0.1) return
      if (hiddenNeurons.some((n) => n.id === neuronId)) {
        setHiddenNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedSum: sum,
                  sumValidated: true,
                  outputValidated: false,
                }
              : n
          )
        )
      } else {
        setOutputNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedSum: sum,
                  sumValidated: true,
                  outputValidated: false,
                }
              : n
          )
        )
      }
    },
    [hiddenNeurons, outputNeurons]
  )

  const handleValidateOutput = useCallback(
    (neuronId: string, output: number) => {
      const neuron =
        hiddenNeurons.find((n) => n.id === neuronId) ||
        outputNeurons.find((n) => n.id === neuronId)
      if (!neuron || neuron.calculatedSum === null) return
      const expectedOutput = Math.max(
        0,
        neuron.calculatedSum - neuron.threshold
      )
      if (Math.abs(output - expectedOutput) >= 0.1) return
      if (hiddenNeurons.some((n) => n.id === neuronId)) {
        setHiddenNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedOutput: output,
                  outputValidated: true,
                  needsRecalculation: false,
                }
              : n
          )
        )
      } else {
        setOutputNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedOutput: output,
                  outputValidated: true,
                  needsRecalculation: false,
                }
              : n
          )
        )
      }
      setActiveNeuronId(null)
    },
    [hiddenNeurons, outputNeurons]
  )

  const handleReturnToPhase1 = useCallback(
    (neuronId: string) => {
      // Revenir à la phase 1 signifie : invalider la sortie et repasser en mode saisie de somme.
      // On réinitialise donc calculatedSum/sumValidated et calculatesOutput/outputValidated.
      const isHidden = hiddenNeurons.some((n) => n.id === neuronId)
      if (isHidden) {
        setHiddenNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedSum: null,
                  sumValidated: false,
                  calculatedOutput: null,
                  outputValidated: false,
                  needsRecalculation: false,
                  userOutputInput: '',
                }
              : n
          )
        )
      } else {
        setOutputNeurons((prev) =>
          prev.map((n) =>
            n.id === neuronId
              ? {
                  ...n,
                  calculatedSum: null,
                  sumValidated: false,
                  calculatedOutput: null,
                  outputValidated: false,
                  needsRecalculation: false,
                  userOutputInput: '',
                }
              : n
          )
        )
      }

      // Empêche d'afficher une décision qui dépend d'un état "toutes les sorties validées".
      setFinalDecision(null)
    },
    [hiddenNeurons]
  )

  const handleUpdateSumInput = useCallback((neuronId: string, value: string) => {
    setHiddenNeurons((prev) =>
      prev.map((n) => (n.id === neuronId ? { ...n, userSumInput: value } : n))
    )
    setOutputNeurons((prev) =>
      prev.map((n) => (n.id === neuronId ? { ...n, userSumInput: value } : n))
    )
  }, [])

  const handleUpdateOutputInput = useCallback(
    (neuronId: string, value: string) => {
      setHiddenNeurons((prev) =>
        prev.map((n) =>
          n.id === neuronId ? { ...n, userOutputInput: value } : n
        )
      )
      setOutputNeurons((prev) =>
        prev.map((n) =>
          n.id === neuronId ? { ...n, userOutputInput: value } : n
        )
      )
    },
    []
  )

  useEffect(() => {
    if (
      outputNeurons.length === 0 ||
      !outputNeurons.every((n) => n.outputValidated)
    ) {
      return
    }
    const activations: OutputActivation[] = NETWORK_STRUCTURE.output
      .map((outputId) => outputNeurons.find((n) => n.id === outputId))
      .filter((n): n is NeuronData => n != null)
      .map((n) => ({
        digit: n.digit ?? (parseInt(n.id.replace('NEURONE', ''), 10) || 0),
        value: n.calculatedOutput ?? 0,
      }))
    setFinalDecision(resolveWinningDigit(activations))
  }, [outputNeurons])

  const resetToDigitSelection = useCallback(() => {
    setSelectedDigit(null)
    setUserDrawnGrid(null)
    setInputLayerNeurons([])
    setHiddenNeurons([])
    setOutputNeurons([])
    setFinalDecision(null)
    setUserCounts({})
    setActiveNeuronId(null)
    setCurrentStep('digit-selection')
    try {
      sessionStorage.removeItem(STORAGE_KEY_STEP)
      sessionStorage.removeItem(STORAGE_KEY_DRAWN_GRID)
      sessionStorage.removeItem(STORAGE_KEY_SELECTED_DIGIT)
      sessionStorage.removeItem(STORAGE_KEY_USER_COUNTS)
      sessionStorage.removeItem(STORAGE_KEY_HIDDEN_NEURONS)
      sessionStorage.removeItem(STORAGE_KEY_OUTPUT_NEURONS)
    } catch {
      /* ignore */
    }
  }, [])

  /** Retour à l'étape précédente (ou indique qu'il faut aller à l'accueil si on est sur le dessin). */
  const goBack = useCallback(() => {
    const prev = getPreviousStep(currentStep)
    if (prev == null) return
    setCurrentStep(prev)
    if (prev === 'digit-selection') {
      setUserDrawnGrid(null)
      setSelectedDigit(null)
      setUserCounts({})
      setInputLayerNeurons([])
      setHiddenNeurons([])
      setOutputNeurons([])
      setFinalDecision(null)
      setActiveNeuronId(null)
      try {
        sessionStorage.removeItem(STORAGE_KEY_DRAWN_GRID)
        sessionStorage.removeItem(STORAGE_KEY_SELECTED_DIGIT)
        sessionStorage.removeItem(STORAGE_KEY_USER_COUNTS)
        sessionStorage.removeItem(STORAGE_KEY_HIDDEN_NEURONS)
        sessionStorage.removeItem(STORAGE_KEY_OUTPUT_NEURONS)
      } catch {
        /* ignore */
      }
    }
    try {
      sessionStorage.setItem(STORAGE_KEY_STEP, prev)
    } catch {
      /* ignore */
    }
  }, [currentStep])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_STEP, currentStep)
    } catch {
      /* ignore */
    }
  }, [currentStep])

  /** Persister les comptages utilisateur (étape comptage + réseau). */
  useEffect(() => {
    if (
      currentStep !== 'pixel-counting' &&
      currentStep !== 'network-interaction'
    )
      return
    if (Object.keys(userCounts).length === 0) return
    try {
      sessionStorage.setItem(STORAGE_KEY_USER_COUNTS, JSON.stringify(userCounts))
    } catch {
      /* ignore */
    }
  }, [currentStep, userCounts])

  /** Persister l'état des neurones cachés et de sortie (étape réseau). */
  useEffect(() => {
    if (hiddenNeurons.length === 0 && outputNeurons.length === 0) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY_HIDDEN_NEURONS,
        JSON.stringify(hiddenNeurons)
      )
      sessionStorage.setItem(
        STORAGE_KEY_OUTPUT_NEURONS,
        JSON.stringify(outputNeurons)
      )
    } catch {
      /* ignore */
    }
  }, [hiddenNeurons, outputNeurons])

  const activeNeuron =
    activeNeuronId != null
      ? hiddenNeurons.find((n) => n.id === activeNeuronId) ??
        outputNeurons.find((n) => n.id === activeNeuronId)
      : null

  return {
    currentStep,
    setCurrentStep,
    selectedDigit,
    userDrawnGrid,
    userCounts,
    inputLayerNeurons,
    hiddenNeurons,
    outputNeurons,
    activeNeuronId,
    setActiveNeuronId,
    finalDecision,
    selectDigit,
    loadDigitExample,
    validateDigitGrid,
    updateUserCount,
    allCountsEntered,
    computeInputs,
    autoCalculateHiddenNeurons,
    autoCalculateOutputNeurons,
    applySeuilThreshold,
    handleValidateSum,
    handleValidateOutput,
    handleReturnToPhase1,
    handleUpdateSumInput,
    handleUpdateOutputInput,
    resetToDigitSelection,
    goBack,
    activeNeuron,
  }
}
