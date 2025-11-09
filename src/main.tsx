import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import SearchPage from './pages/SearchPage.tsx'
import SportsPage from './pages/SportsPage.tsx'
import AIPage from './pages/AIPage.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/ai" element={<AIPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)

