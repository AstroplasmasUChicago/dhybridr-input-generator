'use strict';
// Run with PUPPETEER_MODULE pointing to an installed Puppeteer package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dhybridr-generator-'));
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.setViewport({width: 1400, height: 950});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#preview-text');
    const preview = () => page.$eval('#preview-text', element => element.textContent);
    assert.equal(await page.$eval('#preview-comments', element => element.checked), true);
    assert.equal(await page.$('[data-section="boundary_conditions"][data-key="vsh"], [data-section="boundary_conditions"][data-key="compress_ratio"]'), null);
    assert.doesNotMatch(await preview(), /\bvsh\b|\bcompress_ratio\b/);
    async function load(name, text, success = true) {
      const file = path.join(directory, name);
      fs.writeFileSync(file, text);
      await (await page.$('#file-input')).uploadFile(file);
      await page.waitForFunction((name, success) => document.querySelector('#load-report').textContent.includes(`${success ? 'Loaded' : 'Could not load'} ${name}`), {}, name, success);
    }
    async function changeBuild(build) {
      await page.click('#build-select .cs-button');
      await page.click(`#build-select .cs-option:nth-child(${build === 'CPU' ? 1 : 2})`);
    }
    async function edit(selector, value) {
      await page.$eval(selector, (element, value) => {
        element.value = String(value);
        element.dispatchEvent(new Event('input', {bubbles: true}));
      }, value);
    }
    async function distribution(value) {
      await page.$eval('select[data-section="species"][data-key="distribution"]', (element, value) => {
        element.value = value;
        element.dispatchEvent(new Event('change', {bubbles:true}));
      }, value);
    }
    // Power-law controls appear only for POWERLAW and retain edits across switches.
    await page.click('#nav-list [data-section="species"]');
    for (const key of ['pl_slope','pl_min_factor','pl_max_factor']) {
      assert.equal(await page.$(`[data-section="species"][data-key="${key}"]`), null);
    }
    assert.doesNotMatch(await preview(), /\bpl_(?:slope|min_factor|max_factor)=/);
    await distribution('POWERLAW');
    for (const [key,value] of [['pl_slope',-3.5],['pl_min_factor',2],['pl_max_factor',20]]) {
      await edit(`[data-section="species"][data-key="${key}"]`, value);
    }
    assert.match(await preview(), /pl_slope=-3.5/);
    assert.match(await preview(), /pl_min_factor=2\./);
    assert.match(await preview(), /pl_max_factor=20\./);
    await distribution('THERMAL');
    assert.equal(await page.$('[data-section="species"][data-key="pl_slope"]'), null);
    assert.doesNotMatch(await preview(), /\bpl_(?:slope|min_factor|max_factor)=/);
    await distribution('POWERLAW');
    for (const [key,value] of [['pl_slope',-3.5],['pl_min_factor',2],['pl_max_factor',20]]) {
      assert.equal(await page.$eval(`[data-section="species"][data-key="${key}"]`, el => Number(el.value)), value);
    }
    await distribution('THERMAL');
    // First and added injectors inherit current species values until explicitly overridden.
    await page.click('#nav-list [data-section="plasma_injector"]');
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    const inheritedScale = '[data-section="plasma_injector"][data-key="u_th"][data-inherit]';
    const scaleOverride = '[data-section="plasma_injector"][data-key="u_th"]:not([data-inherit])';
    const ppcOverride = '[data-section="plasma_injector"][data-key="ppc"][data-index="0"]';
    assert.equal(await page.$eval(inheritedScale, el => el.checked), true);
    assert.equal(await page.$eval(scaleOverride, el => el.disabled), true);
    assert.equal(await page.$eval(ppcOverride, el => el.disabled), true);
    await page.click('#nav-list [data-section="species"]');
    await edit('[data-section="species"][data-key="u_th"]', 2);
    await edit('[data-section="species"][data-key="ppc"][data-index="0"]', 6);
    await page.click('#nav-list [data-section="plasma_injector"]');
    assert.equal(await page.$eval(scaleOverride, el => Number(el.value)), 2);
    assert.equal(await page.$eval(ppcOverride, el => Number(el.value)), 6);
    await page.click('.injector-tabs[data-section="plasma_injector"] .add');
    assert.equal(await page.$eval(inheritedScale, el => el.checked), true);
    assert.equal(await page.$eval(scaleOverride, el => el.disabled), true);
    assert.equal(await page.$eval(scaleOverride, el => Number(el.value)), 2);
    await page.click(inheritedScale);
    await edit(scaleOverride, 0);
    let injectors = await page.evaluate(text => parseInputFile(text).plasma_injector[0], await preview());
    assert.ok(!injectors[0]._present.includes('u_th'));
    assert.ok(!injectors[0]._present.includes('ppc'));
    assert.equal(injectors[1].u_th, 0);
    await page.click('#nav-list [data-section="species"]');
    await edit('[data-section="species"][data-key="u_th"]', 3);
    await page.click('#nav-list [data-section="plasma_injector"]');
    assert.equal(await page.$eval(scaleOverride, el => Number(el.value)), 0);
    await page.click(inheritedScale);
    assert.equal(await page.$eval(scaleOverride, el => Number(el.value)), 3);
    assert.equal(await page.$eval(scaleOverride, el => el.disabled), true);
    // Adding a dimension uses required editor prefills for each new array entry.
    await changeDimension(3);
    assert.match(await preview(), /ranks\(1:3\)=1,1,1/);
    assert.match(await preview(), /n_cells\(1:3\)=128,128,128/);
    assert.match(await preview(), /box_size\(1:3\)=64.,64.,64./);
    await changeDimension(2);
    const optimizerTarget = () => page.$eval('#node-optimizer-target', element => Number(element.value));
    const optimizerCurrent = () => page.$eval('#node-optimizer-current', element => element.textContent);
    async function setOptimizerSlider(exponent) {
      await edit('#node-optimizer-slider', exponent);
    }
    // Typed targets and the slider stay synchronized; builds keep separate exact targets.
    await page.click('#nav-list [data-section="node_conf"]');
    assert.equal(await optimizerTarget(), 1e7);
    assert.equal(await page.$eval('#node-optimizer-target', el => el.type), 'text');
    assert.equal(await page.$eval('#node-optimizer-target', el => el.value), '1e+7');
    await setOptimizerSlider(5);
    assert.equal(await page.$eval('#node-optimizer-target', el => el.value), '1e+5');
    assert.equal(await optimizerTarget(), 1e5);
    await page.click('#node-optimizer-target');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#node-optimizer-target', '1.2345e');
    assert.equal(await page.$eval('#node-optimizer-target', el => el.value), '1.2345e');
    assert.equal(await page.$eval('#node-optimizer-target', el => el.validity.valid), false);
    await page.type('#node-optimizer-target', '4');
    assert.equal(await optimizerTarget(), 12345);
    await page.click('.node-optimizer-header');
    assert.equal(await page.$eval('#node-optimizer-target', el => el.value), '1.2345e+4');
    assert.ok(Math.abs(await page.$eval('#node-optimizer-slider', el => Number(el.value)) - Math.log10(12345)) < 1e-12);
    await changeDimension(3);
    await changeDimension(2);
    assert.equal(await optimizerTarget(), 12345);
    await changeBuild('GPU');
    assert.equal(await optimizerTarget(), 1e8);
    assert.match(await preview(), /gpu_memory_fraction=0.75/);
    assert.doesNotMatch(await preview(), /buffer_headroom=/);
    await edit('#node-optimizer-target', 7654321);
    await changeBuild('CPU');
    assert.equal(await optimizerTarget(), 12345);
    assert.match(await preview(), /buffer_headroom=0.2/);
    assert.doesNotMatch(await preview(), /gpu_memory_fraction=/);
    await changeBuild('GPU');
    assert.equal(await optimizerTarget(), 7654321);
    await changeBuild('CPU');
    // Exact targets outside the original slider range expand its bounds.
    for (const target of [99, 1e10]) {
      await edit('#node-optimizer-target', target);
      assert.equal(await optimizerTarget(), target);
      const slider = await page.$eval('#node-optimizer-slider', el => ({min: Number(el.min), max: Number(el.max), value: Number(el.value)}));
      assert.ok(slider.min <= Math.log10(target) && slider.max >= Math.log10(target));
      assert.ok(Math.abs(slider.value - Math.log10(target)) < 1e-12);
    }
    await edit('#node-optimizer-target', 12345);
    // Invalid targets remove Apply actions without replacing the saved valid target.
    for (const invalid of ['', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await edit('#node-optimizer-target', invalid);
      assert.match(await page.$eval('#node-optimizer-results', el => el.textContent), /positive whole number/);
      assert.equal(await page.$$eval('.node-opt-apply:not(:disabled)', els => els.length), 0);
      assert.equal(await page.$eval('#node-optimizer-target', el => el.validity.valid), false);
    }
    await changeBuild('GPU');
    await changeBuild('CPU');
    assert.equal(await optimizerTarget(), 12345);
    // Current ranks and recommendations report the distance from the target.
    await load('optimizer.input', 'node_conf{ranks=1,1}grid_space{n_cells=64,64}species{ppc=4,4}');
    await page.click('#nav-list [data-section="node_conf"]');
    // Targets larger than the input display the minimum of one MPI rank.
    await edit('#node-optimizer-target', '1e7');
    assert.match(await page.$eval('#node-optimizer-results', el => el.textContent), /Estimated MPI ranks: 1 \(minimum\)/);
    await edit('#node-optimizer-target', '65536');
    assert.match(await page.$eval('#node-optimizer-results', el => el.textContent), /Estimated MPI ranks: 1\.0/);
    await setOptimizerSlider(4);
    assert.equal(await optimizerTarget(), 1e4);
    assert.match(await optimizerCurrent(), /1 MPI rank,.*65,536 particles\/rank \(555\.36% above target\)/);
    assert.match(await page.$eval('#node-optimizer-results thead', el => el.textContent), /vs target/);
    const recommended = '#node-optimizer-results .node-opt-recommended';
    assert.equal(await page.$$eval(recommended, elements => elements.length), 1);
    assert.equal(await page.$eval(`${recommended} td`, element => Number(element.textContent)), 7);
    assert.equal(await page.$eval(`${recommended} td:nth-child(5)`, el => el.textContent), '-6.38%');
    assert.equal(await page.$eval(`${recommended} td:nth-child(5)`, el => el.title), '6.38% below target');
    await page.click(`${recommended} .node-opt-apply`);
    const axes = await page.$$eval('input[data-section="node_conf"][data-key="ranks"]', elements => elements.filter(element => Number(element.dataset.index) < 2).map(element => Number(element.value)));
    assert.equal(axes.reduce((a, b) => a * b, 1), 7);
    assert.match(await optimizerCurrent(), /7 MPI ranks.*9,362\.29 particles\/rank.*6\.38% below target/);
    for (const index of [0, 1]) await edit(`[data-section="node_conf"][data-key="ranks"][data-index="${index}"]`, 2);
    assert.match(await optimizerCurrent(), /4 MPI ranks.*16,384 particles\/rank.*63\.84% above target/);
    await edit('#node-optimizer-target', 16384);
    assert.match(await optimizerCurrent(), /matches target/);
    // Grid and species edits refresh the current-input comparison.
    await page.click('#nav-list [data-section="grid_space"]');
    await edit('[data-section="grid_space"][data-key="n_cells"][data-index="0"]', 32);
    await page.click('#nav-list [data-section="node_conf"]');
    assert.match(await optimizerCurrent(), /8,192 particles\/rank.*50\.00% below target/);
    await page.click('#nav-list [data-section="species"]');
    await edit('[data-section="species"][data-key="ppc"][data-index="0"]', 8);
    await page.click('#nav-list [data-section="node_conf"]');
    assert.match(await optimizerCurrent(), /16,384 particles\/rank.*matches target/);
    await setOptimizerSlider(4);
    // Older thermal inputs may carry ignored power-law settings; retain their values.
    await load('old-thermal-powerlaw.input', 'species{distribution="thermal",u_th=1,pl_slope=-3,pl_min_factor=2,pl_max_factor=50}');
    await page.click('#nav-list [data-section="species"]');
    assert.equal(await page.$('[data-section="species"][data-key="pl_slope"]'), null);
    assert.doesNotMatch(await preview(), /\bpl_(?:slope|min_factor|max_factor)=/);
    await distribution('POWERLAW');
    assert.equal(await page.$eval('[data-section="species"][data-key="pl_slope"]', el => Number(el.value)), -3);
    assert.equal(await page.$eval('[data-section="species"][data-key="pl_max_factor"]', el => Number(el.value)), 50);
    assert.match(await preview(), /pl_slope=-3\./);
    await load('old.input', 'node_conf{node_number=1,1}particles{num_species=2}species{name="one",dist="iso",vth=0,ct=2,0,n_constants=2}plasma_injector{plane="yz"}species{name="two"}raw_diag{selectrule="vx>0"}');
    let output = await preview();
    assert.match(output, /u_shell=0/);
    assert.doesNotMatch(output, /\bvth=|n_constants|u_th=/);
    await page.click('#nav-list [data-section="species"]');
    assert.ok(await page.$('[data-section="species"][data-key="u_shell"]'));
    assert.equal(await page.$('[data-section="species"][data-key="u_th"]'), null);
    assert.equal(await page.$eval('select[data-section="species"][data-key="distribution"]', element => element.value), 'ISO');
    await load('bad.input', 'species{vboost=0}', false);
    assert.equal(await preview(), output);
    // Rejected boundary inputs leave the previous input unchanged.
    for (const [key, value] of [['vsh', 0], ['compress_ratio', 1]]) {
      await load(`${key}.input`, `species{}boundary_conditions{${key}=${value}}`, false);
      assert.match(await page.$eval('#load-report', element => element.textContent), new RegExp(`${key} was removed`));
      assert.equal(await preview(), output);
    }
    await load('small.input', 'species{name="small"}');
    output = await preview();
    assert.doesNotMatch(output, /plasma_injector|raw_diag|u_th|ppc/);
    await page.click('#nav-list [data-section="particles"]');
    assert.match(await page.$eval('.validation-msg[data-section="particles"]', el => el.textContent), /n_species is required but omitted/);
    await edit('[data-section="particles"][data-key="n_species"]', 1);
    assert.doesNotMatch(await page.$eval('.validation-msg[data-section="particles"]', el => el.textContent), /n_species is required but omitted/);
    await page.click('#nav-list [data-section="species"]');
    // Editing one omitted array entry writes only that entry.
    const ppc = await page.$('input[data-section="species"][data-key="ppc"][data-index="1"]');
    await ppc.evaluate(element => { element.value = '3'; element.dispatchEvent(new Event('input', {bubbles: true})); });
    assert.match(await preview(), /ppc\(2\)=3/);
    assert.doesNotMatch(await preview(), /ppc\(1/);
    // An omitted diagnostic section shows no outputs until deliberately added.
    await page.click('#nav-list [data-section="diag_species"]');
    assert.equal(await page.$$eval('[data-section="diag_species"][data-phase]:checked', els => els.length), 0);
    await edit('[data-section="diag_species"][data-key="x_bins"][data-index="0"]', 8);
    assert.ok(await page.$$eval('[data-section="diag_species"][data-phase]:checked', els => els.length) > 0);
    assert.doesNotMatch(await preview(), /phase_spaces=/);
    // Enabling an omitted injector creates an editable injector.
    await page.click('#nav-list [data-section="plasma_injector"]');
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    assert.match(await preview(), /plasma_injector/);
    // Enabling an omitted optional forcing section writes its required advanced fields.
    await page.click('#nav-list [data-section="ext_force"]');
    await page.click('[data-section="ext_force"][data-key="_enabled"]');
    assert.match(await preview(), /k_min=/);
    assert.match(await preview(), /k_max=/);
    assert.doesNotMatch(await preview(), /\bdt=/);
    // Partial imported injector ppc uses parent values for unsupplied components.
    await load('inherit.input', 'node_conf{ranks=1,1}grid_space{n_cells=8,8,box_size=4,4}species{ppc=3,5,u_th=2}plasma_injector{plane="xz",plane_position=1,transverse_bounds=0,4,u_drift=0,1,0,ppc(2)=6}');
    await page.click('#nav-list [data-section="plasma_injector"]');
    assert.equal(await page.$eval(ppcOverride, el => Number(el.value)), 3);
    assert.equal(await page.$eval('[data-section="plasma_injector"][data-key="ppc"][data-index="1"]', el => Number(el.value)), 6);
    assert.match(await preview(), /ppc\(2\)=6/);
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    assert.match(await preview(), /plane="xz"/);
    assert.match(await preview(), /plane_position=1\./);
    // A dimension change fills omitted injector ppc entries from its species.
    await changeDimension(3);
    injectors = await page.evaluate(text => parseInputFile(text).plasma_injector[0], await preview());
    assert.deepEqual(injectors[0].ppc, [3,6,4]);
    await changeDimension(2);
    await load('second-inherit.input', 'node_conf{ranks=1,1}particles{n_species=2}species{ppc=1,2}species{ppc=7,8}plasma_injector{ppc(2)=6}');
    await changeDimension(3);
    injectors = await page.evaluate(text => parseInputFile(text).plasma_injector[1], await preview());
    assert.deepEqual(injectors[0].ppc, [7,6,4]);
    // Time-based imports display disabled omitted step cadences and no false conflicts.
    await load('time-cadence.input', 'time{dt=.1,t_end=2}global_output{dump_dt=.5}ascent{dump_dt=.25}restart{save_every=20}species{}');
    await page.click('#nav-list [data-section="time"]');
    assert.doesNotMatch(await page.$eval('.validation-msg[data-section="time"]', el => el.textContent), /Both n_steps and t_end are set/);
    assert.equal(await page.$eval('[data-section="global_output"][data-key="dump_every"]', el => Number(el.value)), -1);
    assert.equal(await page.$eval('[data-section="restart"][data-key="save_every_seconds"]', el => Number(el.value)), -1);
    assert.doesNotMatch(await preview(), /^\s*(?:n_steps|dump_every|save_every_seconds)=/m);
    await load('three.input', 'node_conf{ranks=1,1,1}grid_space{n_cells=8,8,8}species{ppc=2,2,2,initial_bounds=0,1,2,3,4,5}');
    async function changeDimension(dimension) {
      await page.click('#dim-select .cs-button');
      await page.click(`#dim-select .cs-option:nth-child(${dimension})`);
    }
    await changeDimension(2);
    output = await preview();
    assert.match(output, /ranks\(1:2\)=1,1/);
    assert.doesNotMatch(output, /ranks\(3\)|n_cells\(3\)|ppc\(3\)/);
    assert.match(output, /initial_bounds\(1:4\)=0.,1.,3.,4./);
    await changeDimension(3);
    assert.match(await preview(), /ranks\(1:3\)=1,1,1/);
    assert.equal(await optimizerTarget(), 1e4);
    await load('sparse.input', 'node_conf{ranks=1,1}species{ppc(2)=3,initial_bounds(3)=4}');
    await changeDimension(3);
    output = await preview();
    assert.match(output, /ppc\(1:3\)=4,3,4/);
    assert.match(output, /initial_bounds\(1:6\)=-1.,-1.,-1.,4.,-1.,-1./);
    // |u| bins use the truncated average; omitted components each use 512.
    await load('bins.input', 'node_conf{ranks=1,1}grid_space{n_cells=8,8}species{}diag_species{phase_spaces="utx1",x_bins=8,8,u_bins=2,2,4}');
    await page.click('#nav-list [data-section="diag_species"]');
    assert.match(await page.$eval('.diag-size-panel', element => element.textContent), /2 × 8/);
    const binInput = '[data-section="diag_species"][data-key="u_bins"][data-index="0"]';
    for (const value of [0, -1, 2]) {
      await page.$eval(binInput, (element, value) => { element.value = String(value); element.dispatchEvent(new Event('input', {bubbles: true})); }, value);
      assert.equal(await page.$eval('#btn-generate', element => element.disabled), value < 1);
      if (value < 1) assert.match(await preview(), /u_bins must be at least 1/);
    }
    await load('partial-bins.input', 'node_conf{ranks=1,1}grid_space{n_cells=8,8}species{}diag_species{phase_spaces="utx1",x_bins=8,8,u_bins(2)=2}');
    await page.click('#nav-list [data-section="diag_species"]');
    assert.match(await page.$eval('.diag-size-panel', element => element.textContent), /342 × 8/);
    assert.match(await preview(), /u_bins\(2\)=2/);
    await load('electrons.input', 'fluid_electrons{closure="polytropic",Ke=2,gamma_e=1.4}species{}');
    await page.click('#nav-list [data-section="fluid_electrons"]');
    async function closure(value) {
      await page.$eval('select[data-section="fluid_electrons"][data-key="closure"]', (element, value) => { element.value = value; element.dispatchEvent(new Event('change', {bubbles: true})); }, value);
    }
    await closure('evolved');
    assert.match(await preview(), /Te="1."/);
    assert.doesNotMatch(await preview(), /Ke=/);
    await closure('polytropic');
    assert.match(await preview(), /Ke=2./);
    assert.doesNotMatch(await preview(), /Te=/);
    await load('electron-dumps.input', 'fluid_electrons{closure="evolved"}field_diag{dmp_pefld=.true.}species{}');
    await page.click('#nav-list [data-section="field_diag"]');
    assert.match(await page.$eval('#load-report', element => element.textContent), /dmp_pefld -> dump_Pe, dump_Te/);
    const peToggle = '[data-section="field_diag"][data-key="dump_Pe"]';
    const teToggle = '[data-section="field_diag"][data-key="dump_Te"]';
    assert.equal(await page.$eval(peToggle, element => element.checked), true);
    assert.equal(await page.$eval(teToggle, element => element.checked), true);
    await page.click(peToggle);
    output = await preview();
    assert.match(output, /dump_Pe=.false./);
    assert.match(output, /dump_Te=.true./);
    await page.click(teToggle);
    assert.match(await preview(), /dump_Te=.false./);
    // Inactive loop and forcing imports retain values while their controls and assignments are hidden.
    await load('inactive-fields.input', 'node_conf{ranks=1,1}ext_emf{add_loop=.false.,loop_radius=2,loop_center=3,4,loop_current=5}ext_force{drive_type="",k_min=.25,k_max=.75,mode_amp=2,omega=3,t_decay=4,t_drive_end=5,B_noise_rms=0}species{}');
    const loopKeys = ['loop_radius','loop_center','loop_current'];
    const forcingValues = {k_min:.25,k_max:.75,mode_amp:2,omega:3,t_decay:4,t_drive_end:5,B_noise_rms:0};
    const sectionPreview = async section => page.evaluate((text,section) => parseInputFile(text)[section], await preview(), section);
    await page.click('#nav-list [data-section="ext_emf"]');
    for (const key of loopKeys) assert.equal(await page.$(`[data-section="ext_emf"][data-key="${key}"]`), null);
    assert.doesNotMatch(await preview(), /\bloop_(?:radius|center|current)(?:\(|=)/);
    const loopToggle = '[data-section="ext_emf"][data-key="add_loop"]';
    await page.click(loopToggle);
    for (const key of loopKeys) await page.waitForSelector(`[data-section="ext_emf"][data-key="${key}"]`, {visible:true});
    assert.equal(await page.$eval('[data-section="ext_emf"][data-key="loop_radius"]', el => Number(el.value)), 2);
    assert.deepEqual((await sectionPreview('ext_emf')).loop_center, [3,4]);
    assert.equal((await sectionPreview('ext_emf')).loop_current, 5);
    await edit('[data-section="ext_emf"][data-key="loop_radius"]', 6);
    await edit('[data-section="ext_emf"][data-key="loop_center"][data-index="0"]', 7);
    await edit('[data-section="ext_emf"][data-key="loop_center"][data-index="1"]', 8);
    await edit('[data-section="ext_emf"][data-key="loop_current"]', 9);
    await page.click(loopToggle);
    for (const key of loopKeys) assert.equal(await page.$(`[data-section="ext_emf"][data-key="${key}"]`), null);
    assert.doesNotMatch(await preview(), /\bloop_(?:radius|center|current)(?:\(|=)/);
    await page.click(loopToggle);
    assert.equal(await page.$eval('[data-section="ext_emf"][data-key="loop_radius"]', el => Number(el.value)), 6);
    assert.deepEqual((await sectionPreview('ext_emf')).loop_center, [7,8]);
    assert.equal((await sectionPreview('ext_emf')).loop_current, 9);
    await page.click('#nav-list [data-section="ext_force"]');
    const driveDropdown = 'select[data-section="ext_force"][data-key="drive_type"] + .custom-select';
    async function driveType(value) {
      await page.click(`${driveDropdown} .cs-button`);
      await page.click(`${driveDropdown} .cs-option:nth-child(${value === 'TURB' ? 2 : 1})`);
    }
    for (const key of Object.keys(forcingValues)) {
      assert.equal(await page.$(`[data-section="ext_force"][data-key="${key}"]`), null);
      assert.ok(!(await sectionPreview('ext_force'))._present.includes(key));
    }
    await driveType('TURB');
    for (const [key,value] of Object.entries(forcingValues)) {
      const selector = `[data-section="ext_force"][data-key="${key}"]`;
      await page.waitForSelector(selector, {visible:true});
      assert.equal(await page.$eval(selector, el => Number(el.value)), value);
      await edit(selector, value + 1);
    }
    await driveType('');
    for (const key of Object.keys(forcingValues)) {
      assert.equal(await page.$(`[data-section="ext_force"][data-key="${key}"]`), null);
      assert.ok(!(await sectionPreview('ext_force'))._present.includes(key));
    }
    await driveType('TURB');
    const restoredForcing = await sectionPreview('ext_force');
    for (const [key,value] of Object.entries(forcingValues)) {
      assert.equal(await page.$eval(`[data-section="ext_force"][data-key="${key}"]`, el => Number(el.value)), value + 1);
      assert.equal(restoredForcing[key], value + 1);
    }
    // Hiding comments preserves values containing !; copy and download match the preview.
    await edit('[data-section="species"][data-key="name"]', 'ion! "quoted"');
    await edit('[data-section="species"][data-key="number_density"]', 'if(x!=0,1.,0.)');
    const withComments = await preview();
    await page.click('#preview-comments');
    const withoutComments = await preview();
    assert.equal(await page.evaluate(text => maskNamelistText(text), withoutComments), withoutComments);
    assert.match(withoutComments, /name="ion! ""quoted"""/);
    assert.match(withoutComments, /number_density="if\(x!=0,1\.,0\.\)"/);
    assert.deepEqual(await page.evaluate(text => parseInputFile(text), withoutComments), await page.evaluate(text => parseInputFile(text), withComments));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      value: {writeText: async text => { window.copiedInput = text; }},
    }));
    const session = await browser.target().createCDPSession();
    await session.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: directory, eventsEnabled: true});
    for (const comments of [false, true]) {
      if (comments) {
        await page.click('#preview-comments');
        assert.match(await preview(), /^!.*generated/m);
        assert.match(await preview(), /! Species name/);
      }
      output = await preview();
      await page.click('#btn-copy');
      assert.equal(await page.evaluate(() => window.copiedInput), output);
      const started = new Promise(resolve => session.once('Browser.downloadWillBegin', resolve));
      const downloaded = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Input download timed out.')), 10000);
        const progress = event => {
          if (event.state === 'inProgress') return;
          clearTimeout(timeout);
          session.off('Browser.downloadProgress', progress);
          if (event.state === 'completed') resolve();
          else reject(new Error(`Input download ${event.state}.`));
        };
        session.on('Browser.downloadProgress', progress);
      });
      await page.click('#btn-generate');
      await downloaded;
      const {suggestedFilename} = await started;
      const downloadPath = path.join(directory, suggestedFilename);
      assert.equal(fs.readFileSync(downloadPath, 'utf8'), output);
      fs.unlinkSync(downloadPath);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: browser optimizer targets/apply, load/report, conditional fields, failed/fresh loads, omitted array edit, injector creation, comment toggle, copy, and download.');
  } finally {
    await browser.close();
    fs.rmSync(directory, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
