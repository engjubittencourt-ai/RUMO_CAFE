/**
 * Integração experimental entre remessas de beneficiamento e livro de lotes.
 * Sem persistência ou transações distribuídas: NÃO usar em produção.
 * Remessa em sacas baixa sacas; peso da beneficiadora é apenas informação
 * documental, não converte nem baixa quilogramas implicitamente.
 */
import { TraceabilityError } from "./traceability.js";
import { BeneficiationError } from "./beneficiation.js";

export class BeneficiationWorkflow {
  constructor(ledger, register) {
    this.ledger = ledger;
    this.register = register;
    this.links = new Map();
  }

  dispatch({ shipmentId, enterpriseId, actorId, sourceLotId, custodyLotId,
    sackCount, shippedKg, shippedBasis, receivedKg, receivedBasis }) {
    if (this.links.has(shipmentId)) throw new BeneficiationError("Remessa já vinculada");
    const source = this.ledger.lots.get(sourceLotId);
    const custody = this.ledger.lots.get(custodyLotId);
    if (!source || !custody || source.enterpriseId !== enterpriseId ||
        custody.enterpriseId !== enterpriseId || source.state !== custody.state)
      throw new TraceabilityError("Origem e custódia devem ser lotes do mesmo empreendimento e estado");
    if (this.ledger.events.some(e => e.outputs.some(r => r.lotId === custodyLotId && r.quantity > 0)))
      throw new TraceabilityError("Lote de custódia já possui entradas");
    const unit = sackCount != null ? "saca" : "kg";
    const quantity = sackCount ?? shippedKg;
    if (unit === "kg" && shippedBasis !== "measured" && shippedBasis !== "estimated")
      throw new BeneficiationError("Peso enviado precisa ser medido ou estimado");
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new BeneficiationError("Quantidade enviada inválida");
    if (this.ledger.balance(sourceLotId, unit) < quantity)
      throw new TraceabilityError("Saldo insuficiente para remessa");
    const shipment = this.register.addShipment({
      id: shipmentId, enterpriseId, sourceLotId, sackCount,
      shippedKg, shippedBasis, receivedKg, receivedBasis
    });
    try {
      this.ledger.record({
        type: "transfer", enterpriseId, actorId,
        inputs: [{lotId: sourceLotId, quantity, unit}],
        outputs: [{lotId: custodyLotId, quantity, unit}],
        justification: "Remessa de beneficiamento terceirizado"
      });
    } catch (error) {
      this.register.shipments.delete(shipmentId);
      throw error;
    }
    this.links.set(shipmentId, {custodyLotId, enterpriseId});
    return shipment;
  }

  /**
   * Registra retorno por peneira sem baixa do lote de custódia:
   * a transformação coco -> verde e sua reconciliação exigem a próxima
   * etapa transacional, com peso de entrada e perdas/subprodutos.
   */
  documentReturn(payload) {
    const link = this.links.get(payload.shipmentId);
    if (!link || link.enterpriseId !== payload.enterpriseId)
      throw new BeneficiationError("Remessa não vinculada ao empreendimento");
    const destination = this.ledger.lots.get(payload.destinationLotId);
    if (!destination || destination.enterpriseId !== payload.enterpriseId ||
        destination.state !== "verde")
      throw new TraceabilityError("Retorno deve referenciar lote verde do empreendimento");
    return this.register.recordReturn(payload);
  }

  report(shipmentId) {
    const link = this.links.get(shipmentId);
    if (!link) throw new BeneficiationError("Remessa não vinculada");
    return {...this.register.report(shipmentId),
      custodyLotId: link.custodyLotId,
      stockReconciliation: "pending_transformation"};
  }
}
