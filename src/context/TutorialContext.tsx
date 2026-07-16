import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TutorialStepKey } from '../components/Tutorial/tutorialContent'

const STORAGE_KEY = 'tutorialEnabled'

type TutorialContextValue = {
  tutorialEnabled: boolean
  setTutorialEnabled: (enabled: boolean) => void
  isStepDismissed: (step: TutorialStepKey) => boolean
  dismissTutorialStep: (step: TutorialStepKey) => void
}

const TutorialContext = createContext<TutorialContextValue | null>(null)

function loadTutorialEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [tutorialEnabled, setTutorialEnabledState] = useState(loadTutorialEnabled)
  const [dismissedSteps, setDismissedSteps] = useState<Set<TutorialStepKey>>(
    () => new Set()
  )

  const setTutorialEnabled = useCallback((enabled: boolean) => {
    setTutorialEnabledState(enabled)
    setDismissedSteps(new Set())
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      /* ignore */
    }
  }, [])

  const isStepDismissed = useCallback(
    (step: TutorialStepKey) => dismissedSteps.has(step),
    [dismissedSteps]
  )

  const dismissTutorialStep = useCallback((step: TutorialStepKey) => {
    setDismissedSteps((prev) => new Set(prev).add(step))
  }, [])

  const value = useMemo(
    () => ({
      tutorialEnabled,
      setTutorialEnabled,
      isStepDismissed,
      dismissTutorialStep,
    }),
    [tutorialEnabled, setTutorialEnabled, isStepDismissed, dismissTutorialStep]
  )

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  )
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext)
  if (ctx == null) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return ctx
}
