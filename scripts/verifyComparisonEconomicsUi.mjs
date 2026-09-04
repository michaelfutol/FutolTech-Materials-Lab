import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function findChrome(){for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){const r=spawnSync('which',[name],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Headless Chromium/Chrome is required for Price Intelligence QA.');}
async function waitPort(profileDir,proc){const file=join(profileDir,'DevToolsActivePort');for(let i=0;i<500;i+=1){if(proc.exitCode!==null)throw new Error(`Chromium exited early: ${proc.exitCode}`);try{const p=Number((await readFile(file,'utf8')).trim().split(/\r?\n/)[0]);if(p>0)return p;}catch{}await sleep(50);}throw new Error('Timed out waiting for Chromium DevTools port.');}
async function pageTarget(base){for(let i=0;i<200;i+=1){try{const targets=await(await fetch(`${base}/json/list`)).json();const page=targets.find((t)=>t.type==='page'&&t.webSocketDebuggerUrl);if(page)return page;}catch{}await sleep(50);}throw new Error('Price Intelligence Chromium page target did not appear.');}
async function cdpOpen(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const msg=JSON.parse(String(event.data));if(!msg.id||!pending.has(msg.id))return;const req=pending.get(msg.id);pending.delete(msg.id);msg.error?req.reject(new Error(msg.error.message)):req.resolve(msg.result||{});});const send=(method,params={})=>new Promise((resolve,reject)=>{const requestId=++id;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));});return{socket,send};}
async function evaluate(cdp,expression){const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text||'Browser evaluation failed.');return r.result?.value;}
async function waitFor(cdp,expression,label,tries=150){for(let i=0;i<tries;i+=1){try{if(await evaluate(cdp,expression))return;}catch{}await sleep(100);}throw new Error(`Timed out waiting for ${label}.`);}
async function stop(proc){if(!proc||proc.exitCode!==null)return;proc.kill('SIGTERM');await sleep(500);if(proc.exitCode===null)proc.kill('SIGKILL');}

