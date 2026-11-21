const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const api = require('./acceptance.cjs');
const rootSource = require('./fixture-source.json');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clean = value => JSON.parse(JSON.stringify(value));
const id = '00000000-0000-4000-8000-000000000001', foreign = '00000000-0000-4000-8000-000000000099';
const uid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const scalar = api.scalar, candidate = 'a'.repeat(40), image = 'sha256:' + 'b'.repeat(64);
const source = { ...clean(rootSource), candidate, candidateApiImageId: image };
const body = () => ({ file: { name: source.document.filename, type: source.document.contentType, size: source.document.bytes, sha256: source.document.sha256 }, rating: '2', notes: source.captureMetadata.notes });
const pages = [{index:0,sha256:'1'.repeat(64),bytes:10,width:10,height:10},{index:1,sha256:'2'.repeat(64),bytes:11,width:10,height:10}];
const selected = { weekStartDate:'2027-02-08',date:'2027-02-08',index:0,priorOverride:null };
const assignment = { recipeId:id,date:selected.date,occurrenceId:uid(20),removalToken:'v1.'+'a'.repeat(43) };
global.fetch = () => { throw Error('Network forbidden in pure PDF guards'); };
function recipe(amount = '200') {
  return { id,name:source.recipe.name,sourceUrl:null,isReady:true,servings:4,rating:2,notes:source.captureMetadata.notes,cuisineType:'Italian',isVegetarian:true,mealTypes:['Supper'],
    contentRevision:'revision-'+amount,ingredients:source.recipe.recipeIngredient,ingredientLines:['pasta','sauce','salt'].map((name,index)=>({id:uid(index+2),description:source.ingredientNames[name],amount:index===0?(amount===null?null:scalar(amount)):index===1?scalar('100'):null,
    amountText:index===0?amount:index===1?'100':null,unit:index===2?null:{text:index===0?'g':'ml',definitionId:null},scaling:'proportional',package:null,shopping:{name:source.ingredientNames[name],foodId:null,mappingRevision:null},
    provenance:{origin:index===0&&amount!=='200'?'human':'source',sourceRef:'source.retained',protectedFields:index===0&&amount!=='200'?['description','amount','amountText','unit','scaling','package','shopping']:[]}})),
    instructionSections:[{id:uid(30),name:null,steps:source.recipe.recipeInstructions.map((step,index)=>({id:uid(index+31),text:step.text,textRevision:'text'+index,bindings:[]}))}] };
}
function grocery(name, quantity) { return {rowId:uid(name==='pasta'?40:name==='sauce'?41:42),rowVersion:'3',weekStartDate:selected.weekStartDate,demandIdentity:'owned-'+name,normalizedKey:name,displayName:name,recipeIds:[id],quantity,quantityComplete:quantity!==null,unitText:name==='sauce'?'ml':name==='pasta'?'g':null,section:'Pantry'}; }
const sauce = grocery('sauce',scalar('200'));
const control = {row:sauce,checked:true,baseline:{Unit:'ml',Quantity:scalar('200'),DemandIdentity:sauce.demandIdentity,InputFingerprint:'A'.repeat(64),QuantityComplete:true,AcknowledgedAtRowVersion:'3'}};
function state(count=0) {
 const dates=[selected.weekStartDate,'2027-02-15'];
 const result={candidate,operationId:source.operationId,marker:source.marker,stage:'capture',fixtureSourceSha256:'c'.repeat(64),renderAdmissionSha256:'d'.repeat(64),operatorSourceSha256:'e'.repeat(64),configurationSha256:'f'.repeat(64),baselineReceiptSha256:'0'.repeat(64),baselineRecipeIds:[foreign],renderAdmission:{pages},
 dateAdmission:{version:1,status:'passed',reviewer:'C',independent:true,readOnly:true,candidate,operationId:source.operationId,marker:source.marker,dates,referenceWeekStartDate:dates[0],receiptSha256:'9'.repeat(64)},
 selected,captureIntent:{intentId:uid(50),memberId:uid(51),startedAtUtc:'2026-11-12T10:00:00Z',observedAtUtc:'2026-11-12T10:00:01Z',notes:source.captureMetadata.notes,pdfSha256:source.document.sha256,documentBytes:1330},created:[],intents:[],audits:{}};
 if(count) result.created=[{id,kind:'pdf',selected,initialSnapshot:recipe(),expectedSnapshot:recipe(count>=6?null:count>=5?'250':'200'),assignmentReceipt:clean(assignment),assignmentIntent:{outcome:'accepted'},portionsIntent:{priorOverride:null}}];
 result.intents=api.finiteSlots().slice(0,count).map(kind=>({intentId:kind==='capture-pdf'?uid(50):crypto.randomUUID(),kind,outcome:'accepted',transportIssuedAt:'2026-11-12T10:00:01Z',method:kind==='assign-pdf'?'POST':'PUT',route:kind==='assign-pdf'?'/api/schedule/assign':'/api/schedule/servings',allowedBody:kind==='assign-pdf'?{recipeId:id,weekOffset:0,dayIndex:0,requireEmpty:true}:{days:[{servings:8}]},...(kind==='capture-pdf'?{recipeId:id,method:'POST',route:'/api/recipes/capture-pdf',allowedBody:body()}: {}),...(kind==='remove-pdf'?{method:'DELETE',route:'/api/schedule/day/'+selected.date+'/remove'}:{})}));
 return result;
}
function audit(s,phase) {
 const demand=['checked-demand','saved-250','cleared'].includes(phase), pasta=grocery('pasta',phase==='checked-demand'?scalar('400'):phase==='saved-250'?scalar('500'):null);
 return {version:3,phase,operationId:s.operationId,candidate:s.candidate,fixtureSourceSha256:s.fixtureSourceSha256,renderAdmissionSha256:s.renderAdmissionSha256,operatorSourceSha256:s.operatorSourceSha256,configurationSha256:s.configurationSha256,recipeIds:[id],sourceReportSha256:'8'.repeat(64),
 facts:{captureOutcome:'accepted',canonicalContentRevision:s.created[0]?.expectedSnapshot.contentRevision??null,sourceRevision:'source.retained',producerSettled:phase!=='capture-reconcile',assignment:demand?clean(assignment):null,overrideServings:demand?8:null,sauceControl:demand?clean(control):null,
 grocery:demand?{weekStartDate:selected.weekStartDate,pasta,sauce:clean(sauce),salt:grocery('salt to taste',null),servingInputVersion:'3',servingAppliedVersion:'3'}:null,
 sourceEvidence:{pdfSha256:source.document.sha256,pages:phase==='capture-reconcile'?[]:pages.map(({index,sha256,bytes})=>({index,sha256,bytes})),rawMetadataSha256:phase==='capture-reconcile'?null:'7'.repeat(64)}}};
}
function install(s,phase) { const receipt=audit(s,phase);s.audits[phase]={path:'/synthetic/'+phase+'.json',sha256:'6'.repeat(64),receipt};return receipt; }
function context(s) { return {base:'http://localhost:3405',report:s,fixtureSource:source}; }
function pending(s,kind,method,route,details={}) {const intent={kind,method,route,outcome:'pending',...(kind==='check-sauce-pdf'?{checkedPresentationEpoch:uid(77)}:{}),...details};s.intents.push(intent);return intent;}
function patch(current,type) {const ingredientLines=clean(current.ingredientLines.map(api.ingredientInput));ingredientLines[0].amount=type==='pasta-250'?scalar('250'):null;ingredientLines[0].amountText=type==='pasta-250'?'250':null;return {expectedContentRevision:current.contentRevision,servings:4,ingredientLines,instructionSections:api.instructionInput(current)};}

