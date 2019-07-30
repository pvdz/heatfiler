// This mini server is able to serve the heatfiler html, js, and stats through a GET.
// It is also able to receive the stats through a POST.
// TODO: keep stats in memory, don't write it to disk...

import http from 'http';
import fs from 'fs';
import path from 'path';

const requestHandler = (request, response) => {
  console.group('New request!');
  console.log(request.url);
  if ([
    '/favicon.ico',
    '/robots.txt',
  ].includes(request.url.trim())) return response.end('404');

  if (request.method === 'GET') {
    console.log('GET', request.url.trim());
    console.log('Setting headers');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST');
    response.setHeader('Access-Control-Allow-Headers', '*');

    let code = '';
    switch (request.url.trim()) {
      case '/index.html':
        response.setHeader('content-type', 'text/html'); // browsers wont show html without this ;)
        code = fs.readFileSync(path.resolve('./src/index_new.html'));
        break;
      case '/index.mjs':
        response.setHeader('content-type', 'text/javascript'); // required per spec
        code = fs.readFileSync('./src/index.mjs');
        break;
      case '/data.view.js':
        response.setHeader('content-type', 'text/javascript'); // required per spec
        code = fs.readFileSync('./data.view.js');
        break;
      default:
        // Can probably pipe this more efficiently :p
        code = fs.readFileSync('./stats.js');
    }

    response.end(code);
    console.log('end of GET, sent', code.length, 'bytes');
    console.groupEnd();
  } else if (request.method === 'POST') {
    console.log('POST');
    // Can probably pipe the content directly to file but a little worried about abuse/problems. TBD.
    let info = '';
    request.on('data', function(data) {
      info += data;
    });

    request.on('end', function() {
      fs.writeFileSync('./stats.js', 'HF_UPDATE(' + info + ');');
      console.log('Updated', path.resolve('./stats.js'), ', size =', info.length);

      console.log('Setting headers');
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Request-Method', '*');
      response.setHeader('Access-Control-Allow-Methods', 'POST');
      response.setHeader('Access-Control-Allow-Headers', '*');

      response.end('Thanks');
      console.log('end of POST');
      console.groupEnd();
    });
    console.log('Waiting for all data...');
  } else {
    throw new Error('Unknown request method: ' + request.method);
  }
};

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
