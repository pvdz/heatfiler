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
      tokens, // Array<{whitespace: bool, value: string, nids: Array<number> token: ?Token}>
    } = options;

    uid = 0;

    let tokenMap = new Map; // {"line:col": Token}

    let program = {
      // The tokens are only exposed on the File node, which is the parent of Program
      enter: path => {
        let babelTokens = path.parent.tokens; // requires `tokens = true` as babel parser options.
        let lastEnd = 0;
        babelTokens.forEach(token => {
          /*
          Token {
            type: TokenType { <meta data> },
            value: 'foo',
            start: 0,
            end: 3,
            loc: SourceLocation {
              start: Position { line: 1, column: 0 },
              end: Position { line: 1, column: 3 }
            }
          },
          */

          // Generate an offset -> token map so we can find the first token of a node
          // console.log('Recording', token.start, 'as', token);

          if (token.start === token.end) return; // dont care about non-value tokens... (hopefully)

          // Create a list of _all_ tokens so we can serialize the original code by just joining them
          if (token.start !== lastEnd) {
            // Add a token for any skipped whitespace or comment, which Babel would not preserve in this list
            let d = {start: lastEnd, whitespace: true, value: code.slice(lastEnd, token.start), nids: [], token: undefined};
            tokens.push(d);
            tokenMap.set(lastEnd, d);
          }
          // Note: not all tokens have a .value (like punctuators) so we just slice everything
          let d = {start: token.start, whitespace: token.type === 'CommentLine' || token.type === 'CommentBlock', value: code.slice(token.start, token.end), nids: [], token};
          tokens.push(d);
          tokenMap.set(token.start, d);
          lastEnd = token.end;
        });
        if (lastEnd < code.length) {
          // Trailing comment/whitespace
          let d = {start: lastEnd, whitespace: true, value: code.slice(lastEnd, code.length), nids: [], token: undefined};
          tokens.push(d);
          tokenMap.set(lastEnd, d);
        }
      }
    };

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
          if (t.isBlockStatement(path.node) && path.node.start === undefined) {
            // This is a block we just injected. Skip processing it.
            path.skip();
            return;
          }

          let nid = ++uid;

          let firstToken = tokenMap.get(path.node.start);
          if (path.node.start === undefined) console.dir(path.node, {depth: null})
          // Same token can be the start of multiple nodes (ie. Program and the first Statement)
          if (!firstToken.nids) firstToken.hfNids = [];
          firstToken.nids.push(nid);

          if (why === 'i' || why === 'w' || why === 'd') {
            // if-statement or while-loop
            // Log the stats to the keyword (in the future we'd want to have split results for expression (`if (a||b)`)
            path.node.test =
              t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.test]);
          } else if (why === 's') {
            // switch-statement
            path.node.discriminant =
              t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.discriminant]);
          } else if (why === 'f') {
            // for-statement
            // path.node.init =
            //   t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.init]);
            if (path.node.test) {
              path.node.test =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.test]);
            }
            if (path.node.update) {
              path.node.update =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.update]);
            }
          } else if (why === 'r') {
            // return-statement
            if (path.node.argument) {
              path.node.argument =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), path.node.argument]);
            } else {
              path.node.argument =
                t.callExpression(t.identifier('HF_EXPR'), [t.numericLiteral(fid), t.numericLiteral(nid), t.identifier('undefined')]);
            }
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
        exit(path) {
          // Ignore var declarations embedded in for-headers
          if (
            // TODO: when would the lhs node not be equal if the parent type is a For node? I think we can drop those checks
            (path.parentPath.type === 'ForStatement' && path.node === path.parentPath.node.init) ||
            ((path.parentPath.type === 'ForInStatement' || path.parentPath.type === 'ForOfStatement') && path.node === path.parentPath.node.left)
          ) return;

          let nid = ++uid;

          let firstToken = tokenMap.get(path.node.start);
          // Same token can be the start of multiple nodes (ie. Program and the first Statement)
          if (!firstToken.nids) firstToken.hfNids = [];
          firstToken.nids.push(nid);

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
              ]
            )
          ));
        }
      });
    };

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

