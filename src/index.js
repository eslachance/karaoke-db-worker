import { Router, json, cors, withContent } from 'itty-router';
import { createSessionsMiddleware } from 'itty-session';
import BriteLite from 'britelite';

const { preflight, corsify } = cors({
  origin: ['https://remkar.pages.dev', 'http://localhost:5173', 'https://barlaremise.com'],
  // origin: '*',
  maxAge: 3600,
});

export default {
  async fetch(request, env, ctx) {
    const { sessionPreflight, destroy, sessionify } = await createSessionsMiddleware(env, env.DB);
    const db = new BriteLite({ name: 'users', db: env.DB });

    if (!env.__router) {

      const router = Router({
        before: [preflight, sessionPreflight],  // 
        finally: [corsify, sessionify],   // , 
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

      router.post('/login', withContent, async ({ content }) => {
        console.log(content);
        const user = await db.get(content.username);
        if (!user) {
          return json({ message: 'username not found' });
        }
        if (user.password !== content.password) {
          return json({ message: 'wrong password' });
        }
        request.session.username = user.username;
        request.session.isLoggedIn = true;
        return json({
          success: true,
          message: 'logged in',
          user: {
            username: user.username,
            avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
            role: 'admin',
            isLoggedIn: true,
          }
        });
      });

      router.get('/me', () => {
        if (!request.session?.isLoggedIn) {
          return json({ message: 'not logged in' });
        }
        return json({
          username: request.session?.username,
          avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
          role: 'admin',
          isLoggedIn: true,
        });
      });

      router.get('/logout', async () => {
        request.session.username = null;
        request.session.isLoggedIn = false;
        await destroy(request);
        return json({
          success: true,
          message: 'logged out',
        });
      });

      router.post('/signup', withContent, async ({ content }) => {
        const user = await db.get(content.username);
        if (user) {
          return json({ message: 'username already exists' });
        }
        await db.set(content.username, {
          username: content.username,
          password: content.password,
        });
        request.session.username = content.username;
        request.session.isLoggedIn = true;
        return json({
          username: request.session?.username,
          avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
          role: 'admin',
          isLoggedIn: true,
        });
      });

      router.get('/sessions', async () => {
        const data = await env.__sessions.entries();
        console.log(data);
        return json(data);
      });

      router.get('/sessions/clear', async () => {
        await env.__sessions.clear();
        return json({
          success: true,
          message: 'sessions cleared',
        });
      });

      // 404 for everything else
      router.all('*', () => new Response('Not Found.', { status: 404 }));
      env.__router = router;
    }

    return env.__router.fetch(request);
  },
};
