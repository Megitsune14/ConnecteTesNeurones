import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { HomePage } from './pages'
import GrandPublicActivity from './components/GrandPublicActivity'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="solo/grand-public" element={<GrandPublicActivity />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
