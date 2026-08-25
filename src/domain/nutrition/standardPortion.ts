export function standardPortionQuantityToGrams(
  quantity: number,
  portionWeightG: number,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Portion quantity must be greater than zero.');
  }
  if (!Number.isFinite(portionWeightG) || portionWeightG <= 0) {
    throw new Error('Standard portion weight must be greater than zero.');
  }
  return quantity * portionWeightG;
}
