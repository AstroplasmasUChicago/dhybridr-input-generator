'use strict';
// Run with PUPPETEER_MODULE pointing to an installed Puppeteer package.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require(process.env.PUPPETEER_MODULE || 'puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage();
    await page.setViewport({width: 1400, height: 950});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let blockKatex = true;
    await page.setRequestInterception(true);
    page.on('request', request => blockKatex && /katex\.min\.js$/.test(request.url()) ? request.abort() : request.continue());
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#preview-text');
    const preview = () => page.$eval('#preview-text', element => element.textContent);
    const field = (section, key, index = 0) => `[data-section="${section}"][data-key="${key}"][data-index="${index}"]:not([data-inherit])`;
    async function label(section, key, index = 0) {
      return page.$eval(field(section, key, index), element => {
        const label = element.closest('.array-col').querySelector('.label');
        const math = label.querySelector('[data-tex]');
        return {
          tex: math?.dataset.tex,
          text: label.textContent,
          rendered: !!math?.querySelector('.katex'),
          subscript: !!math?.querySelector('msub'),
          name: element.closest('.field-row').querySelector('.name').firstChild.textContent.trim(),
        };
      });
    }
    async function check(section, key, index, tex, subscript = true) {
      const actual = await label(section, key, index);
      assert.equal(actual.tex, tex);
      assert.equal(actual.rendered, true);
      assert.equal(actual.subscript, subscript);
      assert.equal(actual.name, key);
    }

    // A missing math script leaves readable labels and does not change input assignments.
    const beforeMath = await preview();
    const fallback = await label('grid_space', 'n_cells');
    assert.equal(fallback.tex, 'N_x');
    assert.equal(fallback.text, 'N_x');
    assert.equal(fallback.rendered, false);
    blockKatex = false;
    const katexUrl = await page.$eval('script[src*="katex"]', element => element.src);
    await page.addScriptTag({url: katexUrl});
    await page.$eval('script[src*="katex"]', element => element.dispatchEvent(new Event('load')));
    await check('grid_space', 'n_cells', 0, 'N_x');
    await check('grid_space', 'box_size', 0, 'L_x');
    await check('grid_space', 'boundary_types', 0, 'x_l');
    await check('node_conf', 'ranks', 0, 'x', false);
    await check('species', 'u_drift', 0, 'u_x');
    await check('species', 'u_drift_profile', 0, 'u_x(\\mathbf{x})');
    await check('species', 'initial_bounds', 0, 'x_{\\min}');
    await check('field_diag', 'dump_E', 1, '\\vec{E}', false);
    assert.match((await label('field_diag', 'dump_E', 1)).text, /^Self /);
    assert.equal(await preview(), beforeMath);

    // Rebuilding a species renders its array labels without changing its input.
    await page.click('#nav-list [data-section="species"]');
    await page.click('.species-tabs[data-section="species"] button');
    await check('species', 'u_drift', 2, 'u_z');
    const plotSelect = '#u_drift_profile-component + .custom-select';
    await page.click(`${plotSelect} .cs-button`);
    await page.click(`${plotSelect} .cs-option:nth-child(2)`);
    assert.equal(await page.$eval('#u_drift_profile-component', element => element.value), 'vx');
    assert.equal(await page.$eval(`${plotSelect} .cs-button [data-tex]`, element => element.dataset.tex), 'u_x(\\mathbf{x})');
    assert.ok(await page.$(`${plotSelect} .cs-button .katex msub`));
    assert.equal(await preview(), beforeMath);

    // Dimension changes render the added spatial axis.
    await page.click('#dim-select .cs-button');
    await page.click('#dim-select .cs-option:nth-child(3)');
    await check('grid_space', 'n_cells', 2, 'N_z');
    assert.equal(await page.$eval(field('grid_space', 'n_cells', 2), element => element.closest('.array-col').classList.contains('dim-hidden')), false);
    assert.match(await preview(), /n_cells\(1:3\)=128,128,128/);

    // Injector bounds follow the selected plane and preserve the input keywords.
    await page.click('#nav-list [data-section="plasma_injector"]');
    await page.click('.species-enable-toggle [data-key="_enabled"]');
    await check('plasma_injector', 'transverse_bounds', 0, 'y_{\\min}');
    await check('plasma_injector', 'transverse_bounds', 2, 'y_{\\max}');
    await page.$eval('select[data-section="plasma_injector"][data-key="plane"]', element => {
      element.value = 'xz';
      element.dispatchEvent(new Event('change', {bubbles: true}));
    });
    await check('plasma_injector', 'transverse_bounds', 0, 'x_{\\min}');
    await check('plasma_injector', 'transverse_bounds', 1, 'z_{\\min}');
    await check('plasma_injector', 'transverse_bounds', 2, 'x_{\\max}');
    assert.match(await preview(), /plane="xz"/);
    assert.doesNotMatch(await preview(), /data-tex|\\\\min|\$N_x\$/);
    assert.deepEqual(errors, []);
    console.log('PASS: math label fallback, delayed rendering, unchanged keywords/input, species rebuild, dimensions, and injector planes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
