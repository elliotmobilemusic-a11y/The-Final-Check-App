import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { listClients } from '../../services/clients';
import { readDraft } from '../../services/draftStore';
import { listMenuProjects } from '../../services/menus';
import { MENU_BUILDER_DRAFT_KEY } from '../../features/menu-engine/menuBuilderHelpers';
import { listQuestionnaireSubmissions } from '../../services/preVisitQuestionnaires';
import type { ClientRecord, MenuProjectState, QuestionnaireSubmissionRecord, SupabaseRecord } from '../../types';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function MenuHubPage() {
  const [projects, setProjects] = useState<SupabaseRecord<MenuProjectState>[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [submissions, setSubmissions] = useState<QuestionnaireSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const draft = useMemo(() => readDraft<MenuProjectState>(MENU_BUILDER_DRAFT_KEY), []);
  const hasDraft = Boolean(draft?.menuName?.trim() || draft?.siteName?.trim());

  useEffect(() => {
    Promise.all([listMenuProjects(), listClients(), listQuestionnaireSubmissions()])
      .then(([projectRows, clientRows, subRows]) => {
        setProjects(projectRows);
        setClients(clientRows);
        setSubmissions(subRows.filter((s) => s.template_id === 'menu_profit'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.company_name);
    return map;
  }, [clients]);

  const latestProject = projects[0] ?? null;
  const pendingSubmissions = submissions.filter((s) => s.status !== 'used').slice(0, 4);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Menu Profit Engine"
        title="Menu Profit Engine"
        description="Build dish specs, cost recipes, calculate GP, and generate a client-ready menu profit report."
        actions={
          <div className="hub-intro-actions">
            <Link className="button button-primary" to="/menu?new=1">
              New project
            </Link>
            {hasDraft && (
              <Link className="button button-secondary" to="/menu">
                Resume draft
              </Link>
            )}
            {latestProject && (
              <Link className="button button-ghost" to={`/menu?load=${latestProject.id}`}>
                Continue latest
              </Link>
            )}
          </div>
        }
      />

      <div className="hub-layout">
        {/* ─── Main: recent projects ────────────────────────── */}
        <div className="hub-main-zone">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Recent projects</h3>
                <p className="muted-copy">
                  {loading
                    ? 'Loading…'
                    : `${projects.length} saved ${projects.length === 1 ? 'project' : 'projects'}`}
                </p>
              </div>
              <Link className="button button-small button-ghost" to="/menu?new=1">
                New
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading projects…</p>
              ) : projects.length === 0 ? (
                <div className="hub-empty">
                  <strong>No saved projects yet</strong>
                  <span>Create your first Menu Profit Engine project to see it here.</span>
                  <Link className="button button-small button-primary" to="/menu?new=1">
                    Start first project
                  </Link>
                </div>
              ) : (
                <div className="hub-row-list">
                  {projects.slice(0, 12).map((project) => (
                    <Link
                      key={project.id}
                      to={`/menu?load=${project.id}`}
                      className="hub-row"
                    >
                      <div className="hub-row-main">
                        <strong className="hub-row-title">
                          {project.title || project.site_name || 'Menu Project'}
                        </strong>
                        {project.client_id && clientMap.get(project.client_id) ? (
                          <span className="hub-row-tag hub-row-tag--client">
                            {clientMap.get(project.client_id)}
                          </span>
                        ) : null}
                      </div>
                      <div className="hub-row-meta">
                        <span className="hub-row-date">{fmtDate(project.updated_at)}</span>
                        <span className="hub-row-arrow" aria-hidden="true">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ─── Side: draft + clients + questionnaires ────────── */}
        <div className="hub-side-zone">
          {hasDraft && (
            <section className="panel hub-draft-panel">
              <div className="panel-header">
                <div>
                  <h3>Unsaved draft</h3>
                  <p className="muted-copy">Continue where you left off.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="hub-draft-copy">
                  <strong>{draft!.menuName?.trim() || draft!.siteName?.trim() || 'Unnamed project'}</strong>
                </div>
                <Link
                  className="button button-primary"
                  to="/menu"
                  style={{ marginTop: '12px', display: 'inline-flex' }}
                >
                  Resume draft
                </Link>
              </div>
            </section>
          )}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Start for a client</h3>
                <p className="muted-copy">Open a new project with a client pre-linked.</p>
              </div>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading clients…</p>
              ) : clients.length === 0 ? (
                <div className="hub-empty compact">
                  <span>No clients yet.</span>
                  <Link className="button button-small button-ghost" to="/clients/new">
                    Add client
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hub-row-list">
                    {clients.slice(0, 7).map((client) => (
                      <Link
                        key={client.id}
                        to={`/menu?client=${client.id}&new=1`}
                        className="hub-row hub-row--compact"
                      >
                        <span className="hub-row-title">{client.company_name}</span>
                        <span className="hub-row-arrow" aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                  {clients.length > 7 && (
                    <Link to="/clients" className="hub-see-all">
                      View all {clients.length} clients →
                    </Link>
                  )}
                </>
              )}
            </div>
          </section>

          {!loading && (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Pre-visit questionnaires</h3>
                  <p className="muted-copy">Recent Menu Profit submissions ready to use.</p>
                </div>
              </div>
              <div className="panel-body">
                {pendingSubmissions.length === 0 ? (
                  <div className="hub-empty compact">
                    <span>No pending questionnaire submissions.</span>
                    <Link className="button button-small button-ghost" to="/questionnaires">
                      All submissions
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="hub-row-list">
                      {pendingSubmissions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/questionnaires/${sub.id}`}
                          className="hub-row hub-row--compact"
                        >
                          <div className="hub-row-main">
                            <span className="hub-row-title">
                              {sub.answers.businessName || sub.answers.contactName || 'Unnamed'}
                            </span>
                            <span className="hub-row-date">{fmtDate(sub.submitted_at)}</span>
                          </div>
                          <span className="hub-row-arrow" aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                    <Link to="/questionnaires" className="hub-see-all">
                      All submissions →
                    </Link>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
