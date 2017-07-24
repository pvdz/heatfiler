/**
 * Unit test the line numbers of tokens generated from
 * {@link Par.js}.
 */
QUnit.test( "Parser Line Number Tests", function( assert ) {
    var oracle = {
        'todos.js': {lineCount: 272},
        'warship.js': {lineCount: 366},
        'game.js': {lineCount: 720},
        'es5-shim.min.js': {lineCount: 7},
        'es5-shim.js': {lineCount: 2068},
        'openpgp.min.js': {lineCount: 10},
        'cryptico.min.js': {lineCount: 107}
    };

    var countEntries  = Object.keys(oracle).length;
    assert.expect(countEntries);
    var done = assert.async(countEntries);

    var options = {saveTokens:true, createBlackStream: true};
    Array.prototype.slice.call(document.querySelectorAll('script'), 0).forEach(function(e){
        var type = e.getAttribute('heat-filer-type');
        if (type !== 'profile' || !e.src) {
            return;
        }

        var fileName = e.src;
        var lastIndex = fileName.lastIndexOf('/');
        if(lastIndex !== -1){
            fileName = fileName.slice(lastIndex + 1);
        }

        var parseAndAssert = function(error, srcCode){
            if(error){
                throw error;
                return;
            }

            var tokens = Par.parse(srcCode, options).tok.tokens;
            var countTokens = tokens.length;
            assert.ok(oracle[fileName].lineCount === tokens[countTokens - 1].line, 'Number of lines for ' + fileName);
            done();
        };

        if (e.src) {
            GET(e.src, parseAndAssert);
        }
    });

});