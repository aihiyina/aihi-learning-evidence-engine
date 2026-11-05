import {buildRevision,applySelection,compareText,SYNTHETIC_LESSON} from '../public/revision.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {LessonDocument} from '../public/lesson.js';

const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const code=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'');
const fixture={fixtureId:'plants',source:'가상 관찰 원본',proposal:'가상 관찰 수정안',remaining:1,estimatedCostUsd:0.001,usage:{input_tokens:120,output_tokens:80}};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({status={configured:true,available:true,remaining:2},revise=async()=>({ok:true,status:200,json:async()=>fixture})}={}){
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,disabled:false,hidden:false,textContent:'',focus(){},files:[]}]));
 nodes.aiFixture.value='plants';nodes.aiRun.disabled=true;nodes.aiProposalPanel.hidden=true;
 const calls=[],storage=new Map();
 const c={LessonDocument,buildRevision,applySelection,compareText,SYNTHETIC_LESSON,document:{getElementById:id=>nodes[id],createElement:()=>({click(){}})},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>true,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob:class{},setTimeout:f=>f(),fetch:async(url,options)=>{calls.push({url,options});if(url==='/api/ai/status')return {ok:true,status:200,json:async()=>status};if(url==='/api/ai/revise')return revise();throw Error('unexpected endpoint');}};
 vm.createContext(c);vm.runInContext(code,c);await settle();return{nodes,c,calls};
}
function manual(n){n.input.value='PRIVATE STUDENT CONTENT';n.start.onclick();n.draft.value='PRIVATE DRAFT';n.draft.oninput();}

test('AI trial loads status only and remains disabled without configured availability',async()=>{
 const{nodes:n,calls}=await setup({status:{configured:false,available:false,remaining:2}});
 assert.deepEqual(calls.map(x=>x.url),['/api/ai/status']);assert.equal(n.aiRun.disabled,true);
 await n.aiRun.onclick();assert.equal(calls.length,1);
 assert.match(n.aiStatus.textContent,/준비/);
});
test('AI trial POST contains only fixtureId, never private input or draft',async()=>{
 const{nodes:n,calls}=await setup();manual(n);await n.aiRun.onclick();
 const post=calls.filter(x=>x.options?.method==='POST');assert.equal(post.length,1);
 assert.equal(post[0].url,'/api/ai/revise');assert.deepEqual(JSON.parse(post[0].options.body),{fixtureId:'plants'});
 assert.doesNotMatch(post[0].options.body,/PRIVATE/);assert.equal(post[0].options.credentials,'same-origin');
 assert.equal(n.original.value,'PRIVATE STUDENT CONTENT');assert.equal(n.draft.value,'PRIVATE DRAFT');
 assert.equal(n.aiProposalText.textContent,fixture.proposal);assert.equal(n.aiProposalPanel.hidden,false);
});
test('AI trial in-flight double click cannot create another generation request',async()=>{
 let release;const blocked=new Promise(resolve=>release=resolve);
 const{nodes:n,calls}=await setup({revise:()=>blocked});
 const first=n.aiRun.onclick();assert.equal(n.aiRun.disabled,true);assert.equal(n.aiFixture.disabled,true);
 await n.aiRun.onclick();assert.equal(calls.filter(x=>x.options?.method==='POST').length,1);
 release({ok:true,status:200,json:async()=>fixture});await first;assert.equal(n.aiFixture.disabled,false);
});
test('AI proposal apply cancellation preserves active original, draft and approval',async()=>{
 const{nodes:n,c}=await setup();manual(n);n.reviewed.checked=true;n.reviewed.onchange();n.approve.onclick();
 await n.aiRun.onclick();assert.equal(n.export.disabled,false);
 c.confirm=()=>false;n.aiApply.onclick();
 assert.equal(n.original.value,'PRIVATE STUDENT CONTENT');assert.equal(n.draft.value,'PRIVATE DRAFT');assert.equal(n.export.disabled,false);
});
test('AI proposal accepted explicitly uses synthetic source and requires human review',async()=>{
 const{nodes:n}=await setup();manual(n);await n.aiRun.onclick();n.aiApply.onclick();
 assert.equal(n.original.value,fixture.source);assert.equal(n.draft.value,fixture.proposal);assert.equal(n.reviewed.checked,false);assert.equal(n.export.disabled,true);assert.equal(n.intake.hidden,true);
 assert.match(n.status.textContent,/검토/);
});
test('AI generation error does not retry automatically or mutate teacher content',async()=>{
 const{nodes:n,calls}=await setup({revise:async()=>({ok:false,status:429,json:async()=>({remaining:0})})});manual(n);
 await n.aiRun.onclick();await settle();assert.equal(calls.filter(x=>x.options?.method==='POST').length,1);
 assert.equal(n.original.value,'PRIVATE STUDENT CONTENT');assert.equal(n.draft.value,'PRIVATE DRAFT');assert.equal(n.aiRun.disabled,true);assert.equal(n.aiProposalPanel.hidden,true);
 assert.match(n.aiStatus.textContent,/자동으로 다시 요청하지/);
});
test('AI transport failure has no automatic retry and cannot expose a stale proposal',async()=>{
 const{nodes:n,calls}=await setup({revise:async()=>{throw Error('network');}});manual(n);
 await n.aiRun.onclick();await settle();assert.equal(calls.filter(x=>x.options?.method==='POST').length,1);
 assert.equal(n.aiProposalPanel.hidden,true);assert.equal(n.aiApply.disabled,true);assert.equal(n.draft.value,'PRIVATE DRAFT');
});
test('AI mismatched fixture response is rejected and never becomes an applicable proposal',async()=>{
 const{nodes:n}=await setup({revise:async()=>({ok:true,status:200,json:async()=>({...fixture,fixtureId:'water'})})});
 await n.aiRun.onclick();assert.equal(n.aiProposalPanel.hidden,true);assert.equal(n.aiApply.disabled,true);assert.match(n.aiStatus.textContent,/응답을 확인하지 못/);
});
