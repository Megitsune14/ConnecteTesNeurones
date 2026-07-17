import { useState } from 'react'
import { useTutorial } from '../../context/TutorialContext'

const TutorialSettingsFab = () => {
  const { tutorialEnabled, setTutorialEnabled } = useTutorial()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-56 rounded-xl border-2 border-grey bg-white p-4 shadow-lg animate-fade-in-up">
          <p className="mb-3 text-sm font-semibold text-darkBlue">Tutoriel</p>
          <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-astro">
            <input
              type="checkbox"
              checked={tutorialEnabled}
              onChange={(event) => setTutorialEnabled(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue"
            />
            <span>Activer le tutoriel</span>
          </label>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          'flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue/40',
          tutorialEnabled
            ? 'border-blue text-blue hover:bg-blue/10'
            : 'border-grey text-astro hover:bg-grey/20',
        ].join(' ')}
        aria-label={
          open
            ? 'Fermer le tutoriel'
            : tutorialEnabled
              ? 'Tutoriel activé — ouvrir les options'
              : 'Tutoriel désactivé — ouvrir les options'
        }
        aria-expanded={open}
      >
        <span
          className={`text-2xl leading-none ${tutorialEnabled ? '' : 'opacity-50 grayscale'}`}
          aria-hidden
        >
          📜
        </span>
      </button>
    </div>
  )
}

export default TutorialSettingsFab
