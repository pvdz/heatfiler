// these functions only help for ui.js
var gebi = function(id) { return document.getElementById(id); };
var qs = function(q){
  return document.querySelector(q);
};
var qsa = function(q){
  var c = document.querySelectorAll(q);
  return Array.prototype.slice.call(c, 0);
};
var maybe = function(id){ return gebi(id) || {}; };
var del = function(id){
  var e = gebi(id);
  if (e) e.parentNode.removeChild(e);
};

var modeButton = function(key, id, func){
  var li = gebi(id);
  var input = li.querySelector('input');
  var label = li.querySelector('label');
  input.onclick = function(e){ if (e.target === input) setTimeout(function(){ // timeout prevents bubbles from canceling each other
    ui[key] = !ui[key];
    input.checked = !!ui[key];
    li.className = ui[key] ? 'on' : 'off';
    if (func) func();
    else ui.applyStats();
  },10); };
  input.checked = !!ui[key];
  li.className = ui[key] ? 'on' : 'off';
};

var addScript = function(str){
  var e = document.createElement('script');
  e.textContent = str;
  document.body.appendChild(e);
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

var parseFiles = function(str){
  return str
    .split('\n')
    .filter(function(s){
      return !/^\s*$/.test(s);
    })
    .map(function(s){
      return s.replace(/^\s*(\+|-)?\s*/, '$1').replace(/\s*$/, '').replace(/^(\+|-)$/, '');
    })
    .filter(function(s){
      return !!s;
    });
};

var bignums = function(count){
  if (count) {
    if (count > 1000000) count = (Math.round(count/100000)/10)+'M';
    else if (count > 1000) count = (Math.round(count/100)/10)+'K';
  } else {
    count = 0;
  }
  return count;
};
var percent = function(n, m){
  return (Math.round((n / m)*10000)/100) || 0;
};
var bignumsn = function(n, m){
  if (n === 0) return 'never';
  return bignums(n, m);
};

var fetch = function(files, func, contents){
  if (files.length) {
    if (!contents) contents = [];
    var received = 0;
    files.forEach(function(s, index){
      if (contents[index] === undefined) {
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
      } else {
        ++received; // already have it
        if (received === files.length) {
          func(files, contents);
        }
      }
    });
  } else {
    func(files, []);
  }
};

var prevBlack = function(tree, index){
  --index;
  while (tree[index] && tree[index].type === WHITE) --index;
  return tree[index];
};
var nextBlack = function(tree, index){
  ++index;
  while (tree[index] && tree[index].type === WHITE) ++index;
  return tree[index];
};
var funcNameFrom = function(tree, uid){
  // get the name
  var name = 'anonymous';
  var tok = nextBlack(tree, +uid);
  if (tok && tok.value !== '(') {
    name = tok.value;
  } else {
    tok = prevBlack(tree, +uid);
    if (tok && (tok.value === '=' || tok.value === ':')) {
      tok = prevBlack(tree, tok.white);
      if (tok) name = tok.value;
    }
  }
  return name;
};
