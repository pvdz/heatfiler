(function(exports){
  var uniRegex = exports.uni || require(__dirname+'/uni.js').uni;

  // punctuator occurrence stats: http://qfox.nl/weblog/301
  // token start stats: http://qfox.nl/weblog/302

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
  var WHITE = 18; // WHITE_SPACE LINETERMINATOR COMMENT_SINGLE COMMENT_MULTI

  var UNICODE_LIMIT = 127;

  var ORD_L_A = 0x61;
  var ORD_L_A_UC = 0x41;
  var ORD_L_B = 0x62;
  var ORD_L_B_UC = 0x42;
  var ORD_L_C = 0x63;
  var ORD_L_C_UC = 0x43;
  var ORD_L_D = 0x64;
  var ORD_L_D_UC = 0x44;
  var ORD_L_E = 0x65;
  var ORD_L_E_UC = 0x45;
  var ORD_L_F = 0x66;
  var ORD_L_F_UC = 0x46;
  var ORD_L_G = 0x67;
  var ORD_L_G_UC = 0x47;
  var ORD_L_H = 0x68;
  var ORD_L_H_UC = 0x48;
  var ORD_L_I = 0x69;
  var ORD_L_I_UC = 0x49;
  var ORD_L_J = 0x6A;
  var ORD_L_J_UC = 0x4A;
  var ORD_L_K = 0x6B;
  var ORD_L_K_UC = 0x4B;
  var ORD_L_L = 0x6C;
  var ORD_L_L_UC = 0x4C;
  var ORD_L_M = 0x6D;
  var ORD_L_M_UC = 0x4D;
  var ORD_L_N = 0x6E;
  var ORD_L_N_UC = 0x4E;
  var ORD_L_O = 0x6F;
  var ORD_L_O_UC = 0x4F;
  var ORD_L_P = 0x70;
  var ORD_L_P_UC = 0x50;
  var ORD_L_Q = 0x71;
  var ORD_L_Q_UC = 0x51;
  var ORD_L_R = 0x72;
  var ORD_L_R_UC = 0x52;
  var ORD_L_S = 0x73;
  var ORD_L_S_UC = 0x53;
  var ORD_L_T = 0x74;
  var ORD_L_T_UC = 0x54;
  var ORD_L_U = 0x75;
  var ORD_L_U_UC = 0x55;
  var ORD_L_V = 0x76;
  var ORD_L_V_UC = 0x56;
  var ORD_L_W = 0x77;
  var ORD_L_W_UC = 0x57;
  var ORD_L_X = 0x78;
  var ORD_L_X_UC = 0x58;
  var ORD_L_Y = 0x79;
  var ORD_L_Y_UC = 0x59;
  var ORD_L_Z = 0x7a;
  var ORD_L_Z_UC = 0x5a;
  var ORD_L_0 = 0x30;
  var ORD_L_1 = 0x31;
  var ORD_L_2 = 0x32;
  var ORD_L_3 = 0x33;
  var ORD_L_4 = 0x34;
  var ORD_L_5 = 0x35;
  var ORD_L_6 = 0x36;
  var ORD_L_7 = 0x37;
  var ORD_L_8 = 0x38;
  var ORD_L_9 = 0x39;

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
  var ORD_HASH = 0x23;
  var ORD_DOLLAR = 0x24;
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
  var ORD_BACKSLASH = 0x5c;
  var ORD_LT = 0x3c;
  var ORD_GT = 0x3e;
  var ORD_SQUOTE = 0x27;
  var ORD_DQUOTE = 0x22;
  var ORD_SPACE = 0x20;
  var ORD_NBSP = 0xA0;
  var ORD_TAB = 0x09;
  var ORD_VTAB = 0x0B;
  var ORD_FF = 0x0C;
  var ORD_BOM = 0xFEFF;
  var ORD_LF = 0x0A;
  var ORD_CR = 0x0D;
  var ORD_LS = 0x2029;
  var ORD_PS = 0x2028;
  var ORD_$ = 0x24;
  var ORD_LODASH = 0x5f;

  /**
   * Tokenizer for JS. After initializing the constructor
   * you can fetch the next tokens by calling tok.next()
   * if the next token could be a division, or tok.nextExpr()
   * if the next token could be a regular expression.
   * Obviously you'll need a parser (or magic) to determine this.
   *
   * @constructor
   * @param {string} input
   */
  var Tok = exports.Tok = function(input, options){
    this.options = options || {}; // should be same as in Par, if any

    this.input = (input||'');
    this.len = this.input.length;

    // v8 "appreciates" it when all instance properties are set explicitly
    this.pos = 0;

    this.lastStart = 0;
    this.lastStop = 0;
    this.lastLen = 0;
    this.lastType = -1;
    this.lastValue = '';
    this.lastNewline = -1;

    // charCodeAt will never return -1, so -1 means "uninitialized". allows us to keep this value a number, always
    this.nextNum1 = -1;
    this.nextNum2 = -1;

    this.tokenCountAll = 0;

    if (options.saveTokens) {
      // looks like double assignment but after build step, changes into `this['tokens'] = this_tok_tokens = [];`
      this['tokens'] = this.tokens = [];
      if (options.createBlackStream) this['black'] = this.black = [];
    }
  };

  // reverse lookup (only used for error messages..)

  Tok[WHITE_SPACE] = 'whitespace';
  Tok[LINETERMINATOR] = 'lineterminator';
  Tok[COMMENT_SINGLE] = 'comment_single';
  Tok[COMMENT_MULTI] = 'comment_multi';
  Tok[STRING] = 'string';
  Tok[STRING_SINGLE] = 'string_single';
  Tok[STRING_DOUBLE] = 'string_multi';
  Tok[NUMBER] = 'number';
  Tok[NUMERIC_DEC] = 'numeric_dec';
  Tok[NUMERIC_HEX] = 'numeric_hex';
  Tok[REGEX] = 'regex';
  Tok[PUNCTUATOR] = 'punctuator';
  Tok[IDENTIFIER] = 'identifier';
  Tok[EOF] = 'eof';
  Tok[ASI] = 'asi';
  Tok[ERROR] = 'error';
  Tok[WHITE] = 'white';

  Tok.WHITE_SPACE = WHITE_SPACE;
  Tok.LINETERMINATOR = LINETERMINATOR;
  Tok.COMMENT_SINGLE = COMMENT_SINGLE;
  Tok.COMMENT_MULTI = COMMENT_MULTI;
  Tok.STRING = STRING;
  Tok.STRING_SINGLE = STRING_SINGLE;
  Tok.STRING_DOUBLE = STRING_DOUBLE;
  Tok.NUMBER = NUMBER;
  Tok.NUMERIC_DEC = NUMERIC_DEC;
  Tok.NUMERIC_HEX = NUMERIC_HEX;
  Tok.REGEX = REGEX;
  Tok.PUNCTUATOR = PUNCTUATOR;
  Tok.IDENTIFIER = IDENTIFIER;
  Tok.EOF = EOF;
  Tok.ASI = ASI;
  Tok.ERROR = ERROR;
  Tok.WHITE = WHITE; // WHITE_SPACE LINETERMINATOR COMMENT_SINGLE COMMENT_MULTI

  var proto = {
    /** @property {string} input */
    input: '',
    /** @property {number} len */
    len: 0,
    /** @property {number} pos */
    pos: 0,

    /**
     * Shared with Par.
     * Only properties relevant to Tok are listed in this jsdoc.
     *
     * @property {Object} options
     * @property {boolean} [options.saveTokens=false] Put all found tokens in .tokens
     * @property {boolean} [options.createBlackStream=false] Requires saveTokens, put black tokens in .black
     * @property {boolean} [options.regexNoClassEscape=false] Don't interpret backslash in regex class as escape
     */
    options: null,

    // parser can look at these positions to see where in the input the last token was
    // this way the tokenizer can simply return number-constants-as-types.
    /** @property {number} lastStart Start pos of the last token */
    lastStart: 0,
    /** @property {number} lastStop End pos of the last token */
    lastStop: 0,
    /** @property {number} lastLen */
    lastLen: 0,
    /** @property {number} lastType Type of the last token */
    lastType: -1,
    /** @property {string} lastValue String value of the last token, or empty string if not yet fetched (see this.getLastValue()) */
    lastValue: '',
    /** @property {boolean} lastNewline Was the current token preceeded by a newline? For determining ASI. */
    lastNewline: false,

    // .charCodeAt(pos+n) cache
    nextNum1: -1,
    nextNum2: -1,

    /** @property {number} tokenCountAll Add one for any token, including EOF (Par relies on this) */
    tokenCountAll: 0,
    /** @property {Object[]} tokens List of (all) tokens, if saving them is enabled (this.options.saveTokens) */
    tokens: null,
    /** @property {Object[]} black List of only black tokens, if saving them is enabled (this.options.saveTokens) and createBlackStream is too */
    black: null,

    // some of these regular expressions are so complex that i had to
    // write scripts to construct them. the only way to keep my sanity

    /**
     * Check whether current token is of certain type
     *
     * @param {number} t
     * @return {boolean}
     */
    isType: function(t){
      return this.lastType === t;
    },
    /**
     * Check whether the current token is of string, number,
     * regex, or identifier type. These are the "value"
     * token types, short of arrays and objects.
     *
     * @return {boolean}
     */
    isValue: function(){
      return (
        (this.lastType !== PUNCTUATOR) && // fail fast
        (this.lastType === STRING || this.lastType === NUMBER || this.lastType === IDENTIFIER || this.lastType === REGEX)
      );
    },
    /**
     * Compare the first character of the current token
     * as a number (for speed).
     *
     * @param {number} n
     * @return {boolean}
     */
    isNum: function(n){
      return this.getLastNum() === n;
    },
    /**
     * Compare the entire input range of the current
     * token to the given value.
     *
     * @param {string} value
     * @return {boolean}
     */
    isString: function(value){
      return this.getLastValue() === value;
    },

    /**
     * Parse the next token if the current
     * token a "value". Next token is parsed
     * possibly expecting a division (so not
     * a regex).
     *
     * @return {boolean}
     */
    nextPuncIfValue: function(){
      var equals = this.isValue();
      if (equals) this.nextPunc();
      return equals;
    },
    /**
     * Parse the next token if the first character
     * of the current starts with a character (as
     * a number) equal to num. Next token is parsed
     * possibly expecting a regex (so not a division).
     *
     * @param {number} num
     * @return {boolean}
     */
    nextExprIfNum: function(num){
      var equals = this.isNum(num);
      if (equals) this.nextExpr();
      return equals;
    },
    /**
     * Parse the next token if the input range of
     * the current token matches the given string.
     * The next token will be parsed expecting a
     * possible division, not a regex.
     *
     * @param {string} str
     * @return {boolean}
     */
    nextPuncIfString: function(str){
      var equals = this.isString(str);
      if (equals) this.nextPunc();
      return equals;
    },

    /**
     * Parser requires the current token to start with (or be) a
     * certain character. Parse the next token if that's the case.
     * Throw a syntax error otherwise.
     *
     * @param {number} num
     * @param {boolean} nextIsExpr=false
     */
    mustBeNum: function(num, nextIsExpr){
      if (this.isNum(num)) {
        this.next(nextIsExpr);
      } else {
        throw this.syntaxError(num);
      }
    },
    /**
     * Parser requires the current token to be any identifier.
     * Parse the next token if that's the case. Throw a syntax
     * error otherwise.
     *
     * @param {boolean} nextIsExpr
     */
    mustBeIdentifier: function(nextIsExpr){
      if (this.isType(IDENTIFIER)) {
        this.next(nextIsExpr);
      } else {
        throw this.syntaxError(IDENTIFIER);
      }
    },
    /**
     * Parser requires the current token to be this
     * string. Parse the next token if that's the
     * case. Throw a syntax error otherwise.
     *
     * @param {string} str
     * @param {boolean} nextIsExpr=false
     */
    mustBeString: function(str, nextIsExpr){
      if (this.isString(str)) {
        this.next(nextIsExpr);
      } else {
        throw this.syntaxError(str);
      }
    },

    nextExpr: function(){
      return this.next(true);
    },
    nextPunc: function(){
      return this.next(false);
    },

    next: function(expressionStart){
      this.lastNewline = false;

      var toStream = this.options.saveTokens;

      do {
        var type = this.nextWhiteToken(expressionStart);
        if (toStream) {
          var token = {type:type, value:this.getLastValue(), start:this.lastStart, stop:this.pos, white:this.tokens.length};
          this.tokens.push(token);
        }
      } while (type === WHITE);

      if (toStream && this.options.createBlackStream) {
        token.black = this.black.length;
        this.black.push(token);
      }

      this.lastType = type;
      return type;
    },
    nextWhiteToken: function(expressionStart){
      this.lastValue = '';

      // prepare charCodeAt cache...
      if (this.lastLen === 1) this.nextNum1 = this.nextNum2;
      else this.nextNum1 = -1;
      this.nextNum2 = -1;

      ++this.tokenCountAll;

      var start = this.lastStart = this.pos;
      var result = EOF;
      if (start < this.len) result = this.nextTokenSwitch(expressionStart, start);
      this.lastLen = (this.lastStop = this.pos) - start;

      return result;
    },

    nextTokenIfElse: function(expressionStart, pos){
      var c = this.getLastNum();

      // 58% of tokens is caught here
      // http://qfox.nl/weblog/301

      if (c === ORD_SPACE) return this.__plusOne(WHITE);
      if (c === ORD_DOT) return this.__parseDot();
      if (c === ORD_OPEN_PAREN || c === ORD_CLOSE_PAREN || c === ORD_SEMI || c === ORD_COMMA) return this.__plusOne(PUNCTUATOR);
      if (c === ORD_IS) return this.__parseEqualSigns();
      if (c >= ORD_L_A && c <= ORD_L_Z) return this.__parseIdentifier(); // 25%
      if (c === ORD_CR) return this.__parseCR();
      if (c === ORD_LF) {
        this.lastNewline = true;
        ++this.pos;
        return WHITE;
      }
      if (c === ORD_OPEN_CURLY || c === ORD_CLOSE_CURLY) return this.__plusOne(PUNCTUATOR);
      // while the

//      // split to another function to prevent too many branches in this function
//      return this.nextToken_center(c, expressionStart);
//    },
//    nextToken_center: function(c, expressionStart){
      // 25% of tokens is caught here

      if (c === ORD_DQUOTE) return this.__parseDoubleString();
      if (
        c === ORD_COLON ||
          c === ORD_OPEN_SQUARE ||
          c === ORD_CLOSE_SQUARE
        ) { ++this.pos; return PUNCTUATOR; }
//      return this.nextToken_tail(c, expressionStart);
//    },
//    nextToken_tail: function(c, expressionStart){
      // remaining 17% of tokens is caught here

      if (c === ORD_LODASH) return this.__parseIdentifier();
      if (c === ORD_PLUS) return this.__parseSameOrCompound(c);
      if (c === ORD_L_0) return this.__parseZero();
      if (c >= ORD_L_A_UC && c <= ORD_L_Z_UC) return this.__parseIdentifier();
      if (c === ORD_EXCL) return this.__parseEqualSigns();
      if (c >= ORD_L_1 && c <= ORD_L_9) return this.__parseNumber();
      if (c === ORD_AND || c === ORD_OR) return this.__parseSameOrCompound(c);
      if (c === ORD_SQUOTE) return this.__parseSingleString();
      if (c === ORD_MIN) return this.__parseSameOrCompound(c);
      if (c === ORD_TAB) return this.__plusOne(WHITE);
      if (c === ORD_QMARK) return this.__plusOne(PUNCTUATOR);
      if (c === ORD_DOLLAR) return this.__parseIdentifier();
      if (c === ORD_FWDSLASH) return this.__parseFwdSlash(expressionStart);
      if (c === ORD_LT) return this.__parseLtgtPunctuator(c);
      if (c === ORD_STAR) return this.__parseCompound();
      if (c === ORD_GT) return this.__parseLtgtPunctuator(c);
      if (
        c === ORD_PERCENT ||
          c === ORD_XOR ||
          c === ORD_TILDE
        ) return this.__parseCompound();

//      return this.nextToken_exotic(c);
//    },
//    nextToken_exotic: function(c){
      // the rest is exotic. order is not really important at this point...

      // TOFIX: should ORD_LF go with CR? because OSX...
      if (c === ORD_PS || c === ORD_LS) {
        this.lastNewline = true;
        ++this.pos;
        return WHITE;
      }

      // space and tab are already checked
      if (c === ORD_FF || c === ORD_VTAB || c === ORD_NBSP || c === ORD_BOM) return this.__plusOne(WHITE);

      if (c === ORD_BACKSLASH && this.getLastNum2() === ORD_L_U && this.unicode(this.pos+2)) {
        this.pos += 6;
        return this.__parseIdentifier();
      }

      /*
       // TOFIX: still have to validate this first char as a valid ident start
       throw 'fixme ['+c+']';
       return this.__parseIdentifier();
       */
    },

    nextTokenSwitch: function(expressionStart, pos){
      var c = this.getLastNum();

      switch (c) {
        case ORD_SPACE: return this.__plusOne(WHITE);
        case ORD_DOT: return this.__parseDot();
        case ORD_OPEN_PAREN: return this.__plusOne(PUNCTUATOR);
        case ORD_CLOSE_PAREN: return this.__plusOne(PUNCTUATOR);
        case ORD_SEMI: return this.__plusOne(PUNCTUATOR);
        case ORD_COMMA: return this.__plusOne(PUNCTUATOR);
        case ORD_IS: return this.__parseEqualSigns();
        case ORD_L_T: return this.__parseIdentifier();
        case ORD_CR: return this.__parseCR();
        case ORD_LF:
          this.lastNewline = true;
          return this.__plusOne(WHITE);
        case ORD_OPEN_CURLY:
        case ORD_CLOSE_CURLY: return this.__plusOne(PUNCTUATOR);
        case ORD_L_A: return this.__parseIdentifier();
        case ORD_L_I: return this.__parseIdentifier();
        case ORD_DQUOTE: return this.__parseDoubleString();
        case ORD_L_F: return this.__parseIdentifier();
        case ORD_L_C: return this.__parseIdentifier();
        case ORD_COLON: return this.__plusOne(PUNCTUATOR);
        case ORD_OPEN_SQUARE: return this.__plusOne(PUNCTUATOR);
        case ORD_CLOSE_SQUARE: return this.__plusOne(PUNCTUATOR);
        case ORD_L_B: return this.__parseIdentifier();
        case ORD_L_R: return this.__parseIdentifier();
        case ORD_L_E: return this.__parseIdentifier();
        case ORD_L_V: return this.__parseIdentifier();
        case ORD_L_S: return this.__parseIdentifier();
        case ORD_L_D: return this.__parseIdentifier();
        case ORD_L_N: return this.__parseIdentifier();
        case ORD_LODASH: return this.__parseIdentifier();
        case ORD_L_P: return this.__parseIdentifier();
        case ORD_L_G: return this.__parseIdentifier();
        case ORD_PLUS: return this.__parseSameOrCompound(c);
        case ORD_L_M: return this.__parseIdentifier();
        case ORD_L_O: return this.__parseIdentifier();
        case ORD_L_0: return this.__parseZero();
        case ORD_L_L: return this.__parseIdentifier();
        case ORD_L_Z_UC: return this.__parseIdentifier();
        case ORD_L_H: return this.__parseIdentifier();
        case ORD_L_E_UC: return this.__parseIdentifier();
        case ORD_EXCL: return this.__parseEqualSigns();
        case ORD_L_1: return this.__parseNumber();
        case ORD_L_D_UC: return this.__parseIdentifier();
        case ORD_L_U: return this.__parseIdentifier();
        case ORD_AND: return this.__parseSameOrCompound(c);
        case ORD_L_A_UC: return this.__parseIdentifier();
        case ORD_L_W: return this.__parseIdentifier();
        case ORD_L_F_UC: return this.__parseIdentifier();
        case ORD_OR: return this.__parseSameOrCompound(c);
        case ORD_SQUOTE: return this.__parseSingleString();
        case ORD_L_K: return this.__parseIdentifier();
        case ORD_MIN: return this.__parseSameOrCompound(c);
        case ORD_L_X: return this.__parseIdentifier();
        case ORD_TAB: return this.__plusOne(WHITE);
        case ORD_L_C_UC: return this.__parseIdentifier();
        case ORD_L_J: return this.__parseIdentifier();
        case ORD_QMARK: return this.__plusOne(PUNCTUATOR);
        case ORD_DOLLAR: return this.__parseIdentifier();
        case ORD_L_M_UC: return this.__parseIdentifier();
        case ORD_L_Y: return this.__parseIdentifier();
        case ORD_L_S_UC: return this.__parseIdentifier();
        case ORD_FWDSLASH: return this.__parseFwdSlash(expressionStart);
        case ORD_LT: return this.__parseLtgtPunctuator(c);
        case ORD_L_B_UC: return this.__parseIdentifier();
        case ORD_L_H_UC: return this.__parseIdentifier();
        case ORD_L_I_UC: return this.__parseIdentifier();
        case ORD_L_2: return this.__parseNumber();
        case ORD_L_O_UC: return this.__parseIdentifier();
        case ORD_STAR: return this.__parseCompound();
        case ORD_L_Q: return this.__parseIdentifier();
        case ORD_L_G_UC: return this.__parseIdentifier();
        case ORD_L_P_UC: return this.__parseIdentifier();
        case ORD_L_T_UC: return this.__parseIdentifier();
        case ORD_L_R_UC: return this.__parseIdentifier();
        case ORD_L_Z: return this.__parseIdentifier();
        case ORD_L_N_UC: return this.__parseIdentifier();
        case ORD_L_Y_UC: return this.__parseIdentifier();
        case ORD_L_J_UC: return this.__parseIdentifier();
        case ORD_L_L_UC: return this.__parseIdentifier();
        case ORD_GT: return this.__parseLtgtPunctuator(c);
        case ORD_L_K_UC: return this.__parseIdentifier();
        case ORD_L_X_UC: return this.__parseIdentifier();
        case ORD_L_3: return this.__parseNumber();
        case ORD_L_Q_UC: return this.__parseIdentifier();
        case ORD_L_U_UC: return this.__parseIdentifier();
        case ORD_L_V_UC: return this.__parseIdentifier();
        case ORD_L_W_UC: return this.__parseIdentifier();
        case ORD_L_4: return this.__parseNumber();
        case ORD_L_5: return this.__parseNumber();
        case ORD_L_6: return this.__parseNumber();
        case ORD_L_7: return this.__parseNumber();
        case ORD_L_8: return this.__parseNumber();
        case ORD_L_9: return this.__parseNumber();
        case ORD_PERCENT: return this.__parseCompound();
        case ORD_XOR: return this.__parseCompound();
        case ORD_TILDE: return this.__parseCompound();
        case ORD_PS:
          this.lastNewline = true;
          return this.__plusOne(WHITE);
        case ORD_LS:
          this.lastNewline = true;
          return this.__plusOne(WHITE);
        case ORD_FF: return this.__plusOne(WHITE);
        case ORD_VTAB: return this.__plusOne(WHITE);
        case ORD_NBSP: return this.__plusOne(WHITE);
        case ORD_BOM: return this.__plusOne(WHITE);
        case ORD_BACKSLASH:
          if (this.getLastNum2() === ORD_L_U && this.unicode(this.pos+2)) {
            this.pos += 6;
            return this.__parseIdentifier();
          } else {
            throw 'error';
          }
        default:
          throw 'fixme ['+c+']';
      }

      /*
       // TOFIX: still have to validate this first char as a valid ident start
       return this.__parseIdentifier();
       */
    },

    __plusOne: function(type){
      ++this.pos;
      return type;
    },

    __parseFwdSlash: function(expressionStart){
      var d = this.getLastNum2();
      if (d === ORD_FWDSLASH) return this.__parseSingleComment();
      if (d === ORD_STAR) return this.__parseMultiComment();
      if (expressionStart) return this.__parseRegex();
      return this.__parseDivPunctuator(d);
    },

    __parseCR: function(){
      this.lastNewline = true;
      // handle \r\n normalization here
      // (could rewrite into OR, eliminating a branch)
      var d = this.getLastNum2();
      if (d === ORD_LF) {
        this.pos += 2;
      } else {
        this.pos += 1;
      }

      return WHITE;
    },

    __parseSameOrCompound: function(c){
      var d = this.getLastNum2();
      this.pos += (d === ORD_IS || d === c) ? 2 : 1;
//      this.pos += ((d === ORD_IS) | (d === c)) + 1; // ;)
      return PUNCTUATOR;
    },
    __parseEqualSigns: function(){
      var len = 1;
      if (this.getLastNum2() === ORD_IS) {
        len = 2;
        if (this.getLastNum3() === ORD_IS) len = 3;
      }
      this.pos += len;
      return PUNCTUATOR;
    },
    __parseLtgtPunctuator: function(c){
      var len = 1;
      var d = this.getLastNum2();
      if (d === ORD_IS) len = 2;
      else if (d === c) {
        len = 2;
        var e = this.getLastNum3();
        if (e === ORD_IS) len = 3;
        else if (e === c && c !== ORD_LT) {
          len = 3;
          if (this.getLastNum4() === ORD_IS) len = 4;
        }
      }
      this.pos += len;
      return PUNCTUATOR;
    },
    __parseCompound: function(){
      var len = 1;
      if (this.getLastNum2() === ORD_IS) len = 2;
      this.pos += len;
      return PUNCTUATOR;
    },
    __parseDivPunctuator: function(d){
      // cant really be a //, /* or regex because they should have been checked before calling this function
      // could rewrite this to OR magic and eliminate a branch
      if (d === ORD_IS) this.pos += 2;
      else ++this.pos;
      return PUNCTUATOR;
    },

    whitespace: function(c){
      // space is already checked in nextToken
//      if (/*c === ORD_SPACE || */c === ORD_TAB || c === ORD_VTAB || c === ORD_FF || c === ORD_NBSP || c === ORD_BOM) {
      // note: tab=0x09, ff=0x0c, vtab=0x0b
      // cr=0x0a but whitespace() should go after lineterminator()! (update this if that changes)
      if ((c <= ORD_FF && c >= ORD_TAB) || c === ORD_NBSP || c === ORD_BOM) {
        ++this.pos;
        return true;
      }
      return false;
    },
    lineTerminator: function(c, pos){
      var parsed = false;
      if (c === ORD_CR){
        this.lastNewline = true;
        // handle \r\n normalization here
        var d = this.getLastNum2();
        if (d === ORD_LF) {
          this.pos = pos + 2;
        } else {
          this.pos = pos + 1;
        }
        parsed = true;
      } else if (c === ORD_LF || c === ORD_PS || c === ORD_LS) {
        this.lastNewline = true;
        this.pos = pos + 1;
        parsed = true;
      }
      return parsed;
    },
    __parseSingleComment: function(){
      var pos = this.pos + 2;
      var input = this.input;
      var len = input.length;

      if (pos < len) {
        do var c = input.charCodeAt(pos);
        while (c !== ORD_CR && c !== ORD_LF && c !== ORD_PS && c !== ORD_LS && ++pos < len);
      }

      this.pos = pos;

      return WHITE;
    },
    __parseMultiComment: function(){
      var pos = this.pos + 2;
      var input = this.input;
      var len = input.length;

      var hasNewline = false;
      var c = 0;
      var d = this.getLastNum3();
      while (pos < len) {
        c = d;
        d = input.charCodeAt(++pos);

        if (c === ORD_STAR && d === ORD_FWDSLASH) break;

        // only check one newline
        // TODO: check whether the extra check is worth the overhead for eliminating repetitive checks
        // (hint: if you generally check more characters here than you can skip, it's not worth it)
        if (hasNewline || c === ORD_CR || c === ORD_LF || c === ORD_PS || c === ORD_LS) hasNewline = this.lastNewline = true;
      }
      this.pos = pos+1;

      return WHITE;
    },
    __parseSingleString: function(){
      var pos = this.pos + 1;
      var input = this.input;
      var len = input.length;

      // TODO: rewrite this while
      var c;
      while (c !== ORD_SQUOTE) {
        if (pos >= len) throw 'Unterminated string found at '+pos;
        c = input.charCodeAt(pos++);

        if (c === ORD_BACKSLASH) pos = this.stringEscape(pos);
        else if ((c <= ORD_CR && (c === ORD_LF || c === ORD_CR)) || c === ORD_PS || c === ORD_LS) throw 'No newlines in strings! '+this.syntaxError();
      }

      this.pos = pos;
      return STRING;
    },
    __parseDoubleString: function(){
      var pos = this.pos + 1;
      var input = this.input;
      var len = input.length;

      // TODO: rewrite this while
      var c;
      while (c !== ORD_DQUOTE) {
        if (pos >= len) throw 'Unterminated string found at '+pos;
        c = input.charCodeAt(pos++);

        if (c === ORD_BACKSLASH) pos = this.stringEscape(pos);
        else if ((c <= ORD_CR && (c === ORD_LF || c === ORD_CR)) || c === ORD_PS || c === ORD_LS) throw 'No newlines in strings! '+this.syntaxError();
      }

      this.pos = pos;
      return STRING;
    },
    stringEscape: function(pos){
      var input = this.input;
      var c = input.charCodeAt(pos);

      // unicode escapes
      if (c === ORD_L_U) {
        if (this.unicode(pos+1)) pos += 4;
        else throw 'Invalid unicode escape';
      // line continuation; skip windows newlines as if they're one char
      } else if (c === ORD_CR) {
        // keep in mind, we are already skipping a char. no need to check
        // for other line terminators here. we are merely checking to see
        // whether we need to skip an additional character for CRLF.
        if (input.charCodeAt(pos+1) === ORD_LF) ++pos;
      // hex escapes
      } else if (c === ORD_L_X) {
        if (this.hexicode(input.charCodeAt(pos+1)) && this.hexicode(input.charCodeAt(pos+2))) pos += 2;
        else throw 'Invalid hex escape';
      }
      return pos+1;
    },
    unicode: function(pos){
      var input = this.input;

      return this.hexicode(input.charCodeAt(pos)) && this.hexicode(input.charCodeAt(pos+1)) && this.hexicode(input.charCodeAt(pos+2)) && this.hexicode(input.charCodeAt(pos+3));
    },
    hexicode: function(c){
      // 0-9, a-f, A-F
      return ((c <= ORD_L_9 && c >= ORD_L_0) || (c >= ORD_L_A && c <= ORD_L_F) || (c >= ORD_L_A_UC && c <= ORD_L_F_UC));
    },

    __parseDot: function(){
      var c = this.getLastNum2();

      if (c >= ORD_L_0 && c <= ORD_L_9) return this.__parseAfterDot(this.pos+2);

      ++this.pos;
      return PUNCTUATOR;
    },

    __parseZero: function(){
      // a numeric that starts with zero is is either a decimal or hex
      // 0.1234  0.  0e12 0e-12 0e12+ 0.e12 0.1e23 0xdeadbeeb

      var d = this.getLastNum2();
      if (d === ORD_L_X || d === ORD_L_X_UC) { // x or X
        this.__parseHex(2);
      } else if (d === ORD_DOT) {
        this.__parseAfterDot(this.pos+2);
      } else if (d <= ORD_L_9 && d >= ORD_L_0) {
        throw 'Invalid octal literal';
      } else {
        this.pos = this.__parseExponent(d, this.pos+1, this.input);
      }

      return NUMBER;
    },
    __parseHex: function(delta){
      var pos = this.pos + delta;
      var input = this.input;
      var len = input.length;

      // (could use OR, eliminate casing branch)
      do var c = input.charCodeAt(pos);
      while (((c <= ORD_L_9 && c >= ORD_L_0) || (c >= ORD_L_A && c <= ORD_L_F) || (c >= ORD_L_A_UC && c <= ORD_L_F_UC)) && ++pos < input.length);

      this.pos = pos;
      return NUMBER;
    },
    __parseDigits: function(delta){
      var pos = this.pos + delta;
      var input = this.input;
      var len = input.length;

      do var c = input.charCodeAt(pos);
      while (c >= ORD_L_0 && c <= ORD_L_9 && ++pos < input.length);

      this.pos = pos;
      return NUMBER;
    },

    __parseNumber: function(){
      // just encountered a 1-9 as the start of a token...

      var pos = this.pos;
      var input = this.input;
      var len = input.length;

      do var c = input.charCodeAt(pos);
      while (c >= ORD_L_0 && c <= ORD_L_9 && ++pos < input.length);

      if (c === ORD_DOT) return this.__parseAfterDot(pos+1);

      this.pos = this.__parseExponent(c, pos, input);
      return NUMBER;
    },
    __parseAfterDot: function(pos){
      var input = this.input;
      var c = input.charCodeAt(pos);
      while (c >= ORD_L_0 && c <= ORD_L_9) c = input.charCodeAt(++pos);

      pos = this.__parseExponent(c, pos, input);

      this.pos = pos;

      return NUMBER;
    },
    __parseExponent: function(c, pos, input){
      if (c === ORD_L_E || c === ORD_L_E_UC) {
        c = input.charCodeAt(++pos);
        // sign is optional (especially for plus)
        if (c === ORD_MIN || c === ORD_PLUS) c = input.charCodeAt(++pos);

        // first digit is mandatory
        if (c >= ORD_L_0 && c <= ORD_L_9) c = input.charCodeAt(++pos);
        else throw 'Missing required digits after exponent. '+this.syntaxError();

        // rest is optional
        while (c >= ORD_L_0 && c <= ORD_L_9) c = input.charCodeAt(++pos);
      }
      return pos;
    },
    hexNumber: function(pos){
      var input = this.input;
      var len = input.length;
      // hex
      while (pos < len && this.hexicode(input.charCodeAt(pos))) ++pos;
      this.pos = pos;
    },

    __parseRegex: function(){
      // /foo/
      // /foo[xyz]/
      // /foo(xyz)/
      // /foo{xyz}/
      // /foo(?:foo)/
      // /foo(!:foo)/
      // /foo(?!foo)bar/
      // /foo\dbar/
      this.pos++;
      this.regexBody();
      this.regexFlags();

      return REGEX;
    },
    regexBody: function(){
      var input = this.input;
      var len = input.length;
      // TOFIX: fix loop
      while (this.pos < len) {
        var c = input.charCodeAt(this.pos++);

        if (c === ORD_BACKSLASH) { // backslash
          var d = input.charCodeAt(this.pos++);
          if (d === ORD_LF || d === ORD_CR || d === ORD_PS || d === ORD_LS) {
            throw new Error('Newline can not be escaped in regular expression at '+this.pos);
          }
        }
        else if (c === ORD_OPEN_PAREN) this.regexBody();
        else if (c === ORD_CLOSE_PAREN || c === ORD_FWDSLASH) return;
        else if (c === ORD_OPEN_SQUARE) this.regexClass();
        else if (c === ORD_LF || c === ORD_CR || c === ORD_PS || c === ORD_LS) {
          throw new Error('Newline can not be escaped in regular expression at '+this.pos);
        }
      }

      throw new Error('Unterminated regular expression at eof');
    },
    regexClass: function(){
      var input = this.input;
      var len = input.length;
      var pos = this.pos;
      while (pos < len) {
        var c = input.charCodeAt(pos++);

        if (c === ORD_CLOSE_SQUARE) {
          this.pos = pos;
          return;
        }
        if (c === ORD_LF || c === ORD_CR || c === ORD_PS || c === ORD_LS) {
          throw 'Illegal newline in regex char class at '+pos;
        }
        if (c === ORD_BACKSLASH) { // backslash
          // there's a historical dispute over whether backslashes in regex classes
          // add a slash or its next char. ES5 settled it to "it's an escape".
          if (this.options.regexNoClassEscape) {
            var d = input.charCodeAt(pos++);
            if (d === ORD_LF || d === ORD_CR || d === ORD_PS || d === ORD_LS) {
              throw new Error('Newline can not be escaped in regular expression at '+pos);
            }
          }
        }
      }

      throw new Error('Unterminated regular expression at eof');
    },
    regexFlags: function(){
      // we cant use the actual identifier parser because that's assuming the identifier
      // starts at the beginning of this token, which is not the case for regular expressions.
      // so we use the remainder parser, which parses the second up to the rest of the identifier

      this.pos = this.__parseIdentifierRest();
    },
    asciiIdentifier: function(c, forDollar){
      var toAdd = forDollar ? 1 : this.asciiIdentifierStart(c);
      if (toAdd === 0) return false;

      // 2nd char up till the end of the identifier
      this.pos = this.asciiIdentifierRest(toAdd);

      return true;
    },
    asciiIdentifierStart: function(c){
      // a-z A-Z $ _ (no number here!)
      if ((c >= ORD_L_A && c <= ORD_L_Z) || (c >= ORD_L_A_UC && c <= ORD_L_Z_UC) || c === ORD_$ || c === ORD_LODASH) {
        return 1;
      // \uxxxx
      } else if (c === ORD_BACKSLASH) {
        var pos = this.pos;
        if (this.getLastNum2() === ORD_L_U && this.unicode(pos+2)) {
          return 6;
        } else {
          throw 'No backslash in identifier (xept for \\u). '+this.syntaxError();
        }
      // above ascii range? might be valid unicode char
      } else if (c > UNICODE_LIMIT) {
        if (uniRegex.test(String.fromCharCode(c))) return 1;
      }
      // do nothing so we return 0
      return 0;
    },
    __parseIdentifier: function(){
      this.pos = this.__parseIdentifierRest();
      return IDENTIFIER;
    },
    __parseIdentifierRest: function(){
      // also used by regex flag parser!

      var input = this.input;
      var len = input.length;
      var pos = this.pos;

      while (pos < len) {
        var c = input.charCodeAt(pos);

        // a-z A-Z 0-9 $ _
        // TODO: character occurrence analysis
        if ((c >= ORD_L_A && c <= ORD_L_Z) || (c >= ORD_L_A_UC && c <= ORD_L_Z_UC) || (c >= ORD_L_0 && c <= ORD_L_9) || c === ORD_$ || c === ORD_LODASH) {
          ++pos;
        // \uxxxx (TOFIX: validate?)
        } else if (c === ORD_BACKSLASH && input.charCodeAt(pos+1) === ORD_L_U && this.unicode(pos+2)) {
          pos += 6;
        } else if (c > UNICODE_LIMIT && uniRegex.test(String.fromCharCode(c))) {
          pos += 1;
        } else {
          break;
        }
      }

      return pos;
    },

    getLastValue: function(){
      return this.lastValue || (this.lastValue = this.input.substring(this.lastStart, this.lastStop));

      // this seems slightly slower
//      var val = this.lastValue;
//      if (!val) {
//        var input = this.input;
//        val = this.lastValue = input.substring(this.lastStart, this.lastStop);
//      }
//      return val;
    },
    getLastNum: function(){
      var n = this.nextNum1;
      if (n === -1) return this.nextNum1 = this.input.charCodeAt(this.lastStart);
      return n;
    },
    getLastNum2: function(){
      var n = this.nextNum2;
      if (n === -1) return this.nextNum2 = this.input.charCodeAt(this.lastStart+1);
      return n;
    },
    getLastNum3: function(){
      return this.input.charCodeAt(this.lastStart+2);
    },
    getLastNum4: function(){
      return this.input.charCodeAt(this.lastStart+3);
    },

    debug: function(){
      return '`'+this.getLastValue()+'` @ '+this.pos+' ('+Tok[this.lastType]+')';
    },
    syntaxError: function(value){
      return 'A syntax error at pos='+this.pos+' expected '+(typeof value == 'number' ? 'type='+Tok[value] : 'value=`'+value+'`')+' is `'+this.getLastValue()+'` '+
          '('+Tok[this.lastType]+') #### `'+this.input.substring(this.pos-2000, this.pos)+'#|#'+this.input.substring(this.pos, this.pos+2000)+'`';
    },
  };

  (function chromeWorkaround(){
    // workaround for https://code.google.com/p/v8/issues/detail?id=2246
    var o = {};
    for (var k in proto) o[k] = proto[k];
    Tok.prototype = o;
  })();

})(typeof exports === 'object' ? exports : window);

