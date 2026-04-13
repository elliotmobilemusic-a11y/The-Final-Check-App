import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import './styles.css';
import './report-swiss.css';

// Suppress known browser extension errors that leak into unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || event.reason || '';
  if (typeof errorMessage === 'string' && errorMessage.includes('No Listener: tabs:outgoing.message.ready')) {
    // This is a benign browser extension error, prevent it from showing as uncaught
    event.preventDefault();
    return;
  }
});

if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((registration) => registration.unregister().catch(() => false))
        )
      )
      .catch(() => {
        // Ignore cleanup failures so the app still boots normally.
      });

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('the-final-check-shell'))
              .map((key) => caches.delete(key))
          )
        )
        .catch(() => {
          // Ignore cache cleanup failures so the app still boots normally.
        });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
