import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ControlPanelModal } from '../../components/layout/ControlPanelModal';
import {
  KitchenAuditControlsPanel,
  KitchenAuditWorkspaceSection
} from '../../components/audit/KitchenAuditSections';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import { openPdfDocument, normalizeTitleLabel } from '../../reports/pdf';
import { getAuditById, saveAudit } from '../../services/audits';
import { listClients } from '../../services/clients';
import type {
  AuditActionItem,
  AuditCategoryScores,
  AuditControlCheck,
  AuditFormState,
  AuditOrderingItem,
  AuditPhoto,
  AuditPortionItem,
  AuditWasteItem,
  ClientRecord
} from '../../types';
import { downloadText, fmtCurrency, fmtPercent, safe } from '../../lib/utils';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { createKitchenAuditShare } from '../../services/reportShares';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { useVisitMode } from '../../lib/useVisitMode';
import {
  ArrayKeys,
  KITCHEN_AUDIT_DRAFT_KEY,
  blankActionItem,
  blankOrderingItem,
  blankPortionItem,
  blankWasteItem,
  buildAuditInsights,
  buildSuggestedActionItems,
  buildSuggestedNarrative,
  calculateAudit,
  completionSummary,
  createDefaultAudit,
  normalizeAuditState,
  sectionLinks
} from '../../features/audits/kitchenAuditHelpers';
import {
  buildKitchenAuditReportHtml,
  buildStandaloneKitchenAuditReportHtml
} from '../../features/audits/kitchenAuditReport';

