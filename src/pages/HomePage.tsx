import { Link } from 'react-router-dom'
import { Section } from '../components/ui'

const HomePage = () => {
  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 md:px-8">
      <Section className="mt-0">
        <h2 className="text-darkBlue mb-4 text-2xl font-semibold tracking-wide">
          Qu’est-ce que l’activité ?
        </h2>
        <div className="text-astro space-y-4 text-base font-medium leading-relaxed">
          <p>
            <strong className="text-darkBlue">Connecte tes neurones</strong> est
            une activité interactive pour comprendre, pas à pas, comment un
            réseau de neurones peut reconnaître un chiffre dessiné à la main.
          </p>
          <p>
            Vous tracez un chiffre sur une grille, vous observez comment
            l’image est découpée en colonnes et en lignes, puis vous
            alimentez un petit réseau en comptant les pixels et en calculant
            les activations. À la fin, le réseau « décide » entre les chiffres{' '}
            <strong className="text-darkBlue">0, 3, 6 et 9</strong>.
          </p>
          <p>
            Aucune formule magique : vous reproduisez vous-même les sommes et
            les seuils pour voir comment l’information circule d’une couche à
            l’autre.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to="/game"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue px-8 py-3.5 text-lg font-semibold text-white shadow transition hover:bg-blue-hover focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            Jouer
          </Link>
        </div>
      </Section>
    </div>
  )
}

export default HomePage
