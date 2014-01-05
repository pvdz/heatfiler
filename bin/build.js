#!/usr/bin/env node

console.log("Building...");

var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname+'/..');

var libFiles = [
  'lib/uni.js',
  'lib/tok.js',
  'lib/par.js',
  'src/transformer.js',
  'src/heatfiler.js',
];

console.log("concatting all files...");
var all = libFiles.map(function(f){
  console.log('- '+f);
  var source = fs.readFileSync(root+'/'+f).toString('utf8');
  return '\n//######### '+f+' #########\n\n'+source+'\n\n//######### end of '+f+' #########\n\n';
}).join('');

console.log('Writing build to build/heatfiler-build.js');
fs.writeFileSync(root+'/build/heatfiler-build.js', all);

console.log('Done!');
