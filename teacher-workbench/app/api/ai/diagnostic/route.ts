import {env} from 'cloudflare:workers';
import {diagnose} from '../../../../server/meta-trial.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response(null,{status:403});return diagnose(env);}
