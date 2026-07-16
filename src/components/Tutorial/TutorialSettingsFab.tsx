import { useState } from 'react'
import { useTutorial } from '../../context/TutorialContext'

const GearIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden
  >
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

const TutorialSettingsFab = () => {
  const { tutorialEnabled, setTutorialEnabled } = useTutorial()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-56 rounded-xl border-2 border-grey bg-white p-4 shadow-lg animate-fade-in-up">
          <p className="mb-3 text-sm font-semibold text-darkBlue">Paramètres</p>
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
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue bg-white text-blue shadow-md transition-colors hover:bg-blue/10 focus:outline-none focus:ring-2 focus:ring-blue/40"
        aria-label={open ? 'Fermer les paramètres' : 'Ouvrir les paramètres'}
        aria-expanded={open}
      >
        <GearIcon />
      </button>
    </div>
  )
}

export default TutorialSettingsFab
