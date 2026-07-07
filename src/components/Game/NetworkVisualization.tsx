import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { NetworkVisualizationProps } from './types'
import { NETWORK_STRUCTURE } from './constants'
import {
  getOutputVerdictLabel,
  getOutputVerdictOutcome,
  resolveNetworkDecision,
  type OutputActivation,
  type VerdictOutcome,
} from './networkDecision'
import type { NeuronData } from './types'

const COLUMN_SPACING = 600
const NODE_SPACING = 140
const START_Y = 100
const GRID_COLUMN = -720
const DECISION_COLUMN = COLUMN_SPACING * 2 + 420
const GRID_NODE_ID = 'START_GRID'
const DECISION_NODE_ID = 'FINAL_DECISION'
const FLOW_ANCHOR_AFTER_GRID = 'FLOW_ANCHOR_AFTER_GRID'
const FLOW_ANCHOR_BEFORE_DECISION = 'FLOW_ANCHOR_BEFORE_DECISION'

function patternToGridDataUrl(pattern: number[][]): string {
  const cellPx = 7
  const sepPx = 2
  const groupW = cellPx * 2 + sepPx
  const groupH = cellPx * 3 + sepPx
  const width = groupW * 3 - sepPx
  const height = groupH * 3 - sepPx

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#EBEBEC'
  ctx.fillRect(0, 0, width, height)

  for (let ligGroup = 0; ligGroup < 3; ligGroup++) {
    for (let ligRow = 0; ligRow < 3; ligRow++) {
      for (let colGroup = 0; colGroup < 3; colGroup++) {
        for (let colCol = 0; colCol < 2; colCol++) {
          const gridRow = ligGroup * 3 + ligRow
          const gridCol = colGroup * 2 + colCol
          const x = colGroup * groupW + colCol * cellPx
          const y = ligGroup * groupH + ligRow * cellPx
          if (pattern[gridRow]?.[gridCol] === 1) {
            ctx.fillStyle = '#000'
            ctx.fillRect(x, y, cellPx, cellPx)
          }
        }
      }
    }
  }

  ctx.fillStyle = '#DC143C'
  ctx.fillRect(groupW, 0, sepPx, height)
  ctx.fillRect(groupW * 2, 0, sepPx, height)

  ctx.fillStyle = '#F9BB12'
  ctx.fillRect(0, groupH, width, sepPx)
  ctx.fillRect(0, groupH * 2, width, sepPx)

  return canvas.toDataURL()
}

function buildDecisionNodeData(
  allOutputsValidated: boolean,
  finalDecision: number | null | undefined,
  selectedDigit: number | null | undefined
): { label: string; outcome: string } {
  if (!allOutputsValidated) {
    return {
      label: 'Décision finale\n\nValidez les neurones\nde sortie',
      outcome: 'pending',
    }
  }
  if (finalDecision == null) {
    return {
      label: 'Décision finale\n\nAucun chiffre\nreconnu',
      outcome: 'none',
    }
  }
  if (finalDecision === selectedDigit) {
    return {
      label: `Décision finale\n\n${finalDecision}\n\n✓ Reconnaissance\nréussie !`,
      outcome: 'success',
    }
  }
  return {
    label: `Décision finale\n\n${finalDecision}\n\n✗ Erreur :\n${selectedDigit} → ${finalDecision}`,
    outcome: 'error',
  }
}

const CYTOSCAPE_STYLE = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      width: 180,
      height: 120,
      shape: 'round-rectangle',
      'border-width': 2,
      'text-valign': 'center',
      'text-halign': 'center',
      color: '#1A182D',
      'font-size': '22px',
      'text-wrap': 'wrap',
      'text-max-width': '110px',
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
      'font-size': '22px',
      'text-wrap': 'wrap',
      'text-max-width': '260px',
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
      width: 200,
      height: 260,
      shape: 'round-rectangle',
      'background-color': '#F9FAFB',
      'border-width': 2,
      'border-color': '#EBEBEC',
      'background-image': 'data(image)',
      'background-fit': 'contain',
      'background-width': '88%',
      'background-height': '72%',
      'background-position-y': '58%',
      label: 'data(label)',
      'font-size': '16px',
      'font-weight': 'bold',
      'text-valign': 'top',
      'text-margin-y': 10,
      color: '#1A182D',
    },
  },
  {
    selector: 'node[type = "decision"]',
    style: {
      width: 210,
      height: 200,
      shape: 'round-rectangle',
      'background-color': '#fff',
      'border-width': 3,
      'border-color': '#24A1EB',
      label: 'data(label)',
      'font-size': '17px',
      'font-weight': 'bold',
      'text-wrap': 'wrap',
      'text-max-width': '180px',
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
      'font-size': '15px',
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
      width: 2.5,
      'line-style': 'solid',
      'line-color': '#9CA3AF',
      opacity: 0.55,
      'target-arrow-color': '#9CA3AF',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.4,
      'curve-style': 'straight',
    },
  },
]

