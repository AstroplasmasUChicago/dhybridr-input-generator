'use strict';
const {assert,context:c,plain,parse,app,messages,panel}=require('./capacity.test.cjs');
const fs=require('node:fs'),vm=require('node:vm');
const registry=vm.runInContext('INPUT_NAMES',c),schema=vm.runInContext('SCHEMA',c);
const round=text=>{const a=c.parseInputFile(text);const out=c.generateInputFile(a,a._dim,a._build||'CPU');const b=c.parseInputFile(out);assert.equal(b._report.filter(r=>r.kind!=='notice').length,0);return {a,b,out};};
const registryFields = registry.keys.map(entry => `${entry.section}.${entry.name.toLowerCase()}`).sort();
const schemaFields = Object.entries(schema).flatMap(([section, definition]) => definition.fields.map(field => `${section}.${field.key.toLowerCase()}`)).sort();
assert.deepEqual(plain(registryFields), plain(schemaFields), 'registry and schema must declare the same current interface');
// Every ordinary historical assignment maps to its current schema field.
let mappings=0;
for(const entry of registry.keys)for(const old of entry.old){
 const field=schema[entry.section].fields.find(f=>f.key===entry.name);
 let value=field.default;
 if(field.dim==='VARIABLE')value=[2,0];
 if(field.key==='phase_spaces')value='x3x2x1';
 if(field.key==='n_species')value=1;
 if(field.key==='u_th_parallel')value=0;
 const literal=v=>typeof v==='string'?`"${v.replace(/"/g,'""')}"`:typeof v==='boolean'?(v?'.true.':'.false.'):String(v);
 const vals=Array.isArray(value)?value.slice(0,c.getArraySize(field.dim,2)||value.length):[value];
 const prefix=schema[old.section].perSpecies&&old.section!=='species'?'species {} ':'';
 const thermal=field.key==='u_th_parallel'?'distribution="bimaxwellian",':'';
 const electrons=field.key==='dump_Pe'?'fluid_electrons{closure="evolved"} ':'';
 const suffix=field.key==='n_species'?' species{}':'';
 const body=`${electrons}${prefix}${old.section}{${thermal}${old.name}=${vals.map(literal).join(',')}}${suffix}`;
 const parsed=c.parseInputFile(body);
 const block=schema[entry.section].perSpecies?(schema[entry.section].multiPerSpecies?parsed[entry.section][0][0]:parsed[entry.section][0]):parsed[entry.section];
 assert.ok(block._present.includes(field.key),body);
 mappings++;
}
assert.ok(mappings>70);
for(const [distribution,key]of Object.entries(registry.thermal)){
 const {a,b,out}=round(`species {dist="${distribution}",vth=0} plasma_injector{vth=0} plasma_injector{}`);
 assert.equal(a.species[0][key],0);assert.equal(b.plasma_injector[0][0][key],0);
 assert.deepEqual(plain(b.plasma_injector[0][1]._present),[]);
 assert.doesNotMatch(out,/\bvth\b/);
 for(const wrong of Object.values(registry.thermal).filter(k=>k!==key))assert.throws(()=>c.parseInputFile(`species{distribution="${distribution}",${key}=0,${wrong}=0}`),/does not apply/);
}
assert.equal(round('fluid_electrons{Te="2.5",gamma=1.4}').b.fluid_electrons.Ke,2.5);
assert.equal(round('fluid_electrons{closure="evolved",Te="x+n",gamma_e=1.4}').b.fluid_electrons.Te,'x+n');
assert.equal(round('grid_space{K=2.,gamma=1.5}').b.fluid_electrons.Ke,2);
for(const text of ['grid_space{K=2.} fluid_electrons{Ke=2.}','fluid_electrons{Ke=1,Te="1."}','fluid_electrons{closure="evolved",Ke=2.}','grid_space{gamma=1.4}fluid_electrons{closure="evolved"}','species{num_par=2,ppc=2}','species{ppc(1)=2,ppc(1)=2}','mystery{x=1}','species{mystery=1}','species{vboost=0}','species{}plasma_injector{vboost=0}','algorithm{resistivity=0}','species{}raw_diag{n_constants=2,ct=1}','species{name="unterminated}','species{name="x" stray}','raw_diag{enabled=.true.}','particles{n_species=2}species{}','species{distribution="shell"}','species{u_drift_profile="x","","z"}'])assert.throws(()=>c.parseInputFile(text),undefined,text);
const quoted=round(`species{name="ct(1) ! { } say ""yes""",number_density='if(constants(1)!=0,1.,0.)',constants=0}`);
assert.equal(quoted.b.species[0].name,'ct(1) ! { } say "yes"');
assert.equal(quoted.a._report.length,0);
const sparse=round('node_conf{ranks(1)=1,ranks(2)=1}species{ppc(2)=3,initial_bounds(3)=4.}diag_species{phase_spaces(2)="utx1"}');
assert.equal(sparse.b._dim,2);assert.deepEqual(plain(sparse.b.species[0]._indices.ppc),[2]);assert.deepEqual(plain(sparse.b.species[0]._indices.initial_bounds),[3]);assert.equal(sparse.b.species[0].initial_bounds[1],4);assert.match(sparse.out,/phase_spaces\(2\)="utx1"/);
const scoped=round('particles{n_species=2}species{name="one"}plasma_injector{}plasma_injector{}species{name="two"}raw_diag{selectrule="vx>0",raw_volume=0,0,4,4,raw_dump_fraction=.5}diag_species{phasespaces="p2p1","ptx1","etx1"}');
assert.equal(scoped.b.raw_diag[0],undefined);assert.equal(scoped.b.raw_diag[1].filter,'vx>0');assert.equal(scoped.a.plasma_injector[0].length,2);assert.equal(scoped.b.diag_species[1].phase_spaces,'u2u1,utx1,etx1');assert.ok(scoped.a._report.some(r=>/now combines/.test(r.message)));
assert.equal(round('ascent{outputs="ptx1:species1","Bx:Self","etx1"}').b.ascent.outputs,'utx1:species1,Bx:Self,etx1');
assert.throws(()=>c.parseInputFile('species{nsp="'+ 'ct(1)+'.repeat(400)+'0"}'),/4095/);
// A failed preset must leave both the current form and selectors intact.
app.applyParsedState(c.parseInputFile('node_conf{ranks=1,1}particles{n_species=2}species{name="one"}plasma_injector{}species{name="two"}raw_diag{enabled=.true.}'),'large');
const before=JSON.stringify(app.getState()),dim=app.getDim(),build=app.getBuild();
app.applyPreset({name:'bad',dim:3,build:'GPU',values:{species:[{unknown:1}]}});
assert.equal(JSON.stringify(app.getState()),before);assert.equal(app.getDim(),dim);assert.equal(app.getBuild(),build);assert.match(panel.textContent,/Could not load/);
app.applyParsedState(c.parseInputFile('species{name="small"}'),'small');
const small=c.generateInputFile(app.getState(),2,'CPU');
assert.equal(app.getState().species.length,1);assert.equal(app.getState().plasma_injector[0].length,0);assert.doesNotMatch(small,/raw_diag|plasma_injector|u_th|ppc|fluid_electrons/);assert.match(panel.innerHTML,/no conversion needed/);
// Saved imported state retains omitted fields and array entries.
app.applyPreset({name:'saved',dim:2,build:'CPU',values:plain(app.getState())});
assert.equal(messages.at(-1),'Loaded preset: saved');assert.doesNotMatch(c.generateInputFile(app.getState(),2,'CPU'),/u_th|ppc|fluid_electrons/);
app.applyPreset({name:'old-count',dim:2,values:{species:[{ct:[2,0,7],n_constants:2}]}});
assert.equal(messages.at(-1),'Loaded preset: old-count');assert.deepEqual(plain(app.getState().species[0].constants),[2,0]);
console.log(`PASS: ${mappings} registry mappings, conditional keys, quotes/indices, scoped sections, conflicts, fresh loads, presets, and conversion reports.`);
app.applyPreset({name:'old-electrons',dim:2,values:{fluid_electrons:{closure:'polytropic',Te:'2.75',gamma:1.4},species:[{}]}});
assert.equal(messages.at(-1),'Loaded preset: old-electrons');
assert.equal(app.getState().fluid_electrons.Ke,2.75);
assert.match(c.generateInputFile(app.getState(),2,'CPU'),/Ke=2.75/);
assert.doesNotMatch(c.generateInputFile(app.getState(),2,'CPU'),/\bTe=/);
app.applyPreset({name:'old-evolved-electrons',dim:2,values:{fluid_electrons:{closure:'evolved',Te:'x+n',gamma:1.4},species:[{}]}});
assert.equal(app.getState().fluid_electrons.Te,'x+n');
assert.match(c.generateInputFile(app.getState(),2,'CPU'),/Te="x\+n"/);
console.log('PASS: old saved polytropic Te converts to Ke; evolved Te expressions remain unchanged.');
for (const dimension of [1,2,3]) {
  const {b} = round(`node_conf{ranks=${Array(dimension).fill(1).join(',')}}species{}plasma_injector{transverse_bounds=0.,1.,2.,3.}`);
  assert.deepEqual(plain(b.plasma_injector[0][0].transverse_bounds),[0,1,2,3]);
}
assert.equal(round('species{}diag_species{phase_spaces=""}').b.diag_species[0].phase_spaces,'');
assert.equal(round('fluid_electrons{closure="evolved",Te=1.5}').b.fluid_electrons.Te,'1.5');
console.log('PASS: fixed injector bounds survive 1D/2D/3D imports; empty phases and numeric evolved Te load.');
assert.equal(c.parseSavedPreset({dim:2,values:{species:[{dist:'bimaxwellian',vth:.1,vth_par:.3}]}}).species[0].u_th_parallel,.3);
assert.throws(()=>c.parseInputFile('species{u_drift_profile(3)="1."}'),/all three/);
assert.throws(()=>c.parseInputFile('species{}diag_species{phase_spaces="u1x1:Total"}'),/qualifiers/);
assert.equal(round('node_conf{ranks=1}species{}diag_species{phase_spaces="u1x2"}').b.diag_species[0].phase_spaces,'u1x2');
console.log('PASS: old saved bimaxwellian parallel scale, complete profiles, exact diagnostic phases, and inactive dimensions.');

const sparseSaved = c.parseInputFile('species{}diag_species{phase_spaces(2)="utx1"}');
const sparseReloaded = c.parseSavedPreset({dim:2,values:plain(sparseSaved)});
assert.deepEqual(plain(sparseReloaded.diag_species[0]._indices.phase_spaces),[2]);
