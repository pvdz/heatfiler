(function(exports, Par){
  var ASI = 15;
  var WHITE = 18;
  var IDENTIFIER = 13;
  var NUMBER = 7;
  var REGEX = 8;
  var STRING = 10;
  var transformer = {
    nameStatementCount: '$statement$',
    nameExpressionCount: '$expression$',
    nameArgCheck: '$arg$',
    nameReturnCheck: '$return$',
    nameQmark: '$qmark$',
    switchVar: '$switchvar$',
    caseCheck: '$case$',

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
      tree.forEach(function(token,index){
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
          token.value += ' ' + transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+',-1)';
        } else if (token.returnValueEnd) {
          token.value += ' ' + transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+','+token.white+',(';
          token.returnValueEnd.value += '))';
        }

        if (token.isExpressionStart) {
          token.value = transformer.nameExpressionCount+'('+fid+', '+index+', (' + token.value;

          var qmark = token.isQmarkStart || token.isQmarkLeft || token.isQmarkRight;
          if (qmark) {

            var type = 'S';
            if (token.isQmarkLeft) type = 'L';
            else if (token.isQmarkRight) type = 'R';

            token.value = '('+transformer.nameQmark+'('+fid+', '+qmark.white+', "'+type+'", (' + token.value;
          }

          var t = tree[token.isExpressionStart.white-1];
          while (t.type === WHITE || t.type === ASI) t = tree[t.white-1];

          t.value += '))';

          if (qmark) {
            t.value += ')))';
          }
        }

        if (token.functionBodyClose) {
          token.value = transformer.nameReturnCheck+'('+fid+','+token.funcToken.white+', -1, void 0, true);' + token.value;
        }

        if (token.isCaseKeyword) {
          var switchVar = transformer.switchVar + '_' + token.switchToken.white;

          // find start of expression
          var t = tree[token.white+1];
          while (t && t.type === WHITE) t = tree[t.white+1];

          // wrap case expression in special call
          token.value += ' '+transformer.caseCheck+'('+fid+', '+ index +', (';
          token.colonToken.value = '), '+switchVar+')'+token.colonToken.value;

//          if (t) delete t.isExpressionStart; // prevent useless wrap since we're already wrapping here
        }

        if (token.isStatementStart) {
          if (token.isSwitchKeyword) {
            // switch needs special handling to get T/F for each case
            // each switch has lhp, rhp, lhc, and rhc reference
            // each case has a reference to its parent switch
            // each case also has a reference to its succeeding colon

            // wrap each switch in a block such that:
            // switch(x) { case y: }
            // ->
            // {var $switchVar_1$ = x; switch ($switchVar_1$) { case $case$(x, id, $switchVar_1$): } }
            // (In words: put switch arg into a variable to reference it later. Pass on each case value together
            // with the switch var and make the function compare them too, make it return just the case value.)

            var switchVar = transformer.switchVar + '_' + token.white;

            var header = tree.slice(token.lhp.white + 1, token.rhp.white)
              .map(function (t, i) {
                var v = t.value;
                t.value = '';
                if (i === 0) t.value = switchVar;
                return v;
              })
              .join('');

            token.value = '{\nvar ' + switchVar + ' = ' + header + ';\nswitch';
            token.rhc += '}';
          } else if (token.value === 'function') {
            if (token.parentFuncToken.isGlobal) tree[0].value = transformer.nameStatementCount+'('+fid+', '+index+', true); ' + tree[0].value;
            else token.parentFuncToken.lhc.value += transformer.nameStatementCount+'('+fid+', '+index+', true); ';
          } else {
            token.value =
              (token.sameToken?'':' { ') +
              transformer.nameStatementCount+'('+fid+', '+index+'); ' +
              token.value;
          }
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
      });

      return tree.map(function(o){ return o.value; }).join('');
    },
    escape: function(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); },
    initializeStats: function(fid, tree, stats){
      if (!stats[fid]) stats[fid] = {statements:{}, expressions:{}, functions:{}, arguments:{}, qmarks:{}};
      var fstats = stats[fid];
      tree.forEach(function(token,index){
        if (token.isFunctionMarker) {
          var obj = fstats.functions[index] = {type:'func', types:'', typeCount:{}, truthy:0, falsy:0};
          if (token.isFuncDeclKeyword) obj.declared = 0;
        }
        if (token.isExpressionStart || token.isCaseKeyword ) {
          fstats.expressions[index] = {type:'expr', count:0, types:'', typeCount:{}, truthy:0, falsy:0};
        }
        if (token.isStatementStart) {
          var obj = fstats.statements[token.isForElse || index] = {type: 'stmt', count: 0, types:'', typeCount: {}};
          if (token.sameToken) obj.epsilon = true;
          if (token.isReturnKeyword) obj.isReturn = true;
        }
        if (token.argTokens) {
          token.argTokens.forEach(function(t){
            fstats.arguments[t.white] = {type:'arg', types:'', typeCount:{}, truthy:0, falsy:0};
          });
        }
        if (token.isQmark) {
          // qmark gathers stats from neighbors. this is just a placeholder to trigger the update
          fstats.qmarks[token.white] = {
            type:'qmark',
            allCount: 0,
            allTypes: '',  leftTypes: '', rightTypes: '', condTypes: '',
            allTypeCount: {}, leftTypeCount: {}, rightTypeCount: {}, condTypeCount: {},
            allTruthy: 0,  leftTruthy: 0, rightTruthy: 0, condTruthy: 0,
            allFalsy: 0,   leftFalsy: 0,  rightFalsy: 0,  condFalsy: 0,
          };
        }
      });
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
        s += transformer.escape(tree[i].value);
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

        if (token.isExpressionStart || token.isCaseKeyword) {
          alreadyEscaped = true;

          if (!forThumb) {
            if (token.isFunctionMarker) {
              // we want to hide the expression span (not remove it because that makes other
              // parts of the code break and handling that gracefully is far more complex
              // opposed to just hiding these elements and let them be). So...
              returnValue +=
                '<span id="id-'+index+'" style="display:none;"></span>' +
                '<span class="function-focus" title="click to zoom in on this function" data-index="'+index+'">\u2923</span>' +
                '<span class="function-exclude" title="click to exclude this function from stats" data-index="'+index+'">\u2295</span>' +
                '<span id="func-id-'+index+'">' +
                  transformer.escape(token.value) +
                '</span>';
            } else {
              returnValue += '<span id="id-'+index+'">';
              returnValue += transformer.escape(token.value);

              // add a bunch of rules on which to extend the wrap. certain things can be improved visually.
              var current = token;
              var last = token;
              while (current = transformer.nextBlack(last, tree)) {
                var lv = last.value;
                var cv = current.value;

                if (lv === '[' && last.isExpressionStart) {
                  current = null;
                } else if (cv === '.') {
                  current = transformer.nextBlack(current, tree);
                  if (current) {
                    returnValue += transformer.rangeString(tree, index+1, current.white);
                    index = current.white;
                  }
                } else if (
                  // TOFIX: problem with ExpressionStatement

                  ((lv === '++' || lv === '--') && current.type === IDENTIFIER) ||

                  // only grab current (cv) for unary ops if last (lv) was not a paren open
                  lv === '!' ||
                  lv === '~' ||
                  lv === 'new' ||
                  lv === 'delete' ||
                  lv === 'typeof' ||

                  // +- are only danger here since they can also be unary...
                  lv === '+' ||
                  lv === '-' ||

                    // TOFIX: find a way to do these properly
//                  (lv !== '(' && (
//                    cv === '+' ||
//                    cv === '-' ||
////                    cv === '!' ||
//                    cv === '~' ||
//                    cv === 'new' ||
//                    cv === 'delete' ||
//                    cv === 'typeof' ||
//
//                    // +- are only danger here since they can also be unary...
//                    cv === '+' ||
//                    cv === '-' ||
//
//                    // this has the same problem as unaries `(15)`, but we'd like them in
////                    current.type === NUMBER ||
//                    current.type === STRING ||
//                    current.type === REGEX
//                  )) ||

                  // lookahead for binary ops though... (lv and nv)
                  lv === '==' ||
                  cv === '==' ||
                  lv === '===' ||
                  cv === '===' ||
                  lv === '!=' ||
                  cv === '!=' ||
                  lv === '!==' ||
                  cv === '!==' ||
                  lv === '/' ||
                  cv === '/' ||
                  lv === '&' ||
                  cv === '&' ||
                  lv === '|' ||
                  cv === '|' ||
                  lv === '^' ||
                  cv === '^' ||
                  lv === '%' ||
                  cv === '%' ||
                  lv === '*' ||
                  cv === '*' ||
                  lv === '<' ||
                  cv === '<' ||
                  lv === '>' ||
                  cv === '>' ||
                  lv === '<<' ||
                  cv === '<<' ||
                  lv === '>>' ||
                  cv === '>>' ||
                  lv === '>>>' ||
                  cv === '>>>' ||
                  lv === '<=' ||
                  cv === '<=' ||
                  lv === '>=' ||
                  cv === '>=' ||
                  lv === '>>=' ||
                  cv === '>>=' ||
                  lv === '>>>=' ||
                  cv === '>>>='
                ) {
                  returnValue += transformer.rangeString(tree, index+1, current.white);
                  index = current.white;
//                } else if (
////                  ((cv === '++' || cv === '--') && lv !== '(') || // TOFIX: find a way to do this properly
//                  cv === '[') {
//                  returnValue += transformer.rangeString(tree, index+1, current.white);
//                  index = current.white;
//                  current = null; // end of any expression
                } else if (cv === '(' && current.isCallStart) {
                  returnValue += transformer.rangeString(tree, index+1, current.white);
                  index = current.white;
                  current = transformer.nextBlack(current, tree);
                  if (current.value === ')' && current.isCallStop) {
                    returnValue += transformer.rangeString(tree, index+1, current.white);
                    index = current.white;
                    current = transformer.nextBlack(current, tree);
                  } else {
                    current = null;
                  }
                } else {
                  current = null; // did not find anything to continue, so stop
                }
                last = current;
              }

              returnValue += '</span>';
            }
          } else {
            returnValue += transformer.escape(token.value);
          }
        } else if (token.isQmark) {
          returnValue += '<span id="qmark-id-'+index+'">' + transformer.escape(token.value) + '</span>';
          alreadyEscaped = true;
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

            // TODO what case is this?
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

  exports.transformer = transformer;
})(
  typeof exports !== 'undefined' ? exports : window,
  // pass on Par so it cant get overwritten by user code
  window.Par || exports.Par || require(__dirname+'/../lib/par.js').Par
);
