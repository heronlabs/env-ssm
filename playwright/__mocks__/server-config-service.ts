import {createServer} from 'node:http';

import {AwsFactory} from '../../bin/src/main';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/config') {
    void (async () => {
      try {
        const singleSecret = await AwsFactory.make()
          .getConfigService()
          .getOrThrow('SINGLE_SECRET');

        res.writeHead(200, {'content-type': 'application/json'});

        res.end(JSON.stringify({singleSecret}));
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
