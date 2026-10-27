import test from "node:test";
import assert from "node:assert/strict";
import {TraceabilityLedger} from "../src/traceability.js";
import {BeneficiationRegister} from "../src/beneficiation.js";
import {BeneficiationWorkflow} from "../src/beneficiation-workflow.js";

function setup() {
 const ledger = new TraceabilityLedger();
 for (const [id,quantity,state] of [["COCO",10,"coco"],["BENEFICIADORA",0,"coco"],["VERDE-16",0,"verde"]]) {
  ledger.registerLot({id,enterpriseId:"E1",state,unit:"saca",
   initialQuantity:quantity,actorId:"produtor"});
 }
 const register=new BeneficiationRegister();
 return {ledger,register,workflow:new BeneficiationWorkflow(ledger,register)};
}
test("remessa em sacas preserva massa desconhecida e transfere custódia",()=>{
 const {ledger,workflow}=setup();
 workflow.dispatch({shipmentId:"R1",enterpriseId:"E1",actorId:"produtor",
  sourceLotId:"COCO",custodyLotId:"BENEFICIADORA",sackCount:6,
  receivedKg:310,receivedBasis:"measured"});
 assert.equal(ledger.balance("COCO","saca"),4);
 assert.equal(ledger.balance("BENEFICIADORA","saca"),6);
 assert.equal(workflow.report("R1").shipment.shipped,null);
 assert.equal(workflow.report("R1").shipment.received.kg,310);
 assert.ok(ledger.lineage("BENEFICIADORA").includes("COCO"));
});
test("retornos documentais não criam estoque verde fictício",()=>{
 const {ledger,workflow}=setup();
 workflow.dispatch({shipmentId:"R1",enterpriseId:"E1",actorId:"produtor",
  sourceLotId:"COCO",custodyLotId:"BENEFICIADORA",sackCount:6});
 workflow.documentReturn({id:"V1",shipmentId:"R1",enterpriseId:"E1",
  destinationLotId:"VERDE-16",sieve:"16",kg:150,basis:"measured",
  returnedAt:"2026-10-27T13:00:00Z"});
 assert.equal(ledger.balance("VERDE-16","kg"),0);
 assert.equal(workflow.report("R1").stockReconciliation,"pending_transformation");
});
test("saldo insuficiente não cria remessa",()=>{
 const {workflow,register}=setup();
 assert.throws(()=>workflow.dispatch({shipmentId:"R1",enterpriseId:"E1",actorId:"produtor",
  sourceLotId:"COCO",custodyLotId:"BENEFICIADORA",sackCount:11}));
 assert.equal(register.shipments.size,0);
});
