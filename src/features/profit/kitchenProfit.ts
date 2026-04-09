import type { AuditFormState } from '../../types';
import { num, safe } from '../../lib/utils';

export type KitchenProfitMetrics = {
  actualGp: number;
  gpGap: number;
  wastePercent: number;
  weeklyWasteLoss: number;
  annualWasteLoss: number;
  totalPortionLoss: number;
  annualPortionLoss: number;
  labourOpportunityValue: number;
  gpOpportunityValue: number;
  totalWeeklyOpportunity: number;
  totalAnnualOpportunity: number;
  portionRisk: 'Low' | 'Moderate' | 'High';
  score: number;
  operationsAverage: number;
  estimatedWeeklySales: number;
  controlScore: number;
  missingControls: number;
  criticalMissingControls: number;
  totalNamedActions: number;
};

export type KitchenProfitNarrative = {
  executiveSummary: string;
  keyIssues: string[];
  quickWins: string[];
  actionPlan30To90Days: string[];
  followUpRecommendation: string;
};

export function calculateKitchenProfitMetrics(state: AuditFormState): KitchenProfitMetrics {
  const weeklySales = num(state.weeklySales);
  const weeklyFoodCost = num(state.weeklyFoodCost);
  const actualGp = weeklySales > 0 ? ((weeklySales - weeklyFoodCost) / weeklySales) * 100 : 0;
  const gpGap = num(state.targetGp) - actualGp;
  const weeklyWasteLoss = num(state.actualWasteValue);
  const wastePercent = weeklySales > 0 ? (weeklyWasteLoss / weeklySales) * 100 : 0;
  const annualWasteLoss = weeklyWasteLoss * 52;
  const totalPortionLoss = (state.portionItems ?? []).reduce((sum, item) => sum + num(item.loss), 0);
  const annualPortionLoss = totalPortionLoss * 52;
  const targetLabourPercent = num(state.targetLabourPercent);
  const labourOpportunityValue =
    weeklySales > 0 && num(state.labourPercent) > targetLabourPercent
      ? weeklySales * ((num(state.labourPercent) - targetLabourPercent) / 100)
      : 0;
  const gpOpportunityValue =
    weeklySales > 0 && gpGap > 0 ? weeklySales * (gpGap / 100) : 0;
  const totalWeeklyOpportunity =
    gpOpportunityValue + weeklyWasteLoss + totalPortionLoss + labourOpportunityValue;
  const totalAnnualOpportunity = totalWeeklyOpportunity * 52;

  const portionCount = (state.portionItems ?? []).filter((item) => safe(item.dish)).length;
  const portionRisk =
    portionCount >= 4 || totalPortionLoss >= 250
      ? 'High'
      : portionCount >= 2 || totalPortionLoss >= 100
        ? 'Moderate'
        : 'Low';

  const scoreValues = Object.values(state.categoryScores ?? {});
  const operationsAverage =
    scoreValues.length > 0
      ? scoreValues.reduce((sum, value) => sum + num(value), 0) / scoreValues.length
      : 0;

  const estimatedWeeklySales = num(state.coversPerWeek) * num(state.averageSpend);
  const activeControlChecks = (state.controlChecks ?? []).filter((item) => item.status !== 'N/A');
  const controlScore =
    activeControlChecks.length > 0
      ? (activeControlChecks.reduce((sum, item) => {
          if (item.status === 'In Place') return sum + 1;
          if (item.status === 'Partial') return sum + 0.5;
          return sum;
        }, 0) /
          activeControlChecks.length) *
        100
      : 0;
  const missingControls = activeControlChecks.filter((item) => item.status === 'Missing').length;
  const criticalMissingControls = activeControlChecks.filter(
    (item) =>
      item.status === 'Missing' &&
      ['Compliance', 'Food safety', 'Hygiene'].includes(item.category)
  ).length;
  const totalNamedActions = (state.actionItems ?? []).filter((item) => safe(item.title)).length;

  let score = 0;
  score += Math.max(0, Math.min(30, gpGap * 2));
  score += Math.max(0, Math.min(20, wastePercent * 4));
  score += Math.max(
    0,
    Math.min(15, targetLabourPercent > 0 ? num(state.labourPercent) - targetLabourPercent : 0)
  );
  score += Math.min(15, portionCount * 4);
  score += Math.min(10, (state.orderingItems ?? []).filter((item) => safe(item.category)).length * 2.5);
  score += Math.min(10, (state.wasteItems ?? []).filter((item) => safe(item.item)).length * 2.5);
  score += Math.max(0, Math.min(18, (8 - operationsAverage) * 5));
  score += state.hygieneRisk === 'High' ? 10 : state.hygieneRisk === 'Moderate' ? 5 : 0;
  score += state.allergenConfidence === 'Low' ? 10 : state.allergenConfidence === 'Moderate' ? 5 : 0;
  score += state.equipmentCondition === 'Poor' ? 8 : state.equipmentCondition === 'Mixed' ? 4 : 0;
  score += Math.min(14, missingControls * 2.5);
  score += criticalMissingControls * 4;

  return {
    actualGp,
    gpGap,
    wastePercent,
    weeklyWasteLoss,
    annualWasteLoss,
    totalPortionLoss,
    annualPortionLoss,
    labourOpportunityValue,
    gpOpportunityValue,
    totalWeeklyOpportunity,
    totalAnnualOpportunity,
    portionRisk,
    score: Math.min(100, Math.round(score)),
    operationsAverage,
    estimatedWeeklySales,
    controlScore,
    missingControls,
    criticalMissingControls,
    totalNamedActions
  };
}

