export type ProgressStep =
  | 'digit-selection'
  | 'grid-division'
  | 'pixel-counting'
  | 'network-interaction'

export interface InputNeuronData {
  id: string
  value: number
}

export interface NeuronData {
  id: string
  layer: 'hidden' | 'output'
  threshold: number
  inputs: { [key: string]: number }
  calculatedSum: number | null
  sumValidated: boolean
  calculatedOutput: number | null
  outputValidated: boolean
  userSumInput: string
  userOutputInput: string
  digit?: number
  /** Seuil modifié en mode seuil : à revalider en mode calcul. */
  needsRecalculation?: boolean
}

export interface NetworkVisualizationProps {
  inputNeurons: InputNeuronData[]
  hiddenNeurons: NeuronData[]
  outputNeurons: NeuronData[]
  onNeuronClick: (neuronId: string) => void
  onAutoCalculateHidden: () => void
  onAutoCalculateOutput: () => void
}

export interface NeuronPanelProps {
  neuronId: string
  neuron: NeuronData | null
  inputNeurons: InputNeuronData[]
  hiddenNeurons: NeuronData[]
  onClose: () => void
  onValidateSum: (neuronId: string, sum: number) => void
  onValidateOutput: (neuronId: string, output: number) => void
  onReturnToPhase1: (neuronId: string) => void
  onUpdateSumInput: (neuronId: string, value: string) => void
  onUpdateOutputInput: (neuronId: string, value: string) => void
}
