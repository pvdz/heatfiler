
//######### lib/uni.js #########

// http://qfox.nl/notes/155
// http://qfox.nl/notes/90

(function(exports){
  var uniRegex = exports.uni = /[\u0030-\u0039\u0041-\u005a\u005f\u0061-\u007a\u00aa\u00b5\u00ba\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0524\u0526\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0621-\u065e\u0660-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0901-\u0939\u093c-\u094d\u0950-\u0954\u0958-\u0963\u0966-\u096f\u0971\u0972\u097b-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d28\u0d2a-\u0d39\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc\u0edd\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f8b\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u1099\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc\u1100-\u1159\u115f-\u11a2\u11a8-\u11f9\u1200-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u1676\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17b3\u17b6-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19a9\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1baa\u1bae-\u1bb9\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1d00-\u1de6\u1dfe-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffb\u203f\u2040\u2054\u2071\u207f\u2090-\u2094\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb\u2ced\u2cf2\u2d00-\u2d25\u2d30-\u2d65\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31b7\u31f0-\u31ff\u3400\u4db5\u4e00\u9fc3\ua000-\ua1af\ua60c\ua620-\ua629\ua640-\ua660\ua662-\ua66d\ua66f\ua67c\ua67d\ua67f-\ua697\ua717-\ua71f\ua722-\ua788\ua78b-\ua78d\ua790\ua792\ua7a0\ua7a2\ua7a4\ua7a6\ua7a8\ua7aa\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua900-\ua909\ua926-\ua92d\ua947-\ua953\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\ufb00-\ufb06\ufb13-\ufb17\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff70\uff9e\uff9f]/;
})(typeof exports === 'object' ? exports : window);


//######### end of lib/uni.js #########


//######### lib/tok.js #########

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
      return this.lastType === STRING || this.lastType === NUMBER || this.lastType === IDENTIFIER || this.lastType === REGEX;
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


//######### end of lib/tok.js #########


//######### lib/par.js #########

