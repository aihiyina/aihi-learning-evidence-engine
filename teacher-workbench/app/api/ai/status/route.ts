import {env} from 'cloudflare:workers';
import {status} from '../../../../server/meta-trial.mjs';
export const dynamic='force-dynamic';
export async function GET(){return status(env);}
