let prefix = 'file://';
let __url = import.meta.url;
let __file = __url.slice(__url.indexOf(prefix) + prefix.length);
let __dir = ''; // path.dirname(__file);

console.log(__url);
console.log(__dir);
console.log(__file);
//
// console.time('Finished');
// let run = transformCodeToRun(Babel, input);
// console.timeEnd('Finished');
// console.log('run:\n', run);
//
// console.time('Finished');
// let show = transformCodeToShow(Babel, input);
// console.timeEnd('Finished');
// console.log('code:\n', show);

let openedMenuPanel /*: files | stats*/ = 'files';
let fileOrder /* fid | freq */ = 'fid';
let currentFileComputedStats = {};

let frozen = false; // stop updating stats?
let statsCache; // Consider this immutable (assumed to be like that for baseline)
let statsBaseline; // If some count exists in this struct then substract it from the actual current count
let fileData = {};
let currentFid = -1;
let regenFileListTimer;
let bootstrap = window.bootstrap = (fid, html, fname) => {
  console.log('bootstrapping', html.length, 'bytes for fid =', fid, ';', fname);
  fileData[fid] = {html, fid, fname};
  if (currentFid === -1) {
    change(fid);
  }

  if (!regenFileListTimer) regenFileListTimer = setTimeout(() => regenFileListTimer = recreateFileList(), 10);
};

function getFileCount(fid) {
  const abs = (statsCache && statsCache[fid] && statsCache[fid].hit) | 0
  const offset  = (statsBaseline && statsBaseline[fid] && statsBaseline[fid].hit) | 0
  return abs - offset;
}
function getNidCount(fid, nid) {
  const abs = getCount(statsCache, fid, nid);
  const offset = getCount(statsBaseline, fid, nid);
  return abs - offset;
}
function getNidObjOptional(store, fid, nid) {
  return store && store[fid] && store[fid].bynid[nid];
}
function getCount(store, fid, nid) {
  let nobj = getNidObjOptional(store, fid, nid);
  return (nobj && nobj.hit) | 0;
}

function recreateFileList() {
  if (openedMenuPanel !== 'files') return;
console.log('recreateFileList')
  updateUI($side_panel_menu, '$side_panel_menu', `
    Sorted by
    <label><input id="$sort_by_fid" type="radio" name="fid-order" onclick="$sort_by_fid_onclick()" ${fileOrder === 'fid' ? 'checked' : ''}> fid</label>
    <label><input id="$sort_by_freq" type="radio" name="fid-order" onclick="$sort_by_freq_onclick()"  ${fileOrder === 'fid' ? '' : 'checked'}> freq</label>
  `);

  let max = 0;
  let fids = [];
  for (const fid in fileData) {
    let n = getFileCount(fid);
    if (n > max) max = n;
    fids.push(parseInt(fid, 10));
  }

  let slen = String(max).length;

  if (fileOrder === 'fid') {
    fids.sort((a,b) => a-b);
  } else if (fileOrder === 'freq') {
    fids.sort((a, b) => {
      let A = getFileCount(a);
      let B = getFileCount(b);
      return B - A;
    });
  } else {
    throw new Error('enum');
  }

  let text = '';
  fids.forEach(fid => {
    let n = getFileCount(fid);
    let red = n ? Math.round((n / max) * 100) : 0;
    text += `<span 
        class="changer" 
        style="${currentFid == fid ? 'background-color: lightgreen' : ''}"
        onclick="change(${fid});" 
      >${String(fid).padStart(5, ' ')} [${String(n).padStart(slen, ' ')}] : <span red="r${red}">${fileData[fid].fname}</span></span>
`;
  });
  updateUI($side_panel_body, '$side_panel_body', text);
}

window.change = function change(fid) {
  currentFid = fid;
  updateUI($current_file_name, '$current_file_name', fileData[fid].fname);
  updateUI($output_file, '$output_file', fileData[fid].fname);
  updateUI($output_code, '$output_code', fileData[fid].html);

  $output_code.querySelectorAll('span.nid').forEach(span => span.title = '0x (never executed)');

  updateStats(fid);
};

let updateStats = window.update = () => {
  if (currentFid < 0) return; // no file selected (startup)
  if (!statsCache) return;
  if (!statsCache[currentFid]) return; // not sure about this one

  // This can be optimized a bit... not sure if we need to :)

  let max = 0;
  let topStatements = []; // top 10? 20?
  let obj = statsCache[currentFid].bynid;
  for (let nid in obj) {
    let v = getNidCount(currentFid, nid);
    if (v > max) max = v;

    if (topStatements.length < 10) {
      topStatements.push({nid, v});
      topStatements.sort(({v: a}, {v: b}) => a-b);
    } else if (v > topStatements[0].v) {
      topStatements[0] = {nid, v};
      topStatements.sort(({v: a}, {v: b}) => a-b);
    }
  }
  currentFileComputedStats.max = max;
  currentFileComputedStats.topStatements = topStatements;

  for (let nid in obj) {
    let e = document.getElementById('nid' + nid);
    // The element may not exist, although we may have to warn against this... not sure what the valid reasons remain
    if (e) {
      let title = '';

      let nobj = getNidObjOptional(statsCache, currentFid, nid);

      let hits = nobj.hit | 0;
      let red = 0;

      if (hits > 0) {
        title = hits + ' / ' + max + ' (' + (hits ? ((hits / max) * 100).toFixed(2) + '%' : 'never') + ')';
        red = Math.round((hits / max) * 100);
      }

      // If this is an expression with type tracking then .t or .f must be >0 (otherwise it's not tracked or never visited)
      if (nobj.t > 0 || nobj.f > 0) {
        if (hits) title += '\n';
        title += [
          'truthy: ' + percentage(nobj.t, nobj.t + nobj.f),
          'falsy: ' + percentage(nobj.f, nobj.t + nobj.f),
          Object.getOwnPropertyNames(nobj.type).map(type => ' - ' + type + ': ' + percentage(nobj.type[type], nobj.t + nobj.f)).join('\n'),
        ].join('\n');
      }

      if (title !== '') {
        e.setAttribute('red', 'r' + red);
        e.title = title;
      }
    }
  }

  if (!regenFileListTimer) regenFileListTimer = setTimeout(() => regenFileListTimer = recreateFileList(), 10);
  updateStatsPanel();
};

