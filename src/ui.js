// jit info not showing NaN option
// functions (clickthrough) cant be clicked
// can we track whether return value is dropped? like `f()` vs `x=f()` or `x(f())`?
// add macros for heatfiler where certain stats are inlined like as a comment or something, to actually display percentages etc.
// the "most called functions" dropdown should ignore excluded functions from stats, have pagination.
// report NaN's (and perhaps Infinity as well). maybe scream this.
// option to hide artifact characters

var IDENTIFIER = 13;
var WHITE = 18;
var ui = {
  heatmapLineHeight: 17,

  updateTimer: -1,
  currentFid: -1,
  currentHf: null,
  currentSource: '',
  currentNodeFile: '',
  elements: null, // array of all interesting elements from heatmap
  trees: null, // parse trees (only when showLocal is used)

  focusStart: 0,
  focusStop: 0,

  excludedRanges: {},

  modeFileRelative: true,
  modePauseUpdating: false,
  modeCodeCoverage: false,
  modeLineNumbers: true,

  localStorageRunInputCodeKey: 'heatfiler-run-code',
  localStorageRunInputFilesKey: 'heatfiler-run-files',
  localStorageOutputFileKey: 'heatfiler-output-file',

  funcTokenIdPrefix: 'func-id-',

  defaultCode:
    'for (var i=0; i<1000; ++i) {\n' +
      '  if (Math.random() < 0.3 || Math.random() < 0.3 || Math.random() < 0.3) (function(a,b,c){ return "A" })();\n' +
      '  else if (Math.random() < 0.3) (function(a,d){ return; })();\n' +
      '  else (function(x,y){ return "B" })();\n' +
    '}',
  defaultFiles:
    '@ console.log(\'Starting now...\');\n' +
    '- ../lib/uni.js\n' +
    '+ ../lib/tok.js\n' +
    '+ ../lib/par.js\n' +
    '# this is where the parsing should start...\n' +
    '@ fetch(["../lib/par.js"], function(files,contents){console.log(\'Parsing now...\'); Par.parse(contents[0], {saveTokens:true, createBlackStream: true}); console.log(\'Parsing should be done...\');});\n' +
    '',
  defaultOutputFile: '../stats.js',

  clean: function(){
    ui.updateTimer = clearInterval(ui.updateTimer);

    ui.currentFid = -1;
    ui.currentHf = null;
    ui.currentSource = '';
    ui.currentNodeFile = '';
    ui.elements = null;
    ui.trees = null;
    ui.focusStart = 0;
    ui.focusStop = 0;

    qs('#heatmap').innerHTML = '';

    var thumb = qs('#thumb');
    if (thumb) thumb.parentNode.removeChild(thumb);

    ui.modePauseUpdating = false;
    var cb = qs('#mode-pause input');
    if (cb && cb.checked !== ui.modePauseUpdating) cb.click();
  },

  getInput: function(path){
    return qs(path+' .input').value;
  },
  setOutput: function(path, output){
    var outTa = qs(path+' .output');
    outTa.querySelector('textarea').value = output;
    outTa.className = 'output visible';
  },

  runLocal: function(hf, toLocalStorage){
    var showFileIndex = 0;
    var fid = hf.profiledFidMap[showFileIndex];

    hf.exposeGlobals(toLocalStorage);
    if (toLocalStorage) hf.toLocalStorage('meta');
    hf.run(fid);
  },

  showLocal: function(hf, source, file){
    ui.currentHf = hf;
    ui.currentNodeFile = file;
    ui.currentSource = source;
    ui.trees = {};

    ui.openTab('result');
    ui.openFile(hf.profiledFidMap[0], true);
    ui.startUpdater();
  },
  updateFileList: function(){
    var ul = qs('.result.paig .files');
    if (ui.currentHf.profiledFidMap.length > 1) {
      ul.className = 'files visible';
      ul.innerHTML =
        ui.currentHf.profiledFidMap.map(function(fid){
          return '<li data-fid="'+fid+'">'+ui.sanitizeFilename(ui.currentHf.fileNames[fid])+'</li>';
        }).join('');
      ul.querySelectorAll('li')[ui.currentHf.profiledFidMap.indexOf(ui.currentFid)].className += 'opened';
    } else {
      ul.className = 'files';
    }
  },
  sanitizeFilename: function(f){
    return f.replace(/^\s*[+-]\s*/, '');
  },
  prevBlack: function(tree, index){
    --index;
    while (index >= 0 && tree[index].type === WHITE) --index;
    return tree[index];
  },
  setHeatmap: function(){
    var tree = ui.trees[ui.currentFid];

    var hm = gebi('heatmap');
    hm.innerHTML = transformer.heatmap(tree, false, ui.focusStart, ui.focusStop);
    ui.elements = null;

    hm.onclick = function(e){
      var id = e.target.id;
      var cn = e.target.className;
      if (id.slice(0, ui.funcTokenIdPrefix.length) === ui.funcTokenIdPrefix ) {
        ui.focusFunction(tree, parseInt(id.slice(ui.funcTokenIdPrefix.length), 10));
      } else if (cn === 'function-focus') {
        ui.focusFunction(tree, parseInt(e.target.getAttribute('data-index'), 10));
      } else if (cn === 'function-exclude') {
        ui.excludeFunction(tree, parseInt(e.target.getAttribute('data-index'), 10));
      }
    };
  },
  excludeFunction: function(tree, index){
    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];
    var funcObj = page.functions[index];
    if (funcObj) {
      // probably works. :) this makes it exclude it from the most called funcs as well.
      funcObj.excluded = !funcObj.excluded;
    }


    var token = tree[index];
    var to = token.rhc.white;

    var found = false;
    var excluded = ui.excludedRanges[ui.currentFid];
    if (!excluded) excluded = ui.excludedRanges[ui.currentFid] = {};

    while (index <= to) {
      if (excluded[index]) delete excluded[index];
      else excluded[index] = true;
      ++index;
    }

  },
  focusFunction: function(tree, index){
    // include name of object literal key or var assignment
    var from = index;
    var prev = ui.prevBlack(tree, index);
    if (prev.value === ':' || prev.value === '=') {
      var pprev = ui.prevBlack(tree, prev.white);
      if (pprev.type === IDENTIFIER) from = pprev.white;
    }

    if (ui.focusStart === from) {
      ui.openFile(ui.currentFid, true);
      gebi(ui.funcTokenIdPrefix+index).scrollIntoView();
    } else {
      var ft = ui.trees[ui.currentFid][index];
      var to = ft.rhc.white;
      ui.setFocus(from, to, index);
    }
  },
  updateThumb: function(){
    del('thumb');
    del('thumb-handler');
    del('thumb-viewport');

    var thumb = document.createElement('div');
    thumb.id = 'thumb';
    thumb.innerHTML = '<pre>'+ui.currentHf.generateThumb(ui.currentFid, ui.focusStart, ui.focusStop)+'</pre>';
    document.body.appendChild(thumb);

    var so = getComputedStyle(thumb);
    var sw = parseInt(so.width, 10);
    var sh = parseInt(so.height, 10);

    var tw = document.documentElement.clientWidth;
    var th = document.documentElement.clientHeight;

    var marginTop = gebi('heatmap').offsetTop;

    var zy = th/sh;

    if (zy >= 1) {
      // all that work for nothing :'(
      document.body.removeChild(thumb);
      return;
    }

    // you basically want the left-most 800 px (100*8) compressed to 200px
    // then you want to make sure that these 800 px are visible, and the rest are not

    var zx = 0.25;
    var visibleWidth = 800;

    thumb.setAttribute('style',
      '-webkit-transform-origin: '+visibleWidth+'px 0; ' +
      '-webkit-transform: scaleX('+zx+') scaleY('+zy+'); ' +
      'transform-origin: '+visibleWidth+'px 0; ' +
      'transform: scaleX('+zx+') scaleY('+zy+'); ' +
      'width:'+visibleWidth+'px;'
    );

    var handler = document.createElement('div');
    handler.id = 'thumb-handler';
    handler.setAttribute('style',
      'width:'+(visibleWidth*zx)+'px; ' +
      'height:'+th+'px; '
    );
    document.body.appendChild(handler);

    var viewport = document.createElement('div');
    viewport.id = 'thumb-viewport';
    viewport.setAttribute('style',
      'width: '+Math.floor(visibleWidth*zx)+'px;' +
      'height: '+Math.floor(th*zy)+'px;'
    );
    document.body.appendChild(viewport);

    window.onscroll = function(e){
      var offsetTop = Math.max(0, (document.documentElement.scrollTop || document.body.scrollTop)-marginTop);
      viewport.style.top = Math.floor(offsetTop*zy)+'px';
    };

    var isDown = false;
    handler.onmousedown = function(e){
      isDown = true;
      var y = Math.floor((marginTop*zy) + Math.max(0, e.clientY-((th*zy)/2)));
      var offsetTop = Math.floor(y / zy);
      document.documentElement.scrollTop = document.body.scrollTop = offsetTop;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    handler.onmousemove = function(e){
      if (isDown) {
        var y = Math.floor((marginTop*zy) + Math.max(0, e.clientY-((th*zy)/2)));
        var offsetTop = Math.floor(y / zy);
        document.documentElement.scrollTop = document.body.scrollTop = offsetTop;
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    handler.onmouseup = function(e){
      isDown = false;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
  },
  updateLineNumbers: function(){
    var e = gebi('line-numbers');
    if (ui.modeLineNumbers) {
      var s = window.getComputedStyle(gebi('heatmap'));
      var lines = Math.ceil(parseInt(s.height, 10) / parseInt(s.lineHeight,10));
      var nums = Array.apply(null, new Array(lines)).map(function(o,i){ return i; }).join('\n');
      e.innerHTML = nums;
      e.className = 'visible';
    } else {
      e.className = 'invisible';
    }
  },
  updateAutoStart: function(){
    var args = location.hash.split(',');

    var pos = args.indexOf('start');
    if (pos >= 0) args.splice(pos, 1);
    else pos = args.length;

    var cb = qs('#mode-auto-start input');
    if (cb && cb.checked) args.splice(pos, 0, 'start');

    location.hash = args.join(',');
  },
  enableCodeCoverage: function(){
    gebi('heatmap').className = ui.modeCodeCoverage ? 'code-covering' : '';
    ui.applyStats();
  },

  getHeatmapElements: function(){
    // cache all important elements so we can update them quickly
    var excluded = ui.excludedRanges[ui.currentFid] || {};
    var stats = ui.currentHf.stats;
    if (!stats) return console.warn('avoided bug... are you sure you are using localstorage mode? not local page mode..');
    var page = stats[ui.currentFid];
    var all = [];
    for (var uid in page.statements) if (page.statements.hasOwnProperty(uid)) {
      // skip if not in focus
      if (ui.inFocus(uid)) {
        var e = gebi('id-'+uid);
        all.push({type:'stmt', uid:uid, dom:e});
        if (!e) console.log('error: statement element not found for ',page, uid);
        else e.className = 'heat stmt';
      }
    }
    for (var uid in page.expressions) if (page.expressions.hasOwnProperty(uid)) {
      if (ui.inFocus(uid)) {
        var e = gebi('id-'+uid);
        all.push({type:'expr', uid:uid, dom:e});
        if (!e) console.log('error: expression element not found for ',page, uid);
        else e.className = 'heat expr';
      }
    }
    for (var uid in page.functions) if (page.functions.hasOwnProperty(uid)) {
      if (ui.inFocus(uid)) {
        var e = gebi(ui.funcTokenIdPrefix+uid);
        all.push({type:'func', uid:uid, dom:e});
        if (!e) console.log('error: function element not found for ',page, uid);
        else e.className = 'heat func';
      }
    }
    for (var uid in page.arguments) if (page.arguments.hasOwnProperty(uid)) {
      if (ui.inFocus(uid)) {
        var e = gebi('id-'+uid);
        all.push({type:'arg', uid:uid, dom:e});
        if (!e) console.log('error: arg element not found for ',page, uid);
        else e.className = 'heat arg';
      }
    }
    for (var uid in page.qmarks) if (page.qmarks.hasOwnProperty(uid)) {
      if (ui.inFocus(uid)) {
        var e = gebi('qmark-id-'+uid);
        all.push({type:'qmark', uid:uid, dom:e});
        if (!e) console.log('error: arg element not found for ',page, uid);
        else e.className = 'heat qmark';
      }
    }
    for (var uid in page.macros) if (page.macros.hasOwnProperty(uid)) {
      if (ui.inFocus(uid)) {
        var e = gebi('id-'+uid);
        all.push({type:'macro', uid:uid, dom:e});
        if (!e) console.log('error: macro element not found for ',page, uid);
        else e.className = 'heat macro-name';
      }
    }

    return all;
  },
  startUpdater: function(){
    if (ui.updateTimer) console.warn('timer still running?');
    ui.updateTimer = setInterval(ui.refreshHeatmap, ui.currentSource === 'xhr' ? 2000 : 1000);
  },
  refreshHeatmap: function(){
    if (ui.modePauseUpdating) return;
    var hf = ui.currentHf;

    switch (ui.currentSource) {
      case 'storage':
        var stats = hf.fromLocalStorage('stats');
        if (stats.key !== hf.stats) {
          hf.stats = stats;
          ui.applyStats();
        }
        return;
      case 'local':
        ui.applyStats();
        return;
      case 'xhr':
        GET(ui.currentNodeFile, function(e, json){
          if (e) {
            clearInterval(ui.updateTimer);
            return console.log("stopping updater, there was a crash", e.toString());
          }
          var stats = JSON.parse(json).stats;
          if (stats.key !== hf.stats.key) {
            hf.stats = stats;
            ui.applyStats();
          }
        });
        return;
      default:
        console.warn('unknown source ['+ui.currentSource+']');
        return;
    }

    console.warn('This is a bug. Code should not reach here. Move it to applyStats()');
  },
  applyStats: function(){
    // collect all elements
    var all = ui.elements;
    if (all === 'crashed') {
      clearInterval(ui.updateTimer);
      return console.log("stopping updater, there was a crash");
    }
    if (!all) {
      ui.elements = 'crashed';
      all = ui.elements = ui.getHeatmapElements();
    } else if (!all.length) {
      console.log("no elements... refetching");
      all = ui.elements = ui.getHeatmapElements();
    }

    var max = 0;
    var stats = ui.currentHf.stats;
    if (!ui.modeCodeCoverage) {
      // determine max count
      for (var _fid in stats) if (stats.hasOwnProperty(_fid)) {
        if (!ui.modeFileRelative || +_fid === ui.currentFid) {
          var excluded = ui.excludedRanges[_fid] || {};

          var stmts = stats[_fid].statements;
          for (var _uid in stmts) if (stmts.hasOwnProperty(_uid)) {
            _uid = parseInt(_uid, 10);
            if (ui.inFocus(_uid) && !excluded[_uid]) {
              var o = stmts[_uid];
              if ((o.type === 'stmt' || o.type === 'expr') && o.count > max) max = o.count;
            }
          }
          var exprs = stats[_fid].expressions;
          for (var _uid2 in exprs) if (exprs.hasOwnProperty(_uid2)) {
            _uid2 = parseInt(_uid2, 10);
            if (ui.inFocus(_uid2) && !excluded[_uid2]) {
              var o = exprs[_uid2];
              if ((o.type === 'stmt' || o.type === 'expr') && o.count > max) max = o.count;
            }
          }
        }
      }

      if (!max) return;
    }

    var fid = ui.currentFid;
    var page = stats[fid];
    var excludedOnPage = ui.excludedRanges[fid] || {};

    all.forEach(function(o){
      switch (o.type) {
        case 'expr': var obj = page.expressions[o.uid]; break;
        case 'stmt': var obj = page.statements[o.uid]; break;
        case 'func': var obj = page.functions[o.uid]; break;
        case 'arg': var obj = page.arguments[o.uid]; break;
        case 'qmark': var obj = page.qmarks[o.uid]; break;
        case 'macro': var obj = page.macros[o.uid]; break;
        default: throw 'unknown type';
      }

      var e = o.dom;
      var excluded = excludedOnPage[o.uid];

      e.style.textDecoration = excluded ? 'line-through' : 'none';

      if (obj.isReturn) {
        var title =
          'Return ('+bignumsn(obj.count)+'), stats for _this_ return only:\n'+
          'T/F: '+bignums(obj.truthy)+' / '+bignums(obj.falsy)+
          ' (abs: '+percent(obj.truthy,obj.count)+'% / '+percent(obj.falsy,obj.count)+'%)' +
          ' (rel: '+percent(obj.truthy,max)+'% / '+percent(obj.falsy,max)+'%)\n' +
          'Types: '+(obj.types === undefined ? '' : obj.types)+
          ui.statsToString(obj.typeCount);
        if (ui.modeCodeCoverage) title += ' '; // force update when toggling code coverage
        if (e.title !== title) {
          e.title = title;
          if (ui.typeAttention(obj.types)) e.style.backgroundColor = 'rgb(255, 100, 255)';
        }
      } else if (obj.type === 'arg') {
        var title = 'Types: '+obj.types +ui.statsToString(obj.typeCount)+ (excluded?' ':'');
        if (ui.modeCodeCoverage) title += ' '; // force update when toggling code coverage
        if (e.title !== title) {
          e.title = title;
          if (excluded) e.style.backgroundColor = 'inherit';
          else if (ui.modeCodeCoverage) e.style.backgroundColor = '';
          else if (ui.typeAttention(obj.types)) e.style.backgroundColor = 'rgb(255, 100, 255)';
        }
      } else if (obj.isSwitch) {

        title = 'Switched: '+bignums(obj.count)+' ('+percent(obj.count, max)+'%)\n';
        title += 'Cases: '+obj.caseCounts.length+'\n';
        title += 'Counts: '+obj.caseCounts.map(bignums).join(', ')+'\n';
        title += 'Passes: '+obj.casePasses.map(bignums).join(', ')+'\n';
        var allPasses = obj.casePasses.reduce(function(t, n){ return t+n; });
        var fails = obj.count-allPasses;
        title += 'Switch passed '+bignums(allPasses)+' times and defaulted '+bignums(fails)+' times\n';
        var sum = 0;
        obj.casePasses.forEach(function(n,i){ sum += n * (i+1); });
        sum += fails * (obj.caseCounts.length+1); // defaults
        title += 'Average cases tested per check: ' + (Math.floor(sum*10 / obj.count)/10) + ' / ' + obj.caseCounts.length;

        if (e.title !== title) {
          e.title = title;
          if (excluded) {
            e.style.backgroundColor = 'inherit';
          } else if (ui.modeCodeCoverage) {
            e.style.backgroundColor = '';
          } else {
            var n = (255-Math.floor((obj.count / max)*255));
            e.style.backgroundColor = 'rgb(255, '+n+', '+n+')';
          }
        }
      } else if (obj.type === 'func') {
        var count = obj.truthy + obj.falsy;
        var funcname = e.getAttribute('data-func-name');
        var altname = e.getAttribute('data-func-alt-name');
        var title =
          (excluded ? '!! function excluded from counts !!\n' : '') +
          'Name: '+funcname+'\n'+
          (altname!=='undefined'?'(Or: '+altname+')\n':'')+
          (typeof obj.declared === 'number' ? 'Declared: '+bignumsn(obj.declared)+' x\n':'') +
          'Called: '+bignumsn(count)+' x\n' +
          'Return types: '+obj.types+
          ui.statsToString(obj.typeCount)+'\n'+
          'T/F: '+bignums(obj.truthy)+' / '+bignums(obj.falsy) +
          ' ('+percent(obj.truthy,count)+'% / '+percent(obj.falsy,count)+'%)\n' +
          'Statements stats:\n'+
          '  Switches: '+obj.switches.length+'; ran: '+obj.switches.map(bignums).join(', ')+'\n'+
          '  Cases: '+obj.cases.length+'; ran: '+obj.cases.map(bignums).join(', ')+'\n'+
          '  Ifs: '+obj.ifs.length+'; ran: '+obj.ifs.map(bignums).join(', ')+'\n'+
          '  Loops: '+obj.loops.length+'; ran: '+obj.loops.map(bignums).join(', ')+'\n'+
          ' Returns: '+obj.returns.length+'; ran: '+obj.returns.map(bignums).join(', ')+'\n'+
          '(Click to focus on function)';

        if (ui.modeCodeCoverage) title += ' '; // force update when toggling code coverage

        if (e.title !== title) {
          e.title = title;
          if (ui.modeCodeCoverage) e.style.backgroundColor = '';
          else if (ui.typeAttention(obj.types)) e.style.backgroundColor = 'rgb(255, 100, 255)';
          else e.style.backgroundColor = 'inherit';
        }
      } else if (obj.type === 'qmark') {
        title =
          'Ternary ('+bignumsn(obj.allCount)+'):\n' +
            ' - total T/F: '+bignums(obj.allTruthy)+' / '+bignums(obj.allFalsy)+
            ' (abs: '+percent(obj.allTruthy,obj.allCount)+'% / '+percent(obj.allFalsy,obj.allCount)+'%)' +
            ' (rel: '+percent(obj.allTruthy,max)+'% / '+percent(obj.allFalsy,max)+'%)\n' +
            ' - total types: '+obj.allTypes+
            ui.statsToString(obj.allTypeCount)+'\n'+
            '\n'+
            ' - condition T/F: '+bignums(obj.condTruthy)+' / '+bignums(obj.condFalsy)+
            ' (abs: '+percent(obj.condTruthy,obj.allCount)+'% / '+percent(obj.condFalsy,obj.allCount)+'%)' +
            ' (rel: '+percent(obj.condTruthy,max)+'% / '+percent(obj.condFalsy,max)+'%)\n' +
            ' - condition types: '+obj.condTypes+'\n' +
            '\n'+
            ' - mid T/F: '+bignums(obj.leftTruthy)+' / '+bignums(obj.leftFalsy)+
            ' (abs: '+percent(obj.leftTruthy,obj.allCount)+'% / '+percent(obj.leftFalsy,obj.allCount)+'%)' +
            ' (rel: '+percent(obj.leftTruthy,max)+'% / '+percent(obj.leftFalsy,max)+'%)\n' +
            ' - mid types: '+obj.leftTypes+'\n' +
            '\n'+
            ' - right T/F: '+bignums(obj.rightTruthy)+' / '+bignums(obj.rightFalsy)+
            ' (abs: '+percent(obj.rightTruthy,obj.allCount)+'% / '+percent(obj.rightFalsy,obj.allCount)+'%)' +
            ' (rel: '+percent(obj.rightTruthy,max)+'% / '+percent(obj.rightFalsy,max)+'%)\n' +
            ' - right types: '+obj.rightTypes;

        if (e.title !== title) {
          e.title = title;
          if (ui.typeAttention(obj.allTypes)) e.style.backgroundColor = 'rgb(255, 100, 255)';
        }
      } else if (obj.type === 'macro') {
        switch (obj.name) {
          case 'count-ranged':
            var total = 0;
            var title = '';
            for (var i = 0; i < obj.args.length; ++i) {
              var key = obj.args[i];
              var now = (obj[key]||0);
              total += now;
            }
            total += (obj[Infinity]||0);

            for (var i = 0; i < obj.args.length; ++i) {
              var key = obj.args[i];
              var now = (obj[key]||0);
              title += '\n<= '+key+': '+bignums(now)+'x (' + percent(now, total)+' %)';
            }
            now = (obj[Infinity]||0);
            title = 'Macro: count (ranged)\nTotal: ' +total+ '\n'+title+'\n>: '+now+'x (' + percent(now, total)+' %)';

            break;

          case 'count-exact':
            var total = 0;
            var title = '';
            for (var i = 0; i < obj.args.length; ++i) {
              var key = obj.args[i];
              var now = (obj[key]||0);
              total += now;
            }
            for (var i = 0; i < obj.args.length; ++i) {
              var key = obj.args[i];
              var now = (obj[key]||0);
              title += '\n'+key+': '+bignums(now)+'x (' + percent(now, total)+' %)';
            }
            title = 'Macro: count (exact)\nTotal: ' +total+ '\n'+title;

            break;

          case 'count-any':
            var total = 0;
            var title = '';
            var keys = Object.keys(obj.args);
            for (var i = 0; i < keys.length; ++i) {
              var key = keys[i];
              var now = (obj.args[key]||0);
              total += now;
            }
            for (var i = 0; i < keys.length; ++i) {
              var key = keys[i];
              var now = (obj.args[key]||0);
              title += '\n'+key+': '+bignums(now)+'x (' + percent(now, total)+' %)';
            }
            title = 'Macro: count (any)\nTotal: ' +total+ '\n'+title;

            break;

          default: throw new Error('Unknown macro name; '+obj.name);
        }
        if (e.title !== title) {
          e.title = title;
        }
      } else {
        title = (obj.epsilon ? 'End of block/case: ':'');
        var countOrNever = bignumsn(obj.count);
        if (obj.epsilon && countOrNever === 'never') countOrNever = '-'; // prevent epsilons to light up in code coverage
        title += countOrNever+' ('+percent(obj.count, max)+'%)';

        if (obj.isReturn) {
          title = 'Statement: '+ title;

        } else if (obj.type === 'stmt') {
          title = 'Statement: '+ title;
        } else if (obj.type === 'expr') {
          title =
            'Expr: '+ title+'\n' +
            'T/F: '+bignums(obj.truthy)+' / '+bignums(obj.falsy)+
            ' (abs: '+percent(obj.truthy,obj.count)+'% / '+percent(obj.falsy,obj.count)+'%)' +
            ' (rel: '+percent(obj.truthy,max)+'% / '+percent(obj.falsy,max)+'%)\n' +
            'Types: '+obj.types+
            ui.statsToString(obj.typeCount);
        }
        else throw console.log(obj),'unknown type:'+obj.type;

        if (excluded) title = '(excluded)\n' + title;
        if (ui.modeCodeCoverage) title += ' '; // force update when toggling code coverage

        if (e.title !== title) {
          e.title = title;
          if (excluded) {
            e.style.backgroundColor = 'inherit';
          } else if (ui.modeCodeCoverage) {
            e.style.backgroundColor = '';
//          else if (ui.typeAttention(obj.types)) e.style.backgroundColor = 'rgb(255, 100, 255)';
          } else {
            var n = (255-Math.floor((obj.count / max)*255));
            e.style.backgroundColor = 'rgb(255, '+n+', '+n+')';
          }
        }
      }
    });
  },
  statsToString: function(obj){
    var s = '';
    var types = Object.keys(obj);
    if (types.length) {
      s = '\n  ' + types.map(function(type){
        return type+': '+bignums(obj[type]);
      }).join(' x\n  ');
    }
    return s;
  },
  typeAttention: function(types){
    // input is multi-typed if there are mixed types. two notable exceptions
    // have to be checked here though: undefined+implicit and number+subtype
    // also, NaN and Infinity should immediately alert you.

    return types.replace(/ ?implicit/, '').replace(/ ?number/, '').indexOf(' ') > 0 || types.indexOf('NaN') > 0 || types.indexOf('Infinity') > 0;
  },

  setFocus: function(from, to, funcId){
    if (from !== false) {
      // now focus on ft ~ rhc only...
      ui.focusStart = from;
      ui.focusStop = to+1;
      ui.setHeatmap();
      ui.updateThumb();
      ui.updateLineNumbers();
      ui.applyStats();

      gebi(ui.funcTokenIdPrefix+funcId).scrollIntoView();
    } else {
      ui.focusStart = false;
      ui.focusStop = false;
    }
  },
  inFocus: function(fid){
    return (ui.focusStart === false && ui.focusStop === false) || (fid >= ui.focusStart && fid < ui.focusStop);
  },

  openTab: function(target){
    var currentTab = qs('.tabs .open');
    currentTab.className = currentTab.className.replace(/open /, '');
    var targetTab = qs('.'+target);
    targetTab.className = 'open ' + targetTab.className;

    var currentPage = qs('.content .open');
    currentPage.className = currentPage.className.replace(/open /, '');
    var page = qs('.content .'+target);
    page.className = 'open ' + page.className;

    ui.updateHash(target, targetTab);
  },
  updateHash: function(target, targetTab){
    var args = location.hash.split(',');

    if (target === 'result') targetTab.className = 'enabled '+targetTab.className;
    else if (target === 'run') {
      location.hash =
        'run,'+
        (gebi('run-code').checked?'code':'files')+','+
        (gebi('run-here').checked?'here':'tab')+
        (args.indexOf('start') >= 0 ? ',start' : '');
    }
    else location.hash = target + (args.indexOf('start') >= 0 ? ',start' : '');
  },
  updatePlaceholder: function(forCode){
    if (forCode) {
      qs('.run.page .input').placeholder = ui.defaultCode.replace(/  /g,'\xA0\xA0').replace(/\s*\n/g, '                                                                    ');
    } else {
      qs('.run.page .input').placeholder = ui.defaultFiles.replace(/\s*\n/g, '                                                                                                                 ');
    }
  },
  updateRunInput: function(forCode){
    if (window.localStorage) {
      var key = forCode ? ui.localStorageRunInputCodeKey : ui.localStorageRunInputFilesKey;
      qs('.run.page .input').value = localStorage.getItem(key) || '';
    }
  },
  saveRunInput: function(type, input){
    var key = ui.localStorageRunInputCodeKey;
    if (type === 'files') key = ui.localStorageRunInputFilesKey;
    else if (type === 'nodejs') key = ui.localStorageOutputFileKey;
    else if (type !== 'code') throw 'unknown input type';

    localStorage.setItem(key, input);
  },
  openFile: function(fid, initializing){
    if (ui.currentFid !== fid || initializing) {
      ui.currentFid = fid;

      // close existing popup, if any
      if (gebi('popup')) qs('#popup .close span').click();

      // we can probably prevent this check if the tree exists...
      var tree = ui.trees[ui.currentFid] = transformer.parse(ui.currentHf.contents[ui.currentFid]);

      // make sure we see the entire file...
      ui.setFocus(false);

      ui.updateFileList();
      qs('.result.paig .current-file').innerHTML = ui.sanitizeFilename(ui.currentHf.fileNames[ui.currentFid]);

      ui.setHeatmap();
      ui.updateLineNumbers();
      ui.updateThumb();
      ui.elements = null;
      ui.applyStats();

      if (initializing) document.documentElement.scrollTop = document.body.scrollTop = 0;
    }
  },

  showFunctionInfo: function(){
    // close existing popup, if any
    if (gebi('popup')) qs('#popup .close span').click();

    // this func is so inefficient it's almost sad. but hey, not important here since it's not used very often

    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];
    var tree = ui.trees[fid];

    var list = Object.keys(page.functions);

    var funcs = page.functions;

    list = list.filter(function(key) {
      return !funcs[key].excluded;
    });

    list.sort(function(a,b){
      var A = funcs[a];
      A = A.falsy + A.truthy;
      var B = funcs[b];
      B = B.falsy + B.truthy;

      if (A>B) return -1;
      if (A<B) return 1;
      return 0;
    });

    list = list.slice(0, 20);

    var pre = document.createElement('pre');
    pre.id = 'popup';

    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
        list.map(function(uid){
          var name = funcNameFrom(tree, uid);
          var o = funcs[uid];
          return '<span class="count">'+bignums(o.falsy+o.truthy)+'</span> - <span class="link" data-uid="'+uid+'">'+name+'</span>';
        }).join('\n');

    document.body.appendChild(pre);

    pre.onclick = function(e){
      if (e.target.className === 'link') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById(ui.funcTokenIdPrefix+uid);
        f.scrollIntoView();
      } else if (e.target.parentElement.className === 'close') {
        var g = e.target.parentElement.parentElement;
        g.parentElement.removeChild(g);
      }
    };
  },
  showStatementInfo: function(){
    // close existing popup, if any
    if (gebi('popup')) qs('#popup .close span').click();

    // this func is so inefficient it's almost sad. but hey, not important here since it's not used very often

    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];
    var funcs = page.functions;
    var tree = ui.trees[fid];

    var list = Object.keys(page.statements);

    list = list.filter(function(uid) {
      var token = tree[uid];
      var func = token.ownerFuncToken;
      if (!func) return true;
      return func.isGlobal || !funcs[func.white].excluded;
    });

    list.sort(function(a,b){
      var A = page.statements[a].count;
      var B = page.statements[b].count;

      if (A>B) return -1;
      if (A<B) return 1;
      return 0;
    });

    list = list.slice(0, 20);

    var pre = document.createElement('pre');
    pre.id = 'popup';

    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
        list.map(function(uid){
          var token = tree[uid];
          // get the name
          var name = token.value;

        // get the function that scopes this statement to get a name for orientation
          var func = 'global';
          if (token.ownerFuncToken) {
            func = '<span class="soft link" data-uid="'+token.ownerFuncToken.white+'">'+token.ownerFuncToken.textName+'</span>'
          }

          var o = page.statements[uid];
          return '<span class="count link" data-uid="'+uid+'">'+bignums(o.count)+'</span> - '+name+' <small>&lt;'+func+'&gt;</small>';
        }).join('\n');

    document.body.appendChild(pre);

    pre.onclick = function(e){
      if (e.target.className === 'count link') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById('id-' + uid);
        f.scrollIntoView();
      } else if (e.target.className === 'soft link') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById(ui.funcTokenIdPrefix+uid);
        f.scrollIntoView();
      } else if (e.target.parentElement.className === 'close') {
        var g = e.target.parentElement.parentElement;
        g.parentElement.removeChild(g);
      }
    };
  },
  showJitInfo: function(){
    // close existing popup, if any
    if (gebi('popup')) qs('#popup .close span').click();

    // first count the number of <whatevers>

    var counts = {
      implicit: 0,
      bi: 0,
      tri: 0,
      quad: 0,
      poly: 0,
      args: 0,
      e2: 0,
      emore: 0,
    };

    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];

    var f = page.functions;
    Object.keys(f).forEach(function(uid){
      var t = f[uid].types;
      t = t.replace(/ ?number/, ''); // there will be a subtype
      if (t.indexOf(' ') >= 0) {
        if (t.indexOf('implicit') >= 0) {
          ++counts.implicit;
          t = t.replace(' implicit', '');
        }

        var n = t.slice(1).split(' ').length;
        if (n > 4) ++counts.poly;
        else if (n > 3) ++counts.quad;
        else if (n > 2) ++counts.tri;
        else if (n > 1) ++counts.bi;
      }
    });

    var e = page.expressions;
    Object.keys(e).forEach(function(uid){
      var t = e[uid].types;
      t = t.replace(/ ?number/, ''); // there will be a subtype
      if (t.indexOf(' ') >= 0) {
        var n = t.slice(1).split(' ').length;
        if (n === 2) ++counts.e2;
        else if (n>2) ++counts.emore;
      }
    });

    var a = page.arguments;
    Object.keys(a).forEach(function(uid){
      if (a[uid].types.indexOf(' ') > 0) {
        ++counts.args;
      }
    });

    var pre = document.createElement('pre');
    pre.id = 'popup';
    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
        '<div>Some runtime collected stats:</div>'+
        '<ul style="padding-left: 15px;">' +
          '<li class="implicit">Functions with implicit returns: <b>'+counts.implicit+'</b></div>'+
          '<li class="has2">Functions with two return types: <b>'+counts.bi+'</b></div>'+
          '<li class="has3">Functions with three return types: <b>'+counts.tri+'</b></div>'+
          '<li class="has4">Functions with four return types: <b>'+counts.quad+'</b></div>'+
          '<li class="more">Functions with more return types: <b>'+counts.poly+'</b></div>'+
          '<li class="args">Arguments with multiple types: <b>'+counts.args+'</b></div>'+
          '<li class="expr2">Expressions with two types: <b>'+counts.e2+'</b></div>'+
          '<li class="exprm">Expressions with more than two: <b>'+counts.emore+'</b></div>'+
        '</ul>';

    document.body.appendChild(pre);

    pre.onclick = function(e){
      if (e.target.nodeName === 'LI') {
        ui.showJitDetails(e.target.className);
      } else if (e.target.parentElement.className === 'close') {
        var g = e.target.parentElement.parentElement;
        g.parentElement.removeChild(g);
      }
    };
  },
  showJitDetails: function(what){
    // close existing popup, if any
    if (gebi('popup')) qs('#popup .close span').click();

    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];
    var tree = ui.trees[fid];

    var items = [];
    if (what === 'args') {
      var a = page.arguments;
      Object.keys(a).forEach(function (uid) {
        if (a[uid].types.indexOf(' ') > 0) {
          // TOFIX: onclick scroll element in view or something
          items.push('<span style="float:left;" class="link expr" data-uid="'+uid+'">' + (gebi('id-' + uid).innerHTML||'(empty?)') + '</span> : ' + a[uid].types);
        }
      });
    } else if (what === 'expr2' || what === 'exprm') {
      var e = page.expressions;
      Object.keys(e).forEach(function (uid) {
        var t = e[uid].types;
        t = t.replace(/ ?number/, ''); // there will be a subtype
        var n = t.slice(1).split(' ').length;
        if ((n === 2 && what==='expr2') || (n > 2 && what === 'exprm')) {
          items.push('<span style="float:left;" class="link expr" data-uid="'+uid+'">' + (gebi('id-' + uid).innerHTML||'(empty?)') + '</span> : ' + e[uid].types);
        }
      });
    } else {
      var f = page.functions;
      Object.keys(f).forEach(function(uid){
        var t = f[uid].types;
        if (t.indexOf('implicit') >= 0) {
          if (what === 'implicit') {
            var name = funcNameFrom(tree, uid);
            items.push('<span style="float:left;" class="link" data-uid="'+uid+'">'+name+'</span> : '+f[uid].types);
            t = ''; // dont need it anymore
          } else {
            t = t.replace(' implicit', '');
          }
        }
        t = t.replace(/ ?number/, ''); // there will be a subtype
        if (t.indexOf(' ', 1) > 0) {
          var n = t.slice(1).split(' ').length;
          if ('has'+n === what || (n>4 && what === 'more')) {
            var name = funcNameFrom(tree, uid);
            items.push('<span style="float:left;" class="link" data-uid="'+uid+'">'+name+'</span> : '+f[uid].types.replace(/ ?number/, ''));
          }
        }
      });
    }


    var pre = document.createElement('pre');
    pre.id = 'popup';
    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
      (items.length ? items.join('\n') : 'No items found');

    document.body.appendChild(pre);

    pre.onclick = function(e){
      if (e.target.className === 'link') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById(ui.funcTokenIdPrefix + uid);
        f.scrollIntoView();
      } else if (e.target.className === 'link expr') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById('id-'+uid);
        f.scrollIntoView();
      } else if (e.target.parentElement.className === 'close') {
        var g = e.target.parentElement.parentElement;
        g.parentElement.removeChild(g);
      }
    };
  },

};

