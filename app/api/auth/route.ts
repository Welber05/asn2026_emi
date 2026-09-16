import {env} from 'cloudflare:workers';
import {database} from '../../../db/raw';
import {cookieValue,sameOrigin,sessionUser,sessionCookie} from '../../../lib/session';
import {digest,passwordHash,verifyPassword,validPassword} from '../../../lib/password';
import {cookies} from 'next/headers';
export async function GET(){const setting=await database().prepare("SELECT value FROM settings WHERE key='registration_open'").first<any>();let user=null;try{user=await sessionUser();}catch{}return Response.json({user,registrationOpen:setting?.value==='true'},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){try{
 if(Number(req.headers.get('content-length'))>8192)throw Error('Solicitação inválida.');const b:any=await req.json();sameOrigin(req);const db=database();
 if(b.action==='logout'){const token=(await cookies()).get(sessionCookie)?.value;if(token)await db.prepare('DELETE FROM app_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':cookieValue(req,'',0),'Cache-Control':'no-store'}});}
 if(b.action==='password'){const u=await sessionUser(),row=await db.prepare('SELECT password_hash FROM app_users WHERE id=?').bind(u.id).first<any>();if(!await verifyPassword(String(b.currentPassword??''),row.password_hash))throw Error('Senha atual incorreta.');const hash=await passwordHash(validPassword(b.password));await db.batch([db.prepare('UPDATE app_users SET password_hash=?,updated_at=? WHERE id=?').bind(hash,new Date().toISOString(),u.id),db.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(u.id)]);return Response.json({ok:true},{headers:{'Set-Cookie':cookieValue(req,'',0)}});}
 const email=String(b.email??'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200)throw Error('Informe um e-mail válido.');const password=validPassword(b.password);
 const ip=req.headers.get('cf-connecting-ip')??'local';const window=Math.floor(Date.now()/900000);const keys=[await digest(`email:${email}:${window}`),await digest(`ip:${ip}:${window}`)];
 for(const key of keys){const rate=await db.prepare('INSERT INTO login_limits(key,attempts,until) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(key,Date.now()+900000).first<any>();if(rate.attempts>(key===keys[0]?10:100))return Response.json({error:'Muitas tentativas. Aguarde 15 minutos.'},{status:429});}
 await db.prepare('DELETE FROM login_limits WHERE until<?').bind(Date.now()).run();
 if(b.action==='register'){
  const setting=await db.prepare("SELECT value FROM settings WHERE key='registration_open'").first<any>();if(setting?.value!=='true')return Response.json({error:'Novos cadastros estão fechados.'},{status:403});const name=String(b.name??'').trim();if(!name||name.length>150)throw Error('Informe seu nome.');
  if(!await db.prepare('SELECT id FROM app_users WHERE email=?').bind(email).first())await db.prepare('INSERT INTO app_users VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),email,name,await passwordHash(password),'representative','[]','pending',new Date().toISOString(),new Date().toISOString()).run();
  return Response.json({ok:true,message:'Solicitação recebida. Aguarde a liberação do administrador.'});
 }
 if(b.action!=='login')throw Error('Ação inválida.');
 const bootstrap=(env as any).ADMIN_PASSWORD_HASH;
 if(email==='welber05@gmail.com'&&bootstrap&&!await db.prepare('SELECT id FROM app_users WHERE email=?').bind(email).first())await db.prepare('INSERT OR IGNORE INTO app_users VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),email,'Welber Merlin Cardoso',bootstrap,'admin','[]','active',new Date().toISOString(),new Date().toISOString()).run();
 const row=await db.prepare('SELECT * FROM app_users WHERE email=?').bind(email).first<any>();
 const dummy='pbkdf2$100000$invalid-login-salt$'+'0'.repeat(64);
 const valid=await verifyPassword(password,row?.password_hash??dummy);
 if(!valid||row?.status!=='active')return Response.json({error:'Acesso não autorizado. Confira suas credenciais e a aprovação do cadastro.'},{status:401});
 const token=crypto.randomUUID()+crypto.randomUUID();await db.batch([db.prepare('DELETE FROM app_sessions WHERE expires_at<?').bind(Date.now()),db.prepare('INSERT INTO app_sessions VALUES(?,?,?)').bind(await digest(token),row.id,Date.now()+28800000)]);
 return Response.json({ok:true},{headers:{'Set-Cookie':cookieValue(req,token),'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error&&!/D1|SQLITE/.test(e.message)?e.message:'Não foi possível concluir o acesso.'},{status:400});}}
