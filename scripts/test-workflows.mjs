import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {defaultConfig,studentGrade,groupStage,percentScore,validateConfig} from '../lib/model.ts';
const url=process.env.TEST_URL??'http://127.0.0.1:8787';const created=[];
if(!process.env.TEST_ADMIN_PASSWORD)throw Error('Defina TEST_ADMIN_PASSWORD para testar em uma base local.');
const login=await fetch(url+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({action:'login',email:'welber05@gmail.com',password:process.env.TEST_ADMIN_PASSWORD})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];await login.text();

async function post(b,expected=200){const r=await fetch(url+'/api/data',{method:'POST',headers:{'Content-Type':'application/json',Origin:url,Cookie:cookie},body:JSON.stringify(b)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify({b,data}));if(data.id&&['class','group','student','weeks','report','evaluator','assignment'].includes(b.action))created.push(data.id);return data;}
async function all(){const r=await fetch(url+'/api/data?page=grades',{headers:{Cookie:cookie}});assert.equal(r.status,200);return r.json();}
const initial=await all();assert.equal(initial.students.length,33);assert.equal(initial.tasks.filter(t=>t.status==='pending').length,29);assert.equal(initial.students.find(s=>s.name==='CAROLINY SOARES DE SOUZA').group_id,'group-2');
const cls=(await post({action:'class',name:'QA temporária',grade:1,year:2026})).id;
await fs.writeFile('.sites-runtime/test-class.json',JSON.stringify({id:cls}));
const gr=(await post({action:'group',classId:cls,name:'QA Grupo',startWeek:'2026-09-14'})).id;
const student=(await post({action:'student',classId:cls,groupId:gr,name:'Estudante de teste'})).id;
await post({action:'edit',table:'students',id:student,changes:{name:'Estudante QA'}});
await post({action:'weeks',classId:cls,start:'2026-09-14',end:'2026-09-14'});
const week=(await all()).weeks.find(w=>w.class_id===cls).id;
const rp=(await post({action:'report',weekId:week,groupId:gr,past:'Pesquisa',plan:'Implementação',delivery:'Protótipo',tasks:[{studentId:student,description:'Tela inicial'}]})).id;
await post({action:'report',weekId:week,groupId:gr,past:'Pesquisa',plan:'Implementação',delivery:'Protótipo',tasks:[{studentId:student,description:'Tela inicial'}]},400);
let data=await all();let task=data.tasks.find(t=>t.report_id===rp);
await post({action:'review-task',id:task.id,updatedAt:task.updated_at,status:'done',percent:75},400);
const cfg=defaultConfig();for(const s of Object.values(cfg))s.points=10;
await post({action:'rubric',classId:cls,total:41,config:cfg},400);
await post({action:'rubric',classId:cls,total:40,config:cfg});
const representative=(await post({action:'representative',groupId:gr,name:'Representante QA',email:'representante@example.invalid'})).id;
await post({action:'edit',table:'representatives',id:representative,changes:{name:'Representante QA revisado'}});
await post({action:'participation',reportId:rp,scores:{[student]:{participation:120,fulfillment:100}}},400);
await post({action:'participation',reportId:rp,scores:{[student]:{participation:80,fulfillment:100}}});
await post({action:'review-task',id:task.id,updatedAt:task.updated_at,status:'missed',percent:75,justification:''},400);
await post({action:'review-task',id:task.id,updatedAt:task.updated_at,status:'done',percent:101},400);
await post({action:'review-task',id:task.id,updatedAt:task.updated_at,status:'done',percent:75});
data=await all();let report=data.reports.find(r=>r.id===rp);
await post({action:'review-report',id:rp,updatedAt:report.updated_at,status:'done',percent:80});
await post({action:'check-plan',id:rp});
await post({action:'rubric',classId:cls,total:40,config:cfg},400);
const email=(await all()).user.email;
const ev=(await post({action:'evaluator',classId:cls,name:'Avaliador QA',email})).id;
const other=(await post({action:'evaluator',classId:cls,name:'Outro avaliador QA',email:'qa@example.invalid'})).id;
const otherAss=(await post({action:'assignment',groupId:gr,stage:'app',evaluatorId:other})).id;
await post({action:'assessment',assignmentId:otherAss,scores:{function:100,data:100,usability:100}},400);
await post({action:'remove',table:'assignments',id:otherAss});
await post({action:'remove',table:'evaluators',id:other});
const pdf=new Blob(['%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF'],{type:'application/pdf'});const fd=new FormData();fd.set('groupId',gr);fd.set('file',pdf,'teste.pdf');let upload=await fetch(url+'/api/files',{method:'POST',body:fd,headers:{Origin:url,Cookie:cookie}});assert.equal(upload.status,200,await upload.text());
data=await all();const file=data.files.find(f=>f.group_id===gr);const downloaded=await fetch(url+'/api/files?id='+file.id,{headers:{Cookie:cookie}});assert.equal(await downloaded.text(),await pdf.text());
for(const stage of ['written','presentation','app']){const ass=(await post({action:'assignment',groupId:gr,stage,evaluatorId:ev})).id;const scores=Object.fromEntries(cfg[stage].criteria.map(c=>[c.id,80]));await post({action:'assessment',assignmentId:ass,fileId:file.id,scores,notes:'Ficha de teste'});}
data=await all();const result=studentGrade(data,data.students.find(s=>s.id===student));assert.equal(result.complete,true);assert.equal(result.total,31.95);assert.equal(result.max,40);
// A second reviewer contributes equally and incomplete panels stay provisional.
const assApp=data.assignments.find(a=>a.group_id===gr&&a.stage==='app');data.assignments.push({...assApp,id:'second'});assert.equal(groupStage(data,gr,'app').complete,false);data.assessments.push({id:'second-score',assignment_id:'second',percent:100,submitted_at:new Date().toISOString()});assert.equal(groupStage(data,gr,'app').percent,90);
assert.throws(()=>validateConfig(41,cfg));assert.throws(()=>percentScore(cfg.app.criteria,{function:101,data:20,usability:30}));
// The newest document invalidates earlier written assessments for the current grade.
data.files.push({...file,id:'new-version',uploaded_at:'2099-01-01T00:00:00Z'});assert.equal(groupStage(data,gr,'written').complete,false);
await post({action:'remove',table:'students',id:student},400);
await post({action:'edit',table:'students',id:student,changes:{active:0}});
assert.equal((await all()).students.find(s=>s.id===student).active,0);
console.log('PASS: importação; CRUD; relatórios sem duplicação; justificativa obrigatória; limites 0–100; pesos; bloqueio de parâmetros; identidade do avaliador; upload/download; cálculo 31,95/40 com participação semanal; banca; versionamento; inativação.');
// Cleanup is confined to the generated QA class in the local preview database.
assert.match(cls,/^[a-f0-9-]+$/);
const q=`'${cls}'`;
const cleanup=[`DELETE FROM assessments WHERE assignment_id IN (SELECT a.id FROM assignments a JOIN groups g ON a.group_id=g.id WHERE g.class_id=${q})`,`DELETE FROM assignments WHERE group_id IN (SELECT id FROM groups WHERE class_id=${q})`,`DELETE FROM files WHERE group_id IN (SELECT id FROM groups WHERE class_id=${q})`,`DELETE FROM tasks WHERE report_id IN (SELECT r.id FROM reports r JOIN groups g ON r.group_id=g.id WHERE g.class_id=${q})`,`DELETE FROM reports WHERE group_id IN (SELECT id FROM groups WHERE class_id=${q})`,`DELETE FROM students WHERE class_id=${q}`,`DELETE FROM weeks WHERE class_id=${q}`,`DELETE FROM evaluators WHERE class_id=${q}`,`DELETE FROM rubrics WHERE class_id=${q}`,`DELETE FROM groups WHERE class_id=${q}`,`DELETE FROM classes WHERE id=${q}`,`DELETE FROM audit WHERE details LIKE '%${cls}%' OR details LIKE '%${gr}%' OR details LIKE '%${student}%' OR details LIKE '%${rp}%'`];cleanup.unshift(`DELETE FROM participation WHERE report_id IN (SELECT r.id FROM reports r JOIN groups g ON r.group_id=g.id WHERE g.class_id=${q})`,`DELETE FROM representatives WHERE group_id IN (SELECT id FROM groups WHERE class_id=${q})`);await fs.writeFile('.sites-runtime/cleanup-qa.sql',cleanup.join(';\n')+';');
