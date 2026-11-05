import {env} from 'cloudflare:workers';
import {revisePilot} from '../../../../../server/meta-pilot.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return revisePilot(request,env);}
