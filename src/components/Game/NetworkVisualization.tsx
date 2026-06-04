import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { NetworkVisualizationProps } from './types'
import { NETWORK_STRUCTURE } from './constants'
import {
  getOutputVerdictLabel,
  resolveWinningDigit,
  type OutputActivation,
} from './networkDecision'
import type { NeuronData } from './types'

const COLUMN_SPACING = 600
const NODE_SPACING = 140
const START_Y = 100

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
]

const NetworkVisualization = ({
  inputNeurons,
  hiddenNeurons,
  outputNeurons,
  onNeuronClick,
  onAutoCalculateHidden,
  onAutoCalculateOutput,
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

  const winningDigit = resolveWinningDigit(
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
      let outcome: 'winner' | 'loser' = 'loser'

      if (isValidated && allOutputsValidated) {
        const labelText = getOutputVerdictLabel(digit, winningDigit, {
          allOutputsValidated: true,
          neuronValidated: true,
        })
        const isWinner = winningDigit !== null && digit === winningDigit
        outcome = isWinner ? 'winner' : 'loser'
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
    const nodes = [...inputNodes, ...hiddenNodes, ...outputNodes, ...outputVerdictNodes]

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
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
          let outcome: 'winner' | 'loser' = 'loser'
          const isValidated = neuron?.outputValidated ?? false
          if (isValidated && allOutputsValidated) {
            const labelText = getOutputVerdictLabel(digit, winningDigit, {
              allOutputsValidated: true,
              neuronValidated: true,
            })
            const isWinner = winningDigit !== null && digit === winningDigit
            outcome = isWinner ? 'winner' : 'loser'
            label = labelText ?? ''
          }
          verdictNode.data('label', label)
          verdictNode.data('outcome', outcome)
          verdictNode.data('digit', digit)
          verdictNode.data('value', neuron?.calculatedOutput ?? 0)
        }
      }
      for (const edge of edges) {
        const edgeElement = cy.getElementById(edge.data.id)
        if (edgeElement.length > 0) {
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
  }, [inputNeurons, hiddenNeurons, outputNeurons, onNeuronClick])

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
        Réseau de neurones
      </h2>
      <div className="space-y-4 min-[1800px]:space-y-6">
        <p className="text-astro text-center text-base min-[1800px]:text-lg font-medium leading-relaxed">
          Cliquez sur un neurone caché (A-F) puis de sortie (0, 3, 6, 9) pour
          effectuer les calculs. Les neurones validés apparaissent en vert avec
          leur valeur de sortie.
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
