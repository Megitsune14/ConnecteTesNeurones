import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import type { NetworkVisualizationProps } from './types'
import { NETWORK_STRUCTURE } from './constants'
import {
  formatDigitsList,
  getOutputVerdictLabel,
  getOutputVerdictOutcome,
  resolveNetworkDecision,
  type NetworkDecision,
  type OutputActivation,
  type VerdictOutcome,
} from './networkDecision'
import type { NeuronData } from './types'

/** Layout du parcours intégré : grille → réseau → verdicts → décision. */
const LAYOUT = {
  columnSpacing: 480,
  nodeSpacing: 130,
  startY: 80,
  gridColumn: -290,
  gridWidth: 300,
  gridLabelSpace: 32,
  gridFlowOffset: 78,
  /** Décalage vers la gauche de la grille de départ et de sa flèche. */
  gridShiftX: 30,
  inputFlowAnchorX: -68,
  /** Décalages depuis la colonne de sortie (×2 × columnSpacing). */
  verdictOffset: 200,
  /** Décalage horizontal des labels « C'est un x » / « Ce n'est pas un x ». */
  verdictShiftX: 70,
  networkExitOffset: 300,
  decisionOffset: 650,
  neuronWidth: 172,
  neuronHeight: 112,
  neuronFontSize: 20,
  neuronTextMaxWidth: 108,
  verdictFontSize: 19,
  verdictTextMaxWidth: 220,
  decisionWidth: 320,
  decisionHeight: 340,
  decisionFontSize: 22,
  decisionTextMaxWidth: 290,
  gridFontSize: 24,
  flowToDecisionGap: 28,
  /** Décalage horizontal global du réseau (grille et décision inchangées). */
  networkOffsetX: 40,
} as const

const PORTRAIT_BREAKPOINT_PX = 1024
const COMPACT_BREAKPOINT_PX = 768
const NARROW_BREAKPOINT_PX = 500
const INPUT_ROW_COUNT = 6
/** Portrait : espacements dédiés (nodeSpacing ≥ hauteur neurone 112 px). */
const PORTRAIT_LAYOUT = {
  nodeSpacing: 128,
  gridToNetworkGap: 120,
  gridTop: 48,
  networkToDecisionGap: 80,
  /** Centre horizontal du réseau (colonnes étalées, neurones inchangés). */
  centerX: 500,
  columnSpacing: 460,
  compact: {
    gridTop: 12,
    gridToNetworkGap: 72,
    networkToDecisionGap: 40,
    nodeSpacing: 122,
  },
  narrow: {
    gridTop: 4,
    gridToNetworkGap: 52,
    networkToDecisionGap: 24,
    nodeSpacing: 118,
  },
} as const

type ViewportTier = 'default' | 'compact' | 'narrow'

const FIT_PADDING: Record<ViewportTier | 'landscape' | 'portrait', number> = {
  landscape: 48,
  portrait: 18,
  default: 18,
  compact: 6,
  narrow: 2,
}

function resolveFitPadding(
  usePortraitFlow: boolean,
  viewportTier: ViewportTier
): number {
  if (viewportTier === 'narrow') return FIT_PADDING.narrow
  if (viewportTier === 'compact') return FIT_PADDING.compact
  if (usePortraitFlow) return FIT_PADDING.portrait
  return FIT_PADDING.landscape
}

type LayoutGeometry = {
  isPortrait: boolean
  nodeSpacing: number
  startY: number
  inputColumnX: number
  hiddenColumnX: number
  outputColumnX: number
  outputStartY: number
  gridPosition: { x: number; y: number }
  flowAfterGrid: { x: number; y: number }
  flowBeforeInput: { x: number; y: number }
  networkExit: { x: number; y: number }
  decision: { x: number; y: number }
  verdictPosition: (index: number) => { x: number; y: number }
}

