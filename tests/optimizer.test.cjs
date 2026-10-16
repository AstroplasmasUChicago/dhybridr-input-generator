'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({document: {addEventListener() {}}});
const source = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');
vm.runInContext(source.replace('  // ---- Go ----', `
  globalThis.optimizer = {
    bestDecompositionND, computeNodeRecommendations,
    setInput(cells, particles) {
      currentDim = cells.length;
      state = {grid_space: {n_cells: cells}, particles: {n_species: particles.length},
        species: particles.map(ppc => ({ppc}))};
    },
  };
  // ---- Go ----`), context, {filename: 'app.js'});
const optimizer = context.optimizer;

function checkDecomposition(cells, decomposition) {
  assert.equal(decomposition.procAxes.length, cells.length);
  assert.equal(decomposition.procAxes.reduce((a, b) => a * b, 1), decomposition.nprocs);
  decomposition.procAxes.forEach((ranks, axis) => {
    assert.ok(Number.isInteger(ranks) && ranks >= 1);
    assert.ok(Math.floor(cells[axis] / ranks) >= 4, `${cells}: fewer than four cells on axis ${axis}`);
    assert.equal(decomposition.subAxes[axis], cells[axis] / ranks);
  });
}

// Exactly four cells per local axis are valid; three are not.
for (const [cells, ranks] of [[[16], 4], [[8, 12], 6], [[8, 12, 16], 24], [[17], 4]]) {
  const result = optimizer.bestDecompositionND(cells, ranks);
  assert.ok(result);
  assert.equal(result.nprocs, ranks);
  checkDecomposition(cells, result);
}
for (const [cells, ranks] of [[[15], 4], [[7, 8], 4], [[8, 8, 7], 8], [[3, 128], 1]]) {
  assert.equal(optimizer.bestDecompositionND(cells, ranks), null);
}

// Every suggested factorization preserves rank count and the four-cell minimum.
for (const cells of [[31], [31, 63], [31, 47, 63]]) {
  for (let ranks = 1; ranks <= 80; ranks++) {
    const result = optimizer.bestDecompositionND(cells, ranks);
    if (result) {
      assert.equal(result.nprocs, ranks);
      checkDecomposition(cells, result);
    }
  }
  optimizer.setInput(cells, [cells.map(() => 4)]);
  for (const target of [100, 1000, 10000, 1e7, 1e8]) {
    const result = optimizer.computeNodeRecommendations(target);
    assert.ok(result.candidates.length <= 5);
    result.candidates.forEach(candidate => checkDecomposition(cells, candidate));
    if (result.recommended) {
      assert.ok(result.candidates.some(candidate => candidate === result.recommended), 'Recommendation must be displayed');
    } else {
      assert.equal(result.candidates.length, 0);
    }
  }
}

// Seven ranks are closest to the target, although five other shapes are squarer.
optimizer.setInput([64, 64], [[4, 4]]);
const recommendation = optimizer.computeNodeRecommendations(10000);
assert.equal(recommendation.recommended.nprocs, 7);
assert.ok(recommendation.candidates.includes(recommendation.recommended));

// Particle estimates add the per-cell products of all species.
optimizer.setInput([64, 64], [[2, 3], [1, 2]]);
assert.equal(optimizer.computeNodeRecommendations(1000).totalParticles, 32768);
optimizer.setInput([3, 128], [[4, 4]]);
assert.equal(optimizer.computeNodeRecommendations(1e6).recommended, null);
console.log('PASS: optimizer factorization, local-cell limits, visible recommendations, and species particle counts.');
