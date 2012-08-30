(function(window){

  /**
   * This is my js Parser: Ze. It's actually the post-dev pre-cleanup version. Clearly.
   * Some optimizations have been applied :)
   * (c) Peter van der Zee, qfox.nl
   * @param {String} inp Input
   * @param {Tokenizer} tok
   * @param {Array} stack The tokens will be put in this array. If you're looking for the AST, this would be it :)
   */
  var ZeParser = function(inp, tok, stack, simple){
    this.input = inp;
    this.tokenizer = tok;
    this.stack = stack;
    this.stack.root = true;
    this.scope = stack.scope = [{value:'this', isDeclared:true, isEcma:true, thisIsGlobal:true}]; // names of variables
    this.scope.global = true;
    this.statementLabels = [];

    this.errorStack = [];

    stack.scope = this.scope; // hook root
    stack.labels = this.statementLabels;

    this.regexLhsStart = ZeParser.regexLhsStart;
    /*
     this.regexStartKeyword = ZeParser.regexStartKeyword;
     this.regexKeyword = ZeParser.regexKeyword;
     this.regexStartReserved = ZeParser.regexStartReserved;
     this.regexReserved = ZeParser.regexReserved;
     */
    this.regexStartKeyOrReserved = ZeParser.regexStartKeyOrReserved;
    this.hashStartKeyOrReserved = ZeParser.hashStartKeyOrReserved;
    this.regexIsKeywordOrReserved = ZeParser.regexIsKeywordOrReserved;
    this.regexAssignments = ZeParser.regexAssignments;
    this.regexNonAssignmentBinaryExpressionOperators = ZeParser.regexNonAssignmentBinaryExpressionOperators;
    this.regexUnaryKeywords = ZeParser.regexUnaryKeywords;
    this.hashUnaryKeywordStart = ZeParser.hashUnaryKeywordStart;
    this.regexUnaryOperators = ZeParser.regexUnaryOperators;
    this.regexLiteralKeywords = ZeParser.regexLiteralKeywords;
    this.testing = {'this':1,'null':1,'true':1,'false':1};

    this.ast = !simple; ///#define FULL_AST
  };
  /**
   * Returns just a stacked parse tree (regular array)
   * @param {string} input
   * @param {boolean} simple=false
   * @return {Array}
   */
  ZeParser.parse = function(input, simple){
    var tok = new Tokenizer(input);
    var stack = [];
    try {
      var parser = new ZeParser(input, tok, stack);
      if (simple) parser.ast = false;
      parser.parse();
      return stack;
    } catch (e) {
      console.log("Parser has a bug for this input, please report it :)", e);
      return null;
    }
  };
  /**
   * Returns a new parser instance with parse details for input
   * @param {string} input
   * @param {Object} options
   * @property {boolean} [options.tagLiterals] Instructs the tokenizer to also parse tag literals
   * @returns {ZeParser}
   */
  ZeParser.createParser = function(input, options){
    var tok = new Tokenizer(input, options);
    var stack = [];
    try {
      var parser = new ZeParser(input, tok, stack, options);
      parser.parse();
      return parser;
    } catch (e) {
      console.log("Parser has a bug for this input, please report it :)", e);
      return null;
    }
  };
  ZeParser.prototype = {
    input: null,
    tokenizer: null,
    stack: null,
    scope: null,
    statementLabels: null,
    errorStack: null,

    ast: null,

    queryMethodExtension: false,

    parse: function(match){
      if (match) match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, this.stack); // meh
      else match = this.tokenizer.storeCurrentAndFetchNextToken(false, null, this.stack, true); // initialization step, dont store the match (there isnt any!)

      match = this.eatSourceElements(match, this.stack);

      var cycled = false;
      do {
        if (match && match.name != 12/*eof*/) {
          // if not already an error, insert an error before it
          if (match.name != 14/*error*/) this.failignore('UnexpectedToken', match, this.stack);
          // just parse the token as is and continue.
          match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, this.stack);
          cycled = true;
        }

        // keep gobbling any errors...
      } while (match && match.name == 14/*error*/);

      // now try again (but only if we gobbled at least one token)...
      if (cycled && match && match.name != 12/*eof*/) match = this.parse(match);

      // pop the last token off the stack if it caused an error at eof
      if (this.tokenizer.errorEscape) {
        this.stack.push(this.tokenizer.errorEscape);
        this.tokenizer.errorEscape = null;
      }

      return match;
    },

    eatSemiColon: function(match, stack){
      //this.stats.eatSemiColon = (+//this.stats.eatSemiColon||0)+1;
      if (match.value == ';') match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      else {
        // try asi
        // only if:
        // - this token was preceeded by at least one newline (match.newline) or next token is }
        // - this is EOF
        // - prev token was one of return,continue,break,throw (restricted production), not checked here.

        // the exceptions to this rule are
        // - if the next line is a regex
        // - the semi is part of the for-header.
        // these exceptions are automatically caught by the way the parser is built

        // not eof and just parsed semi or no newline preceeding and next isnt }
        if (match.name != 12/*EOF*/ && (match.semi || (!match.newline && match.value != '}')) && !(match.newline && (match.value == '++' || match.value == '--'))) {
          this.failignore('NoASI', match, stack);
        } else {
          // ASI
          // (match is actually the match _after_ this asi, so the position of asi is match.start, not stop (!)
          var asi = {start:match.start,stop:match.start,name:13/*ASI*/};
          stack.push(asi);

          // slip it in the stream, before the current match.
          // for the other tokens see the tokenizer near the end of the main parsing function
          this.tokenizer.addTokenToStreamBefore(asi, match);
        }
      }
      match.semi = true;
      return match;
    },
    /**
     * Eat one or more "AssignmentExpression"s. May also eat a labeled statement if
     * the parameters are set that way. This is the only way to linearly distinct between
     * an expression-statement and a labeled-statement without double lookahead. (ok, maybe not "only")
     * @param {boolean} mayParseLabeledStatementInstead=false If the first token is an identifier and the second a colon, accept this match as a labeled statement instead... Only true if the match in the parameter is an (unreserved) identifier (so no need to validate that further)
     * @param {Object} match
     * @param {Array} stack
     * @param {boolean} onlyOne=false Only parse a AssignmentExpression
     * @param {boolean} forHeader=false Do not allow the `in` operator
     * @param {boolean} isBreakOrContinueArg=false The argument for break or continue is always a single identifier
     * @return {Object}
     */
    eatExpressions: function(mayParseLabeledStatementInstead, match, stack, onlyOne, forHeader, isBreakOrContinueArg){
      if (this.ast) { //#ifdef FULL_AST
        var pstack = stack;
        stack = [];
        stack.desc = 'expressions';
        stack.nextBlack = match.tokposb;
        pstack.push(stack);

        var parsedExpressions = 0;
      } //#endif

      if (!match.isLabel) match.subExpressionLogicStart = true;
      var foundLogic = false;
      var logicStart = match;

      var first = true;
      do {
        var parsedNonAssignmentOperator = false; // once we parse a non-assignment, this expression can no longer parse an assignment
        // TOFIX: can probably get the regex out somehow...
        if (!first) {
          match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
          if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('ExpectedAnotherExpressionComma', match);
        }

        if (foundLogic) {
          match.subExpressionLogicStart = true;
          logicStart = match;
          foundLogic = false;
        }

        if (this.ast) { //#ifdef FULL_AST
          ++parsedExpressions;

          var astack = stack;
          stack = [];
          stack.desc = 'expression';
          stack.nextBlack = match.tokposb;
          astack.push(stack);
        } //#endif

        // start of expression is given: match
        // it should indeed be a properly allowed lhs
        // first eat all unary operators
        // they can be added to the stack, but we need to ensure they have indeed a valid operator

        var extraParens = 0; // hack for heatfiler

        var parseAnotherExpression = true;
        while (parseAnotherExpression) { // keep parsing lhs+operator as long as there is an operator after the lhs.
          if (foundLogic) {
            match.subExpressionLogicStart = true;
            logicStart = match;
            foundLogic = false;
          }

          if (this.ast) { //#ifdef FULL_AST
            var estack = stack;
            stack = [];
            stack.desc = 'sub-expression';
            stack.nextBlack = match.tokposb;
            estack.push(stack);

            var substart = match;

            var news = 0; // encountered new operators waiting for parenthesis
          } //#endif

          // start checking lhs
          // if lhs is identifier (new/call expression), allow to parse an assignment operator next
          // otherwise keep eating unary expressions and then any "value"
          // after that search for a binary operator. if we only ate a new/call expression then
          // also allow to eat assignments. repeat for the rhs.
          var parsedUnaryOperator = false;
          var isUnary = null;
          while (
            !isBreakOrContinueArg && // no unary for break/continue
              (isUnary =
                (match.value && this.hashUnaryKeywordStart[match.value[0]] && this.regexUnaryKeywords.test(match.value)) || // (match.value == 'delete' || match.value == 'void' || match.value == 'typeof' || match.value == 'new') ||
                  (match.name == 11/*PUNCTUATOR*/ && this.regexUnaryOperators.test(match.value))
                )
            ) {
            if (isUnary) match.isUnaryOp = true;
            if (this.ast) { //#ifdef FULL_AST
              // find parenthesis
              if (match.value == 'new') ++news;
            } //#endif

            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            // ensure that it is in fact a valid lhs-start. TAG is a custom extension for optional tag literal syntax support.
            if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('ExpectedAnotherExpressionRhs', match);
            // not allowed to parse assignment
            parsedUnaryOperator = true;
          }

          // if we parsed any kind of unary operator, we cannot be parsing a labeled statement
          if (parsedUnaryOperator) mayParseLabeledStatementInstead = false;

          // so now we know match is a valid lhs-start and not a unary operator
          // it must be a string, number, regex, identifier
          // or the start of an object literal ({), array literal ([) or group operator (().

          var acceptAssignment = false;

          // take care of the "open" cases first (group, array, object)
          if (match.value == '(') {
            if (this.ast) { //#ifdef FULL_AST
              var groupStack = stack;
              stack = [];
              stack.desc = 'grouped';
              stack.nextBlack = match.tokposb;
              groupStack.push(stack);

              var lhp = match;

              match.isGroupStart = true;
            } //#endif
            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('GroupingShouldStartWithExpression', match);
            // keep parsing expressions as long as they are followed by a comma
            match = this.eatExpressions(false, match, stack);

            if (match.value != ')') match = this.failsafe('UnclosedGroupingOperator', match);
            if (this.ast) { //#ifdef FULL_AST
              match.twin = lhp;
              lhp.twin = match;

              match.isGroupStop = true;

              if (stack[stack.length-1].desc == 'expressions') {
                // create ref to this expression group to the opening paren
                lhp.expressionArg = stack[stack.length-1];
              }
            } //#endif
            match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // might be div

            if (this.ast) { //#ifdef FULL_AST
              stack = groupStack;
            } //#endif
            // you can assign to group results. and as long as the group does not contain a comma (and valid ref), it will work too :)
            acceptAssignment = true;
            // there's an extra rule for [ namely that, it must start with an expression but after that, expressions are optional
          } else if (match.value == '[') {
            if (this.ast) { //#ifdef FULL_AST
              stack.sub = 'array literal';
              stack.hasArrayLiteral = true;
              var lhsb = match;

              match.isArrayLiteralStart = true;

              if (!this.scope.arrays) this.scope.arrays = [];
              match.arrayId = this.scope.arrays.length;
              this.scope.arrays.push(match);

              match.targetScope = this.scope;
            } //#endif
            // keep parsing expressions as long as they are followed by a comma
            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

            // arrays may start with "elided" commas
            while (match.value == ',') match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

            var foundAtLeastOneComma = true; // for entry in while
            while (foundAtLeastOneComma && match.value != ']') {
              foundAtLeastOneComma = false;

              if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value)) && match.name != 14/*error*/) match = this.failsafe('ArrayShouldStartWithExpression', match);
              match = this.eatExpressions(false, match, stack, true);

              while (match.value == ',') {
                foundAtLeastOneComma = true;
                match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
              }
            }
            if (match.value != ']') {
              match = this.failsafe('UnclosedPropertyBracket', match);
            }
            if (this.ast) { //#ifdef FULL_AST
              match.twin = lhsb;
              lhsb.twin = match;

              match.isArrayLiteralStop = true;
            } //#endif
            match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // might be div
            while (match.value == '++' || match.value == '--') {
              // gobble and ignore?
              this.failignore('InvalidPostfixOperandArray', match, stack);
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            }
            // object literals need seperate handling...
          } else if (match.value == '{') {
            if (this.ast) { //#ifdef FULL_AST
              stack.sub = 'object literal';
              stack.hasObjectLiteral = true;

              match.isObjectLiteralStart = true;

              if (!this.scope.objects) this.scope.objects = [];
              match.objectId = this.scope.objects.length;
              this.scope.objects.push(match);

              var targetObject = match;
              match.targetScope = this.scope;

              var lhc = match;
            } //#endif

            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            if (match.name == 12/*eof*/) {
              match = this.failsafe('ObjectLiteralExpectsColonAfterName', match);
            }
            // ObjectLiteral
            // PropertyNameAndValueList

            while (match.value != '}' && match.name != 14/*error*/) { // will stop if next token is } or throw if not and no comma is found
              // expecting a string, number, or identifier
              //if (match.name != 5/*STRING_SINGLE*/ && match.name != 6/*STRING_DOUBLE*/ && match.name != 3/*NUMERIC_HEX*/ && match.name != 4/*NUMERIC_DEC*/ && match.name != 2/*IDENTIFIER*/) {
              // TOFIX: more specific errors depending on type...
              if (!match.isNumber && !match.isString && match.name != 2/*IDENTIFIER*/) {
                match = this.failsafe('IllegalPropertyNameToken', match);
              }

              if (this.ast) { //#ifdef FULL_AST
                var objLitStack = stack;
                stack = [];
                stack.desc = 'objlit pair';
                stack.isObjectLiteralPair = true;
                stack.nextBlack = match.tokposb;
                objLitStack.push(stack);

                var propNameStack = stack;
                stack = [];
                stack.desc = 'objlit pair name';
                stack.nextBlack = match.tokposb;
                propNameStack.push(stack);

                propNameStack.sub = 'data';

                var propName = match;
                propName.isPropertyName = true;
              } //#endif

              var getset = match.value;
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
              if (this.ast) { //#ifdef FULL_AST
                stack = propNameStack;
              } //#endif

              // for get/set we parse a function-like definition. but only if it's immediately followed by an identifier (otherwise it'll just be the property 'get' or 'set')
              if (getset == 'get') {
                // "get" PropertyName "(" ")" "{" FunctionBody "}"
                if (match.value == ':') {
                  if (this.ast) { //#ifdef FULL_AST
                    propName.isPropertyOf = targetObject;
                  } //#endif
                  match = this.eatObjectLiteralColonAndBody(match, stack);
                } else {
                  if (this.ast) { //#ifdef FULL_AST
                    match.isPropertyOf = targetObject;
                    propNameStack.sub = 'getter';
                    propNameStack.isAccessor = true;
                  } //#endif
                  // if (match.name != 2/*IDENTIFIER*/ && match.name != 5/*STRING_SINGLE*/ && match.name != 6/*STRING_DOUBLE*/ && match.name != 3/*NUMERIC_HEX*/ && match.name != 4/*NUMERIC_DEC*/) {
                  if (!match.isNumber && !match.isString && match.name != 2/*IDENTIFIER*/) match = this.failsafe('IllegalGetterSetterNameToken', match, true);
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  if (match.value != '(') match = this.failsafe('GetterSetterNameFollowedByOpenParen', match);
                  if (this.ast) { //#ifdef FULL_AST
                    var lhp = match;
                  } //#endif
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  if (match.value != ')') match = this.failsafe('GetterHasNoArguments', match);
                  if (this.ast) { //#ifdef FULL_AST
                    match.twin = lhp;
                    lhp.twin = match;
                  } //#endif
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  match = this.eatFunctionBody(match, stack);
                }
              } else if (getset == 'set') {
                // "set" PropertyName "(" PropertySetParameterList ")" "{" FunctionBody "}"
                if (match.value == ':') {
                  if (this.ast) { //#ifdef FULL_AST
                    propName.isPropertyOf = targetObject;
                  } //#endif
                  match = this.eatObjectLiteralColonAndBody(match, stack);
                } else {
                  if (this.ast) { //#ifdef FULL_AST
                    match.isPropertyOf = targetObject;
                    propNameStack.sub = 'setter';
                    propNameStack.isAccessor = true;
                  } //#endif
                  if (!match.isNumber && !match.isString && match.name != 2/*IDENTIFIER*/) match = this.failsafe('IllegalGetterSetterNameToken', match);
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  if (match.value != '(') match = this.failsafe('GetterSetterNameFollowedByOpenParen', match);
                  if (this.ast) { //#ifdef FULL_AST
                    var lhp = match;
                  } //#endif
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  if (match.name != 2/*IDENTIFIER*/) {
                    if (match.value == ')') match = this.failsafe('SettersMustHaveArgument', match);
                    else match = this.failsafe('IllegalSetterArgumentNameToken', match);
                  }
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  if (match.value != ')') {
                    if (match.value == ',') match = this.failsafe('SettersOnlyGetOneArgument', match);
                    else match = this.failsafe('SetterHeaderShouldHaveClosingParen', match);
                  }
                  if (this.ast) { //#ifdef FULL_AST
                    match.twin = lhp;
                    lhp.twin = match;
                  } //#endif
                  match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                  match = this.eatFunctionBody(match, stack);
                }
              } else {
                // PropertyName ":" AssignmentExpression
                if (this.ast) { //#ifdef FULL_AST
                  propName.isPropertyOf = targetObject;
                } //#endif
                match = this.eatObjectLiteralColonAndBody(match, stack);
              }

              if (this.ast) { //#ifdef FULL_AST
                stack = objLitStack;
              } //#endif

              // one trailing comma allowed
              if (match.value == ',') {
                match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                if (match.value == ',') match = this.failsafe('IllegalDoubleCommaInObjectLiteral', match);
              } else if (match.value != '}') match = this.failsafe('UnclosedObjectLiteral', match);

              // either the next token is } and the loop breaks or
              // the next token is the start of the next PropertyAssignment...
            }
            // closing curly
            if (this.ast) { //#ifdef FULL_AST
              match.twin = lhc;
              lhc.twin = match;

              match.isObjectLiteralStop = true;
            } //#endif

            match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // next may be div
            while (match.value == '++' || match.value == '--') {
              this.failignore('InvalidPostfixOperandObject', match, stack);
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            }
          } else if (match.value == 'function') { // function expression
            if (this.ast) { //#ifdef FULL_AST
              var oldstack = stack;
              stack = [];
              stack.desc = 'func expr';
              stack.isFunction = true;
              stack.nextBlack = match.tokposb;
              if (!this.scope.functions) this.scope.functions = [];
              match.functionId = this.scope.functions.length;
              this.scope.functions.push(match);
              oldstack.push(stack);
              var oldscope = this.scope;
              // add new scope
              match.scope = stack.scope = this.scope = [
                this.scope,
                {value:'this', isDeclared:true, isEcma:true, functionStack: stack},
                {value:'arguments', isDeclared:true, isEcma:true, varType:['Object']}
              ]; // add the current scope (to build chain up-down)
              this.scope.upper = oldscope;
              // ref to back to function that's the cause for this scope
              this.scope.scopeFor = match;
              match.targetScope = oldscope; // consistency
              match.isFuncExprKeyword = true;
              match.functionStack = stack;
            } //#endif
            var funcExprToken = match;

            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            if (mayParseLabeledStatementInstead && match.value == ':') match = this.failsafe('LabelsMayNotBeReserved', match);
            if (match.name == 2/*IDENTIFIER*/) {
              funcExprToken.funcName = match;
              match.meta = "func expr name";
              match.varType = ['Function'];
              match.functionStack = stack; // ref to the stack, in case we detect the var being a constructor
              if (this.ast) { //#ifdef FULL_AST
                // name is only available to inner scope
                this.scope.push({value:match.value});
              } //#endif
              if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) match = this.failsafe('FunctionNameMustNotBeReserved', match);
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            } else {
              if ((this.tokenizer.btree[match.tokposb-2].value == '=' || this.tokenizer.btree[match.tokposb-2].value == ':')) {
                if (this.tokenizer.btree[match.tokposb-3].name == 2/*IDENTIFIER*/) {
                  funcExprToken.funcName = this.tokenizer.btree[match.tokposb-3];
                }
              }
            }
            match = this.eatFunctionParametersAndBody(match, stack, true, funcExprToken); // first token after func-expr is div

            while (match.value == '++' || match.value == '--') {
              this.failignore('InvalidPostfixOperandFunction', match, stack);
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            }

            if (this.ast) { //#ifdef FULL_AST
              // restore stack and scope
              stack = oldstack;
              this.scope = oldscope;
            } //#endif
            // this is the core (sub-)expression part:
          } else if (match.name <= 6 || match.name == 15/*TAG*/) { // IDENTIFIER STRING_SINGLE STRING_DOUBLE NUMERIC_HEX NUMERIC_DEC REG_EX or (custom extension) TAG
            // save it in case it turns out to be a label.
            var possibleLabel = match;

            // validate the identifier, if any
            if (match.name == 2/*IDENTIFIER*/) {
              if (
              // this, null, true, false are actually allowed here
                !this.regexLiteralKeywords.test(match.value) &&
                  // other reserved words are not
                  this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)
                ) {
                // if break/continue, we skipped the unary operator check so throw the proper error here
                if (isBreakOrContinueArg) {
                  this.failignore('BreakOrContinueArgMustBeJustIdentifier', match, stack);
                } else if (match.value == 'else') {
                  this.failignore('DidNotExpectElseHere', match, stack);
                } else {
                  //if (mayParseLabeledStatementInstead) {new ZeParser.Error('LabelsMayNotBeReserved', match);
                  // TOFIX: lookahead to see if colon is following. throw label error instead if that's the case
                  // any forbidden keyword at this point is likely to be a statement start.
                  // its likely that the parser will take a while to recover from this point...
                  this.failignore('UnexpectedToken', match, stack);
                  // TOFIX: maybe i should just return at this point. cut my losses and hope for the best.
                }
              }

              // only accept assignments after a member expression (identifier or ending with a [] suffix)
              acceptAssignment = true;
            } else if (isBreakOrContinueArg) {
              match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);
            }

            // the current match is the lead value being queried. tag it that way
            if (this.ast) { //#ifdef FULL_AST
              // dont mark labels
              if (!isBreakOrContinueArg) {
                match.meta = 'lead value';
                match.leadValue = true;
              }
            } //#endif


            // ok. gobble it.
            match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // division allowed

            // now check for labeled statement (if mayParseLabeledStatementInstead then the first token for this expression must be an (unreserved) identifier)
            if (mayParseLabeledStatementInstead && match.value == ':') {
              if (possibleLabel.name != 2/*IDENTIFIER*/) {
                // label was not an identifier
                // TOFIX: this colon might be a different type of error... more analysis required
                this.failignore('LabelsMayOnlyBeIdentifiers', match, stack);
              }

              mayParseLabeledStatementInstead = true; // mark label parsed (TOFIX:speed?)
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

              possibleLabel.isLabel = true;
              if (this.ast) { //#ifdef FULL_AST
                delete possibleLabel.meta; // oh oops, it's not a lead value.

                possibleLabel.isLabelDeclaration = true;
                possibleLabel.subExpressionLogicStart = false;
                this.statementLabels.push(possibleLabel.value);

                stack.desc = 'labeled statement';
              } //#endif

              var errorIdToReplace = this.errorStack.length;
              // eat another statement now, its the body of the labeled statement (like if and while)
              match = this.eatStatement(false, match, stack);

              // if no statement was found, check here now and correct error
              if (match.error && match.error.msg == ZeParser.Errors.UnableToParseStatement.msg) {
                // replace with better error...
                match.error = new ZeParser.Error('LabelRequiresStatement');
                // also replace on stack
                this.errorStack[errorIdToReplace] = match.error;
              }

              match.wasLabel = true;
              return match;
            }

            mayParseLabeledStatementInstead = false;
          } else if (match.value == '}') {
            // ignore... its certainly the end of this expression, but maybe asi can be applied...
            // it might also be an object literal expecting more, but that case has been covered else where.
            // if it turns out the } is bad after all, .parse() will try to recover
          } else if (match.name == 14/*error*/) {
            do {
              if (match.tokenError) {
                var pe = new ZeParser.Error('TokenizerError', match);
                pe.msg += ': '+match.error.msg;
                this.errorStack.push(pe);

                this.failSpecial({start:match.start,stop:match.start,name:14/*error*/,error:pe}, match, stack)
              }
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
            } while (match.name == 14/*error*/);
          } else if (match.name == 12/*eof*/) {
            // cant parse any further. you're probably just typing...
            return match;
          } else {
            //if (!this.errorStack.length && match.name != 12/*eof*/) console.log(["unknown token", match, stack, Gui.escape(this.input)]);
            this.failignore('UnknownToken', match, stack);
            // we cant really ignore this. eat the token and try again. possibly you're just typing?
            match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
          }

          // search for "value" suffix. property access and call parens. (and query methods: {)
          while (match.value == '.' || match.value == '[' || match.value == '(' || (this.queryMethodExtension && match.value == '{')) {
            if (isBreakOrContinueArg) match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);

            if (match.value == '.') {
              // property access. read in an IdentifierName (no keyword checks). allow assignments
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
              if (match.name != 2/*IDENTIFIER*/) this.failignore('PropertyNamesMayOnlyBeIdentifiers', match, stack);
              if (this.ast) { //#ifdef FULL_AST
                match.isPropertyName = true;
              } //#endif
              match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // may parse div
              acceptAssignment = true;
            } else if (match.value == '[') {
              if (this.ast) { //#ifdef FULL_AST
                var lhsb = match;
                match.propertyAccessStart = true;
              } //#endif
              // property access, read expression list. allow assignments
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
              if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) {
                if (match.value == ']') match = this.failsafe('SquareBracketsMayNotBeEmpty', match);
                else match = this.failsafe('SquareBracketExpectsExpression', match);
              }
              match = this.eatExpressions(false, match, stack);
              if (match.value != ']') match = this.failsafe('UnclosedSquareBrackets', match);
              if (this.ast) { //#ifdef FULL_AST
                match.twin = lhsb;
                match.propertyAccessStop = true;
                lhsb.twin = match;

                if (stack[stack.length-1].desc == 'expressions') {
                  // create ref to this expression group to the opening bracket
                  lhsb.expressionArg = stack[stack.length-1];
                }
              } //#endif
              match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // might be div
              acceptAssignment = true;
            } else if (match.value == '(') {
              if (this.ast) { //#ifdef FULL_AST
                var lhp = match;
                match.isCallExpressionStart = true;
                if (news) {
                  match.parensBelongToNew = true;
                  --news;
                }
              } //#endif
              // call expression, eat optional expression list, disallow assignments
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
              if (/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value)) match = this.eatExpressions(false, match, stack); // arguments are optional
              if (match.value != ')') match = this.failsafe('UnclosedCallParens', match);
              if (this.ast) { //#ifdef FULL_AST
                match.twin = lhp;
                lhp.twin = match;
                match.isCallExpressionStop = true;

                if (stack[stack.length-1].desc == 'expressions') {
                  // create ref to this expression group to the opening bracket
                  lhp.expressionArg = stack[stack.length-1];
                }
              } //#endif
              match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // might be div
              acceptAssignment = false;
            } else if (match.value == '{') {
              if (!this.queryMethodExtension) {
                console.warn("This should never happen. The `foo{.bar}` syntax is only parsed under a flag that's set to false... wtf?");
              }

              // this transforms the given match inline. so the match stays the same, it just
              // has a new name and covers more input after this method finishes ;)
              this.tokenizer.parseCurlyMethodLiteral(match);
              match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // might be div
            } else {
              throw "Coding error, should never happen";
            }
          }

          // check for postfix operators ++ and --
          // they are stronger than the + or - binary operators
          // they can be applied to any lhs (even when it wouldnt make sense)
          // if there was a newline, it should get an ASI
          if ((match.value == '++' || match.value == '--') && !match.newline) {
            if (isBreakOrContinueArg) match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);
            match = this.tokenizer.storeCurrentAndFetchNextToken(true, match, stack); // may parse div
          }

          if (this.ast) { //#ifdef FULL_AST
            // restore "expression" stack
            stack = estack;
          } //#endif
          // now see if there is an operator following...

          do { // this do allows us to parse multiple ternary expressions in succession without screwing up.
            var ternary = false;
            if (
              (!forHeader && match.value == 'in') || // one of two named binary operators, may not be first expression in for-header (when semi's occur in the for-header)
                (match.value == 'instanceof') || // only other named binary operator
                ((match.name == 11/*PUNCTUATOR*/) && // we can only expect a punctuator now
                  (match.isAssignment = this.regexAssignments.test(match.value)) || // assignments are only okay with proper lhs
                  this.regexNonAssignmentBinaryExpressionOperators.test(match.value) // test all other binary operators
                  )
              ) {
              if (match.isAssignment) {
                ++extraParens;
                if (!acceptAssignment) this.failignore('IllegalLhsForAssignment', match, stack);
                else if (parsedNonAssignmentOperator) this.failignore('AssignmentNotAllowedAfterNonAssignmentInExpression', match, stack);
              }
              if (isBreakOrContinueArg) match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);

              if (match.value == '||' || match.value == '&&' || match.value == '?') {
                foundLogic = true;
                logicStart.subExpressionLogicStopper = this.tokenizer.btree[match.tokposb-1];
                logicStart.subExpressionLogicStopper.subExpressionLogicEnd = true;
                logicStart.subExpressionLogicStopper.subExpressionLogicStarter = logicStart;
              }

              if (!match.isAssignment) parsedNonAssignmentOperator = true; // last allowed assignment
              if (this.ast) { //#ifdef FULL_AST
                match.isBinaryOperator = true;
                // we build a stack to ensure any whitespace doesnt break the 1+(n*2) children rule for expressions
                var ostack = stack;
                stack = [];
                stack.desc = 'operator-expression';
                stack.isBinaryOperator = true;
                stack.sub = match.value;
                stack.nextBlack = match.tokposb;
                ostack.sub = match.value;
                stack.isAssignment = match.isAssignment;
                ostack.push(stack);
              } //#endif
              ternary = match.value == '?';
              // math, logic, assignment or in or instanceof
              match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

              if (this.ast) { //#ifdef FULL_AST
                // restore "expression" stack
                stack = ostack;
              } //#endif

              // minor exception to ternary operator, we need to parse two expressions nao. leave the trailing expression to the loop.
              if (ternary) {

                // LogicalORExpression "?" AssignmentExpression ":" AssignmentExpression
                // so that means just one expression center and right.
                if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) this.failignore('InvalidCenterTernaryExpression', match, stack);
                match = this.eatExpressions(false, match, stack, true, forHeader); // only one expression allowed inside ternary center/right

                if (match.value != ':') {
                  if (match.value == ',') match = this.failsafe('TernarySecondExpressionCanNotContainComma', match);
                  else match = this.failsafe('UnfinishedTernaryOperator', match);
                }
                if (this.ast) { //#ifdef FULL_AST
                  // we build a stack to ensure any whitespace doesnt break the 1+(n*2) children rule for expressions
                  var ostack = stack;
                  stack = [];
                  stack.desc = 'operator-expression';
                  stack.sub = match.value;
                  stack.nextBlack = match.tokposb;
                  ostack.sub = match.value;
                  stack.isAssignment = match.isAssignment;
                  ostack.push(stack);
                } //#endif
                match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
                if (this.ast) { //#ifdef FULL_AST
                  stack = ostack;
                } //#endif
                // rhs of the ternary can not contain a comma either
                match = this.eatExpressions(false, match, stack, true, forHeader); // only one expression allowed inside ternary center/right

              }
            } else {
              parseAnotherExpression = false;
            }
          } while (ternary); // if we just parsed a ternary expression, we need to check _again_ whether the next token is a binary operator.

          // start over. match is the rhs for the lhs we just parsed, but lhs for the next expression
          if (parseAnotherExpression && !(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) {
            // no idea what to do now. lets just ignore and see where it ends. TOFIX: maybe just break the loop or return?
            this.failignore('InvalidRhsExpression', match, stack);
          }
        }

        if (!foundLogic) {
          foundLogic = true;
          // if no tokpos, then take last of btree, otherwise take second-last item
          logicStart.subExpressionLogicStopper = this.tokenizer.btree[this.tokenizer.btree.length-(match.tokposb?2:1)];
          logicStart.subExpressionLogicStopper.subExpressionLogicEnd = true;
          logicStart.subExpressionLogicStopper.subExpressionLogicStarter = logicStart;
        }

        if (this.ast) { //#ifdef FULL_AST
          // restore "expressions" stack
          stack = astack;

          if (!substart.statementStart) {
            if (match.name == 12) {
              var substop = this.tokenizer.btree[this.tokenizer.btree.length-1];
            } else {
              var substop = this.tokenizer.btree[match.tokposb-1];
            }

            substart.subExpressionStart = true;
            substart.subExpressionEndsAt = substop.tokposb;

            substop.subExpressionEnd = true;
            substop.subExpressionStartsAt = substart.tokposb;
          }
        } //#endif

        // hack. how many extra closing parens do we need to work around assignments?
        if (extraParens) {
          var prevBlack = this.tokenizer.btree[this.tokenizer.btree.length-(match.tokposb?2:1)]
          prevBlack.extraClosingParensForAssignment = (prevBlack.extraClosingParensForAssignment|0)+extraParens;
          extraParens = 0;
        }

        // at this point we should have parsed one AssignmentExpression
        // lets see if we can parse another one...
        mayParseLabeledStatementInstead = first = false;
      } while (!onlyOne && match.value == ',');

      if (this.ast) { //#ifdef FULL_AST
        // remove empty array
        if (!stack.length) pstack.length = pstack.length-1;
        pstack.numberOfExpressions = parsedExpressions;
        if (pstack[0]) pstack[0].numberOfExpressions = parsedExpressions;
        stack.expressionCount = parsedExpressions;
      } //#endif
      return match;
    },
    eatFunctionDeclaration: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        var prevscope = this.scope;
        stack.desc = 'func decl';
        stack.isFunction = true;
        stack.nextBlack = match.tokposb;
        if (!this.scope.functions) this.scope.functions = [];
        match.functionId = this.scope.functions.length;
        this.scope.functions.push(match);
        // add new scope
        match.scope = stack.scope = this.scope = [
          this.scope, // add current scope (build scope chain up-down)
          // Object.create(null,
          {value:'this', isDeclared:true, isEcma:true, functionStack:stack},
          // Object.create(null,
          {value:'arguments', isDeclared:true, isEcma:true, varType:['Object']}
        ];
        // ref to back to function that's the cause for this scope
        this.scope.scopeFor = match;
        match.targetScope = prevscope; // consistency

        match.functionStack = stack;

        match.isFuncDeclKeyword = true;
      } //#endif
      // only place that this function is used already checks whether next token is function
      var functionKeyword = match;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.name != 2/*IDENTIFIER*/) match = this.failsafe('FunctionDeclarationsMustHaveName', match);
      if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) this.failignore('FunctionNameMayNotBeReserved', match, stack);
      if (this.ast) { //#ifdef FULL_AST
        functionKeyword.funcName = match;
        prevscope.push({value:match.value});
        match.meta = 'func decl name'; // that's what it is, really
        match.varType = ['Function'];
        match.functionStack = stack;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatFunctionParametersAndBody(match, stack, false, functionKeyword); // first token after func-decl is regex
      if (this.ast) { //#ifdef FULL_AST
        // restore previous scope
        this.scope = prevscope;
      } //#endif
      return match;
    },
    eatObjectLiteralColonAndBody: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        var propValueStack = stack;
        stack = [];
        stack.desc = 'objlit pair colon';
        stack.nextBlack = match.tokposb;
        propValueStack.push(stack);
      } //#endif
      if (match.value != ':') match = this.failsafe('ObjectLiteralExpectsColonAfterName', match);
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (this.ast) { //#ifdef FULL_AST
        stack = propValueStack;
      } //#endif

      // this might actually fail due to ASI optimization.
      // if the property name does not exist and it is the last item
      // of the objlit, the expression parser will see an unexpected
      // } and ignore it, giving some leeway to apply ASI. of course,
      // that doesnt work for objlits. but we dont want to break the
      // existing mechanisms. so we check this differently... :)
      var prevMatch = match;
      match = this.eatExpressions(false, match, stack, true); // only one expression
      if (match == prevMatch) match = this.failsafe('ObjectLiteralMissingPropertyValue', match);

      return match;
    },
    eatFunctionParametersAndBody: function(match, stack, div, funcToken){
      // div: the first token _after_ a function expression may be a division...
      if (match.value != '(') match = this.failsafe('ExpectingFunctionHeaderStart', match);
      else if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        funcToken.lhp = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.name == 2/*IDENTIFIER*/) { // params
        if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) this.failignore('FunctionArgumentsCanNotBeReserved', match, stack);
        if (this.ast) { //#ifdef FULL_AST
          if (!funcToken.paramNames) funcToken.paramNames = [];
          stack.paramNames = funcToken.paramNames;
          funcToken.paramNames.push(match);
          this.scope.push({value:match.value}); // add param name to scope
          match.meta = 'parameter';
        } //#endif
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
        while (match.value == ',') {
          match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
          if (match.name != 2/*IDENTIFIER*/) {
            // example: if name is 12, the source is incomplete...
            this.failignore('FunctionParametersMustBeIdentifiers', match, stack);
          } else if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) {
            this.failignore('FunctionArgumentsCanNotBeReserved', match, stack);
          }
          if (this.ast) { //#ifdef FULL_AST
            // Object.create(null,
            this.scope.push({value:match.value}); // add param name to scope
            match.meta = 'parameter';
            if (match.name == 2/*IDENTIFIER*/) funcToken.paramNames.push(match);
          } //#endif
          match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
        }
      }
      if (this.ast) { //#ifdef FULL_AST
        if (lhp) {
          match.twin = lhp;
          lhp.twin = match;
          funcToken.rhp = match;
        }
      } //#endif
      if (match.value != ')') match = this.failsafe('ExpectedFunctionHeaderClose', match); // TOFIX: can be various things here...
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatFunctionBody(match, stack, div, funcToken);
      return match;
    },
    eatFunctionBody: function(match, stack, div, funcToken){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'func body';
        stack.nextBlack = match.tokposb;

        // create EMPTY list of functions. labels cannot cross function boundaries
        var labelBackup = this.statementLabels;
        this.statementLabels = [];
        stack.labels = this.statementLabels;
      } //#endif

      // if div, a division can occur _after_ this function expression
      //this.stats.eatFunctionBody = (+//this.stats.eatFunctionBody||0)+1;
      if (match.value != '{') match = this.failsafe('ExpectedFunctionBodyCurlyOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhc = match;
        if (funcToken) funcToken.lhc = lhc;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatSourceElements(match, stack);
      if (match.value != '}') match = this.failsafe('ExpectedFunctionBodyCurlyClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
        if (funcToken) funcToken.rhc = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(div, match, stack);

      if (this.ast) { //#ifdef FULL_AST
        // restore label set
        this.statementLabels = labelBackup;
      } //#endif

      return match;
    },
    eatVar: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'var';
        stack.nextBlack = match.tokposb;
        match.stack = stack;
        match.isVarKeyword = true;
      } //#endif
      match = this.eatVarDecl(match, stack);
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatVarDecl: function(match, stack, forHeader){
      // assumes match is indeed the identifier 'var'
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'var decl';
        stack.nextBlack = match.tokposb;

        var targetScope = this.scope;
        while (targetScope.catchScope) targetScope = targetScope[0];
      } //#endif
      var first = true;
      var varsDeclared = 0;
      do {
        ++varsDeclared;
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack); // start: var, iteration: comma
        if (this.ast) { //#ifdef FULL_AST
          var declStack = stack;
          var stack = [];
          stack.desc = 'single var decl';
          stack.varStack = declStack; // reference to the var statement stack, it might hook to jsdoc needed for these vars
          stack.nextBlack = match.tokposb;
          declStack.push(stack);

          var singleDecStack = stack;
          stack = [];
          stack.desc = 'sub-expression';
          stack.nextBlack = match.tokposb;
          singleDecStack.push(stack);
        } //#endif

        // next token should be a valid identifier
        if (match.name == 12/*eof*/) {
          if (first) match = this.failsafe('VarKeywordMissingName', match);
          // else, ignore. TOFIX: return?
          else match = this.failsafe('IllegalTrailingComma', match);
        } else if (match.name != 2/*IDENTIFIER*/) {
          match = this.failsafe('VarNamesMayOnlyBeIdentifiers', match);
        } else if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) {
          match = this.failsafe('VarNamesCanNotBeReserved', match);
        }
        // mark the match as being a variable name. we need it for lookup later :)
        if (this.ast) { //#ifdef FULL_AST
          match.meta = 'var name';
          targetScope.push({value:match.value});
        } //#endif
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

        if (this.ast) { //#ifdef FULL_AST
          stack = singleDecStack;
        } //#endif

        // next token should either be a = , or ;
        // if = parse an expression and optionally a comma
        if (match.value == '=') {
          if (this.ast) { //#ifdef FULL_AST
            singleDecStack = stack;
            stack = [];
            stack.desc = 'operator-expression';
            stack.sub = '=';
            stack.nextBlack = match.tokposb;
            singleDecStack.push(stack);

            stack.isAssignment = true;
          } //#endif
          match.isInitialiser = true;
          match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
          if (this.ast) { //#ifdef FULL_AST
            stack = singleDecStack;
          } //#endif

          if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || match.name == 14/*error*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('VarInitialiserExpressionExpected', match);
          match = this.eatExpressions(false, match, stack, true, forHeader); // only one expression
          // var statement: comma or semi now
          // for statement: semi, comma or 'in'
        }
        if (this.ast) { //#ifdef FULL_AST
          stack = declStack;
        } //#endif

        // determines proper error message in one case
        first = false;
        // keep parsing name(=expression) sequences as long as you see a comma here
      } while (match.value == ',');

      if (this.ast) { //#ifdef FULL_AST
        stack.varsDeclared = varsDeclared;
      } //#endif

      return match;
    },

    eatIf: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'if';
        stack.hasElse = false;
        stack.nextBlack = match.tokposb;
      } //#endif
      // (
      // expression
      // )
      // statement
      // [else statement]
      var ifKeyword = match;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('StatementHeaderIsNotOptional', match);
      match = this.eatExpressions(false, match, stack);
      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        lhp.twin = match;

        if (stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatStatement(false, match, stack);

      // match might be null here... (if the if-statement was end part of the source)
      if (match && match.value == 'else') {
        if (this.ast) { //#ifdef FULL_AST
          ifKeyword.hasElse = match;
        } //#endif
        match = this.eatElse(match, stack);
      }

      return match;
    },
    eatElse: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.hasElse = true;
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'else';
        stack.nextBlack = match.tokposb;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatStatement(false, match, stack);

      return match;
    },
    eatDo: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'do';
        stack.isIteration = true;
        stack.nextBlack = match.tokposb;
        this.statementLabels.push(''); // add "empty"
        var doToken = match;
      } //#endif
      // statement
      // while
      // (
      // expression
      // )
      // semi-colon
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatStatement(false, match, stack);
      if (match.value != 'while') match = this.failsafe('DoShouldBeFollowedByWhile', match);
      if (this.ast) { //#ifdef FULL_AST
        match.hasDo = doToken;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('StatementHeaderIsNotOptional', match);
      match = this.eatExpressions(false, match, stack);
      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        match.isForDoWhile = true; // prevents missing block warnings
        lhp.twin = match;

        if (stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatSemiColon(match, stack); // TOFIX: this is not optional according to the spec, but browsers apply ASI anyways

      return match;
    },
    eatWhile: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'while';
        stack.isIteration = true;
        stack.nextBlack = match.tokposb;
        this.statementLabels.push(''); // add "empty"
      } //#endif

      // (
      // expression
      // )
      // statement
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('StatementHeaderIsNotOptional', match);
      match = this.eatExpressions(false, match, stack);
      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        lhp.twin = match;

        if (stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatStatement(false, match, stack);

      return match;
    },

    eatFor: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'for';
        stack.isIteration = true;
        stack.nextBlack = match.tokposb;
        this.statementLabels.push(''); // add "empty"
      } //#endif
      // either a for(..in..) or for(..;..;..)
      // start eating an expression but refuse to parse
      // 'in' on the top-level of that expression. they are fine
      // in sub-levels (group, array, etc). Now the expression
      // must be followed by either ';' or 'in'. Else throw.
      // Branch on that case, ; requires two.
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
        match.forHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      // for (either case) may start with var, in which case you'll parse a var declaration before encountering the 'in' or first semi.
      if (match.value == 'var') {
        var tokpos = match.tokposb;
        match = this.eatVarDecl(match, stack, true);
        var forInVar = this.tokenizer.btree[tokpos+1];
      } else if (match.value != ';') { // expressions are optional in for-each
        if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) {
          this.failignore('StatementHeaderIsNotOptional', match, stack);
        }
        var forInVar = match;
        match = this.eatExpressions(false, match, stack, false, true); // can parse multiple expressions, in is not ok here
      }

      // now we parsed an expression if it existed. the next token should be either ';' or 'in'. branch accordingly
      if (match.value == 'in') {

        // so this is a hack that wont catch all weird syntactical legal for-in cases
        // but it will do `for (var key in  y)` `for (key in y)` `for (var key=x in y)`
        // but not `for (( ...) in y)`, but why the FUCK would you use that? :)
        if (forInVar) {
          forInVar.subExpressionStart = false;
          forInVar.subExpressionEnd = false;
          forInVar.subExpressionLogicStart = false;
          forInVar.subExpressionLogicEnd = false;
          forInVar.subExpressionLogicStarter = false;
          forInVar.subExpressionLogicEnder = false;
          forInVar.subExpressionStartsAt = false;
        }

        var declStack = stack[stack.length-1];
        if (declStack.varsDeclared > 1) {
          // disallowed. for-in var decls can only have one var name declared
          this.failignore('ForInCanOnlyDeclareOnVar', match, stack);
        }

        if (this.ast) { //#ifdef FULL_AST
          stack.forType = 'in';
          match.forFor = true; // make easy distinction between conditional and iterational operator
        } //#endif

        // just parse another expression, where 'in' is allowed.
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
        match = this.eatExpressions(false, match, stack);
      } else {
        if (match.value != ';') match = this.failsafe('ForHeaderShouldHaveSemisOrIn', match);

        if (this.ast) { //#ifdef FULL_AST
          stack.forType = 'each';
          match.forEachHeaderStart = true;
        } //#endif
        // parse another optional no-in expression, another semi and then one more optional no-in expression
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
        if (/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value)) match = this.eatExpressions(false, match, stack); // in is ok here
        if (match.value != ';') match = this.failsafe('ExpectedSecondSemiOfForHeader', match);
        if (this.ast) { //#ifdef FULL_AST
          match.forEachHeaderStop = true;
        } //#endif
        match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
        if (/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value)) match = this.eatExpressions(false, match, stack); // in is ok here
      }

      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        match.forHeaderStop = true;
        lhp.twin = match;

        if (match.forType == 'in' && stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      match = this.eatStatement(false, match, stack);

      return match;
    },
    eatContinue: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'continue';
        stack.nextBlack = match.tokposb;

        match.restricted = true;
      } //#endif
      // (no-line-break identifier)
      // ;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack); // may not have line terminator...
      if (!match.newline && match.value != ';' && match.name != 12/*EOF*/ && match.value != '}') {
        if (this.ast) { //#ifdef FULL_AST
          match.isLabel = true;
          match.isLabelTarget = true;

          var continueArg = match; // remember to see if this continue parsed a label
        } //#endif
        // may only parse exactly an identifier at this point
        match = this.eatExpressions(false, match, stack, true, false, true); // first true=onlyOne, second: continue/break arg
        if (this.ast) { //#ifdef FULL_AST
          stack.hasLabel = continueArg != match;
        } //#endif
        if (match.value != ';' && !match.newline && match.name != 12/*eof*/ && match.value != '}') match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);
      }
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatBreak: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        var parentstack = stack
        stack = [];
        stack.desc = 'statement';
        stack.sub = 'break';
        stack.nextBlack = match.tokposb;

        parentstack.push(stack);

        match.restricted = true;
      } //#endif
      // (no-line-break identifier)
      // ;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack); // may not have line terminator...
      if (!match.newline && match.value != ';' && match.name != 12/*EOF*/ && match.value != '}') {
        if (this.ast) { //#ifdef FULL_AST
          match.isLabel = true;
          match.isLabelTarget = true;
          var breakArg = match; // remember to see if this break parsed a label
        } //#endif
        // may only parse exactly an identifier at this point
        match = this.eatExpressions(false, match, stack, true, false, true); // first true=onlyOne, second: continue/break arg
        if (this.ast) { //#ifdef FULL_AST
          stack.hasLabel = breakArg != match;
        } //#endif

        if (match.value != ';' && !match.newline && match.name != 12/*eof*/ && match.value != '}') match = this.failsafe('BreakOrContinueArgMustBeJustIdentifier', match);
      }
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatReturn: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'return';
        stack.nextBlack = match.tokposb;
        stack.returnFor = this.scope.scopeFor;

        match.restricted = true;
      } //#endif
      // (no-line-break expression)
      // ;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack); // may not have line terminator...
      if (!match.newline && match.value != ';' && match.name != 12/*EOF*/ && match.value != '}') {
        match = this.eatExpressions(false, match, stack);
      }
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatThrow: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'throw';
        stack.nextBlack = match.tokposb;

        match.restricted = true;
      } //#endif
      // (no-line-break expression)
      // ;
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack); // may not have line terminator...
      if (match.newline) match = this.failsafe('ThrowCannotHaveReturn', match);
      if (match.value == ';') match = this.failsafe('ThrowMustHaveArgument', match);
      match = this.eatExpressions(false, match, stack);
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatSwitch: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'switch';
        stack.nextBlack = match.tokposb;

        this.statementLabels.push(''); // add "empty"
      } //#endif
      // meh.
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) {
        this.failignore('StatementHeaderIsNotOptional', match, stack);
      }
      match = this.eatExpressions(false, match, stack);
      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        lhp.twin = match;

        if (stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '{') match = this.failsafe('SwitchBodyStartsWithCurly', match);

      if (this.ast) { //#ifdef FULL_AST
        var lhc = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      // you may parse a default case, and only once per switch. but you may do so anywhere.
      var parsedAnything = false;

      while (match.value == 'case' || (!stack.parsedSwitchDefault && match.value == 'default')) {
        parsedAnything = true;
        if (match.value == 'default') stack.parsedSwitchDefault = true;

        match = this.eatSwitchClause(match, stack);
      }

      // if you didnt parse anything but not encountering a closing curly now, you might be thinking that switches may start with silly stuff
      if (!parsedAnything && match.value != '}') {
        match = this.failsafe('SwitchBodyMustStartWithClause', match);
      }

      if (stack.parsedSwitchDefault && match.value == 'default') {
        this.failignore('SwitchCannotHaveDoubleDefault', match, stack);
      }

      if (match.value != '}' && match.name != 14/*error*/) match = this.failsafe('SwitchBodyEndsWithCurly', match);

      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },
    eatSwitchClause: function(match, stack){
      match = this.eatSwitchHeader(match, stack);
      match = this.eatSwitchBody(match, stack);

      return match;
    },
    eatSwitchHeader: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        // collect whitespace...
        var switchHeaderStack = stack
        stack.push(stack = []);
        stack.desc = 'switch clause header';
        stack.nextBlack = match.tokposb;
      } //#endif

      if (match.value == 'case') {
        match = this.eatSwitchCaseHead(match, stack);
      } else { // default
        if (this.ast) { //#ifdef FULL_AST
          switchHeaderStack.hasDefaultClause = true;
        } //#endif
        match = this.eatSwitchDefaultHead(match, stack);
      }

      if (this.ast) { //#ifdef FULL_AST
        // just to group whitespace (makes certain navigation easier..)
        stack.push(stack = []);
        stack.desc = 'colon';
        stack.nextBlack = match.tokposb;
      } //#endif

      if (match.value != ':') {
        match = this.failsafe('SwitchClausesEndWithColon', match);
      }
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },
    eatSwitchBody: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'switch clause body';
        stack.nextBlack = match.tokposb;
      } //#endif

      // parse body of case or default, just so long case and default keywords are not seen and end of switch is not reached
      // (clause bodies may be empty, for instance to fall through)
      var lastMatch = null;
      while (match.value != 'default' && match.value != 'case' && match.value != '}' && match.name != 14/*error*/ && match.name != 12/*eof*/ && lastMatch != match) {
        lastMatch = match; // prevents endless loops on error ;)
        match = this.eatStatement(true, match, stack);
      }
      if (lastMatch == match) this.failsafe('UnexpectedInputSwitch', match);

      return match;
    },
    eatSwitchCaseHead: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.sub = 'case';
        var caseHeadStack = stack;

        stack.push(stack = []);
        stack.desc = 'case';
        stack.nextBlack = match.tokposb;

        match.isCase = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      if (match.value == ':') {
        this.failignore('CaseMissingExpression', match, stack);
      } else {
        if (this.ast) { //#ifdef FULL_AST
          caseHeadStack.push(stack = []);
          stack.desc = 'case arg';
          stack.nextBlack = match.tokposb;
        } //#endif
        match = this.eatExpressions(false, match, stack);
      }

      return match;
    },
    eatSwitchDefaultHead: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.sub = 'default';

        stack.push(stack = []);
        stack.desc = 'case';
        stack.nextBlack = match.tokposb;

        match.isDefault = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },
    eatTryCatchFinally: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'try';
        stack.nextBlack = match.tokposb;
      } //#endif

      match = this.eatTry(match, stack);

      if (match.value == 'catch') {
        if (this.ast) { //#ifdef FULL_AST
          stack.hasCatch = true;
        } //#endif
        match = this.eatCatch(match, stack);
      }
      if (match.value == 'finally') {
        if (this.ast) { //#ifdef FULL_AST
          stack.hasFinally = true;
        } //#endif
        match = this.eatFinally(match, stack);
      }

      // at least a catch or finally block must follow. may be both.
      if (!stack.tryHasCatchOrFinally) {
        this.failignore('TryMustHaveCatchOrFinally', match, stack);
      }

      return match;
    },
    eatTry: function(match, stack){
      // block
      // (catch ( identifier ) block )
      // (finally block)
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '{') match = this.failsafe('MissingTryBlockCurlyOpen', match);

      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'tryblock';
        stack.nextBlack = match.tokposb;
        var lhc = match;
      } //#endif

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '}') match = this.eatStatements(match, stack);
      if (match.value != '}') match = this.failsafe('MissingTryBlockCurlyClose', match);

      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
      } //#endif

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },
    eatCatch: function(match, stack){
      stack.tryHasCatchOrFinally = true;
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'catch';
        stack.nextBlack = match.tokposb;

        // the catch block has a header which can contain at most one parameter
        // this parameter is bound to a local stack. formally, if that parameter
        // shadows another variable, changes made to the variable inside the catch
        // should not be reflected by the variable being shadowed. however, this
        // is not very safe to rely on so there ought to be a warning. note that
        // only this parameter gets bound to this inner scope, other parameters.

        var catchScopeBackup = this.scope;
        match.scope = this.scope = stack.scope = [this.scope];
        this.scope.catchScope = true; // mark this as being a catchScope

        // find first function scope or global scope object...
        var nonCatchScope = catchScopeBackup;
        while (nonCatchScope.catchScope) nonCatchScope = nonCatchScope[0];

        // get catch id, which is governed by the function/global scope only
        if (!nonCatchScope.catches) nonCatchScope.catches = [];
        match.catchId = nonCatchScope.catches.length;
        nonCatchScope.catches.push(match);
        match.targetScope = nonCatchScope;
        match.catchScope = this.scope;

        // ref to back to function that's the cause for this scope
        this.scope.scopeFor = match;
        // catch clauses dont have a special `this` or `arguments`, map them to their parent scope
        if (catchScopeBackup.global) this.scope.push(catchScopeBackup[0]); // global (has no `arguments` but always a `this`)
        else if (catchScopeBackup.catchScope) {
          // tricky. there will at least be a this
          this.scope.push(catchScopeBackup[1]);
          // but there might not be an arguments
          if (catchScopeBackup[2] && catchScopeBackup[2].value == 'arguments') this.scope.push(catchScopeBackup[2]);
        } else this.scope.push(catchScopeBackup[1], catchScopeBackup[2]); // function scope, copy this and arguments
      } //#endif

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('CatchHeaderMissingOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.name != 2/*IDENTIFIER*/) match = this.failsafe('MissingCatchParameter', match);
      if (this.hashStartKeyOrReserved[match.value[0]] /*this.regexStartKeyOrReserved.test(match.value[0])*/ && this.regexIsKeywordOrReserved.test(match.value)) {
        this.failignore('CatchParameterNameMayNotBeReserved', match, stack);
      }

      if (this.ast) { //#ifdef FULL_AST
        match.meta = 'var name';
        // this is the catch variable. bind it to a scope but keep the scope as
        // it currently is.
        this.scope.push(match);
        match.isCatchVar = true;
      } //#endif

      // now the catch body will use the outer scope to bind new variables. the problem is that
      // inner scopes, if any, should have access to the scope variable, so their scope should
      // be linked to the catch scope. this is a problem in the current architecture but the
      // idea is to pass on the catchScope as the scope to the eatStatements call, etc.

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != ')') match = this.failsafe('CatchHeaderMissingClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        lhp.twin = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '{') match = this.failsafe('MissingCatchBlockCurlyOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhc = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      // catch body. statements are optional.
      if (match.value != '}') match = this.eatStatements(match, stack);

      if (match.value != '}') match = this.failsafe('MissingCatchBlockCurlyClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      if (this.ast) { //#ifdef FULL_AST
        this.scope = catchScopeBackup;
      } //#endif

      return match;
    },
    eatFinally: function(match, stack){
      stack.tryHasCatchOrFinally = true;
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'finally';
        stack.nextBlack = match.tokposb;
      } //#endif

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '{') match = this.failsafe('MissingFinallyBlockCurlyOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhc = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '}') match = this.eatStatements(match, stack);
      if (match.value != '}') match = this.failsafe('MissingFinallyBlockCurlyClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },
    eatDebugger: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'debugger';
        stack.nextBlack = match.tokposb;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatSemiColon(match, stack);

      return match;
    },
    eatWith: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.push(stack = []);
        stack.desc = 'statement';
        stack.sub = 'with';
        stack.nextBlack = match.tokposb;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (match.value != '(') match = this.failsafe('ExpectedStatementHeaderOpen', match);
      if (this.ast) { //#ifdef FULL_AST
        var lhp = match;
        match.statementHeaderStart = true;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      if (!(/*is left hand side start?*/ match.name <= 6 || match.name == 15/*TAG*/ || this.regexLhsStart.test(match.value))) match = this.failsafe('StatementHeaderIsNotOptional', match);
      match = this.eatExpressions(false, match, stack);
      if (match.value != ')') match = this.failsafe('ExpectedStatementHeaderClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhp;
        match.statementHeaderStop = true;
        lhp.twin = match;

        if (stack[stack.length-1].desc == 'expressions') {
          // create ref to this expression group to the opening bracket
          lhp.expressionArg = stack[stack.length-1];
        }
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);
      match = this.eatStatement(false, match, stack);

      return match;
    },
    eatFunction: function(match, stack){
      var pe = new ZeParser.Error
      this.errorStack.push(pe);
      // ignore. browsers will accept it anyways
      var error = {start:match.stop,stop:match.stop,name:14/*error*/,error:pe};
      this.specialError(error, match, stack);
      // now try parsing a function declaration...
      match = this.eatFunctionDeclaration(match, stack);

      return match;
    },
    eatLabelOrExpression: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        var parentstack = stack;

        stack = [];
        stack.desc = 'statement';
        stack.sub = 'expression';
        stack.nextBlack = match.tokposb;
        parentstack.push(stack);
      } //#endif
      // must be an expression or a labeled statement.
      // in order to prevent very weird return constructs, we'll first check the first match
      // if that's an identifier, we'll gobble it here and move on to the second.
      // if that's a colon, we'll gobble it as a labeled statement. otherwise, we'll pass on
      // control to eatExpression, with the note that we've already gobbled a

      match = this.eatExpressions(true, match, stack);
      // if we parsed a label, the returned match (colon) will have this property
      if (match.wasLabel) {
        if (this.ast) { //#ifdef FULL_AST
          stack.sub = 'labeled';
        } //#endif
        // it will have already eaten another statement for the label
      } else {
        if (this.ast) { //#ifdef FULL_AST
          stack.sub = 'expression';
        } //#endif
        // only parse semi if we didnt parse a label just now...
        match = this.eatSemiColon(match, stack);
      }

      return match;
    },
    eatBlock: function(match, stack){
      if (this.ast) { //#ifdef FULL_AST
        stack.sub = 'block';
        var lhc = match;
      } //#endif

      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      if (match.value == '}') {
        if (this.ast) { //#ifdef FULL_AST
          stack.isEmptyBlock = true;
        } //#endif
      } else {
        match = this.eatStatements(match, stack);
      }
      if (match.value != '}') match = this.failsafe('BlockCurlyClose', match);
      if (this.ast) { //#ifdef FULL_AST
        match.twin = lhc;
        lhc.twin = match;
      } //#endif
      match = this.tokenizer.storeCurrentAndFetchNextToken(false, match, stack);

      return match;
    },

    eatStatements: function(match, stack){
      //this.stats.eatStatements = (+//this.stats.eatStatements||0)+1;
      // detecting the start of a statement "quickly" is virtually impossible.
      // instead we keep eating statements until the match stops changing
      // the first argument indicates that the statement is optional. if that
      // statement was not found, the input match will also be the output.

      while (match != (match = this.eatStatement(true, match, stack)));
      return match;
    },
    eatStatement: function(isOptional, match, stack){
      if (!match && isOptional) return match; // eof

      if (this.ast) { //#ifdef FULL_AST
        match.statementStart = true;
        var startOfStatement = match;
        var pstack = stack;
        stack = [];
        stack.desc = 'statement-parent';
        stack.nextBlack = match.tokposb;
        pstack.push(stack);

        // list of labels, these are bound to statements (and can access any label higher up, but not cross functions)
        var labelBackup = this.statementLabels;
        this.statementLabels = [labelBackup]; // make ref like tree. we need this to catch labels parsed beyond the current position (not yet known to use)
        stack.labels = this.statementLabels;
      } //#endif

      if (match.name == 2/*IDENTIFIER*/) {
        // try to determine whether it's a statement
        // (block/empty statements come later, this branch is only for identifiers)
        switch (match.value) {
          case 'var':
            match = this.eatVar(match, stack);
            break;
          case 'if':
            match = this.eatIf(match, stack);
            break;
          case 'do':
            match = this.eatDo(match, stack);
            break;
          case 'while':
            match = this.eatWhile(match, stack);
            break;
          case 'for':
            match = this.eatFor(match, stack);
            break;
          case 'continue':
            match = this.eatContinue(match, stack);
            break;
          case 'break':
            match = this.eatBreak(match, stack);
            break;
          case 'return':
            match = this.eatReturn(match, stack);
            break;
          case 'throw':
            match = this.eatThrow(match, stack);
            break;
          case 'switch':
            match = this.eatSwitch(match, stack);
            break;
          case 'try':
            match = this.eatTryCatchFinally(match, stack);
            break;
          case 'debugger':
            match = this.eatDebugger(match, stack);
            break;
          case 'with':
            match = this.eatWith(match, stack);
            break;
          case 'function':
            // I'm not sure whether this is at all possible.... (but it's bad, either way ;)
            // so add an error token, but parse the function as if it was a declaration.
            this.failignore('StatementMayNotStartWithFunction', match, stack);

            // now parse as declaration... (most likely?)
            match = this.eatFunctionDeclaration(match, stack);

            break;
          default: // either a label or an expression-statement
            match = this.eatLabelOrExpression(match, stack);
        }
      } else if (match.value == '{') { // Block (make sure you do this before checking for expression...)
        match = this.eatBlock(match, stack);
      } else if (
      // expression statements:
        match.isString ||
          match.isNumber ||
          match.name == 1/*REG_EX*/ ||
          this.regexLhsStart.test(match.value)
        ) {
        match = this.eatExpressions(false, match,stack);
        match = this.eatSemiColon(match, stack);
      } else if (match.value == ';') { // empty statement
        match.emptyStatement = true;
        match = this.eatSemiColon(match, stack);
      } else if (!isOptional) {
        if (this.ast) { //#ifdef FULL_AST
          // unmark token as being start of a statement, since it's obviously not
          match.statementStart = false;
        } //#endif
        match = this.failsafe('UnableToParseStatement', match);
      } else {
        // unmark token as being start of a statement, since it's obviously not
        if (this.ast) match.statementStart = false;
      }

      if (this.ast) { //#ifdef FULL_AST
        if (!stack.length) pstack.length = pstack.length-1;
        else {
          var pop = stack[stack.length-1];
          while (pop instanceof Array) pop = pop[pop.length-1];

          if (pop.isWhite) {
            var tree = this.tokenizer.wtree;
            var wi = pop.tokposw;
            while (pop.isWhite) pop = tree[--wi];
          }

          pop.statementEnd = true;
          startOfStatement.statementEndsAt = pop.tokposb;
        }

        // restore label set
        this.statementLabels = labelBackup;
      } //#endif

      return match;
    },

    eatSourceElements: function(match, stack){
      //this.stats.eatSourceElements = (+//this.stats.eatSourceElements||0)+1;
      // detecting the start of a statement "quickly" is virtually impossible.
      // instead we keep eating statements until the match stops changing
      // the first argument indicates that the statement is optional. if that
      // statement was not found, the input match will also be the output.
      while (match != oldMatch) { // difficult to determine whether ` && match.name != 12/*EOF*/` is actually speeding things up. it's an extra check vs one less call to eatStatement...
        var oldMatch = match;
        // always try to eat function declaration first. otherwise 'function' at the start might cause eatStatement to throw up
        if (match.value == 'function') match = this.eatFunctionDeclaration(match, stack);
        else match = this.eatStatement(true, match, stack);
      }
      return match;
    },

    failsafe: function(name, match, doNotAddMatch){
      var pe = new ZeParser.Error(name, match);
      this.errorStack.push(pe);

      if (!doNotAddMatch) {
        // the match was bad, but add it to the ast anyways. in most cases this is the case but in some its not.
        // the tokenizer will pick up on the errorEscape property and add it after the match we passed on.
        if (this.tokenizer.errorEscape) this.stack.push(this.tokenizer.errorEscape);
        this.tokenizer.errorEscape = match;
      }
      var error = {start:match.start,stop:match.start,len:0, name:14/*error*/,error:pe, value:''};
      this.tokenizer.addTokenToStreamBefore(error, match);
      return error;
    },
    failignore: function(name, match, stack){
      var pe = new ZeParser.Error(name, match);
      this.errorStack.push(pe);
      // ignore the error (this will screw up :)
      var error = {start:match.start,stop:match.start,len:0,name:14/*error*/,error:pe, value:''};
      stack.push(error);
      this.tokenizer.addTokenToStreamBefore(error, match);
    },
    failSpecial: function(error, match, stack){
      // we cant really ignore this. eat the token
      stack.push(error);
      this.tokenizer.addTokenToStreamBefore(error, match);
    },

    0:0};

  ZeParser.regexLhsStart = /[\+\-\~\!\(\{\[]/;
  /*
   ZeParser.regexStartKeyword = /[bcdefinrstvw]/;
   ZeParser.regexKeyword = /^break$|^catch$|^continue$|^debugger$|^default$|^delete$|^do$|^else$|^finally$|^for$|^function$|^if$|^in$|^instanceof$|^new$|^return$|^switch$|^this$|^throw$|^try$|^typeof$|^var$|^void$|^while$|^with$/;
   ZeParser.regexStartReserved = /[ceis]/;
   ZeParser.regexReserved = /^class$|^const$|^enum$|^export$|^extends$|^import$|^super$/;
   */
  ZeParser.regexStartKeyOrReserved = /[bcdefinrstvw]/;
  ZeParser.hashStartKeyOrReserved = Object.create ? Object.create(null, {b:{value:1},c:{value:1},d:{value:1},e:{value:1},f:{value:1},i:{value:1},n:{value:1},r:{value:1},s:{value:1},t:{value:1},v:{value:1},w:{value:1}}) : {b:1,c:1,d:1,e:1,f:1,i:1,n:1,r:1,s:1,t:1,v:1,w:1};
  ZeParser.regexIsKeywordOrReserved = /^break$|^catch$|^continue$|^debugger$|^default$|^delete$|^do$|^else$|^finally$|^for$|^function$|^if$|^in$|^instanceof$|^new$|^return$|^switch$|^case$|^this$|^true$|^false$|^null$|^throw$|^try$|^typeof$|^var$|^void$|^while$|^with$|^class$|^const$|^enum$|^export$|^extends$|^import$|^super$/;
  ZeParser.regexAssignments = /^[\+\-\*\%\&\|\^\/]?=$|^\<\<\=$|^\>{2,3}\=$/;
  ZeParser.regexNonAssignmentBinaryExpressionOperators = /^[\+\-\*\%\|\^\&\?\/]$|^[\<\>]\=?$|^[\=\!]\=\=?$|^\<\<|\>\>\>?$|^\&\&$|^\|\|$/;
  ZeParser.regexUnaryKeywords = /^delete$|^void$|^typeof$|^new$/;
  ZeParser.hashUnaryKeywordStart = Object.create ? Object.create(null, {d:{value:1},v:{value:1},t:{value:1},n:{value:1}}) : {d:1,v:1,t:1,n:1};
  ZeParser.regexUnaryOperators = /[\+\-\~\!]/;
  ZeParser.regexLiteralKeywords = /^this$|^null$|^true$|^false$/;

  ZeParser.Error = function(type, match){
    //if (type == 'BreakOrContinueArgMustBeJustIdentifier') throw here;
    this.msg = ZeParser.Errors[type].msg;
    this.before = ZeParser.Errors[type].before;
    this.match = match;
  };

  ZeParser.Errors = {
    NoASI: {msg:'Expected semi-colon, was unable to apply ASI'},
    ExpectedAnotherExpressionComma: {msg:'expecting another (left hand sided) expression after the comma'},
    ExpectedAnotherExpressionRhs: {msg:"expected a rhs expression"},
    UnclosedGroupingOperator: {msg:"Unclosed grouping operator"},
    GroupingShouldStartWithExpression: {msg:'The grouping operator (`(`) should start with a left hand sided expression'},
    ArrayShouldStartWithExpression: {msg:'The array literal (`[`) should start with a left hand sided expression'},
    UnclosedPropertyBracket: {msg:'Property bracket was not closed after expression (expecting `]`)'},
    IllegalPropertyNameToken: {msg:'Object literal property names can only be assigned as strings, numbers or identifiers'},
    IllegalGetterSetterNameToken: {msg:'Name of a getter/setter can only be assigned as strings, numbers or identifiers'},
    GetterSetterNameFollowedByOpenParen: {msg:'The name of the getter/setter should immediately be followed by the opening parenthesis `(`'},
    GetterHasNoArguments: {msg:'The opening parenthesis `(` of the getter should be immediately followed by the closing parenthesis `)`, the getter cannot have an argument'},
    IllegalSetterArgumentNameToken: {msg:'Expecting the name of the argument of a setter, can only be assigned as strings, numbers or identifiers'},
    SettersOnlyGetOneArgument: {msg:'Setters have one and only one argument, missing the closing parenthesis `)`'},
    SetterHeaderShouldHaveClosingParen: {msg:'After the first argument of a setter should come a closing parenthesis `)`'},
    SettersMustHaveArgument: {msg:'Setters must have exactly one argument defined'},
    UnclosedObjectLiteral: {msg:'Expected to find a comma `,` for the next expression or a closing curly brace `}` to end the object literal'},
    FunctionNameMustNotBeReserved: {msg:'Function name may not be a keyword or a reserved word'},
    ExpressionMayNotStartWithKeyword: {msg:'Expressions may not start with keywords or reserved words that are not in this list: [this, null, true, false, void, typeof, delete, new]'},
    LabelsMayOnlyBeIdentifiers: {msg:'Label names may only be defined as an identifier'},
    LabelsMayNotBeReserved: {msg:'Labels may not be a keyword or a reserved word'},
    UnknownToken: {msg:'Unknown token encountered, dont know how to proceed'},
    PropertyNamesMayOnlyBeIdentifiers: {msg:'The tokens of property names accessed through the dot operator may only be identifiers'},
    SquareBracketExpectsExpression: {msg:'The square bracket property access expects an expression'},
    SquareBracketsMayNotBeEmpty: {msg:'Square brackets may never be empty, expecting an expression'},
    UnclosedSquareBrackets: {msg:'Unclosed square bracket encountered, was expecting `]` after the expression'},
    UnclosedCallParens: {msg:'Unclosed call parenthesis, expecting `)` after the optional expression'},
    InvalidCenterTernaryExpression: {msg:'Center expression of ternary operator should be a regular expression (but may not contain the comma operator directly)'},
    UnfinishedTernaryOperator: {msg:'Encountered a ternary operator start (`?`) but did not find the required colon (`:`) after the center expression'},
    TernarySecondExpressionCanNotContainComma: {msg:'The second and third expressions of the ternary operator can/may not "directly" contain a comma operator'},
    InvalidRhsExpression: {msg:'Expected a right hand side expression after the operator (which should also be a valid lhs) but did not find one'},
    FunctionDeclarationsMustHaveName: {msg:'Function declaration must have name'},
    FunctionNameMayNotBeReserved: {msg:'Function name may not be a keyword or reserved word'},
    ExpectingFunctionHeaderStart: {msg:'Expected the opening parenthesis of the function header'},
    FunctionArgumentsCanNotBeReserved: {msg:'Function arguments may not be keywords or reserved words'},
    FunctionParametersMustBeIdentifiers: {msg:'Function arguments must be identifiers'},
    ExpectedFunctionHeaderClose: {msg:'Expected the closing parenthesis `)` of the function header'},
    ExpectedFunctionBodyCurlyOpen: {msg:'Expected the opening curly brace `{` for the function body'},
    ExpectedFunctionBodyCurlyClose: {msg:'Expected the closing curly brace `}` for the function body'},
    VarNamesMayOnlyBeIdentifiers: {msg:'Missing variable name, must be a proper identifier'},
    VarNamesCanNotBeReserved: {msg:'Variable names may not be keywords or reserved words'},
    VarInitialiserExpressionExpected: {msg:'The initialiser of the variable statement should be an expression without comma'},
    ExpectedStatementHeaderOpen: {msg:'Expected opening parenthesis `(` for statement header'},
    StatementHeaderIsNotOptional: {msg:'Statement header must not be empty'},
    ExpectedStatementHeaderClose: {msg:'Expected closing parenthesis `)` for statement header'},
    DoShouldBeFollowedByWhile: {msg:'The do-while statement requires the `while` keyword after the expression'},
    ExpectedSecondSemiOfForHeader: {msg:'Expected the second semi-colon of the for-each header'},
    ForHeaderShouldHaveSemisOrIn: {msg:'The for-header should contain at least the `in` operator or two semi-colons (`;`)'},
    SwitchBodyStartsWithCurly: {msg:'The body of a switch statement starts with a curly brace `{`'},
    SwitchClausesEndWithColon: {msg:'Switch clauses (`case` and `default`) end with a colon (`:`)'},
    SwitchCannotHaveDoubleDefault: {msg:'Switches cannot have more than one `default` clause'},
    SwitchBodyEndsWithCurly: {msg:'The body of a switch statement ends with a curly brace `}`'},
    MissingTryBlockCurlyOpen: {msg:'Missing the opening curly brace (`{`) for the block of the try statement'},
    MissingTryBlockCurlyClose: {msg:'Missing the closing curly brace (`}`) for the block of the try statement'},
    CatchHeaderMissingOpen: {msg:'Missing the opening parenthesis of the catch header'},
    MissingCatchParameter: {msg:'Catch clauses should have exactly one argument which will be bound to the error object being thrown'},
    CatchParameterNameMayNotBeReserved: {msg:'Catch clause parameter may not be a keyword or reserved word'},
    CatchHeaderMissingClose: {msg:'Missing the closing parenthesis of the catch header'},
    MissingCatchBlockCurlyOpen: {msg:'Missing the opening curly brace (`{`) for the block of the catch statement'},
    MissingCatchBlockCurlyClose: {msg:'Missing the closing curly brace (`}`) for the block of the catch statement'},
    MissingFinallyBlockCurlyOpen: {msg:'Missing the opening curly brace (`{`) for the block of the finally statement'},
    MissingFinallyBlockCurlyClose: {msg:'Missing the closing curly brace (`}`) for the block of the finally statement'},
    StatementMayNotStartWithFunction: {msg:'statements may not start with function...', before:true},
    BlockCurlyClose: {msg:'Expected the closing curly (`}`) for a block statement'},
    BlockCurlyOpen: {msg:'Expected the closing curly (`}`) for a block statement'},
    UnableToParseStatement: {msg:'Was unable to find a statement when it was requested'},
    IllegalDoubleCommaInObjectLiteral: {msg:'A double comma in object literals is not allowed'},
    ObjectLiteralExpectsColonAfterName: {msg:'After every property name (identifier, string or number) a colon (`:`) should follow'},
    ThrowMustHaveArgument: {msg:'The expression argument for throw is not optional'},
    ThrowCannotHaveReturn: {msg:'There may not be a return between throw and the start of its expression argument'},
    SwitchBodyMustStartWithClause: {msg:'The body of a switch clause must start with at a case or default clause (but may be empty, which would be silly)'},
    BreakOrContinueArgMustBeJustIdentifier: {msg:'The argument to a break or continue statement must be exactly and only an identifier (an existing label)'},
    AssignmentNotAllowedAfterNonAssignmentInExpression: {msg:'An assignment is not allowed if it is preceeded by a non-expression operator in the same expression-level'},
    IllegalLhsForAssignment: {msg:'Illegal left hand side for assignment (you cannot assign to things like string literals, number literals or function calls}'},
    VarKeywordMissingName: {msg:'Var keyword should be followed by a variable name'},
    IllegalTrailingComma: {msg:'Illegal trailing comma found'},
    ObjectLiteralMissingPropertyValue: {msg:'Missing object literal property value'},
    TokenizerError: {msg:'Tokenizer encountered unexpected input'},
    LabelRequiresStatement: {msg:'Saw a label without the (required) statement following'},
    DidNotExpectElseHere: {msg:'Did not expect an else here. To what if should it belong? Maybe you put a ; after the if-block? (if(x){};else{})'},
    UnexpectedToken: {msg:'Found an unexpected token and have no idea why'},
    InvalidPostfixOperandArray: {msg:'You cannot apply ++ or -- to an array'},
    InvalidPostfixOperandObject: {msg:'You cannot apply ++ or -- to an object'},
    InvalidPostfixOperandFunction: {msg:'You cannot apply ++ or -- to a function'},
    CaseMissingExpression: {msg:'Case expects an expression before the colon'},
    TryMustHaveCatchOrFinally: {msg:'The try statement must have a catch or finally block'},
    UnexpectedInputSwitch: {msg:'Unexpected input while parsing a switch clause...'},
    ForInCanOnlyDeclareOnVar: {msg:'For-in header can only introduce one new variable'},
  };

  /*!
   * Tokenizer for JavaScript / ECMAScript 5
   * (c) Peter van der Zee, qfox.nl
   */

  /**
   * @param {Object} inp
   * @param {Object} options
   * @property {boolean} [options.tagLiterals] Instructs the tokenizer to also parse tag literals
   */
  var Tokenizer = function(inp, options){
    this.inp = inp||'';
    // replace all other line terminators with \n (leave \r\n in tact though). we should probably remove the shadowInp when finished...
    // only replace \r if it is not followed by a \n else \r\n would become \n\n causing a double newline where it is just a single
    this.shadowInp = (inp||'').replace(Tokenizer.regexNormalizeNewlines, '\n');
    this.pos = 0;
    this.line = 0;
    this.column = 0;
    this.cache = {};

    this.errorStack = [];

    this.wtree = [];
    this.btree = [];

//	this.regexWhiteSpace = Tokenizer.regexWhiteSpace;
    this.regexLineTerminator = Tokenizer.regexLineTerminator; // used in fallback
    this.regexAsciiIdentifier = Tokenizer.regexAsciiIdentifier;
    this.hashAsciiIdentifier = Tokenizer.hashAsciiIdentifier;
//	this.regexHex = Tokenizer.regexHex;
    this.hashHex = Tokenizer.hashHex
    this.regexUnicodeEscape = Tokenizer.regexUnicodeEscape;
    this.regexIdentifierStop = Tokenizer.regexIdentifierStop;
    this.hashIdentifierStop = Tokenizer.hashIdentifierStop;
//	this.regexPunctuators = Tokenizer.regexPunctuators;
    this.regexNumber = Tokenizer.regexNumber;
    this.regexNewline = Tokenizer.regexNewline;

    this.regexBig = Tokenizer.regexBig;
    this.regexBigAlt = Tokenizer.regexBigAlt;

    // stuff for parsing tag literals
    this.regexTagName = Tokenizer.regexTagName;
    this.regexTagAttributes = Tokenizer.regexTagAttributes;
    this.regexTagUnarySuffix = Tokenizer.regexTagUnarySuffix;
    this.regexTagBinarySuffix = Tokenizer.regexTagBinarySuffix;
    this.regexTagBody = Tokenizer.regexTagBody;
    this.regexTagOpenOrClose = Tokenizer.regexTagOpenOrClose;
    this.regexTagClose = Tokenizer.regexTagClose;
    this.regexRemoveEscape = Tokenizer.regexRemoveEscape;

    this.tokenCount = 0;
    this.tokenCountNoWhite = 0;

    this.Unicode = window.Unicode;

    // if the Parser throws an error. it will set this property to the next match
    // at the time of the error (which was not what it was expecting at that point)
    // and pass on an "error" match. the error should be scooped on the stack and
    // this property should be returned, without looking at the input...
    this.errorEscape = null;

    // support tag literals
    this.tagLiterals = false || (options && options.tagLiterals);
  };

  Tokenizer.prototype = {
    // token constants... (should use these some day)
    REGEX: 1,
    IDENTIFIER: 2,
    NUMERIC_HEX: 3,
    NUMERIC_DEC: 4,
    STRING_SINGLE: 5,
    STRING_DOUBLE: 6,
    COMMENT_SINGLE: 7,
    COMMENT_MULTI: 8,
    WHITE_SPACE: 9,
    LINETERMINATOR: 10,
    PUNCTUATOR: 11,
    EOF: 12,
    ASI: 13,
    ERROR: 14,
    TAG: 15,
    CURLY_METHOD: 16,

    inp:null,
    shadowInp:null,
    pos:null,
    line:null,
    column:null,
    cache:null,
    errorStack:null,

    wtree: null, // contains whitespace (spaces, comments, newlines)
    btree: null, // does not contain any whitespace tokens.

    regexLineTerminator:null,
    regexAsciiIdentifier:null,
    hashAsciiIdentifier:null,
    hashHex:null,
    regexUnicodeEscape:null,
    regexIdentifierStop:null,
    hashIdentifierStop:null,
    regexNumber:null,
    regexNewline:null,
    regexBig:null,
    regexBigAlt:null,
    tokenCount:null,
    tokenCountNoWhite:null,

    Unicode:null,

    tagLiterals: false, // custom tag literal support. allows <div></div> kind of (sub-expression) tokens

    // storeCurrentAndFetchNextToken(bool, false, false true) to get just one token
    storeCurrentAndFetchNextToken: function(noRegex, returnValue, stack, _dontStore){
      var regex = !noRegex; // TOFIX :)
      var pos = this.pos;
      var inp = this.inp;
      var shadowInp = this.shadowInp;
      var matchedNewline = false;
      do {
        if (!_dontStore) {
          ++this.tokenCount;
          stack.push(returnValue);
          // did the parent Parser throw up?
          if (this.errorEscape) {
            returnValue = this.errorEscape;
            this.errorEscape = null;
            return returnValue;
          }
        }
        _dontStore = false;

        if (pos >= inp.length) {
          returnValue = {start:inp.length,stop:inp.length,name:12/*EOF*/};
          break;
        }
        var returnValue = null;

        var start = pos;
        var chr = inp[pos];

        //							1 ws							2 lt				   3 scmt 4 mcmt 5/6 str 7 nr	 8 rx  9 punc
        //if (true) {
        // substring method (I think this is faster..)
        var part2 = inp.substring(pos,pos+4);
        var part = this.regexBig.exec(part2);
        //} else {
        //	// non-substring method (lastIndex)
        //	// this method does not need a substring to apply it
        //	this.regexBigAlt.lastIndex = pos;
        //	var part = this.regexBigAlt.exec(inp);
        //}

        if (part[1]) { //this.regexWhiteSpace.test(chr)) { // SP, TAB, VT, FF, NBSP, BOM (, TOFIX: USP)
          ++pos;
          returnValue = {start:start,stop:pos,name:9/*WHITE_SPACE*/,line:this.line,col:this.column,isWhite:true};
          ++this.column;
        } else if (part[2]) { //this.regexLineTerminator.test(chr)) { // LF, CR, LS, PS
          var end = pos+1;
          if (chr=='\r' && inp[pos+1] == '\n') ++end; // support crlf=>lf
          returnValue = {start:pos,stop:end,name:10/*LINETERMINATOR*/,line:this.line,col:this.column,isWhite:true};
          pos = end;
          // mark newlines for ASI
          matchedNewline = true;
          ++this.line;
          this.column = 0;
          returnValue.hasNewline = 1;
        } else if (part[3]) { //chr == '/' && inp[pos+1] == '/') {
          pos = shadowInp.indexOf('\n',pos);
          if (pos == -1) pos = inp.length;
          returnValue = {start:start,stop:pos,name:7/*COMMENT_SINGLE*/,line:this.line,col:this.column,isComment:true,isWhite:true};
          this.column = returnValue.stop;
        } else if (part[4]) { //chr == '/' && inp[pos+1] == '*') {
          var newpos = inp.indexOf('*/',pos);
          if (newpos == -1) {
            newpos = shadowInp.indexOf('\n', pos);
            if (newpos < 0) pos += 2;
            else pos = newpos;
            returnValue = {start:start,stop:pos,name:14/*error*/,value:inp.substring(start, pos),line:this.line,col:this.column,isComment:true,isWhite:true,tokenError:true,error:Tokenizer.Error.UnterminatedMultiLineComment};
            this.errorStack.push(returnValue);
          } else {
            pos = newpos+2;
            returnValue = {start:start,stop:pos,name:8/*COMMENT_MULTI*/,value:inp.substring(start, pos),line:this.line,col:this.column,isComment:true,isWhite:true};

            // multi line comments are also reason for asi, but only if they contain at least one newline (use shadow input, because all line terminators would be valid...)
            var shadowValue = shadowInp.substring(start, pos);
            var i = 0, hasNewline = 0;
            while (i < (i = shadowValue.indexOf('\n', i+1))) {
              ++hasNewline;
            }
            if (hasNewline) {
              matchedNewline = true;
              returnValue.hasNewline = hasNewline;
              this.line += hasNewline;
              this.column = 0;
            } else {
              this.column = returnValue.stop;
            }
          }
        } else if (part[5]) { //chr == "'") {
          // old method
          //console.log("old method");

          var hasNewline = 0;
          do {
            // process escaped characters
            while (pos < inp.length && inp[++pos] == '\\') {
              if (shadowInp[pos+1] == '\n') ++hasNewline;
              ++pos;
            }
            if (this.regexLineTerminator.test(inp[pos])) {
              returnValue = {start:start,stop:pos,name:14/*error*/,value:inp.substring(start, pos),isString:true,tokenError:true,error:Tokenizer.Error.UnterminatedDoubleStringNewline};
              this.errorStack.push(returnValue);
              break;
            }
          } while (pos < inp.length && inp[pos] != "'");
          if (returnValue) {} // error
          else if (inp[pos] != "'") {
            returnValue = {start:start,stop:pos,name:14/*error*/,value:inp.substring(start, pos),isString:true,tokenError:true,error:Tokenizer.Error.UnterminatedDoubleStringOther};
            this.errorStack.push(returnValue);
          } else {
            ++pos;
            returnValue = {start:start,stop:pos,name:5/*STRING_SINGLE*/,isPrimitive:true,isString:true};
            if (hasNewline) {
              returnValue.hasNewline = hasNewline;
              this.line += hasNewline;
              this.column = 0;
            } else {
              this.column += (pos-start);
            }
          }
        } else if (part[6]) { //chr == '"') {
          var hasNewline = 0;
          // TODO: something like this: var regexmatch = /([^\']|$)+/.match();
          do {
            // process escaped chars
            while (pos < inp.length && inp[++pos] == '\\') {
              if (shadowInp[pos+1] == '\n') ++hasNewline;
              ++pos;
            }
            if (this.regexLineTerminator.test(inp[pos])) {
              returnValue = {start:start,stop:pos,name:14/*error*/,value:inp.substring(start, pos),isString:true,tokenError:true,error:Tokenizer.Error.UnterminatedSingleStringNewline};
              this.errorStack.push(returnValue);
              break;
            }
          } while (pos < inp.length && inp[pos] != '"');
          if (returnValue) {}
          else if (inp[pos] != '"') {
            returnValue = {start:start,stop:pos,name:14/*error*/,value:inp.substring(start, pos),isString:true,tokenError:true,error:Tokenizer.Error.UnterminatedSingleStringOther};
            this.errorStack.push(returnValue);
          } else {
            ++pos;
            returnValue = {start:start,stop:pos,name:6/*STRING_DOUBLE*/,isPrimitive:true,isString:true};
            if (hasNewline) {
              returnValue.hasNewline = hasNewline;
              this.line += hasNewline;
              this.column = 0;
            } else {
              this.column += (pos-start);
            }
          }
        } else if (part[7]) { //(chr >= '0' && chr <= '9') || (chr == '.' && inp[pos+1] >= '0' && inp[pos+1] <= '9')) {
          var nextPart = inp.substring(pos, pos+30);
          var match = nextPart.match(this.regexNumber);
          if (match[2]) { // decimal
            var value = match[2];
            var parsingOctal = value[0] == '0' && value[1] && value[1] != 'e' && value[1] != 'E' && value[1] != '.';
            if (parsingOctal) {
              returnValue = {start:start,stop:pos,name:14/*error*/,isNumber:true,isOctal:true,tokenError:true,error:Tokenizer.Error.IllegalOctalEscape,value:value};
              this.errorStack.push(returnValue);
            } else {
              returnValue = {start:start,stop:start+value.length,name:4/*NUMERIC_DEC*/,isPrimitive:true,isNumber:true,value:value};
            }
          } else if (match[1]) { // hex
            var value = match[1];
            returnValue = {start:start,stop:start+value.length,name:3/*NUMERIC_HEX*/,isPrimitive:true,isNumber:true,value:value};
          } else {
            throw 'unexpected parser errror... regex fail :(';
          }

          if (value.length < 300) {
            pos += value.length;
          } else {
            // old method of parsing numbers. only used for extremely long number literals (300+ chars).
            // this method does not require substringing... just memory :)
            var tmpReturnValue = this.oldNumberParser(pos, chr, inp, returnValue, start, Tokenizer);
            pos = tmpReturnValue[0];
            returnValue = tmpReturnValue[1];
          }
        } else if (regex && part[8]) { //chr == '/') { // regex cannot start with /* (would be multiline comment, and not make sense anyways). but if it was /* then an earlier if would have eated it. so we only check for /
          var twinfo = []; // matching {[( info
          var found = false;
          var parens = [];
          var nonLethalError = null;
          while (++pos < inp.length) {
            chr = shadowInp[pos];
            // parse RegularExpressionChar
            if (chr == '\n') {
              returnValue = {start:start,stop:pos,name:14/*error*/,tokenError:true,errorHasContent:true,error:Tokenizer.Error.UnterminatedRegularExpressionNewline};
              this.errorStack.push(returnValue);
              break; // fail
            } else if (chr == '/') {
              found = true;
              break;
            } else if (chr == '?' || chr == '*' || chr == '+') {
              nonLethalError = Tokenizer.Error.NothingToRepeat;
            } else if (chr == '^') {
              if (
                inp[pos-1] != '/' &&
                  inp[pos-1] != '|' &&
                  inp[pos-1] != '(' &&
                  !(inp[pos-3] == '(' && inp[pos-2] == '?' && (inp[pos-1] == ':' || inp[pos-1] == '!' || inp[pos-1] == '='))
                ) {
                nonLethalError = Tokenizer.Error.StartOfMatchShouldBeAtStart;
              }
            } else if (chr == '$') {
              if (inp[pos+1] != '/' && inp[pos+1] != '|' && inp[pos+1] != ')') nonLethalError = Tokenizer.Error.DollarShouldBeEnd;
            } else if (chr == '}') {
              nonLethalError = Tokenizer.Error.MissingOpeningCurly;
            } else { // it's a "character" (can be group or class), something to match
              // match parenthesis
              if (chr == '(') {
                parens.push(pos-start);
              } else if (chr == ')') {
                if (parens.length == 0) {
                  nonLethalError = {start:start,stop:pos,name:14/*error*/,tokenError:true,error:Tokenizer.Error.RegexNoOpenGroups};
                } else {
                  var twin = parens.pop();
                  var now = pos-start;
                  twinfo[twin] = now;
                  twinfo[now] = twin;
                }
              }
              // first process character class
              if (chr == '[') {
                var before = pos-start;
                while (++pos < inp.length && shadowInp[pos] != '\n' && inp[pos] != ']') {
                  // only newline is not allowed in class range
                  // anything else can be escaped, most of it does not have to be escaped...
                  if (inp[pos] == '\\') {
                    if (shadowInp[pos+1] == '\n') break;
                    else ++pos; // skip next char. (mainly prohibits ] to be picked up as closing the group...)
                  }
                }
                if (inp[pos] != ']') {
                  returnValue = {start:start,stop:pos,name:14/*error*/,tokenError:true,error:Tokenizer.Error.ClosingClassRangeNotFound};
                  this.errorStack.push(returnValue);
                  break;
                } else {
                  var after = pos-start;
                  twinfo[before] = after;
                  twinfo[after] = before;
                }
              } else if (chr == '\\' && shadowInp[pos+1] != '\n') {
                // is ok anywhere in the regex (match next char literally, regardless of its otherwise special meaning)
                ++pos;
              }

              // now process repeaters (+, ? and *)

              // non-collecting group (?:...) and positive (?=...) or negative (?!...) lookahead
              if (chr == '(') {
                if (inp[pos+1] == '?' && (inp[pos+2] == ':' || inp[pos+2] == '=' || inp[pos+2] == '!')) {
                  pos += 2;
                }
              }
              // matching "char"
              else if (inp[pos+1] == '?') ++pos;
              else if (inp[pos+1] == '*' || inp[pos+1] == '+') {
                ++pos;
                if (inp[pos+1] == '?') ++pos; // non-greedy match
              } else if (inp[pos+1] == '{') {
                pos += 1;
                var before = pos-start;
                // quantifier:
                // - {n}
                // - {n,}
                // - {n,m}
                if (!/[0-9]/.test(inp[pos+1])) {
                  nonLethalError = Tokenizer.Error.QuantifierRequiresNumber;
                }
                while (++pos < inp.length && /[0-9]/.test(inp[pos+1]));
                if (inp[pos+1] == ',') {
                  ++pos;
                  while (pos < inp.length && /[0-9]/.test(inp[pos+1])) ++pos;
                }
                if (inp[pos+1] != '}') {
                  nonLethalError = Tokenizer.Error.QuantifierRequiresClosingCurly;
                } else {
                  ++pos;
                  var after = pos-start;
                  twinfo[before] = after;
                  twinfo[after] = before;
                  if (inp[pos+1] == '?') ++pos; // non-greedy match
                }
              }
            }
          }
          // if found=false, fail right now. otherwise try to parse an identifiername (that's all RegularExpressionFlags is..., but it's constructed in a stupid fashion)
          if (!found || returnValue) {
            if (!returnValue) {
              returnValue = {start:start,stop:pos,name:14/*error*/,tokenError:true,error:Tokenizer.Error.UnterminatedRegularExpressionOther};
              this.errorStack.push(returnValue);
            }
          } else {
            // this is the identifier scanner, for now
            do ++pos;
            while (pos < inp.length && this.hashAsciiIdentifier[inp[pos]]); /*this.regexAsciiIdentifier.test(inp[pos])*/

            if (parens.length) {
              // nope, this is still an error, there was at least one paren that did not have a matching twin
              if (parens.length > 0) returnValue = {start:start,stop:pos,name:14/*error*/,tokenError:true,error:Tokenizer.Error.RegexOpenGroup};
              this.errorStack.push(returnValue);
            } else if (nonLethalError) {
              returnValue = {start:start,stop:pos,name:14/*error*/,errorHasContent:true,tokenError:true,error:nonLethalError};
              this.errorStack.push(returnValue);
            } else {
              returnValue = {start:start,stop:pos,name:1/*REG_EX*/,isPrimitive:true};
            }
          }
          returnValue.twinfo = twinfo;
        } else if (regex && part[9] && this.tagLiterals) {
          // allows you to use this literally (in places where an expression is allowed) in js:

          // simple tag:
          // <div></div>

          // tree, unary, content, multiline:
          // <foo> <bar>hello </bar> <baz/>
          // </foo>

          // attributes, default true attributes, single and double quotes:
          // <gah this="an" attribute single='quote'/>

          // dynamic content (content normally parsed as js in a sub-parser):
          // <div>{["hello","world"].join(' ')}</div>

          // escaping content with single backslash
          // <div>hah\&lt;\<a{"foo\u0500t\t"+"bar"}</div>

          // note: tag content is escaped (one slash removed), js content is not
          // currently not really possible to use } or > in js code unless you
          // can somehow prefix them with a backslash (strings, regex)
          // if you must have these otherwise the fallback is eval

          var processValue = function(val){
            // post process dynamic parts of this value
            // anything wrapped in (unescaped) { and } is considered to be
            // a literal js expression. so we should parse an expression here
            // and that's where the voodoo inception starts. we must now
            // invoke a new instance of ZeParser, make it read an
            // expression and ensure the next char is the closing curly.
            // only then is it deemed valid.

            // ...
            // too difficult for now. let's just go with "escape all teh curlies!"

            var arrtxtjs = []; // uneven array. uneven elements are text, even elements are js

            var last = 0;
            for (var i=0; i<val.length; ++i) {
              if (val[i] == '\\') ++i;
              else if (val[i] == '{') {
                for (var j=i; j<val.length; ++j) {
                  if (val[j] == '\\') ++j;
                  else if (val[j] == '}') {
                    var js = val.slice(i+1, j);
                    arrtxtjs.push(
                      val.slice(last, i),
                      js
                    );
                    break;
                  }
                }
                i = j;
                last = j + 1;
              }
            }
            // remainder (can be empty string)
            arrtxtjs.push(val.slice(last, i));

            if (arrtxtjs.length > 1) { // if we did find any dynamic js block...
              for (var i=1; i<arrtxtjs.length; i+=2) {
                arrtxtjs[i] = arrtxtjs[i].replace(this.regexRemoveEscape, '$1'); // remove a single backslash from the content (it was used as an escape character)
              }
              return arrtxtjs; // return array with [string,js,string,js,...]
            } else { // no dynamic js found, return a string
              val = arrtxtjs[0].replace(this.regexRemoveEscape, '$1'); // remove a single backslash from the content (it was used as an escape character)
              return val;
            }
          };

          var tagOpen = function(node){
            var regexTagName = this.regexTagName;
            regexTagName.lastIndex = pos+1;
            var tag = regexTagName.exec(inp);
            if (tag) {
              pos = regexTagName.lastIndex;
              node.name = tag[1];
              node.attributes = {};

              // now fetch all attribute=value pairs
              var regexTagAttributes = this.regexTagAttributes;
              var attr = '';
              var lastIndex = pos = regexTagAttributes.lastIndex = regexTagName.lastIndex;
              attr = regexTagAttributes.exec(inp);
              while (attr && attr.index == pos) {
                if (typeof attr[2] == 'undefined') {
                  // attribute without value assignment (implicit "true")
                  node.attributes[attr[1]] = attr[3];
                } else {
                  node.attributes[attr[1]] = processValue.call(this, attr[2]);
                }
                pos = lastIndex = regexTagAttributes.lastIndex;
                attr = regexTagAttributes.exec(inp);
              }

              // it was a unary tag
              var regexTagUnarySuffix = this.regexTagUnarySuffix;
              regexTagUnarySuffix.lastIndex = lastIndex;
              var x = regexTagUnarySuffix.exec(inp);
              node.unary = !!x && x.index == pos;
              if (node.unary) {
                pos = regexTagUnarySuffix.lastIndex;
                return true;
              }
              // it was a binary tag
              var regexTagBinarySuffix = this.regexTagBinarySuffix;
              regexTagBinarySuffix.lastIndex = lastIndex;
              var x = regexTagBinarySuffix.exec(inp);
              if (x && x.index == pos) {
                node.children = [];
                // now parse strings and other tags until you find a closing tag on the same level...
                pos = regexTagBinarySuffix.lastIndex;
                return true;
              }
              // i dont know what that was
              throw console.warn("Error parsing tag");
              return false;
            }
          }.bind(this);

          var tagBody = function(node){
            do {
              var start = pos;

              var regexTagBody = this.regexTagBody;
              regexTagBody.lastIndex = pos;
              var text = regexTagBody.exec(inp);
              if (text && text[1]) {
                var txt = processValue(text[1]);
//			  var txt = text[1].replace(this.regexRemoveEscape, '$1'); // remove a single backslash from the content (it was used as an escape character)
                node.children.push(txt);
                pos = regexTagBody.lastIndex;
              }
              if (inp[pos] == '<') {
                var regexTagOpenOrClose = this.regexTagOpenOrClose;
                regexTagOpenOrClose.lastIndex = pos;
                var x = regexTagOpenOrClose.exec(inp);
                if (x && x.index == pos) {
                  return node; // end of body
                }
                node.children.push(tag({}));
              }
            } while (start != pos);
          }.bind(this);

          var tagClose = function(node){
            var regexTagClose = this.regexTagClose;
            regexTagClose.lastIndex = pos;
            var ctag = regexTagClose.exec(inp);
            if (ctag) {
              pos = regexTagClose.lastIndex;
              if (node.name == ctag[1]) return true;
              return false; // was not expecting to close this tag
            }

            // tagClose should only be called if the next chars are starting a closing tag...
            return false;
          }.bind(this);

          var tag = function(node){
            if (!tagOpen(node)) {
              return node;
            }
            if (!node.unary) {
              tagBody(node);
              tagClose(node);
            }
            return node;
          }.bind(this);

          var root = tag({});

          returnValue = {start:start,stop:pos,name:15/*TAG*/,isPrimitive:true,root:root};
        } else {
          // note: operators need to be ordered from longest to smallest. regex will take care of the rest.
          // no need to worry about div vs regex. if looking for regex, earlier if will have eaten it
          //var result = this.regexPunctuators.exec(inp.substring(pos,pos+4));

          // note: due to the regex, the single / or < might be caught by an earlier part of the regex. so check for that.
          var result = part[8] || part[9] || part[10];
          if (result) {
            //result = result[1];
            returnValue = {start:pos,stop:pos+=result.length,name:11/*PUNCTUATOR*/,value:result};
          } else {
            var found = false;
            // identifiers cannot start with a number. but if the leading string would be a number, another if would have eaten it already for numeric literal :)
            while (pos < inp.length) {
              var c = inp[pos];

              if (this.hashAsciiIdentifier[c]) ++pos; //if (this.regexAsciiIdentifier.test(c)) ++pos;
              else if (c == '\\' && this.regexUnicodeEscape.test(inp.substring(pos,pos+6))) pos += 6; // this is like a \uxxxx
              // ok, now test unicode ranges...
              // basically this hardly ever happens so there's little risk of this hitting performance
              // however, if you do happen to have used them, it's not a problem. the parser will support it :)
              else if (this.Unicode) { // the unicode is optional.
                // these chars may not be part of identifier. i want to try to prevent running the unicode regexes here...
                if (this.hashIdentifierStop[c] /*this.regexIdentifierStop.test(c)*/) break;
                // for most scripts, the code wont reach here. which is good, because this is going to be relatively slow :)
                var Unicode = this.Unicode; // cache
                if (!(
                  // these may all occur in an identifier... (pure a specification compliance thing :)
                  Unicode.Lu.test(c) || Unicode.Ll.test(c) || Unicode.Lt.test(c) || Unicode.Lm.test(c) ||
                    Unicode.Lo.test(c) || Unicode.Nl.test(c) || Unicode.Mn.test(c) || Unicode.Mc.test(c) ||
                    Unicode.Nd.test(c) || Unicode.Pc.test(c) || Unicode.sp.test(c)
                  )) break; // end of match.
                // passed, next char
                ++pos;
              } else break; // end of match.

              found = true;
            }

            if (found) {
              returnValue = {start:start,stop:pos,name:2/*IDENTIFIER*/,value:inp.substring(start,pos)};
              if (returnValue.value == 'undefined' || returnValue.value == 'null' || returnValue.value == 'true' || returnValue.value == 'false') returnValue.isPrimitive = true;
            } else {
              if (inp[pos] == '`') {
                returnValue = {start:start,stop:pos+1,name:14/*error*/,tokenError:true,error:Tokenizer.Error.BacktickNotSupported};
                this.errorStack.push(returnValue);
              } else if (inp[pos] == '\\') {
                if (inp[pos+1] == 'u') {
                  returnValue = {start:start,stop:pos+1,name:14/*error*/,tokenError:true,error:Tokenizer.Error.InvalidUnicodeEscape};
                  this.errorStack.push(returnValue);
                } else {
                  returnValue = {start:start,stop:pos+1,name:14/*error*/,tokenError:true,error:Tokenizer.Error.InvalidBackslash};
                  this.errorStack.push(returnValue);
                }
              } else {
                returnValue = {start:start,stop:pos+1,name:14/*error*/,tokenError:true,error:Tokenizer.Error.Unknown,value:c};
                this.errorStack.push(returnValue);
                // try to skip this char. it's not going anywhere.
              }
              ++pos;
            }
          }
        }

        if (returnValue) {
          // note that ASI's and errors are slipstreamed in here from the parser since the tokenizer cant determine that
          // if this part ever changes, make sure you change that too :) (see also this.addTokenToStreamBefore)
          returnValue.tokposw = this.wtree.length;
          this.wtree.push(returnValue);
          if (!returnValue.isWhite) {
            returnValue.tokposb = this.btree.length;
            this.btree.push(returnValue);
          }
        }


      } while (returnValue && returnValue.isWhite); // WHITE_SPACE LINETERMINATOR COMMENT_SINGLE COMMENT_MULTI
      ++this.tokenCountNoWhite;

      this.pos = pos;

      if (matchedNewline) returnValue.newline = true;
      return returnValue;
    },
    // used by ASI and error stuff (in parser)
    addTokenToStreamBefore: function(token, match){
      var wtree = this.wtree;
      var btree = this.btree;
      if (match.name == 12/*asi*/) {
        token.tokposw = wtree.length;
        wtree.push(token);
        token.tokposb = btree.length;
        btree.push(token);
      } else {
        token.tokposw = match.tokposw;
        wtree[token.tokposw] = token;
        match.tokposw += 1;
        wtree[match.tokposw] = match;

        if (match.tokposb) {
          token.tokposb = match.tokposb;
          btree[token.tokposb] = token;
          match.tokposb += 1;
          btree[match.tokposb] = match;
        }
      }
    },
    // (unused) replaces the range of tokens in the
    // white and black streams with the specified token.
    replaceTokensInStreamWithToken: function(token, wfrom, wto, bfrom, bto){
      this.wtree.splice(wfrom, wto-wfrom, token);
      this.btree.splice(bfrom, bto-bfrom, token);
    },
    parseCurlyMethodLiteral: function(match){
      var error = false;
      var pos = this.pos;
      // match should be an opening curly with no preceeding newline
      if (match.hasNewline) {
        // so this is bad because if we would not demand this, the language could
        // be amibiguous with a block
        error = 'CurlyMethodsMayNotFollowNewline';
      } else {
        var input = this.inp;

        // remember number of curlies, you'll want that many closers as well
        var curlies = 1;
        while (input[pos] == '{') {
          ++pos;
          ++curlies;
        }

        // keep parsing characters until you reach a curly.
        // backslashes may only escape backslashes or curlies
        while (!error && pos < input.length && input[pos] != '}') {
          if (input[pos] == '{') {
            error = CurlyMethodsCannotContainOpeningCurly;
          } else if (input[pos] == '\\') {
            if (input[pos+1] != '{' && input[pos+1] != '}' && input[pos+1] != '\\') {
              error = 'CurlyMethodsMayOnlyEscapeCurlies';
            } else {
              // skip curly or backslash
              ++pos;
            }
          }
          ++pos;
        }

        if (!error) {
          if (pos >= input.length) {
            error = 'CurlyMethodsUnexpectedEof';
          } else {
            var n = curlies;
            while (n && pos<input.length) {
              if (input[pos] == '}') {
                ++pos;
                --n;
              } else {
                break;
              }
            }
//					while (n-- && pos<=input.length && input[pos++] == '}') console.log('yes');

            if (pos>input.length) error = 'CurlyMethodsUnexpectedEof';
            else if (n) error = 'CurlyMethodsWasOpenedWithMoreCurliesThanClosed';
          }
        }
        if (!error) {
          // transform this match to a CURLY_METHOD instead of the opening curly it was
          match.name = this.CURLY_METHOD;
          match.stop = pos;
          match.value = this.inp.slice(match.start,pos);
          match.curlies = curlies;

          this.pos = pos;
        }
      }

      if (error) {
        this.addTokenToStreamBefore(
          {
            start: match.start,
            stop:  pos,
            name:  this.ERROR,
            tokenError:true,
            error: Tokenizer.Error.NumberExponentRequiresDigits
          },
          match
        );
      }
    },
    oldNumberParser: function(pos, chr, inp, returnValue, start, Tokenizer){
      ++pos;
      // either: 0x 0X 0 .3
      if (chr == '0' && (inp[pos] == 'x' || inp[pos] == 'X')) {
        // parsing hex
        while (++pos < inp.length && this.hashHex[inp[pos]]); // this.regexHex.test(inp[pos]));
        returnValue = {start:start,stop:pos,name:3/*NUMERIC_HEX*/,isPrimitive:true,isNumber:true};
      } else {
        var parsingOctal = chr == '0' && inp[pos] >= '0' && inp[pos] <= '9';
        // parsing dec
        if (chr != '.') { // integer part
          while (pos < inp.length && inp[pos] >= '0' && inp[pos] <= '9') ++pos;
          if (inp[pos] == '.') ++pos;
        }
        // decimal part
        while (pos < inp.length && inp[pos] >= '0' && inp[pos] <= '9') ++pos;
        // exponent part
        if (inp[pos] == 'e' || inp[pos] == 'E') {
          if (inp[++pos] == '+' || inp[pos] == '-') ++pos;
          var expPosBak = pos;
          while (pos < inp.length && inp[pos] >= '0' && inp[pos] <= '9') ++pos;
          if (expPosBak == pos) {
            returnValue = {start:start,stop:pos,name:14/*error*/,tokenError:true,error:Tokenizer.Error.NumberExponentRequiresDigits};
            this.errorStack.push(returnValue);
          }
        }
        if (returnValue.name != 14/*error*/) {
          if (parsingOctal) {
            returnValue = {start:start,stop:pos,name:14/*error*/,isNumber:true,isOctal:true,tokenError:true,error:Tokenizer.Error.IllegalOctalEscape};
            this.errorStack.push(returnValue);
            console.log("foo")
          } else {
            returnValue = {start:start,stop:pos,name:4/*NUMERIC_DEC*/,isPrimitive:true,isNumber:true};
          }
        }
      }
      return [pos, returnValue];
    },
    tokens: function(arrx){
      arrx = arrx || [];
      var n = 0;
      var last;
      var stack = [];
      while ((last = this.storeCurrentAndFetchNextToken(!arrx[n++], false, false, true)) && last.name != 12/*EOF*/) stack.push(last);
      return stack;
    },
    fixValues: function(){
      this.wtree.forEach(function(t){
        if (!t.value) t.value = this.inp.substring(t.start, t.stop);
      },this);
    }
  };

  Tokenizer.regexWhiteSpace = /[ \t\u000B\u000C\u00A0\uFFFF]/;
  Tokenizer.regexLineTerminator = /[\u000A\u000D\u2028\u2029]/;
  Tokenizer.regexAsciiIdentifier = /[a-zA-Z0-9\$_]/;
  Tokenizer.hashAsciiIdentifier = {_:1,$:1,a:1,b:1,c:1,d:1,e:1,f:1,g:1,h:1,i:1,j:1,k:1,l:1,m:1,n:1,o:1,p:1,q:1,r:1,s:1,t:1,u:1,v:1,w:1,x:1,y:1,z:1,A:1,B:1,C:1,D:1,E:1,F:1,G:1,H:1,I:1,J:1,K:1,L:1,M:1,N:1,O:1,P:1,Q:1,R:1,S:1,T:1,U:1,V:1,W:1,X:1,Y:1,Z:1,0:1,1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1};
  Tokenizer.regexHex = /[0-9A-Fa-f]/;
  Tokenizer.hashHex = {0:1,1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1,a:1,b:1,c:1,d:1,e:1,f:1,A:1,B:1,C:1,D:1,E:1,F:1};
  Tokenizer.regexUnicodeEscape = /u[0-9A-Fa-f]{4}/; // the \ is already checked at usage...
  Tokenizer.regexIdentifierStop = /[\>\=\!\|\<\+\-\&\*\%\^\/\{\}\(\)\[\]\.\;\,\~\?\:\ \t\n\\\'\"]/;
  Tokenizer.hashIdentifierStop = {'>':1,'=':1,'!':1,'|':1,'<':1,'+':1,'-':1,'&':1,'*':1,'%':1,'^':1,'/':1,'{':1,'}':1,'(':1,')':1,'[':1,']':1,'.':1,';':1,',':1,'~':1,'?':1,':':1,'\\':1,'\'':1,'"':1,' ':1,'\t':1,'\n':1};
  Tokenizer.regexNewline = /\n/g;
//Tokenizer.regexPunctuators = /^(>>>=|===|!==|>>>|<<=|>>=|<=|>=|==|!=|\+\+|--|<<|>>|\&\&|\|\||\+=|-=|\*=|%=|\&=|\|=|\^=|\/=|\{|\}|\(|\)|\[|\]|\.|;|,|<|>|\+|-|\*|%|\||\&|\||\^|!|~|\?|:|=|\/)/;
  Tokenizer.Unidocde = window.Unicode;
  Tokenizer.regexNumber = /^(?:(0[xX][0-9A-Fa-f]+)|((?:(?:(?:(?:[0-9]+)(?:\.[0-9]*)?))|(?:\.[0-9]+))(?:[eE][-+]?[0-9]{1,})?))/;
  Tokenizer.regexNormalizeNewlines = /(\u000D[^\u000A])|[\u2028\u2029]/;
// tag parsing regex
  // ws   name (must start with non-number-or-dash)
  Tokenizer.regexTagName = /[^\S]*([a-zA-Z][a-zA-Z0-9-]*)/g;
  // ws   attrname			 "..[\"].."						   '..[\']..'
  Tokenizer.regexTagAttributes = /[^\S]+([a-zA-Z0-9-]+)(?:=(?:(?:"((?:(?:\\.)|(?:[^"]))*?)")|(?:'((?:(?:\\')|(?:[^']))*?)')))?/g;
  // ws  />
  Tokenizer.regexTagUnarySuffix = /[^\S]*\/[^\S]*>/g;
  // ws >
  Tokenizer.regexTagBinarySuffix = /[^\S]*?>/g;
  // anything as long as its not a <, unless preceeded by \
  Tokenizer.regexTagBody = /((?:(?:\\.)|(?:[^<]))*)/g;
  // < ws /> / (?? TOFIX not sure whether this is correct or intentional...)
  Tokenizer.regexTagOpenOrClose = /<[^\S]*[\/>]*\//g;
  // < ws / ws name ws >
  Tokenizer.regexTagClose = /<[^\S]*\/[^\S]*([a-zA-Z][a-zA-Z0-9-]*)[^\S]*>/g;
  // backslash with either a non-backslash following or the EOL following
  Tokenizer.regexRemoveEscape = /\\(?:([^\\])|$)/g;


//					  1 ws							2 lt						3 scmt 4 mcmt 5/6 str 7 nr	   8 rx		 9 dom		10 punc
  Tokenizer.regexBig = /^([ \t\u000B\u000C\u00A0\uFFFF])?([\u000A\u000D\u2028\u2029])?(\/\/)?(\/\*)?(')?(")?(\.?[0-9])?(?:(\/)[^=])?(?:(<)[^<=])?(>>>=|===|!==|>>>|<<=|>>=|<=|>=|==|!=|\+\+|--|<<|>>|\&\&|\|\||\+=|-=|\*=|%=|\&=|\|=|\^=|\/=|\{|\}|\(|\)|\[|\]|\.|;|,|<|>|\+|-|\*|%|\||\&|\||\^|!|~|\?|:|=|\/)?/;
  Tokenizer.regexBigAlt = /([ \t\u000B\u000C\u00A0\uFFFF])?([\u000A\u000D\u2028\u2029])?(\/\/)?(\/\*)?(')?(")?(\.?[0-9])?(?:(\/)[^=])?(>>>=|===|!==|>>>|<<=|>>=|<=|>=|==|!=|\+\+|--|<<|>>|\&\&|\|\||\+=|-=|\*=|%=|\&=|\|=|\^=|\/=|\{|\}|\(|\)|\[|\]|\.|;|,|<|>|\+|-|\*|%|\||\&|\||\^|!|~|\?|:|=|\/)?/g;

  Tokenizer.Error = {
    UnterminatedSingleStringNewline: {msg:'Newlines are not allowed in string literals'},
    UnterminatedSingleStringOther: {msg:'Unterminated single string'},
    UnterminatedDoubleStringNewline: {msg:'Newlines are not allowed in string literals'},
    UnterminatedDoubleStringOther: {msg:'Unterminated double string'},
    UnterminatedRegularExpressionNewline: {msg:'Newlines are not allowed in regular expressions'},
    NothingToRepeat: {msg:'Used a repeat character (*?+) in a regex without something prior to it to match'},
    ClosingClassRangeNotFound: {msg: 'Unable to find ] for class range'},
    RegexOpenGroup: {msg: 'Open group did not find closing parenthesis'},
    RegexNoOpenGroups: {msg: 'Closing parenthesis found but no group open'},
    UnterminatedRegularExpressionOther: {msg:'Unterminated regular expression'},
    UnterminatedMultiLineComment: {msg:'Unterminated multi line comment'},
    UnexpectedIdentifier: {msg:'Unexpected identifier'},
    IllegalOctalEscape: {msg:'Octal escapes are not valid'},
    Unknown: {msg:'Unknown input'}, // if this happens, my parser is bad :(
    NumberExponentRequiresDigits: {msg:'Numbers with exponents require at least one digit after the `e`'},
    BacktickNotSupported: {msg:'The backtick is not used in js, maybe you copy/pasted from a fancy site/doc?'},
    InvalidUnicodeEscape: {msg:'Encountered an invalid unicode escape, must be followed by exactly four hex numbers'},
    InvalidBackslash: {msg:'Encountered a backslash where it not allowed'},
    StartOfMatchShouldBeAtStart: {msg: 'The ^ signifies the start of match but was not found at a start'},
    DollarShouldBeEnd: {msg: 'The $ signifies the stop of match but was not found at a stop'},
    QuantifierRequiresNumber: {msg:'Quantifier curly requires at least one digit before the comma'},
    QuantifierRequiresClosingCurly: {msg:'Quantifier curly requires to be closed'},
    MissingOpeningCurly: {msg:'Encountered closing quantifier curly without seeing an opening curly'},
    CurlyMethodsMayNotFollowNewline: {msg:'There may not be any newlines between the expression and the curly method'},
    CurlyMethodsMayOnlyEscapeCurlies: {msg:'You may only escape curlies {} and backslashes in curly methods'},
    CurlyMethodsCannotContainOpeningCurly: {msg:'There\'s no way an opening curly could be part of a curly method, yet'},
    CurlyMethodsWasOpenedWithMoreCurliesThanClosed: {msg:'The curly method must be closed with as many curlies as it was started with'},
    CurlyMethodsUnexpectedEof: {msg:'Encountered EOF while parsing a curly method'},
  };


  window.heatfiler = {};

  var currentPage = -1; // like tabs for files, what's the currently shown tab?
  var sendToLocalStorage = false; // should pings be sent to localStorage too? makes it much much slower, but hey
  var statsRelativeToPage = true; // compare to max of all files or max of each file individually?
  var relativeToFunction = -1; // when zooming in on a function, this is the tokpos
  var codeCoverage = false; // make anything red that has hits=0, anything else goes white
  var nodeMode = false; // are we running as a nodejs host? will write stats to a file and hook into require system

// contains an array for every file that contains objects. each object holds metric information
  var hits = {};
// lookup table to hits for each file
  var hash = {};
// for each file, an object with spans for all metrics to be displayed, by token id (only generated when displaying heatmap)
  var spans = {};
// for each file, a PRE tag will exist in the heatmaps array, so you can easily swap out heatmaps
  var heatmaps = {};
// store the ping timer so we can kill it
  var lastTimer = -1;
// remember tokpos ids for function keywords for function list
  var funcs = {};
// list of tokens for current code
  var trees = {};
// hide input fields?
  var hideInputs = false;

// for node, count how many files ("pages") were loaded
  var nodeFileCounter = 0;
// for node, track the file names that have been loaded (to get the exact filename strings to check for)
  var nodeFilesLoaded = [];
// for node, send the sources that you're using
  var nodeSourcesProfiled = [];
// where should we store the stats?
  var targetStatsFile = './profile_stats.js';

// node failsafe for DOM stuff
  var document = window.document || (window.document = {
    getElementById: function(){ return false; },
    querySelectorAll: function(){ return []; }
  });

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
    funcs = {0:[]};
    prepareHitsHash(trees[0], hits[0], hash[0]);

    document.getElementById('output').value = transform(trees[0], 0);

    pingResultsLocaly();

    addScript(document.getElementById('output').value);
  };
  if (document.getElementById('run-files-local')) document.getElementById('run-files-local').onclick = function(){
    sendToLocalStorage = false;
    clearTimeout(lastTimer);

    getFiles(false, filesLoadedToRunLocal);
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
    funcs = {0:[]};
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
    funcs = {0:[]};
    prepareHitsHash(trees[0], hits[0], hash[0]);

    document.getElementById('output').value = transform(trees[0], 0);

    addScript(document.getElementById('output').value);
  };

  if (document.getElementById('ping-files-storage')) document.getElementById('ping-files-storage').onclick = function(){
    sendToLocalStorage = false;
    clearTimeout(lastTimer);

    getFiles(true, filesLoadedToPingStorage);
  };
  if (document.getElementById('run-files-storage')) document.getElementById('run-files-storage').onclick = function(){
    sendToLocalStorage = true;
    clearTimeout(lastTimer);

    getFiles(false, filesLoadedToRunStorage);
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
      funcs = {0:[]};
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
    funcs = {};
    spans = {};
    heatmaps = [];

    showFiles(toLoad, heatmaps, hits, hash, spans);

    pingResultsLocalStorage();
  };

  if (document.getElementById('ping-node')) document.getElementById('ping-node').onclick = function(){
    // in this case, we ping the server for the stats, rather than local storage
    // on top of that, we also add the loaded files to the files textarea

    sendToLocalStorage = false;
    clearTimeout(lastTimer);

    hits = {};
    hash = {};
    funcs = {};
    spans = {};
    trees = {};
    heatmaps = [];

    // start pinging the server for stats
    pingResultsNode(20);
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
      funcs = {};

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

  var parseFilesField = function(){
    var files = document.getElementById('files').value;
    files = files.split('\n');

    var toLoad = [];

    currentPage = -1;
    files.forEach(function(file, i){
      file = file.replace(/^\s*/,'').replace(/\s*$/,'');
      if (file) {
        var exclude = file[0] === '-';
        if (file) {
          file = file.replace(/^[-+\s]?\s*/,'');
          var obj = {url:file, profile:!exclude};
          toLoad.push(obj);

          if (!exclude && currentPage == -1) {
            currentPage = i;
          }
        }
      }
    });

    return toLoad;
  };
  var getFiles = function(forHeatmapOnly, onFinished){
    var toLoad = parseFilesField();
    if (toLoad.length == 0) return console.log("No files to load...");

    var n = 0;
    toLoad.forEach(function(obj){
      // for heatmap, only fetch files to profile. otherwise fetch them all (to run them)
      if (obj.profile || !forHeatmapOnly) {
        ++n;
        GET(obj.url, function(err, txt){
          if (err) return console.log("Some error while fetching file", err);
          obj.source = txt;
          if (--n == 0) onFinished(toLoad);
        });
      }
    });
  };

  var filesLoadedToRunLocal = function(toLoad){
    // start pinging now
    pingResultsLocaly();

    hits = {};
    hash = {};
    funcs = {};
    spans = {};
    heatmaps = [];

    translateShowAndLoad(toLoad, heatmaps, hits, hash, spans);

    showFileButtons(heatmaps, toLoad.map(function(t){ return t.url; }));

    document.body.replaceChild(heatmaps[currentPage], document.getElementById('heatmap'));
  };
  var filesLoadedToRunStorage = function(toLoad){
    hits = {};
    hash = {};
    funcs = {};

    translateAndLoad(toLoad, hits, hash);
  };
  var filesLoadedToPingStorage = function(toLoad){
    hits = {};
    hash = {};
    funcs = {};
    spans = {};
    heatmaps = [];

    showFiles(toLoad, heatmaps, hits, hash, spans);

    pingResultsLocalStorage(20);
  };

  var parse = function(input){
    if (window.localStorage) localStorage.setItem('input', input);
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

    showFileButtons(heatmaps, toLoad.map(function(t){ return t.url; }));
    document.body.replaceChild(heatmaps[currentPage], document.getElementById('heatmap'));
  };
  var showFileButtons = function(heatmaps, files){
    var parent = document.getElementById('file-tabs');
    while (parent.children.length > 1) parent.removeChild(parent.children[1]);

    // add a show button for each file
    // remove undefineds first
    heatmaps = heatmaps.filter(function(o){ return o; });
    heatmaps.forEach(function(e,i){
      var button = document.createElement('button');
      button.innerHTML = 'file '+(i+1);
      button.style.cssFloat = 'left';
      button.title = files[i];
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
      if (t.subExpressionLogicStart) {
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
  var pingResultsLocalStorage = function repeat(n){
    lastTimer=setTimeout(function(){
      hits=JSON.parse(localStorage.getItem('profiler-hits'));
      pingResults();
      repeat(1000);
    }, n);
  };
  var pingResultsNode = function repeat(n){
    setTimeout(function(){
      // get data from localStorage
      GET(document.getElementById('stats-file-location').value, function(err, data){
        if (err) return console.log("Some error while fetching stats", err);

        var data = JSON.parse(data); // files, hits, sources
        hits = data.hits;

        // update files textarea
        document.getElementById('files').value = data.files.join('\n');

        // find the files we havent updated yet
        var files = parseFilesField();
        files.forEach(function(o,i){
          if (o.profile && !trees[i]) {
            // parse
            trees[i] = parse(data.sources[i]);

            // generate
            heatmaps[i] = document.createElement('pre');
            heatmaps[i].id = 'heatmap';
            generateHeatmap(i, heatmaps[i], trees[i], spans[i] = {});

            // save
            var trans = transform(trees[i], i);
            o.transformed = trans;
          }
        });

        showFileButtons(heatmaps, files.map(function(t){ return t.name; }));
        var current = document.getElementById('heatmap');
        if (current != heatmaps[currentPage] && currentPage != -1) {
          document.body.replaceChild(heatmaps[currentPage], current);
        } else if (currentPage == -1) {
          console.log("No stats to show... no files are monitored")
        }

        // we can be sure all files to profile have a heatmap now
        // refresh heatmap
        pingResults();

        // queue new request
        repeat(2000);
      });
    }, n);
  };
  var pingResults = function(){
    var pages = Object.keys(hits);
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

  /**
   * To enable this, simply require(<this file>).heatfiler.runNode([<files to profile>], <custom file location for stats>)
   * After this, the entire project is eligable for profiling. Whenever you require a file it will
   * check the filesToProfile array for a match (note that this uses the complete resolved file string). If so
   * it will transform it and start profiling it. Stats are written to the output file once every two seconds.
   * You can fire up the client in a browser, point it towards your file (should be xhr-able from where you
   * are loading the client) and go. You'll get a list of all the required files from node (and whether they are
   * profiled or not), which keeps updating (so newly required files will eventually appear too). This should
   * make it easier for you to determine the exact file-strings to pass on for profiling. Other than that, the
   * client should work as usual. Note that node will run considerably slower with the profiler enabled. Though
   * results may vary on that. I hope so for your sake :)
   *
   * @param [string[]] [filesToProfile=[]]
   * @param [string] [customTargetStatsFile='./profile_stats.js']
   */
  var hookIntoNodejs = function(filesToProfile, customTargetStatsFile){
    if (!filesToProfile || !(filesToProfile instanceof Array)) {
      filesToProfile = [];
      console.log("Warning: no files to profile, profiler will not do anything... will write stats after 5 seconds...");
      setTimeout(toFile, 5000);
    }
    if (customTargetStatsFile) targetStatsFile = customTargetStatsFile;

    hash = {};
    funcs = {};
    trees = {};

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
    // (ok, this isnt rocket science)
    var stripBOM = function(content) {
      // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
      // because the buffer-to-string conversion in `fs.readFileSync()`
      // translates it to FEFF, the UTF-16 BOM.
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    };
    var fs = require('fs');

    require.extensions['.js'] = function(module, filename) {
      var content = fs.readFileSync(filename, 'utf8');

      // only transform to profiler code if in array
      if (filesToProfile.indexOf(filename) >= 0) {

        nodeSourcesProfiled.push(content);

        var tree = trees[nodeFileCounter] = parse(content);
        content = transform(tree, nodeFileCounter);

        prepareHitsHash(tree, hits[nodeFileCounter]=[], hash[nodeFileCounter]={});

        // inject a heatfiler variable into each source. this will hold all the methods we need...
        content =
          'var heatfiler = require(\''+__filename+'\');\n' +
            // expose the two globals
            'var FOO = heatfiler.FOO;\n' +
            'var BAR = heatfiler.BAR;\n' +
            content;

        nodeFilesLoaded.push('+ '+filename);
      } else {
        nodeFilesLoaded.push('- '+filename);
        nodeSourcesProfiled.push(null);

      }

      // this doohicky does the magic of turning source into js
      module._compile(stripBOM(content), filename);

      ++nodeFileCounter;
    };

    // from now on, any required file that is require'd and also
    // in the passed on filesToProfile array, will be translated
    // for the heatmap. joy!

    window.heatfiler.filesToProfile = filesToProfile;

    nodeMode = true;

    window.BAR = function(id,a,b){
      // statement or expression-part
      ++hash[id][a].hits;
      toFile();
    };
    window.FOO = function(id,a){
      // a function call
      ++hash[id][a].hits;
      toFile();
    };
  };

// this is the stats gathering part
// stores it to local storage, if mode is enabled. throttled.
  var lastFlush = Date.now();
  var dateNowThrottle = 0;
  var timer = -1;
  window.BAR = function(id,a,b){
    // statement or expression-part
    ++hash[id][a].hits;
    if (sendToLocalStorage) toLocalStorage();
    // for nodeMode, the BAR function is replaced with a more efficient one
  };
  window.FOO = function(id,a){
    // a function call
    ++hash[id][a].hits;
    if (sendToLocalStorage) toLocalStorage();
    // for nodeMode, the FOO function is replaced with a more efficient one
  };
  var toLocalStorage = function(){
    if (!(++dateNowThrottle < 1000000)) {
      dateNowThrottle = 0;
      if (Date.now() - lastFlush > 2000) {
        localStorage.setItem('profiler-hits', JSON.stringify(hits));
        lastFlush = Date.now();
      }
    }
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
  };
  var toFile = function(){
    // this is for nodeMode. write the stats to a local file
    // once every second or so.
    if (!(++dateNowThrottle < 1000000)) {
      dateNowThrottle = 0;
      if (Date.now() - lastFlush > 2000) {
        var data = {files:nodeFilesLoaded,hits:hits,sources:nodeSourcesProfiled};
        require('fs').writeFileSync('profiler_stats.js', JSON.stringify(data), 'utf8');
        lastFlush = Date.now();
      }
    }
    if (timer == -1) {
      // this timer will block while blocking code is running
      // it will only be rescheduled once and will make sure
      // that stuff is flushed after the code finishes
      timer = setTimeout(function(){
        timer = -1;
        var data = {files:nodeFilesLoaded,hits:hits,sources:nodeSourcesProfiled};
        require('fs').writeFileSync('profiler_stats.js', JSON.stringify(data), 'utf8');
        lastFlush = Date.now();
      }, 20);
    }
  };

// try to integrate
  integrateInPage();

// this is: module.exports.runNode ...
  window.heatfiler.runNode = hookIntoNodejs;
  window.heatfiler.nodeFilesLoaded = nodeFilesLoaded;


// in the browser, `this` will be window. in node it will be `module.exports`
// note that this may not be strict mode code, or `this` will be null and *foom*
})(this);
