import type { AuditActionItem, AuditFormState } from '../../types';
import { calculateKitchenProfitMetrics, buildKitchenProfitNarrative } from '../../features/profit/kitchenProfit';
import { safe } from '../../lib/utils';
import {
  buildReportCoverHtml,
  buildChapterHtml,
  buildSectionHtml,
  formatCurrencyShort,
  escapeHtml,
  normalizeProseText,
  buildReportBodyHtml,
  buildSummaryGridHtml,
  buildRecommendationListHtml,
  buildCalloutHtml,
  buildActionCardsHtml
} from './index';

function sortAuditActionsByPriority(items: AuditActionItem[]) {
  const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  return [...items].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
}

/**
 * Executive-summary PDF for Kitchen Profit Audit: concise client-facing export.
 * Full operational detail remains in the shared HTML / portal view.
 */
export function buildKitchenAuditPdf(audit: AuditFormState): string {
  const metrics = calculateKitchenProfitMetrics(audit);
  const narrative = buildKitchenProfitNarrative(audit, metrics);
  const namedActions = audit.actionItems.filter((item) => safe(item.title));
  const topActions = sortAuditActionsByPriority(namedActions).slice(0, 5);
  const preparedDate = audit.visitDate || new Date().toISOString().split('T')[0];

  const execSummary =
    narrative.executiveSummary || audit.summary || 'Commercial review of margin, controls, and recovery opportunity.';

  const keyFindings = narrative.keyIssues.slice(0, 8);

  const nextStepsLines = [
    ...narrative.actionPlan30To90Days.slice(0, 5),
    ...(narrative.followUpRecommendation ? [narrative.followUpRecommendation] : []),
    ...(audit.nextVisit ? [`Next visit: ${audit.nextVisit}`] : [])
  ].filter((line) => safe(line));

  const coverHtml = buildReportCoverHtml({
    clientName: safe(audit.businessName) || 'Client Site',
    reportType: 'Kitchen Profit Audit',
    preparedDate,
    consultant: safe(audit.consultantName) || 'The Final Check',
    metrics: [
      {
        label: 'Weekly opportunity',
        value: formatCurrencyShort(metrics.totalWeeklyOpportunity),
        primary: true
      },
      { label: 'Annual opportunity', value: formatCurrencyShort(metrics.totalAnnualOpportunity) },
      { label: 'Control compliance', value: `${Math.round(metrics.controlScore)}%` }
    ],
    details: [
      { label: 'Site', value: safe(audit.businessName) || 'Not recorded' },
      { label: 'Location', value: safe(audit.location) || 'Not recorded' },
      { label: 'Visit date', value: safe(audit.visitDate) || preparedDate },
      { label: 'Consultant', value: safe(audit.consultantName) || 'Not recorded' }
    ],
    summary: execSummary
  });

  const summaryChapter = buildChapterHtml({
    kicker: 'Executive summary',
    title: 'Kitchen Profit Audit — Overview',
    lead: 'A short, decision-ready view of performance, findings, and recovery opportunity.',
    body: `
      ${buildSectionHtml('Executive summary', `<p>${escapeHtml(normalizeProseText(execSummary))}</p>`)}

      ${buildSummaryGridHtml([
        {
          label: 'Weekly opportunity',
          value: formatCurrencyShort(metrics.totalWeeklyOpportunity),
          detail: `Annualised: ${formatCurrencyShort(metrics.totalAnnualOpportunity)}.`
        },
        {
          label: 'GP position',
          value: `${metrics.actualGp.toFixed(1)}%`,
          detail:
            metrics.gpGap > 0
              ? `${metrics.gpGap.toFixed(1)} pt gap vs ${audit.targetGp}% target.`
              : 'At or above target GP.'
        },
        {
          label: 'Weekly waste loss',
          value: formatCurrencyShort(metrics.weeklyWasteLoss),
          detail: `${metrics.wastePercent.toFixed(1)}% of sales (estimated).`
        },
        {
          label: 'Labour',
          value: `${audit.labourPercent}%`,
          detail: `Target ${audit.targetLabourPercent}%.`
        }
      ])}

      ${buildSectionHtml(
        'Key findings',
        buildRecommendationListHtml(keyFindings, 'No major issues recorded in the generated narrative.')
      )}
    `
  });

  const actionsChapter = buildChapterHtml({
    kicker: 'Actions',
    title: 'Priority Actions & Next Steps',
    lead: 'Focus on the highest-priority moves first; full detail and registers sit in the online report.',
    body: `
      ${
        topActions.length
          ? buildSectionHtml('Top actions', buildActionCardsHtml(topActions))
          : buildCalloutHtml('No named actions were recorded in this audit yet.', { variant: 'neutral' })
      }

      ${buildSectionHtml(
        'Next steps',
        buildRecommendationListHtml(
          nextStepsLines,
          'Add narrative and follow-up notes in the audit workspace to populate this section.'
        )
      )}
    `
  });

  return [coverHtml, buildReportBodyHtml([summaryChapter, actionsChapter], 'consultancy')].join('');
}
