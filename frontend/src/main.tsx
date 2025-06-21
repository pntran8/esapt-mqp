import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import UploadImg from './UploadImg.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UploadImg />
  </StrictMode>,
)
