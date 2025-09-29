import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CreateSession from './pages/CreateSession';
import AuthCallback from './pages/AuthCallback';
import { AuthProvider } from './auth/AuthContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

async function enableMocks() {
  const useMocks = process.env.NODE_ENV === 'development' && (process.env.REACT_APP_USE_MOCKS === 'true' || !process.env.REACT_APP_API_BASE);
  if (useMocks) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

enableMocks().then(() => {
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/study" element={<App />} />
            <Route path="/create" element={<CreateSession />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
