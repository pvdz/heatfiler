// If you see magic numbers and bools all over the place, it means this
// file has been post-processed by a build script. If you want to read
// this file, see https://github.com/qfox/zeparser2
(function(exports){
  var Tok = exports.Tok || require(__dirname+'/tok.js').Tok;

  // indices match slots of the start-regexes (where applicable)
  // this order is determined by regex/parser rules so they are fixed
  var WHITE_SPACE = 1;
  var LINETERMINATOR = 2;
  var COMMENT_SINGLE = 3;
  var COMMENT_MULTI = 4;
  var STRING = 10;
  var STRING_SINGLE = 5;
  var STRING_DOUBLE = 6;
  var NUMBER = 7;
  var NUMERIC_DEC = 11;
  var NUMERIC_HEX = 12;
  var REGEX = 8;
  var PUNCTUATOR = 9;
  var IDENTIFIER = 13;
  var EOF = 14;
  var ASI = 15;
  var ERROR = 16;
  var WHITE = 18; // WHITE_SPACE, LINETERMINATOR COMMENT_SINGLE COMMENT_MULTI

  // extra assignment and for-in checks
  var NOPARSE = 0;
  var NONASSIGNEE = 1; // invalid lhs for assignments
  var NONFORIN = 2; // comma, assignment, non-assignee
  var ASSIGNEE = 4;
  var NEITHER = NONASSIGNEE | NONFORIN;
  var ISLABEL = 8;

  // boolean constants
  var OPTIONAL = true;
  var REQUIRED = false;
  var NOTFORFUNCTIONEXPRESSION = true;
  var PARSEDSOMETHING = true;
  var PARSEDNOTHING = false;
  var FORFUNCTIONDECL = true;
  var NOTFORFUNCTIONDECL = false;
  var NEXTTOKENCANBEREGEX = true;
  var NEXTTOKENCANBEDIV = false;
  var INLOOP = true;
  var NOTINLOOP = false;
  var INSWITCH = true;
  var NOTINSWITCH = false;
  var INFUNCTION = true;
  var NOTINFUNCTION = false;
  var IGNOREVALUES = true;
  var DONTIGNOREVALUES = false;

  var ORD_L_A = 0x61;
  var ORD_L_B = 0x62;
  var ORD_L_C = 0x63;
  var ORD_L_D = 0x64;
  var ORD_L_E = 0x65;
  var ORD_L_F = 0x66;
  var ORD_L_G = 0x67;
  var ORD_L_H = 0x68;
  var ORD_L_I = 0x69;
  var ORD_L_L = 0x6c;
  var ORD_L_M = 0x6d;
  var ORD_L_N = 0x6e;
  var ORD_L_O = 0x6f;
  var ORD_L_Q = 0x71;
  var ORD_L_R = 0x72;
  var ORD_L_S = 0x73;
  var ORD_L_T = 0x74;
  var ORD_L_U = 0x75;
  var ORD_L_V = 0x76;
  var ORD_L_W = 0x77;
  var ORD_L_X = 0x78;
  var ORD_L_Y = 0x79;

  var ORD_OPEN_CURLY = 0x7b;
  var ORD_CLOSE_CURLY = 0x7d;
  var ORD_OPEN_PAREN = 0x28;
  var ORD_CLOSE_PAREN = 0x29;
  var ORD_OPEN_SQUARE = 0x5b;
  var ORD_CLOSE_SQUARE = 0x5d;
  var ORD_TILDE = 0x7e;
  var ORD_PLUS = 0x2b;
  var ORD_MIN = 0x2d;
  var ORD_EXCL = 0x21;
  var ORD_QMARK = 0x3f;
  var ORD_COLON = 0x3a;
  var ORD_SEMI = 0x3b;
  var ORD_IS = 0x3d;
  var ORD_COMMA = 0x2c;
  var ORD_DOT = 0x2e;
  var ORD_STAR = 0x2a;
  var ORD_OR = 0x7c;
  var ORD_AND = 0x26;
  var ORD_PERCENT = 0x25;
  var ORD_XOR = 0x5e;
  var ORD_FWDSLASH = 0x2f;
  var ORD_LT = 0x3c;
  var ORD_GT = 0x3e;

  var Par = exports.Par = function(input, options){
    this.options = options = options || {};

    if (!options.saveTokens) options.saveTokens = false;
    if (!options.createBlackStream) options.createBlackStream = false;
    if (!options.functionMode) options.functionMode = false;
    if (!options.regexNoClassEscape) options.regexNoClassEscape = false;
    if (!options.strictForInCheck) options.strictForInCheck = false;
    if (!options.strictAssignmentCheck) options.strictAssignmentCheck = false;

    // `this['tok'] prevents build script mangling :)
    this['tok'] = new Tok(input, this.options);
    this['run'] = this.run; // used in Par.parse
  };

  exports.Par.parse = function(input, options){
    var par = new Par(input, options);
    par.run();
    return par;
  };

  var proto = {
    /**
     * This object is shared with Tok.
     *
     * @property {Object} options
     * @property {boolean} [options.saveTokens=false] Make the tokenizer put all found tokens in .tokens
     * @property {boolean} [options.createBlackStream=false] Requires saveTokens, put black tokens in .black
     * @property {boolean} [options.functionMode=false] In function mode, `return` is allowed in global space
     //     * @property {boolean} [options.scriptMode=false] (TODO, #12)
     * @property {boolean} [options.regexNoClassEscape=false] Don't interpret backslash in regex class as escape
     * @property {boolean} [options.strictForInCheck=false] Reject the lhs for a `for` if it's technically bad (not superseded by strict assignment option)
     * @property {boolean} [options.strictAssignmentCheck=false] Reject the lhs for assignments if it can't be correct at runtime (does not supersede for-in option)
     */
    options: null,

    /**
     * @property {Tok} tok
     */
    tok: null,

    run: function(){
      var tok = this.tok;
      // prepare
      tok.nextExpr();
      // go!
      this.parseStatements(NOTINFUNCTION, NOTINLOOP, NOTINSWITCH, [], {white:-1, lastExpressionStart:[]});
      if (tok.pos !== tok.len) throw 'Did not complete parsing... '+tok.syntaxError();

      return this;
    },

    parseStatements: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      var tok = this.tok;
      // note: statements are optional, this function might not parse anything
      while (!tok.isType(EOF) && this.parseStatement(inFunction, inLoop, inSwitch, labelSet, OPTIONAL, funcToken));
    },
    parseStatement: function(inFunction, inLoop, inSwitch, labelSet, optional, funcToken){
      var tok = this.tok;

      var found = false;

      var start = tok.lastToken;
      start.isStatementStart = true;

      if (tok.isType(IDENTIFIER)) {
        // dont "just" return true. case and default still return false
        found = this.parseIdentifierStatement(inFunction, inLoop, inSwitch, labelSet, funcToken, start);
      } else {
        var c = tok.getLastNum();

        if (c === ORD_OPEN_CURLY) {
          // TOFIX i dont think this is important in the heatmap, maybe not mark this case as statement?
          tok.nextExpr();
          this.parseBlock(NOTFORFUNCTIONEXPRESSION, inFunction, inLoop, inSwitch, labelSet, funcToken, false);
          found = PARSEDSOMETHING;
        } else if (c === ORD_OPEN_PAREN || c === ORD_OPEN_SQUARE || c === ORD_TILDE || c === ORD_PLUS || c === ORD_MIN || c === ORD_EXCL) {
          start.isStatementStart = false;
          this.parseExpressionStatement(funcToken);
          found = PARSEDSOMETHING;
        } else if (c === ORD_SEMI) { // empty statement
          // this shouldnt occur very often, but they still do.
          tok.nextExpr();
          found = PARSEDSOMETHING;
          start.sameToken = true;
          return found;
        } else if (tok.isValue()) {
          start.isStatementStart = false;
          this.parseExpressionStatement(funcToken);
          found = PARSEDSOMETHING;
        } else {
          if (!optional) throw 'Expected more input...';
          found = PARSEDNOTHING;
        }
      }

      if (start.isStatementStart) {
        if (tok.lastToken === start) {
          start.sameToken = true;
        } else {
          var lt = tok.lastToken;
          do lt = tok.tokens[lt.white-1];
          while (lt.type === WHITE);

          if (!lt.isStatementStop) lt.isStatementStop = 1;
          else ++lt.isStatementStop;
        }
      }

      return found;
    },
    parseIdentifierStatement: function(inFunction, inLoop, inSwitch, labelSet, funcToken, statementStart){
      var tok = this.tok;

      // The current token is an identifier. Either its value will be
      // checked in this function (parseIdentifierStatement) or in the
      // parseExpressionOrLabel function. So we can just get it now.
      var value = tok.getLastValue();

      // track whether this token was parsed. if not, do parseExpressionOrLabel at the end
      var startCount = tok.tokenCountAll;

      var len = tok.lastLen;

      // TODO: could add identifier check to conditionally call parseExpressionOrLabel vs parseExpression

      // yes, this check makes a *huge* difference
      if (len >= 2 && len <= 8) {
        // bcdfirstvw, not in that order.
        var c = tok.getLastNum();

        if (c === ORD_L_T) {
          if (value === 'try') this.parseTry(inFunction, inLoop, inSwitch, labelSet, funcToken);
          else if (value === 'throw') this.parseThrow(funcToken);
        }
        else if (c === ORD_L_I && len === 2 && tok.getLastNum2() === ORD_L_F) this.parseIf(inFunction, inLoop, inSwitch, labelSet, funcToken);
        else if (c === ORD_L_V && value === 'var') this.parseVar(funcToken);
        else if (c === ORD_L_R && value === 'return') this.parseReturn(inFunction, inLoop, inSwitch, funcToken);
        else if (c === ORD_L_F) {
          if (value === 'function') this.parseFunction(FORFUNCTIONDECL);
          else if (value === 'for') this.parseFor(inFunction, inLoop, inSwitch, labelSet, funcToken);
        }
        else if (c === ORD_L_C) {
          if (value === 'continue') this.parseContinue(inFunction, inLoop, inSwitch, labelSet);
          else if (value === 'case') return PARSEDNOTHING; // case is handled elsewhere
        }
        else if (c === ORD_L_B && value === 'break') this.parseBreak(inFunction, inLoop, inSwitch, labelSet);
        else if (c === ORD_L_D) {
          if (value === 'default') return PARSEDNOTHING; // default is handled elsewhere
          else if (len === 2 && tok.getLastNum2() === ORD_L_O) this.parseDo(inFunction, inLoop, inSwitch, labelSet, funcToken);
          else if (value === 'debugger') this.parseDebugger();
        }
        else if (c === ORD_L_S && value === 'switch') this.parseSwitch(inFunction, inLoop, inSwitch, labelSet, funcToken);
        else if (c === ORD_L_W) {
          if (value === 'while') this.parseWhile(inFunction, inLoop, inSwitch, labelSet, funcToken);
          else if (value === 'with') this.parseWith(inFunction, inLoop, inSwitch, labelSet, funcToken);
        }
      }

      // this function _must_ parse _something_, if we parsed nothing, it's an expression statement or labeled statement
      if (tok.tokenCountAll === startCount) this.parseExpressionOrLabel(value, inFunction, inLoop, inSwitch, labelSet, funcToken, statementStart);

      return PARSEDSOMETHING;
    },
    parseStatementHeader: function(funcToken){
      var tok = this.tok;
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEREGEX);
      this.parseExpressions(funcToken);
      tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEREGEX);
    },

    parseVar: function(funcToken){
      // var <vars>
      // - foo
      // - foo=bar
      // - ,foo=bar

      var tok = this.tok;
      tok.nextPunc();
      do {
        if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'var name is reserved';
        tok.mustBeIdentifier(NEXTTOKENCANBEREGEX); // TOFIX: can never be regex nor div. does that matter?
        if (tok.isNum(ORD_IS) && tok.lastLen === 1) {
          tok.nextExpr();
          this.parseExpression(funcToken);
        }
      } while(tok.nextExprIfNum(ORD_COMMA));
      this.parseSemi();
    },
    parseVarPartNoIn: function(funcToken){
      var state = NOPARSE;
      var tok = this.tok;

      do {
        if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'var name is reserved';
        tok.mustBeIdentifier(NEXTTOKENCANBEREGEX);

        if (tok.isNum(ORD_IS) && tok.lastLen === 1) {
          tok.nextExpr();
          this.parseExpressionNoIn(funcToken);
        }
      } while(tok.nextExprIfNum(ORD_COMMA) && (state = NONFORIN));

      return state;
    },
    parseIf: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // if (<exprs>) <stmt>
      // if (<exprs>) <stmt> else <stmt>

      this.tok.nextPunc();
      this.parseStatementHeader(funcToken);
      this.parseStatement(inFunction, inLoop, inSwitch, labelSet, REQUIRED, funcToken);

      this.parseElse(inFunction, inLoop, inSwitch, labelSet, funcToken);
    },
    parseElse: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // else <stmt>;

      var tok = this.tok;
      if (tok.getLastValue() === 'else') {
        tok.lastToken.isElseToken = true;
        tok.nextExpr();
        this.parseStatement(inFunction, inLoop, inSwitch, labelSet, REQUIRED, funcToken);
      }
    },
    parseDo: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // do <stmt> while ( <exprs> ) ;

      var tok = this.tok;
      tok.nextExpr(); // do
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
      tok.mustBeString('while', NEXTTOKENCANBEDIV);
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEREGEX);
      this.parseExpressions(funcToken);
      tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV); //no regex following because it's either semi or newline without asi if a forward slash follows it
      this.parseSemi();
    },
    parseWhile: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // while ( <exprs> ) <stmt>

      this.tok.nextPunc();
      this.parseStatementHeader(funcToken);
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
    },
    parseFor: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // for ( <expr-no-in-=> in <exprs> ) <stmt>
      // for ( var <idntf> in <exprs> ) <stmt>
      // for ( var <idntf> = <expr-no-in> in <exprs> ) <stmt>
      // for ( <expr-no-in> ; <expr> ; <expr> ) <stmt>

      var state = NOPARSE;

      var tok = this.tok;
      tok.nextPunc(); // for
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEREGEX);

      if (tok.nextExprIfNum(ORD_SEMI)) this.parseForEachHeader(funcToken); // empty first expression in for-each
      else {

        if (tok.isNum(ORD_L_V) && tok.nextPuncIfString('var')) state = this.parseVarPartNoIn(funcToken);
        // expression_s_ because it might be regular for-loop...
        // (though if it isn't, it can't have more than one expr)
        else state = this.parseExpressionsNoIn(funcToken);

        if (tok.nextExprIfNum(ORD_SEMI)) this.parseForEachHeader(funcToken);
        else if (tok.getLastNum() !== ORD_L_I || tok.getLastNum2() !== ORD_L_N || tok.lastLen !== 2) throw 'Expected `in` or `;` here... '+tok.syntaxError();
        else if (state && this.options.strictForInCheck) throw 'Encountered illegal for-in lhs. '+tok.syntaxError();
        else this.parseForInHeader(funcToken);
      }

      tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEREGEX);
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
    },
    parseForEachHeader: function(funcToken){
      // <expr> ; <expr> ) <stmt>

      this.parseOptionalExpressions(funcToken);
      this.tok.mustBeNum(ORD_SEMI, NEXTTOKENCANBEREGEX);
      this.parseOptionalExpressions(funcToken);
    },
    parseForInHeader: function(funcToken){
      // in <exprs> ) <stmt>

      var tok = this.tok;
      tok.nextExpr(); // `in` validated by `parseFor`
      this.parseExpressions(funcToken);
    },
    parseContinue: function(inFunction, inLoop, inSwitch, labelSet){
      // continue ;
      // continue <idntf> ;
      // newline right after keyword = asi

      var tok = this.tok;

      if (!inLoop) throw 'Can only continue in a loop. '+tok.syntaxError();

      tok.nextPunc(); // token after continue cannot be a regex, either way.

      if (!tok.lastNewline && tok.isType(IDENTIFIER)) {
        this.parseLabel(labelSet);
      }

      this.parseSemi();
    },
    parseBreak: function(inFunction, inLoop, inSwitch, labelSet){
      // break ;
      // break <idntf> ;
      // break \n <idntf> ;
      // newline right after keyword = asi

      var tok = this.tok;
      tok.nextPunc(); // token after break cannot be a regex, either way.

      if (tok.lastNewline || !tok.isType(IDENTIFIER)) { // no label after break?
        if (!inLoop && !inSwitch) {
          // break without label
          throw 'Break without value only in loops or switches. '+tok.syntaxError();
        }
      } else {
        this.parseLabel(labelSet);
      }

      this.parseSemi();
    },
    parseLabel: function(labelSet){
      var tok = this.tok;
      // next tag must be an identifier
      var label = tok.getLastValue();
      if (labelSet.indexOf(label) >= 0) {
        tok.nextExpr(); // label (already validated)
      } else {
        throw 'Label ['+label+'] not found in label set. '+tok.syntaxError();
      }
    },
    parseReturn: function(inFunction, inLoop, inSwitch, funcToken){
      // return ;
      // return <exprs> ;
      // newline right after keyword = asi

      var tok = this.tok;

      if (!inFunction && !this.options.functionMode) throw 'Can only return in a function '+tok.syntaxError('break');

      var retToken = tok.lastToken;

      tok.nextExpr();
      var start = tok.lastToken.white-1;

      if (tok.lastNewline) {
        this.addAsi();
        var asi = tok.tokens[tok.tokens.length-2];
        asi.returnValueEmpty = true;
        asi.funcToken = funcToken;
      } else {
        var count = tok.tokens.length;
        this.parseOptionalExpressions(funcToken);

        if (tok.tokens.length === count) {
          retToken.returnValueEmpty = true;
          tok.lastToken.isExpressionStart = undefined;
          retToken.funcToken = funcToken;
        } else {
          var target = tok.tokens[tok.tokens.length-2];
          retToken.returnValueEnd = target;
          retToken.funcToken = funcToken;
        }

        var before = tok.lastToken;
        if (this.parseSemi() === ASI) {
          var target = tok.tokens[tok.tokens.length-3];
          retToken.returnValueEnd = target;
        }
      }
    },
    parseThrow: function(funcToken){
      // throw <exprs> ;

      var tok = this.tok;
      tok.nextExpr();
      if (tok.lastNewline) {
        throw 'No newline allowed directly after a throw, ever. '+tok.syntaxError();
      } else {
        this.parseExpressions(funcToken);
        this.parseSemi();
      }
    },
    parseSwitch: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // switch ( <exprs> ) { <switchbody> }

      var tok = this.tok;
      tok.nextPunc();
      this.parseStatementHeader(funcToken);
      tok.mustBeNum(ORD_OPEN_CURLY, NEXTTOKENCANBEREGEX);
      this.parseSwitchBody(inFunction, inLoop, INSWITCH, labelSet, funcToken);
      tok.mustBeNum(ORD_CLOSE_CURLY, NEXTTOKENCANBEREGEX);
    },
    parseSwitchBody: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // [<cases>] [<default>] [<cases>]

      // default can go anywhere...
      this.parseCases(inFunction, inLoop, inSwitch, labelSet, funcToken);
      if (this.tok.nextPuncIfString('default')) {
        this.parseDefault(inFunction, inLoop, inSwitch, labelSet, funcToken);
        this.parseCases(inFunction, inLoop, inSwitch, labelSet, funcToken);
      }
    },
    parseCases: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      var tok = this.tok;
      while (tok.nextPuncIfString('case')) {
        this.parseCase(inFunction, inLoop, inSwitch, labelSet, funcToken);
      }
    },
    parseCase: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // case <value> : <stmts-no-case-default>
      this.parseExpressions(funcToken);
      this.tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      this.parseStatements(inFunction, inLoop, inSwitch, labelSet, funcToken);
    },
    parseDefault: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // default <value> : <stmts-no-case-default>
      this.tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      this.parseStatements(inFunction, inLoop, inSwitch, labelSet, funcToken);
    },
    parseTry: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // try { <stmts> } catch ( <idntf> ) { <stmts> }
      // try { <stmts> } finally { <stmts> }
      // try { <stmts> } catch ( <idntf> ) { <stmts> } finally { <stmts> }

      this.tok.nextPunc();
      this.parseCompleteBlock(NOTFORFUNCTIONEXPRESSION, inFunction, inLoop, inSwitch, labelSet, funcToken);

      var one = this.parseCatch(inFunction, inLoop, inSwitch, labelSet, funcToken);
      var two = this.parseFinally(inFunction, inLoop, inSwitch, labelSet, funcToken);

      if (!one && !two) throw 'Try must have at least a catch or finally block or both: '+this.tok.debug();
    },
    parseCatch: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // catch ( <idntf> ) { <stmts> }

      var tok = this.tok;
      if (tok.nextPuncIfString('catch')) {
        tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEDIV);

        // catch var
        if (tok.isType(IDENTIFIER)) {
          if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'Catch scope var name is reserved';
          tok.nextPunc();
        } else {
          throw 'Missing catch scope variable';
        }

        tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV);
        this.parseCompleteBlock(NOTFORFUNCTIONEXPRESSION, inFunction, inLoop, inSwitch, labelSet, funcToken);

        return PARSEDSOMETHING;
      }
      return PARSEDNOTHING;
    },
    parseFinally: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // finally { <stmts> }

      if (this.tok.nextPuncIfString('finally')) {
        this.parseCompleteBlock(NOTFORFUNCTIONEXPRESSION, inFunction, inLoop, inSwitch, labelSet, funcToken);

        return PARSEDSOMETHING;
      }
      return PARSEDNOTHING;
    },
    parseDebugger: function(){
      // debugger ;

      this.tok.nextPunc();
      this.parseSemi();
    },
    parseWith: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // with ( <exprs> ) <stmts>

      this.tok.nextPunc();
      this.parseStatementHeader(funcToken);
      this.parseStatement(inFunction, inLoop, inSwitch, labelSet, REQUIRED, funcToken);
    },
    parseFunction: function(forFunctionDeclaration){
      // function [<idntf>] ( [<param>[,<param>..] ) { <stmts> }

      var tok = this.tok;
      var funcToken = tok.lastToken;
      funcToken.isFunctionMarker = true; // "marker" -> getters/setters
      funcToken.lastExpressionStart = [];
      tok.nextPunc(); // 'function'
      if (tok.isType(IDENTIFIER)) { // name
        if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'function name is reserved';
        tok.lastToken.funcToken = funcToken;
        tok.nextPunc();
      } else if (forFunctionDeclaration) {
        throw 'function declaration name is required';
      }
      this.parseFunctionRemainder(-1, forFunctionDeclaration, funcToken);
    },
    /**
     * Parse the function param list and body
     *
     * @param {number} paramCount Number of expected params, -1/undefined means no requirement. used for getters and setters
     * @param {boolean} forFunctionDeclaration Are we parsing a function declaration (determines whether we can parse a division next)
     * @param {object} funcToken
     */
    parseFunctionRemainder: function(paramCount, forFunctionDeclaration, funcToken){
      var tok = this.tok;
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEDIV);
      this.parseParameters(paramCount, funcToken);
      tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV);
      this.parseCompleteBlock(forFunctionDeclaration, INFUNCTION, NOTINLOOP, NOTINSWITCH, [], funcToken, true);
    },
    parseParameters: function(paramCount, funcToken){
      // [<idntf> [, <idntf>]]
      var tok = this.tok;
      if (tok.isType(IDENTIFIER)) {
        if (paramCount === 0) throw 'Getters have no parameters';
        if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'Function param name is reserved';
        else if (!funcToken.argTokens) funcToken.argTokens = [tok.lastToken];
        else funcToken.argTokens.push(tok.lastToken);
        tok.lastToken.isArg = true;
        tok.nextExpr();
        // there are only two valid next tokens; either a comma or a closing paren
        while (tok.nextExprIfNum(ORD_COMMA)) {
          if (paramCount === 1) throw 'Setters have exactly one param';

          funcToken.argTokens.push(tok.lastToken);
          tok.lastToken.isArg = true;

          // param name
          if (tok.isType(IDENTIFIER)) {
            if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'Function param name is reserved';
            tok.lastToken.funcToken = funcToken;
            tok.nextPunc();
          } else {
            throw 'Missing func param name';
          }
        }
      } else if (paramCount === 1) {
        throw 'Setters have exactly one param';
      }
    },
    // TODO: rename `notForFunctionExpression` to indicate `firstTokenAfterFunctionCanBeRegex / Div` instead, flush through all callers
    parseBlock: function(notForFunctionExpression, inFunction, inLoop, inSwitch, labelSet, funcToken, forFunction){
      this.parseStatements(inFunction, inLoop, inSwitch, labelSet, funcToken);
      // note: this parsing method is also used for functions. the only case where
      // the closing curly can be followed by a division rather than a regex lit
      // is with a function expression. that's why we needed to make it a parameter
      if (forFunction) {
        this.tok.lastToken.functionBodyClose = true;
        this.tok.lastToken.funcToken = funcToken;
      }
      var t = this.tok.lastToken;
      this.tok.mustBeNum(ORD_CLOSE_CURLY, notForFunctionExpression);
      return t;
    },
    parseCompleteBlock: function(notForFunctionExpression, inFunction, inLoop, inSwitch, labelSet, funcToken, forFunction){
      funcToken.lhc = this.tok.lastToken;
      this.tok.lastToken.funcToken = funcToken;
      this.tok.mustBeNum(ORD_OPEN_CURLY, NEXTTOKENCANBEREGEX);
      funcToken.rhc = this.parseBlock(notForFunctionExpression, inFunction, inLoop, inSwitch, labelSet, funcToken, forFunction);
    },
    parseSemi: function(){
      if (this.tok.nextExprIfNum(ORD_SEMI)) return PUNCTUATOR;
      if (this.parseAsi()) return ASI;
      throw 'Unable to parse semi, unable to apply ASI. '+this.tok.syntaxError();
    },
    parseAsi: function(){
      // asi at EOF, if next token is } or if there is a newline between prev and next (black) token
      // asi prevented if asi would be empty statement, no asi in for-header, no asi if next token is regex

      var tok = this.tok;
      if (tok.isNum(ORD_CLOSE_CURLY) || (tok.lastNewline && !tok.isType(REGEX)) || tok.isType(EOF)) {
        return this.addAsi();
      }
      return PARSEDNOTHING;
    },
    addAsi: function(){
      var tok = this.tok;
      ++tok.tokenCountAll;

      // splice in the asi, it should go before the current token
      var last = tok.tokens.pop();
      // the newline makes sure an asi at eof does not follow a single line comment (in case we pre/append code to it)
      tok.tokens.push({type:ASI, value:'\n;', start:tok.lastStart, stop:tok.lastStart, white:tok.tokens.length});
      last.white = tok.tokens.length;
      tok.tokens.push(last);
      return ASI;
    },

    parseExpressionStatement: function(funcToken){
      this.parseExpressions(funcToken);
      this.parseSemi();
    },
    parseExpressionOrLabel: function(labelName, inFunction, inLoop, inSwitch, labelSet, funcToken, statementStart){
      funcToken.lastExpressionStart.push(this.tok.lastToken);
      // this method is only called at the start of
      // a statement that starts with an identifier.

      // ugly but mandatory label check
      // if this is a label, the parsePrimary parser
      // will have bailed when seeing the colon.
      var state = this.parsePrimaryOrLabel(labelName, funcToken);
      if (state & ISLABEL) {
        funcToken.lastExpressionStart.pop();

        // the label will have been checked for being a reserved keyword
        // except for the value keywords. so we need to do that here.
        // no need to check for function, because that cant occur here.
        // note that it's pretty rare for the parser to reach this
        // place, so i dont feel it's very important to take the uber
        // optimized route. simple string comparisons will suffice.
        // note that this is already confirmed to be used as a label so
        // if any of these checks match, an error will be thrown.
        if (this.isValueKeyword(labelName)) {
          throw 'Reserved identifier found in label. '+this.tok.syntaxError();
        }

        labelSet.push(labelName);
        this.parseStatement(inFunction, inLoop, inSwitch, labelSet, REQUIRED, funcToken);
        labelSet.pop();

      } else {
        statementStart.isStatementStart = false; // it will be superseded by the expression start
        // TOFIX: add test case where this fails; `state & NONASSIGNEE` needs parenthesis
        this.parseAssignments(state & NONASSIGNEE > 0, funcToken);
        this.parseNonAssignments(funcToken);
        funcToken.lastExpressionStart.pop().isExpressionStart = this.tok.lastToken;

        if (this.tok.nextExprIfNum(ORD_COMMA)) this.parseExpressions(funcToken);
        this.parseSemi();
      }
    },
    parseOptionalExpressions: function(funcToken){
      var tok = this.tok;
      var tokCount = tok.tokenCountAll;
      this.parseExpressionOptional(funcToken);
      if (tokCount !== tok.tokenCountAll) {
        while (tok.nextExprIfNum(ORD_COMMA)) {
          this.parseExpression(funcToken);
        }
      }
    },
    parseExpressions: function(funcToken){
      var nonAssignee = this.parseExpression(funcToken);
      var tok = this.tok;
      while (tok.nextExprIfNum(ORD_COMMA)) {
        this.parseExpression(funcToken);
        // not sure, but if the expression was not an assignment, it's probably irrelevant
        // except in the case of a group, in which case it becomes an invalid assignee, so:
        nonAssignee = true;
      }
      return nonAssignee;
    },
    parseExpression: function(funcToken){
      var tok = this.tok;
      var tokCount = tok.tokenCountAll;

      var nonAssignee = this.parseExpressionOptional(funcToken);

      // either tokenizer pos moved, or we reached the end (we hadnt reached the end before)
      if (tokCount === tok.tokenCountAll) throw 'Expected to parse an expression, did not find any';

      return nonAssignee;
    },
    parseExpressionOptional: function(funcToken){
      var tokCount = this.tok.tokenCountAll;
      funcToken.lastExpressionStart.push(this.tok.lastToken);

      var nonAssignee = this.parsePrimary(OPTIONAL, funcToken);
      // if there was no assignment, state will be the same.
      // TODO: does this allow bad syntax? optional expression, no primary but only an assignment...
      nonAssignee = this.parseAssignments(nonAssignee, funcToken) !== 0;

      // TODO: does this allow bad syntax? optional expression, no primary but only a binary...
      // any binary operator is illegal as assignee and illegal as for-in lhs
      if (this.parseNonAssignments(funcToken)) nonAssignee = true;

      var start = funcToken.lastExpressionStart.pop();
      if (tokCount !== this.tok.tokenCountAll && start !== this.tok.lastToken && start.type !== EOF) start.isExpressionStart = this.tok.lastToken;
      else start.isExpressionStart = undefined;

      return nonAssignee;
    },
    parseAssignments: function(nonAssignee, funcToken){
      // assignment ops are allowed until the first non-assignment binary op
      var nonForIn = NOPARSE;
      var tok = this.tok;
      while (this.isAssignmentOperator()) {
        if (nonAssignee && this.options.strictAssignmentCheck) throw 'LHS is invalid assignee';
        // any assignment means not a for-in per definition
        tok.nextExpr();
        funcToken.lastExpressionStart.pop().isExpressionStart = undefined;
        funcToken.lastExpressionStart.push(this.tok.lastToken);

        nonAssignee = this.parsePrimary(REQUIRED, funcToken);
        nonForIn = NONFORIN; // always
      }

      return (nonAssignee ? NONASSIGNEE : NOPARSE) | nonForIn;
    },
    parseNonAssignments: function(funcToken){
      var parsed = PARSEDNOTHING;
      var tok = this.tok;
      // keep parsing non-assignment binary/ternary ops
      while (true) {
        if (this.isBinaryOperator()) {
          var wasLogical = tok.lastToken.value === '&&' || tok.lastToken.value === '||';
          tok.lastToken.isLogical = wasLogical;
          if (wasLogical) {
            funcToken.lastExpressionStart.pop().isExpressionStart = tok.lastToken;
          }
          tok.nextExpr();
          if (wasLogical) {
            funcToken.lastExpressionStart.push(tok.lastToken);
          }
          this.parsePrimary(REQUIRED, funcToken);
        }
        else if (tok.isNum(ORD_QMARK)) {
          this.parseTernary(funcToken);
          funcToken.lastExpressionStart.pop().isExpressionStart = undefined;
        }
        else break;
        // any binary is a non-for-in
        parsed = PARSEDSOMETHING;
      }
      return parsed;
    },
    parseTernary: function(funcToken){
      var tok = this.tok;
//      funcToken.lastExpressionStart.pop().isExpressionStart = tok.lastToken;
      tok.nextExpr();
      this.parseExpression(funcToken);
      tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      this.parseExpression(funcToken);
      funcToken.lastExpressionStart.push(tok.lastToken);
    },
    parseTernaryNoIn: function(funcToken){
      var tok = this.tok;
      funcToken.lastExpressionStart.pop().isExpressionStart = tok.lastToken;
      tok.nextExpr();
      this.parseExpression(funcToken);
      tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      this.parseExpressionNoIn(funcToken);
    },
    parseExpressionsNoIn: function(funcToken){
      var tok = this.tok;

      var state = this.parseExpressionNoIn(funcToken);
      while (tok.nextExprIfNum(ORD_COMMA)) {
        // lhs of for-in cant be multiple expressions
        state = this.parseExpressionNoIn(funcToken) | NONFORIN;
      }

      return state;
    },
    parseExpressionNoIn: function(funcToken){
      funcToken.lastExpressionStart.push(this.tok.lastToken);

      var nonAssignee = this.parsePrimary(REQUIRED, funcToken);

      var state = this.parseAssignments(nonAssignee, funcToken);

      var tok = this.tok;
      // keep parsing non-assignment binary/ternary ops unless `in`
      var repeat = true;
      while (repeat) {
        if (this.isBinaryOperator()) {
          // rationale for using getLastNum; this is the `in` check which will succeed
          // about 50% of the time (stats from 8mb of various js). the other time it
          // will check for a primary. it's therefore more likely that an getLastNum will
          // save time because it would cache the charCodeAt for the other token if
          // it failed the check
          if (tok.getLastNum() === ORD_L_I && tok.getLastNum2() === ORD_L_N && tok.lastLen === 2) { // in
            repeat = false;
          } else {
            tok.nextExpr();
            // (seems this should be a required part...)
            this.parsePrimary(REQUIRED, funcToken);
            state = NEITHER;
          }
        } else if (tok.isNum(ORD_QMARK)) {
          this.parseTernaryNoIn(funcToken);
          state = NEITHER; // the lhs of a for-in cannot contain a ternary operator
        } else {
          repeat = false;
        }
      }

      return state; // example:`for (x+b++ in y);`
    },
    /**
     * Parse the "primary" expression value. This is like the root
     * value for any expression. Could be a number, string,
     * identifier, etc. The primary can have a prefix (like unary
     * operators) and suffixes (++, --) but they are parsed elsewhere.
     *
     * @return {boolean}
     */
    parsePrimary: function(optional, funcToken){
      // parses parts of an expression without any binary operators
      var nonAssignee = false;
      var parsedUnary = this.parseUnary(); // no unary can be valid in the lhs of an assignment

      var tok = this.tok;
      if (tok.isType(IDENTIFIER)) {
        var identifier = tok.getLastValue();
        if (tok.isNum(ORD_L_F) && identifier === 'function') {
          this.parseFunction(NOTFORFUNCTIONDECL);
          nonAssignee = true;
        } else {
          if (this.isReservedIdentifier(IGNOREVALUES)) throw 'Reserved identifier found in expression';
          tok.nextPunc();
          // any non-keyword identifier can be assigned to
          if (!nonAssignee && this.isValueKeyword(identifier)) nonAssignee = true;
        }
      } else {
        nonAssignee = this.parsePrimaryValue(optional && !parsedUnary, funcToken);
      }

      var suffixNonAssignee = this.parsePrimarySuffixes(funcToken);
      if (suffixNonAssignee === ASSIGNEE) nonAssignee = true;
      else if (suffixNonAssignee === NONASSIGNEE) nonAssignee = true;
      else if (suffixNonAssignee === NOPARSE && parsedUnary) nonAssignee = true;

      return nonAssignee;
    },
    parsePrimaryOrLabel: function(labelName, funcToken){
      // note: this function is only executed for statements that start
      //       with an identifier . the function keyword will already
      //       have been filtered out by the main statement start
      //       parsing method. So we dont have to check for the function
      //       keyword here; it cant occur.
      var tok = this.tok;

      var state = NOPARSE;

      // if we parse any unary, we wont have to check for label
      var hasPrefix = this.parseUnary();

      // simple shortcut: this function is only called if (at
      // the time of calling) the next token was an identifier.
      // if parseUnary returns true, we wont know what the type
      // of the next token is. otherwise it must still be identifier!
      if (!hasPrefix || tok.isType(IDENTIFIER)) {
        // in fact... we dont have to check for any of the statement
        // identifiers (break, return, if) because parseIdentifierStatement
        // will already have ensured a different code path in that case!
        // TOFIX: check how often this is called and whether it's worth investigating...
        if (this.isReservedIdentifier(IGNOREVALUES)) throw 'Reserved identifier found in expression. '+tok.syntaxError();

        tok.nextPunc();

        // now's the time... you just ticked off an identifier, check the current token for being a colon!
        // (quick check first: if there was a unary operator, this cant be a label)
        if (!hasPrefix) {
          if (tok.nextExprIfNum(ORD_COLON)) return ISLABEL;
        }
        if (hasPrefix || this.isValueKeyword(labelName)) state = NONASSIGNEE;
      } else {
        if (this.parsePrimaryValue(REQUIRED, funcToken) || hasPrefix) state = NONASSIGNEE;
      }

      var suffixState = this.parsePrimarySuffixes(funcToken);
      if (suffixState & ASSIGNEE) state = NOPARSE;
      else if (suffixState & NONASSIGNEE) state = NONASSIGNEE;

      return state;
    },
    parsePrimaryValue: function(optional, funcToken){
      // at this point in the expression parser we will
      // have ruled out anything else. the next token(s) must
      // be some kind of expression value...

      var nonAssignee = false;
      var tok = this.tok;
      if (tok.nextPuncIfValue()) {
        nonAssignee = true;
      } else {
        if (tok.nextExprIfNum(ORD_OPEN_PAREN)) nonAssignee = this.parseGroup(funcToken);
        else if (tok.nextExprIfNum(ORD_OPEN_CURLY)) this.parseObject(funcToken);
        else if (tok.nextExprIfNum(ORD_OPEN_SQUARE)) this.parseArray(funcToken);
        else if (!optional) throw 'Unable to parse required primary value';
      }

      return nonAssignee;
    },
    parseUnary: function(){
      var parsed = PARSEDNOTHING;
      var tok = this.tok;
      while (!tok.isType(EOF) && this.testUnary()) {
        tok.nextExpr();
        parsed = PARSEDSOMETHING;
      }
      return parsed; // return bool to determine possibility of label
    },
    testUnary: function(){
      // this method works under the assumption that the current token is
      // part of the set of valid tokens for js. So we don't have to check
      // for string lengths unless we need to disambiguate optional chars

      var tok = this.tok;
      var c = tok.getLastNum();

      if (c === ORD_L_T) return tok.getLastValue() === 'typeof';
      else if (c === ORD_L_N) return tok.getLastValue() === 'new';
      else if (c === ORD_L_D) return tok.getLastValue() === 'delete';
      else if (c === ORD_EXCL) return true;
      else if (c === ORD_L_V) return tok.getLastValue() === 'void';
      else if (c === ORD_MIN) return (tok.lastLen === 1 || (tok.getLastNum2() === ORD_MIN));
      else if (c === ORD_PLUS) return (tok.lastLen === 1 || (tok.getLastNum2() === ORD_PLUS));
      else if (c === ORD_TILDE) return true;

      return false;
    },
    parsePrimarySuffixes: function(funcToken){
      // --
      // ++
      // .<idntf>
      // [<exprs>]
      // (<exprs>)

      var nonAssignee = NOPARSE;

      // TODO: the order of these checks doesn't appear to be optimal (numbers first?)
      var tok = this.tok;
      var repeat = true;
      while (repeat) {
        var c = tok.getLastNum();
        // need tokenizer to check for a punctuator because it could never be a regex (foo.bar, we're at the dot between)
        if (c === ORD_DOT) {
          if (!tok.isType(PUNCTUATOR)) throw 'Number (?) after identifier?';
          tok.nextPunc();
          tok.mustBeIdentifier(NEXTTOKENCANBEDIV); // cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
          nonAssignee = ASSIGNEE; // property name can be assigned to (for-in lhs)
        } else if (c === ORD_OPEN_PAREN) {
          tok.nextExpr();
          this.parseOptionalExpressions(funcToken);
          tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV); // ) cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
          nonAssignee = NONASSIGNEE; // call cannot be assigned to (for-in lhs) (ok, there's an IE case, but let's ignore that...)
        } else if (c === ORD_OPEN_SQUARE) {
          tok.nextExpr();
          this.parseExpressions(funcToken); // required
          tok.mustBeNum(ORD_CLOSE_SQUARE, NEXTTOKENCANBEDIV); // ] cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
          nonAssignee = ASSIGNEE; // dynamic property can be assigned to (for-in lhs), expressions for-in state are ignored
        } else if (c === ORD_PLUS && tok.getLastNum2() === ORD_PLUS) {
          tok.nextPunc();
          // postfix unary operator lhs cannot have trailing property/call because it must be a LeftHandSideExpression
          nonAssignee = NONASSIGNEE; // cannot assign to foo++
          repeat = false;
        } else if (c === ORD_MIN &&  tok.getLastNum2() === ORD_MIN) {
          tok.nextPunc();
          // postfix unary operator lhs cannot have trailing property/call because it must be a LeftHandSideExpression
          nonAssignee = NONASSIGNEE; // cannot assign to foo--
          repeat = false;
        } else {
          repeat = false;
        }
      }
      return nonAssignee;
    },
    isAssignmentOperator: function(){
      // includes any "compound" operators

      // this method works under the assumption that the current token is
      // part of the set of valid tokens for js. So we don't have to check
      // for string lengths unless we need to disambiguate optional chars

      var tok = this.tok;
      var len = tok.lastLen;

      if (len === 1) return tok.getLastNum() === ORD_IS;

      else if (len === 2) {
        if (tok.getLastNum2() !== ORD_IS) return false;
        var c = tok.getLastNum();
        return (
          c === ORD_PLUS ||
            c === ORD_MIN ||
            c === ORD_STAR ||
            c === ORD_OR ||
            c === ORD_AND ||
            c === ORD_PERCENT ||
            c === ORD_XOR ||
            c === ORD_FWDSLASH
          );
      }

      else {
        // these <<= >>= >>>= cases are very rare
        if (len === 3 && tok.getLastNum() === ORD_LT) {
          return (tok.getLastNum2() === ORD_LT && tok.getLastNum3() === ORD_IS); // <<=
        }
        else if (tok.getLastNum() === ORD_GT) {
          return ((tok.getLastNum2() === ORD_GT) && (
            (len === 4 && tok.getLastNum3() === ORD_GT && tok.getLastNum4() === ORD_IS) || // >>>=
              (len === 3 && tok.getLastNum3() === ORD_IS) // >>=
            ));
        }
      }

      return false;
    },
    isBinaryOperator: function(){
      // non-assignment binary operator

      // this method works under the assumption that the current token is
      // part of the set of valid _tokens_ for js. So we don't have to check
      // for string lengths unless we need to disambiguate optional chars
      // and we dont need to worry about validation. the operator is either
      // going to be a punctuator, `in`, or `instanceof`. But note that the
      // token might still be a completely unrelated (error) kind of token.
      // We will parse it in such a way that the error condition is always
      // the longest path, though.

      var tok = this.tok;
      var c = tok.getLastNum();

      // so we have a valid  token, checking for binary ops is simple now except
      // that we have to make sure it's not an (compound) assignment!

      // About 80% of the calls to this method result in none of the ifs
      // even matching. The times the method returns `false` is even bigger.
      // To this end, we preliminary check a few cases so we can jump quicker.

      // (most frequent, for 27% 23% and 20% of the times this method is
      // called, c will be one of them (simple expression enders)
      if (c === ORD_CLOSE_PAREN || c === ORD_SEMI || c === ORD_COMMA) return false;

      // quite frequent (more than any other single if below it) are } (8%)
      // and ] (7%). Maybe I'll remove this in the future. The overhead may
      // not be worth the gains. Hard to tell... :)
      else if (c === ORD_CLOSE_SQUARE || c === ORD_CLOSE_CURLY) return false;

      // if len is more than 1, it's either a compound assignment (+=) or a unary op (++)
      else if (c === ORD_PLUS) return (tok.lastLen === 1);

      // === !==
      else if (c === ORD_IS || c === ORD_EXCL) return (tok.getLastNum2() === ORD_IS && (tok.lastLen === 2 || tok.getLastNum3() === ORD_IS));

      // & &&
      else if (c === ORD_AND) return (tok.lastLen === 1 || tok.getLastNum2() === ORD_AND);

      // | ||
      else if (c === ORD_OR) return (tok.lastLen === 1 || tok.getLastNum2() === ORD_OR);

      else if (c === ORD_LT) {
        if (tok.lastLen === 1) return true;
        var d = tok.getLastNum2();
        // the len check prevents <<= (which is an assignment)
        return ((d === ORD_LT && tok.lastLen === 2) || d === ORD_IS); // << <=
      }

      // if len is more than 1, it's a compound assignment (*=)
      else if (c === ORD_STAR) return (tok.lastLen === 1);

      else if (c === ORD_GT) {
        var len = tok.lastLen;
        if (len === 1) return true;
        var d = tok.getLastNum2();
        // the len checks prevent >>= and >>>= (which are assignments)
        return (d === ORD_IS || (len === 2 && d === ORD_GT) || (len === 3 && tok.getLastNum3() === ORD_GT)); // >= >> >>>
      }

      // if len is more than 1, it's a compound assignment (%=, ^=, /=, -=)
      else if (c === ORD_PERCENT || c === ORD_XOR || c === ORD_FWDSLASH || c === ORD_MIN) return (tok.lastLen === 1);

      // if not punctuator, it could still be `in` or `instanceof`...
      else if (c === ORD_L_I) return ((tok.lastLen === 2 && tok.getLastNum2() === ORD_L_N) || (tok.lastLen === 10 && tok.getLastValue() === 'instanceof'));

      // not a (non-assignment) binary operator
      return false;
    },

    parseGroup: function(funcToken){
      // the expressions are required. nonassignable if:
      // - wraps multiple expressions
      // - if the single expression is nonassignable
      // - if it wraps an assignment
      var nonAssignee = this.parseExpressions(funcToken);
      // groups cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
      this.tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV);

      return nonAssignee;
    },
    parseArray: function(funcToken){
      var tok = this.tok;
      do {
        this.parseExpressionOptional(funcToken); // just one because they are all optional (and arent in expressions)
      } while (tok.nextExprIfNum(ORD_COMMA)); // elision

      // array lits cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
      tok.mustBeNum(ORD_CLOSE_SQUARE, NEXTTOKENCANBEDIV);
    },
    parseObject: function(funcToken){
      var tok = this.tok;
      do {
        // object literal keys can be most values, but not regex literal.
        // since that's an error, it's unlikely you'll ever see that triggered.
        if (tok.isValue() && !tok.isType(REGEX)) this.parsePair(funcToken);
      } while (tok.nextExprIfNum(ORD_COMMA)); // elision

      // obj lits cannot be followed by a regex (not even on new line, asi wouldnt apply, would parse as div)
      tok.mustBeNum(ORD_CLOSE_CURLY, NEXTTOKENCANBEDIV);
    },
    parsePair: function(funcToken){
      var tok = this.tok;
      var start = tok.lastToken;
      start.lastExpressionStart = [];
      if (tok.isNum(ORD_L_G) && tok.nextPuncIfString('get')) {
        if (tok.isType(IDENTIFIER)) {
          if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'Getter name is reserved';
          tok.nextPunc();

          start.isFunctionMarker = true;
          this.parseFunctionRemainder(0, FORFUNCTIONDECL, start);
        }
        else this.parseDataPart(funcToken);
      } else if (tok.isNum(ORD_L_S) && tok.nextPuncIfString('onTabClick')) {
        if (tok.isType(IDENTIFIER)) {
          if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'Getter name is reserved';
          tok.nextPunc();

          start.isFunctionMarker = true;
          this.parseFunctionRemainder(1, FORFUNCTIONDECL, start);
        }
        else this.parseDataPart(funcToken);
      } else {
        this.parseData(funcToken);
      }
    },
    parseData: function(funcToken){
      this.tok.nextPunc();
      this.parseDataPart(funcToken);
    },
    parseDataPart: function(funcToken){
      this.tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      this.parseExpression(funcToken);
    },

    /**
     * Return whether the current token is a reserved identifier or not.
     * Presumably only called on identifiers. If the passed on boolean is
     * true, the keywords [true, false, this, function, null] are ignored
     * for this check. This will be the case when parsing expression vars.
     * See also this.isValueKeyword
     *
     * @param {boolean} ignoreValues When true, still returns false even if token is one of [true, false, this, function, null]
     * @return {boolean}
     */
    isReservedIdentifier: function(ignoreValues){
      // note that this function will return false most of the time
      // if it returns true, a syntax error will probably be thrown

      // TOFIX: skip statement keywords when checking for label

      var tok = this.tok;

      if (tok.lastLen > 1) {
        var c = tok.getLastNum();
        if (c >= ORD_L_A && c <= ORD_L_W) {
          if (c < ORD_L_G || c > ORD_L_Q) {
            if (c === ORD_L_T) {
              var d = tok.getLastNum2();
              if (d === ORD_L_H) {
                var id = tok.getLastValue();
                if (id === 'this') return !ignoreValues;
                return id === 'throw';
              } else if (d === ORD_L_R) {
                var id = tok.getLastValue();
                if (id === 'true') return !ignoreValues;
                if (id === 'try') return true;
              } else if (d === ORD_L_Y) {
                return tok.getLastValue() === 'typeof';
              }
            } else if (c === ORD_L_S) {
              var d = tok.getLastNum2();
              if (d === ORD_L_W) {
                return tok.getLastValue() === 'switch';
              } else if (d === ORD_L_U) {
                return tok.getLastValue() === 'super';
              } else {
                return false;
              }
            } else if (c === ORD_L_F) {
              var d = tok.getLastNum2();
              if (d === ORD_L_A) {
                if (ignoreValues) return false;
                return tok.getLastValue() === 'false';
              } else if (d === ORD_L_U) {
                // this is an ignoreValues case as well, but can never be triggered
                // rationale: this function is only called with ignoreValues true
                // when checking a label. labels are first words of statements. if
                // function is the first word of a statement, it will never branch
                // to parsing an identifier expression statement. and never get here.
                return tok.getLastValue() === 'function';
              } else if (d === ORD_L_O) {
                return tok.getLastValue() === 'for';
              } else if (d === ORD_L_I) {
                return tok.getLastValue() === 'finally';
              }
            } else if (c === ORD_L_D) {
              var d = tok.getLastNum2();
              if (d === ORD_L_O) {
                return tok.lastLen === 2; // do
              } else if (d === ORD_L_E) {
                var id = tok.getLastValue();
                return id === 'debugger' || id === 'default' || id === 'delete';
              }
            } else if (c === ORD_L_E) {
              var d = tok.getLastNum2();
              if (d === ORD_L_L) {
                return tok.getLastValue() === 'else';
              } else if (d === ORD_L_N) {
                return tok.getLastValue() === 'enum';
              } else if (d === ORD_L_X) {
                var id = tok.getLastValue();
                return id === 'export' || id === 'extends';
              }
            } else if (c === ORD_L_B) {
              return tok.getLastNum2() === ORD_L_R && tok.getLastValue() === 'break';
            } else if (c === ORD_L_C) {
              var d = tok.getLastNum2();
              if (d === ORD_L_A) {
                var id = tok.getLastValue();
                return id === 'case' || id === 'catch';
              } else if (d === ORD_L_O) {
                var id = tok.getLastValue();
                return id === 'continue' || id === 'const';
              } else if (d === ORD_L_L) {
                return tok.getLastValue() === 'class';
              }
            } else if (c === ORD_L_R) {
              if (tok.getLastNum2() === ORD_L_E) {
                return tok.getLastValue() === 'return';
              }
            } else if (c === ORD_L_V) {
              var d = tok.getLastNum2();
              if (d === ORD_L_A) {
                return tok.getLastValue() === 'var';
              } else if (d === ORD_L_O) {
                return tok.getLastValue() === 'void';
              }
            } else if (c === ORD_L_W) {
              var d = tok.getLastNum2();
              if (d === ORD_L_H) {
                return tok.getLastValue() === 'while';
              } else if (d === ORD_L_I) {
                return tok.getLastValue() === 'with';
              }
            }
            // we checked for b-f and r-w, but must not forget
            // to check n and i:
          } else if (c === ORD_L_N) {
            var d = tok.getLastNum2();
            if (d === ORD_L_U) {
              if (ignoreValues) return false;
              return tok.getLastValue() === 'null';
            } else if (d === ORD_L_E) {
              return tok.getLastValue() === 'new';
            }
          } else if (c === ORD_L_I) {
            var d = tok.getLastNum2();
            if (d === ORD_L_N) {
              return tok.lastLen === 2 || tok.getLastValue() === 'instanceof'; // 'in'
            } else if (d === ORD_L_F) {
              return tok.lastLen === 2; // 'if'
            } else if (d === ORD_L_M) {
              return tok.getLastValue() === 'import';
            }
          }
        }
      }

      return false;
    },

    isValueKeyword: function(word){
      return word === 'true' || word === 'false' || word === 'this' || word === 'null';
    },
  };

  (function chromeWorkaround(){
    // workaround for https://code.google.com/p/v8/issues/detail?id=2246
    var o = {};
    for (var k in proto) o[k] = proto[k];
    Par.prototype = o;
  })();

})(typeof exports === 'object' ? exports : window);
