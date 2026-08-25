const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('Railway entry points and document shell are present', () => {
  for (const file of ['index.html', 'server.js', 'railway.json', 'package.json']) {
    assert.equal(fs.existsSync(file), true, `${file} is missing`);
  }
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<body>[\s\S]*<\/body>/);
  assert.match(fs.readFileSync('server.js', 'utf8'), /process\.env\.PORT/);
});

test('the supplied calculator models every requested event cost', () => {
  for (const id of ['platformFeePct', 'model-per-person', 'model-flat', 'model-percentage', 'model-hybrid', 'ticketRows', 'addTicket', 'expenseRows', 'depositRows']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} is missing`);
  }
  assert.match(html, /function computeVenueFee/);
  assert.match(html, /function recalc/);
});

test('multiple ticket types produce a per-style break-even mix', () => {
  assert.match(html, /var state = \{ tickets:\[\], expenses:\[\], deposits:\[\] \}/);
  assert.match(html, /function renderTicketRows/);
  assert.match(html, /function allocateTicketMix/);
  assert.match(html, /function findBreakEven/);
  assert.match(html, /id="be-breakdown"/);
  assert.match(html, /Uses the mix of ticket types currently sold/);
});

test('deposits can be included in or added on top of venue cost', () => {
  assert.match(html, /class="deposit-extra"/);
  assert.match(html, /addedOnTop/);
  assert.match(html, /var venueCost = venueFee \+ extraDeposits/);
  assert.match(html, /var balance = venueFee - includedDeposits/);
  assert.match(html, /id="out-depositIncluded"/);
  assert.match(html, /id="out-depositExtra"/);
  assert.match(html, /What “On top” means:/);
});

test('venue model controls reveal only their matching fields', () => {
  assert.match(html, /document\.querySelectorAll\('\[data-model-fields\]'\)/);
  assert.match(html, /box\.classList\.toggle\('active'/);
  assert.match(html, /\.model-fields\{ display:none/);
  assert.match(html, /\.model-fields\.active\{ display:block/);
});

test('break-even, local persistence, clear and print actions are included', () => {
  assert.match(html, /id="be-tickets"/);
  assert.match(html, /localStorage\.setItem/);
  assert.match(html, /function clearExamples/);
  assert.match(html, /window\.print\(\)/);
});

test('desktop and mobile layouts are responsive and touch friendly', () => {
  assert.match(html, /@media \(max-width:980px\)/);
  assert.match(html, /@media \(max-width:640px\)/);
  assert.match(html, /@media \(max-width:480px\)/);
  assert.match(html, /min-height:44px/);
  assert.match(html, /\.field-grid[\s\S]*grid-template-columns:1fr/);
});

test('night, daylight and printable themes are self-contained', () => {
  assert.match(html, /\[data-theme="daylight"\]/);
  assert.match(html, /@media print/);
  assert.match(html, /--on-surface:#111111 !important/);
  assert.match(html, /--grain-op:0 !important/);
});

test('brand wordmark follows the approved naming rule', () => {
  assert.match(html, />LET'S MAKE</);
  assert.match(html, /> A SCENE</);
  assert.doesNotMatch(html, /LET'S MAKE A SCENE[!.]/i);
  assert.doesNotMatch(html, /\bR\.I\.P\.E\b/i);
});
