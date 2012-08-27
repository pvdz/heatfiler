/*
 project integration
 ui polish
 */

new function(){

var currentPage = -1; // like tabs for files, what's the currently shown tab?
var sendToLocalStorage = false; // should pings be sent to localStorage too? makes it much much slower, but hey
var statsRelativeToPage = true; // compare to max of all files or max of each file individually?
var relativeToFunction = -1; // when zooming in on a function, this is the tokpos
var codeCoverage = false; // make anything red that has hits=0, anything else goes white

// contains an array for every file that contains objects. each object holds metric information
var hits = {};
// lookup table to hits for each file
var hash = {};
// for each file, an object with spans for all metrics to be displayed, by token id (only generated when displaying heatmap)
var spans = {};
// store the ping timer so we can kill it
var lastTimer = -1;
// remember tokpos ids for function keywords for function list
var funcs = {};
// list of tokens for current code
var trees = {};
// hide input fields?
var hideInputs = false;

if (document.getElementById('run-code-local')) document.getElementById('run-code-local').onclick = function(){
  currentPage = 0;
  sendToLocalStorage = false;
  clearTimeout(lastTimer);

  var input = document.getElementById('input').value;

  trees[0] = parse(input);

  spans = {0:{}};
  var heatmap = document.getElementById('heatmap');
  generateHeatmap(0, heatmap, trees[0], spans[0]);

  hits = {0:[]};
  hash = {0:{}};
  prepareHitsHash(trees[0], hits[0], hash[0]);

  document.getElementById('output').value = transform(trees[0], 0);

  pingResultsLocaly();

  addScript(document.getElementById('output').value);
};
if (document.getElementById('run-files-local')) document.getElementById('run-files-local').onclick = function(){
  sendToLocalStorage = false;
  clearTimeout(lastTimer);

  getFiles(filesLoadedToRunLocal);
};

if (document.getElementById('ping-code-storage')) document.getElementById('ping-code-storage').onclick = function(){
  currentPage = 0;
  sendToLocalStorage = false; // whatever
  clearTimeout(lastTimer);

  var input = document.getElementById('input').value;

  trees[0] = parse(input);

  spans = {0:{}};
  var heatmap = document.getElementById('heatmap');
  generateHeatmap(0, heatmap, trees[0], spans[0]);

  hash = {0:{}};
  hits = {0:[]};
  prepareHitsHash(trees[0], hits[0], hash[0]);

  pingResultsLocalStorage();
};
if (document.getElementById('run-code-storage')) document.getElementById('run-code-storage').onclick = function(){
  currentPage = 0; // whatever
  sendToLocalStorage = true;
  clearTimeout(lastTimer);

  var input = document.getElementById('input').value;

  trees[0] = parse(input);

  hash = {0:{}};
  hits = {0:[]};
  prepareHitsHash(trees[0], hits[0], hash[0]);

  document.getElementById('output').value = transform(trees[0], 0);

  addScript(document.getElementById('output').value);
};

if (document.getElementById('ping-files-storage')) document.getElementById('ping-files-storage').onclick = function(){
  sendToLocalStorage = false;
  clearTimeout(lastTimer);

  getFiles(filesLoadedToPingStorage);
};
if (document.getElementById('run-files-storage')) document.getElementById('run-files-storage').onclick = function(){
  sendToLocalStorage = true;
  clearTimeout(lastTimer);

  getFiles(filesLoadedToRunStorage);
};

if (document.getElementById('set-relative-max')) document.getElementById('set-relative-max').onclick = function(){
  statsRelativeToPage = true;
  pingResults(); // update
};
if (document.getElementById('set-absolute-max')) document.getElementById('set-absolute-max').onclick = function(){
  statsRelativeToPage = false;
  pingResults(); // update
};

if (document.getElementById('enable-code-coverage')) document.getElementById('enable-code-coverage').onclick = function(){
  codeCoverage = true;
  pingResults(); // update
};
if (document.getElementById('disable-code-coverage')) document.getElementById('disable-code-coverage').onclick = function(){
  codeCoverage = false;
  pingResults(); // update
};

if (document.getElementById('start-tests')) document.getElementById('start-tests').onclick = function(){
  // for every test, set the input field to the test, translate, compile as function (dont execute)
  // we only want to make sure that the translated result is proper so we dont care about the semantics
  // of the result. compiling it as a function will make sure that the code wont execute endless loops :p

  currentPage = 0;
  sendToLocalStorage = false;
  clearTimeout(lastTimer);

  var n = 0;

  var next = function(){
    if (!window.testHasRan) {
      // ignore some tests. i've manually verified them.
      // good is an imported array from the tests.js file
      console.log("Test ("+(n-1)+"):",good[n-1][0].replace(/\n/g,'\\n'));
      document.getElementById('input').value += '\n\nThere was an unexpected error, check your console for details...';
      return;
    }
    // ignore (irrelevant fails)
    if (n == 55 || n == 73) return next(++n);
    // visit again once i figure out what their (regular) behavior _should_ be
    if (n == 256 || n == 292 || n == 353 || n == 417) return next(++n);
    // wontfix ('foo\\\r\nbar' has \r\n which the included version of ZeParser doesnt support very well :)
    if (n == 418 || n == 362 || n == 425 || n == 426 || n == 432 || n == 433) return next(++n);

    if (n >= good.length) {
      console.log("finished");
      document.getElementById('input').value = 'Tests finished... all good :)';
      return;
    }

    document.getElementById('heatmap').innerHTML = n+' / '+good.length;

    var arr = good[n++];
    var input = 'function foo(){\n'+arr[0]+' \n} testRan();';
    document.getElementById('input').value = input;

    trees[0] = parse(input);

    spans = {0:{}};
    var heatmap = document.getElementById('heatmap');
    generateHeatmap(0, heatmap, trees[0], spans[0]);

    hits = {0:[]};
    hash = {0:{}};
    prepareHitsHash(trees[0], hits[0], hash[0]);

    document.getElementById('output').value = transform(trees[0], 0);

    window.testHasRan = false;
    addScript(document.getElementById('output').value);

    setTimeout(next, 10);
  };

  window.testRan = function(){ window.testHasRan = true; };
  window.testHasRan = true; // init

  next();
};

if (document.getElementById('open-function-list')) document.getElementById('open-function-list').onclick = function(){
  var cfuncs = hits[currentPage].filter(function(o){ return funcs[currentPage].indexOf(o.tokpos) >= 0; }).reverse();

  var ul = document.createElement('ul');
  ul.id = 'function-overview';

  var close = document.createElement('div');
  close.id = 'close-function-list';
  close.innerHTML = 'close';
  close.onclick = function(){ document.body.removeChild(ul); };
  ul.appendChild(close);

  cfuncs.forEach(function(o){
    var li = document.createElement('li');
    var name = spans[currentPage][o.tokpos].name;
    li.innerHTML = name+': '+o.hits;
    li.style.cursor = 'pointer';
    ul.appendChild(li);
    li.onclick = function(){
      close.onclick();
      document.location.hash = 't'+o.tokpos;
    };
  });

  document.body.appendChild(ul);
};

if (document.getElementById('ping-integration')) document.getElementById('ping-integration').onclick = function(){
  sendToLocalStorage = false;
  clearTimeout(lastTimer);

  // get the files from localStorage. they will be prepared there in an array
  var toLoad = JSON.parse(localStorage.getItem('integrated-profiler-sources'));

  toLoad.some(function(o,i){ if (o.profile) { currentPage = i; return true; }});

  hits = {};
  hash = {};
  spans = {};
  var heatmaps = [];

  showFiles(toLoad, heatmaps, hits, hash, spans);

  pingResultsLocalStorage();
};

if (document.getElementById('toggle-inputs')) document.getElementById('toggle-inputs').onclick = function(){
  hideInputs = !hideInputs;
  if (hideInputs) {
    document.getElementById('input').style.display = 'none';
    document.getElementById('output').style.display = 'none';
    document.getElementById('files').style.display = 'none';
  } else {
    document.getElementById('input').style.display = 'inline';
    document.getElementById('output').style.display = 'inline';
    document.getElementById('files').style.display = 'inline';
  }
};

var integrateInPage = function(){
  // find all scripts. if any of them has type=profiler, translate and inject them into the page.
  var scripts = document.querySelectorAll('script');
  var list = [];
  for (var i=0, len=scripts.length; i<len; ++i) {
    var script = scripts[i];
    var type = script.getAttribute('type');
    // work with scripts of type profile and noprofile
    // noprofile means dont transform, but still
    // dynamically include (to preserve order of execution...)
    if (type == 'profile' || type == 'noprofile') {
      var url = script.src;
      if (!url) var text = script.text;
      list.push({url:url, source:text, profile:type=='profile'});
    }
  }

  // now we have a list. if this list contains items, start downloading those items that have a url
  // when all items in the list have their text set, start transforming those that have type=profile
  // finally, dynamically include them all. sendToLocalStorage will be true, so you can open another
  // tab and start gathering stats. your project page should function as usual, though a bit slower.

  // since it's impossible for the listening tab to retrieve the contents of script tags, and because
  // it makes it easier to just do it like this as a whole (when having to do it anyways), the contents
  // of all the scripts is put in localStorage for a listener to grab. this should be okay because
  // localStorage is usually 5mb and scripts wont run very fast towards that size. especially not
  // because this only concerns script that are selected for profiling anyways.

  var n = 0;
  var next = function(){
    while (n < list.length && !list[n].url) ++n;
    if (n < list.length) {
      GET(list[n].url, function(err, txt){
        if (err) console.warn("Unknown xhr problem for:", list[n].url);
        else {
          list[n++].source = txt;
          next();
        }
      });
    } else {
      finished();
    }
  };

  // when we have the source for all files, transform them and then load them
  var finished = function(){
    // transform all those who have list[n].type=='profile'
    hits = {};
    hash = {};

    var translations = translateAndLoad(list, hits, hash, true);

    // store sources of profiled stuff into local storage first
    // (thing is, we dont know what the sources might do, they
    // could lock up the browser for a long time. so we need to
    // prepare this data first, before loading the scripts)
    var toSend = list.map(function(o){ if (o.profile) return {profile:true, source:o.source}; return {profile:false}; });
    localStorage.setItem('integrated-profiler-sources', JSON.stringify(toSend));
    // start app...
    translations.forEach(addScript);
  };

  // make sure you can listen to the data
  sendToLocalStorage = true;

  // kick off loading process
  if (list.length) next(); // start fetching
};

var GET = function(url, callback){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (xhr.readyState == 4) {
      try { xhr.status; // status is a getter, this checks for exception
      } catch (e) {
        callback(new Error("Warning: Unknown error with server request (timeout?)."));
      }

      if (xhr.status == 200) callback(null, xhr.responseText);
      else callback(new Error("File request problem (code: "+xhr.status+")!"));
    }
  };
  xhr.open("GET", url+'?'+Math.random());
  xhr.send(null);
};

