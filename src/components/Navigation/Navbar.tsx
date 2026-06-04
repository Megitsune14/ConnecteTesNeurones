import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-darkBlue/20 navbar-gradient text-white shadow-sm">
      <div className="mx-auto flex max-w-screen-2xl items-center px-4 py-3 sm:px-6 md:px-8 md:py-4">
        <div className="flex flex-1 items-center justify-start">
          <Link
            to="/"
            className="text-base font-medium hover:text-lightBlue transition-colors md:text-lg"
          >
            Accueil
          </Link>
        </div>

        <div className="flex shrink-0 items-center justify-center px-2 sm:px-4">
          <Link
            to="/"
            className="text-center text-sm font-semibold text-white sm:text-base md:text-lg"
          >
            Connecte tes neurones
          </Link>
        </div>

        <div className="flex-1" aria-hidden="true" />
      </div>
    </nav>
  )
}

export default Navbar
