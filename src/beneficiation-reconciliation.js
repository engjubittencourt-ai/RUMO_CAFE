/**
 * Fechamento documental de uma remessa de beneficiamento.
 * Não lança movimentos de estoque: kg medidos e sacas contadas são
 * grandezas independentes até existir pesagem e reconciliação explícita.
 */
import { BeneficiationError } from "./beneficiation.js";

const round = n => Math.round((n + Number.EPSILON) * 10000) / 10000;
export function reconcileBeneficiation(register, shipmentId, {
  byproductKg = null, lossKg = null, completed = false,
  explanation = "", toleranceKg = 0
} = {}) {
  const report = register.report(shipmentId);
  const { shipment, returns } = report;
  const received = shipment.received;
  const measured = returns.every(x => x.weight.basis === "measured");
  const valid = value => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
  if (!valid(byproductKg) || !valid(lossKg) || !valid(toleranceKg))
    throw new BeneficiationError("Perdas, subprodutos e tolerância devem ser não negativos");
  if (completed && !explanation.trim())
    throw new BeneficiationError("Fechamento exige justificativa documental");
  const eligible = received?.basis === "measured" && measured && returns.length > 0;
  const greenKg = eligible ? report.measuredReturnedKg : null;
  const accountedKg = eligible && byproductKg !== null && lossKg !== null
    ? round(greenKg + byproductKg + lossKg) : null;
  const differenceKg = accountedKg === null ? null : round(received.kg - accountedKg);
  const reconciled = eligible && completed && accountedKg !== null &&
    Math.abs(differenceKg) <= toleranceKg;
  return {
    shipmentId, receivedMeasuredKg: received?.basis === "measured" ? received.kg : null,
    returnedGreenMeasuredKg: greenKg,
    byproductKg, lossKg, accountedKg, differenceKg,
    greenRecoveryPercent: eligible ? round(greenKg / received.kg * 100) : null,
    completed, reconciled,
    status: !eligible ? "missing_measured_weights"
      : !completed ? "open"
      : accountedKg === null ? "missing_byproduct_or_loss"
      : reconciled ? "reconciled" : "mass_difference",
    explanation
  };
}