const server=createServer((req,res)=>{const raw=decodeURIComponent((req.url||'/').split('?')[0]);const rel=raw==='/'?'/compare.html':raw;const file=normalize(join(root,rel));if(!file.startsWith(root))return res.writeHead(403).end('Forbidden');res.setHeader('Content-Type',mime.get(extname(file))||'application/octet-stream');const stream=createReadStream(file);stream.on('error',()=>res.writeHead(404).end('Not found'));stream.pipe(res);});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();const work=await mkdtemp(join(tmpdir(),'ft-price-intelligence-'));const profile=join(work,'profile');let chromeProcess;let cdp;
try{
  chromeProcess=spawn(findChrome(),['--headless=new','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/compare.html?build=price-ci`],{stdio:'ignore'});
  const debugPort=await waitPort(profile,chromeProcess);const target=await pageTarget(`http://127.0.0.1:${debugPort}`);cdp=await cdpOpen(target.webSocketDebuggerUrl);await cdp.send('Runtime.enable');await cdp.send('Page.enable');
  await waitFor(cdp,`document.readyState==='complete' && document.querySelectorAll('[data-slot-preset]').length>=3 && !!document.querySelector('#compareEconomicsPanel')`,'Direct Compare economics panel');

  const chosen=await evaluate(cdp,`(()=>{const preset=document.querySelector('[data-slot-preset="0"]');const option=[...preset.options].find(o=>/C-purlin 2×4 nominal/i.test(o.textContent)&&/1\.20 mm/i.test(o.textContent));if(!option)return null;preset.value=option.value;preset.dispatchEvent(new Event('change',{bubbles:true}));return {id:option.value,label:option.textContent};})()`);
  if(!chosen?.id)throw new Error('Could not select the 2×4 × 1.20 mm C-purlin benchmark in Direct Compare.');
  await waitFor(cdp,`(()=>{const c=document.querySelector('[data-price-card="${chosen.id}"]');return !!c&&/WEB OBSERVED/.test(c.textContent)&&/675/.test(c.textContent);})()`,'seeded CitiHardware web price');

  const beforeEngineering=await evaluate(cdp,`document.querySelector('#compareResultCards')?.textContent||''`);
  const webState=await evaluate(cdp,`(()=>{const c=document.querySelector('[data-price-card="${chosen.id}"]');return {text:c.textContent,table:document.querySelector('#compareTableBody')?.textContent||''};})()`);
  if(!/Procurement material cost/i.test(webState.table)||!/675/.test(webState.table))throw new Error('Procurement material-cost table row did not use the web observation.');

  await evaluate(cdp,`(()=>{window.__priceAlert=null;window.alert=(message)=>{window.__priceAlert=String(message)};const id=${JSON.stringify(chosen.id)};const panel=document.querySelector('#compareEconomicsPanel');panel.querySelector('[data-price-value="'+CSS.escape(id)+'"]').value='620';panel.querySelector('[data-price-length="'+CSS.escape(id)+'"]').value='6';panel.querySelector('[data-price-supplier="'+CSS.escape(id)+'"]').value='Sorsogon Test Supplier';panel.querySelector('[data-price-source="'+CSS.escape(id)+'"]').value='QA-QUOTE-001';panel.querySelector('[data-price-save="'+CSS.escape(id)+'"]').click();})()`);
  await sleep(300);
  const overrideDebug=await evaluate(cdp,`(()=>{const id=${JSON.stringify(chosen.id)};const stored=JSON.parse(localStorage.getItem('futoltech.structuralLab.priceOverrides.v1')||'[]');return {alert:window.__priceAlert||null,stored:stored.find(x=>x.presetId===id)||null,card:document.querySelector('[data-price-card="'+CSS.escape(id)+'"]')?.textContent||'',table:document.querySelector('#compareTableBody')?.textContent||''};})()`);
  console.log('PRICE_OVERRIDE_DEBUG '+JSON.stringify(overrideDebug));
  if(overrideDebug.alert)throw new Error(`Manual price validation alert: ${overrideDebug.alert}`);
  if(!overrideDebug.stored)throw new Error('Manual price click did not persist an override record to localStorage.');
  if(!/MANUAL \/ PROJECT/.test(overrideDebug.card)||!/620/.test(overrideDebug.card)||!/Sorsogon Test Supplier/.test(overrideDebug.card))throw new Error(`Manual price persisted but card did not render it: ${overrideDebug.card}`);
  if(!/620/.test(overrideDebug.table))throw new Error('Manual project price did not update the procurement-cost table row.');
  const afterOverrideEngineering=await evaluate(cdp,`document.querySelector('#compareResultCards')?.textContent||''`);
  if(beforeEngineering!==afterOverrideEngineering)throw new Error('Changing only economic price evidence altered the engineering result cards.');

  await sleep(1000);
  await cdp.send('Page.reload',{ignoreCache:true});
  await waitFor(cdp,`document.readyState==='complete' && !!document.querySelector('#compareEconomicsPanel') && document.querySelectorAll('[data-slot-preset]').length>=3 && [...(document.querySelector('[data-slot-preset="0"]')?.options||[])].some(o=>o.value===${JSON.stringify(chosen.id)})`,'reloaded economics panel and benchmark preset options');
  const reloadStorage=await evaluate(cdp,`(()=>{const id=${JSON.stringify(chosen.id)};const stored=JSON.parse(localStorage.getItem('futoltech.structuralLab.priceOverrides.v1')||'[]');return stored.find(x=>x.presetId===id)||null;})()`);
  console.log('PRICE_RELOAD_STORAGE '+JSON.stringify(reloadStorage));
  if(!reloadStorage)throw new Error('Manual project override did not survive page reload in localStorage.');
  await evaluate(cdp,`(()=>{const preset=document.querySelector('[data-slot-preset="0"]');preset.value=${JSON.stringify(chosen.id)};preset.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await waitFor(cdp,`document.querySelector('[data-slot-preset="0"]')?.value===${JSON.stringify(chosen.id)}`,'reselected benchmark preset after reload');
  await sleep(700);
  const reloadDebug=await evaluate(cdp,`(()=>{const id=${JSON.stringify(chosen.id)};return {selected:document.querySelector('[data-slot-preset="0"]')?.value||null,stored:JSON.parse(localStorage.getItem('futoltech.structuralLab.priceOverrides.v1')||'[]').find(x=>x.presetId===id)||null,card:document.querySelector('[data-price-card="'+CSS.escape(id)+'"]')?.textContent||'',table:document.querySelector('#compareTableBody')?.textContent||''};})()`);
  console.log('PRICE_RELOAD_DEBUG '+JSON.stringify(reloadDebug));
  await waitFor(cdp,`(()=>{const c=document.querySelector('[data-price-card="${chosen.id}"]');return !!c&&/MANUAL \/ PROJECT/.test(c.textContent)&&/620/.test(c.textContent);})()`,'persisted local project override');

  await evaluate(cdp,`(()=>{const id=${JSON.stringify(chosen.id)};document.querySelector('#compareEconomicsPanel [data-price-clear="'+CSS.escape(id)+'"]')?.click();})()`);
  await waitFor(cdp,`(()=>{const c=document.querySelector('[data-price-card="${chosen.id}"]');return !!c&&/WEB OBSERVED/.test(c.textContent)&&/675/.test(c.textContent)&&!/MANUAL \/ PROJECT/.test(c.textContent);})()`,'return to web-observed price');
  const stored=await evaluate(cdp,`JSON.parse(localStorage.getItem('futoltech.structuralLab.priceOverrides.v1')||'[]').some(x=>x.presetId===${JSON.stringify(chosen.id)})`);
  if(stored)throw new Error('Clearing the manual override did not remove the saved project price.');

  console.log('Price Intelligence web observation → manual override → persistence → clear-to-web QA passed in real Chromium.');
}finally{try{cdp?.socket.close();}catch{}await stop(chromeProcess);await new Promise((resolve)=>server.close(resolve));await rm(work,{recursive:true,force:true});}
