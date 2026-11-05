import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync, readdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const pilot = await import('../server/meta-pilot.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
const now = () => Date.parse('2026-11-04T04:00:00.000Z');
function database(path=':memory:',create=true){
  const sqlite = new DatabaseSync(path);
  if(create){
  for(const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(x=>x.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  }
  sqlite.prepare("INSERT INTO ai_pilot_budget (id,limit_micros,updated_at) VALUES ('authorized-synthetic-quality-2026-11-04',9950000,'2026-11-04T00:00:00Z')").run();
  }
  const db={sqlite, failures:[], prepare(sql){
    return {bind(...args){return {sql,args,
      async first(){if(db.failures.some(x=>sql.includes(x)))throw Error('database unavailable');return sqlite.prepare(sql).get(...args)??null;},
      async run(){if(db.failures.some(x=>sql.includes(x)))throw Error('database unavailable');const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:result.changes}};}
    };}};
  },async batch(statements){
    sqlite.exec('BEGIN IMMEDIATE');
    try {const results=[];for(const s of statements){if(db.failures.some(x=>s.sql.includes(x)))throw Error('database unavailable');const statement=sqlite.prepare(s.sql);if(statement.columns().length){const rows=statement.all(...s.args);results.push({success:true,results:rows,meta:{changes:rows.length}});}else{const r=statement.run(...s.args);results.push({success:true,results:[],meta:{changes:r.changes}});}}sqlite.exec('COMMIT');return results;}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};return db;
}
function request(body={fixtureId:'plants',goal:'steps'},headers={}){return new Request('https://private.example/api/ai/pilot/revise',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});}
const env = DB => ({DB,META_API_KEY:'offline-placeholder-not-a-credential'});
function provider(overrides={}){
  const calls=[];
  return {calls,fetch:async(url,options)=>{
    calls.push({url,options});const path=url.split('/v1/')[1];
    if(overrides[path])return overrides[path](options);
    if(path==='models')return Response.json({data:[{id:'muse-spark-1.3'}]});
    if(path==='responses/input_tokens')return Response.json({input_tokens:1000});
    if(path==='responses')return Response.json({model:'muse-spark-1.3',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:pilot.PILOT_FIXTURES.plants.source}]}],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500}});
    throw Error('unexpected path');
  }};
}
const budget = db => db.sqlite.prepare('SELECT * FROM ai_pilot_budget').get();
const attempts = db => db.sqlite.prepare('SELECT * FROM ai_pilot_attempts').all();
test('pilot has a separate server-only synthetic API',()=>{
  assert.equal(typeof pilot.revisePilot,'function');
  assert.equal(typeof pilot.pilotStatus,'function');
});
test('pilot stores conservative permanent reservation and actual observed cost separately',async()=>{
  const db=database(),p=provider();const r=await pilot.revisePilot(request(),env(db),p.fetch,now);
  assert.equal(r.status,200);const result=await r.json();
  assert.equal(result.mode,'meta');assert.equal(result.source,pilot.PILOT_FIXTURES.plants.source);
  assert.equal(result.estimatedCostUsd,0.003375);assert.equal(result.budgetRemainingUsd,9.85);
  assert.equal(budget(db).committed_micros,100000);assert.equal(budget(db).observed_micros,3375);
  assert.equal(budget(db).in_flight_id,null);assert.equal(attempts(db)[0].state,'completed');
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM ai_trial_budget').get().n,0);
  for(const call of p.calls){assert.equal(call.options.redirect,'manual');assert.ok(call.options.signal instanceof AbortSignal);}
  const body=JSON.parse(p.calls[2].options.body);assert.equal(body.model,'muse-spark-1.3');assert.equal(body.store,false);assert.equal(body.stream,false);assert.equal(body.max_output_tokens,4096);assert.deepEqual(body.tools,[]);
});
test('pilot only accepts exact server fixture and goal IDs, never private text or confirmation flags',async()=>{
  for(const body of [null,[],{}, {source:'student private data',goal:'steps',confirmedSynthetic:true},{fixtureId:'plants',goal:'steps',source:'private'},{fixtureId:'__proto__',goal:'steps'},{fixtureId:'plants',goal:'unknown'},{fixtureId:'plants',goal:'steps',model:'other'},{fixtureId:'plants',goal:'steps',protectedText:'private'}]){
    const db=database(),p=provider();assert.equal((await pilot.revisePilot(request(body),env(db),p.fetch,now)).status,400);assert.equal(p.calls.length,0);assert.equal(budget(db).attempts,0);
  }
});
test('pilot admits one concurrent call only across independent request handlers',async()=>{
  const db=database();let release;const wait=new Promise(resolve=>release=resolve);const p=provider({responses:async()=>{await wait;return Response.json({model:'muse-spark-1.3',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:pilot.PILOT_FIXTURES.plants.source}]}],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500}});}});
  const first=pilot.revisePilot(request(),env(db),p.fetch,now);await new Promise(resolve=>setImmediate(resolve));
  const others=await Promise.all(Array.from({length:10},()=>pilot.revisePilot(request(),env(db),p.fetch,()=>now()+60000)));
  assert.ok(others.every(r=>r.status===429));assert.equal(p.calls.filter(c=>c.url.endsWith('/responses')).length,1);release();assert.equal((await first).status,200);assert.equal(budget(db).attempts,1);
});
test('pilot enforces cooldown without consuming extra reservations',async()=>{
  const db=database(),p=provider();await pilot.revisePilot(request(),env(db),p.fetch,now);
  const r=await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+9999);assert.equal(r.status,429);assert.equal((await r.json()).error,'rate_limited');assert.equal(budget(db).attempts,1);
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+10000)).status,200);
});
test('pilot rejects missing schema, missing key, expired pricing, cross-origin and wrong content type before provider calls',async()=>{
  const p=provider(),db=database();
  assert.equal((await pilot.revisePilot(request(),{DB:db},p.fetch,now)).status,503);
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>Date.parse('2026-11-05T02:00:00Z'))).status,503);
  assert.equal((await pilot.revisePilot(request({}, {origin:'https://evil.example'}),env(db),p.fetch,now)).status,403);
  assert.equal((await pilot.revisePilot(request({}, {'sec-fetch-site':'cross-site'}),env(db),p.fetch,now)).status,403);
  assert.equal((await pilot.revisePilot(request({}, {'content-type':'text/plain'}),env(db),p.fetch,now)).status,415);
  db.sqlite.exec('DROP TABLE ai_pilot_budget');assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,now)).status,503);assert.equal(p.calls.length,0);
});
test('pilot cannot overrun budget or attempt caps, including exact final reservation boundary',async()=>{
  for(const mutation of ['UPDATE ai_pilot_budget SET committed_micros=9900000','UPDATE ai_pilot_budget SET attempts=96','UPDATE ai_pilot_budget SET limit_micros=10000000','UPDATE ai_pilot_budget SET paused=1']){
    const db=database(),p=provider();db.sqlite.exec(mutation);const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.ok(r.status===429||r.status===503);assert.equal(p.calls.length,0);
  }
  const db=database(),p=provider();db.sqlite.exec('UPDATE ai_pilot_budget SET committed_micros=9850000');assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,now)).status,200);assert.equal(budget(db).committed_micros,9950000);assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+60000)).status,429);
});
test('pilot invalid preflight blocks generation and does not refund the accepted reservation',async()=>{
  for(const count of [0,-1,1.5,'100',10001,null]){
    const db=database(),p=provider({'responses/input_tokens':()=>Response.json({input_tokens:count})});const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);assert.equal((await r.json()).error,'input_limit');assert.equal(p.calls.length,2);assert.equal(budget(db).committed_micros,100000);assert.equal(budget(db).in_flight_id,null);assert.equal(attempts(db)[0].state,'failed_before_generation');
  }
});
test('pilot generation timeouts and non-JSON responses pause permanently without retries or secret leakage',async()=>{
  for(const response of [()=>{throw Error('private-secret-key timeout');},()=>new Response('secret response body'),()=>new Response('',{status:429})]){
    const db=database(),p=provider({responses:response});const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private-secret|secret response/);assert.equal(p.calls.length,3);assert.equal(budget(db).paused,1);assert.ok(budget(db).in_flight_id);assert.equal(budget(db).committed_micros,100000);assert.equal(attempts(db)[0].state,'generation_uncertain');assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+60000)).status,429);assert.equal(p.calls.length,3);
  }
});
test('pilot never invokes provider if durable attempt insertion fails; reservation remains unavailable',async()=>{
  const db=database(),p=provider();db.failures.push('INSERT INTO ai_pilot_attempts');const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,503);assert.equal(p.calls.length,0);assert.equal(budget(db).committed_micros,100000);assert.ok(budget(db).in_flight_id);
});
test('pilot settlement failure cannot produce a usable proposal or reopen the campaign',async()=>{
  const db=database(),p=provider();db.failures.push('UPDATE ai_pilot_attempts');const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);assert.equal((await r.json()).error,'accounting_uncertain');assert.ok(budget(db).in_flight_id);assert.equal(budget(db).committed_micros,100000);assert.equal(budget(db).observed_micros,0);
});
test('pilot rejects accounting outside token/model limits and pauses',async()=>{
  for(const mutate of [d=>d.usage.input_tokens=10001,d=>d.usage.output_tokens=4097,d=>d.usage.input_tokens='1000',d=>d.model='muse-wonder-1.0',d=>d.usage.total_tokens=1]){
    const db=database(),p=provider({responses:()=>{const d={model:'muse-spark-1.3',status:'completed',output:[],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500}};mutate(d);return Response.json(d);}});const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);assert.equal(budget(db).paused,1);assert.ok(budget(db).in_flight_id);
  }
});
test('pilot refuses proposals that remove fixed safety or objective text but records known usage',async()=>{
  const db=database(),p=provider({responses:()=>Response.json({model:'muse-spark-1.3',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'보호 문장이 없는 제안'}]}],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500}})});const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);assert.equal((await r.json()).error,'protected_text_changed');assert.equal(budget(db).observed_micros,3375);assert.equal(budget(db).in_flight_id,null);assert.equal(attempts(db)[0].state,'rejected_output');
});
test('pilot status exposes only safe fixture/budget metadata and fails closed on corrupted storage',async()=>{
  const db=database();const s=await(await pilot.pilotStatus(env(db),now)).json();assert.equal(s.available,true);assert.equal(s.budgetRemainingUsd,9.95);assert.equal(s.fixtures.length,6);assert.deepEqual(s.goals,['steps','response']);assert.doesNotMatch(JSON.stringify(s),/offline-placeholder|Bearer/);
  db.sqlite.exec('UPDATE ai_pilot_budget SET observed_micros=1000');const bad=await(await pilot.pilotStatus(env(db),now)).json();assert.equal(bad.available,false);assert.equal(bad.reason,'storage_unavailable');
});

