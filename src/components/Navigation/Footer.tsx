const Footer = () => {
  return (
    <footer className="mt-auto border-t border-darkBlue/20 navbar-gradient text-white">
      <div className="mx-auto max-w-screen-xl px-4 py-6 text-center text-sm sm:px-6 md:px-8">
        © {new Date().getFullYear()} Connecte tes neurones. Tous droits réservés.
      </div>
    </footer>
  )
}

export default Footer
