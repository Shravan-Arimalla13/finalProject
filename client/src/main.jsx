// In client/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. Make sure these imports are correct
import { AuthProvider } from './context/AuthContext.jsx' 
import { ThemeProvider } from "./components/theme-provider"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. ThemeProvider is the outer shell */}
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      
      {/* 3. CRITICAL: AuthProvider MUST wrap the App */}
      <AuthProvider>
        <App />
      </AuthProvider>
      
    </ThemeProvider>
  </React.StrictMode>,
)