function percentage(n, total, pad) {
  return (pad ? String(n).padStart(String(total).length, ' ') : n) + ' / ' + total + ' (' + (Math.round((n / total) * 10000) / 100)+ '%)';
}

function updateStatsPanel() {
  if (openedMenuPanel !== 'stats') return;

  // List of most executed functions
  // List of most executed statements

  if (!statsCache || !statsCache[currentFid]) {
    updateUI($side_panel_menu, '$side_panel_menu', 'Unable to display stats: no stats found for this file');
    return;
  }

  let fobj = statsCache && statsCache[currentFid];

  updateUI($side_panel_menu, '$side_panel_menu', '');
  updateUI($side_panel_body, '$side_panel_body', `<pre>
  Stats for the current file
  
  Total hits: ${fobj.hit}
  Highest hit: ${currentFileComputedStats.max} (heatmap is relative to this figure)
    
${Object.getOwnPropertyNames(fobj.bytype).map(
  name => '    ' + ({
    i: 'IfStatement',
    w: 'WhileStatement',
    d: 'DoWhileStatement',
    f: 'ForStatement',
    fi: 'ForInStatement',
    r: 'ReturnStatement',
    D: 'DebuggerStatement',
    e: 'EmptyStatement',
    W: 'WithStatement',
    E: 'ExpressionStatement',
    b: 'BlockStatement',
    l: 'LabeledStatement',
    B: 'BreakStatement',
    c: 'ContinueStatement',
    s: 'SwitchStatement',
    t: 'TryStatement',
    T: 'ThrowStatement',
    fo: 'ForOfStatement',
    F: 'FunctionDeclaration',
    V: 'VariableDeclaration',
    C: 'ClassDeclaration',
  }[name]||name).padEnd('FunctionDeclaration'.length + 5, ' ') + ': ' + 
    percentage(fobj.bytype[name], fobj.hit, true)
  ).join('\n')
}    
  
  Most frequent statements:
  
${currentFileComputedStats.topStatements.reverse().map(
  ({nid, v}) => {
    let e = document.createElement('nid' + nid);
    let desc = e ? e.innerHTML : '???';
    return '    <span onclick="location.hash = `nid' + nid + '` " style="cursor: pointer; color: blue;">' + nid + '</span>: ' + desc + ' :: ' + percentage(v, currentFileComputedStats.max, true);
  }).join('\n')
}
  </pre>`
  );
}


let updateCounter = 0;
window.HF_UPDATE = data => {
  if (frozen) return;
  console.log(++updateCounter, 'Calling HF_UPDATE with', JSON.stringify(data).length, 'bytes');
  if (!statsCache || data.count !== statsCache.count) {
    statsCache = data;
    window.lastData = data;
    updateStats(currentFid);
  }
};

setInterval(() => {
  let e = document.createElement('script');
  // e.src = '../stats.js?' + Math.random();
  e.src = 'http://localhost:3000/?' + Math.random(); // src/serve.js
  e.onload = () => document.body.removeChild(e);
  e.onerror = () => console.log('The script threw an error!', e);
  document.body.appendChild(e);
}, 1000);

let displayCache = {};
function updateUI(obj, key, value) {
  if (displayCache[key] !== value) {
    obj.innerHTML = value;
    displayCache[key] = value;
  }
}

window.$sort_by_fid_onclick = () => {
  fileOrder = 'fid';
  if (!regenFileListTimer) regenFileListTimer = setTimeout(() => regenFileListTimer = recreateFileList(), 10);
};
window.$sort_by_freq_onclick = () => {
  fileOrder = 'freq';
  if (!regenFileListTimer) regenFileListTimer = setTimeout(() => regenFileListTimer = recreateFileList(), 10);
};

$toggle_baseline.onclick = () => {
  statsBaseline = statsBaseline ? undefined : statsCache;
  updateUI($toggle_baseline, '$toggle_baseline', statsBaseline ? 'Baseline SET' : 'Toggle Baseline');
  recreateFileList();
};
$toggle_freeze.onclick = () => {
  frozen = !frozen;
  updateUI($toggle_freeze, '$toggle_freeze', frozen ? 'FROZEN' : 'Toggle Freeze');
};

$toggle_menu_files.onclick = () => {
  if (openedMenuPanel !== 'files') {
    openedMenuPanel = 'files';
    $side_panel_menu.style.display = 'block';
    $side_panel_body.style.display = 'block';
    recreateFileList();
  }
};
$toggle_menu_stats.onclick = () => {
  if (openedMenuPanel !== 'stats') {
    openedMenuPanel = 'stats';
    $side_panel_menu.style.display = 'block';
    $side_panel_body.style.display = 'block';
    updateStatsPanel();
  }
};
$toggle_menu_closed.onclick = () => {
  if (openedMenuPanel !== 'closed') {
    openedMenuPanel = 'closed';
    $side_panel_menu.style.display = 'none';
    $side_panel_body.style.display = 'none';
  }
};