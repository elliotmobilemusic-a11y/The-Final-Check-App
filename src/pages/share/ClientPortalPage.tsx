import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getClientPortalShareByToken } from '../../services/reportShares';
import type { ClientPortalResource, ClientPortalSharePayload } from '../../types';
import { fmtCurrency } from '../../lib/utils';

function formatShortDate(value?: string | null) {
  if (!value) return 'No date set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No date set';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function resourceKindLabel(kind: ClientPortalResource['kind']) {
  if (kind === 'audit') return 'Kitchen audit';
  if (kind === 'food_safety') return 'Food safety';
  if (kind === 'mystery_shop') return 'Mystery shop';
  return 'Menu project';
}

function portalInvoiceLabel(portal: ClientPortalSharePayload) {
  if (!portal.hasOutstandingInvoices) return 'Released and up to date';
  if (portal.visibilityMode === 'paid_only') return 'Payment lock active';
  return 'Outstanding balance';
}

export function ClientPortalPage() {
  const { token = '' } = useParams();
  const [portal, setPortal] = useState<ClientPortalSharePayload | null>(null);
  const [message, setMessage] = useState('Loading client portal...');
  const [ready, setReady] = useState(false);
  const [introStage, setIntroStage] = useState<'welcome' | 'brand' | 'done'>('welcome');

  useEffect(() => {
    if (!token) {
      setMessage('This portal link is incomplete.');
      return;
    }

    getClientPortalShareByToken(token)
      .then((share) => {
        if (!share) {
          setMessage('This client portal is no longer available.');
          return;
        }

        setPortal(share.payload);
        setReady(true);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Could not load this client portal.');
      });
  }, [token]);

  useEffect(() => {
    if (!portal || !ready) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setIntroStage('done');
      return;
    }

    setIntroStage('welcome');
    const brandTimer = window.setTimeout(() => setIntroStage('brand'), 1750);
    const finishTimer = window.setTimeout(() => setIntroStage('done'), 3550);

    return () => {
      window.clearTimeout(brandTimer);
      window.clearTimeout(finishTimer);
    };
  }, [portal, ready]);

  const releasedResources = useMemo(
    () => portal?.resources.filter((item) => !item.locked) ?? [],
    [portal]
  );
  const lockedResources = useMemo(
    () => portal?.resources.filter((item) => item.locked) ?? [],
    [portal]
  );
  const nextActions = useMemo(
    () => portal?.tasks.filter((task) => task.title.trim()).slice(0, 6) ?? [],
    [portal]
  );

  if (!ready || !portal) {
    return (
      <main className="client-portal-loading">
        <div className="client-portal-loading-card">
          <p className="client-portal-eyebrow">The Final Check</p>
          <h1>Client portal</h1>
          <p>{message}</p>
          <Link to="/login" className="client-portal-return-link">
            Return to workspace
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="client-portal-page">
      {introStage !== 'done' ? (
        <div className="login-brand-animation client-portal-intro" key={introStage}>
          <div className="login-animation-stage client-portal-intro-stage">
            {introStage === 'welcome' ? (
              <>
                <div className="login-animation-kicker">Portal prepared</div>
                <div className="login-animation-logo">
                  <strong>{portal.clientName}</strong>
                  <span>
                    {portal.welcomeTitle || `Welcome to your client portal`}
                  </span>
                </div>
                <div className="login-animation-line">
                  <span className="login-animation-line-core" />
                  <span className="login-animation-line-glow" />
                </div>
                <div className="client-portal-intro-caption">
                  Your latest reviews, reports, and released actions are being presented now.
                </div>
              </>
            ) : (
              <>
                <div className="login-animation-kicker">Presented by</div>
                <div className="login-animation-logo">
                  <strong>The Final Check</strong>
                  <span>Opening a tailored workspace for {portal.clientName}</span>
                </div>
                <div className="login-animation-line">
                  <span className="login-animation-line-core" />
                  <span className="login-animation-line-glow" />
                </div>
                <div className="login-animation-orbit">
                  <span />
                  <span />
                  <span />
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <section className="client-portal-shell">
        <header
          className="client-portal-hero"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(33, 40, 47, 0.9), rgba(63, 77, 92, 0.84)), url(${
              portal.coverUrl || portal.logoUrl || ''
            })`
          }}
        >
          <div className="client-portal-hero-copy">
            <p className="client-portal-eyebrow">The Final Check Client Portal</p>
            <h1>{portal.welcomeTitle || `Welcome, ${portal.clientName}`}</h1>
            <p className="client-portal-hero-text">{portal.welcomeMessage}</p>
            <div className="client-portal-chip-row">
              <span>{portal.clientName}</span>
              <span>{portal.industry || 'Client workspace'}</span>
              <span>Next review {formatShortDate(portal.nextReviewDate)}</span>
              <span>{portalInvoiceLabel(portal)}</span>
            </div>
          </div>

          <aside className="client-portal-brand-card">
            {portal.logoUrl ? (
              <img src={portal.logoUrl} alt={portal.clientName} className="client-portal-brand-image" />
            ) : null}
            <div>
              <p className="client-portal-brand-kicker">Prepared for</p>
              <strong>{portal.clientName}</strong>
              <span>Published {formatShortDate(portal.publishedAt)}</span>
            </div>
          </aside>
        </header>

        <section className="client-portal-summary-grid">
          <article className="client-portal-stat-card">
            <span>Released documents</span>
            <strong>{releasedResources.length}</strong>
            <small>Reports and resources ready to open</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Held items</span>
            <strong>{lockedResources.length}</strong>
            <small>Visible but still locked from access</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Open actions</span>
            <strong>{portal.openTaskCount}</strong>
            <small>Live follow-up items currently in motion</small>
          </article>
          <article className="client-portal-stat-card">
            <span>Invoice status</span>
            <strong>
              {portal.hasOutstandingInvoices
                ? fmtCurrency(portal.outstandingInvoiceValue)
                : 'Up to date'}
            </strong>
            <small>{portalInvoiceLabel(portal)}</small>
          </article>
        </section>

        <section className="client-portal-main">
          <div className="client-portal-primary">
            {portal.portalNote ? (
              <article className="client-portal-note-card">
                <p className="client-portal-section-kicker">Portal note</p>
                <p>{portal.portalNote}</p>
              </article>
            ) : null}

            <article className="client-portal-section">
              <div className="client-portal-section-heading">
                <div>
                  <p className="client-portal-section-kicker">Released work</p>
                  <h2>Reports, audits, and action plans</h2>
                </div>
                <span className="client-portal-section-count">{releasedResources.length}</span>
              </div>

              {releasedResources.length === 0 ? (
                <div className="client-portal-empty-state">
                  No reports or resources have been released yet.
                </div>
              ) : (
                <div className="client-portal-resource-list">
                  {releasedResources.map((resource) => (
                    <article className="client-portal-resource-card" key={resource.id}>
                      <div className="client-portal-resource-copy">
                        <div className="client-portal-resource-header">
                          <strong>{resource.title}</strong>
                          <span>{resourceKindLabel(resource.kind)}</span>
                        </div>
                        <p>{resource.subtitle}</p>
                        <div className="client-portal-resource-meta">
                          <span>Review {formatShortDate(resource.reviewDate)}</span>
                          <span>Ready to open</span>
                        </div>
                      </div>
                      <a
                        className="client-portal-resource-link"
                        href={resource.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open report
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </article>

            {lockedResources.length > 0 ? (
              <article className="client-portal-section client-portal-section-muted">
                <div className="client-portal-section-heading">
                  <div>
                    <p className="client-portal-section-kicker">Awaiting release</p>
                    <h2>Visible but currently locked</h2>
                  </div>
                  <span className="client-portal-section-count">{lockedResources.length}</span>
                </div>

                <div className="client-portal-resource-list">
                  {lockedResources.map((resource) => (
                    <article
                      className="client-portal-resource-card client-portal-resource-card-locked"
                      key={resource.id}
                    >
                      <div className="client-portal-resource-copy">
                        <div className="client-portal-resource-header">
                          <strong>{resource.title}</strong>
                          <span>{resourceKindLabel(resource.kind)}</span>
                        </div>
                        <p>{resource.subtitle}</p>
                        <div className="client-portal-resource-lock">
                          {resource.lockReason || 'This item is temporarily unavailable.'}
                        </div>
                      </div>
                      <div className="client-portal-resource-pill">Locked</div>
                    </article>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="client-portal-sidebar">
            <article className="client-portal-side-card">
              <p className="client-portal-section-kicker">Account overview</p>
              <h3>Current release status</h3>
              <div className="client-portal-side-list">
                <div>
                  <span>Portal access</span>
                  <strong>{portal.hasOutstandingInvoices ? 'Partially restricted' : 'Fully open'}</strong>
                </div>
                <div>
                  <span>Release rule</span>
                  <strong>
                    {portal.visibilityMode === 'paid_only' ? 'Unlock after payment' : 'Immediate release'}
                  </strong>
                </div>
                <div>
                  <span>Paid value</span>
                  <strong>{fmtCurrency(portal.paidInvoiceValue)}</strong>
                </div>
                <div>
                  <span>Outstanding value</span>
                  <strong>{fmtCurrency(portal.outstandingInvoiceValue)}</strong>
                </div>
              </div>
            </article>

            <article className="client-portal-side-card">
              <p className="client-portal-section-kicker">Action plan</p>
              <h3>Current follow-up activity</h3>
              {nextActions.length === 0 ? (
                <div className="client-portal-empty-state compact">
                  No open actions are currently listed in this portal.
                </div>
              ) : (
                <div className="client-portal-task-list">
                  {nextActions.map((task) => (
                    <div className="client-portal-task-card" key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{task.owner || 'The Final Check team'}</span>
                      <small>
                        {task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : 'Due date to be confirmed'}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