qsa('.run.page .start').forEach(function(e){
  e.onclick = function(){
    ui.clean();

    var isCode = gebi('run-code').checked;
    var isLocal = gebi('run-here').checked;

    var input = ui.getInput('.run.page');
    if (!input) {
      if (isCode) input = ui.defaultCode;
      else input = ui.defaultFiles;
    }

    if (isCode) {
      haveInput(['+'], [input]);
    } else {
      var files = parseFiles(input);
      fetch(files, haveInput);
    }

    function haveInput(files, contents){
      var hf = new HeatFiler().localFiles(files, contents);
      ui.setOutput('.run.page', hf.transformed);

      gebi('busy').style.display = 'block';

      if (isLocal) {
        ui.showLocal(hf, isLocal ? 'local' : 'storage');
      } else {
        gebi('heatmap').innerHTML = 'Profile stats of your code are being sent to localStorage.\nOpen this page in another tab (of the same browser) and go to "Listen".';
        ui.openTab('result');
      }

      ui.runLocal(hf, !isLocal);
    }
  };
});
qsa('.run.page .preview').forEach(function(e){
  e.onclick = function(){
    ui.clean();

    var isCode = gebi('run-code').checked;
    var isLocal = gebi('run-here').checked;

    var input = ui.getInput('.run.page');
    if (!input) {
      if (isCode) input = ui.defaultCode;
      else input = ui.defaultFiles;
    }

    if (isCode) {
      haveInput(['+'], [input]);
    } else {
      var files = parseFiles(input);
      fetch(files, haveInput);
    }

    function haveInput(files, contents){
      var hf = new HeatFiler().localFiles(files, contents);
      ui.setOutput('.run.page', hf.transformed);
    }
  };
});
qs('.run.page .example').onclick = function(e){
  qs('.run.page .input').value = ui.defaultFiles;
};
qsa('.run.page input[type="radio"]').forEach(function(e){
  e.onclick = function(){
    ui.updateHash('run');
  };
});
qs('.run.page .input').onblur = function(){
  ui.saveRunInput(gebi('run-code').checked ? 'code' : 'files', this.value);
};
qs('.run.page .input').onkeyup = function(){
  if (gebi('run-code').checked) {
    var input = ui.getInput('.run.page');
    if (!input) input = ui.defaultCode;
    var msg = '';
    try {
      transformer.parse(input);
    } catch (e) {
      msg = 'Unable to parse input: '+e;
    }

    try {
      msg = new HeatFiler().localFiles(['+'], [input]).transformed[0];
      try {
        transformer.parse(msg);
      } catch (e) {
        msg = 'Translation was bad: '+e;
      }
    } catch (e) {
      msg = 'Error while translating: '+e;
    }
    ui.setOutput('.run.page', msg);
  }
};
qs('.listen.page .start').onclick = function(){
  ui.clean();

  var hf = new HeatFiler();
  var meta = hf.fromLocalStorage('meta');
  hf.localFiles(meta.fileNames, meta.contents);
  var stats = hf.stats = hf.fromLocalStorage('stats');
  ui.setOutput('.listen.page', hf.transformed);
  gebi('busy').style.display = 'none';

  ui.showLocal(hf, 'storage');
};
qs('.nodejs.page .start').onclick = function(){
  ui.clean();
  var url = ui.getInput('.nodejs.page') || ui.defaultOutputFile;

  // create absolute url
  var a = document.createElement('a');
  a.href = url; // relative or absolute
  url = a.href; // absolute :)

  qs('.nodejs.page .warning').className = 'warning'; // hide
  qs('.nodejs.page .loading').className = 'loading visible'; // show
  qs('.nodejs.page .loading .status').innerHTML = 'Fetching';
  qs('.nodejs.page .filename').innerHTML = url;
  qs('.nodejs.page .filename').href = url;

  var hf = new HeatFiler();
  var meta = hf.fromXhr(url, function(json){
    qs('.nodejs.page .status').innerHTML = 'Processing';

    qs('.nodejs.page .output').className += ' visible';
    qs('.nodejs.page .files').value = json.fileNames.join('\n');

    if (json.profiledFidMap.length) {
      qs('.nodejs.page .translated').value = json.contents.join('\n\n// ######### next file #######\n\n');
      hf.localFiles(json.fileNames, json.contents);
      var stats = hf.stats = json.stats;
      stats.key = false; // make sure it tries to update stats the first time
      hf.profiledFidMap = json.profiledFidMap;
      qs('#example-profiles').innerHTML = '\''+json.fileNames.join('\',\n  \'')+'\'';
      gebi('busy').style.display = 'none';

      ui.showLocal(hf, 'xhr', url);
    } else {
      // if not profiling any files, dont open result tab (or start polling)
      qs('.nodejs.page .translated').value = 'No files were profiled...';
      qs('.nodejs.page .warning').className = 'message visible'; // show
      qs('#example-heatfiler-location').innerHTML = json.heatfilerLocation;
      qs('#example-output-file').innerHTML = json.outputFile;
      qs('#example-profiles').innerHTML = '\''+json.fileNames.join('\',\n  \'')+'\'';
    }
    qs('.nodejs.page .loading').className = 'loading'; // hide
  });
};
qs('.result.paig .files').onclick = function(e){
  if (e.target.nodeName === 'LI') ui.openFile(parseInt(e.target.getAttribute('data-fid'), 10));
};