test('finite ordinary singular PDF capture is admitted by actual guard with synthetic bound authority',()=>{
 const s=state(),b=body();pending(s,'capture-pdf','POST','/api/recipes/capture-pdf',{allowedBody:b});
 assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',b,context(s)),true);
 for(const mutate of [v=>v.file.name='foreign.pdf',v=>v.file.type='image/png',v=>v.file.size=1331,v=>v.file.sha256='0'.repeat(64),v=>v.rating='3',v=>v.notes='foreign',v=>v.extra='yes',v=>v.files=[v.file]]){const bad=clean(b);mutate(bad);assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',bad,context(s)),false);}
 for(const key of ['candidate','candidateApiImageId']){const bad=clean(source);bad[key]=null;assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',b,{...context(s),fixtureSource:bad}),false);}
 assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',b,{...context(s),fixtureSource:rootSource}),false);
 s.intents[0].transportIssuedAt='issued';assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',b,context(s)),false);
});

test('actual multipart parser admits one exact PDF and rejects duplicate/plural/foreign fields',async()=>{
 const bytes=fs.readFileSync(path.join(__dirname,source.document.filename));assert.equal(bytes.length,1330);assert.equal(sha(bytes),source.document.sha256);
 const form=()=>{const value=new FormData();value.append('file',new Blob([bytes],{type:'application/pdf'}),source.document.filename);value.append('rating','2');value.append('notes',source.captureMetadata.notes);return value;};
 assert.deepEqual(await api.describeBody(form()),body());
 for(const add of [v=>v.append('file',new Blob([bytes],{type:'application/pdf'}),'extra.pdf'),v=>v.append('rating','2'),v=>v.append('notes','duplicate'),v=>v.append('files',new Blob([bytes],{type:'application/pdf'}),'plural.pdf'),v=>v.append('foreign','value')]){const v=form();add(v);await assert.rejects(api.describeBody(v));}
});

test('capture adapter is enrolled only for writable capture and strict policy owners stay byte-exact',()=>{
 for(const stage of ['demand','save250','clear','cleanup',undefined])assert.equal(api.captureBodyAdapterEnabled(stage,false),false);
 for(const readOnly of [true,undefined,null])assert.equal(api.captureBodyAdapterEnabled('capture',readOnly),false);
 assert.equal(api.captureBodyAdapterEnabled('capture',false),true);
 const code=fs.readFileSync(path.join(__dirname,'acceptance.cjs'),'utf8');
 for(const [start,end,expected] of [
  ['function requestAllowed(','async function describeBody','39314211d3f631a33ee3444f4c9222ecbb91336bb7f650336f2d501e40f8c3bb'],
  ['async function describeBody(','function requireNoBlockedRequests','de17e7d86b67706068e0fd1d939f6ad253953a1df9e63cd474ca6790e3497100'],
  ['function authorize(','async function call','fffd3fa825ea1c485e3c1f6da670f5e81ff9a846a27a14d11c4c96e91cc9c2df']
 ])assert.equal(sha(code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start)))),expected);
});

test('ACTUAL authenticate installs adapter only in writable capture contexts',async()=>{
 const compiled=sandbox('\nmodule.exports.authenticateForTest=async(browser,stage,readOnly)=>{report={stage};base="http://localhost:47863";return authenticate(browser,[],uidMember,"owned-synthetic-secret","en",readOnly);};\nconst uidMember="00000000-0000-4000-8000-000000000051";').api;
 for(const [stage,readOnly,expected]of [['capture',false,1],['capture',true,0],['demand',false,0],['save250',false,0],['clear',false,0],['cleanup',false,0]]){
  const scripts=[],context={addCookies:async()=>{},addInitScript:async(fn,args)=>scripts.push({fn,args}),route:async()=>{}};
  await compiled.authenticateForTest({newContext:async()=>context},stage,readOnly);
  const installed=scripts.filter(entry=>entry.fn===compiled.installCaptureBodyAdapter);assert.equal(installed.length,expected);
  if(expected)assert.equal(installed[0].args.origin,'http://localhost:47863');
 }
});

function captureAdapterSandbox(RequestClass=Request) {
 const calls=[],response=new Response('offline-response',{status:409});
 const scope={Request:RequestClass,FormData,URL,location:{origin:'http://localhost:47863',href:'http://localhost:47863/'},
  fetch:(input,init)=>{calls.push({input,init});return Promise.resolve(response);}};
 vm.runInNewContext('('+api.installCaptureBodyAdapter.toString()+')({origin:"http://localhost:47863"})',scope);
 return {scope,calls,response};
}
function captureAdapterForm() {
 const form=new FormData();form.append('file',new Blob([fs.readFileSync(path.join(__dirname,source.document.filename))],{type:'application/pdf'}),source.document.filename);
 form.append('rating','2');form.append('notes',source.captureMetadata.notes);return form;
}

test('capture adapter snapshots one native Request, preserves actual bytes/metadata/response without rereading init',async()=>{
 let release,started;const hold=new Promise(resolve=>release=resolve),observed=new Promise(resolve=>started=resolve),constructed=[];
 class SnapshotRequest extends Request {
  constructor(input,init){super(input,init);constructed.push(this);}
  clone(){const actual=super.clone();return {arrayBuffer:async()=>{const raw=await actual.arrayBuffer();started();await hold;return raw;}};}
 }
 const {scope,calls,response}=captureAdapterSandbox(SnapshotRequest),controller=new AbortController();
 const form=captureAdapterForm(),headers={'X-Family-Member-Id':uid(51),'X-Offline-Metadata':'kept'};
 const init={method:'POST',body:form,headers,credentials:'same-origin',mode:'same-origin',cache:'no-store',redirect:'manual',referrerPolicy:'no-referrer',integrity:'sha256-owned-test',keepalive:true,signal:controller.signal};
 const pending=scope.fetch('http://localhost:47863/api/recipes/capture-pdf',init);await observed;
 headers['X-Family-Member-Id']='changed-after-snapshot';form.set('notes','changed-after-snapshot');init.credentials='omit';release();
 assert.equal(await pending,response);assert.equal(calls.length,1);assert.equal(constructed.length,2);assert.equal(calls[0].input,constructed[1]);assert.equal(calls[0].init,undefined);
 const sent=calls[0].input,first=constructed[0];
 for(const field of ['url','method','credentials','mode','cache','redirect','referrerPolicy','integrity','keepalive'])assert.equal(sent[field],first[field]);
 assert.equal(sent.headers.get('x-family-member-id'),uid(51));assert.equal(sent.headers.get('x-offline-metadata'),'kept');
 assert.equal(sent.headers.get('content-type'),first.headers.get('content-type'));
 assert.deepEqual(await api.describeBody(await sent.formData()),body());
 const reason=new Error('same abort reason');controller.abort(reason);assert.equal(sent.signal.reason,reason);
});

