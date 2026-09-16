import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root='http://127.0.0.1:8787';
const headers=email=>({'oai-authenticated-user-id':'qa-'+email,'oai-authenticated-user-email':email});
async function get(email){const r=await fetch(root+'/api/data',{headers:email?headers(email):{}});return [r.status,await r.json()];}
async function post(email,data,expected){const r=await fetch(root+'/api/data',{method:'POST',headers:{...headers(email),'Content-Type':'application/json'},body:JSON.stringify(data)});const b=await r.json();assert.equal(r.status,expected,JSON.stringify(b));return b;}
const owner='welber05@gmail.com',rep='representante@example.invalid';
assert.equal((await get())[0],401);assert.equal((await get('not-registered@example.invalid'))[0],403);
const [status,d]=await get(rep);assert.equal(status,200);assert.equal(d.groups.length,1);assert.equal(d.students.length,1);assert.equal(d.user.admin,false);assert.equal(d.audit.length,0);
await post(rep,{action:'class',name:'Não autorizado',grade:1,year:2026},403);
await post(rep,{action:'participation',reportId:'report-1',scores:{}},400);
const task=d.tasks[0];await post(rep,{action:'review-task',id:task.id,updatedAt:task.updated_at,status:'done',percent:100},400);
await post(rep,{action:'participation',reportId:d.reports[0].id,scores:{[task.student_id]:{participation:90,fulfillment:90}}},200);
const evaluator='evaluator-qa@example.invalid';const ev=await post(owner,{action:'evaluator',classId:d.classes[0].id,name:'Avaliador de acesso QA',email:evaluator},200);
const assign=await post(owner,{action:'assignment',groupId:d.groups[0].id,stage:'written',evaluatorId:ev.id},200);
const [es,e]=await get(evaluator);assert.equal(es,200);assert.equal(e.groups.length,1);assert.equal(e.tasks.length,0);assert.equal(e.reports.length,0);assert.equal(e.files.length,1);assert.equal(e.assignments.length,1);
await post(evaluator,{action:'review-task',id:task.id,updatedAt:task.updated_at,status:'done',percent:100},400);
const cfg=JSON.parse(e.rubrics[0].config).written;const scores=Object.fromEntries(cfg.criteria.map(c=>[c.id,80]));await post(evaluator,{action:'assessment',assignmentId:assign.id,fileId:e.files[0].id,scores,notes:'Teste de acesso'},200);
const download=await fetch(root+'/api/files?id='+e.files[0].id,{headers:headers('not-registered@example.invalid')});assert.equal(download.status,403);
console.log('PASS: visitante 401; e-mail não cadastrado 403; representante restrito ao próprio grupo; representante não avalia como professor; avaliador restrito à área escrita; documento protegido.');