export function buildKitchenProfitNarrative(
  state: AuditFormState,
  metrics: KitchenProfitMetrics
): KitchenProfitNarrative {
  const keyIssues: string[] = [];
  const quickWins: string[] = [];
  const actionPlan30To90Days: string[] = [];

  if (metrics.gpOpportunityValue > 0) {
    keyIssues.push(
      'The site is operating below target GP, indicating gaps in cost control, pricing discipline, or portion consistency.'
    );
    quickWins.push('Recost the highest-volume lines and reset recipe adherence on every profit-sensitive dish.');
    actionPlan30To90Days.push(
      'Embed a weekly GP review rhythm covering menu mix, recipe specs, supplier movement, and variance by section.'
    );
  }

  if (metrics.weeklyWasteLoss > 500) {
    keyIssues.push('Waste levels are excessive and are not being effectively managed or reviewed.');
    quickWins.push('Start a daily waste review with named ownership and category-level reporting.');
    actionPlan30To90Days.push(
      'Introduce prep planning, production controls, and weekly waste reporting into the kitchen management cadence.'
    );
  } else if (metrics.weeklyWasteLoss > 0) {
    keyIssues.push('Waste is creating avoidable margin erosion and should be managed with tighter daily controls.');
    quickWins.push('Review the biggest waste categories before the next delivery cycle.');
  }

  if (metrics.labourOpportunityValue > 0) {
    keyIssues.push('Labour deployment appears inefficient and requires optimisation.');
    quickWins.push('Review rota deployment, prep allocation, and service handovers against actual trading demand.');
    actionPlan30To90Days.push(
      'Reset section ownership, prep flow, and labour scheduling so wage spend tracks closer to target.'
    );
  }

  if (metrics.totalPortionLoss > 0) {
    keyIssues.push('Portion inconsistency is creating direct financial leakage on identified dishes.');
    quickWins.push('Implement scales, ladles, scoops, or plating guides on the dishes already showing loss.');
    actionPlan30To90Days.push(
      'Build a full portion-control standard with recipe cards, checks, and line coaching.'
    );
  }

  if (metrics.missingControls >= 3 || keyIssues.length >= 3) {
    keyIssues.push(
      'Operational systems are inconsistent, creating avoidable financial leakage and reducing accountability.'
    );
    actionPlan30To90Days.push(
      'Move the site onto one management system for waste, labour, ordering, production, and action tracking.'
    );
  }

  if (metrics.criticalMissingControls > 0) {
    keyIssues.push('Critical control gaps remain open and should be closed before the next service cycle.');
  }

  if (!quickWins.length) {
    quickWins.push('Confirm the live commercial baseline and convert the visit into named weekly actions.');
  }

  if (!actionPlan30To90Days.length) {
    actionPlan30To90Days.push(
      'Use the next 30 to 90 days to hardwire controls, review results weekly, and hold owners accountable.'
    );
  }

  const executiveSummary = [
    metrics.totalWeeklyOpportunity > 0
      ? `This site is carrying an estimated ${formatMoney(metrics.totalWeeklyOpportunity)} per week in recoverable profit opportunity.`
      : 'This site has a measurable opportunity to tighten controls and protect margin.',
    metrics.gpOpportunityValue > 0
      ? `The largest driver is the GP gap, currently worth approximately ${formatMoney(metrics.gpOpportunityValue)} per week.`
      : '',
    metrics.weeklyWasteLoss > 0
      ? `Waste is costing ${formatMoney(metrics.weeklyWasteLoss)} per week${metrics.labourOpportunityValue > 0 ? `, with further labour leakage of ${formatMoney(metrics.labourOpportunityValue)} per week` : ''}.`
      : metrics.labourOpportunityValue > 0
        ? `Labour variance is currently worth ${formatMoney(metrics.labourOpportunityValue)} per week in recoverable opportunity.`
        : '',
    keyIssues[0] ?? ''
  ]
    .filter(Boolean)
    .slice(0, 4)
    .join(' ');

  return {
    executiveSummary,
    keyIssues: uniqueNonEmpty(keyIssues).slice(0, 4),
    quickWins: uniqueNonEmpty(quickWins).slice(0, 4),
    actionPlan30To90Days: uniqueNonEmpty(actionPlan30To90Days).slice(0, 4),
    followUpRecommendation:
      metrics.criticalMissingControls > 0
        ? 'Return within 7 to 14 days to verify control closure and confirm margin-critical changes are live.'
        : 'Return within 30 days to review delivery against the action plan and confirm the weekly opportunity is being recovered.'
  };
}

function uniqueNonEmpty(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(num(value));
}
