import {cookies} from 'next/headers';
import {database} from '../db/raw';
import {digest} from './password';
export const sessionCookie='asn_session';
export async function sessionUser(){
 const token=(await cookies()).get(sessionCookie)?.value;if(!token)throw Error('AUTH_REQUIRED');
 const u=await database().prepare('SELECT u.id,u.email,u.name,u.role,u.permissions FROM app_users u JOIN app_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>? AND u.status=\'active\'').bind(await digest(token),Date.now()).first<any>();
 if(!u)throw Error('AUTH_REQUIRED');return {...u,userId:u.id,displayName:u.name,permissions:JSON.parse(u.permissions) as string[]};
}
export function sameOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw Error('Origem não autorizada.');}
export function cookieValue(req:Request,value:string,maxAge=28800){return `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
