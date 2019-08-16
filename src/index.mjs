let prefix = 'file://';
let __url = import.meta.url;
let __file = __url.slice(__url.indexOf(prefix) + prefix.length);
let __dir = ''; // path.dirname(__file);

window.lastData = '';
window.envIds = [];

console.log('url:', __url);
console.log('dir:', __dir);
console.log('file:', __file);

let openedMenuPanel /*: files | stats*/ = 'files';
let fileOrder /* fid | freq */ = 'freq';
let currentFileComputedStats = {};

// location.search may be `undefined`, otherwise it's the query part of the url, starting with `?`
const URL_PARAMS = (location.search || '').slice(1).split('&').map(kv => kv.split('=')).map(([key, ...value]) => ({key, value: value.join('=')}));
const TARGET_ENV = URL_PARAMS.reduce((goal, {key, value}) => key === 'env' ? value : goal, undefined);
const BUILD_ID = URL_PARAMS.reduce((goal, {key, value}) => key === 'BUILD_ID' ? value : goal, undefined);

let frozen = false; // stop updating stats?
window.statsCache = {}; // Consider this immutable (assumed to be like that for baseline)
let statsBaseline; // If some count exists in this struct then substract it from the actual current count
window.fileData = {};
window.currentEnvId = '';
let currentFid = -1;
let regenFileListTimer;
let regenStatsPanelTimer;

let bootstrap = window.bootstrap = function(fid, html, contexts, fname) {
  console.log('bootstrapping', html.length, 'bytes for fid =', fid, ';', fname);
  fileData[fid] = {html, fid, fname, contexts};
  if (currentFid === -1) {
    change(fid);
  }

  scheduleFileListRegen();
};

function getFileCount(envId, fid) {
  const abs = (statsCache && statsCache[envId] && statsCache[envId][fid] && statsCache[envId][fid].hit) | 0;
  const offset  = (statsBaseline && statsBaseline[envId] && statsBaseline[envId][fid] && statsBaseline[envId][fid].hit) | 0;
  return abs - offset;
}
function getNidCount(statsCache, envId, fid, nid) {
  const abs = getCount(statsCache, envId, fid, nid);
  const offset = getCount(statsBaseline, envId, fid, nid);
  return abs - offset;
}
function getNidObjOptional(store, envId, fid, nid) {
  return store && store[envId][fid] && store[envId][fid] && store[envId][fid].bynid[nid];
}
function getCount(store, envId, fid, nid) {
  let nobj = getNidObjOptional(store, envId, fid, nid);
  return (nobj && nobj.hit) | 0;
}

window.focusEnv = function focusEnv(envId) {
  currentEnvId = envId;
  requestCurrentStats(true);
};

window.updateEnvIds = () => {
  console.log('Updating envs...', envIds);
  if (!currentEnvId && envIds.length) {
    currentEnvId = envIds[0];
  }
  updateUI(
    $envs, '$envs',
    (!envIds || !envIds.length) ? '<span style="color: #b06b00">' + (
        TARGET_ENV === 'log' ? '(Server is waiting for phone to start logging stats...)' :
        TARGET_ENV === 'emu' ? '(Server is waiting for webpack to complete and for emu to start posting stats)' :
       '(Server has no env ids yet, wait for phone to connect, webpack to finish, or emu to start posting?)'
      ) + '</span>' :
      envIds.map(envId => `
        <label>
            <input type="radio" name="select_env" value="${envId}" onclick="focusEnv(\'${envId}\'); scheduleFileListRegen()" ${currentEnvId === envId ? 'checked' : ''}> 
            ${envId}
        </label>
      `).join('\n')
  );
}

