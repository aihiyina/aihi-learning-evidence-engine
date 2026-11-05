import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const moduleUrl=new URL('../public/revision.js',import.meta.url);
const exists=fs.existsSync(moduleUrl);
const api=exists?await import(moduleUrl):{};

test('local revision module exposes simulation and comparison functions',()=>{
 assert.equal(typeof api.buildRevision,'function'); assert.equal(typeof api.applySelection,'function'); assert.equal(typeof api.compareText,'function');
});
test('simulation creates actionable steps, preserving objective and safety verbatim',()=>{
 const source='잎 관찰\n학습목표: 잎의 모양과 색 차이를 두 가지 말합니다.\n잎 두 장을 관찰합니다. 색을 비교합니다. 차이를 두 가지 적습니다.\n안전: 잎을 입에 넣지 않습니다.';
 const p=api.buildRevision(source,'steps','');
 assert.equal(p.mode,'simulation');assert.equal(p.source,source);assert.ok(p.changes.length>0);
 const body=api.applySelection(p,p.changes.map(x=>x.id));
 assert.match(body,/1\. 잎 두 장을 관찰합니다\./);assert.ok(body.includes('학습목표: 잎의 모양과 색 차이를 두 가지 말합니다.'));assert.ok(body.includes('안전: 잎을 입에 넣지 않습니다.'));
 assert.equal(api.applySelection(p,[]),source);
});
test('teacher protected text locks its complete paragraph and rejects missing text',()=>{
 const source='설명\n물을 관찰합니다. 뜨거운 물은 교사만 만집니다.\n기록합니다.';
 const p=api.buildRevision(source,'steps','뜨거운 물은 교사만 만집니다.');
 assert.ok(!p.changes.some(x=>x.before.includes('뜨거운')));
 assert.throws(()=>api.buildRevision(source,'steps','없는 문장'),/원본/);
});
test('unknown goal and unsafe sizes are rejected without I/O',()=>{
 assert.throws(()=>api.buildRevision('자료','unknown',''),/목표/);assert.throws(()=>api.buildRevision('','steps',''));
 assert.throws(()=>api.buildRevision('x'.repeat(100001),'steps',''));
 const code=fs.readFileSync(moduleUrl,'utf8');assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|https?:/);
});
test('selection preserves line endings, whitespace and unselected changes',()=>{
 const s='자료\r\n  색을 관찰합니다. 모양을 기록합니다.  \r\n\r\n발표합니다.\r\n';const p=api.buildRevision(s,'steps','');
 assert.equal(api.applySelection(p,[]),s);
 const first=p.changes[0];const body=api.applySelection(p,[first.id]);assert.equal(body,s.slice(0,first.start)+first.after+s.slice(first.end));
 assert.throws(()=>api.applySelection(p,['bogus']),/선택/);
});
test('response goal adds learner answer space and does not claim semantic validation',()=>{
 const p=api.buildRevision('수업자료\n식물의 색을 살펴봅니다.','response','');const body=api.applySelection(p,p.changes.map(x=>x.id));
 assert.match(body,/내가 관찰한 점/);assert.match(body,/________/);assert.ok(p.changes.every(c=>c.reason));
});
test('text comparison bounds unchanged edges and respects unicode',()=>{
 const r=api.compareText('잎의 색을 적어요.','잎의 색과 모양을 적어요.');assert.equal(r.changed,true);assert.equal(r.before,'');assert.equal(r.after,'과 모양');
 const same=api.compareText('😀 원본','😀 원본');assert.equal(same.changed,false);
 const emoji=api.compareText('😀 자료','😃 자료');assert.equal(emoji.before,'😀');assert.equal(emoji.after,'😃');
});
test('punctuation without whitespace does not silently drop preceding content',()=>{const source='자료\nObserve.Record. Discuss!';const p=api.buildRevision(source,'steps','');const body=api.applySelection(p,p.changes.map(c=>c.id));assert.ok(body.includes('Observe.Record.'));assert.ok(body.includes('Discuss!'));});