export function KitchenAuditPage() {
  const { runWithActivity } = useActivityOverlay();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuditFormState>(() =>
    searchParams.get('load')
      ? normalizeAuditState({}, searchParams.get('client') || null)
      : normalizeAuditState(
          readDraft<AuditFormState>(KITCHEN_AUDIT_DRAFT_KEY) ?? {},
          searchParams.get('client') || null
        )
  );
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Audit draft ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const controlDrawerBodyRef = useRef<HTMLDivElement>(null);
  const { visitMode, toggleVisitMode } = useVisitMode();

  const calc = useMemo(() => calculateAudit(form), [form]);
  const activeClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );
  const reportHtml = useMemo(() => buildKitchenAuditReportHtml(form), [form]);
  const standaloneReportHtml = useMemo(
    () =>
      buildStandaloneKitchenAuditReportHtml(
        `${safe(form.businessName || 'Kitchen Profit Audit')} report`,
        reportHtml
      ),
    [form.businessName, reportHtml]
  );
  const completion = useMemo(() => completionSummary(form), [form]);
  const insights = useMemo(() => buildAuditInsights(form, calc), [form, calc]);

  useBodyScrollLock(controlModalOpen);

  useEffect(() => {
    if (!controlModalOpen) return;
    controlDrawerBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [controlModalOpen]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(KITCHEN_AUDIT_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const clientId = searchParams.get('client');
    const loadId = searchParams.get('load');

    if (clientId) {
      setForm((current) => ({ ...current, clientId }));
    }

    if (!loadId) return;

    getAuditById(loadId)
      .then((record) => {
        if (!record) return;

        setForm({
          ...normalizeAuditState(record.data, record.client_id ?? record.data.clientId ?? null),
          id: record.id,
          clientId: record.client_id ?? record.data.clientId ?? null,
          createdAt: record.created_at,
          updatedAt: record.updated_at
        });

        setMessage(`Loaded "${record.title}".`);
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (!form.clientId) return;

    if (!availableClientSites.length) {
      if (form.clientSiteId) {
        setForm((current) => ({ ...current, clientSiteId: null }));
      }
      return;
    }

    const matchingSite = availableClientSites.find((site) => site.id === form.clientSiteId);
    if (matchingSite) return;

    if (availableClientSites.length === 1) {
      const singleSite = availableClientSites[0];
      setForm((current) => ({
        ...current,
        clientSiteId: singleSite.id,
        businessName:
          !current.businessName.trim() || current.businessName === activeClient?.company_name
            ? singleSite.name || activeClient?.company_name || current.businessName
            : current.businessName,
        location:
          !current.location.trim()
            ? singleSite.address || activeClient?.location || current.location
            : current.location
      }));
      return;
    }

    if (form.clientSiteId) {
      setForm((current) => ({ ...current, clientSiteId: null }));
    }
  }, [activeClient, availableClientSites, form.clientId, form.clientSiteId]);

  function updateField<K extends keyof AuditFormState>(key: K, value: AuditFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleClientSelection(nextClientId: string | null) {
    const nextClient = clients.find((client) => client.id === nextClientId) ?? null;
    const nextSites = selectableSitesForClient(nextClient);
    const singleSite = nextSites.length === 1 ? nextSites[0] : null;

    setForm((current) => ({
      ...current,
      clientId: nextClientId,
      clientSiteId: singleSite?.id ?? null,
      businessName: singleSite
        ? singleSite.name || nextClient?.company_name || current.businessName
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.company_name || current.businessName
          : current.businessName,
      location: singleSite
        ? singleSite.address || nextClient?.location || current.location
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.location || current.location
          : current.location
    }));
  }

  function handleClientSiteSelection(nextSiteId: string | null) {
    const nextSite = availableClientSites.find((site) => site.id === nextSiteId) ?? null;

    setForm((current) => ({
      ...current,
      clientSiteId: nextSiteId,
      businessName: nextSite?.name || current.businessName,
      location: nextSite?.address || activeClient?.location || current.location
    }));
  }

  function updateCategoryScore(key: keyof AuditCategoryScores, value: number) {
    setForm((current) => ({
      ...current,
      categoryScores: {
        ...current.categoryScores,
        [key]: value
      }
    }));
  }

  function updateRepeatItem<T extends AuditWasteItem | AuditPortionItem | AuditOrderingItem>(
    key: ArrayKeys,
    id: string,
    field: keyof T,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      [key]: (current[key] as T[]).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }

  function updateControlCheck(id: string, key: keyof AuditControlCheck, value: string) {
    setForm((current) => ({
      ...current,
      controlChecks: current.controlChecks.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addPhotos(_section: string, photos: AuditPhoto[]) {
    setForm((current) => ({
      ...current,
      photos: [...current.photos, ...photos]
    }));
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo))
    }));
  }

  function removePhoto(photoId: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId)
    }));
  }

  function addRepeatItem(key: ArrayKeys) {
    setForm((current) => ({
      ...current,
      [key]:
        key === 'wasteItems'
          ? [...current.wasteItems, blankWasteItem()]
          : key === 'portionItems'
            ? [...current.portionItems, blankPortionItem()]
            : [...current.orderingItems, blankOrderingItem()]
    }));
  }

  function removeRepeatItem(key: ArrayKeys, id: string) {
    setForm((current) => {
      const next =
        key === 'wasteItems'
          ? current.wasteItems.filter((item) => item.id !== id)
          : key === 'portionItems'
            ? current.portionItems.filter((item) => item.id !== id)
            : current.orderingItems.filter((item) => item.id !== id);

      return {
        ...current,
        [key]:
          next.length > 0
            ? next
            : key === 'wasteItems'
              ? [blankWasteItem()]
              : key === 'portionItems'
                ? [blankPortionItem()]
                : [blankOrderingItem()]
      };
    });
  }

  function updateActionItem(id: string, key: keyof AuditActionItem, value: string) {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addActionItem() {
    setForm((current) => ({
      ...current,
      actionItems: [...current.actionItems, blankActionItem()]
    }));
  }

  function removeActionItem(id: string) {
    setForm((current) => {
      const next = current.actionItems.filter((item) => item.id !== id);
      return {
        ...current,
        actionItems: next.length > 0 ? next : [blankActionItem()]
      };
    });
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      await runWithActivity(
        {
          kicker: 'Plating results',
          title: 'Saving audit',
          detail: 'Locking in the latest kitchen findings and refreshing the saved audit list.'
        },
        async () => {
          const saved = await saveAudit(form);
          setForm({
            ...normalizeAuditState(saved.data, saved.client_id ?? saved.data.clientId ?? null),
            id: saved.id,
            clientId: saved.client_id ?? saved.data.clientId ?? null,
            createdAt: saved.created_at,
            updatedAt: saved.updated_at
          });
          setMessage('Audit saved.');
        }
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  function newAudit() {
    const activeClientId = searchParams.get('client') || null;
    clearDraft(KITCHEN_AUDIT_DRAFT_KEY);
    setForm(createDefaultAudit(activeClientId));
    setMessage('Started a new audit.');
  }

  function generateActions() {
    const generated = buildSuggestedActionItems(form, calc);
    setForm((current) => ({
      ...current,
      actionItems: generated.length > 0 ? generated : current.actionItems
    }));
    setMessage(
      generated.length > 0
        ? 'Structured actions generated from the current findings.'
        : 'Add a few more findings before generating suggested actions.'
    );
  }

  function estimateSalesFromTradingProfile() {
    if (calc.estimatedWeeklySales <= 0) {
      setMessage('Add covers per week and average spend first.');
      return;
    }

    setForm((current) => ({
      ...current,
      weeklySales: Math.round(calc.estimatedWeeklySales)
    }));
    setMessage('Weekly sales estimated from covers and average spend.');
  }

  function draftNarrative() {
    const draft = buildSuggestedNarrative(form, calc);
    setForm((current) => ({
      ...current,
      summary: draft.summary || current.summary,
      quickWins: draft.quickWins || current.quickWins,
      priorityActions: draft.priorityActions || current.priorityActions,
      longTermStrategy: draft.longTermStrategy || current.longTermStrategy,
      nextVisit: draft.nextVisit || current.nextVisit
    }));
    setMessage('Narrative sections drafted from the current audit data.');
  }

  function exportPdf() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building PDF report',
        detail: 'Formatting the kitchen audit into a clean client-ready report.'
      },
      async () => {
        openPdfDocument(
          `${normalizeTitleLabel(safe(form.businessName || 'Kitchen Profit Audit'))} report`,
          reportHtml
        );
      },
      700
    );
  }

  function downloadHtmlReport() {
    void runWithActivity(
      {
        kicker: 'Packing report',
        title: 'Downloading HTML report',
        detail: 'Creating a standalone HTML version you can keep or send on.'
      },
      async () => {
        downloadText(
          `${safe(form.businessName || 'kitchen-audit-report')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'kitchen-audit-report'}.html`,
          standaloneReportHtml,
          'text/html'
        );
        setMessage('Standalone HTML report downloaded.');
      },
      700
    );
  }

  async function shareHtmlReport() {
    try {
      setIsSharing(true);
      setShareUrl('');
      const share = await runWithActivity(
        {
          kicker: 'Opening pass',
          title: 'Creating share link',
          detail: 'Publishing a secure public link for this kitchen audit report.'
        },
        () => createKitchenAuditShare(form),
        900
      );
      setShareUrl(share.url);

      try {
        await navigator.clipboard.writeText(share.url);
        setMessage('HTML report link created and copied to clipboard.');
      } catch {
        setMessage(`HTML report link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('HTML report link copied to clipboard.');
    } catch {
      setMessage('Copy failed. You can still copy the link manually.');
    }
  }

  return (
    <div className={`page-stack ${visitMode ? 'visit-mode' : ''}`}>
      <PageIntro
        eyebrow="Kitchen Profit Audit"
        title="We identify £2k–£10k per week in hidden profit"
        description="Capture the commercial leaks, quantify the weekly opportunity, and generate a premium consultancy report while you are still onsite."
        actions={
          <>
            <button className={`button ${visitMode ? 'button-primary' : 'button-secondary'}`} onClick={toggleVisitMode}>
              {visitMode ? 'Exit visit mode' : 'Visit mode'}
            </button>
            <button className="button button-secondary" onClick={newAudit}>
              New audit
            </button>
            <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save audit'}
            </button>
            <button className="button button-secondary" onClick={exportPdf}>
              Export PDF
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={downloadHtmlReport}>
              Download HTML
            </button>
            <button className="button button-secondary" disabled={isSharing} onClick={shareHtmlReport}>
              {isSharing ? 'Creating link...' : 'Create share link'}
            </button>
          </>
        }
      />

      {visitMode ? (
        <section className="panel visit-mode-toolbar">
          <div className="panel-body visit-mode-toolbar-body">
            <div className="visit-mode-toolbar-copy">
              <strong>Day of Visit mode</strong>
              <span>Large fields, quick jumps, save-first controls, and less onscreen admin while you work onsite.</span>
            </div>
            <div className="visit-mode-toolbar-actions">
              <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save now'}
              </button>
              <button className="button button-secondary" onClick={() => setControlModalOpen(true)}>
                Open controls
              </button>
            </div>
            <div className="visit-mode-toolbar-links">
              {sectionLinks.map((section) => (
                <a className="audit-section-link" href={section.href} key={section.href}>
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel share-link-panel">
        <div className="panel-body stack gap-12">
          <div className="record-header-message">
            <span className="soft-pill">{message}</span>
            {shareUrl ? <span className="soft-pill">Share link ready</span> : null}
          </div>
          {shareUrl ? (
            <div className="share-link-row">
              <input className="input" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
              <button className="button button-secondary" onClick={() => void copyShareLink()}>
                Copy link
              </button>
              <a className="button button-primary" href={shareUrl} target="_blank" rel="noreferrer">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Total weekly opportunity"
          value={fmtCurrency(calc.totalWeeklyOpportunity)}
          hint="Combined GP, waste, labour, and portion opportunity"
        />
        <StatCard
          label="Annual opportunity"
          value={fmtCurrency(calc.totalAnnualOpportunity)}
          hint="Projected annualised recovery value"
        />
        <StatCard
          label="GP opportunity"
          value={fmtCurrency(calc.gpOpportunityValue)}
          hint="Weekly opportunity from the GP gap"
        />
        <StatCard
          label="Labour opportunity"
          value={fmtCurrency(calc.labourOpportunityValue)}
          hint={
            form.labourPercent > form.targetLabourPercent
              ? `${fmtPercent(form.labourPercent)} vs ${fmtPercent(form.targetLabourPercent)} target`
              : 'No labour variance currently showing'
          }
        />
        <StatCard
          label="Control compliance"
          value={`${Math.round(calc.controlScore)}%`}
          hint={
            calc.criticalMissingControls > 0
              ? `${calc.criticalMissingControls} critical controls missing`
              : `${calc.totalNamedActions} structured actions recorded`
          }
        />
      </section>

      <KitchenAuditWorkspaceSection
        availableClientSites={availableClientSites}
        calc={calc}
        clients={clients}
        form={form}
        onAddActionItem={addActionItem}
        onAddPhotos={addPhotos}
        onAddRepeatItem={addRepeatItem}
        onDraftNarrative={draftNarrative}
        onEstimateSalesFromTradingProfile={estimateSalesFromTradingProfile}
        onGenerateActions={generateActions}
        onHandleClientSelection={handleClientSelection}
        onHandleClientSiteSelection={handleClientSiteSelection}
        onRemoveActionItem={removeActionItem}
        onRemovePhoto={removePhoto}
        onRemoveRepeatItem={removeRepeatItem}
        onSetMessage={setMessage}
        onUpdateActionItem={updateActionItem}
        onUpdateCategoryScore={updateCategoryScore}
        onUpdateControlCheck={updateControlCheck}
        onUpdateField={updateField}
        onUpdatePhotoCaption={updatePhotoCaption}
        onUpdateRepeatItem={updateRepeatItem}
      />

      <ControlPanelModal
        bodyRef={controlDrawerBodyRef}
        onClose={() => setControlModalOpen(false)}
        open={controlModalOpen}
        title="Profit Audit Controls"
      >
        <KitchenAuditControlsPanel calc={calc} completion={completion} form={form} insights={insights} />
      </ControlPanelModal>

      <div className="page-floating-controls">
        <button className="button button-primary control-dock-button" onClick={() => setControlModalOpen(true)}>
          Profit Controls
        </button>
      </div>
    </div>
  );
}