function buildLayoutGeometry(
  isPortrait: boolean,
  viewportTier: ViewportTier
): LayoutGeometry {
  const portraitNarrow = isPortrait && viewportTier === 'narrow'
  const portraitCompact = isPortrait && viewportTier === 'compact'
  const portraitSpacing = portraitNarrow
    ? PORTRAIT_LAYOUT.narrow
    : portraitCompact
      ? PORTRAIT_LAYOUT.compact
      : null
  const nodeSpacing = isPortrait
    ? (portraitSpacing?.nodeSpacing ?? PORTRAIT_LAYOUT.nodeSpacing)
    : LAYOUT.nodeSpacing

  if (!isPortrait) {
    const columnSpacing = LAYOUT.columnSpacing
    const networkOffsetX = LAYOUT.networkOffsetX
    const gridColumn = LAYOUT.gridColumn - LAYOUT.gridShiftX
    const inputColumnX = networkOffsetX
    const hiddenColumnX = columnSpacing + networkOffsetX
    const outputColumnX = columnSpacing * 2 + networkOffsetX
    const inputFlowAnchorX =
      LAYOUT.inputFlowAnchorX - LAYOUT.gridShiftX + networkOffsetX
    const verdictColumnX =
      outputColumnX + LAYOUT.verdictOffset + LAYOUT.verdictShiftX
    const startY = LAYOUT.startY
    const outputStartY = startY + ((INPUT_ROW_COUNT - 4) / 2) * nodeSpacing
    const integratedCenterY = startY + 2.5 * nodeSpacing

    return {
      isPortrait: false,
      nodeSpacing,
      startY,
      inputColumnX,
      hiddenColumnX,
      outputColumnX,
      outputStartY,
      gridPosition: { x: gridColumn, y: integratedCenterY },
      flowAfterGrid: {
        x: gridColumn + LAYOUT.gridFlowOffset,
        y: integratedCenterY,
      },
      flowBeforeInput: { x: inputFlowAnchorX, y: integratedCenterY },
      networkExit: {
        x: outputColumnX + LAYOUT.networkExitOffset,
        y: outputStartY + 1.5 * nodeSpacing,
      },
      decision: {
        x: columnSpacing * 2 + LAYOUT.decisionOffset,
        y: outputStartY + 1.5 * nodeSpacing,
      },
      verdictPosition: (index) => ({
        x: verdictColumnX,
        y: outputStartY + index * nodeSpacing,
      }),
    }
  }

  const centerX = PORTRAIT_LAYOUT.centerX
  const columnSpacing = PORTRAIT_LAYOUT.columnSpacing
  const gridTop = portraitSpacing?.gridTop ?? PORTRAIT_LAYOUT.gridTop
  const gridToNetworkGap =
    portraitSpacing?.gridToNetworkGap ?? PORTRAIT_LAYOUT.gridToNetworkGap
  const networkToDecisionGap =
    portraitSpacing?.networkToDecisionGap ?? PORTRAIT_LAYOUT.networkToDecisionGap
  const gridCenterY = gridTop + GRID_NODE_HEIGHT / 2
  const networkStartY = gridTop + GRID_NODE_HEIGHT + gridToNetworkGap
  const inputColumnX = centerX - columnSpacing
  const hiddenColumnX = centerX
  const outputColumnX = centerX + columnSpacing
  const outputStartY = networkStartY + nodeSpacing
  const networkBottomY =
    networkStartY + (INPUT_ROW_COUNT - 1) * nodeSpacing + LAYOUT.neuronHeight / 2
  const networkExitY = networkBottomY + 40
  const decisionY =
    networkExitY + networkToDecisionGap + LAYOUT.decisionHeight / 2
  const flowNetworkEntryY = networkStartY - 24

  return {
    isPortrait: true,
    nodeSpacing,
    startY: networkStartY,
    inputColumnX,
    hiddenColumnX,
    outputColumnX,
    outputStartY,
    gridPosition: { x: centerX, y: gridCenterY },
    flowAfterGrid: { x: centerX, y: flowNetworkEntryY },
    flowBeforeInput: { x: centerX, y: flowNetworkEntryY },
    networkExit: { x: centerX, y: networkExitY },
    decision: { x: centerX, y: decisionY },
    verdictPosition: (index) => ({
      x: outputColumnX,
      y: outputStartY + index * nodeSpacing + 58,
    }),
  }
}

function usePortraitLayout(): boolean {
  const [isPortrait, setIsPortrait] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${PORTRAIT_BREAKPOINT_PX - 1}px)`).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PORTRAIT_BREAKPOINT_PX - 1}px)`)
    const sync = () => setIsPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return isPortrait
}

function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(() => {
    if (typeof window === 'undefined') return 'default'
    if (window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX - 1}px)`).matches) {
      return 'narrow'
    }
    if (window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT_PX - 1}px)`).matches) {
      return 'compact'
    }
    return 'default'
  })

  useEffect(() => {
    const narrowMq = window.matchMedia(
      `(max-width: ${NARROW_BREAKPOINT_PX - 1}px)`
    )
    const compactMq = window.matchMedia(
      `(max-width: ${COMPACT_BREAKPOINT_PX - 1}px)`
    )
    const sync = () => {
      if (narrowMq.matches) setTier('narrow')
      else if (compactMq.matches) setTier('compact')
      else setTier('default')
    }
    sync()
    narrowMq.addEventListener('change', sync)
    compactMq.addEventListener('change', sync)
    return () => {
      narrowMq.removeEventListener('change', sync)
      compactMq.removeEventListener('change', sync)
    }
  }, [])

  return tier
}

const FLOW_NETWORK_TO_DECISION_GAP = LAYOUT.flowToDecisionGap
const GRID_NODE_ID = 'START_GRID'
const DECISION_NODE_ID = 'FINAL_DECISION'
const FLOW_ANCHOR_AFTER_GRID = 'FLOW_ANCHOR_AFTER_GRID'
const FLOW_ANCHOR_BEFORE_INPUT = 'FLOW_ANCHOR_BEFORE_INPUT'
const FLOW_ANCHOR_NETWORK_EXIT = 'FLOW_ANCHOR_NETWORK_EXIT'

const GRID_CELL_PX = 18
const GRID_NODE_WIDTH = LAYOUT.gridWidth
const GRID_LABEL_SPACE = LAYOUT.gridLabelSpace

function computeGridPreviewLayout(cellPx: number) {
  const sepMarginPx = Math.max(1, Math.round(cellPx / 24))
  const sepWPx = Math.max(2, Math.round(cellPx / 12))
  const colGroupW = cellPx * 2
  const hBandPx = cellPx * 3
  const hSepBlock = sepMarginPx * 2 + sepWPx
  const width = colGroupW * 3 + hSepBlock * 2
  const height = hBandPx * 3 + hSepBlock * 2

  return {
    cellPx,
    sepMarginPx,
    sepWPx,
    colGroupW,
    hBandPx,
    hSepBlock,
    width,
    height,
    vLineLeft: [
      colGroupW + sepMarginPx,
      colGroupW + sepMarginPx + sepWPx + sepMarginPx + colGroupW + sepMarginPx,
    ],
    hLineTop: [
      hBandPx + sepMarginPx,
      hBandPx + hSepBlock + hBandPx + sepMarginPx,
    ],
  }
}

const GRID_PREVIEW = computeGridPreviewLayout(GRID_CELL_PX)
const GRID_IMAGE_HEIGHT = Math.round(
  GRID_NODE_WIDTH * (GRID_PREVIEW.height / GRID_PREVIEW.width)
)
const GRID_NODE_HEIGHT = GRID_LABEL_SPACE + GRID_IMAGE_HEIGHT

