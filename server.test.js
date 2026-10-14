const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const C = require('./calc.js');

const html = fs.readFileSync('index.html', 'utf8');

/* Worked by hand:
   gross 30×$80 + 10×$140 = $3,800; people 30 + 10×2 = 50; +5 comps = 55
   venue max(50,55)×$35 = $1,925; on-top deposit $100; production $700
   profit 3,800 − 1,925 − 100 − 700 = $1,075 (28.3%) */
const base = () => ({
  platformFeePct: 0,
  model: 'per-person',
  pp: { guarantee: 50, rate: 35 },
  compGuests: 5,
  tickets: [
    { name: 'Single', price: 80, people: 1, sold: 30 },
    { name: 'Couple pass', price: 140, people: 2, sold: 10 }
  ],
  expenses: [{ desc: 'Staff', amount: 400 }, { desc: 'Decor', amount: 300 }],
  deposits: [{ desc: 'Date lock', amount: 500, onTop: false }, { desc: 'Cleaning bond', amount: 100, onTop: true }]
});

test('people per ticket drives attendance and the per-head venue fee', () => {
  const r = C.compute(base());
  assert.equal(r.gross, 3800);
  assert.equal(r.ticketsSold, 40);
  assert.equal(r.payingPeople, 50);
  assert.equal(r.attendance, 55);
  assert.equal(r.venueFee, 1925);
});

test('settlement reconciles deposits, production and profit', () => {
  const r = C.compute(base());
  assert.equal(r.venueCost, 2025);
  assert.equal(r.production, 700);
  assert.equal(r.netProfit, 1075);
  assert.equal(r.balanceDue, 1425);
  assert.equal(Math.round(r.margin * 10) / 10, 28.3);
  assert.equal(r.signal.key, 'strong');
});

test('break-even keeps the ticket mix and counts pairs as two people', () => {
  const r = C.compute(base());
  assert.equal(r.breakEven.possible, true);
  assert.equal(r.breakEven.tickets, 27);
  assert.deepEqual(r.breakEven.counts, [20, 7]);
  assert.equal(r.breakEven.people, 34);
});

test('platform fees come off gross before percentage venue shares', () => {
  const s = base();
  s.platformFeePct = 5;
  s.model = 'percentage';
  s.pct = { share: 40 };
  const r = C.compute(s);
  assert.equal(r.platformFees, 190);
  assert.equal(r.venueFee, (3800 - 190) * 0.4);
  s.model = 'hybrid';
  s.hybrid = { base: 500, share: 10 };
  assert.equal(C.compute(s).venueFee, 500 + 361);
  s.model = 'flat';
  s.flat = { fee: 1750 };
  assert.equal(C.compute(s).venueFee, 1750);
});

test('loss, tight, capacity and empty states map to Rabbit moods', () => {
  const loss = base();
  loss.expenses = [{ amount: 3000 }];
  assert.equal(C.compute(loss).signal.mood, 'thinking');
  assert.equal(C.compute(loss).signal.label, 'Loss');

  const tight = base();
  tight.expenses = [{ amount: 1500 }]; // profit $275 = 7.2%
  assert.equal(C.compute(tight).signal.key, 'tight');

  const full = base();
  full.capacity = 50;
  assert.equal(C.compute(full).overCapacity, true);
  assert.equal(C.compute(full).signal.key, 'capacity');

  assert.equal(C.compute({ tickets: [] }).signal.key, 'empty');
});

test('per-tier breakdown allocates every cost dollar', () => {
  const r = C.compute(base());
  const allocated = r.tiers.reduce((s, t) => s + t.costPerTicket * t.sold, 0);
  assert.ok(Math.abs(allocated - r.totalCosts) < 0.01);
  const profit = r.tiers.reduce((s, t) => s + t.profitPerTicket * t.sold, 0);
  assert.ok(Math.abs(profit - r.netProfit) < 0.01);
});

test('saved data from the previous live version migrates', () => {
  const m = C.migrate({
    flat: { eventName: 'Play Night', platformFeePct: '3', pricingModel: 'per-person', 'pp-guarantee': '40', 'pp-rate': '35', compGuests: '4' },
    tickets: [{ name: 'Couple Pair 1', price: 75, sold: 15 }, { name: 'Single Man', price: 85, sold: 7 }],
    expenses: [{ desc: 'Performer', due: '2026-10-01', amount: 300 }],
    deposits: [{ desc: 'Deposit', due: '', amount: 500, addedOnTop: true }]
  });
  assert.equal(m.version, 8);
  assert.equal(m.tickets[0].people, 2);
  assert.equal(m.tickets[1].people, 1);
  assert.equal(m.deposits[0].onTop, true);
  assert.equal(m.pp.guarantee, '40');
});

test('money uses a true minus sign', () => {
  assert.equal(C.money(-400), '−$400');
  assert.equal(C.money(1470), '$1,470');
});

test('page shell, brand system and accessibility hooks are present', () => {
  for (const file of ['index.html', 'calc.js', 'server.js', 'railway.json', 'package.json']) {
    assert.equal(fs.existsSync(file), true, `${file} is missing`);
  }
  assert.match(html, /<script src="calc\.js"><\/script>/);
  assert.match(html, /Berkshire\+Swash/);
  assert.match(html, /--lmas-navy:\s*#1B2452/);
  assert.match(html, /--lmas-hot-pink:\s*#FF69B4/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /@media print/);
  assert.match(html, /id="rabbit"/);
  assert.match(html, /role="img"/);
  assert.doesNotMatch(html, /LET'S MAKE A SCENE[!.]/i);
});