window.recreateFileList = function recreateFileList() {
  // Don't call directly, call scheduleFileListRegen() instead
  // console.log('recreateFileList', currentEnvId, window.currentEnvId === currentEnvId);
  if (openedMenuPanel !== 'files') return;
  updateUI($side_panel_menu, '$side_panel_menu', `
    Sorted by
    <label><input id="$sort_by_fid" type="radio" name="fid-order" onclick="$sort_by_fid_onclick()" ${fileOrder === 'fid' ? 'checked' : ''}> fid</label>
    <label><input id="$sort_by_freq" type="radio" name="fid-order" onclick="$sort_by_freq_onclick()"  ${fileOrder === 'fid' ? '' : 'checked'}> freq</label>
  `);
  updateEnvIds();

  let maxCount = 0;
  let maxFid = 0;
  let fids = [];
  for (const fid in fileData) {
    if (fid > maxFid) maxFid = fid;
    let n = getFileCount(currentEnvId, fid);
    if (n > maxCount) maxCount = n;
    fids.push(parseInt(fid, 10));
  }

  let slen = String(maxCount).length;

  if (fileOrder === 'fid') {
    fids.sort((a,b) => a-b);
  } else if (fileOrder === 'freq') {
    fids.sort((a, b) => {
      let A = getFileCount(currentEnvId, a);
      let B = getFileCount(currentEnvId, b);
      return B - A;
    });
  } else {
    throw new Error('enum');
  }

  let text = '<span>' + (' '.repeat(Math.max(0, String(maxFid).length))) + 'fid   ' + (' ' .repeat(Math.max(0, String(maxCount).length - 5))) + 'count</span>\n';
  fids.forEach(fid => {
    let n = getFileCount(currentEnvId, fid);
    let red = n ? Math.round((n / maxCount) * 100) : 0;
    text += `<span 
        class="changer" 
        style="${currentFid == fid ? 'background-color: lightgreen' : ''}"
        onclick="change(${fid});" 
      >${String(fid).padStart(5, ' ')} [${String(n).padStart(slen, ' ')}] : <span red="r${red}">${fileData[fid].fname}</span></span>
`;
  });
  updateUI($side_panel_body, '$side_panel_body', text);
};

window.change = function change(fid) {
  currentFid = fid;
  updateUI($current_file_name, '$current_file_name', fileData[fid].fname);
  updateUI($output_file, '$output_file', fileData[fid].fname);
  updateUI($output_code, '$output_code', fileData[fid].html);

  $output_code.querySelectorAll('span.nid').forEach(span => span.title = '0x (never executed)');

  updateStats(currentEnvId, fid);
};

let updateStats = (envId, fid) => {
  if (fid < 0) return; // no file selected (startup)
  if (!statsCache) return;
  if (!statsCache[envId]) return;

  scheduleFileListRegen();
  scheduleStatsPanelRegen();

  if (!statsCache[envId][fid]) return;
  let obj = statsCache[envId][fid];
  let bynid = obj.bynid;
  if (!bynid) return;
  if (!fileData[fid]) return;
  let contexts = fileData[fid].contexts;
  console.log('  updateStats!');

  // This can be optimized a bit... not sure if we need to :)

  // Gather stats on the stats
  let max = 0;
  let topStatements = []; // top 10? 20?
  let funcNids = {};
  let funcMax = 0;
  for (let nid in bynid) {
    let v = getNidCount(statsCache, envId, fid, nid);
    if (v > max) max = v;

    if (topStatements.length < 10) {
      topStatements.push({nid, v});
      topStatements.sort(({v: a}, {v: b}) => a-b);
    } else if (v > topStatements[0].v) {
      topStatements[0] = {nid, v};
      topStatements.sort(({v: a}, {v: b}) => a-b);
    }

    if (contexts[nid]) {
      contexts[nid].forEach(nid => {
        if (funcNids[nid] === undefined) funcNids[nid] = v;
        else funcNids[nid] += v;
        funcMax += v;
      });
    }
  }
  console.log(funcNids)
  currentFileComputedStats.max = max;
  currentFileComputedStats.topStatements = topStatements;

  // Update UI with new stats
  let updates/*: Array<{title: string, attrs: Array<[string, string]>}>*/ = new Map;

  for (let nid in funcNids) {
    let count = funcNids[nid];
    let title = 'Statements executed inside func (recursively):\n' + percentage(count, funcMax);
    let blue = count ? Math.round((count / funcMax) * 100) : 0;
    updates.set(nid, {
      title,
      attrs: [['blue', 'b' + blue]],
    });
  }

  for (let nid in bynid) {
    let title = '';

    let nobj = getNidObjOptional(statsCache, envId, fid, nid);

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
      // Note: The `funcNids` list is not necessarily complete because it does not include functions that
      // have never been called (instantiation is not sufficient for this list)
      title = (nid in funcNids ? 'Function instantiations:\n' : 'Statement executions:\n') + title;
      if (updates.has(nid)) {
        let upd = updates.get(nid);
        upd.attrs.push(['red', 'r' + red]);
        upd.title += '\n' + title;
      } else {
        updates.set(nid, {
          title,
          attrs: [['red', 'r' + red]],
        });
      }
    }
  }

  updates.forEach(({attrs, title}, nid) => {
    let e = document.getElementById('nid' + nid);
    // The element may not exist, although we may have to warn against this... not sure what the valid reasons remain
    if (e) {
      attrs.forEach(([name, val]) => e.setAttribute(name, val));
      e.title = title;
    }
  });
};

