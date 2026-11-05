// Browser-local rule preview. This module never calls a model or sends content.
const MAX=100000;
export const SYNTHETIC_LESSON='잎의 모양과 색 관찰하기\n\n학습목표: 잎의 모양과 색의 차이를 두 가지 설명합니다.\n\n잎 두 장을 관찰합니다. 잎의 모양과 색을 비교합니다. 친구와 관찰한 점을 이야기합니다. 잎의 모양과 색에서 다른 점을 두 가지 적습니다.\n\n안전: 잎을 입에 넣지 않고, 활동 뒤에는 손을 씻습니다.';
export function buildRevision(source,goal,protectedText=''){
 if(typeof source!=='string'||!source.trim()||source.length>MAX)throw Error('내용이 있는 원본을 입력해 주세요. 최대 100,000자까지 사용할 수 있습니다.');
 if(!['steps','response'].includes(goal))throw Error('다듬기 목표를 선택해 주세요.');
 if(typeof protectedText!=='string'||protectedText.length>2000)throw Error('보존할 문장은 2,000자 이내로 입력해 주세요.');
 const lock=protectedText.trim();if(lock&&!source.includes(lock))throw Error('보존할 문장이 원본에 없습니다. 원본에서 그대로 복사해 주세요.');
 const changes=[],protectedLines=[];let position=0,step=0;
 const lines=source.split(/(\r\n|\n|\r)/);
 for(let i=0;i<lines.length;i+=2){const line=lines[i],trimmed=line.trim(),newline=lines[i+1]||'\n';const start=position,end=start+line.length;position=end+(lines[i+1]?.length||0);
  const overlapsLock=!!lock&&(()=>{let at=source.indexOf(lock);while(at>=0){if(start<at+lock.length&&end>at)return true;at=source.indexOf(lock,at+1);}return false;})();
  if(/^(학습\s*목표|목표|안전|준비물|주의)\s*[:：]/.test(trimmed)||overlapsLock){protectedLines.push(line);continue;}
  if(!trimmed||i===0&&!/[.!?。！？]/.test(trimmed))continue;
  const sentences=trimmed.split(/(?<=[.!?。！？])\s+/u);
  const numbered=sentences.map(s=>`${++step}. ${s}`).join(newline);
  const after=goal==='steps'?numbered:`${line}${newline}${newline}내가 관찰한 점: ____________________${newline}그렇게 생각한 까닭: ____________________`;
  if(after!==line)changes.push({id:`change-${changes.length+1}`,start,end,before:line,after,reason:goal==='steps'?'문장 내용은 유지하고, 해야 할 일을 한 줄씩 나눕니다.':'내용 뒤에 관찰과 근거를 적는 공통 응답 칸을 붙입니다.'});
  if(changes.length>80)throw Error('체험 제안은 80개 문단까지 지원합니다. 자료 일부를 나누어 사용해 주세요.');
 }
 const result={mode:'simulation',source,goal,protectedText:lock,protectedLines,changes};
 const full=applySelection(result,changes.map(c=>c.id));if(full.length>MAX)throw Error('제안을 적용하면 길이 제한을 넘습니다. 원본을 조금 줄여 주세요.');
 return result;
}
export function applySelection(proposal,selectedIds){
 if(!proposal||proposal.mode!=='simulation'||!Array.isArray(selectedIds)||selectedIds.some(id=>!proposal.changes.some(c=>c.id===id)))throw Error('선택한 제안을 확인할 수 없습니다.');
 const chosen=new Set(selectedIds);let cursor=0,out='';for(const change of proposal.changes){out+=proposal.source.slice(cursor,change.start)+(chosen.has(change.id)?change.after:change.before);cursor=change.end;}return out+proposal.source.slice(cursor);
}
export function compareText(original,draft){
 if(original===draft)return{changed:false,before:'',after:'',prefix:original,suffix:''};
 const a=Array.from(original),b=Array.from(draft);let first=0;while(first<a.length&&first<b.length&&a[first]===b[first])first++;
 let last=0;while(last<a.length-first&&last<b.length-first&&a[a.length-1-last]===b[b.length-1-last])last++;
 return{changed:true,prefix:a.slice(0,first).join(''),before:a.slice(first,last?a.length-last:a.length).join(''),after:b.slice(first,last?b.length-last:b.length).join(''),suffix:last?a.slice(a.length-last).join(''):''};
}
