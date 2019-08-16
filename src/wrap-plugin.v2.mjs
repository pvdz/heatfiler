// Note: keep this file browser friendly. No node.js specific imports.
// Wrap each statement/declaration/expression in function calls that count execution occurrences

// v2: This approach maps nodes to tokens and for the --view version, it serializes the source through tokens, not AST

// Assume a global `prettier` is available. In the browser it'll be side-loaded as a script tag, in node it'll be
// imported and explicitly assigned to `global.prettier` (dirty hack but what can you do).

/*
Wrap statements in counters

- We can wrap any _statement_ in a block safely
- We should be able to prepend a statement to any _declaration_ safely
  - But, the catch here is sub-statements that are function declarations...
  - We can't wrap declarations in blocks safely due to lexical scoping
*/

let uid = 0;
export function wrapPlugin(babel, options) {
    const {types: t} = babel;
    const {
      code,
      fid,
      tokens, // Array<{whitespace: bool, value: string, tid: number, nid: number, token: ?Token}>
    } = options;


    // While visiting nodes this sets the context (function body) to which the node belongs
    // Pushed/Popped with a visitor
    let contextStack = [];

    uid = 0; // generic unique id (incremental counter), first id should start at 1 (always do ++uid, NOT uid++)

    let tokenStream; // wrappers, includes whitespace tokens that babel does not produce
    let tokenMap = new Map; // {"line:col": Token}

    let program = {
      // The tokens are only exposed on the File node, which is the parent of Program
      enter: path => {
        let babelTokens = path.parent.tokens; // requires `tokens = true` as babel parser options.
        tokenStream = babelTokens;
        let lastEnd = 0;
        babelTokens.forEach(token => {
          /*
          Babel Token {
            type: TokenType { <meta data> },
            value: 'foo',
            start: 0,
            end: 3,
            loc: SourceLocation {
              start: Position { line: 1, column: 0 },
              end: Position { line: 1, column: 3 }
            }
          },

          Heatfiler Token Wrapper {
            tid: number,
            nid: ?number,
            start: number,
            whitespace: boolean,
            ignoreBlock: boolean,
            value: string,
            token: Babel Token
          }
          */

          if (token.start === token.end) return; // dont care about non-value tokens... (hopefully)

          // Create a list of _all_ tokens so we can serialize the original code by just joining them
          if (token.start !== lastEnd) {
            // Add a token for any skipped whitespace or comment, which Babel would not preserve in this list
            let d = createBabelTokenWrapper(lastEnd, true, code.slice(lastEnd, token.start), undefined);
            // {tid: uid++, nid: undefined, start: lastEnd, whitespace: true, value: code.slice(lastEnd, token.start), token: undefined};
            tokens.push(d);
            tokenMap.set(lastEnd, d);
          }
          // Note: not all tokens have a .value (like punctuators) so we just slice everything
          let d = createBabelTokenWrapper(token.start, token.type === 'CommentLine' || token.type === 'CommentBlock', code.slice(token.start, token.end), token);
          tokens.push(d);
          // Generate an offset -> token map so we can find the first token of a node based on its offset
          tokenMap.set(token.start, d);
          lastEnd = token.end;
        });
        if (lastEnd < code.length) {
          // Trailing comment/whitespace
          let d = createBabelTokenWrapper(lastEnd, true, code.slice(lastEnd, code.length), undefined);
          tokens.push(d);
          tokenMap.set(lastEnd, d);
        }
      }
    };

    function createBabelTokenWrapper(start, whitespace, value, token) {
      return {
        tid: ++uid,
        nid: undefined,
        start,
        whitespace,
        value,
        token,
        ignoredBlock: false, // Ignore this block in the count because its a sub-statement / func body
      };
    }

    let stmt = (why) => {
      if (typeof why !== 'string') throw new Error('api fail');
      return ({
        exit(path) {
          if (
            t.isExpressionStatement(path.node) &&
            t.isCallExpression(path.node.expression) &&
            (
              t.isIdentifier(path.node.expression.callee, {name: 'HF_STMT'}) ||
              t.isIdentifier(path.node.expression.callee, {name: 'HF_DECL'})
            )
          ) return;
          if (t.isBlockStatement(path.node)) {
            if (path.node.start === undefined) {
              // This is a block we just injected. Skip processing it.
              path.skip();
              return;
            }
            if ([
              'IfStatement', // also covers `else`
              'WhileStatement',
              'WithStatement',
              'DoWhileStatement',
              'ForStatement',
              'ForInStatement',
              'ForOfStatement',
              'FunctionDeclaration',
              'FunctionExpression',
              'ArrowFunctionExpression',
              'TryStatement',
              'CatchClause',
              'Finalizer',
              'Finalizer',
              'ObjectMethod',
              'ClassMethod',
              'LabeledStatement',
            ].includes(path.parentPath.node.type) && path.node.body.length > 0) {
              // Ignore blocks that are sub-statements, pseudo-statements, or function bodies, unless they are empty
              let firstToken = tokenMap.get(path.node.start);
              firstToken.ignoredBlock = true;
              return;
            }
          }

          let firstToken = tokenMap.get(path.node.start);
          if (path.node.start === undefined) {
            console.error('For the next crash...');
            console.dir(path.node, {depth: null})
          }
          // If this token was already recorded as the start of a function, use that nid instead

          let nid = firstToken.nid;
          if (!nid) nid = firstToken.nid = ++uid;

          // Same token can be the start of multiple nodes (ie. Program and the first Statement)
          if (contextStack.length > 0) { // In global the stack is empty. We only care about functions here.
            firstToken.contextNids = contextStack.slice(0);
          }

          switch (why) {
            case 'i':
            case 'w':
            case 'd':
              // if-statement or while-loop
              // Log the stats to the keyword (in the future we'd want to have split results for expression (`if (a||b)`)
              // `if (x);` -> `if (HF_EXPR(1, 2, x));`
              // `while (x);` -> `while (HF_EXPR(1, 2, x));`
              // `do {} while (x);` -> `do {} while (HF_EXPR(1, 2, x));`
              path.node.test =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.test]);
              break;
            case 's':
              // switch-statement
              // `switch (x){}` -> `switch (HF_EXPR(1, 2, x)){}`
              path.node.discriminant =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.discriminant]);
              break;
            case 'f':
              // regular for-statement
              // path.node.init =
              //   t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.init]);
              if (path.node.test) {
                // `for (;x;);` -> `for (;HF_EXPR(1, 2, x););`
                path.node.test =
                  t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.test]);
              }
              if (path.node.update) {
                // `for (;;x);` -> `for (;;HF_EXPR(1, 2, x));`
                path.node.update =
                  t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.update]);
              }
              break;
            case 'r':
              // return-statement
              if (path.node.argument) {
                // `return x` -> `return HF_EXPR(1, 2, x)`
                path.node.argument =
                  t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.argument]);
              } else {
                // `return;` -> `return HF_EXPR(1, 2, undefined)`
                path.node.argument =
                  t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), t.identifier('undefined')]);
              }
              break;
            case 'E':
            case 'b':
            case 'fi':
            case 'fo':
            case 'D':
            case 'e':
            case 'W':
            case 'B':
            case 'L':
            case 'c':
            case 't':
            case 'T':
            case 'l':
              break;
            default:
              throw 'unreachable, why='+why;
          }

          let parentType = path.parentPath.node.type;
          if (['FunctionExpression', 'BlockStatement', 'FunctionDeclaration', 'Program', 'SwitchCase'].includes(parentType)) {
            // Parent is already some kind of block, no need to wrap it again...
            path.insertBefore(
              t.expressionStatement(
                t.callExpression(
                  t.identifier('HF_STMT'),
                  [
                    t.numericLiteral(fid),
                    t.numericLiteral(nid),
                    t.stringLiteral(why),
                    t.arrayExpression(contextStack.map(nid => t.numericLiteral(nid))), // TODO: tmp for debugging
                  ]
                )
              )
            );
          } else if (path.node.type === 'BlockStatement') {
            // Inject the call as the first statement of this Block instead, and don't add another Block wrapper.
            // Arguably we could omit this one if the block is non-empty...
            path.node.body.unshift(
              t.expressionStatement(
                t.callExpression(
                  t.identifier('HF_STMT'),
                  [
                    t.numericLiteral(fid),
                    t.numericLiteral(nid),
                    t.stringLiteral(why),
                    t.arrayExpression(contextStack.map(nid => t.numericLiteral(nid))), // TODO: tmp for debugging
                  ]
                )
              )
            );
          } else {
            path.replaceWith(
              t.blockStatement(
                [
                  t.expressionStatement(
                    t.callExpression(
                      t.identifier('HF_STMT'),
                      [
                        t.numericLiteral(fid),
                        t.numericLiteral(nid),
                        t.stringLiteral(why),
                        t.arrayExpression(contextStack.map(nid => t.numericLiteral(nid))), // TODO: tmp for debugging
                      ]
                    )
                  ),
                  path.node,
                ]
              )
            );
          }

          path.skip(); // dont recurse the newly injected node (this is why we use `exit()`)
        }
      });
    };

    let decl = (why) => {
      if (typeof why !== 'string') throw new Error('api fail');
      return ({
        enter(path) {
          if (why === 'F') { // function decl
            let firstToken = tokenMap.get(path.node.start);
            let funcid = firstToken.nid;
            if (!funcid) funcid = firstToken.nid = ++uid;
            contextStack.push(funcid);
          }
        },
        exit(path) {
          // Ignore var declarations embedded in for-headers
          if (
            // TODO: when would the lhs node not be equal if the parent type is a For node? I think we can drop those checks
            (path.parentPath.type === 'ForStatement' && path.node === path.parentPath.node.init) ||
            ((path.parentPath.type === 'ForInStatement' || path.parentPath.type === 'ForOfStatement') && path.node === path.parentPath.node.left)
          ) return;

          let firstToken = tokenMap.get(path.node.start);
          let nid = firstToken.nid;
          if (!nid) nid = firstToken.nid = ++uid;

          // Same token can be the start of multiple nodes (ie. Program and the first Statement)
          // In global the stack is empty. We only care about functions here.
          // A function declaration should not add itself to its own context stack
          if (contextStack.length > (why === 'F' ? 1 : 0)) {
            firstToken.contextNids = contextStack.slice(why === 'F' ? 1 : 0);
          }

          if (why === 'F') { // function decl (only!)
            contextStack.pop();
          }

          // Hack to prevent pure components from breaking because Babel is careless about comments (wontfix)
          if (path.node.type === 'ClassDeclaration') {
            if (path.node.leadingComments) {
              replaceAutoModuleComment(path.node.leadingComments);
            }
            if (path.parentPath.node.type === 'ExportDefaultDeclaration') {
              replaceAutoModuleComment(path.parentPath.node.leadingComments);
            }
          }

          path.insertBefore(t.expressionStatement(
            t.callExpression(
              t.identifier('HF_DECL'),
              [
                t.numericLiteral(fid),
                t.numericLiteral(nid),
                t.stringLiteral(why),
                t.arrayExpression(contextStack.map(nid => t.numericLiteral(nid))), // TODO: tmp for debugging
              ]
            )
          ));
        }
      });
    };

    let func = (why) => ({
      enter(path) {
        // TODO: figure out the name and range of this function
        let firstToken = tokenMap.get(path.node.start);
        let funcid = firstToken.nid;
        if (!funcid) funcid = firstToken.nid = ++uid;
        contextStack.push(funcid);
      },
      exit() {
        contextStack.pop();
      }
    });

    function replaceAutoModuleComment(comments) {
      if (!comments) return;
      // Some of our classes might have an important `// @AutoPureComponent` pragma preceding them and Babel
      // will reattach that comment to the newly injected node (for whatever reason). This fixes that.
      comments.forEach((node, i) => {
        if (node.value.trim() === '@AutoPureComponent') {
          // The original comment is forced to precede the injected statement, but the new one sticks. *shrug*
          comments[i] = ({type: 'CommentLine', value: ' @AutoPureComponent'});
        }
      });

    }

    let ignore = path => {
      const node = path.node;
      // Scrub all tokens in range of this node
      let firstToken = tokenMap.get(node.start);
      let index = tokens.indexOf(firstToken);
      while (tokens[index] && tokens[index].start < node.end) {
        tokens[index].whitespace = true;
        ++index;
      }
    };

    return {
        name: 'babel-plugin-heatfiler',
        visitor: {
          Program: program,
          // Statements
          // These get wrapped in blocks, which should be safe for all statements
            // https://github.com/estree/estree/blob/master/es5.md
            IfStatement: stmt('i'),
            WhileStatement: stmt('w'),
            DoWhileStatement: stmt('d'),
            ForStatement: stmt('f'),
            ForInStatement: stmt('fi'),
            ReturnStatement: stmt('r'),
            DebuggerStatement: stmt('D'),
            EmptyStatement: stmt('e'),
            WithStatement: stmt('W'),
            ExpressionStatement: stmt('E'), // maybe skip this in favor of expression... or just in output
            BlockStatement: stmt('b'), // Should only target actual stand-alone blocks (not part of function, try, etc)
            LabeledStatement: stmt('l'), // TODO: confirm scoping rules are okay with the block wrapper
            BreakStatement: stmt('B'),
            ContinueStatement: stmt('c'),
            SwitchStatement: stmt('s'),
            // TODO: case / default, must make sure lexical scoping does not break
            TryStatement: stmt('t'),
            ThrowStatement: stmt('T'),
            // https://github.com/estree/estree/blob/master/es2015.md
            ForOfStatement: stmt('fo'),
          // Declarations
          // These are not safe to wrap in blocks due to lexical scoping, however, these should not occur
          // in places where a block is necessary anyways so prefixing them with a counter should be ok.
          // Exception: function declarations can appear in some of these cases. But why.
            FunctionDeclaration: decl('F'),
            VariableDeclaration: decl('V'),
            ClassDeclaration: decl('C'),
          // Other functions
            ArrowFunctionExpression: func('a'),
            FunctionExpression: func('e'),
            ObjectMethod: func('m'),
            ClassMethod: func('c'),
          // Semantic code things that can not execute like type annotations
            TypeAlias: ignore,
            TypeAnnotation: ignore,
            TypeCastExpression: ignore,
            TypeParameter: ignore,
            TypeParameterDeclaration: ignore,
            TypeParameterInstantiation: ignore,
            TypeofTypeAnnotation: ignore,
        },
    };
}