test('capture adapter abort before/during serialization and serialization failure preserve reason with no fetch/retry',async()=>{
 const before=captureAdapterSandbox(),pre=new AbortController(),preReason=new Error('owned-abort-before');pre.abort(preReason);
 await assert.rejects(before.scope.fetch('http://localhost:47863/api/recipes/capture-pdf',{method:'POST',body:captureAdapterForm(),signal:pre.signal}),error=>error===preReason);assert.equal(before.calls.length,0);
 let entered;const ready=new Promise(resolve=>entered=resolve);
 class WaitingRequest extends Request {clone(){return {arrayBuffer:()=>{entered();return new Promise(()=>{});}};}}
 const during=captureAdapterSandbox(WaitingRequest),controller=new AbortController(),reason=new Error('owned-abort-during');
 const pending=during.scope.fetch('http://localhost:47863/api/recipes/capture-pdf',{method:'POST',body:captureAdapterForm(),signal:controller.signal});await ready;controller.abort(reason);
 await assert.rejects(pending,error=>error===reason);assert.equal(during.calls.length,0);
 const failure=new Error('owned-serialization-failure');
 class FailingRequest extends Request {clone(){return {arrayBuffer:()=>Promise.reject(failure)};}}
 const failed=captureAdapterSandbox(FailingRequest);await assert.rejects(failed.scope.fetch('http://localhost:47863/api/recipes/capture-pdf',{method:'POST',body:captureAdapterForm()}),error=>error===failure);assert.equal(failed.calls.length,0);
});

test('capture adapter passes foreign origins/routes/query/method/nonFormData through with identical arguments',async()=>{
 let count=0;class CountRequest extends Request {constructor(...args){super(...args);count++;}}
 const {scope,calls,response}=captureAdapterSandbox(CountRequest);
 const cases=[['http://foreign.invalid/api/recipes/capture-pdf',{method:'POST',body:captureAdapterForm()}],
  ['http://localhost:47863/api/recipes/capture-url',{method:'POST',body:captureAdapterForm()}],
  ['http://localhost:47863/api/recipes/capture-pdf?foreign=1',{method:'POST',body:captureAdapterForm()}],
  ['http://localhost:47863/api/recipes/capture-pdf',{method:'PUT',body:captureAdapterForm()}],
  ['http://localhost:47863/api/recipes/capture-pdf',{method:'POST',body:'foreign'}]];
 for(const [input,init]of cases){assert.equal(await scope.fetch(input,init),response);assert.equal(calls.at(-1).input,input);assert.equal(calls.at(-1).init,init);}
 scope.location.origin='http://another-document.invalid';const init={method:'POST',body:captureAdapterForm()};await scope.fetch('http://localhost:47863/api/recipes/capture-pdf',init);assert.equal(calls.at(-1).init,init);assert.equal(count,0);
});

for(const type of ['pasta-250','pasta-clear'])test(type+' ordinary editor exact-body admission preserves original scopes',()=>{
 const current=recipe(type==='pasta-250'?'200':'250'),b=patch(current,type),intent={currentSnapshot:current,patchPolicy:{type}};
 assert.equal(api.patchAllowed(b,intent),true);
 for(const fault of [v=>v.expectedContentRevision='stale',v=>v.foreign=true,v=>v.name='foreign',v=>v.servings=3,v=>v.ingredientLines.reverse(),v=>v.ingredientLines.pop(),v=>v.ingredientLines[0].id=foreign,v=>v.ingredientLines[0].unit=null,v=>v.ingredientLines[0].unit.definitionId=foreign,v=>v.ingredientLines[0].package={basis:'net'},v=>v.ingredientLines[0].shopping.foodId=foreign,v=>v.ingredientLines[1].amount=scalar('999'),v=>v.instructionSections[0].steps[0].text='changed',v=>v.ingredientLines[0].amountText='wrong']){const bad=clean(b);fault(bad);assert.equal(api.patchAllowed(bad,intent),false);}
 const saved=recipe(type==='pasta-250'?'250':null);assert.equal(api.savedMatches(current,saved,b),true);
 const bad=clean(saved);bad.ingredientLines[1].amount=scalar('999');assert.equal(api.savedMatches(current,bad,b),false);
});

test('nine finite slots reject old5/3 paths, extra transports, duplicates and uncertain prefixes',()=>{
 assert.deepEqual(api.finiteSlots(),['capture-pdf','portions-8-pdf','assign-pdf','check-sauce-pdf','pdf-pasta-250','pdf-pasta-clear','remove-pdf','restore-portions-pdf','soft-delete-pdf']);
 for(let n=0;n<9;n++){const s=state(n);assert.doesNotThrow(()=>api.requireNextIntent(s,api.finiteSlots()[n]));assert.throws(()=>api.requireNextIntent(s,'capture-url'));assert.throws(()=>api.requireNextIntent(s,'portions-5-pdf'));assert.throws(()=>api.requireNextIntent(s,'portions-3-pdf'));}
 assert.throws(()=>api.requireNextIntent(state(9),'capture-pdf'));
 const s=state(1);s.intents[0].outcome='unknown';assert.throws(()=>api.requireNextIntent(s,'portions-8-pdf'));
 s.intents[0].outcome='pending';assert.throws(()=>api.requireNextIntent(s,'portions-8-pdf'));
});

test('dated override/assignment/check routes require phase audit and exact current row scope',()=>{
 let s=state(1);s.stage='demand';install(s,'producer-settled');
 const portions={referenceWeekStartDate:selected.weekStartDate,weekOffset:0,expectedVersion:'actual',days:[{date:selected.date,servings:8}]};
 pending(s,'portions-8-pdf','PUT','/api/schedule/servings',{allowedBody:portions,previousOverride:null});
 assert.equal(api.requestAllowed('PUT','/api/schedule/servings',portions,context(s)),true);
 for(const target of [3,5,null]){const b=clean(portions);b.days[0].servings=target;assert.equal(api.requestAllowed('PUT','/api/schedule/servings',b,context(s)),false);}
 for(const bad of [{...portions,expectedVersion:'stale'},{...portions,referenceWeekStartDate:'2027-02-15'},{...portions,weekOffset:1}])assert.equal(api.requestAllowed('PUT','/api/schedule/servings',bad,context(s)),false);
 s.audits={};assert.equal(api.requestAllowed('PUT','/api/schedule/servings',portions,context(s)),false);
 s=state(2);s.stage='demand';install(s,'producer-settled');const assigned={weekOffset:0,dayIndex:0,recipeId:id,requireEmpty:true};s.created[0].assignmentIntent={outcome:'pending'};pending(s,'assign-pdf','POST','/api/schedule/assign',{allowedBody:assigned});
 assert.equal(api.requestAllowed('POST','/api/schedule/assign?referenceWeekStartDate='+selected.weekStartDate,assigned,context(s)),true);
 assert.equal(api.requestAllowed('POST','/api/schedule/assign?referenceWeekStartDate='+selected.weekStartDate,{...assigned,recipeId:foreign},context(s)),false);
 s=state(3);s.stage='demand';install(s,'producer-settled');pending(s,'check-sauce-pdf','PATCH','/api/schedule/0/grocery/item',{checkedRow:sauce});const check={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:uid(77)};
 assert.equal(api.requestAllowed('PATCH','/api/schedule/0/grocery/item?referenceWeekStartDate='+selected.weekStartDate,check,context(s)),true);
 for(const b of [{...check,rowId:foreign},{...check,checked:false},{...check,expectedRowVersion:'stale'},{...check,weekStartDate:'2027-02-15'},{...check,extra:true},{...check,clientMutationId:null}])assert.equal(api.requestAllowed('PATCH','/api/schedule/0/grocery/item?referenceWeekStartDate='+selected.weekStartDate,b,context(s)),false);
});

