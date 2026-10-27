import test from 'node:test';
import assert from 'node:assert/strict';
import {TraceabilityLedger,TraceabilityError} from '../src/traceability.js';

const row=(lotId,quantity,unit='saca')=>({lotId,quantity,unit});
const create=(db,id,quantity,state='coco',unit='saca',enterpriseId='E1')=>
 db.registerLot({id,enterpriseId,state,unit,initialQuantity:quantity,actorId:'family-1'});
const move=(db,type,inputs,outputs,justification='')=>
 db.record({type,enterpriseId:'E1',actorId:'family-2',inputs,outputs,justification});

test('cadeia A+B -> C -> D preserva ancestralidade e destinos',()=>{
 const db=new TraceabilityLedger();
 create(db,'A',12);create(db,'B',8);create(db,'C',0);create(db,'D',0);
 move(db,'merge',[row('A',12),row('B',8)],[row('C',20)]);
 move(db,'split',[row('C',15)],[row('D',15)]);
 assert.deepEqual(new Set(db.lineage('D','backward')),new Set(['D','C','A','B']));
 assert.deepEqual(new Set(db.lineage('A','forward')),new Set(['A','C','D']));
 assert.equal(db.balance('C','saca'),5);
});
test('operação inválida não altera saldo nem histórico',()=>{
 const db=new TraceabilityLedger();create(db,'A',2);create(db,'B',0);
 const count=db.events.length;
 assert.throws(()=>move(db,'split',[row('A',3)],[row('B',3)]),TraceabilityError);
 assert.equal(db.events.length,count);
 assert.equal(db.balance('A','saca'),2);
});
test('mistura de unidades bloqueada mesmo com números iguais',()=>{
 const db=new TraceabilityLedger();create(db,'A',2);create(db,'B',0,'coco','kg');
 assert.throws(()=>move(db,'transfer',[row('A',1)],[row('B',1,'kg')]),TraceabilityError);
});
test('mistura de estados exige transformação documentada',()=>{
 const db=new TraceabilityLedger();create(db,'A',2);create(db,'B',0,'verde');
 assert.throws(()=>move(db,'transfer',[row('A',1)],[row('B',1)]),TraceabilityError);
});
