import fs from 'fs';
import path from 'path';
import {default as babel} from '@babel/core';
import {transformCode} from '../src/transformer.mjs';
import {serve} from '../src/serve.mjs';

import prettier from 'prettier';
global.prettier = prettier;


let prefix = 'file://';
let __url = import.meta.url;
let __file = __url.slice(__url.indexOf(prefix) + prefix.length);
let __dir = path.dirname(__file);

if (process.argv.includes('--help')) {
  console.log(`
    HeatFiler.2
    The Heatmap Profiler for analyzing JS

      --help                    This
      --config <json>           A JSON object with the config, used as a second baseline, can still be overridden with other flags
      --config-file <file>      File should contain a JSON object for \`--config\`
      --build-id <id>           Use this id as the build id instead of a randomly generated one

      ## Output channels
        --log                   Enable logging of stats. Will just \`console.log\` the stats at an interval
        --local-storage         Enable logging of stats. Will write the stats object to \`localStorage\` at an interval
        --post                  Enable logging of stats. Will "ajax" POST the stats to the \`--post-server\` endpoint at an interval

      ## Runtime
        --interval <ms>         Delay between syncing of stats (for any method)
        --interval-sync <ms>    Interval at which to force a sync (only works for logging and localStorage methods), -1 to disable
        --env-target            When set the logger will bail if \`location\` is available but a mismatch at runtime
        --serve                 Start the server that proxies the stats object (on \`--post-server\`)

      ## Input to transform
        --file <file>           Input files (comma separated), use - to read the list from stdin
        --dir <dir>             Input dirs to process recursively (comma separated)
        --root <prefix>         Project root for file path displaying purposes
      
      ## Output
        --run                   Only generate the "run" code, which actually gets executed (-> js)
        --view                  Only generate the "view" code, used by the viewer (-> html)
        --post-server <url>     A REST endpoint where the stats will be sent/available as a POST if \`--post\` is enabled
        --inline                Replace input file with run code output, inline (else <file>.run is generated)
        --cli                   Use next argument as input code and dump both outputs to cli
        --tty                   Output processed file to terminal (automatic for --cli)
        --header <file>         Only inject the HF machinery to this file (absolute path) instead of all files (minimal impact)

    Exiting now.
`);
  process.exit();
}

// console.log('url:', __url);
// console.log('dir:', __dir);
// console.log('file:', __file);

function hasParam(name) {
  return process.argv.includes(name);
}
function getParamArg(name) {
  return hasParam(name) ? process.argv[process.argv.indexOf(name) + 1] : '';
}

if (hasParam('--serve')) {
  serve();
}

function generateConfig() {
  const baseConfig = {
    enable: {
      interval: 2000,
      log: true,
      localStorage: false,
      post: false,
      //  Force a synchronous localStorage/log (whichever is enabled) write every n operations, instead of waiting for timer.
      forceSyncInterval: 10000, // Set to -1 to disable.
      targetLocation: '', // If set and `location` !== undefined, then this is checked at runtime
    },
    input: {
      cli: false, // --cli, implies --tty
      targetFile: '', // --file <file>
      targetDir: '', // --dir <dir>
      projectRoot: '', // --root <file>
      headerFile: '', // --header <file>
      buildId: ('C'+parseInt((''+Math.random()).slice(2, 8), 10)).padEnd('0', 7), // --build-id <id>
    },
    output: {
      inline: false, // --inline
      tty: false, // --tty
      run: false, // --run
      view: false, // --view
      postServer: 'http://localhost:3000', // HF stats will POST here when `enable.post = true`, see src/serve.js
    },
  };

  let config = baseConfig;
  if (hasParam('--config')) {
    const inputConfigJson = getParamArg('--config');
    if (inputConfigJson) {
      const inputConfig = JSON.parse(inputConfigJson);
      config.input = {...baseConfig.input, ...inputConfig.input};
      config.output = {...baseConfig.output, ...inputConfig.output};
      config.enable = {...baseConfig.enable, ...inputConfig.enable};
    }
  }
  if (hasParam('--config-file')) {
    const inputConfigFile = getParamArg('--config-file');
    if (inputConfigFile) {
      if (!fs.existsSync(inputConfigFile)) throw new Error('Input config file does not exist (' + inputConfigFile + ')');
      const inputConfig = JSON.parse(fs.readFileSync(inputConfigFile, 'utf8'));
      config.input = {...baseConfig.input, ...inputConfig.input};
      config.output = {...baseConfig.output, ...inputConfig.output};
      config.enable = {...baseConfig.enable, ...inputConfig.enable};
    }
  }

  if (hasParam('--cli')) config.input.cli = getParamArg('--cli');
  if (hasParam('--file')) config.input.targetFile = getParamArg('--file');
  if (hasParam('--dir')) config.input.targetDir = getParamArg('--dir');
  if (hasParam('--root')) config.input.projectRoot = getParamArg('--root');
  if (hasParam('--header')) config.input.headerFile = getParamArg('--header');
  if (hasParam('--inline')) config.output.inline = true;
  if (hasParam('--tty')) config.output.tty = true;
  if (hasParam('--run')) config.output.run = true;
  if (hasParam('--view')) config.output.view = true;
  if (hasParam('--interval')) config.enable.interval = getParamArg('--interval');
  if (hasParam('--log') || hasParam('--local-storage') || hasParam('--post') || hasParam('--post-server')) {
    // If there's any env arg override, clear the presets
    baseConfig.enable = {
      ...baseConfig.enable,
      log: false,
      localStorage: false,
      post: false,
      postServer: false,
    };

    if (hasParam('--log')) config.enable.log = true;
    if (hasParam('--local-storage')) config.enable.localStorage = true;
    if (hasParam('--post')) config.enable.post = true;
    if (hasParam('--post-server')) config.output.postServer = true;
  }

  if (hasParam('--interval-sync')) config.enable.forceSyncInterval = parseInt(getParamArg('--interval-sync'), 10) || -1;
  if (hasParam('--env-target')) config.enable.targetLocation = getParamArg('--env-target');
  if (hasParam('--build-id')) config.enable.targetLocation = getParamArg('--build-id');

  return config;
}

