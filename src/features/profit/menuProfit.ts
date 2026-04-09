import type { MenuDish, MenuProjectState } from '../../types';
import { num } from '../../lib/utils';

const unitFamilies = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  l: 'volume',
  each: 'count',
  portion: 'count',
  pack: 'pack'
} as const;

const unitMultipliers = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  each: 1,
  portion: 1,
  pack: 1
} as const;

export function convertUnitAmount(value: number, from: keyof typeof unitFamilies, to: keyof typeof unitFamilies) {
  if (from === to) return value;
  if (unitFamilies[from] !== unitFamilies[to]) return null;
  return (value * unitMultipliers[from]) / unitMultipliers[to];
}

export function dishIngredientCost(dish: MenuDish) {
  return (dish.ingredients ?? []).reduce((sum, ingredient) => {
    const qtyUsed = num(ingredient.qtyUsed);
    const packQty = Math.max(num(ingredient.packQty), 1);
    const packCost = num(ingredient.packCost);
    const comparableQty =
      convertUnitAmount(qtyUsed, ingredient.qtyUnit, ingredient.packUnit) ?? qtyUsed;
    return sum + (comparableQty / packQty) * packCost;
  }, 0);
}

export function dishActualGp(dish: MenuDish) {
  const sell = num(dish.sellPrice);
  if (sell <= 0) return 0;
  return ((sell - dishIngredientCost(dish)) / sell) * 100;
}

export function dishProfitPerSale(dish: MenuDish) {
  return num(dish.sellPrice) - dishIngredientCost(dish);
}

export function dishWeeklyProfit(dish: MenuDish) {
  return dishProfitPerSale(dish) * Math.max(num(dish.weeklySalesVolume), 0);
}

export function dishTargetProfitPerSale(dish: MenuDish) {
  return num(dish.sellPrice) * (num(dish.targetGp) / 100);
}

export function dishWeeklyOpportunity(dish: MenuDish) {
  const gap = dishTargetProfitPerSale(dish) - dishProfitPerSale(dish);
  return gap > 0 ? gap * Math.max(num(dish.weeklySalesVolume), 0) : 0;
}

export function dishRecommendedPrice(dish: MenuDish) {
  const cost = dishIngredientCost(dish);
  const targetGp = Math.min(Math.max(num(dish.targetGp), 1), 95);
  if (cost <= 0) return 0;
  return cost / (1 - targetGp / 100);
}

export function dishPriceGap(dish: MenuDish) {
  return dishRecommendedPrice(dish) - num(dish.sellPrice);
}

export function buildMenuProfitSummary(project: MenuProjectState) {
  const dishes = project.sections.flatMap((section) => section.dishes);
  const weeklyRevenue = dishes.reduce(
    (sum, dish) => sum + num(dish.sellPrice) * Math.max(num(dish.weeklySalesVolume), 0),
    0
  );
  const weeklyProfit = dishes.reduce((sum, dish) => sum + dishWeeklyProfit(dish), 0);
  const totalOpportunity = dishes.reduce((sum, dish) => sum + dishWeeklyOpportunity(dish), 0);
  const belowTargetCount = dishes.filter((dish) => dishWeeklyOpportunity(dish) > 0).length;
  const weightedGp =
    weeklyRevenue > 0 ? (weeklyProfit / weeklyRevenue) * 100 : 0;

  return {
    dishes,
    weeklyRevenue,
    weeklyProfit,
    totalOpportunity,
    belowTargetCount,
    weightedGp
  };
}
