import {MODEL, metaFetch} from './meta-trial.mjs';

// A separate campaign. Never rotate the ID or reseed a live ledger to replenish it.
// Standard prices checked 2026-11-04. Cached-input discounts are deliberately ignored.
export const PILOT_CAMPAIGN_ID = 'authorized-synthetic-quality-2026-11-04';
export const PILOT_LIMIT_MICROS = 9_950_000; // $0.05 held outside this campaign for historical calls.
export const PILOT_RESERVATION_MICROS = 100_000;
export const PILOT_MAX_ATTEMPTS = 96;
export const PILOT_MAX_INPUT_TOKENS = 10_000;
export const PILOT_MAX_OUTPUT_TOKENS = 4096;
export const PILOT_MIN_INTERVAL_MS = 10_000;
export const PILOT_PRICING_EXPIRES_AT = Date.parse('2026-11-05T02:00:00.000Z');
const PRICE_CHECKED_AT = Date.parse('2026-11-04T00:00:00.000Z');
const GOALS = Object.freeze(['steps', 'response']);
const fixture = (title, source, protectedLines) => Object.freeze({title, source, protectedLines:Object.freeze(protectedLines), protectedText:protectedLines[0]});
export const PILOT_FIXTURES = Object.freeze({
  plants:fixture('봄의 식물 관찰', '봄의 식물 관찰\n초등학교 3학년 과학 활동지입니다.\n학습 목표: 식물 잎의 모양과 색을 관찰하고 비교합니다.\n학교 화단에서 잎의 모양과 색을 관찰합니다. 친구와 관찰한 점을 이야기하고 차이를 두 가지 적습니다.\n안전 수칙: 식물을 꺾거나 맛보지 않습니다.', ['학습 목표: 식물 잎의 모양과 색을 관찰하고 비교합니다.','안전 수칙: 식물을 꺾거나 맛보지 않습니다.']),
  water:fixture('물의 상태 변화', '물의 상태 변화\n초등학교 4학년 과학 활동지입니다.\n학습 목표: 얼음이 녹으며 생기는 변화를 관찰합니다.\n투명한 컵에 담긴 얼음이 녹는 모습을 관찰합니다. 얼음의 모양과 물의 양이 어떻게 달라지는지 적습니다. 관찰한 내용을 짝과 비교합니다.\n안전 수칙: 실험 재료는 먹지 않습니다.', ['학습 목표: 얼음이 녹으며 생기는 변화를 관찰합니다.','안전 수칙: 실험 재료는 먹지 않습니다.']),
  reading:fixture('이야기 속 선택', '이야기 속 선택\n초등학교 5학년 국어 활동지입니다.\n학습 목표: 인물의 행동을 글의 내용에 근거하여 설명합니다.\n다음은 수업을 위해 만든 짧은 이야기입니다. “소라는 도서관에서 빌린 책에 낙서가 있는 것을 발견했습니다. 소라는 사서에게 낙서를 보여 주고 책을 돌려주었습니다.”\n이야기를 읽고 소라가 한 행동을 찾습니다. 그 행동을 설명할 수 있는 문장을 글에서 찾아 적고 짝과 생각을 나눕니다.\n활동 약속: 글에 없는 일을 사실처럼 덧붙이지 않습니다.', ['학습 목표: 인물의 행동을 글의 내용에 근거하여 설명합니다.','활동 약속: 글에 없는 일을 사실처럼 덧붙이지 않습니다.']),
  fractions:fixture('같은 크기의 분수', '같은 크기의 분수\n초등학교 5학년 수학 활동지입니다.\n학습 목표: 그림을 이용하여 크기가 같은 분수를 찾습니다.\n크기가 같은 직사각형 두 개를 종이에 그립니다. 하나는 똑같이 2칸으로, 다른 하나는 똑같이 4칸으로 나눕니다. 첫 번째 그림의 1칸과 두 번째 그림의 2칸을 색칠합니다. 색칠한 부분의 크기를 비교하고 1/2과 2/4의 관계를 설명합니다.\n확인 사항: 비교하는 두 직사각형의 전체 크기는 같아야 합니다.', ['학습 목표: 그림을 이용하여 크기가 같은 분수를 찾습니다.','확인 사항: 비교하는 두 직사각형의 전체 크기는 같아야 합니다.']),
  discussion:fixture('학급 도서관 이용 토의', '학급 도서관 이용 토의\n중학교 1학년 국어 활동지입니다.\n학습 목표: 주장을 뒷받침하는 이유를 들어 의견을 나눕니다.\n학급 도서관의 책을 여러 사람이 편리하게 이용하려면 어떤 약속이 필요한지 토의합니다. 자신의 의견과 그 이유를 적고, 모둠에서 서로의 생각을 듣습니다. 함께 정할 수 있는 약속 한 가지를 골라 이유를 정리합니다.\n활동 약속: 다른 의견을 비난하지 않고 끝까지 듣습니다.', ['학습 목표: 주장을 뒷받침하는 이유를 들어 의견을 나눕니다.','활동 약속: 다른 의견을 비난하지 않고 끝까지 듣습니다.']),
  ecology:fixture('학교 주변 생물 기록', '학교 주변 생물 기록\n중학교 1학년 과학 활동지입니다.\n학습 목표: 생물의 특징을 관찰 사실과 해석으로 구분하여 기록합니다.\n교사가 정한 학교 안 구역에서 생물을 관찰합니다. 눈으로 본 모양과 움직임을 기록하고, 그 기록을 바탕으로 생각한 점을 따로 적습니다. 친구의 기록과 비교하며 관찰 사실과 생각을 구분합니다.\n안전 수칙: 생물을 만지거나 채집하지 않고 정해진 구역을 벗어나지 않습니다.', ['학습 목표: 생물의 특징을 관찰 사실과 해석으로 구분하여 기록합니다.','안전 수칙: 생물을 만지거나 채집하지 않고 정해진 구역을 벗어나지 않습니다.'])
});

