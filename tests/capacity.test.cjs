'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const messages = [], panel = { hidden: true, classList: { toggle() {} } };
const context = vm.createContext({ document: { addEventListener() {}, getElementById() { return panel; } }, messages });
for (const file of ['input_names.js', 'schema.js', 'generator.js', 'parser.js']) vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, {filename: file});
const plain = value => JSON.parse(JSON.stringify(value));
const parse = (section, body) => context.parseInputFile(`${section === 'raw_diag' ? 'species {} ' : ''}${section} { ${body} }`);
const data = (parsed, section) => section === 'ext_emf' ? parsed[section] : parsed[section][0];
const hundred = Array.from({length: 100}, (_, i) => i === 99 ? 0 : i + 1);
for (const section of ['ext_emf', 'species', 'raw_diag']) {
  for (const values of [[0], [2,0,0], hundred]) {
    const parsed = parse(section, `constants(1:${values.length})=${values.join(',')},`);
    assert.deepEqual(plain(data(parsed, section).constants), values);
    const output = context.generateInputFile(parsed, 2, 'CPU');
    assert.deepEqual(plain(data(context.parseInputFile(output), section).constants), values);
    assert.doesNotMatch(output, /n_constants|\bct\(/);
  }
  const legacy = parse(section, 'n_constants=2, ct=2.,0.,9.,');
  assert.deepEqual(plain(data(legacy, section).constants), [2,0]);
  assert.match(legacy._report.at(-1).message, /discarded 1 inactive/);
  assert.equal(data(parse(section, 'n_constants=0, ct=9.,'), section).constants, undefined);
}
for (const assignment of ['constants=2.,2*0.,','constants(1)=2.,0.,0.,','constants(2:3)=2*0.,constants(1)=2.,','CONSTANTS ( 1 : 3 )=2d0,0.0D-2,-0.,','constants=2.\n0.\n0.,','constants\n=2.,0.,0.,','constants(1\n:3)=2.,0.,0.,','constants=2.,\n0.\n,0.,','constants=2.\n! ignored\n0.,\n0.,']) assert.deepEqual(plain(parse('species', assignment).species[0].constants), [2,0,0]);
for (const assignment of ['constants(2)=1.','constants(1)=1.,constants(3)=3.','constants(1:2)=1.','constants(1)=1.,constants(1)=2.','constants=1,,2','constants=1,\n,2','constants=NaN','constants=Infinity','constants=1e999','constants=0*1.','constants(0)=1.','constants(-1)=1.','constants(1:3:2)=1.,2.','n_constants=3, ct=1.,2.','n_constants=-1']) assert.throws(() => parse('species', assignment), /constants/);
const fields = parse('species', `name='n_constants=7! { } it''s text', num_par(1:2)=3,4, nsp="if(ct(1)!=0,1.,0.)", vsp="ct(1)","0.","0.", follow=.true., ct=2d-1, mass_to_charge_ratio=2d0`);
assert.equal(fields.species[0].name, "n_constants=7! { } it's text");
assert.deepEqual(plain(fields.species[0].ppc), [3,4]);
assert.deepEqual(plain(fields.species[0].u_drift_profile), ['constants(1)','0.','0.']);
assert.equal(fields.species[0].number_density, 'if(constants(1)!=0,1.,0.)');
assert.equal(fields.species[0].follow_particles, true);
const precision = Array.from({length:100}, (_,i) => Math.PI*(i+1));
const output = context.generateInputFile({ext_emf:{constants:precision}},2,'CPU');
assert.ok(output.split('\n').every(line=>line.length<=1024));
assert.deepEqual(plain(context.parseInputFile(output).ext_emf.constants), precision);
const appSource = fs.readFileSync(path.join(repo,'app.js'),'utf8').replace('  // ---- Go ----', `
  buildSections = loadStateToUI = setActiveSection = rebuildSpeciesTabs = autoUpdateTurbK = renderTurbRampPlot = renderTurbForcePlot = () => {};
  toast = message => messages.push(message); updatePreview = () => {};
  globalThis.testApp = { applyPreset, applyParsedState, initState, translateExpr, calcPhaseSpaceSize, resolveAxisSize, getState: () => state, getDim: () => currentDim, getBuild: () => currentBuild };
  // ---- Go ----`);
vm.runInContext(appSource,context,{filename:'app.js'});
const app=context.testApp;
app.initState();
assert.equal(vm.runInContext(app.translateExpr('constants(100) + constants ( 99 )',hundred),context),99);
assert.throws(()=>vm.runInContext(app.translateExpr('constants(101)',hundred),context),/constants is not defined/);
for(const preset of vm.runInContext('PRESETS',context)){
  app.applyPreset(preset);
  assert.equal(messages.at(-1),`Loaded preset: ${preset.name}`);
  const parsed=context.parseInputFile(context.generateInputFile(app.getState(),app.getDim(),app.getBuild()));
  assert.deepEqual(plain(parsed.species[0].constants||[]),preset.name==='2D Alfven Wave'?[0.01,0.04908739]:[]);
}
const species=Array.from({length:103},(_,i)=>({name:`ion${i+1}`,ct:[i,0]}));
app.applyPreset({name:'103 species',dim:2,values:{particles:{num_species:103},species}});
assert.equal(messages.at(-1),'Loaded preset: 103 species');
const restored=context.parseInputFile(context.generateInputFile(app.getState(),2,'CPU'));
assert.equal(restored.particles.n_species,103);
assert.equal(restored.species.length,103);
assert.equal(restored.species[102].name,'ion103');
assert.deepEqual(plain(restored.species[102].constants),[102,0]);
console.log('PASS: constants, old active counts, high-index previews, built-in presets, and 103 species.');
module.exports={assert,context,plain,parse,app,messages,panel};
