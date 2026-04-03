import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="screen-center">
      <div className="loading-card not-found-card">
        <div className="brand-badge">Route missing</div>
        <h2>Page not found</h2>
        <p>
          The route you tried does not exist or is no longer part of the workspace. Use the
          dashboard to get back into the main operating flow.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/dashboard">
            Go to dashboard
          </Link>
          <Link className="button button-secondary" to="/clients">
            Open clients
          </Link>
        </div>
      </div>
    </div>
  );
}
