import { Link } from 'react-router-dom'
import { Section } from '../components/ui'
import { useTutorial } from '../context/TutorialContext'
import logoMmi from '../assets/logo_mmi.png'

const MMI_URL = 'https://mmi.universite-lyon.fr/'
const ATELIER_URL =
  'https://mmi.universite-lyon.fr/pour-les-scolaires/ressources-pedagogiques-et-de-mediation/connecte-tes-neurones-385696.kjsp'

const HomePage = () => {
  const { tutorialEnabled, setTutorialEnabled } = useTutorial()

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 md:px-8">
      <Section className="mt-0">
        <h2 className="text-darkBlue mb-4 text-2xl font-semibold tracking-wide">
          Qu’est-ce que l’activité ?
        </h2>
        <div className="text-astro space-y-4 text-base font-medium leading-relaxed">
          <p>
            <strong className="text-darkBlue">Connecte tes neurones</strong> est
            un atelier de la MMI pour comprendre, pas à pas, comment un réseau
            reconnaît un chiffre dessiné à la main (
            <strong className="text-darkBlue">0, 3, 6 ou 9</strong>).
          </p>
          <p>
            Vous dessinez sur une grille, comptez les pixels par bandelette,
            calculez vous-même les sommes et les seuils, puis suivez la décision
            du réseau, de la grille au verdict final. En mode apprentissage, vous
            ajustez les seuils pour affiner la reconnaissance.
          </p>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            to="/game"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue px-8 py-3.5 text-lg font-semibold text-white shadow transition hover:bg-blue-hover focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            Jouer
          </Link>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-astro">
            <input
              type="checkbox"
              checked={tutorialEnabled}
              onChange={(event) => setTutorialEnabled(event.target.checked)}
              className="h-4 w-4 accent-blue"
            />
            Activer le tutoriel
          </label>
        </div>
      </Section>

      <Section className="mt-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
          <a
            href={MMI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 rounded-xl border border-grey bg-white p-4 shadow-sm transition-opacity hover:opacity-90"
          >
            <img
              src={logoMmi}
              alt="Maison des mathématiques et de l'informatique"
              className="h-16 w-auto object-contain sm:h-20"
            />
          </a>
          <div className="text-astro text-center text-sm font-medium leading-relaxed sm:text-left sm:text-base">
            <p>
              Cet atelier{' '}
              <strong className="text-darkBlue">Connecte tes neurones</strong>{' '}
              a été créé et proposé par la{' '}
              <a
                href={MMI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue underline underline-offset-2 hover:text-blue-hover"
              >
                MMI
              </a>
              , Maison des mathématiques et de l&apos;informatique.
            </p>
            <p className="mt-2">
              <a
                href={ATELIER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue underline underline-offset-2 hover:text-blue-hover"
              >
                Voir la fiche atelier sur le site de la MMI
              </a>
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}

export default HomePage
