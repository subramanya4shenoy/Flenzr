const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/collaboration-calendar.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,Error,Date});return exports;}
test('calendar handles leap years, month boundaries and bounded navigation',()=>{
 const c=load();assert.equal(c.monthParts('2028-02').days,29);assert.equal(c.monthParts('2026-02').days,28);assert.equal(c.monthParts('2100-02').days,28);
 assert.equal(c.shiftMonth('2026-12',1),'2027-01');assert.equal(c.shiftMonth('2026-01',-1),'2025-12');assert.equal(c.shiftMonth('1900-01',-1),'1900-01');assert.equal(c.shiftMonth('9998-12',1),'9998-12');
 assert.equal(c.calendarDate('2028-02',29),'2028-02-29');assert.throws(()=>c.calendarDate('2026-02',29));assert.throws(()=>c.calendarDate('2026-02',1.5));
 for(const v of ['2026-2','2026-13','1899-12','2026-00','9999-01'])assert.throws(()=>c.monthParts(v));
});
test('calendar dates retain their local calendar day across time zones',()=>{
 const c=load();const original=process.env.TZ;
 try{for(const zone of ['Asia/Kolkata','America/Los_Angeles','Pacific/Kiritimati']){process.env.TZ=zone;assert.equal(c.localMonth(new Date(2026,0,1,0,1)),'2026-01');assert.match(c.dateLabel('2026-01-01'),/1.*2026/);}}
 finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('deadline urgency uses calendar days, inclusive seven-day boundary and lifecycle precedence',()=>{
 const c=load(),base={delivery_date:'2027-01-15',status:'agreed',delivery_state:'not_submitted',latest_delivery_version:0};
 assert.equal(c.deadlineIndicator(base,'2027-01-16').label,'Overdue');
 assert.equal(c.deadlineIndicator(base,'2027-01-15').label,'Due today');
 assert.equal(c.deadlineIndicator(base,'2027-01-14').label,'Due in 1 day');
 assert.equal(c.deadlineIndicator(base,'2027-01-08').key,'due_soon');
 assert.equal(c.deadlineIndicator(base,'2027-01-07').key,'upcoming');
 assert.equal(c.deadlineIndicator({...base,delivery_state:'revisions_requested'},'2027-01-16').label,'Revision overdue');
 for(const state of ['approved','awaiting_review','completed'])assert.equal(c.deadlineIndicator({...base,delivery_state:state},'2027-02-01').key,state);
 assert.equal(c.deadlineIndicator({...base,status:'completed',delivery_state:'not_submitted'},'2027-02-01').key,'completed');
 assert.match(c.deadlineIndicator({...base,delivery_state:'awaiting_review',latest_delivery_version:3},'2027-02-01').detail,/Version 3.*not marked as overdue/);
});
test('date urgency handles leap days, year rollover and DST without hour-based off-by-one errors',()=>{
 const c=load(),original=process.env.TZ;
 try{for(const zone of ['Asia/Kolkata','America/Los_Angeles','Pacific/Kiritimati']){process.env.TZ=zone;assert.equal(c.dateUrgency('2028-03-01','2028-02-28').days,2);assert.equal(c.dateUrgency('2027-01-01','2026-12-31').days,1);assert.equal(c.dateUrgency('2027-03-15','2027-03-14').days,1);assert.equal(c.localDate(new Date(2027,0,15,0,1)),'2027-01-15');}}
 finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
 assert.throws(()=>c.dateUrgency('2027-02-30','2027-02-28'));
});
