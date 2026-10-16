'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const messages = [];
const context = vm.createContext({ document: { addEventListener() {} }, messages });
for (const file of ['schema.js', 'generator.js', 'parser.js']) {
  vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, { filename: file });
}
const plain = value => JSON.parse(JSON.stringify(value));
const parse = (section, body) => context.parseInputFile(`${section}\n{\n${body}\n}`);
const data = (parsed, section) => section === 'ext_emf' ? parsed[section] : parsed[section][0];
const hundred = Array.from({ length: 100 }, (_, i) => i === 99 ? 0 : i + 1);
for (const section of ['ext_emf', 'species', 'raw_diag']) {
  for (const values of [[0], [2, 0, 0], hundred]) {
    const parsed = parse(section, `ct(1:${values.length})=${values.join(',')},`);
    assert.deepEqual(plain(data(parsed, section).ct), values);
    const output = context.generateInputFile(parsed, 2, 'CPU');
    const restored = context.parseInputFile(output);
    assert.deepEqual(plain(data(restored, section).ct), values);
    assert.doesNotMatch(output, /n_constants/);
  }
  const empty = parse(section, '! no constants');
  assert.equal(data(empty, section).ct, undefined);
  assert.doesNotMatch(context.generateInputFile(empty, 2, 'CPU'), /\bct\s*\(/);
  for (const count of [0, 2]) {
    assert.throws(() => parse(section, `N_CONSTANTS=${count}, ct=0,0,`), /n_constants was removed/);
  }
}
for (const assignment of [
  'ct=2.,2*0.,',
  'ct(1)=2.,0.,0.,',
  'ct(2:3)=2*0., ct(1)=2.,',
  'CT ( 1 : 3 )=2d0,0.0D-2,-0.,',
  'ct=2.\n0.\n0.,',
  'ct\n=2.,0.,0.,',
  'ct(1\n:3)=2.,0.,0.,',
  'ct=2.,\n0.\n,0.,',
  'ct=2.\n! comment between values\n0.,\n0.,',
]) {
  assert.deepEqual(plain(parse('species', assignment).species[0].ct), [2, 0, 0]);
}
for (const assignment of [
  'ct(2)=1.', 'ct(1)=1.,ct(3)=3.', 'ct(1:2)=1.',
  'ct(1)=1.,ct(1)=2.', 'ct=1,,2', 'ct=1,\n,2', 'ct=NaN', 'ct=Infinity',
  'ct=1e999', 'ct=0*1.', 'ct(0)=1.', 'ct(-1)=1.', 'ct(1:3:2)=1.,2.',
]) assert.throws(() => parse('species', assignment), /ct/);
assert.equal(parse('ext_emf', 'Bx="if(ct(1)==0,1.,0.)", ct=0,').ext_emf.Bx, 'if(ct(1)==0,1.,0.)');
const inequality = parse('ext_emf', 'Bx="if(ct(1)!=0,1.,0.)", ct=2., ! n_constants=99');
assert.equal(inequality.ext_emf.Bx, 'if(ct(1)!=0,1.,0.)');
assert.deepEqual(plain(inequality.ext_emf.ct), [2]);
const fields = parse('species', `
  name="n_constants=7! is text", num_par(1:2)=3,4,
  nsp="if(ct(1)!=0,1.,0.)", vsp="ct(1)","0.","0.",
  follow=.true., ct=2d-1, ! ct(2)=9., n_constants=2
  mass_to_charge_ratio=2d0,
`);
assert.equal(fields.species[0].name, 'n_constants=7! is text');
assert.deepEqual(plain(fields.species[0].num_par), [3, 4]);
assert.deepEqual(plain(fields.species[0].vsp), ['ct(1)', '0.', '0.']);
assert.equal(fields.species[0].follow, true);
assert.equal(fields.species[0].mass_to_charge_ratio, 2);
assert.deepEqual(plain(fields.species[0].ct), [0.2]);
const precision = Array.from({ length: 100 }, (_, i) => Math.PI * (i + 1));
assert.ok(precision.join(',').length > 1024);
const longOutput = context.generateInputFile({ ext_emf: { ct: precision } }, 2, 'CPU');
assert.ok(longOutput.split('\n').every(line => line.length <= 1024));
assert.deepEqual(plain(context.parseInputFile(longOutput).ext_emf.ct), precision);
console.log('PASS: constants round-trip without truncation, including zeros, repeats, indexed lists, and 100 entries; invalid lists and removed counts fail.');

// Exercise preset state transitions and expression evaluation without drawing plots.
const appSource = fs.readFileSync(path.join(repo, 'app.js'), 'utf8').replace('  // ---- Go ----', `
  buildSections = loadStateToUI = setActiveSection = rebuildSpeciesTabs = autoUpdateTurbK = renderTurbRampPlot = renderTurbForcePlot = () => {};
  toast = message => messages.push(message);
  updatePreview = () => {};
  globalThis.testApp = { applyPreset, initState, translateExpr, getState: () => state, getDim: () => currentDim, getBuild: () => currentBuild };
  // ---- Go ----`);
vm.runInContext(appSource, context, { filename: 'app.js' });
const app = context.testApp;
app.initState();
const baseline = JSON.stringify(app.getState());
assert.deepEqual(plain(app.getState().ext_emf.ct), []);
for (const key of ['ext_emf', 'species', 'raw_diag']) {
  for (const count of [0, 2]) {
    const old = { n_constants: count, ct: [2, 0, ...Array(14).fill(0)] };
    const values = { [key]: key === 'ext_emf' ? old : [{}, old] };
    app.applyPreset({ name: 'old count', dim: 3, build: 'GPU', values });
    assert.equal(JSON.stringify(app.getState()), baseline);
    assert.equal(app.getDim(), 2);
    assert.equal(app.getBuild(), 'CPU');
    assert.match(messages.at(-1), /n_constants was removed/);
  }
}
const constants = Array.from({ length: 100 }, (_, i) => i + 1);
assert.equal(vm.runInContext(app.translateExpr('ct(100) + ct ( 99 )', constants), context), 199);
assert.equal(vm.runInContext(app.translateExpr('ct(100)', hundred), context), 0);
assert.equal(vm.runInContext(app.translateExpr('ct(3)', ['3*2d-1']), context), 0.2);
assert.throws(() => vm.runInContext(app.translateExpr('ct(101)', constants), context), /ct is not defined/);
console.log('PASS: old saved counts fail before state changes; high-index and zero constants evaluate correctly in previews.');

for (const preset of vm.runInContext('PRESETS', context)) {
  app.applyPreset(preset);
  assert.equal(messages.at(-1), `Loaded preset: ${preset.name}`);
  const output = context.generateInputFile(app.getState(), app.getDim(), app.getBuild());
  assert.doesNotMatch(output, /n_constants/);
  const parsed = context.parseInputFile(output);
  const expected = preset.name === '2D Alfven Wave' ? [0.01, 0.04908739] : [];
  assert.deepEqual(plain(parsed.species[0].ct || []), expected);
}
const species = Array.from({ length: 103 }, (_, i) => ({ name: `ion${i + 1}`, ct: [i, 0] }));
app.applyPreset({ name: '103 species', dim: 2, values: { particles: { num_species: 103 }, species } });
const output = context.generateInputFile(app.getState(), 2, 'CPU');
const restored = context.parseInputFile(output);
assert.equal(restored.particles.num_species, 103);
assert.equal(restored.species.length, 103);
assert.equal(restored.species[102].name, 'ion103');
assert.deepEqual(plain(restored.species[102].ct), [102, 0]);
console.log('PASS: all built-in presets load with their active constants; 103 species export and reimport without loss.');
