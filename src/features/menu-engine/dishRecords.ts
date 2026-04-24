import type {
  DishIngredient,
  MeasurementUnit,
  MenuDish,
  MenuDishImage,
  MenuDishRecipeCosting,
  MenuDishSpecSheet
} from '../../types';
import { num, safe, uid } from '../../lib/utils';
import { dishActualGp, dishRecommendedPrice } from '../profit/menuProfit';

export const ingredientUnitOptions: Array<{ value: MeasurementUnit; label: string }> = [
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'ml', label: 'Millilitres' },
  { value: 'l', label: 'Litres' },
  { value: 'each', label: 'Each' },
  { value: 'portion', label: 'Portions' },
  { value: 'pack', label: 'Packs' }
];

export const defaultDietaryTagOptions = [
  'Vegetarian',
  'Vegan',
  'Gluten free',
  'Dairy free',
  'Halal',
  'Low carb'
];

export function blankIngredient(): DishIngredient {
  return {
    id: uid('ing'),
    name: '',
    qtyUsed: 0,
    qtyUnit: 'g',
    packQty: 1,
    packUnit: 'kg',
    packCost: 0,
    supplier: ''
  };
}

export function blankDishImage(): MenuDishImage {
  return {
    id: uid('dish-image'),
    label: '',
    imageDataUrl: '',
    isPrimary: false
  };
}

export function blankRecipeCosting(linkedDishId = uid('dish')): MenuDishRecipeCosting {
  return {
    id: uid('dish-costing'),
    linkedDishId,
    portionSize: '',
    numberOfPortions: 1,
    targetGpPercentage: 65,
    actualGpPercentage: 0,
    suggestedSellingPrice: 0,
    vatEnabled: false,
    notes: '',
    portalVisible: false
  };
}

export function blankSpecSheet(linkedDishId = uid('dish')): MenuDishSpecSheet {
  return {
    id: uid('dish-spec'),
    linkedDishId,
    portionSize: '',
    recipeMethod: '',
    platingInstructions: '',
    prepNotes: '',
    serviceNotes: '',
    holdingStorageNotes: '',
    equipmentRequired: '',
    internalNotes: '',
    clientFacingNotes: '',
    portalVisible: false
  };
}

export function normalizeIngredient(ingredient?: Partial<DishIngredient>): DishIngredient {
  return {
    ...blankIngredient(),
    ...ingredient,
    id: ingredient?.id || uid('ing'),
    name: String(ingredient?.name ?? ''),
    qtyUsed: num(ingredient?.qtyUsed),
    packQty: Math.max(1, num(ingredient?.packQty) || 1),
    packCost: num(ingredient?.packCost),
    supplier: String(ingredient?.supplier ?? '')
  };
}

export function normalizeDishImage(image?: Partial<MenuDishImage>): MenuDishImage {
  return {
    ...blankDishImage(),
    ...image,
    id: image?.id || uid('dish-image'),
    label: String(image?.label ?? ''),
    imageDataUrl: String(image?.imageDataUrl ?? ''),
    isPrimary: Boolean(image?.isPrimary)
  };
}

export function normalizeRecipeCosting(
  recipeCosting: Partial<MenuDishRecipeCosting> | undefined,
  linkedDishId: string,
  targetGp: number,
  portionSize: string
): MenuDishRecipeCosting {
  return {
    ...blankRecipeCosting(linkedDishId),
    ...recipeCosting,
    id: recipeCosting?.id || uid('dish-costing'),
    linkedDishId,
    portionSize: String(recipeCosting?.portionSize ?? portionSize ?? ''),
    numberOfPortions: Math.max(1, num(recipeCosting?.numberOfPortions) || 1),
    targetGpPercentage: num(recipeCosting?.targetGpPercentage ?? targetGp),
    actualGpPercentage: num(recipeCosting?.actualGpPercentage),
    suggestedSellingPrice: num(recipeCosting?.suggestedSellingPrice),
    vatEnabled: Boolean(recipeCosting?.vatEnabled),
    notes: String(recipeCosting?.notes ?? ''),
    portalVisible: Boolean(recipeCosting?.portalVisible)
  };
}

