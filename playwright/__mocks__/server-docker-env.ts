import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';

async function main() {
  const env = new Map<string, string>();

  for (const line of readFileSync('__mocks__/.env.docker', 'utf8').split(
    '\n',
  )) {
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');

    env.set(line.slice(0, separator), line.slice(separator + 1));
  }

  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/config') {
      res.writeHead(200, {'content-type': 'application/json'});

      res.end(
        JSON.stringify({
          DATABASE_URL: env.get('DATABASE_URL'),
          API_KEY: env.get('API_KEY'),
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
