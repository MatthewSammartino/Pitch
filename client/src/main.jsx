import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { SuitColorProvider } from './context/SuitColorContext'
import { SoundProvider } from './context/SoundContext'
import { VideoProvider } from './context/VideoContext'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <SuitColorProvider>
            <SoundProvider>
              <VideoProvider>
                <App />
              </VideoProvider>
            </SoundProvider>
          </SuitColorProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
