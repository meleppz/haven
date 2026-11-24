import { config } from "../config.js";

export type Pricing = { tarif: number; adminFee: number; subtotal: number; discount: number; total: number };

/**
 * BR-10 [FA-16, FA-18, SC-12 "Menghitung Total Biaya"].
 * subtotal = tarif + admin fee; discount = round(20% x subtotal) when the (verified) student promo applies.
 * Example: 150.000 + 20.000 = 170.000 - 34.000 = 136.000. Money is integer rupiah.
 */
export function computePricing(tarif: number, promoApplies: boolean): Pricing {
  const adminFee = config.adminFee;
  const subtotal = tarif + adminFee;
  const discount = promoApplies ? Math.round(config.studentDiscountRate * subtotal) : 0;
  return { tarif, adminFee, subtotal, discount, total: subtotal - discount };
}