modeButton('modeFileRelative', 'mode-relative');
modeButton('modePauseUpdating', 'mode-pause');
modeButton('modeCodeCoverage', 'mode-coverage', ui.enableCodeCoverage);
modeButton('modeLineNumbers', 'mode-lines', ui.updateLineNumbers);
modeButton('modeAutoStart', 'mode-auto-start', ui.updateAutoStart);

gebi('most-funcs').onclick = ui.showFunctionInfo;
gebi('most-stmts').onclick = ui.showStatementInfo;
gebi('jit-info').onclick = ui.showJitInfo;

qs('.tabs').onclick = function(e){
  var target = e.target.className.match(/\w+$/)[0];
  if (target === 'result' && e.target.className.indexOf('enabled') < 0) return;

  ui.openTab(target);
};
gebi('run-code').onclick = function(){
  ui.clean();
  ui.updatePlaceholder(true);
  ui.updateHash('run', qs('.tab.run'));
  ui.updateRunInput(true);
};
gebi('run-files').onclick = function(){
  ui.clean();
  ui.updatePlaceholder(false);
  ui.updateHash('run', qs('.tab.run'));
  ui.updateRunInput(false);
};
gebi('run-here').onclick = function(){
  ui.clean();
  ui.updateHash('run', qs('.tab.run'));
};
gebi('run-tab').onclick = function(){
  ui.clean();
  ui.updateHash('run', qs('.tab.run'));
};
qs('.nodejs.page .input').onblur = function(){
  ui.saveRunInput('nodejs', this.value);
};

// re-open the last opened tab onload
if (location.hash) {
  var args = location.hash.split(',');
  var target = args[0].slice(1);
  if (target === 'run') {
    gebi('run-code').checked = args[1] === 'code';
    gebi('run-files').checked = args[1] === 'files';

    gebi('run-here').checked = args[2] === 'here';
    gebi('run-tab').checked = args[2] === 'tab';
  }
  ui.openTab(target);

  if (args.indexOf('start') >= 0) {
    // the timeout is kind of a hack, but we need to wait for localstorage data to be loaded into UI
    setTimeout(function(){
      console.log('Auto starting (url hash contains `start`)');
      document.querySelector('.open button.start').click()
    }, 10);
  }
}

// update the code input field with localstorage
ui.updatePlaceholder(gebi('run-code').checked);
ui.updateRunInput(gebi('run-code').checked);
qs('.nodejs.page .input').value = localStorage.getItem(ui.localStorageOutputFileKey);
// if start is in hash, toggle menu option
if (location.hash.split(',').indexOf('start') >= 0) qs('#mode-auto-start input').click();
