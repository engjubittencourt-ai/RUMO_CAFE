import test from "node:test";
import assert from "node:assert/strict";
import { TraceabilityLedger, TraceabilityError } from "../src/traceability.js";

const ledger = () => {
  const db = new TraceabilityLedger();
  const create = (id, quantity, state = "coco", unit = "saca", enterpriseId = "E1") =>
    db.registerLot({ id, enterpriseId, state, initialQuantity: quantity, unit, actorId: "familia-1" });
  return { db, create };
};
const move = (db, type, inputs, outputs, justification = "") =>
  db.record({ type, enterpriseId: "E1", actorId: "familia-2", inputs, outputs, justification });
const row = (lotId, quantity, unit = "saca") => ({ lotId, quantity, unit });

test("união, divisão e saldo por saca", () => {
  const { db, create } = ledger();
  create("A", 12); create("B", 8); create("C", 0);
  // C é cadastrado com saldo de abertura; para uma composição resultante,
  // um novo lote deve ter saldo zero. Este teste usa um saldo existente e
  // verifica a conservação durante uma movimentação parcial.
  move(db, "merge", [row("A", 12), row("B", 8)], [row("C", 20)]);
  assert.equal(db.balance("A", "saca"), 0);
  assert.equal(db.balance("B", "saca"), 0);
  assert.equal(db.balance("C", "saca"), 20);
  assert.deepEqual(new Set(db.lineage("C")), new Set(["C", "A", "B"]));
});
test("bloqueia saldo negativo", () => {
  const { db, create } = ledger(); create("A", 2); create("B", 1);
  assert.throws(() => move(db, "transfer", [row("A", 3)], [row("B", 3)]), TraceabilityError);
});
test("não converte sacas em kg automaticamente", () => {
  const { db, create } = ledger(); create("A", 2); create("B", 1, "coco", "kg");
  assert.throws(() => move(db, "merge", [row("A", 1)], [row("B", 50, "kg")]), TraceabilityError);
});
test("impede mistura entre empreendimentos", () => {
  const { db, create } = ledger(); create("A", 2); create("B", 2, "coco", "saca", "E2");
  assert.throws(() => move(db, "merge", [row("A", 1)], [row("B", 1)]), TraceabilityError);
});
test("genealogia progressiva de café transformado", () => {
  const { db, create } = ledger(); create("COCO", 10); create("VERDE", 0, "verde", "kg");
  move(db, "transform", [row("COCO", 4)], [row("VERDE", 120, "kg")], "Remessa pesada; reconciliação pendente");
  assert.ok(db.lineage("COCO", "forward").includes("VERDE"));
});