// These targets are extracted from the immutable synthetic source, not from browser input.
// They constrain editing; they are not model-generated facts or additional assignments.
const EDITING_CONTRACT = Object.freeze({
  plants:{actions:['학교 화단에서 잎의 모양과 색을 관찰하기','친구와 관찰한 점 이야기하기','관찰한 잎의 차이 두 가지 적기'],responseLabels:['잎의 차이 1','잎의 차이 2']},
  water:{actions:['투명한 컵에 담긴 얼음이 녹는 모습 관찰하기','얼음의 모양 변화와 물의 양 변화 적기','관찰한 내용을 짝과 비교하기'],responseLabels:['얼음의 모양 변화','물의 양 변화','짝의 관찰 내용과 비교']},
  reading:{actions:['제시된 이야기 읽기','소라가 한 행동 찾기','그 행동을 설명할 수 있는 문장을 글에서 찾아 적기','짝과 생각 나누기'],responseLabels:['글에서 찾은 근거 문장']},
  fractions:{actions:['크기가 같은 직사각형 두 개를 종이에 그리기','하나는 똑같이 2칸, 다른 하나는 똑같이 4칸으로 나누기','첫 번째 그림의 1칸과 두 번째 그림의 2칸을 색칠하기','색칠한 부분의 크기 비교하기','1/2과 2/4의 관계 설명하기'],responseLabels:['색칠한 부분의 크기 비교','1/2과 2/4의 관계']},
  discussion:{actions:['학급 도서관을 편리하게 이용할 약속에 관하여 토의하기','자신의 의견과 그 이유 적기','모둠에서 서로의 생각 듣기','함께 정할 약속 한 가지 고르고 그 이유 정리하기'],responseLabels:['나의 의견','의견의 이유','함께 정한 약속 한 가지','약속을 정한 이유']},
  ecology:{actions:['교사가 정한 학교 안 구역에서 생물 관찰하기','눈으로 본 모양과 움직임 기록하기','관찰 기록을 바탕으로 생각한 점을 따로 적기','친구의 기록과 비교하며 관찰 사실과 생각 구분하기'],responseLabels:['눈으로 본 모양','눈으로 본 움직임','관찰 기록을 바탕으로 생각한 점','친구의 기록과 비교']}
});
const ANSWER_BLANK = '____________________';
const PROMPT_VERSION = 'synthetic-edit-v2';

