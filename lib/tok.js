(function(exports){
  var uniRegex = exports.uni || require(__dirname+'/uni.js').uni;

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
  var ORD_L_E = 0x65;
  var ORD_L_E_UC = 0x45;
  var ORD_L_F = 0x66;
  var ORD_L_F_UC = 0x46;
  var ORD_L_U = 0x75;
  var ORD_L_X = 0x78;
  var ORD_L_X_UC = 0x78;
  var ORD_L_Z = 0x7a;
  var ORD_L_Z_UC = 0x5a;
  var ORD_L_0 = 0x30;
  var ORD_L_1 = 0x31;
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
  var ORD_$ = 0x5f;
  var ORD_LODASH = 0x24;

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
    this.lastToken = null;

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
    /** last black token that was parsed */
    lastToken: null,

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
      return this.lastType === STRING || this.lastType === NUMBER || this.lastType === IDENTIFIER || this.lastType === REGEX || false;
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

      this.lastToken = token;
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

      var pos = this.pos;
      var start = this.lastStart = pos;
      var result = EOF;
      if (pos < this.len) result = this.nextToken(expressionStart, pos);
      this.lastLen = (this.lastStop = this.pos) - start;

      return result;
    },

    nextToken: function(expressionStart, pos){
      var input = this.input;
      var c = this.getLastNum(); // this.pos === this.lastStart
      var result = -1;


      // https://twitter.com/ariyahidayat/status/225447566815395840
      // Punctuator, Identifier, Keyword, String, Numeric, Boolean, Null, RegularExpression
      // so:
      // Whitespace, RegularExpression, Punctuator, Identifier, LineTerminator, String, Numeric
      if (c >= 0x21 && c <= 0x2f && this.punctuator(c)) result = PUNCTUATOR;
      else if (this.asciiIdentifier(c)) result = IDENTIFIER;
      else if (c >= 0x3a && this.punctuator(c)) result = PUNCTUATOR;
      else if (c === ORD_SPACE) ++this.pos, result = WHITE;
      else result = this.nextToken_2(c, pos, input, expressionStart);

      return result;
    },
    nextToken_2: function(c, pos, input, expressionStart){
      var result = -1;

      if (this.lineTerminator(c, pos)) result = WHITE;
      else if (c === ORD_DQUOTE) result = this.stringDouble();
      else if (this.number(c,pos,input)) result = NUMBER; // number after punctuator, check algorithm if that changes!
      else if (this.whitespace(c)) result = WHITE; // (doesnt check for space, must go after lineterminator, update algo if this changes)
      else if (c === ORD_SQUOTE) result = this.stringSingle();
      else if (c === ORD_FWDSLASH) {
        var n = this.getLastNum2(); // this.pos === this.lastStart+1
        if (n === ORD_FWDSLASH) result = this.commentSingle(pos, input);
        else if (n === ORD_STAR) result = this.commentMulti(pos, input);
        else if (expressionStart) result = this.regex();
        else result = this.punctuatorDiv(c,n);
      }
      else throw 'dont know what to parse now. '+this.syntaxError();

      return result;
    },

    punctuator: function(c){
      var len = 0;
      //    >>>=,
      //    === !== >>> <<= >>=
      //    <= >= == != ++ -- << >> && || += -= *= %= &= |= ^= /=
      //    { } ( ) [ ] . ; ,< > + - * % | & ^ ! ~ ? : = /
      if (c === ORD_DOT) { // 15.30%
        var d = this.getLastNum2();
        if (d < ORD_L_0 || d > ORD_L_9) len = 1;
      } else if (
        c === ORD_OPEN_PAREN || // 11.9%
        c === ORD_CLOSE_PAREN || // 11.90%
        c === ORD_SEMI || // 8.44%
        c === ORD_COMMA // 8.09%
      ) {
        len = 1;
      } else if (c === ORD_IS) { // 7.45%
        len = this.punctuatorCompare(c);
      } else if (
        c === ORD_OPEN_CURLY || // 4.96%
        c === ORD_CLOSE_CURLY // 4.96%
      ) {
        len = 1;
      } else if (c >= 0x3a) {
        len = this.punctuator_2(c);
      } else if (c >= 0x21 && c <= 0x2d) {
        len = this.punctuator_3(c);
      }

      if (len) {
        this.pos += len;
        return true;
      }
      return false;
    },
    punctuator_2: function(c){
      var len = 0;
      if (
        c === ORD_COLON || // 2.98%
        c === ORD_OPEN_SQUARE || // 2.63%
        c === ORD_CLOSE_SQUARE || // 2.63%
        c === ORD_QMARK // 0.40%
      ) {
        len = 1;
      } else if (c === ORD_OR) { // 0.55%
        len = this.punctuatorSame(c);
      } else if (
        c === ORD_LT || // 0.33%
        c === ORD_GT // 0.19%
      ) {
        len = this.punctuatorLtgt(c);
      } else if (
        c === ORD_XOR || // 0.01%
        c === ORD_TILDE // 0.00%
      ) {
        len = this.punctuatorCompound(c);
      }
      return len;
    },
    punctuator_3: function(c){
      var len = 0;
      if (c === ORD_DQUOTE) { // 3.67%
        // string, wont be a punctuator
      } else if (c === ORD_PLUS) { // 1.49%
        len = this.punctuatorSame(c);
      } else if (c === ORD_EXCL) { // 0.84%
        len = this.punctuatorCompare(c);
      } else if (
        c === ORD_AND || // 0.66%
        c === ORD_MIN // 0.45%
      ) {
        len = this.punctuatorSame(c);
      } else if (
        c === ORD_STAR || // 0.26%
        c === ORD_PERCENT // 0.02%
      ) {
        len = this.punctuatorLtgt(c);
      }
      return len;
    },
    punctuatorSame: function(c){
      var d = this.getLastNum2();
      return (d === ORD_IS || d === c) ? 2 : 1;
    },
    punctuatorCompare: function(c){
      var len = 1;
      if (this.getLastNum2() === ORD_IS) {
        len = 2;
        if (this.getLastNum3() === ORD_IS) len = 3;
      }
      return len;
    },
    punctuatorLtgt: function(c){
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
      return len;
    },
    punctuatorCompound: function(c){
      var len = 1;
      if (this.getLastNum2() === ORD_IS) len = 2;
      return len;
    },
    punctuatorDiv: function(c,d){
      // cant really be a //, /* or regex because they should have been checked before calling this function
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
    commentSingle: function(pos, input){
      var len = input.length;
      ++pos;
      var c = -1;
      while (pos < len) {
        c = input.charCodeAt(++pos);
        if (c === ORD_CR || c === ORD_LF || c === ORD_PS || c === ORD_LS) break;
      }
      this.pos = pos;

      return WHITE;
    },
    commentMulti: function(pos, input){
      var len = input.length;
      var hasNewline = false;
      var c=0,d = this.getLastNum3(); // at this point we are reading this.lastStart+2
      pos += 2;
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
    stringSingle: function(){
      var pos = this.pos + 1;
      var input = this.input;
      var len = input.length;

      // TODO: rewrite this while
      var c;
      while (c !== ORD_SQUOTE) {
        if (pos >= len) throw 'Unterminated string found at '+pos;
        c = input.charCodeAt(pos++);

        if (c === ORD_BACKSLASH) pos = this.stringEscape(pos);
        else if ((c <= ORD_CR && (c === ORD_LF || c === ORD_CR)) || c === ORD_PS || c === ORD_LS) throw 'No newlines in strings!';
      }

      this.pos = pos;
      return STRING;
    },
    stringDouble: function(){
      var pos = this.pos + 1;
      var input = this.input;
      var len = input.length;

      // TODO: rewrite this while
      var c;
      while (c !== ORD_DQUOTE) {
        if (pos >= len) throw 'Unterminated string found at '+pos;
        c = input.charCodeAt(pos++);

        if (c === ORD_BACKSLASH) pos = this.stringEscape(pos);
        else if ((c <= ORD_CR && (c === ORD_LF || c === ORD_CR)) || c === ORD_PS || c === ORD_LS) throw 'No newlines in strings!';
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

    number: function(c, pos, input){
      // 1-9 just means decimal literal
      if (c >= ORD_L_1 && c <= ORD_L_9) this.decimalNumber(this.getLastNum2(), pos+1, input); // do this after punctuator... the -1 is kind of a hack in that
      // leading zero can mean decimal or hex literal
      else if (c === ORD_L_0) this.decOrHex(c, pos, input);
      // dot means decimal, without the leading digits
      else if (c === ORD_DOT) this.decimalFromDot(c, pos, input); // dot, start of the number (rare)
      // yeah, no number. move on.
      else return false;
      // we parsed a number.
      return true;
    },
    decOrHex: function(c, pos, input){
      // numeric is either a decimal or hex
      // 0.1234  .123  .0  0.  0e12 0e-12 0e12+ 0.e12 0.1e23 0xdeadbeeb

      var d = this.getLastNum2();
      if (d !== ORD_L_X && d !== ORD_L_X_UC) { // x or X
        // next can only be numbers or dots...
        this.decimalNumber(d, pos+1, input);
      } else {
        this.hexNumber(pos+2);
      }

      return NUMBER;
    },
    decimalNumber: function(c, pos, input){
      // TOFIX: what?
      // leading digits. assume c is preceeded by at least one digit (that might have been zero..., tofix in the future)
      while (c >= ORD_L_0 && c <= ORD_L_9) c = input.charCodeAt(++pos);
      // .123e+40 part
      return this.decimalFromDot(c, pos, input);
    },
    decimalFromDot: function(c, pos, input){
      if (c === ORD_DOT) { // dot
        c = input.charCodeAt(++pos);
        while (c >= ORD_L_0 && c <= ORD_L_9) c = input.charCodeAt(++pos);
      }

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

      this.pos = pos;

      return NUMBER;
    },
    hexNumber: function(pos){
      var input = this.input;
      var len = input.length;
      // hex
      while (pos < len && this.hexicode(input.charCodeAt(pos))) ++pos;
      this.pos = pos;
    },

    regex: function(){
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
  //    this.pos++;
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

      this.pos = this.asciiIdentifierRest(0);
    },
    asciiIdentifier: function(c){
      var toAdd = this.asciiIdentifierStart(c);
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
    asciiIdentifierRest: function(toAdd){
      var input = this.input;
      var len = input.length;
      var pos = this.pos + toAdd;

      // also used by regex flag parser
      while (pos < len) {
        var c = input.charCodeAt(pos);

        // a-z A-Z 0-9 $ _
        if ((c >= ORD_L_A && c <= ORD_L_Z) || (c >= ORD_L_A_UC && c <= ORD_L_Z_UC) || (c >= ORD_L_0 && c <= ORD_L_9) || c === ORD_$ || c === ORD_LODASH) {
          ++pos;
          // \uxxxx
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
      return 'A syntax error at pos='+this.pos+" expected "+(typeof value == 'number' ? 'type='+Tok[value] : 'value=`'+value+'`')+' is `'+this.getLastValue()+'` '+
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
