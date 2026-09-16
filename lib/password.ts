const hex=(b:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(b instanceof Uint8Array?b.buffer:b)).map(x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function passwordHash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return `pbkdf2$100000$${salt}$${hex(result)}`;
}
export async function verifyPassword(password:string,hash:string){const parts=hash.split('$');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000')return false;const actual=await passwordHash(password,parts[2]);let diff=actual.length^hash.length;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^(hash.charCodeAt(i)||0);return diff===0;}
export function validPassword(value:unknown):string{if(typeof value!=='string'||value.length<10||value.length>128)throw Error('Use uma senha de 10 a 128 caracteres.');return value;}