test('grocery check rejects omission of the captured reference query',()=>{
 const s=state(3);s.stage='demand';install(s,'producer-settled');pending(s,'check-sauce-pdf','PATCH','/api/schedule/0/grocery/item',{checkedRow:sauce});
 const check={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:uid(77)};
 assert.equal(api.requestAllowed('PATCH','/api/schedule/0/grocery/item',check,context(s)),false);
});

test('grocery check requires exactly the admitted reference query and current finite scope',async()=>{
 const { groceryWire } = require('./action-wire-offline.cjs');
 const s=state(3);s.stage='demand';install(s,'producer-settled');pending(s,'check-sauce-pdf','PATCH','/api/schedule/0/grocery/item',{checkedRow:sauce});
 const check={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:uid(77)};
 const wire=await groceryWire(process.env.WFS_OFFLINE_REPO_ROOT ?? process.cwd(),check,selected.weekStartDate);
 assert.equal(wire.method,'PATCH');assert.equal(wire.contentType,'application/json');assert.deepEqual(wire.body,check);
 assert.equal(new URL(wire.url).pathname,'/api/schedule/0/grocery/item');
 assert.deepEqual([...new URL(wire.url).searchParams],[['referenceWeekStartDate',selected.weekStartDate]]);
 assert.equal(api.requestAllowed(wire.method,wire.url,wire.body,context(s)),true);
 assert.equal(api.requestAllowed('PATCH','/api/schedule/0/grocery/item',check,context(s)),false);
 const prefix='/api/schedule/0/grocery/item';
 for(const address of [prefix+'?referenceWeekStartDate=2027-02-15',prefix+'?referenceWeekStartDate='+selected.weekStartDate+'&referenceWeekStartDate='+selected.weekStartDate,prefix+'?referenceWeekStartDate='+selected.weekStartDate+'&foreign=yes',prefix+'?foreign='+selected.weekStartDate,'http://user:secret@localhost:3405'+prefix+'?referenceWeekStartDate='+selected.weekStartDate,'http://foreign.invalid'+prefix+'?referenceWeekStartDate='+selected.weekStartDate])assert.equal(api.requestAllowed('PATCH',address,check,context(s)),false,address);
 for(const change of [{rowId:foreign},{weekStartDate:'2027-02-15'},{expectedRowVersion:'stale'},{checked:false},{extra:true},{clientMutationId:null}])assert.equal(api.requestAllowed('PATCH',wire.url,{...check,...change},context(s)),false);
 for(const stage of ['capture','save250','clear','cleanup'])assert.equal(api.requestAllowed('PATCH',wire.url,check,context({...s,stage})),false);
 assert.equal(api.requestAllowed('PATCH',wire.url,check,{...context(s),readOnly:true}),false);
});

test('actual v3 audit barriers bind phases, raw checkpoints, source/config, IDs and unchanged entire baseline',()=>{
 for(const [count,phase] of [[1,'producer-settled'],[4,'checked-demand'],[5,'saved-250'],[6,'cleared']]){
  const s=state(count);if(count>=5){const prior=state(4);s.audits['checked-demand']={receipt:audit(prior,'checked-demand')};}
  const receipt=audit(s,phase);assert.doesNotThrow(()=>api.validateAudit(receipt,s,phase,'8'.repeat(64)));
  for(const fault of [v=>v.version=2,v=>v.phase='cleanup',v=>v.candidate='b'.repeat(40),v=>v.operationId=foreign,v=>v.operatorSourceSha256='0'.repeat(64),v=>v.configurationSha256='0'.repeat(64),v=>v.fixtureSourceSha256='0'.repeat(64),v=>v.renderAdmissionSha256='0'.repeat(64),v=>v.sourceReportSha256='0'.repeat(64),v=>v.recipeIds=[foreign],v=>v.extra=true,v=>v.facts.producerSettled=false,v=>v.facts.sourceEvidence.pages.reverse()]){const bad=clean(receipt);fault(bad);assert.throws(()=>api.validateAudit(bad,s,phase,'8'.repeat(64)));}
  if(count>=5){const bad=clean(receipt);bad.facts.sauceControl.baseline.Quantity=scalar('201');assert.throws(()=>api.validateAudit(bad,s,phase,'8'.repeat(64)));}
 }
});

test('capture reconciliation accepts unique pending identity only and never fabricates producer settlement',()=>{
 const s=state();s.intents=[{intentId:s.captureIntent.intentId,kind:'capture-pdf',outcome:'unknown',transportIssuedAt:'issued'}];
 const receipt=audit(s,'capture-reconcile');receipt.facts.canonicalContentRevision=null;receipt.facts.sourceRevision=null;
 assert.doesNotThrow(()=>api.validateAudit(receipt,s,'capture-reconcile','8'.repeat(64)));
 api.adoptCapture(s,{path:'/synthetic/observed',sha256:'6'.repeat(64),receipt});assert.equal(s.intents[0].outcome,'reconciled-committed');assert.equal(s.created[0].id,id);assert.equal(s.created[0].expectedSnapshot,undefined);assert.equal(s.audits['producer-settled'],undefined);
 for(const outcome of ['unresolved','ambiguous']){const other=state();other.intents=[{kind:'capture-pdf',outcome:'unknown'}];const v=audit(other,'capture-reconcile');v.recipeIds=[];v.facts.captureOutcome=outcome;assert.doesNotThrow(()=>api.validateAudit(v,other,'capture-reconcile','8'.repeat(64)));assert.throws(()=>api.adoptCapture(other,{receipt:v}));}
});

