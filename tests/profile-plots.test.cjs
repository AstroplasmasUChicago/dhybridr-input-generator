'use strict';
// Run with PUPPETEER_MODULE pointing to an installed Puppeteer package.
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
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
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#preview-text');
    const preview = () => page.$eval('#preview-text', element => element.textContent);
    const canvasImage = async (plotOnly = false) => createHash('sha256').update(await page.$eval('#u_drift_profile-canvas', (canvas, plotOnly) => {
      if (!plotOnly) return canvas.toDataURL();
      const plot = document.createElement('canvas');
      plot.width = 300;
      plot.height = canvas.height - 40;
      plot.getContext('2d').drawImage(canvas, canvas.width === 360 ? 50 : 40, 10, plot.width, plot.height, 0, 0, plot.width, plot.height);
      return plot.toDataURL();
    }, plotOnly)).digest('hex');
    async function choose(selector, index) {
      await page.$eval(`${selector} .cs-button`, element => element.scrollIntoView({block: 'center'}));
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.click(`${selector} .cs-button`);
      await page.click(`${selector} .cs-option:nth-child(${index + 1})`);
    }
    async function setProfiles() {
      await page.$$eval('[data-section="species"][data-key="u_drift_profile"]', elements => {
        elements.forEach((element, index) => {
          element.value = ['x', 'y', 'x*x+y+z'][index];
          element.dispatchEvent(new Event('input', {bubbles: true}));
        });
      });
      await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
    }
    async function checkComponent(index, value) {
      const input = await preview();
      const before = await canvasImage(true);
      await choose('#u_drift_profile-component + .custom-select', index);
      assert.equal(await page.$eval('#u_drift_profile-component', element => element.value), value);
      assert.notEqual(await canvasImage(true), before, `${value} must redraw the velocity plot data`);
      assert.equal(await preview(), input, 'plot selection must not change the input');
    }

    // The first species view redraws for every component without a species-tab rebuild.
    await page.click('#nav-list [data-section="species"]');
    await setProfiles();
    await checkComponent(1, 'vx');
    await checkComponent(2, 'vy');
    await checkComponent(3, 'vz');
    await checkComponent(0, 'mag');

    // A species-tab rebuild preserves the selection and its change handler.
    await page.click('.species-tabs[data-section="species"] button');
    await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
    await checkComponent(2, 'vy');
    await page.click('.species-tabs[data-section="species"] button');
    assert.equal(await page.$eval('#u_drift_profile-component', element => element.value), 'vy');
    await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
    await checkComponent(1, 'vx');

    // Full dimension/build rebuilds preserve the selection and bind the new controls.
    await choose('#dim-select', 2);
    assert.equal(await page.$eval('#u_drift_profile-component', element => element.value), 'vx');
    await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
    await checkComponent(2, 'vy');
    const beforeSlice = await canvasImage();
    await choose('#u_drift_profile-slice-axis + .custom-select', 2);
    assert.notEqual(await canvasImage(), beforeSlice, 'slice axis must redraw the velocity plot');
    await checkComponent(3, 'vz');
    const beforePosition = await canvasImage();
    await page.$eval('#u_drift_profile-slice-pos', element => {
      element.value = '0.75';
      element.dispatchEvent(new Event('input', {bubbles: true}));
    });
    assert.notEqual(await canvasImage(), beforePosition, 'slice position must redraw the velocity plot');
    await choose('#build-select', 1);
    assert.equal(await page.$eval('#u_drift_profile-component', element => element.value), 'vz');
    await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
    await checkComponent(0, 'mag');
    await choose('#dim-select', 0);
    await page.waitForFunction(() => document.querySelector('#u_drift_profile-canvas').width > 0);
    await checkComponent(1, 'vx');
    assert.deepEqual(errors, []);
    console.log('PASS: velocity plot component changes, species rebuilds, dimensions, builds, and 3D slices.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