const hfConfig = generateConfig();
console.log('HF Config:', hfConfig);

if (!hfConfig.enable.localStorage && !hfConfig.enable.post && !hfConfig.enable.log) {
  console.error('Error: no stats logging method enabled; you need to enable at least one of: log, post, or localStorage');
  process.exit(1);
}

/*
To POST from local storage in a different tab;
 - Enable hfConfig.enable.localStorage and transform the files
   - The local storage approach is sync and can be read out in sync from another tab
 - Open a new tab, any page, on the same host:port
 - Open devtools
 - Run this script to send the data to the proxy
 - Run the page to profile
 - Data should update in UI now

let prev = '';
setInterval(() => {
  let payload = localStorage.getItem('hf_stats');
  if (payload !== prev) {
    let xmlHttpReq = new XMLHttpRequest();
    xmlHttpReq.open("POST", "http://localhost:3000", true);
    xmlHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    xmlHttpReq.send(payload);
    prev = payload;
  }
}, 500);

*/


let prelude = (file) => `/*
 * @hf
 * @flow
 */
/* eslint-disable */

HF_INIT("${file}", "${hfConfig.input.buildId}");


// Actual code:


`;

let postlude = `


// HF Postlude:


function HF_INIT(fromFile, compileId) {
  if (typeof self === 'undefined') {
    if (typeof global === 'undefined') this.self = this;
    else global.self = global;
  }
  if (self.HF_STATS) return;
  let HF_ENV_ID = ('S'+parseInt((''+Math.random()).slice(2, 8), 10)).padEnd('0', 7);    // runtime id
  console.log('HF: setting up from', fromFile, ', compilation id =', compileId, ', env id =', HF_ENV_ID, 'in', self, typeof top);

  // Stop collecting if we dont do anything with the data (wrong env or wrong window or whatever)
  let noop = typeof location !== 'undefined' && ${!!hfConfig.enable.targetLocation} && location.href !== "${hfConfig.enable.targetLocation}"; 
  if (noop) console.log('HF: this env is a noop, bad location? target=', "${hfConfig.enable.targetLocation}", ', found=', typeof location === 'undefined' ? undefined : location.href);
  else console.log('Enabled HF in this env, env id =', HF_ENV_ID, typeof location === 'undefined' || location);

  let HF_COUNT = 0;
  let HF_LAST_COUNT = -1;
  self.HF_STATS = {compileId, envId: HF_ENV_ID};
  function initFid(fid) {
    let fobj = HF_STATS[fid];
    if (!fobj) {
      fobj = HF_STATS[fid] = {
        hit: 0,
        bynid: {}, // hits per node in this file
        bytype: {}, // hits by statement type in this file
      };
    }
    return fobj;
  }
  function initNid(fid, nid) {
    let nobj = HF_STATS[fid].bynid[nid];
    if (!nobj) {
      nobj = HF_STATS[fid].bynid[nid] = {
        hit: 0,
        n: '', // statement type
        t: 0, // truthy
        f: 0, // falsy
        type: {},
      };
    }
    return nobj;
  }
  // Chunked printing is used for environments where logging is limited, like logcat (1k-4k per line, max)
  let batchId = 0; // helps with identifying to which batch a log chunk belongs
  function logChunked(msg) {
    let step = 800; // adb logcat seems to limit messages at ~1k and there is some overhead eating into that
    let i = 0;
    let l = msg.length;
    let n = 0;
    let m = Math.ceil(l / step);
    while (i < l) {
      let a = i;
      i += step;
      let b = Math.min(l, i);
      let cnk = msg.slice(a, b);
      console.log('HFc: ' + HF_ENV_ID + ' : ' + batchId + ' : ' + (++n) + ' / ' + m + ' : ' + a + '-' + (b) + '; ' + cnk);
    }
    ++batchId;
  }
  self.HF_STMT = (fid, nid, contextTids, type) => {
    if (noop) return;
    ++HF_COUNT;

    let fobj = initFid(fid);
    ++fobj.hit;
    if (!fobj.bytype[type]) fobj.bytype[type] = 0;
    ++fobj.bytype[type];
  
    let nobj = initNid(fid, nid);
    ++nobj.hit;
    nobj.n = type;
 
    if (HF_COUNT % ${hfConfig.enable.forceSyncInterval||-1} === 0) {
      if (${!!hfConfig.enable.localStorage}) {
        // Set sync every so many ops...
        console.log('HF   - storing in localStorage');
        localStorage.setItem('hf_stats', JSON.stringify(HF_STATS));
        HF_LAST_COUNT = HF_COUNT;
      }
      if (${!!hfConfig.enable.log}) {
        logChunked(JSON.stringify(HF_STATS));
        HF_LAST_COUNT = HF_COUNT;
      }
    }
  };
  self.HF_DECL = (fid, nid, type) => {
    self.HF_STMT(fid, nid, type);
  };
  self.HF_EXPR = (fid, nid, val) => {
    if (noop) return val;
    ++HF_COUNT;
    initFid(fid);
    
    let nobj = initNid(fid, nid);
    
    // ++nobj.hit; // dont hit this twice...
    if (val) ++nobj.t;
    else ++nobj.f;
    let to = typeof val;
    nobj.type[to] ? ++nobj.type[to] : (nobj.type[to] = 1);
  
    return val;
  };
  // Store stats to cache every second
  (function repeat(){
    if (noop) return;
    if (self.HF_TIMER) return;
    console.log('HF: Scheduling a flush, seed =', HF_ENV_ID);
    self.HF_TIMER = setTimeout(() => {
      if (noop) return;
      self.HF_TIMER = 0;
      HF_STATS.count = HF_COUNT;
      // Don't sync if nothing changed. Syncs are expensive.
      if (HF_LAST_COUNT !== HF_COUNT) {
        let nooped = true;
        if (${!!hfConfig.enable.localStorage}) {
          console.log('HF   - storing in localStorage');
          localStorage.setItem('hf_stats', JSON.stringify(HF_STATS));
          HF_LAST_COUNT = HF_COUNT;
          nooped = false;
        }
        if (${!!hfConfig.enable.post} && self.XMLHttpRequest) {
          console.log('HF   - sending ajax request to ${hfConfig.output.postServer}');
          let xmlHttpReq = new XMLHttpRequest();
          xmlHttpReq.open("POST", "${hfConfig.output.postServer}", true);
          xmlHttpReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
          xmlHttpReq.send(JSON.stringify(HF_STATS));
  
          HF_LAST_COUNT = HF_COUNT;
          nooped = false;
        }
        if (!!${hfConfig.enable.log}) {
          logChunked(JSON.stringify(HF_STATS));
          HF_LAST_COUNT = HF_COUNT;
          nooped = false;
        }
        if (nooped) {
          console.warn('HF   - nooped :( in', HF_ENV_ID);
          noop = true;
          console.warn('HF: Stopping HF work; nooped (wrong env? worker/serviceworker etc?)');
          return;
        }
      }
      // Repeat _after_. Crashes should stop the sync process permanently.
      repeat();
    }, ${hfConfig.enable.interval || 1000});
  })();
}
`;

