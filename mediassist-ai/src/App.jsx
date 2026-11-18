import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SearchPage from './pages/SearchPage.jsx'
import MedicineDetail from './pages/MedicineDetail.jsx'
import DiseaseDetail from './pages/DiseaseDetail.jsx'
import Interactions from './pages/Interactions.jsx'
import Assistant from './pages/Assistant.jsx'
import Compare from './pages/Compare.jsx'
import Analytics from './pages/Analytics.jsx'
import Favourites from './pages/Favourites.jsx'
import About from './pages/About.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="medicine/:id" element={<MedicineDetail />} />
        <Route path="disease/:slug" element={<DiseaseDetail />} />
        <Route path="interactions" element={<Interactions />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="compare" element={<Compare />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="favourites" element={<Favourites />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}
