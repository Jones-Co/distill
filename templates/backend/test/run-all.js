/**
 * Test Runner — Runs all test suites and reports overall results.
 *
 * Usage: node test/run-all.js
 */

const { execSync } = require('child_process');
const path = require('path');

const testDir = __dirname;
const suites = [
  'test-retrieval.js',
  'test-ai-integration.js'
];

console.log('Distill — Test Suite');
console.log('================================\n');

let allPassed = true;

for (const suite of suites) {
  const suitePath = path.join(testDir, suite);
  console.log(`\n${'█'.repeat(60)}`);
  console.log(`Running: ${suite}`);
  console.log('█'.repeat(60));

  try {
    const output = execSync(`node "${suitePath}"`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
  } catch (error) {
    allPassed = false;
    console.log(error.stdout || '');
    console.log(error.stderr || '');
    console.log(`\n⚠ ${suite} had failures\n`);
  }
}

console.log('\n' + '█'.repeat(60));
if (allPassed) {
  console.log('ALL TEST SUITES PASSED');
} else {
  console.log('SOME TEST SUITES FAILED — see output above');
}
console.log('█'.repeat(60));

process.exit(allPassed ? 0 : 1);
