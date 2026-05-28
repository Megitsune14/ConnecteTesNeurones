import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGrandPublicActivity } from './useGrandPublicActivity'
import NeuronPanel from './NeuronPanel'
import DigitSelectionStep from './steps/DigitSelectionStep'
import GridDivisionStep from './steps/GridDivisionStep'
import PixelCountingStep from './steps/PixelCountingStep'
import NetworkInteractionStep from './steps/NetworkInteractionStep'

const GrandPublicActivity = () => {
  const navigate = useNavigate()
  const {
    currentStep,
    setCurrentStep,
    selectedDigit,
    userCounts,
    inputLayerNeurons,
    hiddenNeurons,
    outputNeurons,
    activeNeuronId,
    setActiveNeuronId,
    finalDecision,
    validateDigitGrid,
    updateUserCount,
    allCountsEntered,
    computeInputs,
    autoCalculateHiddenNeurons,
    autoCalculateOutputNeurons,
    handleValidateSum,
    handleValidateOutput,
    handleReturnToPhase1,
    handleUpdateSumInput,
    handleUpdateOutputInput,
    resetToDigitSelection,
    goBack,
    activeNeuron,
    userDrawnGrid,
    loadDigitExample,
    applySeuilThreshold,
  } = useGrandPublicActivity()

  const [openExampleDigit, setOpenExampleDigit] = useState<number | null>(null)

  const handleRetour = () => {
    if (currentStep === 'digit-selection') {
      navigate('/')
    } else {
      goBack()
    }
  }

  return (
    <div className="relative w-full min-h-0 bg-gray-100 overflow-auto font-sans">
      {/* Sidebar fixe à gauche : uniquement à l'étape sélection du chiffre */}
      {currentStep === 'digit-selection' && (
        <div className="max-md:px-4 max-md:pt-4 md:contents">
        <aside
          className="z-10 flex flex-col items-center gap-3 border border-grey bg-white shadow-sm max-md:relative max-md:mb-4 max-md:w-full max-md:rounded-xl max-md:p-4 md:fixed md:left-0 md:top-24 md:w-24 md:rounded-r-xl md:border-l-0 md:py-6 md:pr-4 md:pl-3"
          aria-label="Chiffres disponibles"
        >
          <h3 className="text-darkBlue text-sm font-semibold tracking-wide text-center max-md:text-base">
            Chiffres disponibles
          </h3>
          <div className="flex flex-col gap-2 max-md:w-full max-md:flex-row max-md:flex-wrap max-md:justify-center">
            {([0, 3, 6, 9] as const).map((digit) => (
              <div
                key={digit}
                className="flex flex-col items-center"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenExampleDigit(
                      openExampleDigit === digit ? null : digit
                    )
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-grey bg-grey/30 text-darkBlue text-lg font-bold select-none hover:border-blue/60 hover:bg-blue/10 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={openExampleDigit === digit}
                >
                  {digit}
                </button>
                {openExampleDigit === digit && (
                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        loadDigitExample(digit, 'perfect')
                        setOpenExampleDigit(null)
                      }}
                      className="text-xs px-2 py-1 rounded border border-grey bg-white text-darkBlue hover:bg-blue/10 transition-colors whitespace-nowrap"
                    >
                      Parfait
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loadDigitExample(digit, 'good')
                        setOpenExampleDigit(null)
                      }}
                      className="text-xs px-2 py-1 rounded border border-grey bg-white text-darkBlue hover:bg-blue/10 transition-colors whitespace-nowrap"
                    >
                      Bien dessiné
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
        </div>
      )}
      <div
        className={`relative z-[2] min-w-0 px-4 pt-6 pb-12 sm:px-6 sm:pt-10 md:px-8 md:pt-12 mx-auto ${
          currentStep === 'network-interaction' ? 'max-w-full xl:max-w-[96vw]' : 'max-w-7xl'
        } ${currentStep === 'digit-selection' ? 'md:pl-28' : ''}`}
      >
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-darkBlue text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-wide mb-4 drop-shadow-sm">
            Connecte tes neurones
          </h1>
          <div className="w-[200px] h-0.5 mx-auto bg-gradient-accent rounded" />
        </div>
        <div className="space-y-8">
          {currentStep === 'digit-selection' && (
            <DigitSelectionStep
              onValidateGrid={validateDigitGrid}
              initialGrid={userDrawnGrid ?? undefined}
            />
          )}
          {currentStep === 'grid-division' && userDrawnGrid != null && (
            <GridDivisionStep
              pattern={userDrawnGrid}
              onNext={() => setCurrentStep('pixel-counting')}
            />
          )}
          {currentStep === 'pixel-counting' && userDrawnGrid != null && (
            <PixelCountingStep
              pattern={userDrawnGrid}
              userCounts={userCounts}
              onUpdateCount={updateUserCount}
              allCountsEntered={allCountsEntered}
              onProceed={computeInputs}
            />
          )}
          {currentStep === 'network-interaction' && (
            <NetworkInteractionStep
              pattern={userDrawnGrid}
              inputNeurons={inputLayerNeurons}
              hiddenNeurons={hiddenNeurons}
              outputNeurons={outputNeurons}
              onNeuronClick={setActiveNeuronId}
              onAutoCalculateHidden={autoCalculateHiddenNeurons}
              onAutoCalculateOutput={autoCalculateOutputNeurons}
              finalDecision={finalDecision}
              selectedDigit={selectedDigit}
              onReset={resetToDigitSelection}
              onApplySeuilThreshold={applySeuilThreshold}
            />
          )}
          {activeNeuronId != null && activeNeuron != null && (
            <NeuronPanel
              neuronId={activeNeuronId}
              neuron={activeNeuron}
              inputNeurons={inputLayerNeurons}
              hiddenNeurons={hiddenNeurons}
              onClose={() => setActiveNeuronId(null)}
              onValidateSum={handleValidateSum}
              onValidateOutput={handleValidateOutput}
              onReturnToPhase1={handleReturnToPhase1}
              onUpdateSumInput={handleUpdateSumInput}
              onUpdateOutputInput={handleUpdateOutputInput}
            />
          )}
        </div>
        <div className="mt-10 text-center">
          <button
            onClick={handleRetour}
            className="text-astro hover:text-blue transition-colors duration-200 text-sm font-medium tracking-wide"
          >
            ← Retour
          </button>
        </div>
      </div>
    </div>
  )
}

export default GrandPublicActivity
