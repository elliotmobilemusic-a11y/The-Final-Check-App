import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { getTemplateGroups } from '../../features/questionnaires/questionnaireTemplates';
import {
  createQuestionnaireShare,
  listQuestionnaireSubmissions
} from '../../services/preVisitQuestionnaires';
import type { QuestionnaireSubmissionRecord } from '../../types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function statusLabel(status: QuestionnaireSubmissionRecord['status']) {
  if (status === 'pending') return 'Pending review';
  if (status === 'reviewed') return 'Reviewed';
  return 'Used';
}

function statusClass(status: QuestionnaireSubmissionRecord['status']) {
  if (status === 'pending') return 'q-badge q-badge--pending';
  if (status === 'reviewed') return 'q-badge q-badge--reviewed';
  return 'q-badge q-badge--used';
}

export function QuestionnaireSubmissionsPage() {
  const [submissions, setSubmissions] = useState<QuestionnaireSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('profit_audit');
  const [clientName, setClientName] = useState('');
  const [note, setNote] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [generating, setGenerating] = useState(false);

  const templates = getTemplateGroups();

  useEffect(() => {
    listQuestionnaireSubmissions()
      .then(setSubmissions)
      .catch(() => setMessage('Could not load submissions.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerateLink() {
    try {
      setGenerating(true);
      setMessage('');
      const share = await createQuestionnaireShare({
        templateId: selectedTemplateId,
        clientName: clientName.trim() || undefined,
        note: note.trim() || undefined
      });

      const base = window.location.origin;
      setGeneratedLink(`${base}/#/questionnaire/${selectedTemplateId}/${share.token}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not generate link.');
    } finally {
      setGenerating(false);
    }
  }

  function copyLink() {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).catch(() => {});
    }
  }

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Pre-Visit Forms"
        title="Questionnaire Submissions"
        description="Generate pre-visit questionnaire links and review answers before each site visit."
      >
        <div className="page-inline-note">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</div>
      </PageIntro>

      <section className="panel">
        <div className="panel-header">
          <h3>Generate a questionnaire link</h3>
        </div>
        <div className="panel-body stack gap-16">
          {shareModalOpen ? (
            <div className="q-share-form">
              <div className="q-share-fields">
                <label className="form-label-group">
                  <span>Questionnaire template</span>
                  <select
                    className="form-control"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-label-group">
                  <span>Client name <span className="form-label-optional">(optional)</span></span>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="e.g. The Crown & Anchor"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </label>
                <label className="form-label-group" style={{ gridColumn: '1 / -1' }}>
                  <span>Custom message <span className="form-label-optional">(optional — shown to client on form)</span></span>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Leave blank to use the default description."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </div>

              {generatedLink ? (
                <div className="q-link-result">
                  <p className="q-link-label">Questionnaire link — copy and share with client:</p>
                  <div className="q-link-box">
                    <code className="q-link-url">{generatedLink}</code>
                    <button className="button button-secondary" type="button" onClick={copyLink}>
                      Copy
                    </button>
                  </div>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => {
                      setGeneratedLink('');
                      setClientName('');
                      setNote('');
                      setSelectedTemplateId('profit_audit');
                    }}
                  >
                    Generate another
                  </button>
                </div>
              ) : (
                <div className="q-share-actions">
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={generating}
                    onClick={handleGenerateLink}
                  >
                    {generating ? 'Generating...' : 'Generate link'}
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    onClick={() => setShareModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {message && <p className="form-error">{message}</p>}
            </div>
          ) : (
            <div className="q-cta-row">
              <div>
                <p className="q-cta-text">
                  Create a one-time link to send to a client before their site visit. Their answers come back here for review and can be used to prefill the Profit Audit.
                </p>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShareModalOpen(true)}
              >
                New questionnaire link
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Received submissions</h3>
        </div>
        <div className="panel-body">
          {loading ? (
            <p className="muted">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <div className="empty-state">
              <p>No submissions yet. Generate a link and share it with a client.</p>
            </div>
          ) : (
            <div className="q-submission-list">
              {submissions.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/questionnaires/${sub.id}`}
                  className="q-submission-row"
                >
                  <div className="q-submission-main">
                    <strong className="q-submission-name">
                      {sub.answers.businessName || sub.answers.contactName || 'Unknown business'}
                    </strong>
                    <span className="q-submission-template">{sub.template_id.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="q-submission-meta">
                    <span className={statusClass(sub.status)}>{statusLabel(sub.status)}</span>
                    <span className="q-submission-date">{fmtDate(sub.submitted_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
