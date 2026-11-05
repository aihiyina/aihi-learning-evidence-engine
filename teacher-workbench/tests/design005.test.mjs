import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const html=read('index.html'), css=read('style.css'), tokens=read('tokens.css'), app=read('app.js');
// These are source contract checks, not computed-layout or assistive-technology tests.
test('DESIGN-005 source keeps labelled inputs, readonly original and honest simulation/Meta labels',()=>{
 for(const id of ['input','original','draft']) assert.match(html,new RegExp('for="'+id+'"'));
 assert.match(html,/<textarea[^>]*id="original"[^>]*readonly/);
 assert.match(html,/규칙 기반 체험 · AI 호출 없음/); assert.match(html,/<button[^>]*id="metaGenerate"[^>]*disabled/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(html,/다른 기기와 동기화되지 않으며/);
});
test('DESIGN-005 source keeps responsive reflow, reduced motion and visible focus',()=>{
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.document-spread\{grid-template-columns:1fr/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/transition:none!important/);
 assert.match(css,/\.file-label:focus-within\{outline:3px solid var\(--blue\)/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
});
test('DESIGN-005 intake DOM and visual order both put direct paste before optional file route',()=>{
 assert.ok(html.indexOf('class="paste-route"')<html.indexOf('class="file-route"'));
 assert.match(css,/\.paste-route\{order:0;/);
 assert.match(css,/\.file-route\{order:1;/);
});
test('DESIGN-005 AI trial uses only bounded same-origin endpoints without client secrets',()=>{
 assert.doesNotMatch(html,/<script[^>]*src=["']https?:/i);
 assert.doesNotMatch(html,/<form\b[^>]*action=/i);
 const targets=[...app.matchAll(/\bfetch\(\s*['"]([^'"]+)['"]/g)].map(x=>x[1]);
 assert.deepEqual(targets,['/api/ai/pilot/status','/api/ai/pilot/revise','/api/ai/status','/api/ai/revise']);
 assert.equal((app.match(/\bfetch\s*\(/g)||[]).length,4); assert.match(app,/body:JSON\.stringify\(\{fixtureId:fixture\.id,goal\}\)/);
 assert.doesNotMatch(app,/XMLHttpRequest|WebSocket|api\.meta\.ai|META_API_KEY|Authorization|Bearer /);
 assert.match(app,/body:JSON\.stringify\(\{fixtureId\}\)/);
 assert.match(html,/실제 학생 자료는 보내지 않습니다/);
 assert.doesNotMatch(html,/외부 전송 없음/);
 assert.doesNotMatch(html,/DESIGN-005|DESIGN_OS|TYPE-02|개발 노트|작업 계약/);
});
function luminance(hex){const v=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('DESIGN-005 retained green button white text and secondary ink pass source-color contrast',()=>{
 const green=tokens.match(/--green-deep:(#[a-f\d]{6})/i)[1];
 const ink=tokens.match(/--ink:(#[a-f\d]{6})/i)[1];
 const secondary=tokens.match(/--text-secondary:(#[a-f\d]{6})/i)[1];
 assert.equal(green,'#278059');
 assert.ok(contrast(green,'#ffffff')>=4.5);
 assert.ok(contrast(ink,'#ffffff')>=4.5);
 assert.ok(contrast(secondary,'#f5f8f5')>=4.5);
});
