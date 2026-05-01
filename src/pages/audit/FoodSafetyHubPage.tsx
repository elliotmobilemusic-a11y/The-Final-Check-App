import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { listClients } from '../../services/clients';
import { readDraft } from '../../services/draftStore';
import { listFoodSafetyAudits } from '../../services/foodSafetyAudits';
import type { FoodSafetyAuditRecord } from '../../services/foodSafetyAudits';
import { listQuestionnaireSubmissions } from '../../services/preVisitQuestionnaires';
import type { ClientRecord, FoodSafetyAuditState, QuestionnaireSubmissionRecord } from '../../types';

const FOOD_SAFETY_DRAFT_KEY = 'food-safety-audit-draft-v1';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function FoodSafetyHubPage() {
  const [audits, setAudits] = useState<FoodSafetyAuditRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [submissions, setSubmissions] = useState<QuestionnaireSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const draft = useMemo(() => readDraft<FoodSafetyAuditState>(FOOD_SAFETY_DRAFT_KEY), []);
  const hasDraft = Boolean(
    draft?.siteName?.trim() || draft?.managerName?.trim() || draft?.location?.trim()
  );

  useEffect(() => {
    Promise.all([listFoodSafetyAudits(), listClients(), listQuestionnaireSubmissions()])
      .then(([auditRows, clientRows, subRows]) => {
        setAudits(auditRows);
        setClients(clientRows);
        setSubmissions(subRows.filter((s) => s.template_id === 'food_safety'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.company_name);
    return map;
  }, [clients]);

  const latestAudit = audits[0] ?? null;
  const pendingSubmissions = submissions.filter((s) => s.status !== 'used').slice(0, 4);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Food Safety"
        title="Food Safety Audit"
        description="Run site compliance checks, temperature logging, control reviews, and immediate action follow-up."
        actions={
          <div className="hub-intro-actions">
            <Link className="button button-primary" to="/food-safety?new=1">
              New audit
            </Link>
            {hasDraft && (
              <Link className="button button-secondary" to="/food-safety">
                Resume draft
              </Link>
            )}
            {latestAudit && (
              <Link className="button button-ghost" to={`/food-safety?load=${latestAudit.id}`}>
                Continue latest
              </Link>
            )}
          </div>
        }
      />

      <div className="hub-layout">
        {/* ─── Main: recent audits ───────────────────────────── */}
        <div className="hub-main-zone">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Recent audits</h3>
                <p className="muted-copy">
                  {loading
                    ? 'Loading…'
                    : `${audits.length} saved ${audits.length === 1 ? 'audit' : 'audits'}`}
                </p>
              </div>
              <Link className="button button-small button-ghost" to="/food-safety?new=1">
                New
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading audits…</p>
              ) : audits.length === 0 ? (
                <div className="hub-empty">
                  <strong>No saved audits yet</strong>
                  <span>Create your first Food Safety Audit to see it here.</span>
                  <Link className="button button-small button-primary" to="/food-safety?new=1">
                    Start first audit
                  </Link>
                </div>
              ) : (
                <div className="hub-row-list">
                  {audits.slice(0, 12).map((audit) => (
                    <Link
                      key={audit.id}
                      to={`/food-safety?load=${audit.id}`}
                      className="hub-row"
                    >
                      <div className="hub-row-main">
                        <strong className="hub-row-title">
                          {audit.title || audit.site_name || 'Food Safety Audit'}
                        </strong>
                        {audit.client_id && clientMap.get(audit.client_id) ? (
                          <span className="hub-row-tag hub-row-tag--client">
                            {clientMap.get(audit.client_id)}
                          </span>
                        ) : null}
                      </div>
                      <div className="hub-row-meta">
                        <span className="hub-row-date">
                          {fmtDate(audit.review_date ?? audit.updated_at ?? audit.created_at)}
                        </span>
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
                  <strong>{draft!.siteName?.trim() || 'Unnamed audit'}</strong>
                  {draft!.managerName?.trim() ? <span>{draft!.managerName.trim()}</span> : null}
                  {draft!.location?.trim() ? <span>{draft!.location.trim()}</span> : null}
                </div>
                <Link
                  className="button button-primary"
                  to="/food-safety"
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
                <p className="muted-copy">Open a new audit with a client pre-linked.</p>
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
                        to={`/food-safety?client=${client.id}&new=1`}
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
                  <p className="muted-copy">Recent Food Safety submissions ready to use.</p>
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