const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const validTime = timestamp => Number.isSafeInteger(timestamp) && timestamp >= PRICE_CHECKED_AT && timestamp < PILOT_PRICING_EXPIRES_AT;
function validBudget(row) {
  return row?.id === PILOT_CAMPAIGN_ID && row.limit_micros === PILOT_LIMIT_MICROS &&
    ['attempts','committed_micros','observed_micros','next_allowed_at'].every(k=>Number.isSafeInteger(row[k])&&row[k]>=0) &&
    row.attempts <= PILOT_MAX_ATTEMPTS && row.committed_micros <= PILOT_LIMIT_MICROS &&
    row.committed_micros >= row.attempts * PILOT_RESERVATION_MICROS && row.observed_micros <= row.committed_micros &&
    [0,1].includes(row.paused) && (row.in_flight_id === null || typeof row.in_flight_id === 'string');
}
async function readBudget(db) {
  let row = await db.prepare('SELECT * FROM ai_pilot_budget WHERE id=?').bind(PILOT_CAMPAIGN_ID).first();
  if(!row){
    const history=await db.prepare('SELECT COUNT(*) AS count FROM ai_pilot_attempts WHERE campaign_id=?').bind(PILOT_CAMPAIGN_ID).first();
    if(history?.count!==0)throw Error('storage_unavailable');
    row={id:PILOT_CAMPAIGN_ID,limit_micros:PILOT_LIMIT_MICROS,attempts:0,committed_micros:0,observed_micros:0,in_flight_id:null,paused:0,next_allowed_at:0};
  }
  if(!validBudget(row)) throw Error('storage_unavailable');
  return row;
}
function unavailableReason(row, timestamp) {
  if(row.paused) return 'campaign_paused';
  if(row.in_flight_id) return 'request_in_progress';
  if(row.attempts >= PILOT_MAX_ATTEMPTS || row.committed_micros + PILOT_RESERVATION_MICROS > row.limit_micros) return 'budget_exhausted';
  if(row.next_allowed_at > timestamp) return 'rate_limited';
  return null;
}
function budgetInfo(row) {
  return {budgetLimitUsd:PILOT_LIMIT_MICROS/1e6,budgetReservedUsd:row.committed_micros/1e6,budgetRemainingUsd:Math.max(0,PILOT_LIMIT_MICROS-row.committed_micros)/1e6,estimatedObservedCostUsd:row.observed_micros/1e6,attempts:row.attempts,maxAttempts:PILOT_MAX_ATTEMPTS,remainingAttempts:Math.min(PILOT_MAX_ATTEMPTS-row.attempts,Math.floor((PILOT_LIMIT_MICROS-row.committed_micros)/PILOT_RESERVATION_MICROS))};
}
export async function pilotStatus(env, clock=Date.now) {
  const configured=!!env.META_API_KEY;
  const metadata={configured,model:MODEL,mode:'meta',syntheticOnly:true,promptVersion:PROMPT_VERSION,goals:GOALS,fixtures:Object.entries(PILOT_FIXTURES).map(([id, f])=>({id,title:f.title,source:f.source,protectedText:f.protectedText,protectedLines:f.protectedLines})),pricingExpiresAt:new Date(PILOT_PRICING_EXPIRES_AT).toISOString()};
  try {
    if(!env.DB) throw Error('storage_unavailable');
    const row=await readBudget(env.DB),timestamp=clock();
    const reason=!configured?'not_configured':!validTime(timestamp)?'pricing_expired':unavailableReason(row,timestamp);
    return json({...metadata,...budgetInfo(row),available:!reason,reason:reason??'synthetic_only',retryAfterMs:reason==='rate_limited'?row.next_allowed_at-timestamp:0});
  } catch {return json({...metadata,available:false,reason:'storage_unavailable',budgetRemainingUsd:0},503);}
}
export function pilotRequestBody(fixtureId, goal) {
  const f=PILOT_FIXTURES[fixtureId],contract=EDITING_CONTRACT[fixtureId];
  if(!f || !GOALS.includes(goal)) throw Error('synthetic_only');
  return {model:MODEL,input:f.source,instructions:[
    '당신은 교사의 합성 수업자료를 다듬는 편집자입니다. 결과는 학생에게 보여 줄 완성된 활동지 본문만 한국어로 작성하세요.',
    '원본의 학년, 제목의 의미, 학습 목표, 모든 필수 활동, 수치, 고유 이름, 이야기 내용과 안전 수칙을 유지하세요. 새 사실·정답·준비물·수업 단계·평가 기준·학생 정보·시간을 만들지 마세요.',
    '제목·학년·보호 문장·읽을 이야기와 실제 활동 지시를 포함한 하나의 완성본을 만드세요. 원래 활동 문단을 통째로 붙인 뒤 같은 내용을 번호 활동으로 반복하지 마세요. 활동 지시는 다듬어진 형태로 한 번씩만 제시하세요.',
    '다음은 원본에서 확인한 활동 목록입니다. 이 목록의 활동만 유지하고 필요한 경우 한 문장을 짧게 나누세요. 장소로 이동하기, 도구 가져오기, 준비·정리하기 등 암묵적으로 필요해 보여도 원본에 없는 행동은 단계로 추가하지 마세요. 단순히 그리기·색칠하기·읽기·말하기를 한 뒤 추가 기록이나 근거를 쓰게 하지 마세요.',
    ...contract.actions.map(action=>'허용 활동: '+action),
    ...(goal==='steps' ? [
      '위의 기존 활동을 순서대로 실행할 수 있도록 1. 2. 3. 형태의 짧은 번호 문장으로 작성하세요. 번호마다 원본의 행동 하나 또는 밀접하게 연결된 행동만 담으세요. 별도의 사전 이동·준비 단계와 새 답란은 넣지 마세요.'
    ] : [
      '기존 활동을 간결한 지시로 한 번씩 제시하고, 원래 적기·비교·설명을 요구한 내용에만 답란을 붙이세요. 다음 목록이 허용되는 답란 전체입니다. 각 줄을 해당 지시 바로 뒤에 정확히 한 번 넣고 다른 답란은 추가하지 마세요. 밑줄도 실제 문자로 출력해야 합니다. 라벨만 쓰거나 “적어 보세요”로 대신하면 안 됩니다.',
      ...contract.responseLabels.map(label=>label+': '+ANSWER_BLANK),
      '위 답란에 답을 미리 채우지 마세요. “관찰한 내용:”이나 “근거:” 같은 범용 항목을 그리기·색칠하기 등 모든 행동 뒤에 붙이지 마세요. 비교·설명 답란이 있더라도 그 밖의 새로운 글쓰기 과제를 만들지 마세요.'
    ]),
    '다음 보호 문장은 각각 한 줄로 정확히 한 번, 글자와 문장부호를 바꾸지 않고 본문에 포함하세요:',
    ...f.protectedLines,
    '원본 속 인용문은 내용과 문장을 그대로 유지하세요. 설명·인사·작업 메모·모델명·마크다운 코드 블록·외부 링크는 넣지 마세요. 1800자 이내로 작성하세요.'
  ].join('\n'),max_output_tokens:PILOT_MAX_OUTPUT_TOKENS,reasoning:{effort:'minimal'},store:false,stream:false,tools:[]};
}
function validateBody(body) {
  return !!body && !Array.isArray(body) && Object.keys(body).length===2 && typeof body.fixtureId==='string' && Object.hasOwn(PILOT_FIXTURES,body.fixtureId) && typeof body.goal==='string' && GOALS.includes(body.goal);
}
async function readRequestBody(request) {
  const reader=request.body?.getReader(); if(!reader) throw Error('invalid_request');
  const chunks=[];let length=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>256){await reader.cancel();throw Error('synthetic_only');}chunks.push(value);}}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try {return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('invalid_request');}
}
async function reserve(db,id,timestamp) {
  // Schema-only migrations: initialize once only while BOTH accounting tables are empty.
  // A missing budget with existing attempt history is never replenished.
  const initialized=await db.prepare(`INSERT INTO ai_pilot_budget (id,limit_micros,attempts,committed_micros,observed_micros,in_flight_id,paused,next_allowed_at,updated_at)
    SELECT ?,?,0,0,0,NULL,0,0,? WHERE NOT EXISTS (SELECT 1 FROM ai_pilot_budget WHERE id=?)
    AND NOT EXISTS (SELECT 1 FROM ai_pilot_attempts WHERE campaign_id=?) ON CONFLICT(id) DO NOTHING`).bind(PILOT_CAMPAIGN_ID,PILOT_LIMIT_MICROS,new Date(timestamp).toISOString(),PILOT_CAMPAIGN_ID,PILOT_CAMPAIGN_ID).run();
  if(!initialized.success)throw Error('storage_unavailable');
  // One atomic conditional write is the admission authority, never status/read results.
  return db.prepare(`UPDATE ai_pilot_budget SET attempts=attempts+1,committed_micros=committed_micros+?,in_flight_id=?,next_allowed_at=?,updated_at=?
    WHERE id=? AND limit_micros=? AND attempts>=0 AND attempts<? AND committed_micros>=attempts*?
    AND observed_micros>=0 AND observed_micros<=committed_micros AND committed_micros+?<=limit_micros
    AND paused=0 AND in_flight_id IS NULL AND next_allowed_at<=? RETURNING *`).bind(
      PILOT_RESERVATION_MICROS,id,timestamp+PILOT_MIN_INTERVAL_MS,new Date(timestamp).toISOString(),PILOT_CAMPAIGN_ID,PILOT_LIMIT_MICROS,PILOT_MAX_ATTEMPTS,PILOT_RESERVATION_MICROS,PILOT_RESERVATION_MICROS,timestamp).first();
}
function parseUsage(data) {
  const usage=data?.usage;
  if(data?.model!==MODEL || !usage || !Number.isSafeInteger(usage.input_tokens) || usage.input_tokens<1 || usage.input_tokens>PILOT_MAX_INPUT_TOKENS || !Number.isSafeInteger(usage.output_tokens) || usage.output_tokens<0 || usage.output_tokens>PILOT_MAX_OUTPUT_TOKENS || !Number.isSafeInteger(usage.total_tokens) || usage.total_tokens!==usage.input_tokens+usage.output_tokens) throw Error('accounting_uncertain');
  // Integer arithmetic: USD/million => micro-dollars per token (5/4 and 17/4).
  const observedMicros=Math.ceil((usage.input_tokens*5+usage.output_tokens*17)/4);
  if(observedMicros>PILOT_RESERVATION_MICROS) throw Error('accounting_uncertain');
  return {usage:{input_tokens:usage.input_tokens,output_tokens:usage.output_tokens,total_tokens:usage.total_tokens},observedMicros};
}
function parseProposal(data, fixtureId) {
  if(data.status!=='completed' || !Array.isArray(data.output)) throw Error('invalid_output');
  const proposal=data.output.filter(item=>item?.type==='message'&&item.role==='assistant').flatMap(item=>Array.isArray(item.content)?item.content:[]).filter(item=>item?.type==='output_text'&&typeof item.text==='string').map(item=>item.text).join('\n').trim();
  if(!proposal || proposal.length>6000 || /```|https?:\/\//i.test(proposal)) throw Error('invalid_output');
  for(const protectedLine of PILOT_FIXTURES[fixtureId].protectedLines) if(proposal.split(protectedLine).length!==2) throw Error('protected_text_changed');
  return proposal;
}
function qualityWarnings(proposal,fixtureId,goal) {
  // Advisory structural checks only. They cannot certify pedagogical or semantic fidelity.
  // Safe, accounted output remains available for teacher review rather than being retried.
  const warnings=[],f=PILOT_FIXTURES[fixtureId],contract=EDITING_CONTRACT[fixtureId];
  const lines=proposal.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const numbered=lines.filter(line=>/^(?:\d+[.)]|활동\s*\d+[.)])\s*/.test(line));
  if(goal==='response'){
    const expected=contract.responseLabels.map(label=>label+': '+ANSWER_BLANK);
    if(expected.some(field=>lines.filter(line=>line===field).length!==1))warnings.push({code:'response_fields_missing',message:'일부 답란이 빠졌거나 형식이 다릅니다. 원래 요구한 내용에 답을 적을 공간이 있는지 확인하세요.'});
    const blankLines=lines.filter(line=>/_{6,}/.test(line));
    if(blankLines.some(line=>!expected.includes(line)) || blankLines.length>expected.length)warnings.push({code:'extra_response_fields',message:'추가 답란이 있을 수 있습니다. 원문에 없던 기록 과제가 생기지 않았는지 확인하세요.'});
  }else{
    if(numbered.length<2)warnings.push({code:'steps_not_numbered',message:'활동이 짧은 번호 단계로 나뉘었는지 확인하세요.'});
    if(numbered.some(line=>/(?:이동(?:합니다|하세요|해|하)|가져오|준비(?:합니다|하세요))/u.test(line)))warnings.push({code:'added_movement_step',message:'원문에 없던 이동이나 준비 단계가 추가되었는지 확인하세요.'});
  }
  const originalParagraphs=f.source.split('\n').filter(line=>line.length>=40&&!f.protectedLines.includes(line)&&!line.includes('“'));
  if(numbered.length && originalParagraphs.some(line=>proposal.includes(line)))warnings.push({code:'source_instructions_repeated',message:'원래 활동 문단과 번호 지시가 겹칠 수 있습니다. 같은 활동이 두 번 적히지 않았는지 확인하세요.'});
  return warnings;
}
async function settle(db,id,state,timestamp,{usage=null,observedMicros=0,errorCode=null,uncertain=false}={}) {
  const finished=new Date(timestamp).toISOString();
  const results=await db.batch([
    db.prepare('UPDATE ai_pilot_attempts SET state=?,input_tokens=?,output_tokens=?,observed_micros=?,error_code=?,finished_at=? WHERE id=? AND campaign_id=? AND state=?').bind(state,usage?.input_tokens??null,usage?.output_tokens??null,usage?observedMicros:null,errorCode,finished,id,PILOT_CAMPAIGN_ID,'reserved'),
    db.prepare(`UPDATE ai_pilot_budget SET observed_micros=observed_micros+?,in_flight_id=?,paused=?,updated_at=?
      WHERE id=? AND in_flight_id=? AND EXISTS (SELECT 1 FROM ai_pilot_attempts WHERE id=? AND campaign_id=? AND state=?) RETURNING *`).bind(observedMicros,uncertain?id:null,uncertain?1:0,finished,PILOT_CAMPAIGN_ID,id,id,PILOT_CAMPAIGN_ID,state)
  ]);
  const row=results[1]?.results?.[0];
  if(results[0]?.meta?.changes!==1 || !validBudget(row)) throw Error('accounting_uncertain');
  return row;
}
function safeError(error) {
  return String(error?.message??'').match(/^(model_unavailable|input_limit|invalid_output|protected_text_changed|accounting_uncertain|pricing_expired|credential_format|timeout_api_unsupported|meta_timeout|meta_redirect|meta_transport|meta_invalid_json|meta_http_\d{3})$/)?.[0]??'request_failed';
}
export async function revisePilot(request,env,fetcher=fetch,clock=Date.now) {
  const origin=request.headers.get('origin');
  if((origin && origin!==new URL(request.url).origin) || request.headers.get('sec-fetch-site')==='cross-site') return json({error:'origin_rejected'},403);
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json') return json({error:'json_required'},415);
  if(!env.META_API_KEY || !env.DB) return json({error:'not_configured'},503);
  let timestamp=clock();if(!validTime(timestamp)) return json({error:'pricing_expired'},503);
  let body;try{body=await readRequestBody(request);}catch(error){return json({error:error.message==='synthetic_only'?'synthetic_only':'invalid_request'},400);}
  if(!validateBody(body)) return json({error:'synthetic_only'},400);
  const id=crypto.randomUUID();let ticket;
  try {
    await readBudget(env.DB);
    ticket=await reserve(env.DB,id,timestamp);
    if(!ticket){const row=await readBudget(env.DB);return json({error:unavailableReason(row,timestamp)??'budget_unavailable',...budgetInfo(row)},429);}
    if(!validBudget(ticket))throw Error('storage_unavailable');
    const inserted=await env.DB.prepare('INSERT INTO ai_pilot_attempts (id,campaign_id,fixture_id,goal,state,reserved_micros,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,PILOT_CAMPAIGN_ID,body.fixtureId,body.goal,'reserved',PILOT_RESERVATION_MICROS,new Date(timestamp).toISOString()).run();
    if(!inserted.success || inserted.meta?.changes!==1)throw Error('storage_unavailable');
  } catch {return json({error:'budget_unavailable',attemptConsumed:!!ticket},503);}
  let callStarted=false,settled=false;
  try {
    const models=await metaFetch(env.META_API_KEY,'models',null,fetcher);
    if(!Array.isArray(models.data) || !models.data.some(model=>model.id===MODEL)) throw Error('model_unavailable');
    const payload=pilotRequestBody(body.fixtureId,body.goal);
    const counted=await metaFetch(env.META_API_KEY,'responses/input_tokens',payload,fetcher);
    if(!Number.isSafeInteger(counted.input_tokens) || counted.input_tokens<1 || counted.input_tokens>PILOT_MAX_INPUT_TOKENS) throw Error('input_limit');
    timestamp=clock();if(!validTime(timestamp))throw Error('pricing_expired');
    callStarted=true;
    const data=await metaFetch(env.META_API_KEY,'responses',payload,fetcher);
    const accounted=parseUsage(data);
    let proposal,outputError;
    try{proposal=parseProposal(data,body.fixtureId);}catch(error){outputError=safeError(error);}
    let row;try{row=await settle(env.DB,id,outputError?'rejected_output':'completed',clock(),{...accounted,errorCode:outputError??null});}catch{throw Error('accounting_uncertain');}
    settled=true;
    if(outputError)return json({error:outputError,...budgetInfo(row),attemptConsumed:true,estimatedCostUsd:accounted.observedMicros/1e6},502);
    return json({source:PILOT_FIXTURES[body.fixtureId].source,proposal,fixtureId:body.fixtureId,goal:body.goal,model:MODEL,mode:'meta',syntheticOnly:true,promptVersion:PROMPT_VERSION,qualityWarnings:qualityWarnings(proposal,body.fixtureId,body.goal),...accounted,observedMicros:undefined,estimatedCostUsd:accounted.observedMicros/1e6,preflightInputTokens:counted.input_tokens,...budgetInfo(row)});
  } catch(error) {
    const code=safeError(error);
    // A lost settlement response may already have released the lock. Pause independently
    // before reconciliation so even that uncertain outcome cannot admit another call.
    if(callStarted)try{await env.DB.prepare('UPDATE ai_pilot_budget SET paused=1 WHERE id=?').bind(PILOT_CAMPAIGN_ID).run();}catch{}
    if(!settled)try{await settle(env.DB,id,callStarted?'generation_uncertain':'failed_before_generation',clock(),{errorCode:code,uncertain:callStarted});}catch{/* The permanent reservation and lock remain fail-closed. */}
    return json({error:code,attemptConsumed:true,campaignPaused:callStarted,...budgetInfo(ticket)},502);
  }
}
