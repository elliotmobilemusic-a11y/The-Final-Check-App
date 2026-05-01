import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { getQuestionnaireTemplate } from '../../features/questionnaires/questionnaireTemplates';
import {
  getQuestionnaireSubmission,
  updateSubmissionStatus
} from '../../services/preVisitQuestionnaires';
import type {
  AuditFormState,
  FoodSafetyAuditState,
  MenuProjectState,
  MysteryShopAuditState,
  QuestionnaireSubmissionRecord
} from '../../types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildProfitAuditPrefill(answers: Record<string, string>): Partial<AuditFormState> {
  const challenges = answers.currentChallenges?.trim() ?? '';
  const goals = answers.goalsForVisit?.trim() ?? '';
  const summaryParts = [challenges, goals].filter(Boolean);

  return {
    businessName: answers.businessName?.trim() ?? '',
    location: answers.siteAddress?.trim() ?? '',
    contactName: answers.contactName?.trim() ?? '',
    weeklySales: parseFloat(answers.weeklySales) || 0,
    coversPerWeek: parseInt(answers.coversPerWeek) || 0,
    averageSpend: parseFloat(answers.averageSpend) || 0,
    kitchenTeamSize: parseInt(answers.teamSize) || 0,
    labourPercent: parseFloat(answers.labourPercent) || 0,
    tradingDays: answers.tradingDays?.trim() ?? '',
    mainSupplier: answers.mainSupplier?.trim() ?? '',
    summary: summaryParts.join('\n\n')
  };
}

function buildFoodSafetyPrefill(answers: Record<string, string>): Partial<FoodSafetyAuditState> {
  return {
    siteName: answers.siteName?.trim() || answers.businessName?.trim() || '',
    location: answers.siteAddress?.trim() || '',
    managerName: answers.contactName?.trim() || '',
    hygieneRating: answers.hygieneRating?.trim() || '',
    summary: answers.prioritiesForVisit?.trim() || ''
  };
}

function buildMysteryShopPrefill(answers: Record<string, string>): Partial<MysteryShopAuditState> {
  return {
    siteName: answers.siteName?.trim() || answers.businessName?.trim() || '',
    location: answers.siteAddress?.trim() || '',
    overallSummary: answers.prioritiesForVisit?.trim() || ''
  };
}

function buildMenuProfitPrefill(answers: Record<string, string>): Partial<MenuProjectState> {
  return {
    menuName: answers.businessName?.trim() || '',
    siteName: answers.siteName?.trim() || answers.businessName?.trim() || '',
    defaultTargetGp: parseFloat(answers.targetGp) || 65
  };
}

const PREFILL_CONFIGS: Record<string, {
  label: string;
  route: string;
  build: (answers: Record<string, string>) => Record<string, unknown>;
}> = {
  profit_audit: {
    label: 'Open in Profit Audit',
    route: '/audit',
    build: buildProfitAuditPrefill as (answers: Record<string, string>) => Record<string, unknown>
  },
  food_safety: {
    label: 'Open in Food Safety Audit',
    route: '/food-safety',
    build: buildFoodSafetyPrefill as (answers: Record<string, string>) => Record<string, unknown>
  },
  mystery_shop: {
    label: 'Open in Mystery Shop',
    route: '/mystery-shop',
    build: buildMysteryShopPrefill as (answers: Record<string, string>) => Record<string, unknown>
  },
  menu_profit: {
    label: 'Open in Menu Profit Engine',
    route: '/menu',
    build: buildMenuProfitPrefill as (answers: Record<string, string>) => Record<string, unknown>
  }
};

function statusLabel(status: QuestionnaireSubmissionRecord['status']) {
  if (status === 'pending') return 'Pending review';
  if (status === 'reviewed') return 'Reviewed';
  return 'Used in audit';
}

function statusClass(status: QuestionnaireSubmissionRecord['status']) {
  if (status === 'pending') return 'q-badge q-badge--pending';
  if (status === 'reviewed') return 'q-badge q-badge--reviewed';
  return 'q-badge q-badge--used';
}