const ALSO_VIEW_CODE = !hfConfig.output.run || hfConfig.output.view;
const ALSO_RUN_CODE = !hfConfig.output.view || hfConfig.output.run;

if (hfConfig.input.cli) {
  let input = hfConfig.input.cli;
  let transformOutput = transformCode(babel, input, 1, 'cli', !ALSO_RUN_CODE);

  if (ALSO_RUN_CODE) {
    console.time('Finished "run"');
    console.timeEnd('Finished "run"');
    console.log('run code:\n', (hfConfig.output.headerFile === 'false' ? '' : prelude('cli input')) + transformOutput.run + (hfConfig.headerFile === 'false' ? '' : postlude));
  }

  if (ALSO_VIEW_CODE) {
    console.time('Finished "view"');
    console.timeEnd('Finished "view"');
    console.log('view code:\n', transformOutput.view);
    console.log('contexts:\n', transformOutput.contexts);
  }

  process.exit();
}

if (hfConfig.input.targetFile) {
  let file = hfConfig.input.targetFile;

  if (file === '-') {
    // Read file list from stdin  (echo "a,b" | node cli.mjs)
    let buf = '';
    process.stdin.on('data', data => buf += data);
    process.stdin.on('end', () => {
      let files = [{
        dir: 'stdin',
        offset: 0,
        files: buf.split(',').map(s => s.trim())
      }];
      allFiles(files);
    });
  } else {
    allFiles([{
      dir: path.dirname(file),
      offset: 0,
      files: file.split(/\s*,\s*/),
    }]);
    process.exit();
  }
}

