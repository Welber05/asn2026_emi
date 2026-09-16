import {mkdir,writeFile} from 'node:fs/promises';
import {passwordHash,validPassword} from '../lib/password.ts';
const password=validPassword(process.env.ADMIN_INITIAL_PASSWORD);
await mkdir('.sites-runtime',{recursive:true});
await writeFile('.sites-runtime/admin-password-hash.txt',await passwordHash(password),{mode:0o600});
console.log('Hash gerado em .sites-runtime/admin-password-hash.txt. Configure-o como segredo ADMIN_PASSWORD_HASH na hospedagem. Não versione esse arquivo.');
