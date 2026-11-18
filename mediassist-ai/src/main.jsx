import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { FavouritesProvider } from './context/FavouritesContext.jsx'
import { AssistantProvider } from './context/AssistantContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <FavouritesProvider>
        <AssistantProvider>
          <App />
        </AssistantProvider>
      </FavouritesProvider>
    </HashRouter>
  </React.StrictMode>
)
