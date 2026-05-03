import { Link } from 'react-router-dom'
import { Card, Section } from '../components/ui'

const HomePage = () => {
  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-10 sm:px-6 md:px-8">
      {/* Qu'est-ce que l'activité */}
      <Section className="mt-0">
        <h2 className="text-darkBlue mb-4 text-2xl font-semibold tracking-wide">
          Qu’est-ce que l’activité ?
        </h2>
        <p className="text-astro text-base font-medium leading-relaxed">
          ...
        </p>
      </Section>

      {/* Modes : Solo / Multiplayer */}
      <section className="mt-10">
        <h2 className="text-darkBlue mb-6 text-2xl font-semibold tracking-wide">
          Choisir un mode
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {/* Mode Solo */}
          <Card hover className="group flex flex-col">
            <div className="mb-3 text-3xl">🎯</div>
            <h3 className="text-darkBlue mb-2 text-lg font-semibold">
              Mode Solo
            </h3>
            <p className="text-astro mb-4 text-sm font-medium leading-relaxed">
              Médiateur : accès aux ressources et diapos pour animer la
              session. Grand Public : réalisez l’activité en explorant les
              visualisations.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <span className="text-astro inline-flex items-center rounded-lg border border-grey bg-grey/30 px-3 py-1.5 text-sm font-medium">
                Médiateur (bientôt)
              </span>
              <Link
                to="/solo/grand-public"
                className="inline-flex items-center justify-center rounded-xl bg-blue px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-hover focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                Grand Public
              </Link>
            </div>
          </Card>

          {/* Mode Multiplayer */}
          <Card hover className="group flex flex-col">
            <div className="mb-3 text-3xl">👥</div>
            <h3 className="text-darkBlue mb-2 text-lg font-semibold">
              Mode Multijoueur
            </h3>
            <p className="text-astro mb-4 text-sm font-medium leading-relaxed">
              Créez une session ou rejoignez une partie avec un code pour
              participer en temps réel.
            </p>
            <div className="mt-auto flex flex-wrap gap-2">
              <span className="text-astro inline-flex items-center rounded-lg border border-grey bg-grey/30 px-3 py-1.5 text-sm font-medium">
                Médiateur (bientôt)
              </span>
              <span className="text-astro inline-flex items-center rounded-lg border border-grey bg-grey/30 px-3 py-1.5 text-sm font-medium">
                Rejoindre (bientôt)
              </span>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default HomePage
