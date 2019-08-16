// This mini server is able to serve the heatfiler html, js, and stats through a GET.
// It is also able to receive the stats through a POST.
// TODO: keep stats in memory, don't write it to disk...

import http from 'http';
import fs from 'fs';
import path from 'path';

let cache = new Map; // Map<{|date: number, data: string|}
let lastEnvId = '';

const BOLD = '\x1b[;1;1m';
const DIM = '\x1b[30;1m';
const BLINK = '\x1b[;5;1m';
const RESET = '\x1b[0m';

function requestHandler(request, response) {
  console.group('New '+BOLD+request.method+RESET+' request!');
  let crashed = true;
  try {
    _requestHandler(request, response);
    crashed = false;
  } finally {
    if (crashed) {
      console.log(BOLD + 'CRASH' + RESET, request.method, request.url);
      console.groupEnd();
    }
  }
}
function _requestHandler(request, response) {
  let output = [DIM + request.method + RESET, request.url];
  if ([
    '/favicon.ico',
    '/robots.txt',
  ].includes(request.url.trim())) {
    console.log([...output, BOLD + '404 duncare' + RESET].join(' :: '));
    response.end('404');
    console.groupEnd();
    return;
  }

  if (request.method === 'GET') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST');
    response.setHeader('Access-Control-Allow-Headers', '*');

    let code = '';
    switch (request.url.trim().split('?')[0]) {
      case '/index.html':
        output.push(BOLD + 'INDEX.HTML' + RESET);
        response.setHeader('content-type', 'text/html'); // browsers wont show html without this ;)
        code = fs.readFileSync(path.resolve('./src/index_new.html'));
        break;
      case '/index.mjs':
        output.push(BOLD + 'INDEX.MJS' + RESET);
        response.setHeader('content-type', 'text/javascript'); // required per spec
        code = fs.readFileSync('./src/index.mjs');
        break;
      case '/data.view.js':
        output.push(BOLD + 'DATA' + RESET);
        response.setHeader('content-type', 'text/javascript'); // required per spec
        code = fs.readFileSync('./data.view.js');
        break;
      case '/envs.js':
        output.push(BOLD + 'ENVS' + RESET);
        response.setHeader('content-type', 'text/javascript'); // required per spec
        let envs = Array.from(cache.keys()).sort((a, b) => cache.get(b).date - cache.get(a).date);
        code = 'envIds = ' + (cache.size ? '"' + envs.join(',') + '".split(",");' : '[]');
        break;
      default:
        let envId = request.url.split('?')[0].slice(1); // change `/Foo?bar` to `Foo`
        output.push(BOLD + 'STATS' + RESET, 'for ' + BOLD + envId + RESET);
        if (envId && cache.has(envId)) {
          code = cache.get(envId).data;
          if (!code) {
            console.log([...output, BOLD + '404 stop messing with me' + RESET].join(' :: '));
            response.end('404');
            console.groupEnd();
            return;
          }
        } else if (lastEnvId) {
          code = cache.get(lastEnvId).data;
          if (!code) {
            console.log([...output, BOLD + '404 env known but not set?' + RESET].join(' :: '));
            response.end('404');
            console.groupEnd();
            return;
          }
        } else {
          console.log([...output, BOLD + '404 env not known' + RESET].join(' :: '));
          response.end('404');
          console.groupEnd();
          return;
        }
    }

    response.end(code);
    output.push('sent ' + BOLD + code.length + RESET + ' bytes');
    console.log(output.join(' :: '));
    console.groupEnd();
  } else if (request.method === 'POST') {
    // Can probably pipe the content directly to file but a little worried about abuse/problems. TBD.
    let info = '';
    request.on('data', function(data) {
      info += data;
    });

    request.on('end', function() {
      if (!info) throw new Error('Did not receive any data?');
      const data = 'HF_UPDATE(' + info + ');';

      let envId = info.match(/,"envId":"([\w\d]+)"/);
      if (!envId) {
        throw new Error('Payload had no envId');
      }
      envId = envId[1];
      cache.set(envId, {date: Date.now(), data});
      lastEnvId = envId;
      output.push('Updated envId', BOLD + envId + RESET, ', size', BOLD + info.length + RESET);

      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Request-Method', '*');
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', '*');

      response.end('Thanks');
      console.log(output.join(' :: '));
      console.groupEnd();
    });
  } else {
    output.push(BLINK + 'UNSUPPORTED REQUEST METHOD' + RESET);
    console.log(output.join(' :: '));
    throw new Error('Unknown request method: ' + request.method);
  }
}

export function serve(port = 3000) {
  const server = http.createServer(requestHandler);

  server.listen(port, (err) => {
    if (err) {
      return console.log('something bad happened', err);
    }

    console.log('This is a server to _proxy_ HF stats data updates');
    console.log(`Server is listening on ${port} and has no other end points than its root`);
  });
};
