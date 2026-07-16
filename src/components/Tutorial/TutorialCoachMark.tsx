import { createPortal } from 'react-dom'
import { useTutorial } from '../../context/TutorialContext'
import { Button } from '../ui'
import { TUTORIAL_MESSAGES, type TutorialStepKey } from './tutorialContent'

interface TutorialCoachMarkProps {
  step: TutorialStepKey
}

const TutorialCoachMark = ({ step }: TutorialCoachMarkProps) => {
  const { tutorialEnabled, isStepDismissed, dismissTutorialStep } = useTutorial()

  if (!tutorialEnabled || isStepDismissed(step)) return null

  const message = TUTORIAL_MESSAGES[step]

  return createPortal(
    <div
      className="fixed top-24 right-6 z-40 w-[min(calc(100vw-3rem),22rem)] animate-fade-in-up"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border-2 border-blue bg-white p-4 shadow-lg sm:p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue">
          Tutoriel
        </p>
        <p className="mb-4 text-astro text-sm font-medium leading-relaxed sm:text-base">
          {message}
        </p>
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => dismissTutorialStep(step)}
        >
          J&apos;ai compris
        </Button>
      </div>
    </div>,
    document.body
  )
}

export default TutorialCoachMark
