// Note: keep this file browser friendly. No node.js specific imports.

// avg ifs checked
// avg loops per while/function
// which return used + counts

import {wrapPlugin as wrapPlugin1} from './wrap-plugin.mjs';
import {wrapPlugin as wrapPlugin2} from './wrap-plugin.v2.mjs';

const PLUGIN = wrapPlugin2;

const transformOptionsViewCode = (fid, code, tokens) => ({
  retainLines: true,
  parserOpts: {
    plugins: [
      'flow',
      'jsx',
      'optionalChaining',
      'classProperties',
      'dynamicImport',
      'importMeta',
    ],
    tokens: true,
  },
  plugins: [
    [
      PLUGIN,
      {
        code,
        fid,
        tokens,
      },
    ]
  ],
});

export function transformCode(babel, code, fid, fileDesc, generateViewCode) {
  // We must transform it either way to generate the tokens, so that's not optional.
  let tokens = [];
  let out = babel.transform(code, transformOptionsViewCode(fid, code, tokens));

  // console.log('result:', tokens)

  if (generateViewCode) {
    let view = tokens.map(data => {
      const {whitespace, value, tid, nid, token} = data;
      let escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return (
        (nid === undefined ? '' : '<span id="nid'+nid+'" class="nid" tid="'+tid+'">') +
        (nid !== undefined || !whitespace ? '<span class="token" id="start' + token.start + '">' : '') +
        escaped +
        (nid !== undefined || !whitespace ? '</span>' : '') +
        (nid === undefined ? '' : '</span>')
      );
    }).join('');
    let contexts =
      '{' +
        tokens.map(({nid, contextNids}) => {
          if (!contextNids || !contextNids.length) return;
          return nid + ': [' + contextNids.join(',') + ']';
        }).filter(Boolean).join(', ') +
      '}';

    return {view, contexts, run: out.code};
  }

  return {view: undefined, contexts: undefined, run: out.code};
}
