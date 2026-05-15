import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { KITCHEN_AUDIT_DRAFT_KEY, calculateAudit } from '../../features/audits/kitchenAuditHelpers';
import { listAudits } from '../../services/audits';
import { listClients } from '../../services/clients';
import { readDraft } from '../../services/draftStore';
import { listQuestionnaireSubmissions } from '../../services/preVisitQuestionnaires';
import { fmtCurrency } from '../../lib/utils';
import type {
  AuditFormState,
  ClientRecord,
  QuestionnaireSubmissionRecord,
  SupabaseRecord
} from '../../types';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function ProfitAuditHubPage() {
  const [audits, setAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [submissions, setSubmissions] = useState<QuestionnaireSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const draft = useMemo(() => readDraft<AuditFormState>(KITCHEN_AUDIT_DRAFT_KEY), []);
  const hasDraft = Boolean(
    draft?.businessName?.trim() || draft?.contactName?.trim() || draft?.location?.trim()
  );

  useEffect(() => {
    Promise.all([listAudits(), listClients(), listQuestionnaireSubmissions()])
      .then(([auditRows, clientRows, subRows]) => {
        setAudits(auditRows);
        setClients(clientRows);
        setSubmissions(subRows.filter((s) => s.template_id === 'profit_audit'));
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
  const totalOpportunity = audits.reduce(
    (total, audit) => total + calculateAudit(audit.data).totalWeeklyOpportunity,
    0
  );
  const auditedClientCount = new Set(audits.map((audit) => audit.client_id).filter(Boolean)).size;

  return (
    <div className="page-stack profit-audit-page">
      <section className="profit-audit-hero">
        <div className="profit-audit-hero-copy">
          <span className="profit-audit-kicker">Profit Audit</span>
          <h1>Kitchen Profit Audit</h1>
          <p>
            Assess margin leakage, kitchen controls, labour efficiency, purchasing, waste, and menu performance.
          </p>
          <div className="profit-audit-chip-row" aria-label="Profit audit status">
            <span>{hasDraft ? '1 draft' : 'No drafts'}</span>
            <span>{audits.length} completed audits</span>
            <span>{audits.length} reports ready</span>
          </div>
        </div>

        <div className="profit-audit-hero-actions">
          <span>Audit actions</span>
          <div className="profit-audit-hero-action-grid">
            <Link className="button button-primary" to="/audit?new=1">
              New profit audit
            </Link>
            {hasDraft && (
              <Link className="button button-secondary" to="/audit">
                Resume draft
              </Link>
            )}
            {latestAudit && (
              <Link className="button button-ghost" to={`/audit?load=${latestAudit.id}`}>
                Continue latest
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="profit-audit-kpis" aria-label="Profit audit performance">
        <article className="profit-audit-kpi">
          <span className="profit-audit-icon" aria-hidden="true">$</span>
          <div>
            <span>Active drafts</span>
            <strong>{hasDraft ? '1' : '0'}</strong>
            <p>{hasDraft ? 'Local draft ready to resume' : 'No local draft in progress'}</p>
          </div>
        </article>
        <article className="profit-audit-kpi">
          <span className="profit-audit-icon" aria-hidden="true">R</span>
          <div>
            <span>Completed reports</span>
            <strong>{audits.length}</strong>
            <p>{loading ? 'Checking saved audits' : 'Saved audit records'}</p>
          </div>
        </article>
        <article className="profit-audit-kpi">
          <span className="profit-audit-icon" aria-hidden="true">$</span>
          <div>
            <span>Total opportunity identified</span>
            <strong>{fmtCurrency(totalOpportunity)}</strong>
            <p>Weekly value across saved audits</p>
          </div>
        </article>
        <article className="profit-audit-kpi">
          <span className="profit-audit-icon" aria-hidden="true">C</span>
          <div>
            <span>Clients audited</span>
            <strong>{auditedClientCount}</strong>
            <p>{clients.length} clients available</p>
          </div>
        </article>
      </section>

      <div className="hub-layout profit-audit-grid">
        {/* ─── Main: recent audits ───────────────────────────── */}
        <div className="hub-main-zone profit-audit-main">
          <section className="panel profit-audit-panel">
            <div className="panel-header profit-audit-panel-header">
              <div>
                <h3>Recent audits</h3>
                <p className="muted-copy">
                  {loading
                    ? 'Loading…'
                    : `${audits.length} saved ${audits.length === 1 ? 'audit' : 'audits'}`}
                </p>
              </div>
              <Link className="button button-small button-ghost" to="/audit?new=1">
                New
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading audits…</p>
              ) : audits.length === 0 ? (
                <div className="hub-empty">
                  <strong>No saved audits yet</strong>
                  <span>Create your first audit to see it here.</span>
                  <Link className="button button-small button-primary" to="/audit?new=1">
                    Start first audit
                  </Link>
                </div>
              ) : (
                <div className="hub-row-list profit-audit-record-list">
                  {audits.slice(0, 12).map((audit) => (
                    <Link
                      key={audit.id}
                      to={`/audit?load=${audit.id}`}
                      className="hub-row profit-audit-record-card"
                    >
                      <div className="hub-row-main">
                        <strong className="hub-row-title">
                          {audit.title || audit.site_name || 'Kitchen Profit Audit'}
                        </strong>
                        {audit.client_id && clientMap.get(audit.client_id) ? (
                          <span className="hub-row-tag hub-row-tag--client">
                            {clientMap.get(audit.client_id)}
                          </span>
                        ) : null}
                        <span className="soft-pill">Report ready</span>
                      </div>
                      <div className="hub-row-meta">
                        <span>{fmtCurrency(calculateAudit(audit.data).totalWeeklyOpportunity)}</span>
                        <span className="hub-row-date">
                          {fmtDate(audit.updated_at ?? audit.created_at)}
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
        <div className="hub-side-zone profit-audit-side">
          {hasDraft && (
            <section className="panel hub-draft-panel profit-audit-panel">
              <div className="panel-header profit-audit-panel-header">
                <div>
                  <h3>Unsaved draft</h3>
                  <p className="muted-copy">Continue where you left off.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="hub-draft-copy">
                  <strong>{draft!.businessName?.trim() || 'Unnamed audit'}</strong>
                  {draft!.contactName?.trim() ? <span>{draft!.contactName.trim()}</span> : null}
                  {draft!.location?.trim() ? <span>{draft!.location.trim()}</span> : null}
                </div>
                <Link
                  className="button button-primary"
                  to="/audit"
                  style={{ marginTop: '12px', display: 'inline-flex' }}
                >
                  Resume draft
                </Link>
              </div>
            </section>
          )}

          <section className="panel profit-audit-panel">
            <div className="panel-header profit-audit-panel-header">
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
                        to={`/audit?client=${client.id}&new=1`}
                        className="hub-row hub-row--compact profit-audit-side-row"
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
            <section className="panel profit-audit-panel">
              <div className="panel-header profit-audit-panel-header">
                <div>
                  <h3>Pre-visit questionnaires</h3>
                  <p className="muted-copy">Recent Profit Audit submissions ready to use.</p>
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