var getFiles = function(loaded){
  var files = document.getElementById('files').value;
  files = files.split('\n');

  var waitingFor = [];
  var toLoad = [];

  currentPage = -1;
  files.forEach(function(file, i){
    file = file.replace(/^\s*/,'').replace(/\s*$/,'');
    if (file) {
      var exclude = file[0] === '-';
      if (file) {
        file = file.replace(/^[-+\s]?\s*/,'');
        waitingFor.push(file);
        var obj = {name:file, profile:!exclude};
        toLoad.push(obj);
        GET(file, function(err, txt){
          obj.source = txt;
          if (!exclude && currentPage == -1) {
            console.log("setting currentPage to", i, file)
            currentPage = i;
          }

          var pos = waitingFor.indexOf(file);
          waitingFor.splice(pos,1);
          if (waitingFor.length == 0) loaded(toLoad);
        });
      }
    }
  });

  if (!waitingFor.length) console.log("No files to load...");
};
var filesLoadedToRunLocal = function(toLoad){
  // start pinging now
  pingResultsLocaly();

  hits = {};
  hash = {};
  spans = {};
  var heatmaps = [];

  translateShowAndLoad(toLoad, heatmaps, hits, hash, spans);

  showFileButtons(heatmaps);

  document.body.replaceChild(heatmaps[currentPage], document.getElementById('heatmap'));
};
var filesLoadedToRunStorage = function(toLoad){
  hits = {};
  hash = {};

  translateAndLoad(toLoad, hits, hash);
};
var filesLoadedToPingStorage = function(toLoad){
  hits = {};
  hash = {};
  spans = {};
  var heatmaps = [];

  showFiles(toLoad, heatmaps, hits, hash, spans);

  pingResultsLocalStorage();
};

