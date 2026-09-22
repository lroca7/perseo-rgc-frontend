import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// vite-plugin-pwa registra el service worker automáticamente en el build de producción
// (registerType: 'autoUpdate' en vite.config.ts) — no se necesita código manual aquí.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