test('pilot initializes only an empty campaign and never recreates a missing ledger with attempt history',async()=>{
  const db=database(),p=provider();db.sqlite.exec('DELETE FROM ai_pilot_budget');
  assert.equal((await(await pilot.pilotStatus(env(db),now)).json()).available,true);
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,now)).status,200);
  db.sqlite.exec('DELETE FROM ai_pilot_budget');
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+60000)).status,503);
  assert.equal(p.calls.length,3);
});
test('pilot freezes admission after a settlement commit whose response is lost',async()=>{
  const db=database(),p=provider();const batch=db.batch;let lose=true;
  db.batch=async statements=>{const result=await batch(statements);if(lose){lose=false;throw Error('lost database response after commit');}return result;};
  const r=await pilot.revisePilot(request(),env(db),p.fetch,now);assert.equal(r.status,502);
  assert.equal((await r.json()).error,'accounting_uncertain');assert.equal(budget(db).paused,1);
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+60000)).status,429);
  assert.equal(p.calls.length,3);assert.equal(budget(db).observed_micros,3375);
});

test('pilot accounting and an unresolved lock survive reopening durable storage',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'meta-pilot-test-'));let db;
  try{
    const path=join(directory,'ledger.sqlite');db=database(path);const p=provider();
    await pilot.revisePilot(request(),env(db),p.fetch,now);db.sqlite.close();
    db=database(path,false);const status=await(await pilot.pilotStatus(env(db),()=>now()+60000)).json();
    assert.equal(status.budgetReservedUsd,0.1);assert.equal(status.estimatedObservedCostUsd,0.003375);assert.equal(status.attempts,1);
    const failure=provider({responses:()=>{throw new DOMException('timeout','TimeoutError');}});
    await pilot.revisePilot(request(),env(db),failure.fetch,()=>now()+60000);db.sqlite.close();
    db=database(path,false);assert.equal((await(await pilot.pilotStatus(env(db),()=>now()+120000)).json()).reason,'campaign_paused');
    assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,()=>now()+120000)).status,429);assert.equal(p.calls.length,3);
  }finally{db?.sqlite.close();rmSync(directory,{recursive:true,force:true});}
});
test('pilot fixture catalog and both goals only construct server-owned prompts',async()=>{
  for(const [fixtureId,fixture] of Object.entries(pilot.PILOT_FIXTURES))for(const goal of ['steps','response']){
    const db=database(),p=provider({responses:options=>{const payload=JSON.parse(options.body);assert.equal(payload.input,fixture.source);return Response.json({model:'muse-spark-1.3',status:'completed',output:[{type:'reasoning',summary:[{text:'never expose this'}]},{type:'message',role:'assistant',content:[{type:'output_text',text:fixture.source}]}],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500,input_tokens_details:{cached_tokens:500},output_tokens_details:{reasoning_tokens:100}}});}});
    const r=await pilot.revisePilot(request({fixtureId,goal}),env(db),p.fetch,now);assert.equal(r.status,200);const result=await r.json();assert.equal(result.proposal,fixture.source);assert.equal(result.estimatedCostUsd,0.003375);assert.doesNotMatch(JSON.stringify(result),/never expose this/);
    const counted=JSON.parse(p.calls[1].options.body),generated=JSON.parse(p.calls[2].options.body);assert.deepEqual(counted,generated);
  }
});
test('pilot oversized and malformed bodies never call the provider or consume attempts',async()=>{
  const db=database(),p=provider();
  for(const body of ['x'.repeat(300),'{invalid',JSON.stringify({fixtureId:'plants',goal:'steps',extra:'x'.repeat(1000)})]){
    const r=await pilot.revisePilot(new Request('https://private.example/api/ai/pilot/revise',{method:'POST',headers:{'content-type':'application/json'},body}),env(db),p.fetch,now);assert.equal(r.status,400);
  }
  assert.equal(p.calls.length,0);assert.equal(budget(db).attempts,0);
});