window.scheduleFileListRegen = function scheduleFileListRegen() {
  // console.log('scheduleFileListRegen()');
  if (!regenFileListTimer) regenFileListTimer = setTimeout(() => regenFileListTimer = recreateFileList(), 10);
};

function percentage(n, total, pad) {
  return (pad ? String(n).padStart(String(total).length, ' ') : n) + ' / ' + total + ' (' + (Math.round((n / total) * 10000) / 100)+ '%)';
}

window.scheduleStatsPanelRegen = function scheduleStatsPanelRegen() {
  if (!regenStatsPanelTimer) regenStatsPanelTimer = setTimeout(() => regenStatsPanelTimer = updateStatsPanel(), 10);
};

function updateStatsPanel() {
  // Don't call directly, call scheduleStatsPanelRegen() instead
  if (openedMenuPanel !== 'stats') return;

  // List of most executed functions
  // List of most executed statements

  let fobj = statsCache && statsCache[currentEnvId] && statsCache[currentEnvId][currentFid];
  if (!fobj) {
    updateUI($side_panel_menu, '$side_panel_menu', 'Unable to display stats: no stats found for this env/file');
    return;
  }

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
  console.log(++updateCounter, 'Calling HF_UPDATE with', JSON.stringify(data).length, 'bytes, compileId =', data.compileId, ', envId =', data.envId);
  if (data.envId === currentEnvId) {
    let switched = !currentEnvId;
    if (switched) {
      currentEnvId = data.envId;
      console.log('Changing to envId =', currentEnvId);
      // scheduleFileListRegen(); // --> called by updateStats
    }
    if (switched || !statsCache || !statsCache[currentEnvId] || data.count !== statsCache[currentEnvId].count) {
      // Create a new reference because otherwise baseline won't work
      statsCache = {...statsCache, [currentEnvId]: data};
      window.lastData = data;
      updateStats(currentEnvId, currentFid);
    }
  }
};

function fetchFail(e) {
  console.log('The script threw an error!', e);
  updateUI(
    $envs, '$envs',
    '<span style="color:red">There was a problem connecting to the proxy...</span>'
  );
}

function requestCurrentStats(forced = false) {
  let e = document.createElement('script');
  // e.src = '../stats.js?' + Math.random();
  e.src = 'http://localhost:3000/' + currentEnvId + '?' + (forced?'forced&':'') + Math.random(); // src/serve.js
  e.onload = () => document.body.removeChild(e);
  e.onerror = fetchFail;
  document.body.appendChild(e);
}
setInterval(requestCurrentStats, 1000);
function requestEnvIds() {
  let e = document.createElement('script');
  e.src = 'http://localhost:3000/envs.js?' + Math.random(); // src/serve.js
  e.onload = () => { document.body.removeChild(e); updateEnvIds(); };
  e.onerror = fetchFail;
  document.body.appendChild(e);
}
setInterval(requestEnvIds, 5000);

let displayCache = {};
function updateUI(obj, key, value) {
  if (displayCache[key] !== value) {
    obj.innerHTML = value;
    displayCache[key] = value;
  }
}

window.$sort_by_fid_onclick = () => {
  fileOrder = 'fid';
  scheduleFileListRegen();
};
window.$sort_by_freq_onclick = () => {
  fileOrder = 'freq';
  scheduleFileListRegen();
};

$toggle_baseline.onclick = () => {
  statsBaseline = statsBaseline ? undefined : statsCache;
  updateUI($toggle_baseline, '$toggle_baseline', statsBaseline ? 'Baseline SET' : 'Toggle Baseline');
  scheduleFileListRegen();
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
    scheduleFileListRegen();
  }
};
$toggle_menu_stats.onclick = () => {
  if (openedMenuPanel !== 'stats') {
    openedMenuPanel = 'stats';
    $side_panel_menu.style.display = 'block';
    $side_panel_body.style.display = 'block';
    scheduleStatsPanelRegen();
  }
};
$toggle_menu_closed.onclick = () => {
  if (openedMenuPanel !== 'closed') {
    openedMenuPanel = 'closed';
    $side_panel_menu.style.display = 'none';
    $side_panel_body.style.display = 'none';
  }
};