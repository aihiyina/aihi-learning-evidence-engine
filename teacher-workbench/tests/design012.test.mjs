import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../public/style.css',import.meta.url),'utf8');
const tokens=fs.readFileSync(new URL('../public/tokens.css',import.meta.url),'utf8');
test('latest original brand asset stays byte-identical and all referenced images exist',()=>{
 const hash=createHash('sha256').update(fs.readFileSync(new URL('../public/assets/aihi-logo.png',import.meta.url))).digest('hex');
 assert.equal(hash,'e00e625441a9fffaf630fc82ebf7e320ee2d4f781082783224c603fbaa60c3fb');
 for(const [,path] of html.matchAll(/src="(\/assets\/[^\"]+)"/g))assert.ok(fs.statSync(new URL('../public'+path,import.meta.url)).size>0);
 assert.match(html,/hero-paper.webp/);assert.match(html,/cover-plants.webp/);assert.match(html,/cover-fractions.webp/);assert.match(html,/cover-reading.webp/);
});
test('coral action and secondary text meet 4.5 contrast for normal text',()=>{
 function lum(hex){const rgb=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
 function ratio(a,b){const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return(x+.05)/(y+.05);}
 const coral=tokens.match(/--coral:#([a-f0-9]+)/)[1];const secondary=tokens.match(/--text-secondary:#([a-f0-9]+)/)[1];
 assert.ok(ratio('ffffff',coral)>=4.5);assert.ok(ratio('faf9f6',secondary)>=4.5);
});
test('comparison reclaims the side panel width and small screens expose save status and passage jump',()=>{
 assert.match(css,/\.editing-workspace\.comparing\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.comparing \.revision-panel\{display:none\}/);
 assert.match(html,/id="documentSaveState"/);assert.match(html,/id="editSelectionJump"/);
 assert.match(css,/@media\(max-width:760px\)\{\.document-save-state\{display:block/);
});
