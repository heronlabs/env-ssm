import {createServer} from 'node:http';

import {SsmConfigFactory} from '../../../bin/src/main.js';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/config') {
    void (async () => {
      try {
        const value = await SsmConfigFactory.make().getOrThrow('SINGLE_SECRET');
        res.writeHead(200, {'content-type': 'application/json'});
        res.end(JSON.stringify({value}));
      } catch (error) {
        res.writeHead(500, {'content-type': 'application/json'});
        res.end(JSON.stringify({error: (error as Error).message}));
      }
    })();
    return;
  }

  res.writeHead(404).end();
});

server.listen(Number(process.env.PORT));
