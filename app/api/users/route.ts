import {database} from '../../../db/raw';
import {sameOrigin,sessionUser} from '../../../lib/session';
import {passwordHash,validPassword} from '../../../lib/password';
import {permissionLabels,roleLabels} from '../../../lib/permissions';
async function admin(){const u=await sessionUser();if(u.role!=='admin')throw Error('Somente o administrador pode gerenciar usuários.');return u;}
export async function GET(){try{await admin();const db=database(),users=(await db.prepare('SELECT id,email,name,role,permissions,status,created_at,updated_at FROM app_users ORDER BY name').all()).results;const setting=await db.prepare("SELECT value FROM settings WHERE key='registration_open'").first<any>();return Response.json({users,registrationOpen:setting?.value==='true'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Acesso restrito.'},{status:403});}}
export async function POST(req:Request){try{const b:any=await req.json();sameOrigin(req);const actor=await admin(),db=database(),now=new Date().toISOString();let details:any={actor:actor.email,action:b.action};const qs:D1PreparedStatement[]=[];
 if(b.action==='registration'){if(typeof b.open!=='boolean')throw Error('Opção inválida.');qs.push(db.prepare("INSERT INTO settings VALUES('registration_open',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(b.open)));details.open=b.open;}
 else{
  const old=b.id?await db.prepare('SELECT id,email FROM app_users WHERE id=?').bind(b.id).first<any>():null;if(b.id&&!old)throw Error('Usuário não encontrado.');
  if(b.action==='delete'){if(!old||old.id===actor.id||old.email==='welber05@gmail.com')throw Error('A conta administradora principal não pode ser excluída.');qs.push(db.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(old.id),db.prepare('DELETE FROM app_users WHERE id=?').bind(old.id));details.email=old.email;}
  else if(b.action==='save'){
   const email=String(b.email??'').trim().toLowerCase(),name=String(b.name??'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||!name||name.length>150)throw Error('Nome ou e-mail inválido.');
   if(!Object.hasOwn(roleLabels,b.role)||!['active','pending','blocked'].includes(b.status)||!Array.isArray(b.permissions)||b.permissions.some((p:any)=>!Object.hasOwn(permissionLabels,p)))throw Error('Perfil ou permissões inválidos.');
   if(old&&email!==old.email)throw Error('O e-mail identifica os vínculos. Crie uma nova conta para outro e-mail.');
   if((old?.email==='welber05@gmail.com'||old?.id===actor.id)&&(b.role!=='admin'||b.status!=='active'))throw Error('Não é possível bloquear ou rebaixar esta conta administradora.');
   const permissions=JSON.stringify([...new Set(b.permissions)]);let hash:string|undefined;if(b.password)hash=await passwordHash(validPassword(b.password));
   if(old){qs.push(db.prepare('UPDATE app_users SET name=?,role=?,permissions=?,status=?,updated_at=? WHERE id=?').bind(name,b.role,permissions,b.status,now,old.id));if(hash)qs.push(db.prepare('UPDATE app_users SET password_hash=? WHERE id=?').bind(hash,old.id));qs.push(db.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(old.id));}
   else{if(!hash)throw Error('Informe a senha inicial.');qs.push(db.prepare('INSERT INTO app_users VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),email,name,hash,b.role,permissions,b.status,now,now));}details={...details,email,role:b.role,status:b.status,permissions:b.permissions};
  }else throw Error('Ação inválida.');
 }
 qs.push(db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'app_users',b.id??'settings',b.action,now,JSON.stringify(details)));await db.batch(qs);return Response.json({ok:true});
 }catch(e){const message=e instanceof Error?e.message:'';return Response.json({error:/UNIQUE/.test(message)?'E-mail já cadastrado.':/D1|SQLITE/.test(message)?'Não foi possível salvar.':message||'Acesso restrito.'},{status:400});}}
