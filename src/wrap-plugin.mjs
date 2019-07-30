// Note: keep this file browser friendly. No node.js specific imports.
// Wrap each statement/declaration/expression in function calls that count execution occurrences

// v1: This approach prefixes comments to each node in the source code which are later extrapolated to html tags to --show

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

    uid = 0;

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

                let fid = options.fid;
                let nid = ++uid;
                path.node.expando_nid = nid;

                if (options.target === 'show') {
                    if (!path.node.leadingComments) path.node.leadingComments = [];
                    path.node.leadingComments.push({
                        type: "CommentBlock",
                        value: '@@span id="nid' + nid + '"@@',
                    });
                    // if (!path.node.trailingComments) path.node.trailingComments = [];
                    // path.node.trailingComments.push({
                    //     type: "CommentBlock",
                    //     value: "@@/span@@",
                    // });
                }

                if (options.target === 'run') {
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
                    path.skip(); // dont recurse the newly injected node (this is why we use `exit()`)
                }
            }
        });
    };

    let decl = (why) => {
        if (typeof why !== 'string') throw new Error('api fail');
        return ({
            exit(path) {
                // Ignore var declarations embedded in for-headers
                if (
                  (path.parentPath.type === 'ForStatement' && path.node === path.parentPath.node.init) ||
                  ((path.parentPath.type === 'ForInStatement' || path.parentPath.type === 'ForOfStatement') && path.node === path.parentPath.node.left)
                ) return;

                let fid = options.fid;
                let nid = ++uid;
                path.node.expando_nid = nid;

                if (options.target === 'show') {
                    if (!path.node.leadingComments) path.node.leadingComments = [];
                    path.node.leadingComments.push({
                        type: "CommentBlock",
                        value: '@@span id="nid' + nid + '"@@',
                    });
                    // if (!path.node.trailingComments) path.node.trailingComments = [];
                    // path.node.trailingComments.push({
                    //     type: "CommentBlock",
                    //     value: '@@/span@@',
                    // });
                }
                if (options.target === 'run') {
                    path.insertBefore(
                      t.expressionStatement(
                        t.callExpression(
                          t.identifier('HF_DECL'),
                          [
                            t.numericLiteral(fid),
                            t.numericLiteral(nid),
                            t.stringLiteral(why),
                          ]
                        )
                      )
                    );
                }
            }
        });
    };

    return {
        name: 'babel-plugin-wa-cleanup',
        visitor: {
            // Program: path => console.log(path.parent.tokens[0]),
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
            WithStatement: stmt('w'),
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
            FunctionDeclaration: decl('f'),
            VariableDeclaration: decl('v'),
            ClassDeclaration: decl('c'),
        },
    };
}

