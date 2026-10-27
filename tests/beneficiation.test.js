import test from "node:test";
import assert from "node:assert/strict";
import { BeneficiationRegister, BeneficiationError } from "../src/beneficiation.js";

const setup = () => {
  const db = new BeneficiationRegister();
  db.addShipment({ id:"R1", enterpriseId:"E1", sourceLotId:"COCO-1",
    sackCount:10, receivedKg:520, receivedBasis:"measured" });
  return db;
};
const add = (db, id, sieve, kg, basis="measured", enterpriseId="E1") =>
  db.recordReturn({id,shipmentId:"R1",enterpriseId,destinationLotId:`VERDE-${id}`,
    sieve,kg,basis,returnedAt:"2026-10-27T13:00:00Z"});

test("sacas sem conversão implícita e pesagem independente", () => {
  const db=setup();
  const r=db.report("R1");
  assert.equal(r.shipment.sackCount,10);
  assert.equal(r.shipment.shipped,null);
  assert.equal(r.shipment.received.kg,520);
  assert.equal(r.provisionalReturnRatioPercent,null);
});
test("retornos parciais por peneira, sem confundir rendimento com fechamento", () => {
  const db=setup();
  add(db,"RET1","16",180);
  add(db,"RET2","17",90);
  add(db,"RET3","outras",45);
  const r=db.report("R1");
  assert.equal(r.measuredReturnedKg,315);
  assert.equal(r.provisionalReturnRatioPercent,315/520*100);
  assert.equal(r.reconciliationStatus,"partial_or_unverified");
  assert.equal(r.returns.length,3);
});
test("peso estimado não vira peso medido",()=>{
  const db=setup(); add(db,"RET1","16",180,"estimated");
  const r=db.report("R1");
  assert.equal(r.measuredReturnedKg,0);
  assert.equal(r.estimatedReturnedKg,180);
  assert.equal(r.provisionalReturnRatioPercent,null);
});
test("bloqueia retornos de outro empreendimento",()=>{
  const db=setup();
  assert.throws(()=>add(db,"RET1","16",180,"measured","E2"),BeneficiationError);
});
test("rejeita massa negativa, sacas fracionadas e remessas vazias",()=>{
  const db=new BeneficiationRegister();
  assert.throws(()=>db.addShipment({id:"A",enterpriseId:"E1",sourceLotId:"L",sackCount:1.5}),BeneficiationError);
  assert.throws(()=>db.addShipment({id:"B",enterpriseId:"E1",sourceLotId:"L"}),BeneficiationError);
  assert.throws(()=>db.addShipment({id:"C",enterpriseId:"E1",sourceLotId:"L",shippedKg:-2,shippedBasis:"measured"}),BeneficiationError);
});
