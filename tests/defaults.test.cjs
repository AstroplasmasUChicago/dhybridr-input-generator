'use strict';
const {assert, context: c, plain, app} = require('./capacity.test.cjs');
const vm = require('node:vm');
const schema = vm.runInContext('SCHEMA', c);
const field = (section, key) => schema[section].fields.find(entry => entry.key === key);
const output = () => c.generateInputFile(app.getState(), 2, 'CPU');

// New inputs use editor prefills and write the selected optional defaults.
app.initState();
let state = app.getState();
assert.equal(state.fluid_electrons.closure, 'evolved');
assert.equal(state.time.dt, 0.0025);
assert.equal(state.time.n_steps, 2000);
assert.deepEqual(plain(state.grid_space.n_cells), [128, 128]);
assert.equal(state.loadbalance.every_steps, 35);
const initial = c.parseInputFile(output());
assert.equal(initial.time.dt, 0.0025);
assert.equal(initial.loadbalance.every_steps, 35);
assert.equal(initial.fluid_electrons.closure, 'evolved');
assert.equal(field('time', 'dt').default, undefined);
assert.equal(state.plasma_injector[0][0].ppc, null);
assert.equal(state.plasma_injector[0][0].u_th, null);

// An enabled new forcing block writes both advanced wavenumber bounds explicitly.
state.ext_force._enabled = true;
let generated = output();
assert.match(generated, /k_min=/);
assert.match(generated, /k_max=/);
const forcing = c.parseInputFile(generated).ext_force;
assert.equal(forcing.k_min, state.ext_force.k_min);
assert.equal(forcing.k_max, state.ext_force.k_max);
assert.match(generated, /E_atol=0\./);

// Injector omissions follow later species edits; explicit zero remains a cold override.
const injector = state.plasma_injector[0][0];
injector._enabled = true;
state.species[0].ppc = [3, 5];
state.species[0].u_th = 2;
assert.deepEqual(plain(c.resolveInputValue(field('plasma_injector', 'ppc'), injector, state)), [3, 5, 4]);
assert.equal(c.resolveInputValue(field('plasma_injector', 'u_th'), injector, state), 2);
let parsed = c.parseInputFile(output()).plasma_injector[0][0];
assert.ok(!parsed._present.includes('ppc'));
assert.ok(!parsed._present.includes('u_th'));
state.species[0].u_th = 7;
assert.equal(c.resolveInputValue(field('plasma_injector', 'u_th'), injector, state), 7);
injector.u_th = 0;
assert.equal(c.resolveInputValue(field('plasma_injector', 'u_th'), injector, state), 0);
parsed = c.parseInputFile(output()).plasma_injector[0][0];
assert.equal(parsed.u_th, 0);

// Loading an input preserves omitted required keys and sparse inherited arrays.
app.applyParsedState(c.parseInputFile('species{ppc=3,5,u_th=2}plasma_injector{ppc(2)=6,u_th=0}ext_force{k_min=.2}'));
state = app.getState();
assert.equal(state.time.dt, null);
assert.deepEqual(plain(c.resolveInputValue(field('plasma_injector', 'ppc'), state.plasma_injector[0][0], state)), [3,6,4]);
generated = output();
assert.match(generated, /ppc\(2\)=6/);
assert.doesNotMatch(generated, /\bdt=|k_max=/);
assert.equal(c.parseInputFile(generated).plasma_injector[0][0].u_th, 0);
const before = generated.replace(/^!   Generated:.*$/m, '');
app.applyParsedState(c.parseInputFile(generated));
assert.equal(output().replace(/^!   Generated:.*$/m, ''), before);

// Sparse min/max arrays retain the solver defaults in all omitted positions.
app.applyParsedState(c.parseInputFile('species{initial_bounds(3)=4}raw_diag{bounds(2)=3}'));
state = app.getState();
assert.deepEqual(plain(state.species[0].initial_bounds), [-1,4,-1,-1]);
assert.deepEqual(plain(state.raw_diag[0].bounds), [-1,-1,3,-1]);
assert.equal(state.diag_species[0].phase_spaces, '');
assert.match(output(), /initial_bounds\(3\)=4\./);
assert.match(output(), /bounds\(2\)=3\./);
assert.doesNotMatch(output(), /phase_spaces=/);

// Supplied alternate cadences suppress omitted defaults without adding assignments.
app.applyParsedState(c.parseInputFile('time{dt=.1,t_end=2}global_output{dump_dt=.5}ascent{dump_dt=.25}restart{save_every=20}'));
state = app.getState();
assert.equal(state.time.n_steps, -1);
assert.equal(state.global_output.dump_every, -1);
assert.equal(state.ascent.dump_every, -1);
assert.equal(state.restart.save_every_seconds, -1);
assert.doesNotMatch(output(), /^\s*(?:n_steps|dump_every|save_every_seconds)=/m);
app.applyParsedState(c.parseInputFile('time{dt=.1,n_steps=20}global_output{}ascent{}restart{}'));
state = app.getState();
assert.equal(state.time.t_end, -1);
assert.equal(state.global_output.dump_every, field('global_output', 'dump_every').default);
assert.equal(state.ascent.dump_every, field('ascent', 'dump_every').default);
assert.equal(state.restart.save_every_seconds, field('restart', 'save_every_seconds').default);

// Canonical omitted closure is evolved; historical gamma identifies old polytropic input.
const canonical = c.parseInputFile('fluid_electrons{Te="x+n"}');
assert.equal(canonical.fluid_electrons.Te, 'x+n');
assert.ok(!canonical.fluid_electrons._present.includes('closure'));
assert.doesNotMatch(c.generateInputFile(canonical, 2, 'CPU'), /closure=/);
const legacy = c.parseInputFile('fluid_electrons{Te="2.",gamma=1.4}');
assert.equal(legacy.fluid_electrons.Ke, 2);
assert.equal(legacy.fluid_electrons.closure, 'polytropic');
console.log('PASS: editor defaults, required prefills, explicit advanced export, injector inheritance/zero, and import omission equivalence.');
