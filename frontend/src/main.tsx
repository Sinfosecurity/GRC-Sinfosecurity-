import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { routerFuture } from './marketing/routerFuture'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Provider } from 'react-redux'
import App from './App'
import theme from './theme'
import { store } from './store'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <ErrorBoundary>
                <Provider store={store}>
                    <BrowserRouter future={routerFuture}>
                        <NotificationProvider>
                            <AuthProvider>
                                <App />
                            </AuthProvider>
                        </NotificationProvider>
                    </BrowserRouter>
                </Provider>
            </ErrorBoundary>
        </ThemeProvider>
    </React.StrictMode>,
)
