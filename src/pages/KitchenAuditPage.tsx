import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { deleteAudit, getAuditById, listAudits, saveAudit } from '../services/audits';
import { listClients } from '../services/clients';
import type {
  AuditFormState,
  AuditOrderingItem,
  AuditPortionItem,
  AuditWasteItem,
  ClientRecord,
  SupabaseRecord
} from '../types';
import {
  downloadText,
  fmtCurrency,
  fmtPercent,
  lines,
  num,
  safe,
  todayIso,
  uid
} from '../lib/utils';

function blankWasteItem(): AuditWasteItem {
  return { id: uid('waste'), item: '', cost: 0, cause: '', fix: '' };
}

function blankPortionItem(): AuditPortionItem {
  return { id: uid('portion'), dish: '', loss: 0, issue: '', fix: '' };
}

function blankOrderingItem(): AuditOrderingItem {
  return { id: uid('ordering'), category: '', problem: '', impact: '', fix: '' };
}

function createDefaultAudit(clientId: string | null = null): AuditFormState {
  return {
    id: undefined,
    clientId,
    title: 'Kitchen Profit Audit',
    businessName: '',
    location: '',
    visitDate: todayIso(),
    consultantName: 'Jason Wardill',
    contactName: '',
    auditType: 'Operational Audit',
    weeklySales: 0,
    weeklyFoodCost: 0,
    targetGp: 70,
    actualWasteValue: 0,
    labourPercent: 0,
    orderingScore: 'Moderate',
    summary: '',
    cultureLeadership: '',
    foodQuality: '',
    systems: '',
    layoutStrengths: '',
    layoutIssues: '',
    equipmentNeeds: '',
    layoutImpact: '',
    quickWins: '',
    longTermStrategy: '',
    priorityActions: '',
    nextVisit: '',
    wasteItems: [blankWasteItem()],
    portionItems: [blankPortionItem()],
    orderingItems: [blankOrderingItem()]
  };
}

function scoreClass(score: number) {
  if (score >= 75) return 'status-pill status-danger';
  if (score >= 40) return 'status-pill status-warning';
  return 'status-pill status-success';
}

function scoreLabel(score: number) {
  if (score >= 75) return 'High priority';
  if (score >= 40) return 'Medium priority';
  return 'Stable';
}

function calculateAudit(state: AuditFormState) {
  const actualGp =
    state.weeklySales > 0
      ? ((state.weeklySales - state.weeklyFoodCost) / state.weeklySales) * 100
      : 0;

  const wastePercent =
    state.weeklySales > 0 ? (state.actualWasteValue / state.weeklySales) * 100 : 0;

  const totalPortionLoss = state.portionItems.reduce((sum, item) => sum + num(item.loss), 0);

  const portionRisk =
    state.portionItems.filter((item) => safe(item.dish)).length >= 4 || totalPortionLoss >= 250
      ? 'High'
      : state.portionItems.filter((item) => safe(item.dish)).length >= 2 || totalPortionLoss >= 100
        ? 'Moderate'
        : 'Low';

  let score = 0;
  score += Math.max(0, Math.min(30, (state.targetGp - actualGp) * 2));
  score += Math.max(0, Math.min(20, wastePercent * 4));
  score += Math.max(0, Math.min(15, state.labourPercent > 0 ? state.labourPercent - 20 : 0));
  score += Math.min(15, state.portionItems.filter((item) => safe(item.dish)).length * 4);
  score += Math.min(10, state.orderingItems.filter((item) => safe(item.category)).length * 2.5);
  score += Math.min(10, state.wasteItems.filter((item) => safe(item.item)).length * 2.5);

  return {
    actualGp,
    wastePercent,
    totalPortionLoss,
    portionRisk,
    score: Math.round(score),
    gpGap: state.targetGp - actualGp
  };
}