const modelResponse = proposal => Response.json({model:'muse-spark-1.3',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:proposal}]}],usage:{input_tokens:1000,output_tokens:500,total_tokens:1500}});
test('pilot warns without rejecting a response that keeps protected text but lacks the requested answer spaces',async()=>{
  const db=database(),p=provider({responses:()=>modelResponse(pilot.PILOT_FIXTURES.water.source)});
  const result=await(await pilot.revisePilot(request({fixtureId:'water',goal:'response'}),env(db),p.fetch,now)).json();
  assert.equal(result.proposal,pilot.PILOT_FIXTURES.water.source);
  assert.ok(result.qualityWarnings?.some(warning=>warning.code==='response_fields_missing'));
  assert.equal(budget(db).observed_micros,3375);assert.equal(budget(db).paused,0);
});
test('pilot accepts only existing-demand water answer fields without generic extra observation tasks',async()=>{
  const db=database();const proposal='물의 상태 변화\n초등학교 4학년 과학 활동지입니다.\n학습 목표: 얼음이 녹으며 생기는 변화를 관찰합니다.\n투명한 컵에 담긴 얼음이 녹는 모습을 관찰합니다.\n얼음의 모양 변화: ____________________\n물의 양 변화: ____________________\n짝의 관찰 내용과 비교: ____________________\n안전 수칙: 실험 재료는 먹지 않습니다.';
  const p=provider({responses:()=>modelResponse(proposal)});
  const result=await(await pilot.revisePilot(request({fixtureId:'water',goal:'response'}),env(db),p.fetch,now)).json();assert.deepEqual(result.qualityWarnings,[]);
  const prompt=JSON.parse(p.calls[2].options.body);
  for(const label of ['얼음의 모양 변화','물의 양 변화','짝의 관찰 내용과 비교'])assert.ok(prompt.instructions.includes(label+': ____________________'));
  assert.equal(prompt.input,pilot.PILOT_FIXTURES.water.source);
});
test('pilot flags extra fraction-writing fields while valid comparison and relationship fields pass',async()=>{
  const base='같은 크기의 분수\n초등학교 5학년 수학 활동지입니다.\n학습 목표: 그림을 이용하여 크기가 같은 분수를 찾습니다.\n크기가 같은 직사각형 두 개를 종이에 그립니다.\n하나는 2칸으로, 다른 하나는 4칸으로 똑같이 나눕니다.\n첫 번째 그림의 1칸과 두 번째 그림의 2칸을 색칠합니다.\n색칠한 부분의 크기 비교: ____________________\n1/2과 2/4의 관계: ____________________\n확인 사항: 비교하는 두 직사각형의 전체 크기는 같아야 합니다.';
  for(const [extra,code] of [['',null],['\n색칠 후 관찰한 내용: ____________________','extra_response_fields']]){
    const db=database(),p=provider({responses:()=>modelResponse(base+extra)});const result=await(await pilot.revisePilot(request({fixtureId:'fractions',goal:'response'}),env(db),p.fetch,now)).json();
    if(code)assert.ok(result.qualityWarnings.some(warning=>warning.code===code));else assert.deepEqual(result.qualityWarnings,[]);
    assert.equal(result.proposal,base+extra);
  }
});
test('pilot flags implied movement additions in steps but accepts observation in the original location',async()=>{
  for(const [line,expectWarning] of [['1. 학교 화단으로 이동합니다.\n2. 잎의 모양과 색을 관찰합니다.',true],['1. 학교 화단에서 잎의 모양과 색을 관찰합니다.',false]]){
    const proposal='봄의 식물 관찰\n초등학교 3학년 과학 활동지입니다.\n학습 목표: 식물 잎의 모양과 색을 관찰하고 비교합니다.\n'+line+'\n3. 친구와 관찰한 점을 이야기합니다.\n4. 차이를 두 가지 적습니다.\n안전 수칙: 식물을 꺾거나 맛보지 않습니다.';
    const db=database(),p=provider({responses:()=>modelResponse(proposal)});const result=await(await pilot.revisePilot(request(),env(db),p.fetch,now)).json();assert.equal(result.qualityWarnings?.some(warning=>warning.code==='added_movement_step'),expectWarning);assert.equal(result.proposal,proposal);
  }
});
test('pilot flags repeated full instructions before newly numbered instructions',async()=>{
  const proposal=pilot.PILOT_FIXTURES.water.source+'\n1. 얼음의 모양 변화를 적습니다.\n2. 물의 양 변화를 적습니다.';
  const db=database(),p=provider({responses:()=>modelResponse(proposal)});const result=await(await pilot.revisePilot(request({fixtureId:'water',goal:'steps'}),env(db),p.fetch,now)).json();assert.ok(result.qualityWarnings?.some(warning=>warning.code==='source_instructions_repeated'));
});

test('pilot remains usable through the approved submission window and fails closed exactly at 11:00 KST',async()=>{
  const db=database(),p=provider();const before=()=>Date.parse('2026-11-05T01:59:59.999Z');
  const status=await(await pilot.pilotStatus(env(db),before)).json();assert.equal(status.available,true);assert.equal(status.pricingExpiresAt,'2026-11-05T02:00:00.000Z');
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,before)).status,200);
  const deadline=()=>Date.parse('2026-11-05T02:00:00.000Z');
  assert.equal((await(await pilot.pilotStatus(env(db),deadline)).json()).reason,'pricing_expired');
  assert.equal((await pilot.revisePilot(request(),env(db),p.fetch,deadline)).status,503);
  assert.equal(budget(db).attempts,1);assert.equal(budget(db).committed_micros,100000);assert.equal(budget(db).observed_micros,3375);assert.equal(p.calls.length,3);
});
