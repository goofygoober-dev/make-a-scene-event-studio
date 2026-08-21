const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('deployable app contains required entry points', () => {
  for (const file of ['index.html','styles.css','app.js','server.js','railway.json']) assert.equal(fs.existsSync(file), true, `${file} is missing`);
});

test('server binds to Railway PORT and calculator has durable browser state', () => {
  assert.match(fs.readFileSync('server.js','utf8'), /process\.env\.PORT/);
  assert.match(fs.readFileSync('app.js','utf8'), /localStorage\.setItem/);
});

test('RIPE tokens and clear-example controls are present', () => {
  assert.match(fs.readFileSync('index.html','utf8'), /id="clearDialog"/);
  assert.match(fs.readFileSync('app.js','utf8'), /data-clear/);
  assert.match(fs.readFileSync('ripe-tokens.css','utf8'), /--ripe-primary-container: #FF4A90/);
  JSON.parse(fs.readFileSync('ripe-tokens.json','utf8'));
});
