import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { HomePage } from './pages'
import Game from './components/Game'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="game" element={<Game />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
