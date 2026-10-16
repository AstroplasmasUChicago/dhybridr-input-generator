'use strict';
const {assert, context, plain, app, messages} = require('./capacity.test.cjs');
const vm = require('node:vm');
const presets = vm.runInContext('PRESETS', context);
const near = (actual, expected, tolerance = 1e-12) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const expression = (text, constants) => new Function('x1', 'x2', 'x3',
  `return ${app.translateExpr(text, constants)};`);
for (const preset of presets) {
  app.applyPreset(preset);
  assert.equal(messages.at(-1), `Loaded preset: ${preset.name}`);
  for (const build of ['CPU', 'GPU']) {
    const output = context.generateInputFile(app.getState(), app.getDim(), build);
    const parsed = context.parseInputFile(output);
    assert.equal(parsed._report.filter(item => item.kind !== 'notice').length, 0);
    const species = parsed.species[0];
    if (preset.name.endsWith('Shock')) {
      // The conducting field wall requires polytropic electrons.
      assert.equal(parsed.fluid_electrons.closure, 'polytropic');
      assert.equal(parsed.fluid_electrons.Ke, 1);
      assert.equal(parsed.fluid_electrons.Te, undefined);
      assert.equal(parsed.grid_space.boundary_types[0], 'reflect');
      // Initial particles and particles injected at the open boundary have the same drift.
      const injector = parsed.plasma_injector[0][0];
      assert.deepEqual(plain(species.u_drift), plain(injector.u_drift), preset.name);
      assert.deepEqual(plain(species.u_drift), [-30, 0, 0]);
      assert.equal(injector.plane_position, parsed.grid_space.box_size[0]);
      assert.equal(species.u_th, injector.u_th);
    }
    if (preset.name !== '2D Alfven Wave') continue;
    const field = parsed.ext_emf;
    const length = parsed.grid_space.box_size[0];
    const k = 2 * Math.PI / length;
    const phaseSpeed = (Math.sqrt(k * k + 4) - k) / 2;
    const background = ['Bx', 'By', 'Bz'].map(key => expression(field[key], field.constants));
    assert.ok(field.By_init && field.Bz_init, 'The wave requires initialized transverse magnetic fields');
    const by = expression(field.By_init, field.constants);
    const bz = expression(field.Bz_init, field.constants);
    const velocity = species.u_drift_profile.map(text => expression(text, species.constants));
    const amplitude = by(0, 0, 0);
    assert.ok(amplitude > 0 && amplitude < 0.1, 'The wave must have small nonzero amplitude');
    assert.ok(parsed.grid_space.boundary_types.every(type => type === 'per'));
    // One circularly polarized wavelength fits the box; the imposed transverse field stays zero.
    for (let i = 0; i <= 32; i++) {
      const x = length * i / 32;
      near(background[0](x, 0, 0), 1);
      near(background[1](x, 0, 0), 0);
      near(background[2](x, 0, 0), 0);
      const magnetic = [by(x, 0, 0), bz(x, 0, 0)];
      near(magnetic[0], amplitude * Math.cos(k * x));
      near(magnetic[1], amplitude * Math.sin(k * x));
      near(Math.hypot(...magnetic), amplitude);
      const u = velocity.map(evaluate => evaluate(x, 0, 0));
      near(u[0], 0);
      const gamma = Math.sqrt(1 + u.reduce((sum, value) => sum + value * value, 0) / parsed.time.c ** 2);
      // The sigma=-1 Hall mode satisfies v_perp = -B_perp/vphi, within the u≈v approximation.
      for (let axis = 0; axis < 2; axis++) near(u[axis + 1] / gamma + magnetic[axis] / phaseSpeed, 0, amplitude * 1e-8);
    }
  }
}
console.log('PASS: preset load/export, shock drift continuity, and periodic Alfven initialization.');