var parse = function(input){
  localStorage.setItem('input', input);
  var tokenizer = new Tokenizer(input);
  var parser = new ZeParser(input, tokenizer, []);
  parser.parse();
  parser.tokenizer.fixValues();

  return tokenizer.wtree;
};

var translateShowAndLoad = function(toLoad, heatmaps, hits, hash, spans){
  // we first translate the sources that were not prefix with
  // a minus. then execute either the result or the raw.
  toLoad.map(function(o,i){
    if (o.profile) {
      trees[i] = parse(o.source);

      heatmaps[i] = document.createElement('pre');
      heatmaps[i].id = 'heatmap';
      generateHeatmap(i, heatmaps[i], trees[i], spans[i] = {});

      hits[i] = [];
      hash[i] = {};
      prepareHitsHash(trees[i], hits[i], hash[i]);

      var trans = transform(trees[i], i);
      o.transformed = trans;

      document.getElementById('output').value += trans;

      return trans;
    }
    return o.source;
  }).forEach(addScript);
};
var showFiles = function(toLoad, heatmaps, hits, hash, spans){
  // we first translate the sources that were not prefixed with
  // a minus. then execute either the result or the raw.
  toLoad.forEach(function(o,i){
    if (o.profile) {
      trees[i] = parse(o.source);

      heatmaps[i] = document.createElement('pre');
      heatmaps[i].id = 'heatmap';
      generateHeatmap(i, heatmaps[i], trees[i], spans[i] = {});

      prepareHitsHash(trees[i], hits[i]=[], hash[i]={});
    }
  });

  showFileButtons(heatmaps);
  document.body.replaceChild(heatmaps[currentPage], document.getElementById('heatmap'));
};
var showFileButtons = function(heatmaps){
  var parent = document.getElementById('file-tabs');
  while (parent.children.length > 1) parent.removeChild(parent.children[1]);

  // add a show button for each file
  // remove undefineds first
  heatmaps = heatmaps.filter(function(o){ return o; });
  heatmaps.forEach(function(e,i){
    var button = document.createElement('button');
    button.innerHTML = 'file '+(i+1);
    button.style.cssFloat = 'left';
    button.onclick = function(){
      document.body.replaceChild(e, document.getElementById('heatmap'));
      currentPage = i;
    };
    parent.appendChild(button);
  });
};
var translateAndLoad = function(toLoad, hits, hash, forIntegration){
  // we first translate the sources that were not prefix with
  // a minus. then execute either the result or the raw.
  var translations = toLoad.map(function(o,i){
    if (o.profile) {
      trees[i] = parse(o.source);

      prepareHitsHash(trees[i], hits[i]=[], hash[i]={});

      var trans = transform(trees[i], i);
      o.transformed = trans;

      if (!forIntegration) {
        document.getElementById('output').value += trans;
      }

      return trans;
    }
    return o.source;
  })

  // for integrations we have to add more scripts, in order.
  if (!forIntegration) translations.forEach(addScript);
  else return translations;
};

