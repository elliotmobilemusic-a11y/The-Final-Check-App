import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { listAudits } from '../services/audits';
import { listMenuProjects } from '../services/menus';

type AuditRows = Awaited<ReturnType<typeof listAudits>>;
type MenuRows = Awaited<ReturnType<typeof listMenuProjects>>;

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function sortNewest<T extends { updated_at?: string | null }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });
}

export function DashboardPage() {
  const [audits, setAudits] = useState<AuditRows>([]);
  const [menus, setMenus] = useState<MenuRows>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [auditRows, menuRows] = await Promise.all([listAudits(), listMenuProjects()]);
        setAudits(sortNewest(auditRows));
        setMenus(sortNewest(menuRows));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const recentAudits = useMemo(() => audits.slice(0, 3), [audits]);
  const recentMenus = useMemo(() => menus.slice(0, 3), [menus]);

  const totalProjects = audits.length + menus.length;

  const latestUpdated = useMemo(() => {
    const allDates = [...audits, ...menus]
      .map((item) => item.updated_at)
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .filter((value) => !Number.isNaN(value));

    if (!allDates.length) return 'No saved work yet';

    return formatShortDate(new Date(Math.max(...allDates)).toISOString());
  }, [audits, menus]);

  const workflowStatus = useMemo(() => {
    if (totalProjects === 0) return 'Setup';
    if (audits.length > 0 && menus.length > 0) return 'Operational';
    return 'In progress';
  }, [audits.length, menus.length, totalProjects]);

  return (
    <div className="page-stack">
      <section className="hero-panel dashboard-hero">
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-copy">
            <div className="brand-badge">The Final Check Control Centre</div>
            <h2>A cleaner, smarter dashboard for your consultancy workflow</h2>
            <p>
              This should feel like the home of the whole system: start with a client profile,
              then run audits, build menus, review saved work, and keep the most important
              actions visible at a glance.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/clients">
                Add a client
              </Link>
              <Link className="button button-secondary" to="/audit">
                Start audit
              </Link>
              <Link className="button button-secondary" to="/menu">
                Open menu builder
              </Link>
            </div>
          </div>

          <div className="dashboard-focus-card">
            <span className="soft-pill">System focus</span>
            <h3>Review. Improve. Save. Report.</h3>
            <div className="dashboard-focus-list">
              <div className="dashboard-focus-item">
                <strong>Client-first workflow</strong>
                <span>Create a client profile first, then link every audit and menu to that business.</span>
              </div>
              <div className="dashboard-focus-item">
                <strong>Operational audits</strong>
                <span>Capture profit leaks, standards, waste, and action planning.</span>
              </div>
              <div className="dashboard-focus-item">
                <strong>Menu engineering</strong>
                <span>Track cost, GP, mix, and pricing decisions in one protected system.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total projects"
          value={String(totalProjects)}
          hint={loading ? 'Loading saved work...' : 'Audits and menu projects combined'}
        />
        <StatCard
          label="Audit projects"
          value={String(audits.length)}
          hint={audits[0]?.title ?? 'No audits saved yet'}
        />
        <StatCard
          label="Menu projects"
          value={String(menus.length)}
          hint={menus[0]?.title ?? 'No menus saved yet'}
        />
        <StatCard
          label="System status"
          value={workflowStatus}
          hint={latestUpdated}
        />
      </section>

      <section className="dashboard-grid">
        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Recommended workflow</h3>
              <p>
                Keep the dashboard useful by making the main journey obvious and quick to follow.
              </p>
            </div>
            <span className="soft-pill">Core flow</span>
          </div>

          <div className="dashboard-steps">
            <div className="dashboard-step">
              <span>01</span>
              <strong>Add a client</strong>
              <p>Create the business profile first so every audit and menu has a home.</p>
            </div>
            <div className="dashboard-step">
              <span>02</span>
              <strong>Run an audit</strong>
              <p>Capture site details, standards, margin pressure, waste and action points.</p>
            </div>
            <div className="dashboard-step">
              <span>03</span>
              <strong>Refine the menu</strong>
              <p>Move into costing and GP control once the operational issues are visible.</p>
            </div>
            <div className="dashboard-step">
              <span>04</span>
              <strong>Save and revisit</strong>
              <p>Keep records under the client profile so each review builds a fuller history.</p>
            </div>
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>System essentials</h3>
              <p>
                These are the pieces a consultancy system like this should make easy every time.
              </p>
            </div>
            <span className="soft-pill">Must-have</span>
          </div>

          <div className="dashboard-checklist">
            <div className="dashboard-check-row">
              <div>
                <strong>Secure sign-in</strong>
                <p>Only approved users can access the workspace.</p>
              </div>
              <span className="status-pill status-success">Live</span>
            </div>

            <div className="dashboard-check-row">
              <div>
                <strong>Cloud save/load</strong>
                <p>Audits and menus should be easy to reopen and continue later.</p>
              </div>
              <span className="status-pill status-success">Live</span>
            </div>

            <div className="dashboard-check-row">
              <div>
                <strong>Client-ready exports</strong>
                <p>JSON and HTML export keeps work portable and report-ready.</p>
              </div>
              <span className="status-pill status-success">Live</span>
            </div>

            <div className="dashboard-check-row">
              <div>
                <strong>Client-first structure</strong>
                <p>Every report should belong to a business profile, not float on its own.</p>
              </div>
              <span className="status-pill status-warning">Building</span>
            </div>
          </div>
        </article>
      </section>

      <section className="card-grid two-columns">
        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Recent audits</h3>
              <p>Your latest saved audit work should be visible immediately.</p>
            </div>
            <span className="soft-pill">{audits.length}</span>
          </div>

          <div className="dashboard-record-list">
            {!loading && recentAudits.length === 0 ? (
              <div className="dashboard-empty">
                No audits saved yet. Start with your first site review.
              </div>
            ) : null}

            {recentAudits.map((audit) => (
              <div className="dashboard-record" key={audit.id}>
                <div>
                  <strong>{audit.title}</strong>
                  <div className="saved-meta">
                    {audit.site_name || 'Unnamed site'} • {formatShortDate(audit.review_date || audit.updated_at)}
                  </div>
                </div>
                <Link className="button button-ghost" to="/audit">
                  Open
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="feature-card">
          <div className="feature-top">
            <div>
              <h3>Recent menu projects</h3>
              <p>Keep your latest costing and engineering work close to hand.</p>
            </div>
            <span className="soft-pill">{menus.length}</span>
          </div>

          <div className="dashboard-record-list">
            {!loading && recentMenus.length === 0 ? (
              <div className="dashboard-empty">
                No menu projects saved yet. Build your first menu structure.
              </div>
            ) : null}

            {recentMenus.map((menu) => (
              <div className="dashboard-record" key={menu.id}>
                <div>
                  <strong>{menu.title}</strong>
                  <div className="saved-meta">
                    {menu.site_name || 'Unnamed site'} • {formatShortDate(menu.review_date || menu.updated_at)}
                  </div>
                </div>
                <Link className="button button-ghost" to="/menu">
                  Open
                </Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="feature-card dashboard-modules-card">
        <div className="feature-top">
          <div>
            <h3>Recommended next modules</h3>
            <p>
              These are the upgrades that would make this feel like a more complete consultancy platform.
            </p>
          </div>
          <span className="soft-pill">Next layer</span>
        </div>

        <div className="dashboard-modules-grid">
          <div className="dashboard-module">
            <strong>Client profiles</strong>
            <p>Store site notes, contacts, visit history and business context in one place.</p>
          </div>

          <div className="dashboard-module">
            <strong>Action tracking</strong>
            <p>Turn quick wins and recommendations into dated follow-up actions.</p>
          </div>

          <div className="dashboard-module">
            <strong>Photo and evidence uploads</strong>
            <p>Add site evidence, menu snapshots, layout images and before/after records.</p>
          </div>

          <div className="dashboard-module">
            <strong>Follow-up planner</strong>
            <p>Schedule revisit points, progress reviews and monthly performance checks.</p>
          </div>
        </div>
      </section>
    </div>
  );
}