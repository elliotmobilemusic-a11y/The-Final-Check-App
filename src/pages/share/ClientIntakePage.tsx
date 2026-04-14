import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClientIntakeShareByToken } from '../../services/clientIntakeShares';
import type {
  ClientIntakeFormData,
  ClientIntakeSharePayload,
  ClientIntakeSiteInput
} from '../../types';

function createSite(partial?: Partial<ClientIntakeSiteInput>): ClientIntakeSiteInput {
  return {
    id: `site-${Math.random().toString(36).slice(2, 10)}`,
    name: '',
    address: '',
    website: '',
    status: 'Active',
    ...partial
  };
}

const blankForm: ClientIntakeFormData = {
  businessName: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',
  contactPhone: '',
  preferredContactMethod: '',
  website: '',
  headOfficeAddress: '',
  businessType: '',
  weeklySalesBand: '',
  challenges: '',
  supportNeeded: '',
  extraNotes: '',
  sites: [createSite()]
};

const cardStyle = {
  padding: 'clamp(16px, 4vw, 24px)',
  borderRadius: '20px',
  border: '1px solid rgba(86, 81, 91, 0.14)'
} as const;

const fieldStyle = {
  padding: '16px 18px',
  minHeight: '54px',
  borderRadius: '16px',
  border: '1px solid rgba(86, 81, 91, 0.14)',
  background: 'rgba(255,255,255,0.95)',
  fontSize: '16px',
  transition: 'all 0.18s ease',
  WebkitAppearance: 'none',
  appearance: 'none'
} as const;

const textareaStyle = {
  ...fieldStyle,
  minHeight: '120px',
  resize: 'vertical'
} as const;

