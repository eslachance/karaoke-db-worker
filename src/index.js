import { Router, error, json } from 'itty-router';
import { createCors } from 'itty-cors'

const { preflight, corsify } = createCors({
  // GET is included by default... omit this if only using GET
  // methods: ['GET', 'POST', 'DELETE'],
  origins: ['https://remkar.pages.dev', 'http://localhost:5173'],
  maxAge: 3600,
});

export default {
  async fetch(request, env, ctx) {
    if (!env.__router) {

      const router = Router();
      router
        .all('*', preflight)

      router.get('/', async (request) => {
        console.log("request launched");
        return new Response('home');
      });

      router.get('/song/:id', async ({ params }) => {
        console.log(params.id);
        const { results: files } = await env.DB.prepare(
          'SELECT * FROM files WHERE songid = ?;'
        )
          .bind(Number.parseInt(params.id)).all();
        const { results } = await env.DB.prepare(
          'SELECT * FROM songs WHERE id = ?;'
        )
          .bind(Number.parseInt(params.id)).run();
        return json({
          song: results[0],
          files
        });
      });

      router.get('/search/:query', async ({ params }) => {
        const { results } = await env.DB.prepare(
          "SELECT * FROM songs WHERE hash LIKE ?;"
        )
          .bind(`%${params.query}%`).all();
        return json(results.slice(0, 100));
      });

      // 404 for everything else
      router.all('*', () => new Response('Not Found.', { status: 404 }));
      env.__router = router;
    }

    return env.__router.handle(request).then(corsify);
  },
};
