import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import theme from './theme'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <NotificationProvider>
                    <AuthProvider>
                        <ThemeProvider theme={theme}>
                            <CssBaseline />
                            <App />
                        </ThemeProvider>
                    </AuthProvider>
                </NotificationProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
)
