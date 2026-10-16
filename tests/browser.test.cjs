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
    const optimizerTarget = () => page.$eval('#node-optimizer-target-label', element => Number(element.textContent.replace(/\D/g, '')));
    async function setOptimizerTarget(exponent) {
      await page.$eval('#node-optimizer-slider', (element, exponent) => {
        element.value = String(exponent);
        element.dispatchEvent(new Event('input', {bubbles: true}));
      }, exponent);
    }
    // CPU and GPU have distinct defaults and retain separate slider choices.
    await page.click('#nav-list [data-section="node_conf"]');
    assert.equal(await optimizerTarget(), 1e7);
    await setOptimizerTarget(5);
    await changeBuild('GPU');
    assert.equal(await optimizerTarget(), 1e8);
    await setOptimizerTarget(7);
    await changeBuild('CPU');
    assert.equal(await optimizerTarget(), 1e5);
    await changeBuild('GPU');
    assert.equal(await optimizerTarget(), 1e7);
    await changeBuild('CPU');
    // The closest-to-target recommendation remains visible and can be applied.
    await load('optimizer.input', 'node_conf{ranks=1,1}grid_space{n_cells=64,64}species{ppc=4,4}');
    await page.click('#nav-list [data-section="node_conf"]');
    await setOptimizerTarget(4);
    const recommended = '#node-optimizer-results .node-opt-recommended';
    assert.equal(await page.$$eval(recommended, elements => elements.length), 1);
    assert.equal(await page.$eval(`${recommended} td`, element => Number(element.textContent)), 7);
    await page.click(`${recommended} .node-opt-apply`);
    const axes = await page.$$eval('input[data-section="node_conf"][data-key="ranks"]', elements => elements.filter(element => Number(element.dataset.index) < 2).map(element => Number(element.value)));
    assert.equal(axes.reduce((a, b) => a * b, 1), 7);
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
    // Editing one omitted array entry writes only that entry.
    const ppc = await page.$('input[data-section="species"][data-key="ppc"][data-index="1"]');
    await ppc.evaluate(element => { element.value = '3'; element.dispatchEvent(new Event('input', {bubbles: true})); });
    assert.match(await preview(), /ppc\(2\)=3/);
    assert.doesNotMatch(await preview(), /ppc\(1/);
    // Enabling an omitted injector creates an editable injector.
    await page.click('#nav-list [data-section="plasma_injector"]');
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    assert.match(await preview(), /plasma_injector/);
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
    // The downloaded input contains the displayed assignments and comments.
    const session = await browser.target().createCDPSession();
    await session.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: directory, eventsEnabled: true});
    const started = new Promise(resolve => session.once('Browser.downloadWillBegin', resolve));
    const downloaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Input download timed out.')), 10000);
      session.on('Browser.downloadProgress', event => {
        if (event.state === 'inProgress') return;
        clearTimeout(timeout);
        if (event.state === 'completed') resolve();
        else reject(new Error(`Input download ${event.state}.`));
      });
    });
    output = await preview();
    await page.click('#btn-generate');
    await downloaded;
    const {suggestedFilename} = await started;
    const withoutTimestamp = text => text.replace(/^!   Generated:.*$/m, '');
    assert.equal(withoutTimestamp(fs.readFileSync(path.join(directory, suggestedFilename), 'utf8')), withoutTimestamp(output));
    assert.deepEqual(errors, []);
    console.log('PASS: browser optimizer targets/apply, load/report, conditional fields, failed/fresh loads, omitted array edit, injector creation, and download.');
  } finally {
    await browser.close();
    fs.rmSync(directory, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
