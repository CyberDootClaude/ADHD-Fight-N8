// Loads the game's code into a sandbox so tests can run matches in Node
// without a browser (no drawing, no sound).
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const FILES = ['util', 'audio', 'input', 'moves', 'entities', 'characters', 'fighter', 'render', 'ai', 'match'];

function loadGame() {
  const ctx = { console, Math, JSON, Object, Array, Set, Map, Number, String, Date };
  ctx.window = { addEventListener() {} };
  ctx.document = { getElementById: () => null };
  ctx.navigator = {};
  ctx.localStorage = { getItem: () => null, setItem() {} };
  vm.createContext(ctx);
  for (const f of FILES) {
    const file = path.join(__dirname, '..', 'js', `${f}.js`);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  vm.runInContext('var Game = { debug: false };', ctx);
  return (code) => vm.runInContext(code, ctx);
}

module.exports = { loadGame };
