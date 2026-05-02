import type { AuditFormState } from '../../types';
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
  buildActionRegisterHtml,
  buildReportPhotoGalleryHtml,
  buildCalloutHtml,
  buildKpiHeroHtml,
  buildActionCardsHtml,
  buildStatusCell,
  hasReportContent
} from './index';

function statusColor(status: string): string {
  return buildStatusCell(status);
}

export function buildKitchenAuditPdf(audit: AuditFormState): string {
  const metrics = calculateKitchenProfitMetrics(audit);
  const narrative = buildKitchenProfitNarrative(audit, metrics);
  const namedActions = audit.actionItems.filter((item) => safe(item.title));
  const criticalHighActions = namedActions.filter(
    (item) => item.priority === 'Critical' || item.priority === 'High'
  );
  const preparedDate = audit.visitDate || new Date().toISOString();

  const hasLayoutContent = [audit.layoutStrengths, audit.layoutIssues, audit.layoutImpact, audit.equipmentNeeds].some(
    (v) => hasReportContent(v)
  );
  const hasOperationsContent = audit.portionItems.length > 0 || audit.orderingItems.length > 0;
  const hasWasteItems = audit.wasteItems.length > 0;
  const hasLeadershipContent = hasReportContent(audit.cultureLeadership) || hasReportContent(audit.longTermStrategy);
  const hasObservations = [audit.quickWins, audit.systems, audit.foodQuality].some(hasReportContent);

  // ──────────────────────────────────────────────
  // COVER — commercial opportunity front and centre
  // ──────────────────────────────────────────────
  const coverHtml = buildReportCoverHtml({
    clientName: safe(audit.businessName) || 'Client Site',
    reportType: 'Kitchen Profit Audit',
    preparedDate,
    consultant: safe(audit.consultantName) || 'The Final Check',
    metrics: [
      {
        label: 'Recoverable Opportunity',
        value: formatCurrencyShort(metrics.totalWeeklyOpportunity),
        primary: true
      },
      { label: 'Actual GP', value: `${Math.round(metrics.actualGp)}%` },
      { label: 'Control Score', value: `${Math.round(metrics.controlScore)}%` }
    ],
    details: [
      { label: 'Location', value: safe(audit.location) },
      { label: 'Covers / Week', value: audit.coversPerWeek > 0 ? String(audit.coversPerWeek) : '' },
      { label: 'Average Spend', value: audit.averageSpend > 0 ? formatCurrencyShort(audit.averageSpend) : '' },
      { label: 'Kitchen Team', value: audit.kitchenTeamSize > 0 ? String(audit.kitchenTeamSize) : '' }
    ],
    summary: narrative.executiveSummary || audit.summary
  });

  // ──────────────────────────────────────────────
  // PAGE 2 — COMMERCIAL POSITION
  // KPI-anchored, narrative-led executive chapter
  // ──────────────────────────────────────────────
  const gpGap = Math.max(metrics.gpGap, 0);
  const gpStatusVariant =
    gpGap >= 5 ? 'risk' : gpGap >= 2 ? 'warn' : gpGap > 0 ? 'neutral' : 'good';

  const commercialBody = `
    ${buildKpiHeroHtml(
      formatCurrencyShort(metrics.totalWeeklyOpportunity),
      'Weekly Recoverable Opportunity',
      `Annualised run-rate: ${formatCurrencyShort(metrics.totalAnnualOpportunity)} if current controls remain unchanged.`
    )}

    ${buildSummaryGridHtml([
      {
        label: 'GP Position',
        value: `${metrics.actualGp.toFixed(1)}%`,
        detail: `Target ${audit.targetGp}%. ${gpGap > 0 ? `${gpGap.toFixed(1)} pt gap to close.` : 'On target.'}`
      },
      {
        label: 'Weekly Waste Loss',
        value: formatCurrencyShort(metrics.weeklyWasteLoss),
        detail: `${metrics.wastePercent.toFixed(1)}% of weekly sales estimated to waste.`
      },
      {
        label: 'Portion Risk',
        value: metrics.portionRisk,
        detail: `${formatCurrencyShort(metrics.totalPortionLoss)} estimated weekly portion loss.`
      },
      {
        label: 'Weekly Sales',
        value: formatCurrencyShort(audit.weeklySales),
        detail: `Food cost ${audit.weeklySales > 0 ? Math.round((audit.weeklyFoodCost / audit.weeklySales) * 100) : 0}% of sales.`
      },
      {
        label: 'Labour',
        value: `${audit.labourPercent}%`,
        detail: 'Kitchen labour as a percentage of revenue.'
      },
      {
        label: 'Open Actions',
        value: `${namedActions.length}`,
        detail: 'Named corrective actions recorded in this audit.'
      }
    ])}

    ${gpGap > 0
      ? buildCalloutHtml(
          `GP gap of ${gpGap.toFixed(1)} pts against a ${audit.targetGp}% target. Weekly sales of ${formatCurrencyShort(audit.weeklySales)} mean this gap represents approximately ${formatCurrencyShort((audit.weeklySales * gpGap) / 100)} per week in unrealised margin.`,
          { title: 'GP Gap', variant: gpStatusVariant }
        )
      : ''}

    ${buildSectionHtml(
      'Key findings',
      buildRecommendationListHtml(narrative.keyIssues, 'No major issues recorded.')
    )}

    ${buildSectionHtml(
      'Quick wins',
      buildRecommendationListHtml(
        narrative.quickWins,
        'No quick win recommendations recorded.'
      )
    )}

    ${narrative.followUpRecommendation
      ? buildCalloutHtml(narrative.followUpRecommendation, { title: 'Follow-Up Recommendation', variant: 'neutral' })
      : ''}

    ${hasWasteItems
      ? buildSectionHtml(
          'Waste Items',
          `<table class="report-table report-table-compact">
            <thead>
              <tr>
                <th>Item</th>
                <th>Weekly Cost</th>
                <th>Root Cause</th>
                <th>Fix</th>
              </tr>
            </thead>
            <tbody>
              ${audit.wasteItems
                .map(
                  (item) => `
                <tr>
                  <td>${escapeHtml(item.item)}</td>
                  <td>${formatCurrencyShort(item.cost)}</td>
                  <td>${escapeHtml(item.cause)}</td>
                  <td>${escapeHtml(item.fix)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        )
      : ''}
  `;

  const commercialChapter = buildChapterHtml({
    kicker: 'Commercial Position',
    title: 'Profit Analysis & Recovery Opportunity',
    lead:
      narrative.executiveSummary ||
      'Commercial performance review, margin gap analysis, and recovery opportunity identified during the audit.',
    body: commercialBody
  });

  // ──────────────────────────────────────────────
  // PAGE 3 — PRIORITY ACTIONS
  // Editorial action cards + action register
  // ──────────────────────────────────────────────
  const actionsToCard = criticalHighActions.length ? criticalHighActions : namedActions.slice(0, 5);
  const remainingActions = namedActions.filter((a) => !actionsToCard.includes(a));

  const prioritiesBody = `
    ${actionsToCard.length
      ? buildSectionHtml(
          criticalHighActions.length ? 'Critical & High Priority' : 'Priority Actions',
          buildActionCardsHtml(actionsToCard)
        )
      : buildCalloutHtml(
          'No critical or high priority actions were recorded in this audit.',
          { variant: 'good' }
        )}

    ${narrative.actionPlan30To90Days?.length
      ? buildSectionHtml(
          '30 to 90 Day Programme',
          buildRecommendationListHtml(narrative.actionPlan30To90Days)
        )
      : ''}

    ${remainingActions.length
      ? buildSectionHtml(
          'Full Action Register',
          buildActionRegisterHtml(remainingActions)
        )
      : namedActions.length
        ? buildSectionHtml('Action Register', buildActionRegisterHtml(namedActions))
        : ''}

    ${safe(audit.nextVisit)
      ? buildCalloutHtml(`Next scheduled visit: ${normalizeProseText(audit.nextVisit)}`, {
          title: 'Next Review',
          variant: 'neutral'
        })
      : ''}
  `;

  const prioritiesChapter = buildChapterHtml({
    kicker: 'Action Plan',
    title: 'Priority Actions & Next Steps',
    lead:
      'Critical and high priority items requiring immediate management response, followed by the 30 to 90 day programme.',
    body: prioritiesBody
  });

  // ──────────────────────────────────────────────
  // PAGE 4 — CONTROLS REGISTER
  // ──────────────────────────────────────────────
  const controlsWithData = audit.controlChecks.filter((c) => safe(c.label));
  const inPlaceCount = controlsWithData.filter((c) => c.status === 'In Place').length;
  const partialCount = controlsWithData.filter((c) => c.status === 'Partial').length;
  const notInPlaceCount = controlsWithData.filter((c) => c.status === 'Missing').length;

  const controlsBody = controlsWithData.length
    ? `
      ${buildCalloutHtml(
        `${inPlaceCount} of ${controlsWithData.length} controls in place — ${partialCount} partial, ${notInPlaceCount} missing.`,
        {
          variant: notInPlaceCount >= 4 ? 'risk' : notInPlaceCount >= 2 ? 'warn' : 'neutral'
        }
      )}
      <table class="report-table report-table-tight">
        <thead>
          <tr>
            <th style="width: 58%">Control Check</th>
            <th style="width: 22%">Category</th>
            <th style="width: 20%">Status</th>
          </tr>
        </thead>
        <tbody>
          ${controlsWithData
            .map(
              (c) => `
            <tr>
              <td>${escapeHtml(c.label)}</td>
              <td>${escapeHtml(c.category)}</td>
              <td>${statusColor(c.status)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '';

  const controlsChapter = controlsBody
    ? buildChapterHtml({
        kicker: 'Controls Audit',
        title: 'Systems & Compliance Checklist',
        lead: `Operational control assessment across ${controlsWithData.length} checks covering GP management, stock, waste, and kitchen process compliance.`,
        body: controlsBody
      })
    : '';

  // ──────────────────────────────────────────────
  // PAGE 5 — OPERATIONAL DETAIL (combined)
  // Only included if any section has content
  // ──────────────────────────────────────────────
  const operationalSections: string[] = [];

  if (hasObservations) {
    if (hasReportContent(audit.quickWins)) {
      operationalSections.push(
        buildSectionHtml('Strengths Observed', `<p>${escapeHtml(normalizeProseText(audit.quickWins))}</p>`)
      );
    }
    if (hasReportContent(audit.systems)) {
      operationalSections.push(
        buildSectionHtml('Areas for Improvement', `<p>${escapeHtml(normalizeProseText(audit.systems))}</p>`)
      );
    }
    if (hasReportContent(audit.foodQuality)) {
      operationalSections.push(
        buildSectionHtml('Food Quality', `<p>${escapeHtml(normalizeProseText(audit.foodQuality))}</p>`)
      );
    }
  }

  if (hasLayoutContent) {
    const layoutParts = [audit.layoutStrengths, audit.layoutIssues, audit.layoutImpact]
      .filter(hasReportContent)
      .map((v) => `<p>${escapeHtml(normalizeProseText(v))}</p>`)
      .join('');
    if (layoutParts) operationalSections.push(buildSectionHtml('Kitchen Layout & Flow', layoutParts));
    if (hasReportContent(audit.equipmentNeeds)) {
      operationalSections.push(
        buildSectionHtml('Equipment Condition', `<p>${escapeHtml(normalizeProseText(audit.equipmentNeeds))}</p>`)
      );
    }
  }

  if (hasOperationsContent) {
    if (audit.portionItems.length > 0) {
      operationalSections.push(
        buildSectionHtml(
          'Portion Control',
          `<table class="report-table report-table-compact">
            <thead>
              <tr>
                <th>Dish</th>
                <th>Loss %</th>
                <th>Issue</th>
                <th>Fix</th>
              </tr>
            </thead>
            <tbody>
              ${audit.portionItems
                .map(
                  (item) => `
                <tr>
                  <td>${escapeHtml(item.dish)}</td>
                  <td>${item.loss}%</td>
                  <td>${escapeHtml(item.issue)}</td>
                  <td>${escapeHtml(item.fix)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        )
      );
    }
    if (audit.orderingItems.length > 0) {
      operationalSections.push(
        buildSectionHtml(
          'Ordering & Stock',
          `<table class="report-table report-table-compact">
            <thead>
              <tr>
                <th>Category</th>
                <th>Problem</th>
                <th>Impact</th>
                <th>Fix</th>
              </tr>
            </thead>
            <tbody>
              ${audit.orderingItems
                .map(
                  (item) => `
                <tr>
                  <td>${escapeHtml(item.category)}</td>
                  <td>${escapeHtml(item.problem)}</td>
                  <td>${escapeHtml(item.impact)}</td>
                  <td>${escapeHtml(item.fix)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        )
      );
    }
  }

  const photoGallery = buildReportPhotoGalleryHtml(audit.photos, 'summary');
  if (photoGallery) operationalSections.push(photoGallery);

  const operationalChapter =
    operationalSections.length > 0
      ? buildChapterHtml({
          kicker: 'Operational Findings',
          title: 'On-Site Observations & Processes',
          lead: 'Kitchen observations, layout assessment, portion and ordering processes reviewed during the visit.',
          body: operationalSections.join('')
        })
      : '';

  // ──────────────────────────────────────────────
  // PAGE 6 — LEADERSHIP & CLOSE (conditional)
  // ──────────────────────────────────────────────
  const leadershipBody = hasLeadershipContent
    ? `
      ${hasReportContent(audit.cultureLeadership)
        ? buildSectionHtml('Culture & Leadership', `<p>${escapeHtml(normalizeProseText(audit.cultureLeadership))}</p>`)
        : ''}
      ${hasReportContent(audit.longTermStrategy)
        ? `<div style="margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--pdf-line-soft);">
            <h3 style="margin-bottom: 10px; font-size: 15px;">Closing Summary</h3>
            <p>${escapeHtml(normalizeProseText(audit.longTermStrategy))}</p>
           </div>`
        : ''}
    `
    : '';

  const leadershipChapter = leadershipBody
    ? buildChapterHtml({
        kicker: 'Leadership',
        title: 'Operating Culture & Long-Term Direction',
        lead: 'Culture, team dynamic, and strategic context for the long-term management response.',
        body: leadershipBody
      })
    : '';

  return [
    coverHtml,
    buildReportBodyHtml([
      commercialChapter,
      prioritiesChapter,
      controlsChapter,
      operationalChapter,
      leadershipChapter
    ])
  ].join('');
}
