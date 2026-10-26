/**
 * RUMO CAFÉ — núcleo de rastreabilidade em memória.
 * Demonstra regras de domínio. NÃO é persistência auditável nem serviço de produção.
 * Movimentações devem ser feitas por operação atômica no banco de dados na etapa seguinte.
 */
export class TraceabilityError extends Error {}

const validUnits = new Set(["saca", "kg"]);
const validStates = new Set(["coco", "pergaminho", "verde", "torrado", "moido"]);
const EPS = 1e-9;
const clone = (v) => structuredClone(v);
const requireText = (v, field) => {
  if (typeof v !== "string" || !v.trim()) throw new TraceabilityError(`${field} obrigatório`);
  return v.trim();
};
const positive = (n, field) => {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) throw new TraceabilityError(`${field} deve ser positivo e finito`);
  return n;
};
const key = (lot, unit) => `${lot}::${unit}`;

export class TraceabilityLedger {
  constructor() {
    this.lots = new Map();
    this.events = [];
    this.balances = new Map();
    this.nextEvent = 1;
  }

  registerLot({ id, enterpriseId, state, initialQuantity, unit, measured = false, actorId, note }) {
    id = requireText(id, "id");
    enterpriseId = requireText(enterpriseId, "enterpriseId");
    actorId = requireText(actorId, "actorId");
    if (this.lots.has(id)) throw new TraceabilityError("Lote já cadastrado");
    if (!validStates.has(state)) throw new TraceabilityError("Estado físico inválido");
    if (!validUnits.has(unit)) throw new TraceabilityError("Unidade inválida");
    positive(initialQuantity, "Quantidade inicial");
    if (unit === "saca" && !Number.isInteger(initialQuantity)) throw new TraceabilityError("Sacas devem ser inteiras");
    const lot = { id, enterpriseId, state };
    this.lots.set(id, lot);
    this.balances.set(key(id, unit), initialQuantity);
    this.events.push({
      id: `EV-${this.nextEvent++}`, type: "opening", enterpriseId, actorId,
      timestamp: new Date().toISOString(), inputs: [], outputs: [{ lotId: id, quantity: initialQuantity, unit, measured }],
      note: note ?? ""
    });
    return clone(lot);
  }

  balance(lotId, unit) {
    return this.balances.get(key(lotId, unit)) ?? 0;
  }

  /**
   * Operation types: split, merge, transform, transfer.
   * Inputs and outputs: { lotId, quantity, unit }.
   * The application must NOT convert sacks to kg implicitly.
   */
  record({ type, enterpriseId, actorId, inputs, outputs, note = "", justification = "" }) {
    if (!["split", "merge", "transform", "transfer"].includes(type)) throw new TraceabilityError("Tipo de operação inválido");
    enterpriseId = requireText(enterpriseId, "enterpriseId");
    actorId = requireText(actorId, "actorId");
    if (!Array.isArray(inputs) || !inputs.length || !Array.isArray(outputs) || !outputs.length) {
      throw new TraceabilityError("Entradas e saídas obrigatórias");
    }
    const normalize = (rows) => rows.map((row) => {
      const lot = this.lots.get(row.lotId);
      if (!lot || lot.enterpriseId !== enterpriseId) throw new TraceabilityError("Lote inexistente ou de outro empreendimento");
      if (!validUnits.has(row.unit)) throw new TraceabilityError("Unidade inválida");
      positive(row.quantity, "Quantidade");
      if (row.unit === "saca" && !Number.isInteger(row.quantity)) throw new TraceabilityError("Sacas devem ser inteiras");
      return { lotId: lot.id, quantity: row.quantity, unit: row.unit };
    });
    const ins = normalize(inputs);
    const outs = normalize(outputs);
    const states = new Set([...ins, ...outs].map((r) => this.lots.get(r.lotId).state));
    if (type !== "transform" && states.size !== 1) throw new TraceabilityError("Mudança de estado exige transformação");
    if (type === "transform" && !justification.trim()) throw new TraceabilityError("Transformação exige justificativa e reconciliação documental");
    const units = new Set([...ins, ...outs].map((r) => r.unit));
    if (type !== "transform" && units.size !== 1) throw new TraceabilityError("Conversão de unidades exige operação documentada");
    const byUnit = (rows, unit) => rows.filter((r) => r.unit === unit).reduce((sum, r) => sum + r.quantity, 0);
    if (type !== "transform") {
      for (const unit of units) {
        if (Math.abs(byUnit(ins, unit) - byUnit(outs, unit)) > EPS) throw new TraceabilityError("Divisão/união deve conservar a quantidade");
      }
    }
    const changes = new Map();
    for (const row of ins) changes.set(key(row.lotId, row.unit), (changes.get(key(row.lotId, row.unit)) ?? 0) - row.quantity);
    for (const row of outs) changes.set(key(row.lotId, row.unit), (changes.get(key(row.lotId, row.unit)) ?? 0) + row.quantity);
    for (const [k, change] of changes) {
      if ((this.balances.get(k) ?? 0) + change < -EPS) throw new TraceabilityError("Saldo insuficiente");
    }
    for (const [k, change] of changes) this.balances.set(k, (this.balances.get(k) ?? 0) + change);
    const event = { id: `EV-${this.nextEvent++}`, type, enterpriseId, actorId, timestamp: new Date().toISOString(), inputs: ins, outputs: outs, note, justification };
    this.events.push(event);
    return clone(event);
  }

  lineage(lotId, direction = "backward") {
    if (!this.lots.has(lotId)) throw new TraceabilityError("Lote inexistente");
    if (!["backward", "forward"].includes(direction)) throw new TraceabilityError("Direção inválida");
    const visited = new Set([lotId]);
    const queue = [lotId];
    while (queue.length) {
      const current = queue.shift();
      for (const event of this.events) {
        const source = direction === "backward" ? event.outputs : event.inputs;
        const target = direction === "backward" ? event.inputs : event.outputs;
        if (source.some((x) => x.lotId === current)) {
          for (const row of target) if (!visited.has(row.lotId)) {
            visited.add(row.lotId);
            queue.push(row.lotId);
          }
        }
      }
    }
    return [...visited];
  }

  exportSnapshot(enterpriseId) {
    enterpriseId = requireText(enterpriseId, "enterpriseId");
    return clone({
      enterpriseId, exportedAt: new Date().toISOString(),
      lots: [...this.lots.values()].filter((x) => x.enterpriseId === enterpriseId),
      events: this.events.filter((x) => x.enterpriseId === enterpriseId),
      balances: [...this.balances.entries()].filter(([k]) => this.lots.get(k.split("::")[0])?.enterpriseId === enterpriseId)
    });
  }
}
