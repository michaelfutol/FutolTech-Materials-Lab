const N_PER_KN = 1000;
const NMM_PER_KNM = 1_000_000;
const MM_PER_M = 1000;

function finite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}
function positive(value, label) {
  finite(value, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}
function zeros(n) { return Array.from({ length: n }, () => Array(n).fill(0)); }
function matVec(A, x) { return A.map((row) => row.reduce((s, a, i) => s + a * x[i], 0)); }

function assemble(K, k, maps) {
  for (let a = 0; a < k.length; a += 1) for (let b = 0; b < k[a].length; b += 1) {
    if (k[a][b] === 0) continue;
    for (const ma of maps[a]) for (const mb of maps[b]) K[ma.index][mb.index] += k[a][b] * ma.coef * mb.coef;
  }
}

function frameK(E, A, I, L) {
  const ax = E * A / L;
  const a = 12 * E * I / L ** 3;
  const b = 6 * E * I / L ** 2;
  const c = 4 * E * I / L;
  const d = 2 * E * I / L;
  return [
    [ax,0,0,-ax,0,0],
    [0,a,b,0,-a,b],
    [0,b,c,0,-b,d],
    [-ax,0,0,ax,0,0],
    [0,-a,-b,0,a,-b],
    [0,b,d,0,-b,c]
  ];
}

function geometricK(axialForceN, L) {
  const out = zeros(6);
  if (!Number.isFinite(axialForceN) || Math.abs(axialForceN) < 1e-12) return out;
  const s = axialForceN / (30 * L), L2 = L * L;
  const g = [[36,3*L,-36,3*L],[3*L,4*L2,-3*L,-L2],[-36,-3*L,36,-3*L],[3*L,-L2,-3*L,4*L2]];
  const ids = [1,2,4,5];
  for (let i=0;i<4;i+=1) for (let j=0;j<4;j+=1) out[ids[i]][ids[j]] = s*g[i][j];
  return out;
}

function normalizeEnd(end = {}) {
  const type = end.type ?? 'rigid';
  if (!['rigid','pin','spring'].includes(type)) throw new Error(`Unsupported frame end type: ${type}`);
  if (type !== 'spring') return { ...end, type };
  const kThetaKNmPerRad = positive(Number(end.kThetaKNmPerRad), 'Rotational spring stiffness');
  const out = { ...end, type, kThetaKNmPerRad };
  if (end.momentLimitKNm != null && end.momentLimitKNm !== '') out.momentLimitKNm = positive(Number(end.momentLimitKNm), 'Spring moment limit');
  if (end.postLimitStiffnessRatio != null && end.postLimitStiffnessRatio !== '') {
    const r = Number(end.postLimitStiffnessRatio);
    if (!Number.isFinite(r) || r < 0 || r >= 1) throw new Error('Post-limit spring stiffness ratio must be from 0 (pin release) to less than 1.');
    out.postLimitStiffnessRatio = r;
  }
  return out;
}

function validate(model) {
  if (!model?.nodes?.length) throw new Error('Frame model requires nodes.');
  if (!model?.elements?.length) throw new Error('Frame model requires elements.');
  const nodeIds = new Set();
  for (const n of model.nodes) {
    if (!n.id || nodeIds.has(n.id)) throw new Error('Frame node ids must be unique and non-empty.');
    nodeIds.add(n.id); finite(Number(n.xM), `Node ${n.id} x`); finite(Number(n.yM), `Node ${n.id} y`);
  }
  const elementIds = new Set();
  for (const e of model.elements) {
    if (!e.id || elementIds.has(e.id)) throw new Error('Frame element ids must be unique and non-empty.');
    elementIds.add(e.id);
    if (!nodeIds.has(e.nodeI) || !nodeIds.has(e.nodeJ) || e.nodeI === e.nodeJ) throw new Error(`Element ${e.id} has invalid end nodes.`);
    positive(Number(e.elasticModulusMPa), `Element ${e.id} E`); positive(Number(e.areaMm2), `Element ${e.id} area`); positive(Number(e.inertiaMm4), `Element ${e.id} inertia`);
    normalizeEnd(e.endI); normalizeEnd(e.endJ);
  }
}

function defineSystem(model) {
  validate(model);
  const nodes = new Map();
  model.nodes.forEach((n,i)=>nodes.set(n.id,{...n,xMm:Number(n.xM)*MM_PER_M,yMm:Number(n.yM)*MM_PER_M,dofs:{ux:3*i,uy:3*i+1,rz:3*i+2}}));
  let next = model.nodes.length*3;
  const elements = model.elements.map(raw=>{
    const ni=nodes.get(raw.nodeI), nj=nodes.get(raw.nodeJ), dx=nj.xMm-ni.xMm, dy=nj.yMm-ni.yMm;
    const L=positive(Math.hypot(dx,dy),`Element ${raw.id} length`), c=dx/L, s=dy/L;
    const endI=normalizeEnd(raw.endI), endJ=normalizeEnd(raw.endJ);
    const internalI=endI.type==='rigid'?null:next++, internalJ=endJ.type==='rigid'?null:next++;
    const maps=[
      [{index:ni.dofs.ux,coef:c},{index:ni.dofs.uy,coef:s}],
      [{index:ni.dofs.ux,coef:-s},{index:ni.dofs.uy,coef:c}],
      endI.type==='rigid'?[{index:ni.dofs.rz,coef:1}]:[{index:internalI,coef:1}],
      [{index:nj.dofs.ux,coef:c},{index:nj.dofs.uy,coef:s}],
      [{index:nj.dofs.ux,coef:-s},{index:nj.dofs.uy,coef:c}],
      endJ.type==='rigid'?[{index:nj.dofs.rz,coef:1}]:[{index:internalJ,coef:1}]
    ];
    return {...raw,elasticModulusMPa:Number(raw.elasticModulusMPa),areaMm2:Number(raw.areaMm2),inertiaMm4:Number(raw.inertiaMm4),ni,nj,L,c,s,endI,endJ,internalI,internalJ,maps};
  });
  return {nodes,elements,dofCount:next};
}

function addSpring(K,internal,jointRz,kTheta) {
  const k=kTheta*NMM_PER_KNM;
  K[internal][internal]+=k; K[jointRz][jointRz]+=k; K[internal][jointRz]-=k; K[jointRz][internal]-=k;
}
function stiffness(system, axial=null) {
  const K=zeros(system.dofCount);
  for (const e of system.elements) {
    assemble(K,frameK(e.elasticModulusMPa,e.areaMm2,e.inertiaMm4,e.L),e.maps);
    if (axial?.has(e.id)) assemble(K,geometricK(axial.get(e.id),e.L),e.maps);
    if (e.endI.type==='spring') addSpring(K,e.internalI,e.ni.dofs.rz,e.endI.kThetaKNmPerRad);
    if (e.endJ.type==='spring') addSpring(K,e.internalJ,e.nj.dofs.rz,e.endJ.kThetaKNmPerRad);
  }
  return K;
}
function loadVector(model,system) {
  const F=Array(system.dofCount).fill(0);
  for (const raw of model.nodes) {
    const n=system.nodes.get(raw.id), load=raw.loads??{};
    F[n.dofs.ux]+=Number(load.fxKN??0)*N_PER_KN; F[n.dofs.uy]+=Number(load.fyKN??0)*N_PER_KN; F[n.dofs.rz]+=Number(load.mzKNm??0)*NMM_PER_KNM;
  }
  return F;
}
function restraintSet(model,system) {
  const r=new Set();
  for (const raw of model.nodes) {
    const n=system.nodes.get(raw.id), b=raw.restraints??{};
    if(b.ux)r.add(n.dofs.ux); if(b.uy)r.add(n.dofs.uy); if(b.rz)r.add(n.dofs.rz);
  }
  return r;
}

function denseSolve(A0,b0) {
  const n=b0.length; if(!n)return[];
  const A=A0.map(r=>r.slice()), b=b0.slice(), scale=Math.max(1,...A.flat().map(Math.abs)), tol=scale*1e-12;
  for(let col=0;col<n;col+=1){
    let p=col,pv=Math.abs(A[col][col]);
    for(let row=col+1;row<n;row+=1)if(Math.abs(A[row][col])>pv){pv=Math.abs(A[row][col]);p=row;}
    if(pv<=tol)throw new Error('Frame stiffness matrix is singular or near-singular: check restraints, pin releases, connection springs, or geometric instability.');
    if(p!==col){[A[col],A[p]]=[A[p],A[col]];[b[col],b[p]]=[b[p],b[col]];}
    const pivot=A[col][col];
    for(let row=col+1;row<n;row+=1){const f=A[row][col]/pivot;if(Math.abs(f)<1e-30)continue;A[row][col]=0;for(let j=col+1;j<n;j+=1)A[row][j]-=f*A[col][j];b[row]-=f*b[col];}
  }
  const x=Array(n).fill(0);
  for(let row=n-1;row>=0;row-=1){let rhs=b[row];for(let j=row+1;j<n;j+=1)rhs-=A[row][j]*x[j];x[row]=rhs/A[row][row];}
  return x;
}

function solveSystem(K,F,restrained) {
  const maxK=Math.max(1,...K.flat().map(Math.abs)), rowTol=maxK*1e-14, forceTol=Math.max(1,...F.map(Math.abs))*1e-12;
  for(let i=0;i<F.length;i+=1)if(!restrained.has(i)){
    const rowMax=Math.max(...K[i].map(Math.abs));
    if(rowMax<=rowTol){
      if(Math.abs(F[i])>forceTol)throw new Error('A load is applied to a disconnected frame degree of freedom.');
      restrained.add(i);
    }
  }
  const free=[]; for(let i=0;i<F.length;i+=1)if(!restrained.has(i))free.push(i);
  if(!free.length)throw new Error('Frame has no free degrees of freedom.');
  const ur=denseSolve(free.map(i=>free.map(j=>K[i][j])),free.map(i=>F[i])), U=Array(F.length).fill(0);
  free.forEach((d,i)=>{U[d]=ur[i];}); return {U,free};
}

function localQ(e,U){return e.maps.map(m=>m.reduce((s,x)=>s+x.coef*U[x.index],0));}
function elementResults(system,U){return system.elements.map(e=>{
  const q=localQ(e,U),f=matVec(frameK(e.elasticModulusMPa,e.areaMm2,e.inertiaMm4,e.L),q);
  return{id:e.id,nodeI:e.nodeI,nodeJ:e.nodeJ,lengthM:e.L/MM_PER_M,localDisplacements:q,localEndForces:{axialIN:f[0],shearIN:f[1],momentINmm:f[2],axialJN:f[3],shearJN:f[4],momentJNmm:f[5]},axialForceN:f[3],axialForceKN:f[3]/N_PER_KN,endMomentIKNm:f[2]/NMM_PER_KNM,endMomentJKNm:f[5]/NMM_PER_KNM,endShearIKN:f[1]/N_PER_KN,endShearJKN:f[4]/N_PER_KN};
});}
function connectionResults(system,U){
  const out=[];
  for(const e of system.elements)for(const [side,end,internal,node] of [['I',e.endI,e.internalI,e.ni],['J',e.endJ,e.internalJ,e.nj]]){
    if(end.type!=='spring')continue;
    const memberRotation=U[internal],jointRotation=U[node.dofs.rz],relativeRotationRad=memberRotation-jointRotation,momentKNm=end.kThetaKNmPerRad*relativeRotationRad;
    out.push({id:`${e.id}:${side}`,elementId:e.id,side,nodeId:node.id,kThetaKNmPerRad:end.kThetaKNmPerRad,memberRotationRad:memberRotation,jointRotationRad:jointRotation,relativeRotationRad,momentKNm,momentMagnitudeKNm:Math.abs(momentKNm),momentLimitKNm:Number.isFinite(end.momentLimitKNm)?end.momentLimitKNm:null,utilization:Number.isFinite(end.momentLimitKNm)?Math.abs(momentKNm)/end.momentLimitKNm:null,postLimitStiffnessRatio:Number.isFinite(end.postLimitStiffnessRatio)?end.postLimitStiffnessRatio:null});
  }
  return out;
}
function nodeResults(model,system,U){return model.nodes.map(raw=>{const n=system.nodes.get(raw.id),ux=U[n.dofs.ux],uy=U[n.dofs.uy],rz=U[n.dofs.rz];return{id:raw.id,xM:Number(raw.xM),yM:Number(raw.yM),uxMm:ux,uyMm:uy,rzRad:rz,translationMm:Math.hypot(ux,uy)};});}
function reactionResults(model,system,K,U,F,restrained){const KU=matVec(K,U),R=KU.map((v,i)=>restrained.has(i)?v-F[i]:0);return model.nodes.map(raw=>{const n=system.nodes.get(raw.id);return{id:raw.id,fxKN:R[n.dofs.ux]/N_PER_KN,fyKN:R[n.dofs.uy]/N_PER_KN,mzKNm:R[n.dofs.rz]/NMM_PER_KNM};});}
function buildResult(model,system,K,F,restrained,U,meta={}){
  const nodes=nodeResults(model,system,U),elements=elementResults(system,U),connections=connectionResults(system,U),reactions=reactionResults(model,system,K,U,F,restrained);
  const maxT=nodes.reduce((a,b)=>b.translationMm>a.translationMm?b:a,nodes[0]),maxR=nodes.reduce((a,b)=>Math.abs(b.rzRad)>Math.abs(a.rzRad)?b:a,nodes[0]);
  return{...meta,nodes,elements,connections,reactions,maxTranslationMm:maxT.translationMm,maxTranslationNodeId:maxT.id,maxAbsRotationRad:Math.abs(maxR.rzRad),maxAbsRotationNodeId:maxR.id,displacementVector:U};
}

export function solveFrame2D(model){const sys=defineSystem(model),K=stiffness(sys),F=loadVector(model,sys),r=restraintSet(model,sys),{U}=solveSystem(K,F,r);return buildResult(model,sys,K,F,r,U,{analysis:'FIRST ORDER ELASTIC'});}

export function solveFrame2DPDelta(model,{maxIterations=40,tolerance=1e-6}={}){
  if(!Number.isInteger(maxIterations)||maxIterations<1)throw new Error('P-Delta maxIterations must be a positive integer.');positive(Number(tolerance),'P-Delta convergence tolerance');
  const sys=defineSystem(model),F=loadVector(model,sys),r=restraintSet(model,sys),K0=stiffness(sys);let{U}=solveSystem(K0,F,r);const U0=U.slice();let prev=U.slice(),finalK=K0,converged=false,iterations=0;
  for(iterations=1;iterations<=maxIterations;iterations+=1){const axial=new Map(elementResults(sys,prev).map(e=>[e.id,e.axialForceN]));finalK=stiffness(sys,axial);U=solveSystem(finalK,F,r).U;let change=0,value=1e-9;for(let i=0;i<U.length;i+=1){change=Math.max(change,Math.abs(U[i]-prev[i]));value=Math.max(value,Math.abs(U[i]));}if(change/value<=tolerance){converged=true;break;}prev=U.slice();}
  if(!converged)throw new Error(`P-Delta iteration did not converge within ${maxIterations} iterations.`);
  const out=buildResult(model,sys,finalK,F,r,U,{analysis:'SECOND ORDER ELASTIC P-DELTA',iterations,converged:true}),firstMax=Math.max(...nodeResults(model,sys,U0).map(n=>n.translationMm));out.firstOrderMaxTranslationMm=firstMax;out.translationAmplification=firstMax>0?out.maxTranslationMm/firstMax:1;out.boundary='Elastic geometric-stiffness iteration using member axial force. This is not a corotational large-displacement, plastic-hinge, or post-buckling solution.';return out;
}

function scaleLoads(model,factor){return{...model,nodes:model.nodes.map(n=>({...n,loads:{fxKN:Number(n.loads?.fxKN??0)*factor,fyKN:Number(n.loads?.fyKN??0)*factor,mzKNm:Number(n.loads?.mzKNm??0)*factor}})),elements:model.elements.map(e=>({...e,endI:{...(e.endI??{})},endJ:{...(e.endJ??{})}}))};}
function workingCopy(model){return{...model,nodes:model.nodes.map(n=>({...n,restraints:{...(n.restraints??{})},loads:{...(n.loads??{})}})),elements:model.elements.map(e=>({...e,endI:{...(e.endI??{}),_degraded:false},endJ:{...(e.endJ??{}),_degraded:false}}))};}
function endById(model,id){const[elementId,side]=id.split(':'),e=model.elements.find(x=>x.id===elementId);if(!e)throw new Error(`Unknown connection event element: ${elementId}`);return side==='I'?e.endI:e.endJ;}

export function solveFrameWithConnectionRedistribution(model,{targetLoadFactor=1,maxEvents=20}={}){
  positive(Number(targetLoadFactor),'Target load factor');if(!Number.isInteger(maxEvents)||maxEvents<1)throw new Error('maxEvents must be a positive integer.');
  const working=workingCopy(model),events=[];let currentFactor=0,mechanism=false,mechanismMessage=null;
  for(let k=0;k<maxEvents;k+=1){
    let unit;try{unit=solveFrame2D(scaleLoads(working,1));}catch(error){mechanism=true;mechanismMessage=error instanceof Error?error.message:String(error);break;}
    const candidates=unit.connections.filter(c=>{const end=endById(working,c.id);return!end._degraded&&Number.isFinite(c.momentLimitKNm)&&Number.isFinite(c.postLimitStiffnessRatio)&&c.momentMagnitudeKNm>1e-12;}).map(c=>({connection:c,eventFactor:Math.max(currentFactor,c.momentLimitKNm/c.momentMagnitudeKNm)})).filter(c=>c.eventFactor<=targetLoadFactor+1e-10).sort((a,b)=>a.eventFactor-b.eventFactor||a.connection.id.localeCompare(b.connection.id));
    if(!candidates.length)break;
    const selected=candidates[0];currentFactor=selected.eventFactor;const before=solveFrame2D(scaleLoads(working,currentFactor)),bc=before.connections.find(c=>c.id===selected.connection.id),end=endById(working,selected.connection.id),oldK=end.kThetaKNmPerRad,ratio=end.postLimitStiffnessRatio;end._degraded=true;if(ratio===0){end.type='pin';delete end.kThetaKNmPerRad;}else end.kThetaKNmPerRad=oldK*ratio;
    let after=null;try{after=solveFrame2D(scaleLoads(working,currentFactor));}catch(error){mechanism=true;mechanismMessage=error instanceof Error?error.message:String(error);}
    events.push({sequence:events.length+1,loadFactor:currentFactor,connectionId:selected.connection.id,momentLimitKNm:bc?.momentLimitKNm??selected.connection.momentLimitKNm,momentBeforeKNm:bc?.momentKNm??null,oldKThetaKNmPerRad:oldK,residualStiffnessRatio:ratio,newKThetaKNmPerRad:ratio===0?0:oldK*ratio,stateAfter:ratio===0?'PIN RELEASE':'DEGRADED SPRING',maxTranslationBeforeMm:before.maxTranslationMm,maxTranslationAfterMm:after?.maxTranslationMm??null,mechanismAfter:mechanism});if(mechanism)break;
  }
  let finalResult=null;if(!mechanism)try{finalResult=solveFrame2D(scaleLoads(working,targetLoadFactor));}catch(error){mechanism=true;mechanismMessage=error instanceof Error?error.message:String(error);}
  return{analysis:'PIECEWISE ELASTIC CONNECTION REDISTRIBUTION',targetLoadFactor,events,finalResult,mechanism,mechanismMessage,finalModel:working,boundary:'Connection event thresholds and residual stiffness ratios are explicit user/research/calibration inputs. The solver does not infer them from fastener count. This v1 path is first-order, piecewise elastic and does not preserve plastic rotation or hysteretic energy.'};
}

export function rectangularSectionProperties(widthMm,depthMm){positive(Number(widthMm),'Rectangle width');positive(Number(depthMm),'Rectangle depth');return{areaMm2:Number(widthMm)*Number(depthMm),inertiaMm4:Number(widthMm)*Number(depthMm)**3/12};}

export function createNF001Model({widthM=3,heightM=3,elasticModulusMPa=13_100,memberWidthMm=50,memberDepthMm=100,lateralLoadKN=1,gravityLoadKN=0,topJointType='rigid',topJointKThetaKNmPerRad=null,topJointMomentLimitKNm=null,postLimitStiffnessRatio=null}={}){
  positive(Number(widthM),'NF-001 width');positive(Number(heightM),'NF-001 height');positive(Number(elasticModulusMPa),'NF-001 elastic modulus');finite(Number(lateralLoadKN),'NF-001 lateral load');finite(Number(gravityLoadKN),'NF-001 gravity load');const section=rectangularSectionProperties(memberWidthMm,memberDepthMm);
  const joint=()=>{if(topJointType==='rigid')return{type:'rigid'};if(topJointType==='pin')return{type:'pin'};if(topJointType!=='spring')throw new Error('NF-001 topJointType must be rigid, pin, or spring.');const end={type:'spring',kThetaKNmPerRad:positive(Number(topJointKThetaKNmPerRad),'NF-001 explicit joint spring stiffness')};if(topJointMomentLimitKNm!=null&&topJointMomentLimitKNm!=='')end.momentLimitKNm=positive(Number(topJointMomentLimitKNm),'NF-001 explicit joint moment limit');if(postLimitStiffnessRatio!=null&&postLimitStiffnessRatio!=='')end.postLimitStiffnessRatio=Number(postLimitStiffnessRatio);return normalizeEnd(end);};
  const props={elasticModulusMPa:Number(elasticModulusMPa),...section};
  return{id:'NF-001',description:'3 m × 3 m nominal coconut-lumber portal/wall-frame benchmark with explicit joint idealization.',evidenceBoundary:'Geometry is a software benchmark. Coco E uses the selected project dataset. Semi-rigid kθ and any moment threshold must be supplied explicitly; they are never inferred from nails or bolts.',nodes:[{id:'N1',xM:0,yM:0,restraints:{ux:true,uy:true,rz:true}},{id:'N2',xM:Number(widthM),yM:0,restraints:{ux:true,uy:true,rz:true}},{id:'N3',xM:0,yM:Number(heightM),loads:{fxKN:Number(lateralLoadKN),fyKN:-Number(gravityLoadKN)/2}},{id:'N4',xM:Number(widthM),yM:Number(heightM),loads:{fyKN:-Number(gravityLoadKN)/2}}],elements:[{id:'C1',nodeI:'N1',nodeJ:'N3',...props,endI:{type:'rigid'},endJ:joint()},{id:'B1',nodeI:'N3',nodeJ:'N4',...props,endI:joint(),endJ:joint()},{id:'C2',nodeI:'N2',nodeJ:'N4',...props,endI:{type:'rigid'},endJ:joint()}]};
}
