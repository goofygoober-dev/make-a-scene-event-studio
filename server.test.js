const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('deployable app contains required entry points', () => {
  for (const file of ['index.html','styles.css','readability.css','accessibility.css','app.js','server.js','railway.json']) assert.equal(fs.existsSync(file), true, `${file} is missing`);
});

test('supporting text uses the enlarged readability scale', () => {
  const html = fs.readFileSync('index.html','utf8');
  const css = fs.readFileSync('readability.css','utf8');
  assert.match(html, /readability\.css\?v=5/);
  assert.match(css, /#breakEvenDetail[\s\S]*font-size: 14px/);
  assert.match(css, /\.guide-card details p[\s\S]*font-size: 14px/);
  assert.match(css, /label[\s\S]*font-size: 12px/);
});

test('server binds to Railway PORT and calculator has durable browser state', () => {
  assert.match(fs.readFileSync('server.js','utf8'), /process\.env\.PORT/);
  assert.match(fs.readFileSync('app.js','utf8'), /localStorage\.setItem/);
});

test('scene tokens and clear-example controls are present', () => {
  assert.match(fs.readFileSync('index.html','utf8'), /id="clearDialog"/);
  assert.match(fs.readFileSync('app.js','utf8'), /data-clear/);
  assert.match(fs.readFileSync('scene-tokens.css','utf8'), /--scene-primary-container: #FF4A90/);
  JSON.parse(fs.readFileSync('scene-tokens.json','utf8'));
});

test('brand naming is uppercase, punctuation-free, and contains no retired acronym', () => {
  const sourceFiles = ['index.html','app.js','styles.css','responsive.css','readability.css','scene-tokens.css','scene-tokens.json','README.md','package.json'];
  const source = sourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const retiredName = ['R', 'I', 'P', 'E'].join('');
  assert.equal(new RegExp(`\\b${retiredName}\\b`, 'i').test(source), false);
  assert.doesNotMatch(source, /LET'S MAKE A SCENE!/);
  assert.match(fs.readFileSync('index.html','utf8'), />LET'S MAKE A SCENE</);
});

test('desktop and mobile viewport compositions are shipped', () => {
  const html = fs.readFileSync('index.html','utf8');
  const responsive = fs.readFileSync('responsive.css','utf8');
  assert.doesNotMatch(html, /good chaos, clear numbers/i);
  assert.match(responsive, /min-width: 951px/);
  assert.match(responsive, /max-width: 560px/);
  assert.match(responsive, /100svh/);
});

test('mobile fields and cards stay inside a single centred content column', () => {
  const html = fs.readFileSync('index.html','utf8');
  const responsive = fs.readFileSync('responsive.css','utf8');
  assert.match(html, /responsive\.css\?v=6/);
  assert.match(responsive, /grid-template-columns: 44px minmax\(0, 1fr\)/);
  assert.match(responsive, /\.panel \{\s*display: block/);
  assert.match(responsive, /\.form-grid > label,[\s\S]*min-width: 0/);
  assert.match(responsive, /\.data-row > label,[\s\S]*grid-column: auto/);
});

test('weighted ticket-mix break-even target is shipped', () => {
  const html = fs.readFileSync('index.html','utf8');
  const app = fs.readFileSync('app.js','utf8');
  assert.match(html, /id="breakEvenTickets"/);
  assert.match(html, /aria-label="Progress toward ticket break-even"/);
  assert.match(app, /function breakEvenForTicketMix/);
  assert.match(app, /current sales mix/);
});

test('venue model fields and commitment labels respond to pricing structure', () => {
  const html = fs.readFileSync('index.html','utf8');
  const app = fs.readFileSync('app.js','utf8');
  const css = fs.readFileSync('accessibility.css','utf8');
  assert.match(html, /id="commitmentLabel"/);
  assert.match(html, /app\.js\?v=5/);
  assert.match(app, /PERCENTAGE_SHARE: \{fields:\['percentage'\], commitmentLabel:'Projected venue share'\}/);
  assert.match(app, /document\.querySelectorAll\('\[data-field\]'\)/);
  assert.match(css, /\[hidden\][\s\S]*display: none !important/);
});

test('daylight and print modes ship explicit high-contrast text rules', () => {
  const html = fs.readFileSync('index.html','utf8');
  const css = fs.readFileSync('accessibility.css','utf8');
  assert.match(html, /accessibility\.css\?v=1/);
  assert.match(css, /html\[data-theme="daylight"\][\s\S]*--accessible-ink: #3B0924/);
  assert.match(css, /@media print[\s\S]*color: #111111 !important/);
  assert.match(css, /@media print[\s\S]*border-color: #666666 !important/);
});