test('generic read-only/network boundaries never gain workflow/profile/processor mutation authority',()=>{
 const s=state(),c=context(s);pending(s,'capture-pdf','POST','/api/recipes/capture-pdf',{allowedBody:body()});
 for(const route of ['/api/workflows/dreaming/trigger','/api/workflows/tasks/owned/reset','/api/management/seed','/_test/pdf/producer-settled','/api/_test/recompute'])for(const method of ['GET','POST','PUT','PATCH','DELETE'])assert.equal(api.requestAllowed(method,route,body(),c),false);
 for(const route of ['/api/family/'+id,'/api/settings/language','/api/goto','/api/recipes/imports/bulk','/api/schedule/0/grocery','/api/recipes/'+foreign])for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(api.requestAllowed(method,route,body(),c),false);
 assert.equal(api.requestAllowed('POST','/api/recipes/capture-pdf',body(),{...c,readOnly:true}),false);
 assert.equal(api.requestAllowed('POST','https://foreign.test/api/recipes/capture-pdf',body(),c),false);
 assert.equal(api.requestAllowed('POST','/api/%2frecipes/capture-pdf',body(),c),false);
 for(const route of ['/profile/settings','/api/health','/api/recipes/'+id,'/api/schedule'])assert.equal(api.requestAllowed('GET',route,undefined,{base:c.base,readOnly:true}),true);
});

function sandbox(extra='', fakeFs=fs, fakeDate, directory=__dirname) {
 const filename=path.join(__dirname,'acceptance.cjs'),local=createRequire(filename),module={exports:{}};
 const runtime={fs:fakeFs,fetch:()=>{throw Error('Network forbidden');}};
 const code=fs.readFileSync(filename,'utf8')+extra;
 const context={module,exports:module.exports,require:name=>name==='node:fs'?runtime.fs:name==='./date-admission.cjs'&&fakeDate?fakeDate:name==='node:child_process'?{execFileSync:()=>{throw Error('Child process forbidden');}}:local(name),__dirname:directory,__filename:filename,process:{argv:[],version:'v26.12.0'},Buffer,URL,FormData,Blob,Response,AbortSignal,structuredClone,Date,console,setTimeout,fetch:(...a)=>runtime.fetch(...a)};
 vm.runInNewContext(code,context,{filename});return {api:module.exports,runtime};
}

test('ACTUAL cleanup preflights issued assignment receipt before any restore/delete',async()=>{
 for(const fault of [v=>delete v.created[0].assignmentReceipt,v=>v.created[0].assignmentReceipt.recipeId=foreign,v=>v.created[0].assignmentReceipt.date='2027-02-15',v=>v.created[0].assignmentReceipt.occurrenceId=null,v=>v.created[0].assignmentReceipt.removalToken='invented',v=>v.intents[2].outcome='unknown']){
  const s=state(6);s.stage='cleanup';install(s,'cleared');fault(s);const writes=[];
  const box=sandbox('\nmodule.exports.invokeCleanup=async(state,writes,observed)=>{report=JSON.parse(JSON.stringify(state));save=()=>{};call=async()=>({weekStartDate:state.selected.weekStartDate,days:[{date:state.selected.date,recipe:{id:state.created[0].id},occurrenceId:observed.occurrenceId,removalToken:observed.removalToken}]});mutate=async(...args)=>writes.push(args);await cleanup();};\n');
  // Supply only a constant fixture inside the VM, not a guessed real token.
  const code=fs.readFileSync(path.join(__dirname,'acceptance.cjs'),'utf8');void code;
  await assert.rejects(box.api.invokeCleanup(s,writes,assignment));assert.deepEqual(writes,[]);
 }
});

test('actual exclusive-create failure clears report before outer catch can overwrite a sentinel',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-create-only-')),filename=path.join(directory,'report.json'),sentinel=Buffer.from('owned sentinel\n');
 try {
  const originalOpen=fs.openSync.bind(fs),proxy=Object.create(fs);proxy.openSync=(file,flags,...rest)=>{if(file===filename&&flags==='wx'&&!fs.existsSync(filename))fs.writeFileSync(filename,sentinel,{flag:'wx'});return originalOpen(file,flags,...rest);};
  const box=sandbox('\nmodule.exports.race=(filename)=>{reportPath=filename;report={intents:[]};try{createReport();}catch(error){if(report){report.failure={message:error.message};save();}}return report;};\n',proxy);
  assert.equal(box.api.race(filename),undefined);assert.deepEqual(fs.readFileSync(filename),sentinel);
 } finally {fs.rmSync(directory,{recursive:true,force:true});}
});

test('unchanged current scope and capture membership remain fail-closed',()=>{
 assert.throws(()=>api.requireReconciledCaptures(state()));const s=state(1);assert.doesNotThrow(()=>api.requireReconciledCaptures(s));s.created[0].id=foreign;assert.throws(()=>api.requireReconciledCaptures(s));
 assert.throws(()=>api.requireNoBlockedRequests([{method:'POST',path:'/api/settings/language'}]));
 const before={days:[],groceryItems:[],groceryState:{},groceryExtras:[]};assert.deepEqual(api.listIdentity({...before,unrelated:'ignored'}),before);
});

test('ACTUAL ordinary full cleanup and accepted-remove resume consume only remaining finite slots',async()=>{
 for(const prefix of [6,7,8]){
  const s=state(prefix);s.stage='cleanup';s.currentReference='2026-11-09';s.created[0].expectedSnapshot=recipe(null);s.complete=true;
  const writes=[];
  const box=sandbox(`
module.exports.validCleanup=async(state,writes)=>{
 report=JSON.parse(JSON.stringify(state));save=()=>{};let removed=report.intents.length>=7,restored=report.intents.length>=8,deleted=false;
 call=async(method,route)=>{
  if(route.startsWith('/api/recipes/'))return deleted?null:{recipe:report.created[0].expectedSnapshot};
  if(route.startsWith('/api/schedule/servings'))return {version:'current',days:[{date:report.selected.date,overrideServings:restored?null:8}]};
  const current=route.includes(report.currentReference);return {weekStartDate:current?report.currentReference:report.selected.date,days:current?[]:[{date:report.selected.date,recipe:removed?null:{id:report.created[0].id},occurrenceId:report.created[0].assignmentReceipt.occurrenceId,removalToken:report.created[0].assignmentReceipt.removalToken}],groceryItems:[],groceryState:{},groceryExtras:[]};
 };
 report.currentListBefore=listIdentity(await week(report.currentReference));
 mutate=async(kind,method,route,data)=>{requireNextIntent(report,kind);writes.push({kind,method,route,data});report.intents.push({kind,method,route:route.split('?')[0],allowedBody:data,outcome:'accepted',transportIssuedAt:'issued'});if(kind==='remove-pdf')removed=true;if(kind==='restore-portions-pdf')restored=true;if(kind==='soft-delete-pdf')deleted=true;};
 await cleanup();return report;
};`);
  const final=await box.api.validCleanup(s,writes);assert.equal(final.cleanup.passed,true);assert.deepEqual(writes.map(item=>item.kind),api.finiteSlots().slice(prefix));assert.equal(final.intents.length,9);
 }
});