function listHtml(items: string[], emptyText: string) {
  if (!items.length) return `<p class="muted-copy">${emptyText}</p>`;
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function makeAuditReport(state: AuditFormState) {
  const calc = calculateAudit(state);

  const detailedFindings: string[] = [];
  if (state.weeklySales > 0) {
    const gap = state.targetGp - calc.actualGp;
    detailedFindings.push(
      `Current food GP is <strong>${fmtPercent(calc.actualGp)}</strong> against a target of <strong>${fmtPercent(state.targetGp)}</strong>. ${
        gap > 0
          ? `This leaves a gap of <strong>${gap.toFixed(1)} GP points</strong>.`
          : 'The site is meeting or exceeding its stated GP target.'
      }`
    );
  }
  if (state.actualWasteValue > 0) {
    detailedFindings.push(
      `Recorded waste sits at <strong>${fmtCurrency(state.actualWasteValue)}</strong> per week, equivalent to <strong>${fmtPercent(calc.wastePercent)}</strong> of weekly food sales.`
    );
  }
  if (calc.totalPortionLoss > 0) {
    detailedFindings.push(
      `Observed over-portioning creates an estimated weekly loss of <strong>${fmtCurrency(calc.totalPortionLoss)}</strong>.`
    );
  }
  if (safe(state.summary)) detailedFindings.push(safe(state.summary));
  if (safe(state.foodQuality)) {
    detailedFindings.push(`<strong>Food quality and offer:</strong> ${safe(state.foodQuality)}`);
  }
  if (safe(state.cultureLeadership)) {
    detailedFindings.push(
      `<strong>Leadership and team culture:</strong> ${safe(state.cultureLeadership)}`
    );
  }
  if (safe(state.systems)) {
    detailedFindings.push(`<strong>Systems and controls:</strong> ${safe(state.systems)}`);
  }

  const priorityActions = lines(state.priorityActions).length
    ? lines(state.priorityActions)
    : [
        state.targetGp > calc.actualGp
          ? 'Close the GP gap by standardising recipe specs, checking menu pricing, and tightening portion control.'
          : '',
        state.actualWasteValue > 0
          ? 'Implement a daily waste-recording routine and review the top categories every week.'
          : '',
        state.portionItems.some((item) => safe(item.dish))
          ? 'Introduce measured portion tools, recipe cards, and line training on dishes where over-portioning was observed.'
          : '',
        state.orderingItems.some((item) => safe(item.category))
          ? 'Reset ordering control with par levels, delivery-day discipline, and clear ownership.'
          : '',
        safe(state.layoutIssues)
          ? 'Address kitchen layout bottlenecks that slow service, increase motion, or reduce consistency.'
          : '',
        'Build a 30-day action plan with owners and weekly review points.'
      ].filter(Boolean);

  const quickWins = lines(state.quickWins).length
    ? lines(state.quickWins)
    : [
        state.actualWasteValue > 0 ? 'Start a daily waste sheet immediately.' : '',
        state.portionItems.some((item) => safe(item.dish))
          ? 'Add scales, scoops, or ladles to stations with inconsistent portions.'
          : '',
        state.orderingItems.some((item) => safe(item.category))
          ? 'Reduce order quantities to realistic par levels for the next delivery cycle.'
          : '',
        'Brief the kitchen team on the top three profit leaks found during the visit.'
      ].filter(Boolean);

  const longTerm = lines(state.longTermStrategy).length
    ? lines(state.longTermStrategy)
    : [
        'Complete a menu-engineering review to align offer, pricing, and margin performance.',
        'Develop recipe packs and costed build sheets for the full menu.',
        'Create a chef development plan focused on leadership, control, and consistency.',
        safe(state.layoutIssues)
          ? 'Plan a phased kitchen layout improvement project to improve flow and efficiency.'
          : ''
      ].filter(Boolean);

  const repeatSection = <T extends object>(
    title: string,
    items: T[],
    formatter: (item: T) => string,
    emptyText: string
  ) => {
    const filtered = items.filter((item) =>
      Object.values(item as Record<string, unknown>).some((value) => safe(value).length)
    );

    if (!filtered.length) {
      return `<h3>${title}</h3><p class="muted-copy">${emptyText}</p>`;
    }

    return `<h3>${title}</h3><ul>${filtered.map(formatter).join('')}</ul>`;
  };

  return `
    <h1>Kitchen Profit Audit Report</h1>
    <p><strong>${safe(state.businessName) || 'Unnamed site'}</strong>${safe(state.location) ? ` • ${safe(state.location)}` : ''}</p>

    <div class="report-meta">
      <div><strong>Visit date</strong><br />${safe(state.visitDate) || 'Not recorded'}</div>
      <div><strong>Consultant</strong><br />${safe(state.consultantName) || 'Not recorded'}</div>
      <div><strong>Site contact</strong><br />${safe(state.contactName) || 'Not recorded'}</div>
      <div><strong>Audit type</strong><br />${safe(state.auditType) || 'Not recorded'}</div>
    </div>

    <h2>Commercial snapshot</h2>
    <div class="report-meta">
      <div><strong>Weekly food sales</strong><br />${fmtCurrency(state.weeklySales)}</div>
      <div><strong>Weekly food cost</strong><br />${fmtCurrency(state.weeklyFoodCost)}</div>
      <div><strong>Actual GP</strong><br />${fmtPercent(calc.actualGp)}</div>
      <div><strong>Target GP</strong><br />${fmtPercent(state.targetGp)}</div>
      <div><strong>Waste value</strong><br />${fmtCurrency(state.actualWasteValue)}</div>
      <div><strong>Waste % of sales</strong><br />${fmtPercent(calc.wastePercent)}</div>
      <div><strong>Kitchen labour %</strong><br />${fmtPercent(state.labourPercent)}</div>
      <div><strong>Overall priority</strong><br />${scoreLabel(calc.score)} (${calc.score}/100)</div>
    </div>

    <h2>Detailed findings</h2>
    ${listHtml(detailedFindings, 'No detailed findings recorded.')}

    ${repeatSection(
      'Waste findings',
      state.wasteItems,
      (item) =>
        `<li><strong>${safe(item.item) || 'Unspecified item'}</strong>${
          num(item.cost) > 0 ? ` • Estimated impact: ${fmtCurrency(num(item.cost))}` : ''
        }<br />Cause: ${safe(item.cause) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No waste findings recorded.'
    )}

    ${repeatSection(
      'Over-portioning findings',
      state.portionItems,
      (item) =>
        `<li><strong>${safe(item.dish) || 'Unspecified dish'}</strong>${
          num(item.loss) > 0 ? ` • Estimated weekly loss: ${fmtCurrency(num(item.loss))}` : ''
        }<br />Issue: ${safe(item.issue) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No over-portioning findings recorded.'
    )}

    ${repeatSection(
      'Ordering and stock-control findings',
      state.orderingItems,
      (item) =>
        `<li><strong>${safe(item.category) || 'Unspecified category'}</strong><br />Problem: ${safe(item.problem) || 'Not recorded'}<br />Commercial impact: ${safe(item.impact) || 'Not recorded'}<br />Recommended fix: ${safe(item.fix) || 'Not recorded'}</li>`,
      'No ordering issues recorded.'
    )}

    <h2>Kitchen layout review</h2>
    <div class="report-columns">
      <div>
        <h3>Strengths</h3>
        <p>${safe(state.layoutStrengths) || '<span class="muted-copy">No strengths recorded.</span>'}</p>
      </div>
      <div>
        <h3>Issues</h3>
        <p>${safe(state.layoutIssues) || '<span class="muted-copy">No issues recorded.</span>'}</p>
      </div>
    </div>

    <div class="report-columns">
      <div>
        <h3>Equipment and space requirements</h3>
        <p>${safe(state.equipmentNeeds) || '<span class="muted-copy">No equipment recommendations recorded.</span>'}</p>
      </div>
      <div>
        <h3>Commercial impact</h3>
        <p>${safe(state.layoutImpact) || '<span class="muted-copy">No commercial impact recorded.</span>'}</p>
      </div>
    </div>

    <h2>Prioritised action plan</h2>
    ${listHtml(priorityActions, 'No action plan recorded.')}

    <h2>Immediate quick wins</h2>
    ${listHtml(quickWins, 'No quick wins recorded.')}

    <h2>Long-term improvement strategy</h2>
    ${listHtml(longTerm, 'No long-term strategy recorded.')}

    <h2>Recommended follow-up</h2>
    <p>${
      safe(state.nextVisit) ||
      'Suggested next step: schedule a follow-up visit within 2 to 4 weeks to review progress and reset priorities.'
    }</p>
  `;
}

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

function completionSummary(form: AuditFormState) {
  const checkpoints = [
    safe(form.businessName),
    safe(form.location),
    safe(form.visitDate),
    form.weeklySales > 0 ? 'yes' : '',
    form.weeklyFoodCost > 0 ? 'yes' : '',
    safe(form.summary),
    safe(form.foodQuality),
    safe(form.cultureLeadership),
    safe(form.systems),
    safe(form.layoutIssues) || safe(form.layoutStrengths),
    safe(form.quickWins) || safe(form.priorityActions),
    form.wasteItems.some((item) => safe(item.item)) ? 'yes' : '',
    form.portionItems.some((item) => safe(item.dish)) ? 'yes' : '',
    form.orderingItems.some((item) => safe(item.category)) ? 'yes' : ''
  ];

  const complete = checkpoints.filter(Boolean).length;
  const total = checkpoints.length;
  const percent = Math.round((complete / total) * 100);

  return { complete, total, percent };
}

type InsightTone = 'success' | 'warning' | 'danger';

type InsightItem = {
  tone: InsightTone;
  title: string;
  detail: string;
};

function buildAuditInsights(
  form: AuditFormState,
  calc: ReturnType<typeof calculateAudit>
): InsightItem[] {
  const insights: InsightItem[] = [];

  if (form.weeklySales <= 0 || form.weeklyFoodCost <= 0) {
    insights.push({
      tone: 'warning',
      title: 'Commercial baseline missing',
      detail: 'Add weekly sales and food cost to unlock the strongest GP analysis.'
    });
  }

  if (form.weeklySales > 0 && calc.gpGap > 2) {
    insights.push({
      tone: 'danger',
      title: `GP below target by ${calc.gpGap.toFixed(1)} points`,
      detail: 'This is likely the biggest commercial pressure point and should drive the action plan.'
    });
  }

  if (form.weeklySales > 0 && calc.gpGap <= 0) {
    insights.push({
      tone: 'success',
      title: 'GP is on or above target',
      detail: 'Use the audit to protect consistency, control waste, and lock the standard in.'
    });
  }

  if (calc.wastePercent >= 2) {
    insights.push({
      tone: 'danger',
      title: `Waste is running at ${fmtPercent(calc.wastePercent)}`,
      detail: 'This suggests an immediate need for tighter prep, holding, and waste tracking.'
    });
  } else if (form.actualWasteValue > 0) {
    insights.push({
      tone: 'warning',
      title: 'Waste is recorded',
      detail: 'There is enough waste value here to justify a daily tracking routine and category review.'
    });
  }

  if (calc.portionRisk === 'High') {
    insights.push({
      tone: 'danger',
      title: 'High portion-control risk',
      detail: 'Portion inconsistency is likely hitting margin and should be standardised quickly.'
    });
  } else if (calc.portionRisk === 'Moderate') {
    insights.push({
      tone: 'warning',
      title: 'Moderate portion-control risk',
      detail: 'This should still be tightened with recipe cards, tools, and station checks.'
    });
  }

  if (form.labourPercent >= 30) {
    insights.push({
      tone: 'danger',
      title: `Labour pressure at ${fmtPercent(form.labourPercent)}`,
      detail: 'Review layout, prep flow, staffing patterns, and kitchen discipline.'
    });
  } else if (form.labourPercent > 0 && form.labourPercent >= 24) {
    insights.push({
      tone: 'warning',
      title: 'Labour is worth watching',
      detail: 'Use the audit to test whether layout and systems are making labour heavier than it should be.'
    });
  }

  if (form.orderingItems.some((item) => safe(item.category))) {
    insights.push({
      tone: 'warning',
      title: 'Ordering control issues recorded',
      detail: 'These should translate into a simple control routine with ownership, pars, and review points.'
    });
  }

  if (safe(form.layoutIssues)) {
    insights.push({
      tone: 'warning',
      title: 'Layout issues could be affecting output',
      detail: 'The report should show how flow, motion, storage, or service bottlenecks hurt performance.'
    });
  }

  if (!insights.length) {
    insights.push({
      tone: 'success',
      title: 'Audit workspace is ready',
      detail: 'Start entering commercial and operational findings to build the final report.'
    });
  }

  return insights.slice(0, 6);
}

function toneClass(tone: InsightTone) {
  if (tone === 'danger') return 'status-pill status-danger';
  if (tone === 'warning') return 'status-pill status-warning';
  return 'status-pill status-success';
}

type ArrayKeys = 'wasteItems' | 'portionItems' | 'orderingItems';

type TextareaFieldKey =
  | 'summary'
  | 'cultureLeadership'
  | 'foodQuality'
  | 'systems'
  | 'layoutStrengths'
  | 'layoutIssues'
  | 'equipmentNeeds'
  | 'layoutImpact'
  | 'quickWins'
  | 'longTermStrategy'
  | 'priorityActions'
  | 'nextVisit';

const sectionLinks = [
  { href: '#audit-site-details', label: 'Site details' },
  { href: '#audit-commercial', label: 'Commercial' },
  { href: '#audit-observations', label: 'Observations' },
  { href: '#audit-waste', label: 'Waste' },
  { href: '#audit-portion', label: 'Portioning' },
  { href: '#audit-ordering', label: 'Ordering' },
  { href: '#audit-layout', label: 'Layout' },
  { href: '#audit-actions', label: 'Action plan' }
];

const textareaFields: Array<{ key: TextareaFieldKey; label: string }> = [
  { key: 'summary', label: 'Executive summary' },
  { key: 'cultureLeadership', label: 'Leadership and kitchen culture' },
  { key: 'foodQuality', label: 'Food quality and offer' },
  { key: 'systems', label: 'Systems and controls' },
  { key: 'layoutStrengths', label: 'Layout strengths' },
  { key: 'layoutIssues', label: 'Layout issues' },
  { key: 'equipmentNeeds', label: 'Equipment and space requirements' },
  { key: 'layoutImpact', label: 'Commercial impact of layout' },
  { key: 'quickWins', label: 'Immediate quick wins (one per line)' },
  { key: 'longTermStrategy', label: 'Long-term strategy (one per line)' },
  { key: 'priorityActions', label: 'Priority actions (one per line)' },
  { key: 'nextVisit', label: 'Recommended follow-up' }
];

export function KitchenAuditPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<AuditFormState>(() =>
    createDefaultAudit(searchParams.get('client') || null)
  );
  const [savedAudits, setSavedAudits] = useState<SupabaseRecord<AuditFormState>[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Ready');
  const [loadingSaved, setLoadingSaved] = useState(true);

  const calc = useMemo(() => calculateAudit(form), [form]);
  const reportHtml = useMemo(() => makeAuditReport(form), [form]);
  const completion = useMemo(() => completionSummary(form), [form]);
  const insights = useMemo(() => buildAuditInsights(form, calc), [form, calc]);

  const refreshAudits = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const activeClientId = searchParams.get('client') || form.clientId || undefined;
      const rows = await listAudits(activeClientId || undefined);
      const sorted = [...rows].sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      });
      setSavedAudits(sorted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load audits.');
    } finally {
      setLoadingSaved(false);
    }
  }, [form.clientId, searchParams]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    refreshAudits();
  }, [refreshAudits]);

  useEffect(() => {
    const clientId = searchParams.get('client');
    const loadId = searchParams.get('load');

    if (clientId) {
      setForm((current) => ({ ...current, clientId }));
    }

    if (loadId) {
      getAuditById(loadId)
        .then((record) => {
          if (!record) return;

          setForm({
            ...record.data,
            id: record.id,
            clientId: record.client_id ?? record.data.clientId ?? null,
            createdAt: record.created_at,
            updatedAt: record.updated_at
          });

          setMessage(`Loaded "${record.title}".`);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  function updateField<K extends keyof AuditFormState>(key: K, value: AuditFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
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

  async function handleSave() {
    try {
      setIsSaving(true);
      const saved = await saveAudit(form);
      setForm({
        ...saved.data,
        id: saved.id,
        clientId: saved.client_id ?? saved.data.clientId ?? null,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      });
      setMessage('Audit saved to Supabase.');
      await refreshAudits();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLoad(record: SupabaseRecord<AuditFormState>) {
    setForm({
      ...record.data,
      id: record.id,
      clientId: record.client_id ?? record.data.clientId ?? null,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    });
    setMessage(`Loaded "${record.title}".`);
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this saved audit?')) return;

    try {
      await deleteAudit(id);
      if (form.id === id) {
        setForm(createDefaultAudit(searchParams.get('client') || null));
      }
      await refreshAudits();
      setMessage('Audit deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed.');
    }
  }

  function newAudit() {
    const activeClientId = searchParams.get('client') || null;
    setForm(createDefaultAudit(activeClientId));
    setMessage('Started a new audit.');
  }

  function exportJson() {
    downloadText(
      `${safe(form.businessName || 'audit').replace(/\s+/g, '-').toLowerCase()}.json`,
      JSON.stringify(form, null, 2),
      'application/json'
    );
  }

  function exportHtml() {
    const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Kitchen Profit Audit</title><style>body{font-family:Inter,Arial,sans-serif;max-width:980px;margin:40px auto;padding:0 20px;color:#0f172a;line-height:1.55}.report-meta,.report-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}h2{margin-top:28px;border-bottom:1px solid #dbe2ea;padding-bottom:8px}.report-meta div{padding:12px;background:#f8fafc;border:1px solid #dbe2ea;border-radius:12px}.muted-copy{color:#64748b}</style></head><body>${reportHtml}</body></html>`;
    downloadText(
      `${safe(form.businessName || 'audit-report').replace(/\s+/g, '-').toLowerCase()}.html`,
      html,
      'text/html'
    );
  }

  function loadFromJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((content) => {
        const parsed = JSON.parse(content) as AuditFormState;
        setForm(parsed);
        setMessage('Audit JSON loaded.');
      })
      .catch(() => setMessage('Could not read the selected JSON file.'));

    event.target.value = '';
  }

  return (
    <div className="page-stack">
      <section className="page-heading audit-hero">
        <div className="audit-hero-grid">
          <div className="audit-hero-copy">
            <div className="brand-badge">Kitchen Profit Audit</div>
            <h2>Advanced audit workstation</h2>
            <p>
              This page is now designed to feel like a real consultancy operating system:
              capture findings fast, surface the main risks automatically, and build a
              client-ready report as you work.
            </p>

            <div className="hero-actions">
              <button className="button button-secondary" onClick={newAudit}>
                New audit
              </button>
              <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save to Supabase'}
              </button>
              <button className="button button-secondary" onClick={exportJson}>
                Export JSON
              </button>
              <button className="button button-secondary" onClick={exportHtml}>
                Export HTML
              </button>
              <label className="button button-secondary inline-file-button">
                Load JSON
                <input accept="application/json" hidden type="file" onChange={loadFromJson} />
              </label>
            </div>
          </div>

          <div className="audit-summary-card">
            <div className="audit-summary-top">
              <span className={scoreClass(calc.score)}>
                {scoreLabel(calc.score)} • {calc.score}/100
              </span>
              <div className="audit-summary-meta">{message}</div>
            </div>

            <div className="audit-summary-grid">
              <div className="audit-summary-item">
                <span>Completion</span>
                <strong>{completion.percent}%</strong>
              </div>
              <div className="audit-summary-item">
                <span>GP gap</span>
                <strong>
                  {form.weeklySales > 0 ? `${calc.gpGap.toFixed(1)} pts` : 'Awaiting data'}
                </strong>
              </div>
              <div className="audit-summary-item">
                <span>Waste</span>
                <strong>
                  {form.actualWasteValue > 0 ? fmtPercent(calc.wastePercent) : 'Not logged'}
                </strong>
              </div>
              <div className="audit-summary-item">
                <span>Portion risk</span>
                <strong>{calc.portionRisk}</strong>
              </div>
            </div>

            <div className="audit-progress-block">
              <div className="audit-progress-row">
                <strong>Audit progress</strong>
                <span>
                  {completion.complete}/{completion.total} checkpoints
                </span>
              </div>
              <div className="audit-progress-track">
                <div className="audit-progress-fill" style={{ width: `${completion.percent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard
          label="Actual GP"
          value={fmtPercent(calc.actualGp)}
          hint="Calculated from sales and food cost"
        />
        <StatCard
          label="Waste %"
          value={fmtPercent(calc.wastePercent)}
          hint="Waste value as % of weekly sales"
        />
        <StatCard
          label="Portion risk"
          value={calc.portionRisk}
          hint="Based on over-portioning findings"
        />
        <StatCard
          label="Priority score"
          value={`${calc.score}/100`}
          hint="Automatic urgency score for this visit"
        />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Audit input workspace</h3>
                <p className="muted-copy">
                  Work section by section and keep the most important parts of the visit structured.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="sub-panel audit-nav-panel">
                <div className="sub-panel-header">
                  <h4>Jump to section</h4>
                  <span className="soft-pill">Fast navigation</span>
                </div>
                <div className="audit-section-nav">
                  {sectionLinks.map((section) => (
                    <a className="audit-section-link" href={section.href} key={section.href}>
                      {section.label}
                    </a>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-site-details">
                <h4>Site details</h4>
                <div className="form-grid">
                  <label className="field">
                    <span>Report title</span>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Business name</span>
                    <input
                      className="input"
                      value={form.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Location</span>
                    <input
                      className="input"
                      value={form.location}
                      onChange={(e) => updateField('location', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Visit date</span>
                    <input
                      className="input"
                      type="date"
                      value={form.visitDate}
                      onChange={(e) => updateField('visitDate', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Consultant</span>
                    <input
                      className="input"
                      value={form.consultantName}
                      onChange={(e) => updateField('consultantName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Site contact</span>
                    <input
                      className="input"
                      value={form.contactName}
                      onChange={(e) => updateField('contactName', e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span>Client profile</span>
                    <select
                      className="input"
                      value={form.clientId || ''}
                      onChange={(e) => updateField('clientId', e.target.value || null)}
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.company_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Audit type</span>
                    <select
                      className="input"
                      value={form.auditType}
                      onChange={(e) => updateField('auditType', e.target.value)}
                    >
                      <option>Operational Audit</option>
                      <option>Menu & GP Review</option>
                      <option>Kitchen Layout Review</option>
                      <option>New Opening Support</option>
                      <option>Chef Mentoring Visit</option>
                    </select>
                  </label>
                </div>

                {form.clientId ? (
                  <div className="header-actions">
                    <Link className="button button-ghost" to={`/clients/${form.clientId}`}>
                      Open client profile
                    </Link>
                  </div>
                ) : null}
              </section>

              <section className="sub-panel" id="audit-commercial">
                <div className="sub-panel-header">
                  <h4>Commercial snapshot</h4>
                  <span className="soft-pill">Profit and control</span>
                </div>

                <div className="form-grid">
                  <label className="field">
                    <span>Weekly food sales (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.weeklySales}
                      onChange={(e) => updateField('weeklySales', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Weekly food cost (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.weeklyFoodCost}
                      onChange={(e) => updateField('weeklyFoodCost', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Target GP %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.targetGp}
                      onChange={(e) => updateField('targetGp', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Weekly waste (£)</span>
                    <input
                      className="input"
                      type="number"
                      value={form.actualWasteValue}
                      onChange={(e) => updateField('actualWasteValue', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Kitchen labour %</span>
                    <input
                      className="input"
                      type="number"
                      value={form.labourPercent}
                      onChange={(e) => updateField('labourPercent', num(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span>Ordering control</span>
                    <select
                      className="input"
                      value={form.orderingScore}
                      onChange={(e) =>
                        updateField(
                          'orderingScore',
                          e.target.value as AuditFormState['orderingScore']
                        )
                      }
                    >
                      <option value="Low">Low</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                </div>

                <div className="audit-chip-row">
                  <div className="audit-chip">
                    <strong>GP position</strong>
                    <span>
                      {form.weeklySales > 0
                        ? calc.gpGap > 0
                          ? `${calc.gpGap.toFixed(1)} points below target`
                          : 'On or above target'
                        : 'Awaiting numbers'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Waste reading</strong>
                    <span>
                      {form.actualWasteValue > 0
                        ? `${fmtCurrency(form.actualWasteValue)} per week`
                        : 'No waste value logged'}
                    </span>
                  </div>
                  <div className="audit-chip">
                    <strong>Labour reading</strong>
                    <span>
                      {form.labourPercent > 0
                        ? `${fmtPercent(form.labourPercent)} kitchen labour`
                        : 'No labour data logged'}
                    </span>
                  </div>
                </div>
              </section>

              <section className="sub-panel" id="audit-observations">
                <div className="sub-panel-header">
                  <h4>Operational observations</h4>
                  <span className="soft-pill">Quality and systems</span>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(0, 4).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-waste">
                <div className="sub-panel-header">
                  <h4>Waste findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('wasteItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.wasteItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.item) || 'Waste record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('wasteItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Item or area</span>
                          <input
                            className="input"
                            value={item.item}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'item',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Estimated impact (£)</span>
                          <input
                            className="input"
                            type="number"
                            value={item.cost}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'cost',
                                num(e.target.value)
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Cause</span>
                          <input
                            className="input"
                            value={item.cause}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'cause',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditWasteItem>(
                                'wasteItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-portion">
                <div className="sub-panel-header">
                  <h4>Over-portioning findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('portionItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.portionItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.dish) || 'Portioning record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('portionItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Dish or product</span>
                          <input
                            className="input"
                            value={item.dish}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'dish',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Estimated weekly loss (£)</span>
                          <input
                            className="input"
                            type="number"
                            value={item.loss}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'loss',
                                num(e.target.value)
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Issue</span>
                          <input
                            className="input"
                            value={item.issue}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'issue',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditPortionItem>(
                                'portionItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-ordering">
                <div className="sub-panel-header">
                  <h4>Ordering and stock-control findings</h4>
                  <button
                    className="button button-secondary"
                    onClick={() => addRepeatItem('orderingItems')}
                  >
                    Add record
                  </button>
                </div>
                <div className="stack gap-12">
                  {form.orderingItems.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <strong>{safe(item.category) || 'Ordering record'}</strong>
                        <button
                          className="button button-ghost"
                          onClick={() => removeRepeatItem('orderingItems', item.id)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid">
                        <label className="field">
                          <span>Category or supplier</span>
                          <input
                            className="input"
                            value={item.category}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'category',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Problem</span>
                          <input
                            className="input"
                            value={item.problem}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'problem',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Commercial impact</span>
                          <input
                            className="input"
                            value={item.impact}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'impact',
                                e.target.value
                              )
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Recommended fix</span>
                          <input
                            className="input"
                            value={item.fix}
                            onChange={(e) =>
                              updateRepeatItem<AuditOrderingItem>(
                                'orderingItems',
                                item.id,
                                'fix',
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-layout">
                <div className="sub-panel-header">
                  <h4>Kitchen layout review</h4>
                  <span className="soft-pill">Flow and efficiency</span>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(4, 8).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="sub-panel" id="audit-actions">
                <div className="sub-panel-header">
                  <h4>Action planning and follow-up</h4>
                  <span className="soft-pill">Client outcomes</span>
                </div>
                <div className="form-grid two-columns">
                  {textareaFields.slice(8).map((field) => (
                    <label className="field" key={field.key}>
                      <span>{field.label}</span>
                      <textarea
                        className="input textarea"
                        value={form[field.key]}
                        onChange={(e) => updateField(field.key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <aside className="workspace-side stack gap-20">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Audit control</h3>
                <p className="muted-copy">
                  The dashboard for this single audit: readiness, risks, and next focus.
                </p>
              </div>
            </div>

            <div className="panel-body stack gap-20">
              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Readiness</h4>
                  <span className="soft-pill">{completion.percent}% complete</span>
                </div>

                <div className="audit-progress-track">
                  <div
                    className="audit-progress-fill"
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>

                <div className="audit-side-meta">
                  {completion.complete} of {completion.total} key checkpoints completed
                </div>
              </section>

              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Automatic insights</h4>
                  <span className="soft-pill">{insights.length}</span>
                </div>

                <div className="audit-insight-list">
                  {insights.map((insight, index) => (
                    <div className="audit-insight-card" key={`${insight.title}-${index}`}>
                      <div className="audit-insight-top">
                        <strong>{insight.title}</strong>
                        <span className={toneClass(insight.tone)}>{insight.tone}</span>
                      </div>
                      <p>{insight.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Consultancy snapshot</h4>
                </div>

                <div className="audit-chip-row audit-chip-row-vertical">
                  <div className="audit-chip">
                    <strong>Current site</strong>
                    <span>{safe(form.businessName) || 'Unnamed site'}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Visit date</strong>
                    <span>{safe(form.visitDate) || 'Not set'}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Main output</strong>
                    <span>Live report preview and action plan</span>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Generated report</h3>
                <p className="muted-copy">Live preview from the current audit state.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="report-preview" dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Saved audits</h3>
                <p className="muted-copy">
                  {form.clientId
                    ? 'Saved audits for the selected client.'
                    : 'Stored per logged-in user in Supabase.'}
                </p>
              </div>
            </div>
            <div className="panel-body stack gap-12">
              {loadingSaved ? <div className="muted-copy">Loading saved audits...</div> : null}
              {!loadingSaved && savedAudits.length === 0 ? (
                <div className="muted-copy">No audits saved yet.</div>
              ) : null}

              {savedAudits.map((record) => (
                <div className="saved-item" key={record.id}>
                  <div>
                    <strong>{record.title}</strong>
                    <div className="saved-meta">
                      {record.site_name || 'Unnamed site'} •{' '}
                      {formatShortDate(record.review_date || record.updated_at)}
                    </div>
                  </div>
                  <div className="saved-actions">
                    <button className="button button-ghost" onClick={() => handleLoad(record)}>
                      Load
                    </button>
                    <button
                      className="button button-ghost danger-text"
                      onClick={() => handleDelete(record.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}