var addScript = function(str){
  var e = document.createElement('script');
  e.text = str;
  document.body.appendChild(e);
};

var generateHeatmap = function(id, heatmap, tree, spans){
  while (heatmap.children.length) heatmap.removeChild(heatmap.children[0])

  funcs[id] = [];
  var stack = [document.createElement('span')];
  tree.forEach(function(t,i){
    if (t.isFuncDeclKeyword || t.isFuncExprKeyword) {
      // the entire function goes into one span
      // this will make it easy to single out one
      // function to focus on it. just move one
      // span in-and-out of the main DOM tree to
      // get a function.
      var f = document.createElement('span');
      stack[stack.length-1].appendChild(f);
      stack.push(f);
      // create a special span for the function keyword
      e = document.createElement('span');
      e.style.backgroundColor = 'blue';
      e.style.color = 'white';
      e.style.cursor = 'pointer';
      e.id = 't'+t.tokposb; // for linking to functions
//      e.setAttribute('data-range', t.tokposb+'~'+(t.tokposb+1));
      e.setAttribute('data-tokpos-start', t.tokposb);
//      e.setAttribute('data-tokpos-end', t.rhc.tokposb);

      f.appendChild(e);
      stack.push(e);

      // allows me to recognize the token as such later, to remove a span
      t.rhc.forFunction = true;

      spans[t.tokposb] = {e:e, isFunction:true, name:t.funcName?t.funcName.value:'unknown', group:f, endPos:t.rhc.tokposb};

      e.onclick = focusOnFunction;

      funcs[id].push(t.tokposb);
    } else if (t.subExpressionLogicStart) {
      var e = document.createElement('span');
//      e.setAttribute('data-range', t.tokposb+'~'+t.subExpressionLogicStopper.tokposb);
      stack[stack.length-1].appendChild(e);
      stack.push(e);
      spans[t.tokposb] = {e:e, isFunction:false};
    } else if (t.statementStart) {
      var e = document.createElement('span');
//      e.setAttribute('data-range', t.tokposb+'~'+(t.tokposb+1));
      stack[stack.length-1].appendChild(e);
      stack.push(e);
      spans[t.tokposb] = {e:e, isFunction:false};
    }

    stack[stack.length-1].appendChild(document.createTextNode(t.value));

    if (t.statementStart && !t.isLabel && !t.subExpressionLogicStart) stack.pop();
    else if (t.isFuncDeclKeyword || t.isFuncExprKeyword) stack.pop(); // only for function word itself
    else if (t.subExpressionLogicEnd && !t.isLabel && !t.forFunction) stack.pop();
    // always do it for this one too
    if (t.forFunction) stack.pop(); // remove function group
  });
  heatmap.appendChild(stack[0]);

  // show function list button
  if (document.getElementById('open-function-list')) document.getElementById('open-function-list').style.display = 'inline';
};
var focusOnFunction = function(){
  var tokpos = this.getAttribute('data-tokpos-start');
  var o = spans[currentPage][tokpos];
//console.log(spans, currentPage, tokpos, o, this)
  // create a placeholder to take o.f's place
  var placeHolder = document.createElement('span');
  var group = o.group;

  group.parentElement.replaceChild(placeHolder, group);
  // we can safely take o.f from it's parent, hide the
  // entire tree and temporarily put a new pre up with
  // just this function (o.f, the group span). when
  // you're bored, you can click the function again to
  // reverse this process...

  var pre = document.createElement('pre');
  pre.id = 'heatmap';
  var e = document.createElement('div');
  e.innerHTML = 'In zoomed mode, stats are relative to this function only...';
  e.style.marginBottom = '5px';
  e.style.borderBottom = '1px solid black';
  pre.appendChild(e);
  pre.appendChild(group);

  // get current pre
  var originalPre = document.getElementById('heatmap');
  document.body.replaceChild(pre, originalPre);

  relativeToFunction = tokpos;
  var oldRelativeToPagevalue = statsRelativeToPage;

  // update function to show zoomed stats
  pingResults();

  // temporary event to restore things to normal
  o.e.onclick = function(){
    // restore click handler
    o.e.onclick = focusOnFunction;
    // restore pre
    document.body.replaceChild(originalPre, pre);
    // put function group span back where it belongs
    placeHolder.parentElement.replaceChild(group, placeHolder);

    // put page back to function when it's in the flow
    document.location.hash = 't'+tokpos;

    statsRelativeToPage = oldRelativeToPagevalue;
    relativeToFunction = -1;

    // cleanup, just in case
    o = null;
    group = null;
    e = null;
    placeHolder = null;
    pre = null;
    originalPre = null;

    // update ui
    pingResults();
  };
};
var prepareHitsHash = function(tree, hits, hash){
  tree.forEach(function(t){
    if (t.statementStart || t.isFuncDeclKeyword || t.isFuncExprKeyword || t.subExpressionLogicStart) {
      hits.push(hash[t.tokposb] = {tokpos:t.tokposb, hits:0});
    }
  });
};

