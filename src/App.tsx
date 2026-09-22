import { HashRouter, Route, Routes } from 'react-router-dom'
import { Sidebar, ToastProvider } from './components/Shared'
import Resumen from './pages/Resumen'
import Socios from './pages/Socios'
import Aportes from './pages/Aportes'
import Prestamos from './pages/Prestamos'
import Gastos from './pages/Gastos'
import Utilidades from './pages/Utilidades'
import Proyeccion from './pages/Proyeccion'
import Config from './pages/Config'

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Routes>
              <Route path="/" element={<Resumen />} />
              <Route path="/socios" element={<Socios />} />
              <Route path="/socios/:id" element={<Socios />} />
              <Route path="/aportes" element={<Aportes />} />
              <Route path="/prestamos" element={<Prestamos />} />
              <Route path="/prestamos/:id" element={<Prestamos />} />
              <Route path="/gastos" element={<Gastos />} />
              <Route path="/utilidades" element={<Utilidades />} />
              <Route path="/proyeccion" element={<Proyeccion />} />
              <Route path="/config" element={<Config />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </ToastProvider>
  )
}
