import {env} from 'cloudflare:workers';
import {revise} from '../../../../server/meta-trial.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return revise(request,env);}