function patternToGridDataUrl(pattern: number[][]): string {
  const {
    cellPx,
    sepWPx,
    colGroupW,
    hBandPx,
    hSepBlock,
    width,
    height,
    vLineLeft,
    hLineTop,
  } = GRID_PREVIEW

  const scale = GRID_NODE_WIDTH / width
  const displayWidth = GRID_NODE_WIDTH
  const displayHeight = GRID_IMAGE_HEIGHT

  const cellX = (gridCol: number) => {
    const colGroup = Math.floor(gridCol / 2)
    const colCol = gridCol % 2
    return colGroup * (colGroupW + hSepBlock) + colCol * cellPx
  }

  const cellY = (gridRow: number) => {
    const ligGroup = Math.floor(gridRow / 3)
    const ligRow = gridRow % 3
    return ligGroup * (hBandPx + hSepBlock) + ligRow * cellPx
  }

  const canvas = document.createElement('canvas')
  canvas.width = displayWidth
  canvas.height = displayHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.scale(scale, scale)

  ctx.fillStyle = '#F3F4F6'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#E5E7EB'
  for (let gapIndex = 0; gapIndex < 2; gapIndex++) {
    const x = (gapIndex + 1) * colGroupW + gapIndex * hSepBlock
    ctx.fillRect(x, 0, hSepBlock, height)
    const y = (gapIndex + 1) * hBandPx + gapIndex * hSepBlock
    ctx.fillRect(0, y, width, hSepBlock)
  }

  for (let gridRow = 0; gridRow < 9; gridRow++) {
    for (let gridCol = 0; gridCol < 6; gridCol++) {
      const x = cellX(gridCol)
      const y = cellY(gridRow)
      const isActive = pattern[gridRow]?.[gridCol] === 1

      ctx.fillStyle = isActive ? '#000' : '#D1D5DB'
      ctx.fillRect(x, y, cellPx, cellPx)

      ctx.strokeStyle = isActive ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cellPx - 1, cellPx - 1)
    }
  }

  ctx.fillStyle = '#DC143C'
  for (const left of vLineLeft) {
    ctx.fillRect(left, 0, sepWPx, height)
  }

  ctx.fillStyle = '#F9BB12'
  for (const top of hLineTop) {
    ctx.fillRect(0, top, width, sepWPx)
  }

  return canvas.toDataURL()
}

function buildDecisionNodeData(
  allOutputsValidated: boolean,
  decision: NetworkDecision
): { label: string; outcome: string } {
  if (!allOutputsValidated) {
    return {
      label: 'Décision finale\n\nValidez les neurones\nde sortie',
      outcome: 'pending',
    }
  }
  if (decision.status === 'none') {
    return {
      label: 'Décision finale\n\nNon reconnu',
      outcome: 'none',
    }
  }
  if (decision.status === 'ambiguous') {
    return {
      label: `Décision finale\n\nAmbiguïté\n\n${formatDigitsList(decision.digits)}`,
      outcome: 'ambiguous',
    }
  }
  return {
    label: `Décision finale\n\n${decision.digit}\n\n✓ C'est un ${decision.digit}`,
    outcome: 'success',
  }
}

