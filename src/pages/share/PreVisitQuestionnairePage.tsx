import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuestionnaireShareByToken } from '../../services/preVisitQuestionnaires';
import { getQuestionnaireTemplate } from '../../features/questionnaires/questionnaireTemplates';
import type { QuestionnaireSharePayload, QuestionnaireTemplate, ReportShareRecord } from '../../types';

const cardStyle = {
  padding: 'clamp(16px, 4vw, 24px)',
  borderRadius: '20px',
  border: '1px solid rgba(86, 81, 91, 0.14)',
  background: 'rgba(255,255,255,0.7)'
} as const;

const fieldStyle = {
  padding: '14px 16px',
  minHeight: '50px',
  borderRadius: '14px',
  border: '1px solid rgba(86, 81, 91, 0.18)',
  background: 'rgba(255,255,255,0.95)',
  fontSize: '16px',
  width: '100%',
  boxSizing: 'border-box' as const,
  WebkitAppearance: 'none' as const,
  appearance: 'none' as const
} as const;

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  minHeight: '110px',
  resize: 'vertical'
};

function renderField(
  field: QuestionnaireTemplate['groups'][number]['fields'][number],
  value: string,
  onChange: (key: string, value: string) => void
) {
  const id = `qfield-${field.key}`;
  const label = (
    <label htmlFor={id} style={{ display: 'grid', gap: '6px', ...(field.fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
        {field.label}{field.required ? ' *' : ''}
      </span>
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={4}
          value={value}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={textareaStyle}
        />
      ) : field.type === 'select' && field.options ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={fieldStyle}
        >
          <option value="">Select one</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type}
          value={value}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={fieldStyle}
        />
      )}
    </label>
  );
  return label;
}

export function PreVisitQuestionnairePage() {
  const { token = '' } = useParams();
  const [share, setShare] = useState<ReportShareRecord<QuestionnaireSharePayload> | null>(null);
  const [template, setTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pageStatus, setPageStatus] = useState<'loading' | 'ready' | 'submitted' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Loading questionnaire...');
  const [submitting, setSubmitting] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageStatus('missing');
      setMessage('This questionnaire link is incomplete.');
      return;
    }

    getQuestionnaireShareByToken(token)
      .then((shareRecord) => {
        if (!shareRecord) {
          setPageStatus('missing');
          setMessage('This questionnaire link is no longer available.');
          return;
        }

        const tmpl = getQuestionnaireTemplate(shareRecord.payload.templateId);
        if (!tmpl) {
          setPageStatus('error');
          setMessage('Questionnaire template not found.');
          return;
        }

        setShare(shareRecord);
        setTemplate(tmpl);

        const initial: Record<string, string> = {};
        for (const group of tmpl.groups) {
          for (const field of group.fields) {
            initial[field.key] = '';
          }
        }
        setAnswers(initial);

        setShowAnimation(true);
        setTimeout(() => {
          setShowAnimation(false);
          setPageStatus('ready');
        }, 1500);
      })
      .catch((err) => {
        setPageStatus('error');
        setMessage(err instanceof Error ? err.message : 'Could not load this questionnaire.');
      });
  }, [token]);

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!template) return;

    const missing = template.groups
      .flatMap((g) => g.fields)
      .filter((f) => f.required && !answers[f.key]?.trim());

    if (missing.length > 0) {
      setMessage(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const response = await fetch('/api/pre-visit-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Could not submit questionnaire.');
      }

      setPageStatus('submitted');
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit questionnaire.');
    } finally {
      setSubmitting(false);
    }
  }

  if (showAnimation) {
    return (
      <div className="auth-page">
        <div className="login-brand-animation">
          <div className="login-animation-stage">
            <div className="login-animation-kicker">Questionnaire ready</div>
            <div className="login-animation-logo">
              <strong>The Final Check</strong>
              <span>Opening your questionnaire</span>
            </div>
            <div className="login-animation-line">
              <span className="login-animation-line-core" />
              <span className="login-animation-line-glow" />
            </div>
            <div className="login-animation-orbit">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageStatus === 'submitted') {
    return (
      <main className="pv-q-page">
        <div className="pv-q-wrap pv-q-wrap--narrow">
          <p className="pv-q-brand">The Final Check</p>
          <h1 className="pv-q-title">Thanks — all received</h1>
          <p className="pv-q-subtitle">
            We've got your answers and will review them before the visit. Nothing else needed from you right now.
          </p>
        </div>
      </main>
    );
  }

  if (pageStatus !== 'ready') {
    return (
      <main className="pv-q-page">
        <div className="pv-q-wrap pv-q-wrap--narrow">
          <p className="pv-q-brand">The Final Check</p>
          <h1 className="pv-q-title">Pre-Visit Questionnaire</h1>
          <p className="pv-q-subtitle">{message}</p>
        </div>
      </main>
    );
  }

  const clientName = share?.payload.clientName;
  const note = share?.payload.note;

  return (
    <main className="pv-q-page">
      <div className="pv-q-wrap">
        <p className="pv-q-brand">The Final Check</p>
        <h1 className="pv-q-title">{template!.label}</h1>
        {clientName && <p className="pv-q-for">For: <strong>{clientName}</strong></p>}
        <p className="pv-q-subtitle">
          {note ?? template!.description}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px', marginTop: '28px' }}>
          {template!.groups.map((group) => (
            <div key={group.title} style={cardStyle}>
              <h3 className="pv-q-group-title">{group.title}</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px'
                }}
              >
                {group.fields.map((field) =>
                  renderField(field, answers[field.key] ?? '', updateAnswer)
                )}
              </div>
            </div>
          ))}

          {message && (
            <p className="pv-q-error">{message}</p>
          )}

          <div style={{ marginTop: '4px' }}>
            <button
              type="submit"
              disabled={submitting}
              className="pv-q-submit"
            >
              {submitting ? 'Submitting...' : 'Submit questionnaire'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
