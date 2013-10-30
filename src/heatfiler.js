/**
 * like-to-haves:
 * - micro time tracking, alongside of number of executions
*/

var HeatFiler = function(){
  this.fileNames = [];
  this.contents = [];
  this.transformed = [];
  this.profiledFidMap = [];
  this.stats = {};
  this.globals = {};
};

HeatFiler.prototype = {
  source: null,
  contents: null,
  transformed: null,

  stats: null,
  profiledFidMap: null,

  globals: null,

  localCode: function(input){
    return this.localFiles(['+'], [input]);
  },
  localFiles: function(files, contents){
    // files are prefixed with + (profile) or - (dont profile)
    // contents is the actual contents of the file
    // translate the profile files and then concat all of them

    files.forEach(function(url, fid){
      this.fileNames[fid] = url;
      this.contents[fid] = contents[fid];
      if (url[0] === '+') {
        this.transformed[fid] = transformer.process(fid, contents[fid], this.stats);
        this.profiledFidMap.push(fid);
      } else {
        this.transformed[fid] = contents[fid];
      }
    }, this);

    return this;
  },

  exposeGlobals: function(toLocalStorage, _transformer, outputFileForNodejs){
    if (!outputFileForNodejs) _transformer = transformer; // in nodejs, _transformer will be passed on

    var that = this;
    var stats = this.stats;
    var timer = false;

    var queue = function(){
      if (!timer) {
        timer = setTimeout(function(){
          timer = false;
          if (outputFileForNodejs) that.toFile(outputFileForNodejs);
          else that.toLocalStorage('stats');
        }, 100);
      }
    };

    var flushCount = 0;
    var threshold = 1000000;
    var tryFlush = function(){
      queue();
      if (++flushCount >= threshold) {
        flushCount = 0;
        if (outputFileForNodejs) that.toFile(outputFileForNodejs);
        else that.toLocalStorage('stats');
      }
    };

    // global is either `window`, or whatever the global object is in nodejs these days
    var global = (function(){ return this; })();

    // for nodejs, we store a single instance of each function so we can copy that to global in each file
    this.globals[_transformer.nameStatementCount] = global[_transformer.nameStatementCount] = function(fid, uid){
      var obj = stats[fid].statements[uid];
      ++obj.count;
      if (toLocalStorage) tryFlush();
    };
    this.globals[_transformer.nameExpressionCount] = global[_transformer.nameExpressionCount] = function(fid, uid, value){
      var obj = stats[fid].expressions[uid];
      ++obj.count;
      that.typeCheck(obj, value);
      if (toLocalStorage) tryFlush();
      return value;
    };
    this.globals[_transformer.nameArgCheck] = global[_transformer.nameArgCheck] = function(fid, uid, value){
      var obj = stats[fid].arguments[uid];
      that.typeCheck(obj, value);
      if (toLocalStorage) tryFlush();
    };
    this.globals[_transformer.nameReturnCheck] = global[_transformer.nameReturnCheck] = function(fid, funcid, value, implicit){
      var obj = stats[fid].functions[funcid];
      that.typeCheck(obj, value);
      if (implicit && obj.types.indexOf('implicit') < 0) obj.types += ' implicit';
      if (toLocalStorage) tryFlush();
      return value;
    };

    if (outputFileForNodejs) tryFlush(); // queue timer to make sure stats are flushed at least once... (in case no files are profiled)
  },
  exposeNode: function(){
    // global is either `window`, or whatever the global object is in nodejs these days
    var global = (function(){ return this; })();

    var globals = this.globals; // should be created by the bootstrap function
    for (var key in globals) if (globals.hasOwnProperty(key)) {
      global[key] = globals[key];
    }
  },
  typeCheck: function(obj, value){
    var type = typeof value;
    if (obj.types.indexOf(type) < 0) obj.types += ' ' + type;
    if (type === 'number') {
      if (isNaN(value) && obj.types.indexOf('NaN') < 0) obj.types += ' NaN';
      if (!isFinite(value) && obj.types.indexOf('Infinity') < 0) obj.types += ' Infinity';
    }
    if (value) ++obj.truthy;
    else ++obj.falsy;
  },

  run: function(fid){
    setTimeout(function(){
      var e = document.createElement('script');

      var file = this.fileNames[fid];
      if (file[0] === '-' || file[0] === '+') file = file.slice(1);

      e.textContent = this.transformed.map(function(str, index){ return '// '+(file || 'local source')+'\n\n'+str; }, this).join('\n;\n\n');
      document.body.appendChild(e);
    }.bind(this), 100);

    return this;
  },

  generateThumb: function(fid, focusStart, focusStop){
    var tree = transformer.parse(this.contents[fid]);
    return transformer.heatmap(tree, true, focusStart, focusStop);
  },

  toLocalStorage: function(what){
    switch (what) {
      case 'stats':
        this.stats.key = Math.random();
        localStorage.setItem('heatfiler-stats', JSON.stringify(this.stats));
        break;
      case 'meta':
        localStorage.setItem('heatfiler-meta', JSON.stringify({
          fileNames: this.fileNames,
          contents: this.contents,
          key: Math.random()
        }));
        break;
      default:
        console.warn('dunno what to send to localstorage ['+what+']');
    }
  },
  toFile: function(file){
    var key = Math.random();
    this.stats.key = key;
    console.log("initializing stats");
    var e = require('fs').writeFileSync(file, JSON.stringify({
      heatfilerLocation: __filename,
      outputFile: file,
      fileNames: this.fileNames,
      profiledFidMap: this.profiledFidMap,
      contents: this.contents,
      stats: this.stats,
      key: key
    }));
    if (e) console.log(e);
  },
  fromLocalStorage: function(what){
    switch (what) {
      case 'stats':
        return JSON.parse(localStorage.getItem('heatfiler-stats'));
      case 'meta':
        return JSON.parse(localStorage.getItem('heatfiler-meta'));
      default:
        console.warn('dunno what to get from localstorage ['+what+']');
    }
  },
  fromXhr: function(file, func){
    GET(file, function(err, str){
      func(JSON.parse(str));
    });
  },

  integrate: function(){
    // find all scripts. if any of them has type=profiler or noprofiler; fetch, translate, and inject them into the page.
    var fileNames = [];
    var content = [];
    var scripts = qsa('script').forEach(function(e){
      var type = e.getAttribute('type');
      if (type === 'profile' || type === 'noprofile') {
        if (e.src) {
          fileNames.push((type === 'profile' ? '+' : '-') + e.src);
          content.push(null);
        } else {
          fileNames.push(type === 'profile' ? '+' : '-');
          content.push(e.textContent);
        }
      }
    });

    // get all external files and run all scripts once they're all in
    fetch(fileNames, function(fileNames, contents){
      this.localFiles(fileNames, contents);
      this.exposeGlobals(true);
      this.toLocalStorage('meta');
      this.run(this.profiledFidMap[0]);
    }.bind(this), content);
  },
};

