import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import { createFrontendRouter } from '../src/middlewares/frontend.js';

test('frontend HTML revalidates and missing build assets never return HTML', async (t) => {
  const dist = await mkdtemp(path.join(tmpdir(), 'servifood-frontend-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await mkdir(path.join(dist, 'assets'));
  await writeFile(path.join(dist, 'index.html'), '<!doctype html><link rel="stylesheet" href="/assets/current.css">');
  await writeFile(path.join(dist, 'assets/current.css'), 'body { color: navy; }');
  await writeFile(path.join(dist, 'assets/current.js'), 'export default true;');
  const app = express();
  app.use(createFrontendRouter(dist));
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;

  for (const route of ['/', '/index.html', '/login', '/gestion-interna']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-cache, max-age=0, must-revalidate');
    assert.match(await response.text(), /current\.css/);
    const conditional = await fetch(base + route, { headers: { 'If-None-Match': response.headers.get('etag'), 'Cache-Control': 'max-age=0' } });
    assert.equal(conditional.status, 304);
    assert.match(conditional.headers.get('cache-control'), /must-revalidate/);
  }
  for (const [file, mime] of [['current.css', /text\/css/], ['current.js', /javascript/]]) {
    const response = await fetch(`${base}/assets/${file}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), mime);
  }
  for (const file of ['previous.css', 'previous.js']) {
    const response = await fetch(`${base}/assets/${file}`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), 'Not Found');
  }
  const api = await fetch(`${base}/api/missing`);
  assert.equal(api.status, 404);
  assert.deepEqual(await api.json(), { error: 'Ruta no encontrada' });
});
