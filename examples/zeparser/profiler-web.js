// Simple test script for my profiler (http://github.com/qfox/heatfiler)

// Open HeatFiler (/heatfiler/src/). Go to "Run Code". Enter these files in the textarea:

// -../../zeparser2/src/uni.js
// +../../zeparser2/src/tok.js
// +../../zeparser2/src/par.js
// -../../zeparser2/src/profiler.js

// Either run them in the same tab or use local storage. Doesn't really matter.
// You can do the same while running the test suite to get test coverage.
// This file is just a bootstrap that kicks off the actual parsing.

function get(url, callback){
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
}

var file = '../../gonzales/data/sources/jquery.js';
//var file = '../../gonzales/data/sources/8mb-benchmark.js';

get(file, function(err, txt){
  if (!err) Par.parse(txt);
});
