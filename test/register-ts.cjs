// ---------------------------------------------------------------------------
// test/register-ts.cjs — Lightweight CJS `.ts` / `.tsx` loader using `typescript`
// `transpileModule` so Node.js test scripts can require `.ts` and `.tsx` modules
// without external bundler dependencies.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const nodeCrypto = require('crypto');
const ts = require('typescript');

if (typeof globalThis.crypto === 'undefined' && nodeCrypto.webcrypto) {
  globalThis.crypto = nodeCrypto.webcrypto;
}

function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const isTsx = filename.endsWith('.tsx');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: isTsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
    },
  });
  module._compile(outputText, filename);
}

if (!require.extensions['.ts']) {
  require.extensions['.ts'] = compileTypeScript;
}
if (!require.extensions['.tsx']) {
  require.extensions['.tsx'] = compileTypeScript;
}
