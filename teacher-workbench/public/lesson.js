const MAX=100000;
export function validText(value){if(typeof value!=='string'||!value.trim()||value.length>MAX)throw Error('내용이 있는 수업자료를 입력해 주세요. 최대 100,000자까지 사용할 수 있습니다.');return value;}
export class LessonDocument{
 #original='';#draft='';#approval=null;
 constructor(source){this.#original=validText(source);this.#draft=source;this.sourceRevision=1;this.draftRevision=1;}
 get original(){return this.#original;}get draft(){return this.#draft;}get approved(){return !!this.#approval&&this.#approval.source===this.#original&&this.#approval.draft===this.#draft;}get approval(){return this.approved?{approvedAt:this.#approval.at}:null;}
 edit(text){if(typeof text!=='string'||text.length>MAX)throw Error('수정안은 최대 100,000자까지 입력할 수 있습니다.');if(text!==this.#draft){this.#draft=text;this.draftRevision++;this.#approval=null;}}
 replaceSource(text){validText(text);if(text!==this.#original){this.#original=text;this.#draft=text;this.sourceRevision++;this.draftRevision++;this.#approval=null;}}
 restoreOriginal(){this.edit(this.#original);}
 approve(confirmed){if(!confirmed)throw Error('자료를 확인한 뒤 검토 완료를 눌러 주세요.');validText(this.#draft);this.#approval={source:this.#original,draft:this.#draft,at:new Date().toISOString()};}
 revoke(){this.#approval=null;}
 exportText(){if(!this.approved)throw Error('현재 수정안의 검토 완료가 필요합니다.');return this.#draft;}
 serialize(){return JSON.stringify({schema:'aihi-lesson-document/1',original:this.#original,draft:this.#draft,sourceRevision:this.sourceRevision,draftRevision:this.draftRevision,savedAt:new Date().toISOString()});}
 static restore(raw){let p;try{p=JSON.parse(raw)}catch{throw Error('저장된 자료를 읽을 수 없습니다. 원본 파일에서 다시 시작해 주세요.');}if(!p||p.schema!=='aihi-lesson-document/1'||typeof p.draft!=='string'||p.draft.length>MAX||!Number.isSafeInteger(p.sourceRevision)||p.sourceRevision<1||!Number.isSafeInteger(p.draftRevision)||p.draftRevision<1)throw Error('저장된 자료 형식이 올바르지 않습니다.');const d=new LessonDocument(p.original);d.#draft=p.draft;d.sourceRevision=p.sourceRevision;d.draftRevision=p.draftRevision;return d;}
}