export function normalizeSpecSheet(
  specSheet: Partial<MenuDishSpecSheet> | undefined,
  linkedDishId: string,
  dish: Partial<MenuDish>
): MenuDishSpecSheet {
  return {
    ...blankSpecSheet(linkedDishId),
    ...specSheet,
    id: specSheet?.id || uid('dish-spec'),
    linkedDishId,
    portionSize: String(specSheet?.portionSize ?? dish.portionSize ?? ''),
    recipeMethod: String(specSheet?.recipeMethod ?? dish.recipeMethod ?? ''),
    platingInstructions: String(specSheet?.platingInstructions ?? dish.platingInstructions ?? ''),
    prepNotes: String(specSheet?.prepNotes ?? dish.prepNotes ?? ''),
    serviceNotes: String(specSheet?.serviceNotes ?? dish.serviceNotes ?? ''),
    holdingStorageNotes: String(
      specSheet?.holdingStorageNotes ?? dish.holdingStorageNotes ?? ''
    ),
    equipmentRequired: String(specSheet?.equipmentRequired ?? dish.equipmentRequired ?? ''),
    internalNotes: String(specSheet?.internalNotes ?? dish.internalNotes ?? ''),
    clientFacingNotes: String(specSheet?.clientFacingNotes ?? dish.clientFacingNotes ?? ''),
    portalVisible: Boolean(specSheet?.portalVisible)
  };
}

export function normalizeDish(dish?: Partial<MenuDish>): MenuDish {
  const id = dish?.id || uid('dish');
  const portionSize = String(dish?.portionSize ?? '');
  const targetGp = num(dish?.targetGp);

  const normalizedDish: MenuDish = {
    id,
    name: String(dish?.name ?? ''),
    description: String(dish?.description ?? ''),
    sellPrice: num(dish?.sellPrice),
    targetGp,
    mix: num(dish?.mix),
    salesMixPercent: num(dish?.salesMixPercent ?? dish?.mix),
    weeklySalesVolume: num(dish?.weeklySalesVolume ?? dish?.mix),
    portionSize,
    allergenInformation: String(dish?.allergenInformation ?? ''),
    dietaryTags: Array.isArray(dish?.dietaryTags)
      ? dish.dietaryTags.map((tag) => String(tag)).filter(Boolean)
      : [],
    recipeMethod: String(dish?.recipeMethod ?? ''),
    platingInstructions: String(dish?.platingInstructions ?? ''),
    prepNotes: String(dish?.prepNotes ?? ''),
    serviceNotes: String(dish?.serviceNotes ?? ''),
    holdingStorageNotes: String(dish?.holdingStorageNotes ?? ''),
    equipmentRequired: String(dish?.equipmentRequired ?? ''),
    internalNotes: String(dish?.internalNotes ?? ''),
    clientFacingNotes: String(dish?.clientFacingNotes ?? ''),
    notes: String(dish?.notes ?? ''),
    ingredients:
      Array.isArray(dish?.ingredients) && dish.ingredients.length
        ? dish.ingredients.map((ingredient) => normalizeIngredient(ingredient))
        : [blankIngredient()],
    dishImages:
      Array.isArray(dish?.dishImages) && dish.dishImages.length
        ? dish.dishImages
            .map((image) => normalizeDishImage(image))
            .filter((image) => safe(image.imageDataUrl))
        : [],
    recipeCosting: blankRecipeCosting(id),
    specSheet: blankSpecSheet(id)
  };

  normalizedDish.recipeCosting = normalizeRecipeCosting(
    dish?.recipeCosting,
    id,
    normalizedDish.targetGp,
    normalizedDish.portionSize
  );
  normalizedDish.specSheet = normalizeSpecSheet(dish?.specSheet, id, normalizedDish);

  return syncDishLinkedRecords(normalizedDish);
}

export function syncDishLinkedRecords(dish: MenuDish): MenuDish {
  const actualGp = dishActualGp(dish);
  const suggestedSellingPrice = dishRecommendedPrice(dish);

  return {
    ...dish,
    recipeCosting: {
      ...dish.recipeCosting,
      linkedDishId: dish.id,
      portionSize: dish.recipeCosting.portionSize || dish.portionSize,
      targetGpPercentage: num(dish.recipeCosting.targetGpPercentage || dish.targetGp),
      actualGpPercentage: actualGp,
      suggestedSellingPrice
    },
    specSheet: {
      ...dish.specSheet,
      linkedDishId: dish.id,
      portionSize: dish.specSheet.portionSize || dish.portionSize,
      recipeMethod: dish.specSheet.recipeMethod || dish.recipeMethod,
      platingInstructions: dish.specSheet.platingInstructions || dish.platingInstructions,
      prepNotes: dish.specSheet.prepNotes || dish.prepNotes,
      serviceNotes: dish.specSheet.serviceNotes || dish.serviceNotes,
      holdingStorageNotes: dish.specSheet.holdingStorageNotes || dish.holdingStorageNotes,
      equipmentRequired: dish.specSheet.equipmentRequired || dish.equipmentRequired,
      internalNotes: dish.specSheet.internalNotes || dish.internalNotes,
      clientFacingNotes: dish.specSheet.clientFacingNotes || dish.clientFacingNotes
    }
  };
}
