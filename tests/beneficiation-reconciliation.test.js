import test from "node:test";
import assert from "node:assert/strict";
import {BeneficiationRegister,BeneficiationError} from "../src/beneficiation.js";
import {reconcileBeneficiation} from "../src/beneficiation-reconciliation.js";
function scenario(receivedKg=520, receivedBasis="measured") {
 const register=new BeneficiationRegister();
 register.addShipment({id:"R1",enterpriseId:"E1",sourceLotId:"COCO",
  sackCount:10,receivedKg,receivedBasis});
 const add=(id,kg,basis="measured")=>register.recordReturn({
  id,shipmentId:"R1",enterpriseId:"E1",destinationLotId:id,
  sieve:id,kg,basis,returnedAt:"2026-10-27T13:00:00Z"
 });
 return {register,add};
}
test("não declara fechamento com retornos parciais",()=>{
 const {register,add}=scenario();add("16",180);add("17",90);add("outros",45);
 const result=reconcileBeneficiation(register,"R1");
 assert.equal(result.status,"open");
 assert.equal(result.greenRecoveryPercent,60.5769);
 assert.equal(result.reconciled,false);
 assert.equal(result.differenceKg,null);
});
test("fecha massa medida com perdas e subprodutos documentados",()=>{
 const {register,add}=scenario();add("16",180);add("17",90);add("outros",45);
 const result=reconcileBeneficiation(register,"R1",{
  byproductKg:180,lossKg:25,completed:true,explanation:"Laudo de beneficiamento"
 });
 assert.equal(result.accountedKg,520);
 assert.equal(result.differenceKg,0);
 assert.equal(result.status,"reconciled");
});
test("diferença de massa não é automaticamente considerada perda",()=>{
 const {register,add}=scenario();add("16",180);
 const result=reconcileBeneficiation(register,"R1",{
  byproductKg:20,lossKg:0,completed:true,explanation:"Pesagens conferidas"
 });
 assert.equal(result.differenceKg,320);
 assert.equal(result.status,"mass_difference");
});
test("estimativa não autoriza rendimento de massa medida",()=>{
 const {register,add}=scenario(520,"estimated");add("16",180);
 const result=reconcileBeneficiation(register,"R1");
 assert.equal(result.greenRecoveryPercent,null);
 assert.equal(result.status,"missing_measured_weights");
});
test("não permite fechamento sem justificativa",()=>{
 const {register,add}=scenario();add("16",180);
 assert.throws(()=>reconcileBeneficiation(register,"R1",{completed:true}),BeneficiationError);
});