export function ClientIntakePage() {
  const { token = '' } = useParams();
  const [sharePayload, setSharePayload] = useState<ClientIntakeSharePayload | null>(null);
  const [form, setForm] = useState<ClientIntakeFormData>(blankForm);
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitted' | 'missing' | 'error'>(
    'loading'
  );
  const [message, setMessage] = useState('Opening enquiry form...');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      setMessage('This enquiry link is incomplete.');
      return;
    }

    getClientIntakeShareByToken(token)
      .then((share) => {
        if (!share) {
          setStatus('missing');
          setMessage('This enquiry link is no longer available.');
          return;
        }

        setSharePayload(share.payload ?? {});
        setStatus('ready');
        setMessage('');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this enquiry form.');
      });
  }, [token]);

  const helperText = useMemo(() => {
    if (!sharePayload?.message) {
      return 'Complete this enquiry form and we will review your information, pass it on internally, and come back to you as soon as possible.';
    }

    return sharePayload.message;
  }, [sharePayload]);

  function updateField<K extends keyof ClientIntakeFormData>(key: K, value: ClientIntakeFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSite(siteId: string, key: keyof ClientIntakeSiteInput, value: string) {
    setForm((current) => ({
      ...current,
      sites: current.sites.map((site) => (site.id === siteId ? { ...site, [key]: value } : site))
    }));
  }

  function addSite() {
    setForm((current) => ({
      ...current,
      sites: [...current.sites, createSite()]
    }));
  }

  function removeSite(siteId: string) {
    setForm((current) => ({
      ...current,
      sites: current.sites.length > 1 ? current.sites.filter((site) => site.id !== siteId) : current.sites
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.businessName.trim() || !form.contactEmail.trim()) {
      setMessage('Please add the business name and contact email before submitting.');
      return;
    }

    const hasValidSite = form.sites.some(
      (site) => site.name.trim() || site.address.trim() || site.website.trim()
    );

    if (!hasValidSite) {
      setMessage('Please add at least one site before submitting the enquiry.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/client-intake-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          form
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not submit this enquiry form.');
      }

      setStatus('submitted');
      setMessage(
        'Thanks, we will pass on your information and contact you as soon as possible.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not submit this enquiry form.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== 'ready') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '16px 12px',
          background:
            'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 40%), #f6f1ea'
        }}
      >
        <div
          style={{
            width: 'min(620px, 100%)',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(115, 95, 64, 0.12)',
            borderRadius: '24px',
            padding: 'clamp(20px, 6vw, 28px)',
            boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
          }}
        >
          <p
            style={{
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '12px',
              color: '#7b6b54',
              fontWeight: 700
            }}
          >
            The Final Check
          </p>
          <h1
            style={{
              margin: '12px 0 10px',
              fontSize: 'clamp(24px, 6vw, 32px)',
              color: '#2d2b31'
            }}
          >
            {status === 'submitted' ? 'Enquiry received' : 'Client enquiry'}
          </h1>
          <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.6 }}>{message}</p>
          {status === 'submitted' ? null : (
            <div style={{ marginTop: '22px' }}>
              <Link
                to="/login"
                style={{ color: '#4d6484', fontWeight: 700, textDecoration: 'none' }}
              >
                Return to workspace
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '16px 12px 32px',
        background:
          'radial-gradient(circle at top, rgba(214, 188, 140, 0.24), transparent 42%), #f6f1ea'
      }}
    >
      <div
        style={{
          width: 'min(920px, 100%)',
          margin: '0 auto',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(115, 95, 64, 0.12)',
          borderRadius: '28px',
          padding: 'clamp(20px, 4vw, 32px)',
          boxShadow: '0 30px 80px rgba(52, 41, 24, 0.12)'
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontSize: '12px',
            color: '#7b6b54',
            fontWeight: 700
          }}
        >
          The Final Check
        </p>
        <h1
          style={{
            margin: '12px 0 10px',
            fontSize: 'clamp(28px, 5vw, 40px)',
            lineHeight: 1.05,
            color: '#2d2b31'
          }}
        >
          Client enquiry form
        </h1>
        <p style={{ margin: 0, color: '#5c5752', lineHeight: 1.7, maxWidth: '68ch' }}>
          {helperText}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px', marginTop: '28px' }}>
          <div
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(198, 161, 97, 0.06), transparent)',
              borderColor: 'rgba(198, 161, 97, 0.15)'
            }}
          >
            <h3
              style={{
                margin: '0 0 18px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: '#5c4f3a',
                letterSpacing: '0.02em'
              }}
            >
              Business details
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}
            >
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Business name *
                </span>
                <input
                  value={form.businessName}
                  onChange={(event) => updateField('businessName', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Business type
                </span>
                <input
                  placeholder="Restaurant, pub, hotel, cafe..."
                  value={form.businessType}
                  onChange={(event) => updateField('businessType', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Main website
                </span>
                <input
                  value={form.website}
                  onChange={(event) => updateField('website', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Weekly sales band
                </span>
                <input
                  placeholder="e.g. £10k-£20k"
                  value={form.weeklySalesBand}
                  onChange={(event) => updateField('weeklySalesBand', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Head office or registered address
                </span>
                <input
                  value={form.headOfficeAddress}
                  onChange={(event) => updateField('headOfficeAddress', event.target.value)}
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(79, 142, 103, 0.06), transparent)',
              borderColor: 'rgba(79, 142, 103, 0.15)'
            }}
          >
            <h3
              style={{
                margin: '0 0 18px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: '#3d5446',
                letterSpacing: '0.02em'
              }}
            >
              Contact details
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
              }}
            >
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Main contact name
                </span>
                <input
                  value={form.contactName}
                  onChange={(event) => updateField('contactName', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Main contact role
                </span>
                <input
                  placeholder="Owner, general manager, operations director..."
                  value={form.contactRole}
                  onChange={(event) => updateField('contactRole', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Main contact email *
                </span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => updateField('contactEmail', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Main contact phone
                </span>
                <input
                  value={form.contactPhone}
                  onChange={(event) => updateField('contactPhone', event.target.value)}
                  style={fieldStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Preferred contact method
                </span>
                <select
                  value={form.preferredContactMethod}
                  onChange={(event) => updateField('preferredContactMethod', event.target.value)}
                  style={fieldStyle}
                >
                  <option value="">Select one</option>
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                  <option value="Either">Either</option>
                </select>
              </label>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(68, 92, 122, 0.06), transparent)',
              borderColor: 'rgba(68, 92, 122, 0.15)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '18px'
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#3a495c',
                    letterSpacing: '0.02em'
                  }}
                >
                  Site list
                </h3>
                <p style={{ margin: '8px 0 0', color: '#5a5a5a', lineHeight: 1.6 }}>
                  Add every site you want us to know about and tell us whether each one is active.
                </p>
              </div>
              <button
                type="button"
                onClick={addSite}
                style={{
                  border: 0,
                  borderRadius: '999px',
                  padding: '12px 16px',
                  background: '#445c7a',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Add another site
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {form.sites.map((site, index) => (
                <div
                  key={site.id}
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(86, 81, 91, 0.1)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'center',
                      marginBottom: '14px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <strong style={{ color: '#31343b' }}>Site {index + 1}</strong>
                    {form.sites.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSite(site.id)}
                        style={{
                          border: 0,
                          background: 'transparent',
                          color: '#9c4e46',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Remove site
                      </button>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                        Site name
                      </span>
                      <input
                        value={site.name}
                        onChange={(event) => updateSite(site.id, 'name', event.target.value)}
                        style={fieldStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                        Site status
                      </span>
                      <select
                        value={site.status}
                        onChange={(event) => updateSite(site.id, 'status', event.target.value)}
                        style={fieldStyle}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                        Site website
                      </span>
                      <input
                        value={site.website}
                        onChange={(event) => updateSite(site.id, 'website', event.target.value)}
                        style={fieldStyle}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                        Site address
                      </span>
                      <input
                        value={site.address}
                        onChange={(event) => updateSite(site.id, 'address', event.target.value)}
                        style={fieldStyle}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, rgba(113, 97, 154, 0.05), transparent)',
              borderColor: 'rgba(113, 97, 154, 0.12)'
            }}
          >
            <h3
              style={{
                margin: '0 0 18px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: '#4d4a67',
                letterSpacing: '0.02em'
              }}
            >
              What do you need help with?
            </h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  What are the biggest current challenges?
                </span>
                <textarea
                  rows={4}
                  value={form.challenges}
                  onChange={(event) => updateField('challenges', event.target.value)}
                  style={textareaStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  What support are you looking for?
                </span>
                <textarea
                  rows={4}
                  value={form.supportNeeded}
                  onChange={(event) => updateField('supportNeeded', event.target.value)}
                  style={textareaStyle}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#4a4641' }}>
                  Anything else we should know?
                </span>
                <textarea
                  rows={4}
                  value={form.extraNotes}
                  onChange={(event) => updateField('extraNotes', event.target.value)}
                  style={textareaStyle}
                />
              </label>
            </div>
          </div>

          {message ? (
            <p
              style={{
                margin: '8px 0 0 0',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(198, 161, 97, 0.12)',
                border: '1px solid rgba(198, 161, 97, 0.25)',
                color: '#6b5530',
                fontWeight: 500
              }}
            >
              {message}
            </p>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'stretch', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: 0,
                borderRadius: '999px',
                padding: '18px 24px',
                minHeight: '58px',
                width: '100%',
                background: 'linear-gradient(135deg, #4f4a53 0%, #69646f 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(36, 31, 38, 0.16)',
                transition: 'all 0.2s ease'
              }}
            >
              {submitting ? 'Sending enquiry...' : 'Submit enquiry'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