const CYTOSCAPE_STYLE = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      width: LAYOUT.neuronWidth,
      height: LAYOUT.neuronHeight,
      shape: 'round-rectangle',
      'border-width': 2,
      'text-valign': 'center',
      'text-halign': 'center',
      color: '#1A182D',
      'font-size': `${LAYOUT.neuronFontSize}px`,
      'text-wrap': 'wrap',
      'text-max-width': `${LAYOUT.neuronTextMaxWidth}px`,
      'background-opacity': 0.9,
    },
  },
  {
    selector: 'node[type = "verdict"]',
    style: {
      width: 10,
      height: 10,
      'background-opacity': 0,
      'border-width': 0,
      'text-halign': 'left',
      'text-valign': 'center',
      'font-size': `${LAYOUT.verdictFontSize}px`,
      'text-wrap': 'wrap',
      'text-max-width': `${LAYOUT.verdictTextMaxWidth}px`,
    },
  },
  {
    selector: 'node[type = "verdict"][outcome = "winner"]',
    style: {
      color: '#00A19A',
      'font-weight': 'bold',
    },
  },
  {
    selector: 'node[type = "verdict"][outcome = "ambiguous"]',
    style: {
      color: '#E6A800',
      'font-weight': 'bold',
    },
  },
  {
    selector: 'node[type = "verdict"][outcome = "loser"]',
    style: {
      color: '#DC143C',
      'font-weight': 'normal',
    },
  },
  {
    selector: 'node[type = "verdict"][layout = "portrait"]',
    style: {
      'text-halign': 'center',
      'text-valign': 'top',
      'font-size': `${Math.max(14, LAYOUT.verdictFontSize - 2)}px`,
      'text-max-width': `${Math.round(LAYOUT.neuronWidth * 1.1)}px`,
    },
  },
  {
    selector: 'node[layer = "input"][type = "col"]',
    style: {
      'background-color': '#DC143C',
      color: '#fff',
    },
  },
  {
    selector: 'node[layer = "input"][type = "lig"]',
    style: {
      'background-color': '#F9BB12',
      color: '#1A182D',
    },
  },
  {
    selector: 'node[layer = "hidden"]',
    style: {
      'background-color': '#EBEBEC',
      'border-color': '#24A1EB',
      color: '#1A182D',
      'background-opacity': 0.9,
    },
  },
  {
    selector: 'node[layer = "hidden"][validated = "true"]',
    style: {
      'background-color': '#00A19A',
      'border-color': '#008080',
      'border-width': 3,
      color: '#fff',
      'background-opacity': 0.95,
    },
  },
  {
    selector: 'node[layer = "hidden"][warning = "true"]',
    style: {
      'background-color': '#F9BB12',
      'border-color': '#E6A610',
      'border-width': 4,
      color: '#1A182D',
      'background-opacity': 0.95,
    },
  },
  {
    selector: 'node[layer = "output"]',
    style: {
      'background-color': '#EBEBEC',
      'border-color': '#24A1EB',
      color: '#1A182D',
      'background-opacity': 0.9,
    },
  },
  {
    selector: 'node[layer = "output"][locked = "true"]',
    style: {
      opacity: 0.6,
    },
  },
  {
    selector: 'node[layer = "output"][validated = "true"]',
    style: {
      'background-color': '#00A19A',
      'border-color': '#008080',
      'border-width': 3,
      color: '#fff',
      'background-opacity': 0.95,
    },
  },
  {
    selector: 'node[layer = "output"][warning = "true"]',
    style: {
      'background-color': '#F9BB12',
      'border-color': '#E6A610',
      'border-width': 4,
      color: '#1A182D',
      'background-opacity': 0.95,
    },
  },
  {
    selector: 'node[type = "grid"]',
    style: {
      width: GRID_NODE_WIDTH,
      height: GRID_NODE_HEIGHT,
      shape: 'round-rectangle',
      'background-color': '#fff',
      'border-width': 2,
      'border-color': '#EBEBEC',
      'background-image': 'data(image)',
      'background-fit': 'contain',
      'background-width': '92%',
      'background-position-x': '50%',
      'background-position-y': '58%',
      label: 'data(label)',
      'font-size': `${LAYOUT.gridFontSize}px`,
      'font-weight': 'bold',
      'text-wrap': 'none',
      'text-max-width': `${LAYOUT.gridWidth}px`,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': 2,
      color: '#1A182D',
    },
  },
  {
    selector: 'node[type = "decision"]',
    style: {
      width: LAYOUT.decisionWidth,
      height: LAYOUT.decisionHeight,
      shape: 'round-rectangle',
      'background-color': '#fff',
      'border-width': 3,
      'border-color': '#24A1EB',
      label: 'data(label)',
      'font-size': `${LAYOUT.decisionFontSize}px`,
      'font-weight': 'bold',
      'text-wrap': 'wrap',
      'text-max-width': `${LAYOUT.decisionTextMaxWidth}px`,
      color: '#1A182D',
      'text-valign': 'center',
      'text-halign': 'center',
    },
  },
  {
    selector: 'node[type = "decision"][outcome = "success"]',
    style: {
      'border-color': '#00A19A',
      color: '#00A19A',
    },
  },
  {
    selector: 'node[type = "decision"][outcome = "error"]',
    style: {
      'border-color': '#DC143C',
      color: '#DC143C',
    },
  },
  {
    selector: 'node[type = "decision"][outcome = "none"]',
    style: {
      'border-color': '#6B7280',
      color: '#1A182D',
    },
  },
  {
    selector: 'node[type = "decision"][outcome = "pending"]',
    style: {
      'border-color': '#EBEBEC',
      color: '#6B7280',
      'font-weight': 'normal',
      'font-size': `${Math.max(14, LAYOUT.decisionFontSize - 2)}px`,
    },
  },
  {
    selector: 'node[type = "decision"][outcome = "ambiguous"]',
    style: {
      'border-color': '#E6A800',
      color: '#1A182D',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 2,
      'line-color': '#24A1EB',
      opacity: 0.5,
      'target-arrow-color': '#24A1EB',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
    },
  },
  {
    selector: 'node[type = "flow-anchor"]',
    style: {
      width: 1,
      height: 1,
      'background-opacity': 0,
      'border-width': 0,
      label: '',
      events: 'no',
    },
  },
  {
    selector: 'edge[flow = "true"]',
    style: {
      width: 3,
      'line-style': 'solid',
      'line-color': '#6B7280',
      opacity: 0.75,
      'target-arrow-color': '#6B7280',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.5,
      'curve-style': 'straight',
      'z-index': 10,
    },
  },
  {
    selector: 'edge#FLOW-NETWORK-TO-DECISION',
    style: {
      'target-distance-from-node': FLOW_NETWORK_TO_DECISION_GAP,
    },
  },
]

/** Recalcule labels et styles après mise à jour dynamique (cache Cytoscape). */
function reflowCytoscapeGraph(
  cy: cytoscape.Core,
  options: { fit?: boolean; fitPadding?: number } = {}
) {
  cy.nodes('[?label]').forEach((node) => {
    const label = node.data('label')
    if (typeof label === 'string' && label.length > 0) {
      node.removeData('label')
      node.data('label', label)
    }
    const outcome = node.data('outcome')
    if (outcome != null && outcome !== '') {
      node.removeData('outcome')
      node.data('outcome', outcome)
    }
  })
  cy.style().update()
  cy.resize()
  if (options.fit) {
    cy.fit(undefined, options.fitPadding ?? FIT_PADDING.landscape)
  }
}