test('reviewed render admission refuses null/foreign image/doc/order/profile without rendering',()=>{
 const pageBytes=[Buffer.from([137,80,78,71,13,10,26,10,1]),Buffer.from([137,80,78,71,13,10,26,10,2])];
 const profile={dpi:200,maxDimension:4096,maxPixels:16777216,maxOutputBytes:67108864,maxResidentBytes:536870912,timeoutSeconds:60};
 const actual={version:1,candidate,candidateApiImageId:image,documentSha256:source.document.sha256,defaultProfile:profile,runtime:{framework:'synthetic-no-render',os:'synthetic',architecture:'synthetic'},renderedAtUtc:'2026-11-12T10:00:00Z',assemblySha256:'3'.repeat(64),runtimeConfigSha256:'4'.repeat(64),depsSha256:'5'.repeat(64),nativeAssets:{synthetic:'6'.repeat(64)},pages:pageBytes.map((bytes,index)=>({index,sha256:sha(bytes),bytes:bytes.length,width:1,height:1}))};
 const result={value:actual,bytes:Buffer.from(JSON.stringify(actual))};const admission={...actual,version:1,approved:true,operationId:source.operationId,candidate,candidateApiImageId:image,fixtureSourceSha256:'7'.repeat(64),documentSha256:source.document.sha256,defaultProfile:profile,pages:actual.pages,renderResultSha256:sha(result.bytes)};
 assert.doesNotThrow(()=>api.validateRender(source,'7'.repeat(64),admission,result,pageBytes));
 for(const fault of [v=>v.approved=false,v=>v.candidate=null,v=>v.candidateApiImageId='sha256:'+'0'.repeat(64),v=>v.documentSha256='0'.repeat(64),v=>v.fixtureSourceSha256='0'.repeat(64),v=>v.renderResultSha256='0'.repeat(64),v=>v.pages.reverse(),v=>v.defaultProfile.dpi=100]){const v=clean(admission);fault(v);assert.throws(()=>api.validateRender(source,'7'.repeat(64),v,result,pageBytes));}
 assert.throws(()=>api.validateRender({...source,candidate:null},'7'.repeat(64),admission,result,pageBytes));
});

test('read-only settled reader uses exact cleared receipt and cannot carry an unresolved phase',()=>{
 const reader=require('./settled-readonly.cjs'),s=state(6);s.complete=true;s.audits['checked-demand']={receipt:audit(state(4),'checked-demand')};const receipt=audit(s,'cleared');
 assert.equal(reader.readOnlyAdmission(s,receipt,'8'.repeat(64)).id,id);
 for(const fault of [v=>v.complete=false,v=>v.cleanup={passed:true},v=>v.intents[5].outcome='unknown',v=>v.intents.push({kind:'extra'})]){const v=clean(s);fault(v);assert.throws(()=>reader.readOnlyAdmission(v,receipt,'8'.repeat(64)));}
});

