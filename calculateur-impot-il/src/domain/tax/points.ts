/**
 * Module Tax — points de crédit (נקודות זיכוי).
 *
 * Chaque point de crédit réduit l'impôt dû d'un montant fixe annuel (la
 * « valeur du point », `pointValue`, définie par année dans les règles
 * fiscales). Le crédit ne peut pas rendre l'impôt négatif : il est plafonné
 * au montant d'impôt dû (les points non utilisés ne sont pas remboursés,
 * sauf cas particuliers hors périmètre de cet outil).
 */

/** Montant du crédit accordé pour un nombre de points donné. */
export function computePointsCredit(points: number, pointValue: number): number {
  const safePoints = Number.isFinite(points) ? Math.max(0, points) : 0;
  return safePoints * pointValue;
}

/**
 * Applique le crédit de points à un impôt brut.
 * @returns L'impôt net après crédit (jamais négatif).
 */
export function applyPointsCredit(
  grossTax: number,
  points: number,
  pointValue: number,
): number {
  const credit = computePointsCredit(points, pointValue);
  return Math.max(0, grossTax - credit);
}