const NetworkVisualization = ({
  inputNeurons,
  hiddenNeurons,
  outputNeurons,
  onNeuronClick,
  onAutoCalculateHidden,
  onAutoCalculateOutput,
  pattern = null,
}: NetworkVisualizationProps) => {
  const cyRef = useRef<cytoscape.Core | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const outputNeuronsClickableRef = useRef(false)
  const layoutModeRef = useRef(false)
  const viewportTierRef = useRef<ViewportTier>('default')
  const isPortraitLayout = usePortraitLayout()
  const viewportTier = useViewportTier()
  const showIntegratedFlow = pattern != null
  const usePortraitFlow = isPortraitLayout && showIntegratedFlow
  const fitPadding = resolveFitPadding(usePortraitFlow, viewportTier)

  const allHiddenValidated =
    hiddenNeurons.length >= NETWORK_STRUCTURE.hidden.length &&
    hiddenNeurons.every((n) => n.outputValidated)

  const allOutputsValidated =
    outputNeurons.length > 0 &&
    outputNeurons.every((n) => n.outputValidated)

  const networkDecision = resolveNetworkDecision(
    NETWORK_STRUCTURE.output
      .map((outputId) => outputNeurons.find((n) => n.id === outputId))
      .filter((n): n is NeuronData => n != null && n.outputValidated)
      .map(
        (n): OutputActivation => ({
          digit:
            n.digit ?? (parseInt(n.id.replace('NEURONE', ''), 10) || 0),
          value: n.calculatedOutput ?? 0,
        })
      )
  )

  useEffect(() => {
    if (!containerRef.current || inputNeurons.length === 0) return

    const geo = buildLayoutGeometry(usePortraitFlow, viewportTier)
    const verdictLayout = geo.isPortrait ? 'portrait' : 'landscape'
    const networkNodeLayout = geo.isPortrait ? { layout: 'portrait' as const } : {}
    outputNeuronsClickableRef.current = allHiddenValidated

    const inputValuesMap = new Map(inputNeurons.map((n) => [n.id, n.value]))
    const hiddenValuesMap = new Map(hiddenNeurons.map((n) => [n.id, n]))
    const outputValuesMap = new Map(outputNeurons.map((n) => [n.id, n]))

    const colNodes = NETWORK_STRUCTURE.input
      .filter((id) => id.startsWith('COL'))
      .map((id, index) => {
        const value = inputValuesMap.get(id) ?? 0
        return {
          data: {
            id,
            label: `${id}\n${value} pixels`,
            value,
            layer: 'input',
            type: 'col',
            ...networkNodeLayout,
          },
          position: {
            x: geo.inputColumnX,
            y: geo.startY + index * geo.nodeSpacing,
          },
          locked: true,
        }
      })

    const ligNodes = NETWORK_STRUCTURE.input
      .filter((id) => id.startsWith('LIG'))
      .map((id, index) => {
        const value = inputValuesMap.get(id) ?? 0
        return {
          data: {
            id,
            label: `${id}\n${value} pixels`,
            value,
            layer: 'input',
            type: 'lig',
            ...networkNodeLayout,
          },
          position: {
            x: geo.inputColumnX,
            y: geo.startY + (3 + index) * geo.nodeSpacing,
          },
          locked: true,
        }
      })

    const inputNodes = [...colNodes, ...ligNodes]

    const hiddenNodes = NETWORK_STRUCTURE.hidden.map((id, index) => {
      const neuron = hiddenValuesMap.get(id)
      const needsWarn = neuron?.needsRecalculation === true
      const outputValue =
        needsWarn || (neuron?.outputValidated ?? false)
          ? (neuron?.calculatedOutput ?? 0)
          : 0
      const isValidated = (neuron?.outputValidated ?? false) && !needsWarn
      const label = needsWarn
        ? `⚠️ Neurone ${id}\n${outputValue}`
        : isValidated
          ? `Neurone ${id}\n${outputValue}`
          : `Neurone ${id}`
      return {
        data: {
          id,
          label,
          layer: 'hidden',
          validated: isValidated,
          warning: needsWarn ? 'true' : 'false',
          value: outputValue,
          ...networkNodeLayout,
        },
        position: {
          x: geo.hiddenColumnX,
          y: geo.startY + index * geo.nodeSpacing,
        },
        locked: true,
      }
    })

    const showIntegrated = showIntegratedFlow

    const gridNode = showIntegrated
      ? [
          {
            data: {
              id: GRID_NODE_ID,
              label: 'Grille de départ',
              type: 'grid',
              layer: 'grid',
              image: patternToGridDataUrl(pattern),
            },
            position: geo.gridPosition,
            locked: true,
          },
        ]
      : []

    const decisionData = buildDecisionNodeData(
      allOutputsValidated,
      networkDecision
    )
    const flowAnchorNodes = showIntegrated
      ? geo.isPortrait
        ? [
            {
              data: {
                id: FLOW_ANCHOR_BEFORE_INPUT,
                type: 'flow-anchor',
                layer: 'flow',
              },
              position: geo.flowBeforeInput,
              locked: true,
            },
            {
              data: {
                id: FLOW_ANCHOR_NETWORK_EXIT,
                type: 'flow-anchor',
                layer: 'flow',
              },
              position: geo.networkExit,
              locked: true,
            },
          ]
        : [
            {
              data: {
                id: FLOW_ANCHOR_AFTER_GRID,
                type: 'flow-anchor',
                layer: 'flow',
              },
              position: geo.flowAfterGrid,
              locked: true,
            },
            {
              data: {
                id: FLOW_ANCHOR_BEFORE_INPUT,
                type: 'flow-anchor',
                layer: 'flow',
              },
              position: geo.flowBeforeInput,
              locked: true,
            },
            {
              data: {
                id: FLOW_ANCHOR_NETWORK_EXIT,
                type: 'flow-anchor',
                layer: 'flow',
              },
              position: geo.networkExit,
              locked: true,
            },
          ]
      : []
    const decisionNode = showIntegrated
      ? [
          {
            data: {
              id: DECISION_NODE_ID,
              label: decisionData.label,
              type: 'decision',
              layer: 'decision',
              outcome: decisionData.outcome,
            },
            position: geo.decision,
            locked: true,
          },
        ]
      : []
    const outputNodes = NETWORK_STRUCTURE.output.map((id, index) => {
      const neuron = outputValuesMap.get(id)
      const needsWarn = neuron?.needsRecalculation === true
      const outputValue =
        needsWarn || (neuron?.outputValidated ?? false)
          ? (neuron?.calculatedOutput ?? 0)
          : 0
      const isValidated = (neuron?.outputValidated ?? false) && !needsWarn
      const digit =
        neuron?.digit ??
        (parseInt(id.replace('NEURONE', ''), 10) || 0)
      const label = needsWarn
        ? `⚠️ Neurone ${digit}\n${outputValue}`
        : isValidated
          ? `Neurone ${digit}\n${outputValue}`
          : `Neurone ${digit}`

      return {
        data: {
          id,
          label,
          layer: 'output',
          validated: isValidated,
          warning: needsWarn ? 'true' : 'false',
          value: outputValue,
          locked: !allHiddenValidated,
          ...networkNodeLayout,
        },
        position: {
          x: geo.outputColumnX,
          y: geo.outputStartY + index * geo.nodeSpacing,
        },
        locked: true,
      }
    })
    const outputVerdictNodes = NETWORK_STRUCTURE.output.map((id, index) => {
      const neuron = outputValuesMap.get(id)
      const digit =
        neuron?.digit ??
        (parseInt(id.replace('NEURONE', ''), 10) || 0)
      const value = neuron?.calculatedOutput ?? 0
      const isValidated = neuron?.outputValidated ?? false

      let label = ''
      let outcome: VerdictOutcome = 'loser'

      if (isValidated && allOutputsValidated) {
        const labelText = getOutputVerdictLabel(digit, networkDecision, {
          allOutputsValidated: true,
          neuronValidated: true,
          activation: value,
          labelStyle: 'compact',
        })
        outcome = getOutputVerdictOutcome(digit, networkDecision, {
          allOutputsValidated: true,
          neuronValidated: true,
          activation: value,
        })
        label = labelText ?? ''
      }

      return {
        data: {
          id: `${id}_VERDICT`,
          label,
          layer: 'verdict',
          type: 'verdict',
          outcome,
          digit,
          value,
          layout: verdictLayout,
        },
        position: geo.verdictPosition(index),
        locked: true,
      }
    })

    const inputToHiddenEdges: {
      data: { id: string; source: string; target: string }
    }[] = []
    inputToHiddenEdges.push(
      { data: { id: 'COL1-A', source: 'COL1', target: 'A' } },
      { data: { id: 'COL2-A', source: 'COL2', target: 'A' } },
      { data: { id: 'COL3-A', source: 'COL3', target: 'A' } },
      { data: { id: 'COL2-B', source: 'COL2', target: 'B' } },
      { data: { id: 'LIG2-B', source: 'LIG2', target: 'B' } },
      { data: { id: 'LIG3-B', source: 'LIG3', target: 'B' } },
      { data: { id: 'COL3-C', source: 'COL3', target: 'C' } },
      { data: { id: 'LIG1-C', source: 'LIG1', target: 'C' } },
      { data: { id: 'LIG2-C', source: 'LIG2', target: 'C' } },
      { data: { id: 'COL2-D', source: 'COL2', target: 'D' } },
      { data: { id: 'LIG1-D', source: 'LIG1', target: 'D' } },
      { data: { id: 'LIG3-D', source: 'LIG3', target: 'D' } },
      { data: { id: 'COL1-E', source: 'COL1', target: 'E' } },
      { data: { id: 'LIG2-E', source: 'LIG2', target: 'E' } },
      { data: { id: 'LIG3-E', source: 'LIG3', target: 'E' } },
      { data: { id: 'LIG1-F', source: 'LIG1', target: 'F' } },
      { data: { id: 'LIG2-F', source: 'LIG2', target: 'F' } },
      { data: { id: 'LIG3-F', source: 'LIG3', target: 'F' } }
    )
    const hiddenToOutputEdges: {
      data: { id: string; source: string; target: string }
    }[] = []
    for (const hiddenId of NETWORK_STRUCTURE.hidden) {
      for (const outputId of NETWORK_STRUCTURE.output) {
        hiddenToOutputEdges.push({
          data: { id: `${hiddenId}-${outputId}`, source: hiddenId, target: outputId },
        })
      }
    }
    const edges = [...inputToHiddenEdges, ...hiddenToOutputEdges]
    const flowEdges = showIntegrated
      ? geo.isPortrait
        ? [
            {
              data: {
                id: 'FLOW-GRID-TO-NETWORK',
                source: GRID_NODE_ID,
                target: FLOW_ANCHOR_BEFORE_INPUT,
                flow: 'true',
              },
            },
            {
              data: {
                id: 'FLOW-NETWORK-TO-DECISION',
                source: FLOW_ANCHOR_NETWORK_EXIT,
                target: DECISION_NODE_ID,
                flow: 'true',
              },
            },
          ]
        : [
            {
              data: {
                id: 'FLOW-GRID-TO-MID',
                source: GRID_NODE_ID,
                target: FLOW_ANCHOR_AFTER_GRID,
                flow: 'true',
              },
            },
            {
              data: {
                id: 'FLOW-MID-TO-INPUT',
                source: FLOW_ANCHOR_AFTER_GRID,
                target: FLOW_ANCHOR_BEFORE_INPUT,
                flow: 'true',
              },
            },
            {
              data: {
                id: 'FLOW-NETWORK-TO-DECISION',
                source: FLOW_ANCHOR_NETWORK_EXIT,
                target: DECISION_NODE_ID,
                flow: 'true',
              },
            },
          ]
      : []
    const nodes = [
      ...gridNode,
      ...flowAnchorNodes,
      ...inputNodes,
      ...hiddenNodes,
      ...outputNodes,
      ...outputVerdictNodes,
      ...decisionNode,
    ]
    const allEdges = [...edges, ...flowEdges]

    let cy = cyRef.current
    const hasPortraitFlowEdges =
      (cy?.getElementById('FLOW-GRID-TO-NETWORK').length ?? 0) > 0
    if (cy && layoutModeRef.current !== geo.isPortrait) {
      cy.destroy()
      cyRef.current = null
      cy = null
    }
    if (cy && viewportTierRef.current !== viewportTier) {
      cy.destroy()
      cyRef.current = null
      cy = null
    }
    if (cy && showIntegrated && hasPortraitFlowEdges !== geo.isPortrait) {
      cy.destroy()
      cyRef.current = null
      cy = null
    }
    layoutModeRef.current = geo.isPortrait
    viewportTierRef.current = viewportTier

    if (
      cy &&
      showIntegrated &&
      (cy.getElementById(FLOW_ANCHOR_BEFORE_INPUT).length === 0 ||
        cy.getElementById(FLOW_ANCHOR_NETWORK_EXIT).length === 0 ||
        cy.getElementById('FLOW_ANCHOR_AFTER_OUTPUT').length > 0 ||
        cy.getElementById('FLOW-INPUT-TO-NETWORK').length > 0)
    ) {
      cy.destroy()
      cyRef.current = null
      cy = null
    }

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...allEdges],
        style: CYTOSCAPE_STYLE as any,
        layout: { name: 'preset' },
        zoomingEnabled: true,
        panningEnabled: true,
        userZoomingEnabled: true,
        userPanningEnabled: false,
        minZoom: 0.3,
        maxZoom: 2,
        boxSelectionEnabled: false,
      })

      cyRef.current.on('tap', 'node', (evt) => {
        const node = evt.target
        const layer = node.data('layer')
        const neuronId = node.id()
        if (layer === 'output' && !outputNeuronsClickableRef.current) return
        if (layer === 'hidden' || layer === 'output') {
          onNeuronClick(neuronId)
        }
      })

      reflowCytoscapeGraph(cyRef.current, { fit: true, fitPadding })
    } else {
      const cy = cyRef.current
      for (const id of NETWORK_STRUCTURE.hidden) {
        const neuron = hiddenValuesMap.get(id)
        const node = cy.getElementById(id)
        if (node.length > 0) {
          const needsWarn = neuron?.needsRecalculation === true
          const outputValue =
            needsWarn || (neuron?.outputValidated ?? false)
              ? (neuron?.calculatedOutput ?? 0)
              : 0
          const isValidated = (neuron?.outputValidated ?? false) && !needsWarn
          const label = needsWarn
            ? `⚠️ Neurone ${id}\n${outputValue}`
            : isValidated
              ? `Neurone ${id}\n${outputValue}`
              : `Neurone ${id}`
          node.data('label', label)
          node.data('validated', isValidated)
          node.data('warning', needsWarn ? 'true' : 'false')
          node.data('value', outputValue)
        }
      }
      for (const id of NETWORK_STRUCTURE.output) {
        const neuron = outputValuesMap.get(id)
        const node = cy.getElementById(id)
        const digit =
          neuron?.digit ??
          (parseInt(id.replace('NEURONE', ''), 10) || 0)
        if (node.length > 0) {
          const needsWarn = neuron?.needsRecalculation === true
          const outputValue =
            needsWarn || (neuron?.outputValidated ?? false)
              ? (neuron?.calculatedOutput ?? 0)
              : 0
          const isValidated = (neuron?.outputValidated ?? false) && !needsWarn
          const label = needsWarn
            ? `⚠️ Neurone ${digit}\n${outputValue}`
            : isValidated
              ? `Neurone ${digit}\n${outputValue}`
              : `Neurone ${digit}`
          node.data('label', label)
          node.data('validated', isValidated)
          node.data('warning', needsWarn ? 'true' : 'false')
          node.data('value', outputValue)
          node.data('locked', !allHiddenValidated)
        }
        const verdictNode = cy.getElementById(`${id}_VERDICT`)
        if (verdictNode.length > 0) {
          let label = ''
          let outcome: VerdictOutcome = 'loser'
          const isValidated = neuron?.outputValidated ?? false
          if (isValidated && allOutputsValidated) {
            const activation = neuron?.calculatedOutput ?? 0
            const labelText = getOutputVerdictLabel(digit, networkDecision, {
              allOutputsValidated: true,
              neuronValidated: true,
              activation,
              labelStyle: 'compact',
            })
            outcome = getOutputVerdictOutcome(digit, networkDecision, {
              allOutputsValidated: true,
              neuronValidated: true,
              activation,
            })
            label = labelText ?? ''
          }
          verdictNode.data('label', label)
          verdictNode.data('outcome', outcome)
          verdictNode.data('digit', digit)
          verdictNode.data('value', neuron?.calculatedOutput ?? 0)
        }
      }
      if (showIntegrated) {
        const integratedPositions: Record<string, { x: number; y: number }> = {
          [GRID_NODE_ID]: geo.gridPosition,
          [FLOW_ANCHOR_BEFORE_INPUT]: geo.flowBeforeInput,
          [FLOW_ANCHOR_NETWORK_EXIT]: geo.networkExit,
          [DECISION_NODE_ID]: geo.decision,
        }
        if (!geo.isPortrait) {
          integratedPositions[FLOW_ANCHOR_AFTER_GRID] = geo.flowAfterGrid
        }
        for (const [nodeId, position] of Object.entries(integratedPositions)) {
          const layoutNode = cy.getElementById(nodeId)
          if (layoutNode.length > 0) layoutNode.position(position)
        }
        for (const [index, id] of NETWORK_STRUCTURE.output.entries()) {
          const verdictNode = cy.getElementById(`${id}_VERDICT`)
          if (verdictNode.length > 0) {
            verdictNode.position(geo.verdictPosition(index))
            verdictNode.data('layout', verdictLayout)
          }
        }
        const gridNodeEl = cy.getElementById(GRID_NODE_ID)
        if (gridNodeEl.length > 0 && pattern) {
          gridNodeEl.data('image', patternToGridDataUrl(pattern))
        }
        const nextDecision = buildDecisionNodeData(
          allOutputsValidated,
          networkDecision
        )
        const decisionNodeEl = cy.getElementById(DECISION_NODE_ID)
        if (decisionNodeEl.length > 0) {
          decisionNodeEl.data('label', nextDecision.label)
          decisionNodeEl.data('outcome', nextDecision.outcome)
        }
        const networkToDecisionEdge = cy.getElementById('FLOW-NETWORK-TO-DECISION')
        if (networkToDecisionEdge.length === 0) {
          cy.add({
            group: 'edges',
            data: {
              id: 'FLOW-NETWORK-TO-DECISION',
              source: FLOW_ANCHOR_NETWORK_EXIT,
              target: DECISION_NODE_ID,
              flow: 'true',
            },
          })
        }
        const lig2FlowEdge = cy.getElementById('FLOW-INPUT-TO-NETWORK')
        if (lig2FlowEdge.length > 0) lig2FlowEdge.remove()
      }
      for (const edge of allEdges) {
        const edgeElement = cy.getElementById(edge.data.id)
        if (edgeElement.length > 0) {
          if ('flow' in edge.data && edge.data.flow === 'true') continue
          const sourceNode = cy.getElementById(edge.data.source)
          if (sourceNode.length > 0) {
            const sourceValue = sourceNode.data('value') ?? 0
            const opacity = Math.min(0.8, 0.2 + (sourceValue / 20) * 0.6)
            const width = Math.max(1, 2 + (sourceValue / 20) * 3)
            edgeElement.style('opacity', opacity)
            edgeElement.style('width', width)
          }
        }
      }
      requestAnimationFrame(() => {
        reflowCytoscapeGraph(cy, { fit: false })
      })
    }
  }, [
    inputNeurons,
    hiddenNeurons,
    outputNeurons,
    onNeuronClick,
    pattern,
    usePortraitFlow,
    viewportTier,
    fitPadding,
  ])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const refitGraph = () => {
      if (!cyRef.current) return
      reflowCytoscapeGraph(cyRef.current, {
        fit: true,
        fitPadding: resolveFitPadding(usePortraitFlow, viewportTier),
      })
    }

    const observer = new ResizeObserver(refitGraph)
    observer.observe(container)
    window.addEventListener('resize', refitGraph)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', refitGraph)
    }
  }, [usePortraitFlow, viewportTier])

  return (
    <section className="bg-white border-2 border-grey rounded-2xl p-4 sm:p-6 min-[1800px]:p-8 shadow-sm animate-fade-in-up">
      <h2 className="text-darkBlue text-2xl min-[1800px]:text-3xl font-bold tracking-wide mb-4 min-[1800px]:mb-6 text-center">
        {pattern != null
          ? 'De la grille au réseau'
          : 'Réseau de neurones'}
      </h2>
      <div className="space-y-4 min-[1800px]:space-y-6">
        <p className="text-astro text-center text-base min-[1800px]:text-lg font-medium leading-relaxed">
          {pattern != null
            ? 'Suivez le parcours : grille dessinée, comptage des pixels, calculs des neurones, puis décision finale.'
            : 'Cliquez sur un neurone caché (A-F) puis de sortie (0, 3, 6, 9) pour effectuer les calculs. Les neurones validés apparaissent en vert avec leur valeur de sortie.'}
        </p>
        <div
          ref={containerRef}
          className={[
            'w-full border-2 border-grey rounded-xl bg-gray-50',
            usePortraitFlow
              ? viewportTier === 'narrow'
                ? 'h-[680px]'
                : viewportTier === 'compact'
                  ? 'h-[800px]'
                  : 'h-[920px]'
              : viewportTier === 'narrow'
                ? 'h-[280px]'
                : viewportTier === 'compact'
                  ? 'h-[340px]'
                  : 'h-[420px] lg:h-[480px] xl:h-[540px] min-[1800px]:h-[700px]',
          ].join(' ')}
        />
        {!allHiddenValidated && (
          <div className="space-y-3">
            <p className="text-astro text-center text-sm font-medium">
              Validez d’abord tous les neurones cachés (A à F) pour débloquer les
              neurones de sortie (0, 3, 6, 9).
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onAutoCalculateHidden}
                className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white border-2 border-blue hover:bg-blue-hover transition-colors"
              >
                Calculer neurones cachés
              </button>
              <button
                type="button"
                onClick={onAutoCalculateOutput}
                disabled={!allHiddenValidated}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-semibold border-2 transition-colors',
                  allHiddenValidated
                    ? 'bg-blue text-white border-blue hover:bg-blue-hover'
                    : 'bg-white text-blue border-blue/30 opacity-50 cursor-not-allowed',
                ].join(' ')}
              >
                Calculer neurones de sortie
              </button>
            </div>
          </div>
        )}
        {allHiddenValidated && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onAutoCalculateOutput}
              disabled={allOutputsValidated}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold border-2 transition-colors',
                allOutputsValidated
                  ? 'bg-white text-blue border-blue/30 opacity-50 cursor-not-allowed'
                  : 'bg-blue text-white border-blue hover:bg-blue-hover',
              ].join(' ')}
            >
              Calculer neurones de sortie
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default NetworkVisualization
