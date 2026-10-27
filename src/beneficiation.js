/**
 * Beneficiamento terceirizado: reconciliação documental, sem movimentar estoque.
 * Entradas em sacas nunca são convertidas automaticamente para quilogramas.
 * Todos os pesos em kg são explicitamente medidos ou estimados.
 */
export class BeneficiationError extends Error {}

function quantity(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    throw new BeneficiationError(`${field} deve ser positivo e finito`);
  return value;
}
function mass(value, basis, field) {
  if (value == null) {
    if (basis != null) throw new BeneficiationError(`${field}: base sem peso`);
    return null;
  }
  quantity(value, field);
  if (!["measured", "estimated"].includes(basis))
    throw new BeneficiationError(`${field}: informar medido ou estimado`);
  return { kg: value, basis };
}
function text(value, field) {
  if (typeof value !== "string" || !value.trim())
    throw new BeneficiationError(`${field} obrigatório`);
  return value.trim();
}

export class BeneficiationRegister {
  constructor() {
    this.shipments = new Map();
    this.returns = new Map();
  }

  addShipment({ id, enterpriseId, sourceLotId, sackCount = null,
    shippedKg = null, shippedBasis = null,
    receivedKg = null, receivedBasis = null }) {
    id = text(id, "ID da remessa");
    enterpriseId = text(enterpriseId, "Empreendimento");
    sourceLotId = text(sourceLotId, "Lote de origem");
    if (this.shipments.has(id)) throw new BeneficiationError("Remessa duplicada");
    if (sackCount != null && (!Number.isInteger(sackCount) || sackCount <= 0))
      throw new BeneficiationError("Sacas devem ser inteiras e positivas");
    const shipped = mass(shippedKg, shippedBasis, "Peso enviado");
    const received = mass(receivedKg, receivedBasis, "Peso recebido");
    if (sackCount == null && shipped == null)
      throw new BeneficiationError("Informe sacas ou peso enviado");
    const shipment = { id, enterpriseId, sourceLotId, sackCount, shipped, received };
    this.shipments.set(id, shipment);
    return structuredClone(shipment);
  }

  recordReturn({ id, shipmentId, enterpriseId, destinationLotId, sieve,
    kg, basis, returnedAt }) {
    id = text(id, "ID do retorno");
    shipmentId = text(shipmentId, "Remessa");
    enterpriseId = text(enterpriseId, "Empreendimento");
    destinationLotId = text(destinationLotId, "Lote de destino");
    sieve = text(sieve, "Classificação por peneira");
    if (this.returns.has(id)) throw new BeneficiationError("Retorno duplicado");
    const shipment = this.shipments.get(shipmentId);
    if (!shipment || shipment.enterpriseId !== enterpriseId)
      throw new BeneficiationError("Remessa inexistente ou de outro empreendimento");
    const weight = mass(kg, basis, "Peso retornado");
    const date = new Date(returnedAt);
    if (!returnedAt || Number.isNaN(date.getTime()))
      throw new BeneficiationError("Data de retorno inválida");
    const result = { id, shipmentId, enterpriseId, destinationLotId, sieve,
      weight, returnedAt: date.toISOString() };
    this.returns.set(id, result);
    return structuredClone(result);
  }

  report(shipmentId) {
    const shipment = this.shipments.get(shipmentId);
    if (!shipment) throw new BeneficiationError("Remessa inexistente");
    const returns = [...this.returns.values()].filter(x => x.shipmentId === shipmentId);
    const measuredKg = returns.filter(x => x.weight.basis === "measured")
      .reduce((sum, x) => sum + x.weight.kg, 0);
    const estimatedKg = returns.filter(x => x.weight.basis === "estimated")
      .reduce((sum, x) => sum + x.weight.kg, 0);
    const allMeasured = returns.every(x => x.weight.basis === "measured");
    const canComputeYield = shipment.received?.basis === "measured" &&
      returns.length > 0 && allMeasured;
    const yieldPercent = canComputeYield
      ? measuredKg / shipment.received.kg * 100 : null;
    // O total retornado não representa necessariamente o rendimento final:
    // pode haver retornos futuros e subprodutos ainda não contabilizados.
    return structuredClone({
      shipment, returns, measuredReturnedKg: measuredKg, estimatedReturnedKg: estimatedKg,
      provisionalReturnRatioPercent: yieldPercent,
      reconciliationStatus: canComputeYield ? "partial_or_unverified" : "insufficient_measured_data"
    });
  }
}