if (typeof exports !== 'undefined' && typeof require === 'function') {
  exports.bootstrap = function(targetStatsFile, filesToProfile){
    if (!filesToProfile) {
      filesToProfile = [];
      console.log("Warning: no files to profile, profiler will only output meta data to output file");
    }
    if (!targetStatsFile) throw 'HeatFiler requires the target output filename';
    console.log('HeatFiler logging to', targetStatsFile);

    // bootstrap nodejs
    var Par = require('../lib/par.js').Par;
    var fs = require('fs');

    var pwd = __dirname;

    var transformer = require(pwd+'/transformer.js').transformer;
    // and we already declared HeatFiler in this file... :)

    // this is the original loader in the node.js source:
    // https://github.com/joyent/node/blob/master/lib/module.js#L470
    //  Module._extensions['.js'] = function(module, filename) {
    //    var content = NativeModule.require('fs').readFileSync(filename, 'utf8');
    //    module._compile(stripBOM(content), filename);
    //  };
    // we want to do the same, but add our hook. so yes, we're abusing internals here
    // if you have a better way to do it; tell me. If your method involves saving
    // manual converted files; dont tell me.

    // https://github.com/joyent/node/blob/master/lib/module.js#L458
    // (ok, this isnt rocket science but we need to copy it because node doesnt expose it)
    var stripBOM = function(content) {
      // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
      // because the buffer-to-string conversion in `fs.readFileSync()`
      // translates it to FEFF, the UTF-16 BOM.
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    };

    var hf = new HeatFiler();
    exports.hf = hf; // a require for the same file returns the same (exports) object instance. lets abuse that :)

    // create closures to serve as the global counting functions for each files (stored in hf.globals)
    hf.exposeGlobals(false, transformer, targetStatsFile);

    require.extensions['.js'] = function(module, filename){
      var content = fs.readFileSync(filename, 'utf8');
      var fid = hf.fileNames.length;

      hf.fileNames.push(filename);

      // only transform to profiler code if in array
      if (filesToProfile.indexOf(filename) >= 0) {
        hf.profiledFidMap.push(fid);
        hf.contents[fid] = content;

        var processed = transformer.process(fid, content, hf.stats);

        // bootstrap each file because they dont share a global space
        // we assigned the .hf property a few lines above. it serves
        // as the single HF instance that is shared in all files.
        content =
          'require(\''+__filename+'\').hf.exposeNode();\n\n' +
          processed;
      }

      // this doohicky does the magic of turning source into js
      module._compile(stripBOM(content), filename);
    };

  };
}