// this is a special modified version of ZeParser2 that adds meta data to
// the token stream (-> array) that is returned.
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
      this.parseStatements(NOTINFUNCTION, NOTINLOOP, NOTINSWITCH, [], {white:-1, lastExpressionStart:[], isGlobal:true});
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
        start.ownerFuncToken = funcToken;
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
          if (value === 'function') this.parseFunction(FORFUNCTIONDECL, funcToken);
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
    parseStatementHeader: function(funcToken, keywordToken){
      var tok = this.tok;
      if (keywordToken) keywordToken.lhp = tok.lastToken;
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEREGEX);
      this.parseExpressions(funcToken);
      if (keywordToken) keywordToken.rhp = tok.lastToken;
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
      var doken = foken = tok.lastToken;
      tok.nextExpr(); // do
      doken.firstStatement = tok.lastToken;
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
      doken.lastStatement = tok.black[tok.lastToken.black - 1];
      tok.lastToken.belongsToDo = true;
      tok.mustBeString('while', NEXTTOKENCANBEDIV);
      tok.mustBeNum(ORD_OPEN_PAREN, NEXTTOKENCANBEREGEX);
      this.parseExpressions(funcToken);
      tok.mustBeNum(ORD_CLOSE_PAREN, NEXTTOKENCANBEDIV); //no regex following because it's either semi or newline without asi if a forward slash follows it
      this.parseSemi();
    },
    parseWhile: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // while ( <exprs> ) <stmt>

      var tok = this.tok;
      var woken = foken = tok.lastToken;
      tok.nextPunc();
      this.parseStatementHeader(funcToken);
      woken.firstStatement = tok.lastToken;
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
      woken.lastStatement = tok.black[tok.lastToken.black - 1];
    },
    parseFor: function(inFunction, inLoop, inSwitch, labelSet, funcToken){
      // for ( <expr-no-in-=> in <exprs> ) <stmt>
      // for ( var <idntf> in <exprs> ) <stmt>
      // for ( var <idntf> = <expr-no-in> in <exprs> ) <stmt>
      // for ( <expr-no-in> ; <expr> ; <expr> ) <stmt>

      var state = NOPARSE;

      var tok = this.tok;
      var foken = tok.tokens[tok.tokens.length-1];
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
      foken.firstStatement = tok.lastToken;
      this.parseStatement(inFunction, INLOOP, inSwitch, labelSet, REQUIRED, funcToken);
      foken.lastStatement = tok.black[tok.lastToken.black - 1];
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

      if (!inFunction && !this.options.functionMode) throw 'Can only return in a function '+tok.syntaxError('return');

      var retToken = tok.lastToken;
      retToken.isReturnKeyword = true;

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
      var switchToken = tok.lastToken;
      switchToken.isSwitchKeyword = true;
      tok.nextPunc();
      this.parseStatementHeader(funcToken, switchToken);
      switchToken.lhc = tok.lastToken;
      tok.mustBeNum(ORD_OPEN_CURLY, NEXTTOKENCANBEREGEX);
      this.parseSwitchBody(inFunction, inLoop, INSWITCH, labelSet, funcToken, switchToken);
      switchToken.rhc = tok.lastToken;
      tok.mustBeNum(ORD_CLOSE_CURLY, NEXTTOKENCANBEREGEX);
    },
    parseSwitchBody: function(inFunction, inLoop, inSwitch, labelSet, funcToken, switchToken){
      // [<cases>] [<default>] [<cases>]

      // default can go anywhere...
      this.parseCases(inFunction, inLoop, inSwitch, labelSet, funcToken, switchToken);
      if (this.tok.nextPuncIfString('default')) {
        this.parseDefault(inFunction, inLoop, inSwitch, labelSet, funcToken);
        this.parseCases(inFunction, inLoop, inSwitch, labelSet, funcToken, switchToken);
      }
    },
    parseCases: function(inFunction, inLoop, inSwitch, labelSet, funcToken, switchToken){
      var tok = this.tok;
      var caseToken = tok.lastToken;
      while (tok.nextPuncIfString('case')) {
        caseToken.isCaseKeyword = true;
        caseToken.switchToken = switchToken;
        this.parseCase(inFunction, inLoop, inSwitch, labelSet, funcToken, caseToken);
        caseToken = tok.lastToken;
      }
    },
    parseCase: function(inFunction, inLoop, inSwitch, labelSet, funcToken, caseToken){
      // case <value> : <stmts-no-case-default>
      this.parseExpressions(funcToken);
      caseToken.colonToken = this.tok.lastToken;
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
    parseFunction: function(forFunctionDeclaration, parentFuncToken){
      // function [<idntf>] ( [<param>[,<param>..] ) { <stmts> }

      var tok = this.tok;
      var funcToken = tok.lastToken;
      funcToken.isFunctionMarker = true; // "marker" -> getters/setters
      funcToken.lastExpressionStart = [];
      funcToken.textName = 'unknown'; // we'll try to resolve the func name, may not work though...
      if (forFunctionDeclaration) {
        funcToken.isFuncDeclKeyword = true;
        funcToken.parentFuncToken = parentFuncToken;
      }

      // for var/prop resolving after the ident
      var prev = tok.black[tok.black.length-2];
      var prevprev = tok.black[tok.black.length-3];

      tok.nextPunc(); // 'function'
      if (tok.isType(IDENTIFIER)) { // name
        if (this.isReservedIdentifier(DONTIGNOREVALUES)) throw 'function name is reserved';
        tok.lastToken.funcToken = funcToken;
        tok.lastToken.isFuncDeclName = true;
        funcToken.textName = tok.lastToken.value;
        tok.nextPunc();
      } else if (forFunctionDeclaration) {
        throw 'function declaration name is required';
      }

      // desperately try to get the name... so; is it a object property or var/prop assignment?
      // note: this assumes heatfiler, which always gets a black token stream... (-> tok.black)
      if (prev && (prev.value === '=' || prev.value === ':')) {
        if (prevprev.type === IDENTIFIER) {
          if (!funcToken.textName || funcToken.textName === 'unknown') {
            funcToken.textName = prevprev.value;
          } else {
            funcToken.altTextName = prevprev.value;
          }
        }
      }

      this.parseFunctionRemainder(-1, forFunctionDeclaration, funcToken);

      if (forFunctionDeclaration) funcToken.rhc.isStatementStop = -1; // becomes 0 in parseStatement
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
      var qmarkToken = tok.lastToken;
      qmarkToken.isQmark = true;
      qmarkToken.conditionStart = funcToken.lastExpressionStart.pop();
      qmarkToken.conditionStart.isQmarkStart = qmarkToken;
      qmarkToken.conditionStart.isExpressionStart = tok.lastToken;
      tok.nextExpr();
      qmarkToken.trueStart = tok.lastToken;
      qmarkToken.trueStart.isQmarkLeft = qmarkToken;
      funcToken.lastExpressionStart.push(tok.lastToken);

      this.parseExpression(funcToken);

      funcToken.lastExpressionStart.pop().isExpressionStart = tok.lastToken;
      tok.mustBeNum(ORD_COLON, NEXTTOKENCANBEREGEX);
      funcToken.lastExpressionStart.push(tok.lastToken);
      qmarkToken.falseStart = tok.lastToken;
      qmarkToken.falseStart.isQmarkRight = qmarkToken;

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
          tok.lastToken.isCallStart = true;
          tok.nextExpr();
          this.parseOptionalExpressions(funcToken);
          tok.lastToken.isCallStop = true;
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


//######### end of lib/par.js #########


//######### src/transformer.js #########

// avg ifs checked
// avg loops per while/function
// which return used + counts

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
    switchVar: '$switchvar$', // not a function
    caseCheck: '$case$',
    macro: '$macro$',
    loopCount: '$loop$',

    typeSwitch: 'S',
    typeLoop: 'L',
    typeIf: 'I',
    typeReturn: 'R',
    typeCase: 'C',

    process: function(fid, input, stats){
      var tokens = transformer.parse(input);
      transformer.initializeStats(fid, tokens, stats);
      return transformer.transform(fid, tokens, stats);
    },
    parse: function(input){
      return Par.parse(input, {saveTokens:true, createBlackStream: true}).tok.tokens;
    },
    transform: function(fid, tree, stats){
      //tree.forEach(function(o){ o.ovalue = o.value; });
      tree.forEach(function(token,index){
        if (token.isMacro) { // multi-line comment starting with `/*HF:`
          var statsObj = stats[fid].macros[index];

          token.value = transformer.macro+'('+fid+', "'+statsObj.name+'", '+index+', ('+statsObj.code+'))';
        }

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
          token.value += ' ' +
            transformer.caseCheck+'('+
              fid+', '+
              index +', ' +
              '(';
          // <case expression here>
          token.colonToken.value = '' +
              '), '+
              switchVar+', '+
              token.switchToken.white+', '+
              token.caseIndex+', '+
              token.ownerCountIndex+', '+
              token.ownerCountFuncId+
            ')'+token.colonToken.value;
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
                t.isExpressionStart = false;
                t.value = '';
                if (i === 0) t.value = switchVar;
                return v;
              })
              .join('');

            token.value = '' +
              '{\n' +
              transformer.nameStatementCount+'('+fid+', '+index+', "'+token.ownerCountType+'", '+token.ownerCountIndex+', '+token.ownerCountFuncId+');\n'+
              'var ' + switchVar + ' = (' + header + ');\n'+
              'switch' +
              '';
            token.rhc += '}\n';
          } else if (token.value === 'function') {
            if (token.parentFuncToken.isGlobal) tree[0].value = ';'+transformer.nameStatementCount+'('+fid+', '+index+', true); ' + tree[0].value;
            else token.parentFuncToken.lhc.value += ';'+transformer.nameStatementCount+'('+fid+', '+index+', true); ';
          } else {
            token.value =
              (token.sameToken?'':' { ') +
              ';'+transformer.nameStatementCount+'('+
                fid + ', ' +
                index +
                (token.ownerCountType?', "'+token.ownerCountType+'", '+token.ownerCountIndex+', '+token.ownerCountFuncId:'')+
                // arg is ignored but we dont know if statement or expr for loop counter.
                (token.loopIndex>=0?','+transformer.loopCount+'('+fid+', '+token.loopIndex+', '+token.loopFunc+')':'')+
              '); ' +
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
      if (!stats[fid]) stats[fid] = {statements:{}, expressions:{}, functions:{}, arguments:{}, qmarks:{}, macros:{}};
      var fstats = stats[fid];

      tree.forEach(function(token,index){
        if (token.isFunctionMarker) {
          var obj = fstats.functions[index] = {
            type: 'func',
            types: '',
            typeCount: {},
            truthy: 0,
            falsy: 0,
            ifs: [],
            loops: [],
            looped: [],
            switches: [],
            cases: [],
            returns: []
          };
          if (token.isFuncDeclKeyword) obj.declared = 0;
        }
        if (token.isExpressionStart || token.isCaseKeyword ) {
          fstats.expressions[index] = {type:'expr', count:0, types:'', typeCount:{}, truthy:0, falsy:0};
          if (token.isCaseKeyword) {
            var caseCounts = fstats.statements[token.switchToken.white].caseCounts; // defined below
            token.caseIndex = caseCounts.length;
            caseCounts.push(0);
            fstats.statements[token.switchToken.white].casePasses.push(0);

            var func = fstats.functions[token.switchToken.ownerFuncToken.white];
            token.ownerCountIndex = func.cases.length;
            token.ownerCountType = transformer.typeCase;
            token.ownerCountFuncId = token.switchToken.ownerFuncToken.white;
            func.cases.push(0);
          }
        }
        if (token.isStatementStart) {
          var obj = fstats.statements[token.isForElse || index] = {type: 'stmt', count: 0, types:'', typeCount: {}};
          if (token.sameToken) obj.epsilon = true;
          if (token.isReturnKeyword) {
            obj.isReturn = true;

            var func = fstats.functions[token.ownerFuncToken.white];
            token.ownerCountIndex = func.returns.length;
            token.ownerCountType = transformer.typeReturn;
            token.ownerCountFuncId = token.ownerFuncToken.white;
            func.returns.push(0);
          }
          if (token.isSwitchKeyword) {
            obj.isSwitch = true;
            obj.caseCounts = [];
            obj.casePasses = [];

            var func = fstats.functions[token.ownerFuncToken.white];
            token.ownerCountIndex = func.switches.length;
            token.ownerCountType = transformer.typeSwitch;
            token.ownerCountFuncId = token.ownerFuncToken.white;
            func.switches.push(0);
          }
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
        if (token.type === WHITE && token.value.slice(0, 5) === '/*HF:') {
          token.isMacro = true;

          var match;
          if (match = token.value.match(/\/\*\s*HF:(count-(?:exact|ranged))\s*(\[[^\]]*?\])\s*`([^`]*?)`\s*\*\//)) {
            token.isMacro = true;

            var macroName = match[1];
            var counts = match[2];
            var code = match[3];

            if (macroName !== 'count-exact' && macroName !== 'count-ranged') throw new Error('unknown count macro subtype: '+macroName)

            // assuming `counts` is a valid js array apart from double dots,
            // we can easily replace the double dots with the extrapolated list of ints
            counts = counts.replace(/(\d+)\s*..\s*(\d+)/g, function(a,b,c){
              var s = [];
              for (var i = parseInt(a, 10), n = parseInt(b, 10); i <= n; ++i) {
                s.push(i);
              }
              return s.join(',');
            });

            fstats.macros[token.white] = {type: 'macro', name: macroName, args: JSON.parse(counts), code: code};
          } else if (match = token.value.match(/\/\*\s*HF:(count-any)\s*`([^`]*?)`\s*\*\//)) {
            token.isMacro = true;

            var macroName = match[1];
            var code = match[2];

            // results will be stashed in args object
            fstats.macros[token.white] = {type: 'macro', name: macroName, args: {}, code: code};
          } else {
            console.log('next error for:', token);
            throw new Error('Unknown macro:', token.value);
          }
        }
        if (token.value === 'if') {
          var func = fstats.functions[token.ownerFuncToken.white];
          token.isIfKeyword = true;
          token.ownerCountIndex = func.ifs.length;
          token.ownerCountType = transformer.typeIf;
          token.ownerCountFuncId = token.ownerFuncToken.white;
          func.ifs.push(0);
        }
        if ((token.value === 'while' && !token.belongsToDo) || token.value === 'for' || token.value === 'do') {
          var func = fstats.functions[token.ownerFuncToken.white];
          token.isLoopKeyword = true;
          token.ownerCountIndex = func.loops.length;
          token.ownerCountType = transformer.typeLoop;
          token.ownerCountFuncId = token.ownerFuncToken.white;
          func.loops.push(0);
          token.firstStatement.loopIndex = token.ownerCountIndex;
          token.firstStatement.loopFunc = token.ownerCountFuncId;
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
    prevBlack: function(token, tree){
      if (!token) return null;
      var i = token.white-1;
      while (tree[i] && tree[i].type === WHITE) --i;
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
        if (token.type === WHITE && token.value.slice(0, 5) === '/*HF:') {
          alreadyEscaped = true;
          returnValue = transformer.escape(token.value)
          returnValue = returnValue.replace(/^\/\*(HF:[\w-]+)/, '/*<span id="id-'+index+'">$1</span>');
          returnValue = returnValue.replace(/`([^`])`/, '`<span class="macro-code">$1</span>`');
        } else if (token.isExpressionStart || token.isCaseKeyword || token.isFuncDeclKeyword) {
          alreadyEscaped = true;

          if (!forThumb) {
            if (token.isFunctionMarker) { // expression! or case... (TOFIX: testcase for a function in a `case`)
              var str = transformer.escape(token.value);
              var identName = transformer.nextBlack(token, tree);
              if (identName.isFuncDeclName) {
                str = transformer.rangeString(tree, index, identName.white);
              }

              // we want to hide the expression span (not remove it because that makes other
              // parts of the code break and handling that gracefully is far more complex
              // opposed to just hiding these elements and let them be). So...
              returnValue +=
                '<span id="id-'+index+'" style="display:none;"></span>' +
                '<span class="function-focus" title="click to zoom in on this function" data-index="'+index+'">\u2923</span>' +
                '<span class="function-exclude" title="click to exclude this function from stats" data-index="'+index+'">\u2295</span>' +
                '<span id="func-id-'+index+'" data-func-name="'+token.textName+'" data-func-alt-name="'+token.altTextName+'">' +
                  str +
                '</span>';

              if (identName.isFuncDeclName) index = identName.white;
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
        } else if (token.isFuncDeclName) {
          returnValue += '<span class="func-decl-name">' + transformer.escape(token.value) + '</span>';
          alreadyEscaped = true;
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

            // TODO what case is this? function in else? or just exactly not that?
            if (!forThumb && token.isFunctionMarker) {
              var str = transformer.escape(token.value);
              var funcName = transformer.nextBlack(token, tree);
              if (funcName.isFuncDeclName) {
                str = transformer.rangeString(tree, index, funcName.white);
              }

              // we want to hide the expression span (not remove it because that makes other
              // parts of the code break and handling that gracefully is far more complex
              // opposed to just hiding these elements and let them be). So...
              returnValue +=
                '<span id="id-'+eindex+'" style="display:none;"></span>' +
                '<span id="func-id-'+index+'" data-func-name="'+token.textName+'" data-func-alt-name="'+token.altTextName+'">' +
                  str +
                '</span>';

              if (funcName.isFuncDeclName) index = funcName.white;
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


//######### end of src/transformer.js #########


//######### src/heatfiler.js #########

(function(exports){

  var HeatFiler = function(){
    this.fileNames = [];
    this.contents = [];
    this.transformed = [];
    this.profiledFidMap = [];
    this.stats = {};
    this.globals = {};
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
      return this;
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
        this.run(this.profiledFidMap[0]);
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


//######### end of src/heatfiler.js #########

