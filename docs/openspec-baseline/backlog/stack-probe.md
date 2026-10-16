# Controlled stack probe

Ad hoc audit only; not a committed test or browser substitute. Extracted actual callback with controlled dependencies. Run identity and limitations in library-audit.md.

```javascript
const fs = require('fs');
const ts = require('/Users/alex/Code/whats-for-supper/pwa/node_modules/typescript');
const path='/Users/alex/Code/whats-for-supper/pwa/src/app/(app)/browse-all-stack/page.tsx';
const src=fs.readFileSync(path,'utf8');
const body=src.split('const wrapToLastPage = useCallback(async () => {')[1].split('\n  }, [')[0];
const js=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
async function probe(total, fail=false, change=false){
 const ids=Array.from({length:total},(_,i)=>`recipe-${i+1}`); const s={recipes:ids.slice(0,20).map(id=>({id})),currentIndex:0,totalCount:total,hasMorePages:true};const calls=[];let release;
 const scope={STACK_PAGE_SIZE:20,wrapRequestIdRef:{current:0},isDiscoverableOnly:false,totalCount:total,recipes:s.recipes,allLibraryTotal:total,hasMorePages:true,setIsEndCard:()=>{},setCurrentIndex:i=>s.currentIndex=i,setIsWrappingToEnd:()=>{},setRecipes:r=>s.recipes=r,setTotalCount:n=>s.totalCount=n,wrapPrefetchCooldownRef:{current:false},GetOrderQueryParameterTypeObject:{Explore:'explore'},useBrowseStackStore:{getState:()=>s,setState:x=>Object.assign(s,x)},apiClient:{api:{recipes:{get:async({queryParameters:q})=>{calls.push(q);if(change) await new Promise(r=>release=r);if(fail)throw Error('controlled page failure');return {recipes:ids.slice((q.page-1)*20,q.page*20).map(id=>({id}))};}}}},console:{error:()=>{}}};
 const fn=new Function(...Object.keys(scope),`return (async()=>{${js}})()`); const promise=fn(...Object.values(scope));
 if(change){s.recipes=[{id:'filtered-first'}];s.totalCount=1;s.currentIndex=0;release();}
 await promise; const reached=s.recipes[s.currentIndex]?.id;const visited=new Set();for(let i=0;i<s.recipes.length+1;i++){visited.add(s.recipes[s.currentIndex]?.id);s.currentIndex=s.currentIndex>=s.recipes.length-1?0:s.currentIndex+1;}
 return {total,fail,change,reached,displayed:`${s.recipes.findIndex(r=>r.id===reached)+1}/${s.totalCount}`,loaded:s.recipes.length,hasMorePages:s.hasMorePages,visited:[...visited],requested:calls};
}
(async()=>{for(const args of [[126],[180],[126,true],[126,false,true]]) console.log(JSON.stringify(await probe(...args)));})();

```
