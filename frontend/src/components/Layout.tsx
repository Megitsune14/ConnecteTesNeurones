import { Outlet } from 'react-router-dom'
import { Navbar, Footer } from './Navigation'

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
