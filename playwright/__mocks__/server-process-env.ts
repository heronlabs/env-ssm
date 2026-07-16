import {createServer} from 'node:http';

import {CliFactory} from '../../bin/src/main';

async function main() {
  await CliFactory.make().getProcessEnvCommand().executeOrThrow('AWS_ENV_PATH');

  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/config') {
      res.writeHead(200, {'content-type': 'application/json'});

      res.end(
        JSON.stringify({
          DATABASE_URL: process.env.DATABASE_URL,
          API_KEY: process.env.API_KEY,
        }),
      );

      return;
    }

    res.writeHead(404).end();
  });

  server.listen(Number(process.env.PORT));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
