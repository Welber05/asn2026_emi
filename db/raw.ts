import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Base de dados indisponível. Tente novamente.');return env.DB;}
