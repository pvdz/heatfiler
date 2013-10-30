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
    '- ../../zeparser2/src/uni.js\n' +
    '+ ../../zeparser2/src/tok.js\n' +
    '+ ../../zeparser2/src/par.js\n' +
    '- ../../zeparser2/bin/profiler-web.js\n',
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
    var cb = qs('.mode-pause input');
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
    hf.toLocalStorage('meta');
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
  setHeatmap: function(){
    var tree = ui.trees[ui.currentFid];

    var hm = gebi('heatmap');
    hm.innerHTML = transformer.heatmap(tree, false, ui.focusStart, ui.focusStop);
    ui.elements = null;

    hm.onclick = function(e){
      var id = e.target.id;
      if (id.slice(0, ui.funcTokenIdPrefix.length) === ui.funcTokenIdPrefix) {
        id = id.slice(ui.funcTokenIdPrefix.length);
        if (ui.focusStart+'' === id) {
          ui.openFile(ui.currentFid, true);
          gebi(ui.funcTokenIdPrefix+id).scrollIntoView();
        } else {
          var ft = ui.trees[ui.currentFid][id];
          ui.setFocus(ft);
        }
      }
    };
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

  getHeatmapElements: function(){
    // cache all important elements so we can update them quickly
    var stats = ui.currentHf.stats;
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
          console.log("updating stats");
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
            console.log("updating stats");
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
    }
    else if (!all.length) {
      console.log("no elements... refrtching");
//      debugger;
      all = ui.elements = ui.getHeatmapElements();
    }

    var max = 0;
    var stats = ui.currentHf.stats;
    if (!ui.modeCodeCoverage) {
      // determine max count
      for (var _fid in stats) if (stats.hasOwnProperty(_fid)) {
        if (!ui.modeFileRelative || +_fid === ui.currentFid) {
          var stmts = stats[_fid].statements;
          for (var _uid in stmts) if (stmts.hasOwnProperty(_uid) && ui.inFocus(_uid)) {
            var o = stmts[_uid];
            if ((o.type === 'stmt' || o.type === 'expr') && o.count > max) max = o.count;
          }
          var exprs = stats[_fid].expressions;
          for (var _uid in exprs) if (exprs.hasOwnProperty(_uid) && ui.inFocus(_uid)) {
            var o = exprs[_uid];
            if ((o.type === 'stmt' || o.type === 'expr') && o.count > max) max = o.count;
          }
        }
      }

      if (!max) return;
    }

    var fid = ui.currentFid;
    var page = stats[fid];

    all.forEach(function(o){
      switch (o.type) {
        case 'expr': var obj = page.expressions[o.uid]; break;
        case 'stmt': var obj = page.statements[o.uid]; break;
        case 'func': var obj = page.functions[o.uid]; break;
        case 'arg': var obj = page.arguments[o.uid]; break;
        default: throw 'unknown type';
      }

      var e = o.dom;

      if (obj.type === 'arg') {
        var title = 'Types: '+obj.types;
        if (e.title !== title) {
          e.title = title;
          if (obj.types.indexOf(' ',1) > 0) e.style.backgroundColor = 'rgb(255, 100, 255)';
        }
      } else if (obj.type === 'func') {
        var count = obj.truthy + obj.falsy;

        var title =
          'Called: '+bignums(count)+' x\n' +
          'Return types: '+obj.types+'\n' +
          'T/F: '+bignums(obj.truthy)+' / '+bignums(obj.falsy) +
          ' ('+percent(obj.truthy,count)+'% / '+percent(obj.falsy,count)+'%)\n' +
          '(Click to focus on function)';

        if (e.title !== title) {
          e.title = title;
          if (obj.types.indexOf(' ',1) > 0) {
            if (obj.types.indexOf('implicit') >= 0) e.style.backgroundColor = 'rgb(255, 230, 255)';
            else e.style.backgroundColor = 'rgb(255, 100, 255)';
          }
        }
      } else {
        title = (obj.epsilon ? 'End of block: ':'')+bignums(obj.count)+' ('+percent(obj.count, max)+'%)';
        if (obj.type === 'stmt') title = 'Statement: '+ title;
        else if (obj.type === 'expr') {
          title =
            'Expr: '+ title+'\n' +
              'T/F: '+bignums(obj.truthy)+' / '+bignums(obj.falsy)+
              ' ('+percent(obj.truthy,obj.count)+'% / '+percent(obj.falsy,obj.count)+'%)\n' +
              'Types: '+obj.types;
        }
        else throw 'unknown type';

        if (e.title !== title) {
          e.title = title;
          var n = (255-Math.floor((obj.count / max)*255));
          if (ui.modeCodeCoverage) n = (obj.count || e.innerHTML === '\u03B5') ? 255 : 0;
          e.style.backgroundColor = 'rgb(255, '+n+', '+n+')';
        }
      }
    });
  },

  setFocus: function(ft){
    if (ft) {
      var rhc = ft.rhc;
      // now focus on ft ~ rhc only...
      ui.focusStart = ft.white;
      ui.focusStop = rhc.white+1;
      ui.setHeatmap();
      ui.updateThumb();
      ui.updateLineNumbers();
      ui.applyStats();
      gebi(ui.funcTokenIdPrefix+ft.white).scrollIntoView();
    } else {
      ui.focusStart = false;
      ui.focusStop = false;
    }
  },
  inFocus: function(fid){
    fid = parseInt(fid, 10);
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
    if (target === 'result') targetTab.className = 'enabled '+targetTab.className;
    else if (target === 'run') location.hash = 'run,'+(gebi('run-code').checked?'code':'files')+','+(gebi('run-here').checked?'here':'tab');
    else location.hash = target;
  },
  updatePlaceholder: function(forCode){
    if (forCode) {
      qs('.run.page .input').placeholder = ui.defaultCode.replace(/  /g,'\xA0\xA0').replace(/s*\n/g, '                                                                    ');
    } else {
      qs('.run.page .input').placeholder = ui.defaultFiles.replace(/s*\n/g, '                                                                    ');
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

    var keys = Object.keys(page.functions);

    var list = keys.slice(0, 20);

    keys.slice(20).forEach(function(k){
      var l = page.functions[k];
      list.some(function(m, index){
        var n = page.functions[m];
        if (l.falsy + l.truthy > n.falsy + n.truthy) return !!(list[index] = k);
        return false;
      });
    });

    list.sort(function(a,b){
      var A = page.functions[a];
      A = A.falsy + A.truthy;
      var B = page.functions[b];
      B = B.falsy + B.truthy;

      if (A>B) return -1;
      if (A<B) return 1;
      return 0;
    });

    var pre = document.createElement('pre');
    pre.id = 'popup';

    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
        list.map(function(uid){
          var name = funcNameFrom(tree, uid);
          var o = page.functions[uid];
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
    var tree = ui.trees[fid];

    var keys = Object.keys(page.statements);

    var list = keys.slice(0, 20);

    keys.slice(20).forEach(function(k){
      var l = page.statements[k];
      list.some(function(m, index){
        var n = page.statements[m];
        if (l.count > n.count) return !!(list[index] = k);
        return false;
      });
    });

    list.sort(function(a,b){
      var A = page.statements[a].count;
      var B = page.statements[b].count;

      if (A>B) return -1;
      if (A<B) return 1;
      return 0;
    });

    var pre = document.createElement('pre');
    pre.id = 'popup';

    pre.innerHTML =
      '<div class="close"><span>close</span></div>\n' +
        list.map(function(uid){
          // get the name
          var name = tree[uid].value;

          var o = page.statements[uid];
          return '<span class="count link" data-uid="'+uid+'">'+bignums(o.count)+'</span> - '+name;
        }).join('\n');

    document.body.appendChild(pre);

    pre.onclick = function(e){
      if (e.target.className === 'count link') {
        var uid = e.target.getAttribute('data-uid');
        var f = document.getElementById('id-'+uid);
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
    };

    var fid = ui.currentFid;
    var hf = ui.currentHf;
    var stats = hf.stats;
    var page = stats[fid];

    var f = page.functions;
    Object.keys(f).forEach(function(uid){
      var t = f[uid].types;
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
      Object.keys(a).forEach(function(uid){
        if (a[uid].types.indexOf(' ') > 0) {
          items.push('<span style="float:left;">'+gebi('id-'+uid).innerHTML+'</span> : '+a[uid].types);
        }
      });
    } else {
      var f = page.functions;
      Object.keys(f).forEach(function(uid){
        var t = f[uid].types;
        if (t.indexOf('implicit') >= 0) {
          if (what === 'implicit') {
            var name = funcNameFrom(tree, uid);
            items.push('<span style="float:left;">'+name+'</span> : '+f[uid].types);
            t = ''; // dont need it anymore
          } else {
            t = t.replace(' implicit', '');
          }
        }
        if (t.indexOf(' ') > 0) {
          var n = t.slice(1).split(' ').length;
          if ('has'+n === what || (n>4 && what === 'more')) {
            var name = funcNameFrom(tree, uid);
            items.push('<span style="float:left;">'+name+'</span> : '+f[uid].types);
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
//        var uid = e.target.getAttribute('data-uid');
//        var f = document.getElementById(ui.funcTokenIdPrefix+uid);
//        f.scrollIntoView();
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

    // tmp
    if (isCode) input = input.slice(input.indexOf('#')+1);
    else input = input.slice(0, input.indexOf('#'));

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
qsa('.run.page input[type="radio"]').forEach(function(e){
  e.onclick = function(){
    ui.updateHash('run');
  };
});
qs('.run.page .input').onblur = function(){
  ui.saveRunInput(gebi('run-code').checked ? 'code' : 'files', this.value);
};
qs('.listen.page .start').onclick = function(){
  ui.clean();

  var hf = new HeatFiler();
  var meta = hf.fromLocalStorage('meta');
  hf.localFiles(meta.fileNames, meta.contents);
  console.log("updating stats");
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
      console.log("updating stats");
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
modeButton('modeCodeCoverage', 'mode-coverage');
modeButton('modeLineNumbers', 'mode-lines', ui.updateLineNumbers);

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
}

// update the code input field with localstorage
ui.updatePlaceholder(gebi('run-code').checked);
ui.updateRunInput(gebi('run-code').checked);
qs('.nodejs.page .input').value = localStorage.getItem(ui.localStorageOutputFileKey);