var transform = function(tree, id){
  var closingCurlies =  [];
  return tree.map(function(token,i){
    if (token.isFuncDeclKeyword || token.isFuncExprKeyword) {
      token.lhc.value += 'FOO('+id+','+token.tokposb+');';
    }
    if (token.extraClosingParensForAssignment) {
      var extra = token.extraClosingParensForAssignment;
      while (extra--) token.value += ')';
    }
    if (token.subExpressionLogicStart) {
      if (token.statementStart) {
        // dont add parens, we dont need them (and could actually endanger stuff with asi)
        token.value = 'BAR('+id+','+token.tokposb+','+token.subExpressionLogicStopper.tokposb+'), '+token.value;
      } else {
        // foo=bar => (BAR(x,y,z), foo=bar)
        token.value = '(BAR('+id+','+token.tokposb+','+token.subExpressionLogicStopper.tokposb+'), '+token.value;
        token.subExpressionLogicStopper.value += ')';
      }
    } else if (token.statementStart && token.value != '}' && token.value != '})') {
      if (token.value == '{') {
        // already has brackets
        token.value = '{ BAR('+id+','+token.tokposb+','+token.statementEndsAt+'); ';
      } else if (token.value == ';') {
        // no need for brackets here... (mostly silly useless semi, could be valid)
        token.value = 'BAR('+id+','+token.tokposb+','+token.statementEndsAt+'); ';
      } else {
        token.value = '{ BAR('+id+','+token.tokposb+','+token.statementEndsAt+'); '+token.value;
        closingCurlies.push(token.statementEndsAt);
      }
    } else if (token.isAssignment) {
      // ugly haaaack... to guard against the `x=y||z` cases
//      token.value += ' (BAR('+id+','+token.tokposb+'), ';
      token.value += '( ';
    }

    var pos = closingCurlies.indexOf(token.tokposb);
    while (pos >= 0) {
      token.value += ' }';
      closingCurlies.splice(pos, 1);
      pos = closingCurlies.indexOf(token.tokposb);
    }

    return token.value;
  }).join('')
};

