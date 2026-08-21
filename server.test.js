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
