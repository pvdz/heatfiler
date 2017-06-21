(function(exports){

  var HeatFiler = function(statsSaverAdapter){
    this.fileNames = [];
    this.contents = [];
    this.transformed = [];
    this.profiledFidMap = [];
    this.stats = {};
    this.globals = {};
    /**
     * An object that implements save(this.fileNames, this.stats)
     * to handle saving coverage statistics.
     */
    this.statsSaverAdapter = statsSaverAdapter;
  };

  var UBYTE = 256;
  var SBYTE = 128;
  var USHORT = Math.pow(2, 16);
  var SSHORT = Math.pow(2, 15);
  var UINT = Math.pow(2, 32);
  var SINT = Math.pow(2, 31);

  HeatFiler.prototype = {
    source: null,
    contents: null,
    transformed: null,

    stats: null,
    profiledFidMap: null,

    // these functions are exposed externally
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
          this.transformed[fid] = exports.transformer.process(fid, contents[fid], this.stats);
          this.profiledFidMap.push(fid);
        } else {
          this.transformed[fid] = contents[fid];
        }
      }, this);

      return this;
    },

    exposeGlobals: function(toLocalStorage, _transformer, outputFileForNodejs){
      if (!outputFileForNodejs) _transformer = transformer; // in nodejs, transformer will be passed on

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

      // we store a single instance of each function so we can copy that to global (web) or to each file (node)

      this.globals[_transformer.nameStatementCount] = global[_transformer.nameStatementCount] = function(fid, uid, ownerType, ownerIndex, ownerFuncId, funcDeclared){
        if (funcDeclared) {
          ++stats[fid].functions[uid].declared;
        } else {
          ++stats[fid].statements[uid].count;
          switch (ownerType) {
            case transformer.typeSwitch:
              ++stats[fid].functions[ownerFuncId].switches[ownerIndex];
              break;
            case transformer.typeIf:
              ++stats[fid].functions[ownerFuncId].ifs[ownerIndex];
              break;
            case transformer.typeLoop:
              ++stats[fid].functions[ownerFuncId].loops[ownerIndex];
              break;
            case transformer.typeReturn:
              ++stats[fid].functions[ownerFuncId].returns[ownerIndex];
              break;
            case transformer.typeCase: throw new Error('expecting case handled elsewhere');
          }
        }
        if (toLocalStorage) tryFlush();
      };
      this.globals[_transformer.caseCheck] = global[_transformer.caseCheck] = function(fid, uid, value, switchValue, switchUid, caseIndex, ownerIndex, ownerFuncId){
        $expr$(fid, uid, value === switchValue);
        stats[fid].statements[switchUid].caseCounts[caseIndex]++;
        ++stats[fid].functions[ownerFuncId].returns[ownerIndex];
        if (value === switchValue) stats[fid].statements[switchUid].casePasses[caseIndex]++;
        return value;
      };
      var $expr$ = this.globals[_transformer.nameExpressionCount] = global[_transformer.nameExpressionCount] = function(fid, uid, value){
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
      this.globals[_transformer.nameReturnCheck] = global[_transformer.nameReturnCheck] = function(fid, funcid, retid, value, implicit){
        var obj = stats[fid].functions[funcid];
        that.typeCheck(obj, value);
        if (implicit && obj.types.indexOf('implicit') < 0) obj.types += ' implicit';
        if (toLocalStorage) tryFlush();

        if (retid >= 0) {
          obj = stats[fid].statements[retid];
          if (!obj._init) {
            // hack...
            obj._init = true;
            obj.types = '';
            obj.truthy = 0;
            obj.falsy = 0;
          }
          that.typeCheck(obj, value);
        }

        return value;
      };
      this.globals[_transformer.nameQmark] = global[_transformer.nameQmark] = function(fid, quid, part, value) {
        //  allCount: 0,
        //    allTypes: '',  leftTypes: '', rightTypes: '', condTypes: '',
        //    allTruthy: 0,  leftTruthy: 0, rightTruthy: 0, condTruthy: 0,
        //    allFalsy: 0,   leftFalsy: 0,  rightFalsy: 0,  condFalsy: 0,

        var obj = stats[fid].qmarks[quid];

        switch (part) {
          case 'S':
            ++obj.allCount;
            if (!!value) ++obj.allTruthy;
            else ++obj.allFalsy;
            that.typeCheck(obj, value, 'condTypes', 'condTypeCount');
            break;
          case 'L':
            ++obj.allCount;
            if (value) {
              ++obj.leftTruthy;
              ++obj.allTruthy;
            } else {
              ++obj.leftFalsy;
              ++obj.allFalsy;
            }
            that.typeCheck(obj, value, 'leftTypes', 'leftTypeCount');
            that.typeCheck(obj, value, 'allTypes', 'allTypeCount');
            break;
          case 'R':
            ++obj.allCount;
            if (value) {
              ++obj.rightTruthy;
              ++obj.allTruthy;
            } else {
              ++obj.rightFalsy;
              ++obj.allFalsy;
            }
            that.typeCheck(obj, value, 'rightTypes', 'rightTypeCount');
            that.typeCheck(obj, value, 'allTypes', 'allTypeCount');
            break;
        }

        return value;
      };
      this.globals[_transformer.macro] = global[_transformer.macro] = function(fid, macroName, uid, result, args) {
        var obj = stats[fid].macros[uid];
        that.runMacro(macroName, obj, result, obj.args);
        if (toLocalStorage) tryFlush();
      };
      this.globals[_transformer.loopCount] = global[_transformer.loopCount] = function(fid, loopIndex, ownerFuncId) {
        ++stats[fid].functions[ownerFuncId].looped[loopIndex];
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

    typeCheck: function(obj, value, typeProp, typesProp){
      if (!typeProp) typeProp = 'types';
      if (!typesProp) typesProp = 'typeCount';

      var type = typeof value;
      this.addType(obj, typeProp, typesProp, type);

      if (type === 'number') {
        var numberType = 's-long'; // only if nothing else

        if (isNaN(value)) numberType = 'NaN'; // very bad for perf
        else if (!isFinite(value)) numberType = 'Infinity';

        // fractions have fewer types :) and are slower to optimize.
        else if ((value|0) !== value && value < SINT && value >= -SINT) numberType = 'float';
        else if ((value|0) !== value) numberType = 'double';

        // using mix of - and _ to make sure indexOf doesn't trigger. ugly hack, i know.

        else if (value >= 0 && value <= UBYTE) numberType = 'u-byte';
        else if (value >= -SBYTE && value < SBYTE) numberType = 's-byte';
        else if (value >= 0 && value < USHORT) numberType = 'u-short';
        else if (value >= -SSHORT && value < SSHORT) numberType = 's-short';
        else if (value >= 0 && value < UINT) numberType = 'u-int';
        else if (value >= -SINT && value < SINT) numberType = 's-int';
        else if (value >= 0) numberType = 'u-long';

        this.addType(obj, typeProp, typesProp, numberType);
      }

      if (value) ++obj.truthy;
      else ++obj.falsy;
    },

    addType: function(obj, typeProp, typesProp, type){
      if (obj[typeProp].indexOf(type) < 0) obj[typeProp] += ' '+type;
      obj[typesProp][type] = -~obj[typesProp][type]; // -~ is basically ++ with support for if the value is undefined :) Learned it from Jed, blame him.
    },

    runMacro: function(macroName, statsObject, result, args) {
      switch (macroName) {
        case 'count-ranged':
          var counts = args;
          for (var i = 0; i < counts.length; ++i) {
            var num = counts[i];
            if (result <= num) {
              if (!statsObject[num]) statsObject[num] = 0;
              ++statsObject[num];
              return;
            }
          }
          if (!statsObject[Infinity]) statsObject[Infinity] = 0;
          ++statsObject[Infinity];
          return;

        case 'count-exact':
          var counts = args;
          var pos = counts.indexOf(result);
          if (pos >= 0) {
            if (!statsObject[result]) statsObject[result] = 0;
            ++statsObject[result];
          }
          return;

        case 'count-any':
          if (!args[result]) args[result] = 0;
          ++args[result];
          return;

        default: throw new Error('unknown macro:' + macroName);
      }
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
      var tree = exports.transformer.parse(this.contents[fid]);
      return exports.transformer.heatmap(tree, true, focusStart, focusStop);
    },

    toLocalStorage: function(what){
      switch (what) {
        case 'stats':
          this.stats.key = Math.random();
          if(this.statsSaverAdapter) {
            this.statsSaverAdapter.save(this.fileNames, this.stats);
          }
          this.saveToLocalStorageReportError();
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
      return this;
    },

    /**
     * Save to local storage keeping in mind space limitations
     * exist and reporting them.
     */
   saveToLocalStorageReportError: function(){
      try {
          localStorage.setItem('heatfiler-stats', JSON.stringify(this.stats));
      }
      catch(err){
        console.log('Could not save heatfiler-stats to local storage. Memory exceeded.');
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
      // find all scripts. if any of them has type=profile or noprofile; fetch, translate, and inject them into the page.
      var fileNames = [];
      var content = [];

      Array.prototype.slice.call(document.querySelectorAll('script'), 0).forEach(function(e){
        var type = e.getAttribute('heat-filer-type');
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

      var fetch = function(files, func, contents){
        if (files.length) {
          if (!contents) contents = [];
          var received = 0;
          files.forEach(function(s, index){
            if (contents[index]) {
              ++received; // already have it
              if (received === files.length) {
                func(files, contents);
              }
            } else {
              var file = s;
              if (file[0] === '-' || file[0] === '+') file = file.slice(1);
              GET(file, function(e, r){
                if (e) throw e;
                contents[index] = r;
                ++received;
                if (received === files.length) {
                  func(files, contents);
                }
              });
            }
          });
        } else {
          func(files, []);
        }
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

      // get all external files and run all scripts once they're all in
      fetch(fileNames, function(fileNames, contents){
        this.localFiles(fileNames, contents);
        this.exposeGlobals(true);
        this.toLocalStorage('meta');
        this.profiledFidMap.forEach(function(fid){
            this.run(fid);
        }, this);
      }.bind(this), content);

      return this;
    },
  };

  exports.HeatFiler = HeatFiler;
})(typeof exports !== 'undefined' ? exports : window);

if (typeof exports !== 'undefined' && typeof require === 'function') {
  exports.bootstrap = function(targetStatsFile, filesToProfile){
    if (!filesToProfile) {
      filesToProfile = [];
      console.log("Warning: no files to profile, profiler will only output meta data to output file");
    }
    if (!targetStatsFile) throw 'HeatFiler requires the target output filename';
    console.log('HeatFiler logging to', targetStatsFile);

    // bootstrap nodejs
    var Par = exports.Par || require('../lib/par.js').Par;
    var fs = require('fs');

    var pwd = __dirname;

    var transformer = exports.transformer || require(pwd+'/transformer.js').transformer;
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
          // `exports.hf` is exposed a few lines up!
          'require(\''+__filename+'\').hf.exposeNode();\n\n' +
            processed;
      }

      // this doohicky does the magic of turning source into js
      module._compile(stripBOM(content), filename);
    };

  };
}
