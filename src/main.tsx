import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FeedbackToque } from './components/FeedbackToque'
import './styles.css'
import './estilo/vida.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <FeedbackToque />
  </StrictMode>,
)
