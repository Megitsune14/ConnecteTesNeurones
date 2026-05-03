import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isActivityOpenMobile, setIsActivityOpenMobile] = useState(false)
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
        setIsActivityOpenMobile(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsActivityOpenMobile(false)
  }, [location.pathname])

  const activityDropdown = (
    <div className="min-w-[200px] py-2 bg-white text-darkBlue rounded-lg shadow-xl border border-grey">
      <div className="px-4 py-2 text-sm font-semibold text-astro pointer-events-none">
        Mode Solo
      </div>
      <Link
        to="/solo/grand-public"
        className="block px-4 py-2 text-sm hover:bg-grey/50 hover:text-blue transition-colors text-darkBlue"
      >
        Grand Public
      </Link>
      <div className="px-4 py-2 text-sm text-astro/60 cursor-not-allowed" aria-disabled="true">
        Médiateur <span className="text-xs">(bientôt)</span>
      </div>
      <div className="my-1 border-t border-grey" />
      <div className="px-4 py-2 text-sm font-semibold text-astro pointer-events-none">
        Mode Multijoueur
      </div>
      <div className="px-4 py-2 text-sm text-astro/60 cursor-not-allowed" aria-disabled="true">
        Médiateur <span className="text-xs">(bientôt)</span>
      </div>
      <div className="px-4 py-2 text-sm text-astro/60 cursor-not-allowed" aria-disabled="true">
        Rejoindre <span className="text-xs">(bientôt)</span>
      </div>
    </div>
  )

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-darkBlue/20 navbar-gradient text-white shadow-sm">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 md:px-8 md:py-4">
        {/* Mobile: Hamburger + Logo */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lightBlue/60 transition-colors"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label="Ouvrir le menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span
              className={`block h-0.5 w-5 bg-white transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : 'mb-1.5'}`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition-all ${isMobileMenuOpen ? 'opacity-0' : 'mb-1.5'}`}
            />
            <span
              className={`block h-0.5 w-5 bg-white transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
            />
          </button>
          <Link to="/" className="text-base font-semibold text-white">
            Connecte tes neurones
          </Link>
        </div>

        {/* Desktop: Left Nav */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <Link
            to="/"
            className="text-lg font-medium hover:text-lightBlue transition-colors"
          >
            Accueil
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setIsActivityDropdownOpen(true)}
            onMouseLeave={() => setIsActivityDropdownOpen(false)}
          >
            <button
              type="button"
              className="text-lg font-medium hover:text-lightBlue transition-colors flex items-center gap-1"
              aria-expanded={isActivityDropdownOpen}
              aria-haspopup="true"
            >
              Activité
              <span
                className={`inline-block transition-transform ${isActivityDropdownOpen ? 'rotate-180' : ''}`}
              >
                ▾
              </span>
            </button>
            {isActivityDropdownOpen && (
              <div className="absolute left-0 top-full pt-2">
                {activityDropdown}
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Center Title */}
        <div className="hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2">
          <Link to="/" className="text-lg font-semibold text-white">
            Connecte tes neurones
          </Link>
        </div>
      </div>

      {/* Mobile panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 navbar-gradient">
          <div className="px-4 py-4">
            <div className="flex flex-col gap-1">
              <Link
                to="/"
                className="py-2.5 text-lg font-medium hover:text-lightBlue transition-colors"
              >
                Accueil
              </Link>
              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-2.5 text-lg font-medium hover:text-lightBlue transition-colors"
                  onClick={() => setIsActivityOpenMobile((v) => !v)}
                  aria-expanded={isActivityOpenMobile}
                >
                  Activité
                  <span
                    className={`transition-transform ${isActivityOpenMobile ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </button>
                {isActivityOpenMobile && (
                  <div className="pl-4 pb-2 flex flex-col gap-1 border-l-2 border-white/20 ml-2">
                    <span className="py-1.5 text-sm font-semibold text-white/80">
                      Mode Solo
                    </span>
                    <Link
                      to="/solo/grand-public"
                      className="py-1.5 text-sm hover:text-lightBlue transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Grand Public
                    </Link>
                    <span className="py-1.5 text-sm text-white/50">
                      Médiateur (bientôt)
                    </span>
                    <span className="pt-2 text-sm font-semibold text-white/80">
                      Mode Multijoueur
                    </span>
                    <span className="py-1.5 text-sm text-white/50">
                      Médiateur (bientôt)
                    </span>
                    <span className="py-1.5 text-sm text-white/50">
                      Rejoindre (bientôt)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