test('retained audit raw SHA and content are reread before a later actor stage',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-audit-raw-'));
 try {
  const receipt=audit(state(1),'producer-settled'),filename=path.join(directory,'audit.json'),bytes=Buffer.from(JSON.stringify(receipt));fs.writeFileSync(filename,bytes);
  const s=state(1);s.audits['producer-settled']={path:filename,sha256:sha(bytes),receipt};assert.doesNotThrow(()=>api.requireRetainedAudits(s));
  fs.writeFileSync(filename,JSON.stringify({...receipt,candidate:'0'.repeat(40)}));assert.throws(()=>api.requireRetainedAudits(s));
  fs.unlinkSync(filename);assert.throws(()=>api.requireRetainedAudits(s));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('actual intent and issued-body persistence precede the stubbed transport',async()=>{
 const trace=[],s=state();s.windowEndUtc='2099-01-01T00:00:00Z';s.restoreBufferSeconds=300;
 const date=require('./date-admission.cjs');
 const box=sandbox(`
module.exports.durableMutation=async(state,payload,fixture,trace)=>{
 report=JSON.parse(JSON.stringify(state));source=JSON.parse(JSON.stringify(fixture));base='http://localhost:3405';headers={};reportPath='/synthetic/report.json';
 writeReportRecord=(_file,state)=>trace.push({event:'persist',intent:JSON.parse(JSON.stringify(state.intents.at(-1)))});
 return mutate('capture-pdf','POST','/api/recipes/capture-pdf',JSON.parse(JSON.stringify(payload)),async()=>({confirmed:false}));
};`,fs,{...date,requireUnchanged:()=>{}});
 box.runtime.fetch=async()=>{trace.push({event:'transport'});return {ok:true,status:202,text:async()=>JSON.stringify({data:{id}})};};
 await box.api.durableMutation(s,body(),source,trace);
 assert.deepEqual(trace.map(item=>item.event),['persist','persist','transport','persist']);
 assert.equal(trace[0].intent.outcome,'pending');assert.equal(trace[0].intent.transportIssuedAt,undefined);
 assert.ok(trace[1].intent.transportIssuedAt);assert.deepEqual(clean(trace[1].intent.issuedBody),body());assert.equal(trace[3].intent.outcome,'accepted');
});

test('actual create-only report bytes are preserved on duplicate creation',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-report-'));
 try{const filename=path.join(directory,'report.json');api.writeReportRecord(filename,{owned:true},true);const original=fs.readFileSync(filename);assert.throws(()=>api.writeReportRecord(filename,{owned:false},true));assert.deepEqual(fs.readFileSync(filename),original);}finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('bounded read-only freeze retains raw capture bindings and classifies uncertainty, never success',()=>{
 for(const outcome of ['pending','accepted']){
  const s=state();s.finiteWindow={startUtc:'2026-11-12T09:00:00Z',endUtc:'2026-11-12T12:00:00Z',restoreBufferSeconds:300};s.windowEndUtc=s.finiteWindow.endUtc;
  s.intents=[{intentId:s.captureIntent.intentId,kind:'capture-pdf',method:'POST',route:'/api/recipes/capture-pdf',allowedBody:body(),outcome,transportIssuedAt:'2026-11-12T10:00:01Z'}];
  if(outcome==='accepted')s.intents[0].responseEvidence={status:202,observedAtUtc:'2026-11-12T10:00:02Z',body:{data:{id}},bodySha256:'1'.repeat(64)};
  const original=clean(s),frozen=api.freezeCaptureUncertain(s,source,'2026-11-12T10:01:00Z');assert.deepEqual(s,original);
  assert.equal(frozen.intents.length,1);assert.equal(frozen.intents[0].outcome,'unknown');assert.deepEqual(frozen.created,[]);
  assert.equal(frozen.captureIntent.observedAtUtc,'2026-11-12T10:01:00Z');assert.equal(frozen.captureIntent.startedAtUtc,s.captureIntent.startedAtUtc);assert.deepEqual(frozen.intents[0].allowedBody,body());
  assert.deepEqual(frozen.intents[0].responseEvidence,s.intents[0].responseEvidence);assert.equal(frozen.captureUncertainty.priorOutcome,outcome);
  for(const fault of [v=>delete v.intents[0].transportIssuedAt,v=>v.intents[0].transportIssuedAt='planned',v=>v.intents[0].outcome='unknown',v=>v.intents[0].outcome='not-issued',v=>v.intents[0].outcome='reconciled-committed',v=>v.intents[0].recipeId=id,v=>v.created.push({id}),v=>v.complete=true,v=>v.captureIntent.memberId=null,v=>v.captureIntent.intentId=foreign,v=>v.intents[0].allowedBody.notes='foreign',v=>v.intents[0].responseEvidence={status:400,observedAtUtc:'2026-11-12T10:00:02Z'},v=>v.finiteWindow.endUtc='2026-11-12T10:00:00Z',v=>v.candidate=null,v=>v.captureUncertainty={already:true}]){const bad=clean(s);fault(bad);assert.throws(()=>api.freezeCaptureUncertain(bad,source,'2026-11-12T10:01:00Z'));}
 }
});

test('ACTUAL interruption freeze writes create-only raw snapshots without a transport or process',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-freeze-'));
 try{
  for(const acknowledged of [false,true]){
   const filename=path.join(directory,acknowledged?'ack.json':'pending.json'),s=state();s.finiteWindow={startUtc:'2020-01-01T00:00:00Z',endUtc:'2099-01-01T00:00:00Z',restoreBufferSeconds:300};s.windowEndUtc=s.finiteWindow.endUtc;
   s.intents=[{intentId:s.captureIntent.intentId,kind:'capture-pdf',method:'POST',route:'/api/recipes/capture-pdf',allowedBody:body(),outcome:acknowledged?'accepted':'pending',transportIssuedAt:'2026-11-12T10:00:01Z'}];if(acknowledged)s.intents[0].responseEvidence={status:202,observedAtUtc:'2026-11-12T10:00:02Z',body:{data:{id}},bodySha256:'1'.repeat(64)};
   const raw=Buffer.from(JSON.stringify(s)+'\n');fs.writeFileSync(filename,raw);
   const box=sandbox('\nmodule.exports.freeze=(state,raw,filename,fixture)=>{source=JSON.parse(JSON.stringify(fixture));reportPath=filename;report=undefined;freezeHead(JSON.parse(JSON.stringify(state)),raw);return report;};\n');
   const result=box.api.freeze(s,raw,filename,source),prefix=filename.replace(/\.json$/,'');
   assert.deepEqual(fs.readFileSync(prefix+'-capture-interrupted-head.json'),raw);assert.equal(result.intents[0].outcome,'unknown');assert.equal(result.checkpointPhase,'capture-unknown');
   assert.equal(fs.existsSync(prefix+'-capture-http-202.json'),acknowledged);const sealed=fs.readFileSync(prefix+'-capture-unknown.json');assert.throws(()=>box.api.freeze(s,raw,filename,source));assert.deepEqual(fs.readFileSync(prefix+'-capture-unknown.json'),sealed);
  }
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('actual private runtime admission binds immutable image, closed provider and exact data-root identity',()=>{
 const identity={destination:'/data',name:'synthetic-owned-volume',readWrite:true,source:'/synthetic/owned',type:'volume'},config={candidate,apiImageId:image,calendarTimeZone:'UTC',embeddingDimensions:1536,providerEndpoint:'http://host.docker.internal:3508/v1beta/openai/',dataRootIdentitySha256:sha(JSON.stringify(identity))};
 const apiState={State:{Running:true},Image:image,Config:{Env:['WFS_VERSION='+candidate,'Calendar__TimeZone=UTC','GEMINI_API_KEY=','GEMINI_ENDPOINT='+config.providerEndpoint,'EMBEDDING_DIMENSIONS=1536','DATA_ROOT=/data','HEARTH_SECRET=synthetic-only']},Mounts:[{Type:'volume',Name:identity.name,Source:identity.source,Destination:'/data',RW:true}]};
 assert.equal(api.validateRuntimeConfiguration(apiState,config).WFS_VERSION,candidate);
 for(const fault of [v=>v.Image='sha256:'+'0'.repeat(64),v=>v.State.Running=false,v=>v.Config.Env.push('RECIPES_ROOT=/foreign'),v=>v.Mounts[0].Source='/foreign',v=>v.Mounts[0].RW=false,v=>v.Mounts.push(v.Mounts[0]),v=>v.Config.Env.push('GEMINI_API_KEY=foreign')]){const bad=clean(apiState);fault(bad);assert.throws(()=>api.validateRuntimeConfiguration(bad,config));}
});

test('actual source loader accepts only fixed render-page paths and rejects missing/hash/path changes',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'pdf-static-closure-'));
 try{
  const write=(name,value)=>{const filename=path.join(directory,name);fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,Buffer.isBuffer(value)?value:JSON.stringify(value));return sha(fs.readFileSync(filename));};
  const sourceRaw=Buffer.from(JSON.stringify(source));write('fixture-source.json',sourceRaw);write(source.document.filename,fs.readFileSync(path.join(__dirname,source.document.filename)));
  const profile={dpi:200,maxDimension:4096,maxPixels:16777216,maxOutputBytes:67108864,maxResidentBytes:536870912,timeoutSeconds:60};
  const pageBytes=[Buffer.from([137,80,78,71,13,10,26,10,1]),Buffer.from([137,80,78,71,13,10,26,10,2])];pageBytes.forEach((bytes,index)=>write('pdf-render-pages/'+index+'.png',bytes));
  const result={version:1,candidate,candidateApiImageId:image,documentSha256:source.document.sha256,defaultProfile:profile,runtime:{framework:'synthetic',os:'synthetic',architecture:'synthetic'},renderedAtUtc:'2026-11-12T10:00:00Z',assemblySha256:'1'.repeat(64),runtimeConfigSha256:'2'.repeat(64),depsSha256:'3'.repeat(64),nativeAssets:{synthetic:'4'.repeat(64)},pages:pageBytes.map((bytes,index)=>({index,sha256:sha(bytes),bytes:bytes.length,width:1,height:1}))};
  const resultHash=write('pdf-render-result.json',result);write('pdf-render-admission.json',{...result,operationId:source.operationId,fixtureSourceSha256:sha(sourceRaw),renderResultSha256:resultHash,approved:true});
  const names=['acceptance.cjs','acceptance-selftest.cjs','date-admission.cjs','settled-readonly.cjs','public-smoke.cjs','server.py','provider-selftest.py','audit-workflow-readonly.py','audit-workflow-selftest.py'];names.forEach(name=>write(name,Buffer.from('synthetic-static-source\n')));
  names.push('fixture-source.json',source.document.filename,'pdf-render-result.json','pdf-render-admission.json','pdf-render-pages/0.png','pdf-render-pages/1.png');
  const manifest={version:1,operationId:source.operationId,candidate,files:names.map(name=>({name,sha256:sha(fs.readFileSync(path.join(directory,name)))}))};write('operator-source-manifest.json',manifest);
  write('runtime-config-allowlist.json',{version:1,operationId:source.operationId,candidate,apiImageId:image,pwaImageId:image,migrationImageId:image,calendarTimeZone:'UTC',embeddingDimensions:1536,providerEndpoint:'http://host.docker.internal:3508/v1beta/openai/',privateOrigin:'http://localhost:3405',geminiKeyMode:'empty',dataRootIdentitySha256:'5'.repeat(64)});
  write('locked-baseline-recipe-ids.json',{version:1,operationId:source.operationId,candidate,backupManifestSha256:'6'.repeat(64),backupSnapshotSha256:'7'.repeat(64),baselineCapturedAtUtc:'2026-11-12T09:00:00Z',recipeIds:[foreign]});
  const review={fileHashes:Object.fromEntries(manifest.files.map(file=>[file.name,file.sha256]))},plan={operationId:source.operationId,candidate,providerPort:3508};
  const box=sandbox('',fs,undefined,directory);assert.doesNotThrow(()=>box.api.loadInputs(plan,'http://localhost:3405',review));
  const missingDate=clean(manifest);missingDate.files=missingDate.files.filter(file=>file.name!=='date-admission.cjs');write('operator-source-manifest.json',missingDate);
  assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',review),'Imported date admission helper must be mandatory');write('operator-source-manifest.json',manifest);
  fs.writeFileSync(path.join(directory,'date-admission.cjs'),Buffer.from('changed-date-authority'));assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',review),'Changed date authority bytes must be refused');write('date-admission.cjs',Buffer.from('synthetic-static-source\n'));
  const omittedDateReview={fileHashes:{...review.fileHashes}};delete omittedDateReview.fileHashes['date-admission.cjs'];assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',omittedDateReview),'Independent review must bind date authority');
  fs.writeFileSync(path.join(directory,'pdf-render-pages/0.png'),Buffer.from('changed'));assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',review));write('pdf-render-pages/0.png',pageBytes[0]);
  const bad=clean(manifest);bad.files[0].name='../foreign.py';write('operator-source-manifest.json',bad);assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',review));write('operator-source-manifest.json',manifest);
  fs.unlinkSync(path.join(directory,'pdf-render-pages/0.png'));fs.symlinkSync(path.join(directory,'pdf-render-pages/1.png'),path.join(directory,'pdf-render-pages/0.png'));assert.throws(()=>box.api.loadInputs(plan,'http://localhost:3405',review));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});


test('all nine production action forms serialize into the finite guard offline', async () => {
 const { actionWire } = require('./action-wire-offline.cjs');
 const root=process.env.WFS_OFFLINE_REPO_ROOT ?? process.cwd(),captureExpected=body();
 for (let index=0; index<9; index++) {
  const s=state(index),kind=api.finiteSlots()[index];
  s.stage=['capture','demand','demand','demand','save250','clear','cleanup','cleanup','cleanup'][index];
  if(index) install(s,index<=3?'producer-settled':index===4?'checked-demand':index===5?'saved-250':'cleared');
  if(index>=5) s.audits['checked-demand']={receipt:audit(state(4),'checked-demand')};
  let details={},body,route,method;
  if(index===0){body=clean(captureExpected);route='/api/recipes/capture-pdf';method='POST';details.allowedBody=body;}
  else if(index===1||index===7){body={referenceWeekStartDate:selected.weekStartDate,weekOffset:0,expectedVersion:'version-current',days:[{date:selected.date,servings:index===1?8:null}]};route='/api/schedule/servings';method='PUT';details={allowedBody:body,previousOverride:index===1?null:8};}
  else if(index===2){body={weekOffset:0,dayIndex:0,recipeId:id,requireEmpty:true};route='/api/schedule/assign';method='POST';s.created[0].assignmentIntent={outcome:'pending'};details.allowedBody=body;}
  else if(index===3){body={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:uid(77)};route='/api/schedule/0/grocery/item';method='PATCH';details.checkedRow=sauce;}
  else if(index===4||index===5){const current=recipe(index===4?'200':'250'),type=index===4?'pasta-250':'pasta-clear';body=patch(current,type);route='/api/recipes/'+id;method='PATCH';details={recipeId:id,currentSnapshot:current,patchPolicy:{type}};}
  else if(index===6){route='/api/schedule/day/'+selected.date+'/remove';method='DELETE';}
  else {route='/api/recipes/'+id;method='DELETE';s.created[0].removalIntent={recipeId:id};}
  pending(s,kind,method,route,details);
  const wire=await actionWire(root,kind,{body,recipeId:id,date:selected.date,reference:selected.weekStartDate,removalToken:assignment.removalToken,currentSnapshot:details.currentSnapshot,pdfBytes:fs.readFileSync(path.join(__dirname,source.document.filename)),filename:source.document.filename,notes:source.captureMetadata.notes,memberId:uid(51)});
  assert.equal(wire.method,method,kind); assert.equal(new URL(wire.url).pathname,route,kind);
  assert.deepEqual(wire.body,body,kind+' exact serialized body');
  const query=index===2||index===3?[['referenceWeekStartDate',selected.weekStartDate]]:index===6?[['expectedPlanToken',assignment.removalToken]]:[];
  assert.deepEqual([...new URL(wire.url).searchParams],query,kind);
  assert.equal(api.requestAllowed(wire.method,wire.url,wire.body,context(s)),true,kind+' admitted');
  assert.equal(api.requestAllowed(wire.method,wire.url,wire.body,{...context(s),readOnly:true}),false,kind+' read-only rejected');
 }
});

test('grocery check binds the exact captured presentation epoch in the serialized request', async()=>{
 const epoch=uid(77),s=state(3);s.stage='demand';install(s,'producer-settled');
 pending(s,'check-sauce-pdf','PATCH','/api/schedule/0/grocery/item',{checkedRow:sauce,checkedPresentationEpoch:epoch});
 const body={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:epoch};
 const { groceryWire }=require('./action-wire-offline.cjs');
 const wire=await groceryWire(process.env.WFS_OFFLINE_REPO_ROOT??process.cwd(),body,selected.weekStartDate);
 assert.equal(api.requestAllowed(wire.method,wire.url,wire.body,context(s)),true);
 for(const value of [undefined,null,foreign]){const bad={...body,expectedPresentationEpoch:value};assert.equal(api.requestAllowed(wire.method,wire.url,bad,context(s)),false);}
});

test('grocery check admits the captured nil presentation epoch without admitting nil identifiers', async()=>{
 const nil='00000000-0000-0000-0000-000000000000',s=state(3);s.stage='demand';install(s,'producer-settled');
 pending(s,'check-sauce-pdf','PATCH','/api/schedule/0/grocery/item',{checkedRow:sauce,checkedPresentationEpoch:nil});
 const body={rowId:sauce.rowId,weekStartDate:selected.weekStartDate,expectedRowVersion:sauce.rowVersion,checked:true,clientMutationId:uid(80),expectedPresentationEpoch:nil};
 const { groceryWire }=require('./action-wire-offline.cjs');
 const wire=await groceryWire(process.env.WFS_OFFLINE_REPO_ROOT??process.cwd(),body,selected.weekStartDate);
 assert.deepEqual(wire.body,body);
 assert.equal(api.requestAllowed(wire.method,wire.url,wire.body,context(s)),true);
 for(const value of [undefined,null,foreign])assert.equal(api.requestAllowed(wire.method,wire.url,{...body,expectedPresentationEpoch:value},context(s)),false);
 assert.equal(api.requestAllowed(wire.method,wire.url,{...body,clientMutationId:nil},context(s)),false);
 const foreignState=clean(s);foreignState.created[0].id=nil;
 assert.equal(api.requestAllowed(wire.method,wire.url,body,context(foreignState)),false);
});