const NetworkVisualization = ({
  inputNeurons,
  hiddenNeurons,
  outputNeurons,
  onNeuronClick,
  onAutoCalculateHidden,
  onAutoCalculateOutput,
  pattern = null,
  finalDecision = null,
  selectedDigit = null,
}: NetworkVisualizationProps) => {
  const cyRef = useRef<cytoscape.Core | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const outputNeuronsClickableRef = useRef(false)

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
          },
          position: { x: 0, y: START_Y + index * NODE_SPACING },
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
          },
          position: {
            x: 0,
            y: START_Y + (3 + index) * NODE_SPACING,
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
        },
        position: {
          x: COLUMN_SPACING,
          y: START_Y + index * NODE_SPACING,
        },
        locked: true,
      }
    })

    const outputStartY = START_Y + ((6 - 4) / 2) * NODE_SPACING
    const integratedCenterY = START_Y + (2.5 * NODE_SPACING)
    const showIntegrated = pattern != null

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
            position: { x: GRID_COLUMN, y: integratedCenterY },
            locked: true,
          },
        ]
      : []

    const decisionData = buildDecisionNodeData(
      allOutputsValidated,
      finalDecision,
      selectedDigit
    )
    const decisionNode = showIntegrated
      ? [
          {
            data: {
              id: FLOW_ANCHOR_AFTER_GRID,
              type: 'flow-anchor',
              layer: 'flow',
            },
            position: { x: GRID_COLUMN / 2, y: integratedCenterY },
            locked: true,
          },
          {
            data: {
              id: FLOW_ANCHOR_BEFORE_DECISION,
              type: 'flow-anchor',
              layer: 'flow',
            },
            position: {
              x: COLUMN_SPACING * 2 + 260,
              y: outputStartY + 1.5 * NODE_SPACING,
            },
            locked: true,
          },
          {
            data: {
              id: DECISION_NODE_ID,
              label: decisionData.label,
              type: 'decision',
              layer: 'decision',
              outcome: decisionData.outcome,
            },
            position: {
              x: DECISION_COLUMN,
              y: outputStartY + 1.5 * NODE_SPACING,
            },
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
        },
        position: {
          x: COLUMN_SPACING * 2,
          y: outputStartY + index * NODE_SPACING,
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
        },
        position: {
          x: COLUMN_SPACING * 2 + 320,
          y: outputStartY + index * NODE_SPACING,
        },
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
      ? [
          {
            data: {
              id: 'FLOW-GRID-TO-NETWORK',
              source: GRID_NODE_ID,
              target: FLOW_ANCHOR_AFTER_GRID,
              flow: 'true',
            },
          },
          {
            data: {
              id: 'FLOW-NETWORK-TO-DECISION',
              source: FLOW_ANCHOR_BEFORE_DECISION,
              target: DECISION_NODE_ID,
              flow: 'true',
            },
          },
        ]
      : []
    const nodes = [
      ...gridNode,
      ...inputNodes,
      ...hiddenNodes,
      ...outputNodes,
      ...outputVerdictNodes,
      ...decisionNode,
    ]
    const allEdges = [...edges, ...flowEdges]

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

      cyRef.current.fit(undefined, 40)
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
        const gridNodeEl = cy.getElementById(GRID_NODE_ID)
        if (gridNodeEl.length > 0 && pattern) {
          gridNodeEl.data('image', patternToGridDataUrl(pattern))
        }
        const nextDecision = buildDecisionNodeData(
          allOutputsValidated,
          finalDecision,
          selectedDigit
        )
        const decisionNodeEl = cy.getElementById(DECISION_NODE_ID)
        if (decisionNodeEl.length > 0) {
          decisionNodeEl.data('label', nextDecision.label)
          decisionNodeEl.data('outcome', nextDecision.outcome)
        }
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
      cy.style().update()
    }
  }, [
    inputNeurons,
    hiddenNeurons,
    outputNeurons,
    onNeuronClick,
    pattern,
    finalDecision,
    selectedDigit,
  ])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const refitGraph = () => {
      if (!cyRef.current) return
      cyRef.current.resize()
      cyRef.current.fit(undefined, 40)
    }

    const observer = new ResizeObserver(refitGraph)
    observer.observe(container)
    window.addEventListener('resize', refitGraph)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', refitGraph)
    }
  }, [])

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
          className="w-full h-[420px] lg:h-[480px] xl:h-[540px] min-[1800px]:h-[700px] border-2 border-grey rounded-xl bg-gray-50"
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
