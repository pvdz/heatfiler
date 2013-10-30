if (typeof Par === 'undefined') {
  if (typeof require !== 'function') console.warn('Need to include ZeParser2, it is missing...');
  else var Par = require(__dirname+'/../lib/par.js').Par;
}

var transformer = (function(Par){
  var ASI = 15;
  var WHITE = 18;
  var transformer = {
    nameStatementCount: '$statement$',
    nameExpressionCount: '$expression$',
    nameArgCheck: '$arg$',
    nameReturnCheck: '$return$',

    process: function(fid, input, stats){
      var tokens = transformer.parse(input);
      transformer.initializeStats(fid, tokens, stats);
      return transformer.transform(fid, tokens);
    },
    parse: function(input){
      return Par.parse(input, {saveTokens:true}).tok.tokens;
    },
    transform: function(fid, tree){
      tree.forEach(function(o){ o.oValue = o.value; });
      return tree.map(function(token,index){
        if (token.isElseToken) {
          var t = token;
          do t = tree[t.white+1];
          while (t.type === WHITE);

          if (t.isStatementStart) {
            token.elseStart = t.white;
            t.isForElse = token.white;
          } else {
            token.elseStart = undefined;
          }
        }
        if (token.returnValueEmpty) {
          token.value += ' ' + transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+')';
        }
        else if (token.returnValueEnd) {
          token.value += ' ' + transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+',(';
          token.returnValueEnd.value += '))';
        }
        if (token.isExpressionStart) {
          token.value = transformer.nameExpressionCount+'('+fid+', '+index+', (' + token.value;

          var t = tree[token.isExpressionStart.white-1];
          while (t.type === WHITE || t.type === ASI) t = tree[t.white-1];

          t.value += '))';
        }
        if (token.functionBodyClose) {
          token.value = transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+', void 0, true);' + token.value;
        }
        if (token.isStatementStart) {
          token.value =
            (token.sameToken?'':' { ') +
            transformer.nameStatementCount+'('+fid+', '+index+'); ' +
            token.value;
        }
        if (token.isStatementStop) {
          for (var i=0; i<token.isStatementStop; ++i) {
            token.value += ' } ';
          }
        }
        if (token.argTokens) {
          token.lhc.value += token.argTokens.map(function(t){
            return transformer.nameArgCheck+'('+fid+','+t.white+','+t.value+'); ';
          }).join('');
        }

        return token.value;
      }).join('');
    },
    escape: function(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
    initializeStats: function(fid, tree, stats){
      if (!stats[fid]) stats[fid] = {statements:{}, expressions:{}, functions:{}, arguments:{}};
      var fstats = stats[fid];
      tree.map(function(token,index){
        if (token.isFunctionMarker) {
          fstats.functions[index] = {type:'func', types:'', truthy:0, falsy:0};
        }
        if (token.isExpressionStart) {
          fstats.expressions[index] = {type:'expr', count:0, types:'', truthy:0, falsy:0};
        }
        if (token.isStatementStart) {
          fstats.statements[token.isForElse || index] = {type:'stmt', count:0, epsilon:!!token.sameToken};
        }
        if (token.argTokens) {
          token.argTokens.forEach(function(t){
            fstats.arguments[t.white] = {type:'arg', types:'', truthy:0, falsy:0};
          });
        }

        return token.value;
      }).join('');
    },
    // pretty much same structure as transform()... (so if that function changes..)
    heatmap: function(tree, forThumb, from, to){
      return tree.map(function(token,index){
        if (from !== false && index < from) return;
        if (to !== false && index >= to) return;

        var special = false;
        var returnValue = '';

        if (token.isExpressionStart) {
          special = true;

          if (!forThumb) {
            if (token.isFunctionMarker) {
              // we want to hide the expression span (not remove it because that makes other
              // parts of the code break and handling that gracefully is far more complex
              // opposed to just hiding these elements and let them be). So...
              returnValue +=
                '<span id="id-'+index+'" style="display:none;"></span>' +
                '<span id="func-id-'+index+'">' +
                  transformer.escape(token.value) +
                '</span>';
            } else {
              returnValue +=
                '<span id="id-'+index+'">' +
                  transformer.escape(token.value) +
                '</span>';
            }
          } else {
            returnValue += transformer.escape(token.value);
          }

          if (token.value === '(' || token.value === '{' || token.value === '[') {
            if (!forThumb) returnValue += '</span>';
          } else if (!token.isFunctionMarker) {
            var t = tree[token.isExpressionStart.white-1];
            while (t.type === WHITE || t.type === ASI) t = tree[t.white-1];

            if (!t.closeSpans) t.closeSpans = 1;
            else ++t.closeSpans;
          }
        }
        if (token.closeSpans) {
          if (!special) returnValue += transformer.escape(token.value);
          special = true;
          for (var i=0; i<token.closeSpans; ++i) {
            if (!forThumb) returnValue += '</span>';
          }
        }
        if (token.argTokens) { // function token
          token.argTokens.forEach(function(t){
            t.isArg = true;
          });
        }
        if (token.isArg) {
          special = true;
          if (!forThumb) returnValue += '<span id="id-'+index+'">';
          returnValue += transformer.escape(token.value);
          if (!forThumb) returnValue += '</span>';
        }

        if (token.isElseToken || (token.isStatementStart && !token.isForElse)) {
          if (token.sameToken) {
            if (!forThumb) returnValue += '<span id="id-'+index+'">\u03B5</span>';
            if (!special) returnValue += transformer.escape(token.value);
          } else {
            var eindex = index;
            if (token.isElseToken) {
              var t = token;
              do t = tree[t.white+1];
              while (t.type === WHITE);

              if (t.isStatementStart) {
                eindex = t.white;
                token.elseStart = t.white;
                t.isForElse = token.white;
              } else {
                token.elseStart = undefined;
              }
            }

            if (!forThumb && token.isFunctionMarker) {
              // we want to hide the expression span (not remove it because that makes other
              // parts of the code break and handling that gracefully is far more complex
              // opposed to just hiding these elements and let them be). So...
              returnValue +=
                '<span id="id-'+eindex+'" style="display:none;"></span>' +
                '<span id="func-id-'+eindex+'">' +
                  transformer.escape(token.value) +
                '</span>';
            } else {
              if (!forThumb) returnValue += '<span id="id-'+eindex+'">';
              returnValue += transformer.escape(token.value);
              if (!forThumb) if (!token.elseStart) returnValue += '</span>';
            }
          }
          special = true;
        }
        if (token.isForElse >= 0) {
          special = true;
          returnValue += transformer.escape(token.value);
          if (!forThumb) returnValue += '</span>';
        }

        if (special) return returnValue;
        if (token.type === ASI) return '';
        return transformer.escape(token.value);
      }).join('');
    },
  };

  return transformer;
})(Par); // pas on Par so it cant get overwritten by user code

if (typeof exports !== 'undefined') exports.transformer = transformer;