export function QuestionnaireSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<QuestionnaireSubmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    getQuestionnaireSubmission(id)
      .then(setSubmission)
      .catch(() => setMessage('Could not load submission.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleMarkReviewed() {
    if (!submission) return;
    try {
      setUpdatingStatus(true);
      await updateSubmissionStatus(submission.id, 'reviewed');
      setSubmission((prev) => prev ? { ...prev, status: 'reviewed' } : prev);
    } catch {
      setMessage('Could not update status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleOpenInTool() {
    if (!submission) return;
    const config = PREFILL_CONFIGS[submission.template_id];
    if (!config) return;
    const prefill = config.build(submission.answers);
    navigate(config.route, { state: { prefill, fromSubmissionId: submission.id } });
  }

  if (loading) {
    return (
      <div className="page-stack">
        <div className="panel"><div className="panel-body"><p className="muted">Loading submission...</p></div></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="page-stack">
        <div className="panel">
          <div className="panel-body">
            <p className="muted">{message || 'Submission not found.'}</p>
            <Link to="/questionnaires" className="button button-ghost" style={{ marginTop: '12px', display: 'inline-flex' }}>
              Back to submissions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const template = getQuestionnaireTemplate(submission.template_id);
  const businessName = submission.answers.businessName || submission.answers.contactName || 'Unknown business';
  const prefillConfig = PREFILL_CONFIGS[submission.template_id] ?? null;

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Pre-Visit Form"
        title={businessName}
        description={`Submitted ${fmtDate(submission.submitted_at)} · ${template?.label ?? submission.template_id}`}
      >
        <Link to="/questionnaires" className="page-inline-note page-inline-note--link">
          ← All submissions
        </Link>
      </PageIntro>

      <section className="panel q-detail-summary">
        <div className="panel-header">
          <div>
            <h3>Review summary</h3>
            <p className="muted-copy">Triage the submission before moving into client or audit work.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="q-detail-overview">
            <div className="q-detail-facts">
              <div className="q-detail-fact">
                <span>Status</span>
                <strong><span className={statusClass(submission.status)}>{statusLabel(submission.status)}</span></strong>
              </div>
              <div className="q-detail-fact">
                <span>Contact</span>
                <strong>{submission.answers.contactName || 'Not supplied'}</strong>
              </div>
              <div className="q-detail-fact">
                <span>Business type</span>
                <strong>{submission.answers.businessType || 'Not supplied'}</strong>
              </div>
            </div>
            <div className="q-detail-actions">
              {prefillConfig && (
                <button
                  className="button button-primary"
                  type="button"
                  onClick={handleOpenInTool}
                >
                  {prefillConfig.label}
                </button>
              )}
              {submission.status === 'pending' && (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={updatingStatus}
                  onClick={handleMarkReviewed}
                >
                  {updatingStatus ? 'Saving...' : 'Mark as reviewed'}
                </button>
              )}
            </div>
          </div>
          {message && <p className="form-error" style={{ marginTop: '10px' }}>{message}</p>}
        </div>
      </section>

      {template ? (
        template.groups.map((group) => {
          const fieldsWithValues = group.fields.filter(
            (f) => submission.answers[f.key]?.trim()
          );
          if (fieldsWithValues.length === 0) return null;

          return (
            <section key={group.title} className="panel">
              <div className="panel-header">
                <h3>{group.title}</h3>
              </div>
              <div className="panel-body">
                <div className="q-answers-grid">
                  {fieldsWithValues.map((field) => (
                    <div
                      key={field.key}
                      className={`q-answer-item${field.fullWidth || field.type === 'textarea' ? ' q-answer-item--full' : ''}`}
                    >
                      <span className="q-answer-label">{field.label}</span>
                      <span className="q-answer-value">
                        {submission.answers[field.key] || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <section className="panel">
          <div className="panel-header"><h3>Answers</h3></div>
          <div className="panel-body">
            <div className="q-answers-grid">
              {Object.entries(submission.answers)
                .filter(([, v]) => v?.trim())
                .map(([key, value]) => (
                  <div key={key} className="q-answer-item">
                    <span className="q-answer-label">{key}</span>
                    <span className="q-answer-value">{value}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