var pingResultsLocaly = function repeat(){
  lastTimer=setTimeout(function(){
    pingResults();
    repeat();
  }, 1000);
};
var pingResultsLocalStorage = function repeat(){
  lastTimer=setTimeout(function(){
    hits=JSON.parse(localStorage.getItem('profiler-hits'));
    pingResults();
    repeat();
  }, 1000);
};
var pingResults = function repeat(){
  var pages = Object.keys(hash);
  if (!statsRelativeToPage) {
    // sort all pages to get to the highest
    var highest = Math.max.apply(null, pages.map(function(page){
      var arr = hits[page];
      arr.sort(function(a,b){
        if (a.hits < b.hits) return -1;
        if (a.hits > b.hits) return 1;
        return 0;
      });
      // now that the array is sorted...
      return arr[arr.length-1].hits
    }));

    var maxFuncCount = Math.max.apply(null, pages.map(function(page){
      var arrFTP = funcs[page];
      var maxFuncCount = Math.max.apply(null, hits[page].filter(function(o){ return arrFTP.indexOf(o.tokpos) >= 0; }).map(function(o){ return o.hits; }));

      return maxFuncCount;
    }));
  }

  pages.forEach(function(page){
    if (page == currentPage) {
      var arr = hits[page];
      var pageSpans = spans[page];

      if (codeCoverage) {
        // show anything with zero hits red, anything else is white
        // maybe i'll switch that around, i dunno yet :)
        // (i mean, dont you want to see what code was NOT executed?)

        arr.forEach(function(o){
          var e = pageSpans[o.tokpos];
          if (e.isFunction) {
            e.e.title = 'Called '+o.hits+'x ('+((o.hits/maxFuncCount)*100).toFixed(2)+'%)';
            e.e.style.backgroundColor = o.hits ? 'blue':'red';
            e.e.style.color = 'white';
          } else {
            e.e.style.backgroundColor = 'rgb(255, '+(255-Math.floor((o.hits/highest)*255))+', '+(255-Math.floor((o.hits/highest)*255))+')';
            e.e.title = o.hits+' ('+((o.hits/highest)*100).toFixed(2)+'%)';
            e.e.style.backgroundColor = o.hits ? 'white':'red';
            e.e.style.color = o.hits ? 'black':'white';
          }
        });

      } else {
        if (statsRelativeToPage) {
          if (relativeToFunction != -1) {
            // do the same as for statsRelativeToPage, except just for the
            // function at hand. the function tokpos is the value of
            // relativeToFunction...
            var spanData = spans[page][relativeToFunction];
            // get only the elements relevant to this function
            arr = arr.filter(function(o){ return o.tokpos >= relativeToFunction && o.tokpos <= spanData.endPos; });
            // let the regular code take over now. they'll only update
            // the function specific code. good, because that's the
            // only part we're looking at anyways :)
          }

          arr.sort(function(a,b){
            if (a.hits < b.hits) return -1;
            if (a.hits > b.hits) return 1;
            return 0;
          });

          // no var!
          highest = arr[arr.length-1].hits;

          var arrFTP = funcs[page];
          // no var!
          maxFuncCount = Math.max.apply(null, arr.filter(function(o){ return arrFTP.indexOf(o.tokpos) >= 0; }).map(function(o){ return o.hits; }));
        }
        arr.forEach(function(o){
          var e = pageSpans[o.tokpos];
          if (e.isFunction) {
            e.e.title = 'Called '+o.hits+'x ('+((o.hits/maxFuncCount)*100).toFixed(2)+'%)';
            e.e.color = 'white';
          } else {
            e.e.style.backgroundColor = 'rgb(255, '+(255-Math.floor((o.hits/highest)*255))+', '+(255-Math.floor((o.hits/highest)*255))+')';
            e.e.title = o.hits+' ('+((o.hits/highest)*100).toFixed(2)+'%)';
            e.e.style.color = (o.hits/highest) > 0.4 ? 'white' : 'black';
          }
        });
      }
    }
  });
};

// this is the stats gathering part
// stores it to local storage, if mode is enabled. throttled.
var lastFlush = Date.now();
var timer = -1;
window.BAR = function(id,a,b){
  // statement or expression-part
  ++hash[id][a].hits;
  if (sendToLocalStorage) toLocalStorage();
};
window.FOO = function(id,a){
  // a function call
  ++hash[id][a].hits;
  if (sendToLocalStorage) toLocalStorage();
};
var toLocalStorage = function(){
  if (Date.now() - lastFlush > 2000) {
    localStorage.setItem('profiler-hits', JSON.stringify(hits));
    lastFlush = Date.now();
    if (timer == -1) {
      // this timer will block while blocking code is running
      // it will only be rescheduled once and will make sure
      // that stuff is flushed after the code finishes
      timer = setTimeout(function(){
        timer = -1;
        localStorage.setItem('profiler-hits', JSON.stringify(hits));
        lastFlush = Date.now();
      }, 20);
    }
  }
};

// try to integrate
integrateInPage();

//document.getElementById('run-code-local').onclick();
};
