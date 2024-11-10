import BriteLite from 'britelite';
import type { IRequest } from 'itty-router';
import { AutoRouter, cors, withContent } from 'itty-router';
import { createSessionsMiddleware } from 'itty-session';
import D1Provider from 'itty-session/providers/d1';

// CORS HANDLERS
const { preflight, corsify } = cors({
  origin: ['https://remkar.pages.dev', 'http://localhost:5173', 'https://barlaremise.com'],
  maxAge: 3600,
});

// SESSION HANDLERS
const { sessionPreflight, sessionify } = createSessionsMiddleware({
  logging: true,
  Provider: D1Provider,
  providerOptions: {
    dbName: 'SESSIONS',
    tableName: 'sessions',
  }
});

// BRITELITE MIDDLEWARE
const addBriteLite = (request, env) => {
  request.britelite = new BriteLite({ name: 'users', db: env.DB });
};

type SessionRequest = {
  session: any; // TODO: define a Session class and add the type reference here
} & IRequest;

type CFArgs = [
  env: {
    DB: any; // TODO: set this to the correct reference
    SESSIONS: any; // TODO: set this to the correct reference
  },
];

// DEFINE ROUTER
const router = AutoRouter<SessionRequest, CFArgs>({
  before: [
    addBriteLite,
    preflight,
    sessionPreflight,
  ],
  finally: [corsify, sessionify],
});

router.get('/api/song/:id', async ({ id }, env) => {
  const { results: files } = await env.DB.prepare('SELECT * FROM files WHERE songid = ?;')
    .bind(Number.parseInt(id))
    .all();
  const { results } = await env.DB.prepare('SELECT * FROM songs WHERE id = ?;')
    .bind(Number.parseInt(id))
    .run();

  return {
    song: results[0],
    files,
  };
});

router.get('/api/search/:query', async ({ params }, env) => {
  const { results } = await env.DB.prepare('SELECT * FROM songs WHERE hash LIKE ?;')
    .bind(`%${params.query}%`)
    .all();
  return results.slice(0, 100);
});

router.post('/api/login', withContent, async (request) => {
  const { content, britelite } = request;
  const user = await britelite.get(content.username);
  if (!user) {
    return { message: 'username not found' };
  }
  if (user.password !== content.password) {
    return { message: 'wrong password' };
  }
  request.session.username = user.username;
  request.session.isAdmin = user.isAdmin;
  request.session.name = user.name;
  request.session.avatar = user.avatar;
  request.session.isLoggedIn = true;

  return {
    success: true,
    message: 'logged in',
    user: {
      username: user.username,
      avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
      role: 'admin',
      isLoggedIn: true,
    },
  };
});

router.get('/api/me', (request) => {
  if (!request.session?.isLoggedIn) {
    return { message: 'not logged in', isLoggedIn: false };
  }

  return {
    username: request.session?.username,
    name: request.session?.name,
    avatar: request.session?.avatar,
    isAdmin: request.session?.isAdmin,
    isLoggedIn: true,
  };
});

router.get('/api/logout', async (request) => {
  request.session.username = null;
  request.session.isLoggedIn = false;
  request.session?.destroy(request);

  return {
    success: true,
    message: 'logged out',
  };
});

router.post('/api/signup', withContent, async (request) => {
  return {
    success: false,
    message: 'not implemented',
  }
  // const { content, britelite } = request;
  // const user = await britelite.get(content.username);
  // if (user) {
  //   return { message: 'username already exists' };
  // }
  // await britelite.set(content.username, {
  //   username: content.username,
  //   password: content.password,
  // });
  // request.session.username = content.username;
  // request.session.isLoggedIn = true;

  // return {
  //   username: request.session?.username,
  //   avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
  //   role: 'admin',
  //   isLoggedIn: true,
  // };
});

export default router;
