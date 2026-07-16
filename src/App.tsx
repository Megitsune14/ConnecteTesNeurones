import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { TutorialProvider } from './context/TutorialContext'
import { HomePage } from './pages'
import Game from './components/Game'

function App() {
  return (
    <TutorialProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="game" element={<Game />} />
          </Route>
        </Routes>
      </div>
    </TutorialProvider>
  )
}

export default App
