import assert from 'node:assert/strict';
const root=process.env.TEST_URL??'http://127.0.0.1:8787';
const password=process.env.TEST_ADMIN_PASSWORD;if(!password)throw Error('Defina TEST_ADMIN_PASSWORD sem gravá-la no código.');
const stamp=crypto.randomUUID(),email=`qa-${stamp}@example.invalid`,pendingEmail=`pending-${stamp}@example.invalid`,testPassword=crypto.randomUUID();
async function request(path,body,cookie,expected=200,origin=root){const res=await fetch(root+path,{method:body?'POST':'GET',headers:{Connection:'close',...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const text=await res.text();let data;try{data=JSON.parse(text);}catch{throw Error(path+' '+(body?.action??'GET')+' '+res.status+' '+text);}assert.equal(res.status,expected,JSON.stringify(data));return {data,cookie:res.headers.get('set-cookie')?.split(';')[0],headers:res.headers};}
async function login(mail,pass){return (await request('/api/auth',{action:'login',email:mail,password:pass})).cookie;}
await request('/api/data',null,null,401);
const spoof=await fetch(root+'/api/data',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'welber05@gmail.com'}});assert.equal(spoof.status,401);
const admin=await login('welber05@gmail.com',password);assert(admin);
const auth=await request('/api/auth',null,admin);assert.equal(auth.data.user.role,'admin');assert(!('password_hash' in auth.data.user));
let userId,pendingId,classId,groupId,studentId;
const state=await request('/api/users',null,admin);const initialOpen=state.data.registrationOpen;
try{
 await request('/api/users',{action:'registration',open:false},admin);
 await request('/api/auth',{action:'register',email:pendingEmail,name:'QA pending',password:testPassword},null,403);
 await request('/api/users',{action:'registration',open:true},admin);
 await request('/api/auth',{action:'register',email:pendingEmail,name:'QA pending',password:testPassword});
 await request('/api/auth',{action:'login',email:pendingEmail,password:testPassword},null,401);
 let users=(await request('/api/users',null,admin)).data.users;pendingId=users.find(u=>u.email===pendingEmail).id;assert(users.every(u=>!('password_hash' in u)));
 await request('/api/users',{action:'save',name:'QA leitura',email,password:testPassword,role:'coordinator',status:'active',permissions:['registry']},admin);
 users=(await request('/api/users',null,admin)).data.users;userId=users.find(u=>u.email===email).id;
 let viewer=await login(email,testPassword);
 const registry=(await request('/api/data?page=registry',null,viewer)).data;assert.equal(registry.reports.length,0);assert.equal(registry.assessments.length,0);assert(registry.students.length>=33);
 await request('/api/data?page=grades',null,viewer,403);await request('/api/data?page=users',null,viewer,403);await request('/api/users',null,viewer,403);
 await request('/api/data',{action:'student',classId:'class-3',name:'NEGADO'},viewer,403);
 await request('/api/users',{action:'save',id:userId,email,name:'QA leitura',role:'admin',status:'active',permissions:[]},viewer,400);
 classId=(await request('/api/data',{action:'class',name:'QA temporária '+stamp,grade:1,year:2026},admin)).data.id;
 groupId=(await request('/api/data',{action:'group',classId,name:'QA grupo',startWeek:'2026-09-14'},admin)).data.id;
 const save=permissions=>request('/api/users',{action:'save',id:userId,email,name:'QA leitura',role:'coordinator',status:'active',permissions},admin);
 await save(['registry','students.create']);await request('/api/data?page=registry',null,viewer,401);viewer=await login(email,testPassword);
 studentId=(await request('/api/data',{action:'student',classId,groupId,name:'QA estudante'},viewer)).data.id;
 await request('/api/data',{action:'edit',table:'students',id:studentId,changes:{name:'NEGADO'}},viewer,403);
 await request('/api/data',{action:'remove',table:'students',id:studentId},viewer,403);
 await save(['registry','students.update']);viewer=await login(email,testPassword);
 await request('/api/data',{action:'edit',table:'students',id:studentId,changes:{name:'QA alterado'}},viewer);
 await request('/api/data',{action:'student',classId,groupId,name:'NEGADO'},viewer,403);
 await request('/api/data',{action:'remove',table:'students',id:studentId},viewer,403);
 await save(['registry','students.delete']);viewer=await login(email,testPassword);
 await request('/api/data',{action:'remove',table:'students',id:studentId},viewer);studentId=null;
 await request('/api/auth',{action:'logout'},viewer,400,'https://example.invalid');
 await request('/api/auth',{action:'logout'},viewer);await request('/api/data?page=registry',null,viewer,401);
 await request('/api/users',{action:'save',id:userId,email,name:'QA leitura',role:'coordinator',status:'blocked',permissions:['registry']},admin);
 await request('/api/auth',{action:'login',email,password:testPassword},null,401);
 await request('/api/data?page=account',null,admin).then(r=>assert.equal(r.data.students.length,0));
 console.log('PASS: login próprio; cabeçalhos ChatGPT não autenticam; cadastros fechados/pendentes; páginas protegidas; CRUD independente; bloqueio e revogação de sessões; logout; origem de requisição; hashes não retornados.');
}finally{
 if(studentId)await request('/api/data',{action:'remove',table:'students',id:studentId},admin);
 if(groupId)await request('/api/data',{action:'remove',table:'groups',id:groupId},admin);
 if(classId)await request('/api/data',{action:'remove',table:'classes',id:classId},admin);
 for(const id of [userId,pendingId].filter(Boolean))await request('/api/users',{action:'delete',id},admin);
 await request('/api/users',{action:'registration',open:initialOpen},admin);
}
