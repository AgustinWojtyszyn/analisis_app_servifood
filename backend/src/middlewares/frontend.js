import express from 'express';
import path from 'path';

// The HTML and its hashed assets must belong to the same deployment.
const HTML_CACHE_CONTROL = 'no-cache, max-age=0, must-revalidate';

export function createFrontendRouter(distPath) {
  const router = express.Router();
  router.use(express.static(distPath, {
    setHeaders(res, filePath) {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
      }
    }
  }));

  router.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();

    // Never serve the SPA shell or cache a missing asset as HTML.
    if (path.extname(req.path)) {
      return res.status(404).set('Cache-Control', 'no-store').type('text/plain').send('Not Found');
    }

    return res.sendFile(path.join(distPath, 'index.html'), {
      headers: { 'Cache-Control': HTML_CACHE_CONTROL }
    });
  });

  return router;
}