if (hfConfig.input.targetDir) {
  let nextOffset = 0;
  let dirs = hfConfig.input.targetDir.split(',').map(dir => dir.trim());

  console.time('Process all dirs');

  let files = dirs.map(dir => {
    console.log('now processing next dir:', dir);
    let files = findFiles(dir);
    let offset = nextOffset;
    nextOffset = ('1' + (nextOffset + files.length)) - (nextOffset + files.length); // each dir gets its own space to form unique ids. 10 100 1000
    return {dir, offset, files};
  });

  allFiles(files);

  console.timeEnd('Process all dirs');

  process.exit();
}

function allFiles(files) {
  let dirOutputs = files.map(({dir, offset, files}) => {
    return [
      '// ' + dir,
      ...
        files
          .map((file, i) => {
            let fid = i + offset;
            let desc = file.slice(hfConfig.input.projectRoot.length && file.startsWith(hfConfig.input.projectRoot) ? hfConfig.input.projectRoot.length : dir.length);
            let transformOutput = transformFile(file, fid, desc);
            return {file, fid, transformOutput, desc};
          })
    ];
  });

  if (ALSO_VIEW_CODE) {
    let viewCodes = dirOutputs
      .map(fileOutputs =>
        fileOutputs
          .slice(1) // dir header
          .map((obj) => {
            let {file, fid, transformOutput, desc} = obj;
            return '// ' + fid + ': ' + file + '\n' + 'bootstrap('+fid+', `' + bootstrapEscape(transformOutput.view) + "`, " + transformOutput.contexts + ", '" + desc + "');\n"
          })
          .join('\n\n')
      )
      .join('\n\n');

    if (hfConfig.output.tty || hfConfig.input.cli) {
      console.log('view codes:\n', viewCodes);
    } else {
      console.log('Writing html to data.view.js');
      fs.writeFileSync('data.view.js', viewCodes);
    }
  }
}

function transformFile(file, fid, fdesc = file) {
  let input = fs.readFileSync(file, 'utf8');
  console.log('Read', input.length, 'bytes from', file);

  console.time('Finished transformation');
  let transformOutput = transformCode(babel, input, fid, fdesc, ALSO_VIEW_CODE);
  console.timeEnd('Finished transformation');

  let run =
    ((!hfConfig.output.headerFile || hfConfig.output.headerFile === file) ? prelude(file) : '') +
    transformOutput.run +
    ((!hfConfig.output.headerFile || hfConfig.output.headerFile === file) ? postlude : '');

  if (hfConfig.output.tty || hfConfig.input.cli) {
    if (ALSO_RUN_CODE) console.log('run code:\n', run);
    if (ALSO_VIEW_CODE) {
      console.log('view code:\n', transformOutput.view);
      console.log('contexts:\n', transformOutput.contexts);
    }
  } else {
    if (ALSO_RUN_CODE) {
      if (hfConfig.output.inline) {
        console.log('Over-writing output to', file);
        fs.writeFileSync(file, run);
      } else {
        console.log('Writing output to output.run.js');
        fs.writeFileSync('output.run.js', run);
      }
    }
  }

  return transformOutput;
}

function findFiles(dir, file = '', files = [], silent = true, dirsToo = false) {
  let combo = path.join(dir, file);
  if (!fs.statSync(combo).isFile()) {
    if (!silent) console.log('findFiles dir:', combo);
    fs.readdirSync(combo + '/').forEach(s => findFiles(combo + '/', s, files, silent, dirsToo));
    if (dirsToo) files.push(combo);
  } else {
    if (combo.endsWith('.js')) {
      if (!silent) console.log('findFiles file:', combo);
      files.push(combo);
    }
  }

  return files;
}

function bootstrapEscape(code) {
  return code.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}
