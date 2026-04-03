import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="screen-center">
      <div className="loading-card">
        <h2>Page not found</h2>
        <p>The route you tried does not exist.</p>
        <Link className="button button-primary" to="/dashboard">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
