import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { SecurityProvider } from './context/SecurityContext' // Added import

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap App to enable global security state persistence */}
    <SecurityProvider>
      <App />
    </SecurityProvider>
  </React.StrictMode>,
)