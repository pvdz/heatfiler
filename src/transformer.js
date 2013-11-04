if (typeof Par === 'undefined') {
  if (typeof require !== 'function') console.warn('Need to include ZeParser2, it is missing...');
  else var Par = require(__dirname+'/../lib/par.js').Par;
}

var transformer = (function(Par){
  var ASI = 15;
  var WHITE = 18;
  var IDENTIFIER = 13;
  var NUMBER = 7;
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
    nextBlack: function(token, tree){
      if (!token) return null;
      var i = token.white+1;
      while (tree[i] && tree[i].type === WHITE) ++i;
      return tree[i];
    },
    rangeString: function(tree, from, to){
      var s = '';
      for (var i=from; i<=to; ++i) {
        s += tree[i].value;
      }
      return s;
    },
    heatmap: function(tree, forThumb, from, to){
      var arr = [];
      if (from === false) from = 0;
      if (to === false) to = tree.length;
      for (var index=from; index<to; ++index) {
        var token = tree[index];

        var alreadyEscaped = false;
        var returnValue = '';

        if (token.isExpressionStart) {
          alreadyEscaped = true;

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
              returnValue += '<span id="id-'+index+'">';
              returnValue += transformer.escape(token.value);

              // add a bunch of rules on which to extend the wrap. certain things can be improved visually.
              var next = token;
              var last = token;
              while (next = transformer.nextBlack(last, tree)) {
                if (next.value === '.') {
                  next = transformer.nextBlack(next, tree);
                  if (next) {
                    returnValue += transformer.rangeString(tree, index+1, next.white);
                    index = next.white;
                  }
                } else if ((last.value === '++' || last.value === '--') && next.type === IDENTIFIER) {
                  returnValue += transformer.rangeString(tree, index+1, next.white);
                  index = next.white;
                } else if (next.value === '++' || next.value === '--' || next.value === '[') {
                  returnValue += transformer.rangeString(tree, index+1, next.white);
                  index = next.white;
                  next = null; // end of any expression
                } else if ((next.value === '+' || next.value === '-') || next.type === NUMBER) {
                  returnValue += transformer.rangeString(tree, index+1, next.white);
                  index = next.white;
                  next = null; // end of any expression
                } else {
                  next = null; // did not find anything to continue, so stop
                }
                last = next;
              }

              returnValue += '</span>';
            }
          } else {
            returnValue += transformer.escape(token.value);
          }
        } else if (token.isArg) {
          alreadyEscaped = true;
          if (!forThumb) returnValue += '<span id="id-'+index+'">';
          returnValue += transformer.escape(token.value);
          if (!forThumb) returnValue += '</span>';
        } else if (token.isElseToken || (token.isStatementStart && !token.isForElse)) { // `else if` is special cased
          if (token.sameToken) {
            if (!forThumb) returnValue += '<span id="id-'+index+'">\u03B5</span>';
            if (!alreadyEscaped) returnValue += transformer.escape(token.value);
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
          alreadyEscaped = true;
        }
        if (token.isForElse >= 0) { // else-if
          alreadyEscaped = true;
          returnValue += transformer.escape(token.value);
          if (!forThumb) returnValue += '</span>';
        }

        if (alreadyEscaped) arr.push(returnValue);
        else if (token.type === ASI) arr.push('');
        else arr.push(transformer.escape(token.value));
      }

      return arr.join('');
    },
  };

  return transformer;
})(Par); // pas on Par so it cant get overwritten by user code

if (typeof exports !== 'undefined') exports.transformer = transformer;
