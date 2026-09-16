import {database} from '../../../db/raw';

import {access,requireArea} from '../../../lib/access';

import {validateConfig,validatePeer,percentScore,stages} from '../../../lib/model';

import seed from '../../../db/seed.json';

const tables=['classes','groups','students','weeks','reports','tasks','audit','rubrics','evaluators','assignments','files','assessments','representatives','participation'] as const;

const id=()=>crypto.randomUUID();

const txt=(v:unknown,max=10000)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Preencha todos os campos obrigatórios.');return v.trim();};

const date=(v:unknown)=>{const s=txt(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Data inválida.');return s;};

export async function GET(){try{const auth=await access();if(!auth.initialized)return Response.json({needsInitialization:true});if(!auth.admin&&!auth.evaluators.length&&!auth.representatives.length)return Response.json({error:'Seu e-mail ainda não foi cadastrado para acessar o sistema. Solicite acesso ao coordenador.'},{status:403});const db=database();const data:any={};for(const t of tables)data[t]=(await db.prepare(`SELECT * FROM ${t}${t==='audit'?' ORDER BY at DESC LIMIT 500':''}`).all()).results;

 if(!auth.admin){const mine=data.evaluators.filter((e:any)=>e.email===auth.user.email.toLowerCase()&&e.active===1);const own=data.assignments.filter((a:any)=>a.active===1&&mine.some((e:any)=>e.id===a.evaluator_id));const memberGroups=new Set(auth.representatives.map((r:any)=>r.group_id));const gids=new Set([...own.map((a:any)=>a.group_id),...memberGroups]);const cids=new Set(data.groups.filter((g:any)=>gids.has(g.id)).map((g:any)=>g.class_id));data.classes=data.classes.filter((c:any)=>cids.has(c.id));data.groups=data.groups.filter((g:any)=>gids.has(g.id));data.students=data.students.filter((s:any)=>gids.has(s.group_id));data.weeks=data.weeks.filter((w:any)=>cids.has(w.class_id));data.reports=data.reports.filter((r:any)=>memberGroups.has(r.group_id)||own.some((a:any)=>a.group_id===r.group_id&&a.stage==='weekly'));data.tasks=data.tasks.filter((t:any)=>data.reports.some((r:any)=>r.id===t.report_id));data.rubrics=data.rubrics.filter((r:any)=>cids.has(r.class_id));data.files=data.files.filter((f:any)=>memberGroups.has(f.group_id)||own.some((a:any)=>a.group_id===f.group_id&&['written','presentation'].includes(a.stage)));data.assignments=own;data.evaluators=mine;data.assessments=data.assessments.filter((a:any)=>own.some((x:any)=>x.id===a.assignment_id));data.representatives=data.representatives.filter((r:any)=>r.email===auth.user.email.toLowerCase());data.participation=data.participation.filter((p:any)=>data.reports.some((r:any)=>r.id===p.report_id));data.audit=[];}

 data.user={admin:auth.admin,email:auth.user.email,name:auth.user.displayName,representativeGroups:auth.representatives.map((r:any)=>r.group_id)};return Response.json(data,{headers:{'Cache-Control':'no-store'}});

 }catch(e){console.error(e);return Response.json({error:String(e).includes('AUTH_REQUIRED')?'Entre com sua conta para continuar.':'Não foi possível carregar a base de dados.',authRequired:String(e).includes('AUTH_REQUIRED')},{status:String(e).includes('AUTH_REQUIRED')?401:503});}}

export async function POST(req:Request){try{

 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem não autorizada.'},{status:403});

 const b:any=await req.json();const auth=await access();const db=database();const now=new Date().toISOString();let entity='',entityId=id();let qs:D1PreparedStatement[]=[];

 const get=async(t:string,key:string)=>{const r=await db.prepare(`SELECT * FROM ${t} WHERE id=?`).bind(key).first<any>();if(!r)throw Error('Registro não encontrado. Atualize a página.');return r;};

 if(b.action==='initialize'){

  if(auth.initialized)return Response.json({ok:true});if(!auth.admin)return Response.json({error:'Somente o coordenador pode inicializar.'},{status:403});

  // First initialization happens while the Site is owner-private.

  qs.push(db.prepare("INSERT OR IGNORE INTO settings VALUES('owner',?)").bind(auth.user.userId));

  for(const r of seed.classes)qs.push(db.prepare('INSERT OR IGNORE INTO classes(id,name,grade,year,created_at) VALUES(?,?,?,?,?)').bind(r.id,r.name,r.grade,2026,now));

  for(const r of seed.groups)qs.push(db.prepare('INSERT OR IGNORE INTO groups(id,class_id,name,start_week,created_at) VALUES(?,?,?,?,?)').bind(r.id,'class-3',r.name,'2026-09-14',now));

  for(const r of seed.students)qs.push(db.prepare('INSERT OR IGNORE INTO students(id,class_id,group_id,name,created_at) VALUES(?,?,?,?,?)').bind(r.id,'class-3',r.groupId,r.name,now));

  qs.push(db.prepare('INSERT OR IGNORE INTO weeks VALUES(?,?,?,?,?)').bind('week-20260914-3','class-3','2026-09-14','2026-09-18T20:00:00.000Z',now));

  for(const r of seed.reports)qs.push(db.prepare('INSERT OR IGNORE INTO reports(id,week_id,group_id,past,plan,delivery,imported_at,updated_at,status,justification,evidence) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(r.id,'week-20260914-3',r.groupId,r.past,r.plan,r.delivery,now,now,'pending','','Importado de TCC.xlsx, guia 14.09. Horário original de envio não informado.'));

  for(const r of seed.tasks)qs.push(db.prepare('INSERT OR IGNORE INTO tasks(id,report_id,student_id,description,status,justification,evidence,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(r.id,r.reportId,r.studentId,r.description,r.status,'','',now));

  await db.batch(qs);return Response.json({ok:true});

 }

 if(!auth.initialized)throw Error('Inicialize a base primeiro.');

 if(!auth.admin&&!['review-task','review-report','check-plan','assessment','report','update-report','participation'].includes(b.action))return Response.json({error:'Somente o coordenador pode realizar esta ação.'},{status:403});

 if(b.action==='remove'||b.action==='edit'){

  const allowed:Record<string,string[]>={classes:['name','grade','year','active'],groups:['name','start_week','active'],students:['name','group_id','active'],weeks:['start','due_at'],evaluators:['name','email','active'],assignments:['evaluator_id','stage','active'],representatives:['name','email','active']};

  entity=String(b.table);if(!allowed[entity])throw Error('Cadastro inválido.');entityId=txt(b.id,100);const old=await get(entity,entityId);

  if(b.action==='remove'){

   const refs:Record<string,string[]>={classes:['groups:class_id','students:class_id','weeks:class_id','evaluators:class_id','rubrics:class_id'],groups:['students:group_id','reports:group_id','files:group_id','assignments:group_id','representatives:group_id'],students:['tasks:student_id'],weeks:['reports:week_id'],evaluators:['assignments:evaluator_id'],assignments:['assessments:assignment_id'],representatives:[]};

   for(const ref of refs[entity]){const [table,col]=ref.split(':');if(await db.prepare(`SELECT id FROM ${table} WHERE ${col}=? LIMIT 1`).bind(entityId).first())throw Error('Este cadastro tem histórico vinculado. Use Inativar para preservá-lo.');}

   qs.push(db.prepare(`DELETE FROM ${entity} WHERE id=?`).bind(entityId));

  }else{

   const changes=b.changes??{};const keys=Object.keys(changes);if(!keys.length||keys.some(k=>!allowed[entity].includes(k)))throw Error('Campos de edição inválidos.');

   if('name' in changes)changes.name=txt(changes.name,150);if('email' in changes){changes.email=txt(changes.email,200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email))throw Error('E-mail inválido.');}

   if('active' in changes&&![0,1].includes(changes.active))throw Error('Situação inválida.');if('grade' in changes&&![1,2,3].includes(Number(changes.grade)))throw Error('Série inválida.');if('year' in changes&&(!Number.isInteger(Number(changes.year))||changes.year<2026||changes.year>2100))throw Error('Ano inválido.');

   if('group_id' in changes&&changes.group_id){const gr=await get('groups',changes.group_id);if(gr.class_id!==old.class_id)throw Error('O grupo deve pertencer à turma.');const used=await db.prepare('SELECT id FROM tasks WHERE student_id=? LIMIT 1').bind(entityId).first();if(used&&changes.group_id!==old.group_id)throw Error('A troca de grupo com histórico exige um novo vínculo. Preserve o cadastro atual para manter as notas.');}

   if('start_week' in changes){changes.start_week=date(changes.start_week);if(new Date(changes.start_week).getUTCDay()!==1)throw Error('Escolha uma segunda-feira.');}

   if('start' in changes){changes.start=date(changes.start);if(new Date(changes.start).getUTCDay()!==1)throw Error('Escolha uma segunda-feira.');if(await db.prepare('SELECT id FROM reports WHERE week_id=? LIMIT 1').bind(entityId).first())throw Error('A data de referência de uma semana com relatório não pode ser alterada.');}

   if('due_at' in changes){if(!Number.isFinite(Date.parse(changes.due_at)))throw Error('Prazo inválido.');changes.due_at=new Date(changes.due_at).toISOString();}

   if(entity==='assignments'){if((changes.stage??old.stage)==='weekly'&&(changes.active??old.active)===1&&await db.prepare("SELECT id FROM assignments WHERE group_id=? AND stage='weekly' AND active=1 AND id<>?").bind(old.group_id,old.id).first())throw Error('Já há um responsável semanal neste grupo.');const ev=await get('evaluators',changes.evaluator_id??old.evaluator_id),gr=await get('groups',old.group_id);if(ev.class_id!==gr.class_id||!stages.some(x=>x.id===(changes.stage??old.stage)))throw Error('Vínculo inválido.');if(await db.prepare('SELECT id FROM assessments WHERE assignment_id=? LIMIT 1').bind(entityId).first()&&keys.some(k=>k!=='active'))throw Error('Este vínculo tem fichas. Inative e crie um novo vínculo.');}

   qs.push(db.prepare(`UPDATE ${entity} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=?`).bind(...keys.map(k=>changes[k]),entityId));

  }

 }else if(b.action==='class'){

  entity='classes';const grade=Number(b.grade),year=Number(b.year);if(![1,2,3].includes(grade)||!Number.isInteger(year)||year<2026||year>2100)throw Error('Série ou ano inválido.');qs.push(db.prepare('INSERT INTO classes(id,name,grade,year,created_at) VALUES(?,?,?,?,?)').bind(entityId,txt(b.name,100),grade,year,now));

 }else if(b.action==='group'){

  entity='groups';await get('classes',b.classId);const start=date(b.startWeek);if(new Date(start).getUTCDay()!==1)throw Error('Escolha uma segunda-feira.');qs.push(db.prepare('INSERT INTO groups(id,class_id,name,start_week,created_at) VALUES(?,?,?,?,?)').bind(entityId,b.classId,txt(b.name,100),start,now));

 }else if(b.action==='student'){

  entity='students';await get('classes',b.classId);if(b.groupId&&(await get('groups',b.groupId)).class_id!==b.classId)throw Error('O grupo deve pertencer à turma.');if(b.id){const old=await get('students',b.id);if(old.class_id!==b.classId)throw Error('A turma do estudante não pode ser alterada nesta edição.');entityId=b.id;qs.push(db.prepare('UPDATE students SET name=?,group_id=? WHERE id=?').bind(txt(b.name,150),b.groupId||null,b.id));}else qs.push(db.prepare('INSERT INTO students(id,class_id,group_id,name,created_at) VALUES(?,?,?,?,?)').bind(entityId,b.classId,b.groupId||null,txt(b.name,150),now));

 }else if(b.action==='weeks'){

  entity='weeks';await get('classes',b.classId);const start=date(b.start),end=date(b.end);if(start>end||new Date(start).getUTCDay()!==1||new Date(end).getUTCDay()!==1)throw Error('Informe segundas-feiras em ordem cronológica.');let n=0;for(let t=Date.parse(start);t<=Date.parse(end);t+=604800000){if(++n>53)throw Error('Cadastre no máximo 53 semanas por vez.');qs.push(db.prepare('INSERT OR IGNORE INTO weeks VALUES(?,?,?,?,?)').bind(id(),b.classId,new Date(t).toISOString().slice(0,10),new Date(t+4*86400000+20*3600000).toISOString(),now));}

 }else if(b.action==='report'){

  entity='reports';if(!auth.admin&&!auth.representatives.some((r:any)=>r.group_id===b.groupId))throw Error('Você só pode enviar relatórios do seu próprio grupo.');const week=await get('weeks',b.weekId),group=await get('groups',b.groupId);if(week.class_id!==group.class_id||week.start<group.start_week)throw Error('Grupo incompatível com a semana.');if(await db.prepare('SELECT id FROM reports WHERE week_id=? AND group_id=?').bind(b.weekId,b.groupId).first())throw Error('Este grupo já tem relatório nesta semana.');

  const members=(await db.prepare('SELECT id FROM students WHERE group_id=? AND active=1').bind(b.groupId).all<any>()).results;if(!members.length)throw Error('Cadastre os integrantes primeiro.');if(!Array.isArray(b.tasks)||b.tasks.length!==members.length||new Set(b.tasks.map((t:any)=>t.studentId)).size!==members.length)throw Error('Informe a atividade de cada integrante.');

  qs.push(db.prepare('INSERT INTO reports(id,week_id,group_id,past,plan,delivery,submitted_at,updated_at,status,justification,evidence) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(entityId,b.weekId,b.groupId,txt(b.past),txt(b.plan),txt(b.delivery),now,now,'pending','',''));

  for(const t of b.tasks){if(!members.some((m:any)=>m.id===t.studentId))throw Error('Integrante não pertence ao grupo.');qs.push(db.prepare('INSERT INTO tasks(id,report_id,student_id,description,status,justification,evidence,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(id(),entityId,t.studentId,t.none?'Sem tarefa atribuída':txt(t.description),t.none?'none':'pending','','',now));}

  }else if(b.action==='update-report'){
  entity='reports';entityId=txt(b.id,100);const old=await get('reports',entityId);if(!auth.admin&&!auth.representatives.some((r:any)=>r.group_id===old.group_id))throw Error('Acesso restrito ao grupo.');if(old.updated_at!==b.updatedAt)return Response.json({error:'Relatório alterado. Atualize antes de editar.'},{status:409});
  const existing=(await db.prepare('SELECT * FROM tasks WHERE report_id=?').bind(entityId).all<any>()).results;
  if(!Array.isArray(b.tasks)||b.tasks.length!==existing.length||new Set(b.tasks.map((t:any)=>t.studentId)).size!==existing.length)throw Error('Preserve todos os integrantes do relatório original.');
  const delivery=txt(b.delivery),changedDelivery=delivery!==old.delivery;
  qs.push(db.prepare('UPDATE reports SET past=?,plan=?,delivery=?,updated_at=?,plan_checked_at=NULL,status=?,percent=?,reviewed_at=?,justification=? WHERE id=?').bind(txt(b.past),txt(b.plan),delivery,now,changedDelivery?'pending':old.status,changedDelivery?null:old.percent,changedDelivery?null:old.reviewed_at,changedDelivery?'':old.justification,entityId));
  for(const t of b.tasks){const prev=existing.find((x:any)=>x.student_id===t.studentId);if(!prev)throw Error('Integrante não pertence ao relatório.');const description=t.none?'Sem tarefa atribuída':txt(t.description);if(description!==prev.description||t.none!==(prev.status==='none'))qs.push(db.prepare('UPDATE tasks SET description=?,status=?,percent=NULL,reviewed_at=NULL,justification=?,updated_at=? WHERE id=?').bind(description,t.none?'none':'pending','',now,prev.id));}
  b.previous={report:old,tasks:existing};
 }else if(b.action==='review-task'||b.action==='review-report'){

  entity=b.action==='review-task'?'tasks':'reports';entityId=txt(b.id,100);const old=await get(entity,entityId);b.previous=old;const report=entity==='tasks'?await get('reports',old.report_id):old;await requireArea(report.group_id,'weekly');const scoringGroup=await get('groups',report.group_id);if(!await db.prepare('SELECT id FROM rubrics WHERE class_id=?').bind(scoringGroup.class_id).first())throw Error('Configure os parâmetros de notas da turma antes da primeira avaliação.');if(b.updatedAt!==old.updated_at)return Response.json({error:'Registro alterado por outra pessoa. Atualize antes de avaliar.'},{status:409});if(!['done','missed'].includes(b.status)||old.status==='none')throw Error('Situação inválida.');const pct=Number(b.percent);if(b.percent===''||!Number.isFinite(pct)||pct<0||pct>100)throw Error('Informe a avaliação de 0 a 100%.');const why=b.status==='missed'?txt(b.justification):String(b.justification??'').slice(0,10000);qs.push(db.prepare(`UPDATE ${entity} SET status=?,percent=?,justification=?,reviewed_at=?,evidence=?,updated_at=? WHERE id=?`).bind(b.status,pct,why,now,String(b.evidence??'').slice(0,10000),now,entityId));

 }else if(b.action==='check-plan'){

  entity='reports';entityId=txt(b.id,100);const r=await get('reports',entityId);await requireArea(r.group_id,'weekly');qs.push(db.prepare('UPDATE reports SET plan_checked_at=?,updated_at=? WHERE id=?').bind(now,now,entityId));

 }else if(b.action==='rubric'){

  entity='rubrics';await get('classes',b.classId);validateConfig(Number(b.total),b.config);validatePeer(b.config);const peerLocked=await db.prepare('SELECT p.id FROM participation p JOIN reports r ON p.report_id=r.id JOIN groups g ON r.group_id=g.id WHERE g.class_id=? LIMIT 1').bind(b.classId).first();const locked=await db.prepare('SELECT a.id FROM assessments a JOIN assignments x ON a.assignment_id=x.id JOIN groups g ON x.group_id=g.id WHERE g.class_id=? LIMIT 1').bind(b.classId).first();const weekly=await db.prepare('SELECT r.id FROM reports r JOIN groups g ON r.group_id=g.id WHERE g.class_id=? AND r.reviewed_at IS NOT NULL LIMIT 1').bind(b.classId).first();const individual=await db.prepare('SELECT t.id FROM tasks t JOIN reports r ON t.report_id=r.id JOIN groups g ON r.group_id=g.id WHERE g.class_id=? AND t.reviewed_at IS NOT NULL LIMIT 1').bind(b.classId).first();if(locked||weekly||individual||peerLocked)throw Error('Os parâmetros ficam bloqueados após a primeira avaliação para preservar as notas.');qs.push(db.prepare('INSERT INTO rubrics VALUES(?,?,?,?,?,?) ON CONFLICT(class_id) DO UPDATE SET total=excluded.total,config=excluded.config,updated_at=excluded.updated_at').bind(entityId,b.classId,Number(b.total),JSON.stringify(b.config),now,now));

  }else if(b.action==='representative'){
  entity='representatives';await get('groups',b.groupId);const email=txt(b.email,200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Informe um e-mail válido.');qs.push(db.prepare('INSERT INTO representatives(id,group_id,name,email,created_at) VALUES(?,?,?,?,?)').bind(entityId,b.groupId,txt(b.name,150),email,now));
 }else if(b.action==='participation'){
  entity='participation';const report=await get('reports',b.reportId);if(!auth.admin&&!auth.representatives.some((r:any)=>r.group_id===report.group_id))throw Error('Somente o representante do grupo pode enviar esta avaliação.');
  const group=await get('groups',report.group_id);const rubric=await db.prepare('SELECT * FROM rubrics WHERE class_id=?').bind(group.class_id).first<any>();if(!rubric)throw Error('Configure os parâmetros de notas da turma primeiro.');const cfg=JSON.parse(rubric.config).weekly;
  const members=(await db.prepare('SELECT student_id FROM tasks WHERE report_id=?').bind(report.id).all<any>()).results;const targets=cfg.peerMode==='collective'?['group']:members.map((t:any)=>t.student_id);const percentages:Record<string,number>={};
  for(const target of targets)percentages[target]=percentScore(cfg.peerCriteria,b.scores?.[target]);
  qs.push(db.prepare('INSERT INTO participation VALUES(?,?,?,?,?,?,?)').bind(entityId,report.id,cfg.peerMode,JSON.stringify(b.scores),JSON.stringify(percentages),auth.user.email,now));
 }else if(b.action==='evaluator'){

  entity='evaluators';await get('classes',b.classId);const email=txt(b.email,200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Informe um e-mail válido.');qs.push(db.prepare('INSERT INTO evaluators(id,class_id,name,email,created_at) VALUES(?,?,?,?,?)').bind(entityId,b.classId,txt(b.name,150),email,now));

 }else if(b.action==='assignment'){

  entity='assignments';const group=await get('groups',b.groupId),ev=await get('evaluators',b.evaluatorId);if(ev.class_id!==group.class_id||!stages.some(s=>s.id===b.stage))throw Error('Avaliador ou área incompatível com a turma.');if(b.stage==='weekly'&&await db.prepare("SELECT id FROM assignments WHERE group_id=? AND stage='weekly' AND active=1").bind(b.groupId).first())throw Error('O acompanhamento semanal tem um responsável por grupo. As outras áreas aceitam vários avaliadores.');qs.push(db.prepare('INSERT INTO assignments(id,group_id,stage,evaluator_id) VALUES(?,?,?,?)').bind(entityId,b.groupId,b.stage,b.evaluatorId));

 }else if(b.action==='assessment'){

  entity='assessments';const ass=await get('assignments',b.assignmentId),ev=await get('evaluators',ass.evaluator_id);if(ev.active!==1||ass.active!==1||ev.email!==auth.user.email.toLowerCase())throw Error('A ficha deve ser preenchida pelo avaliador designado, com sua própria conta.');if(ass.stage==='weekly')throw Error('Use a conferência semanal para esta área.');const group=await get('groups',ass.group_id);const rubric=await db.prepare('SELECT * FROM rubrics WHERE class_id=?').bind(group.class_id).first<any>();if(!rubric)throw Error('O coordenador precisa configurar os pontos e critérios primeiro.');const cfg=JSON.parse(rubric.config)[ass.stage];const pct=percentScore(cfg.criteria,b.scores);let fileId=null;if(ass.stage==='written'){const file=await db.prepare('SELECT id FROM files WHERE group_id=? ORDER BY uploaded_at DESC LIMIT 1').bind(group.id).first<any>();if(!file)throw Error('Envie o trabalho escrito antes da avaliação.');if(file.id!==b.fileId)throw Error('Há uma nova versão do trabalho. Atualize a página antes de avaliar.');fileId=file.id;}qs.push(db.prepare('INSERT INTO assessments VALUES(?,?,?,?,?,?,?)').bind(entityId,ass.id,fileId,JSON.stringify(b.scores),pct,String(b.notes??'').slice(0,10000),now));

 }else throw Error('Ação desconhecida.');

 qs.push(db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').bind(id(),entity,entityId,b.action,now,JSON.stringify({...b,actor:auth.user.email})));

 await db.batch(qs);return Response.json({ok:true,id:entityId});

 }catch(e){console.error(e);const msg=e instanceof Error?e.message:'';return Response.json({error:msg.includes('AUTH_REQUIRED')?'Entre com sua conta para continuar.':msg.includes('UNIQUE')?'Este registro já está cadastrado.':msg.includes('D1')||msg.includes('SQLITE')?'Não foi possível salvar. Seus dados continuam no formulário.':msg||'Não foi possível salvar.'},{status:msg.includes('AUTH_REQUIRED')?401:400});}}

