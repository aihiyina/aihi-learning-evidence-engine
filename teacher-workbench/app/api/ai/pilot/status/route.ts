import {env} from 'cloudflare:workers';
import {pilotStatus} from '../../../../../server/meta-pilot.mjs';
export const dynamic='force-dynamic';
export async function GET(){return pilotStatus(env);}
