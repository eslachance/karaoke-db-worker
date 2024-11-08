import BriteLite from 'britelite'
import { AutoRouter, cors, IRequest, json, withContent, type RequestHandler } from 'itty-router'
import { createSessionsMiddleware } from './itty-session'

// INSPECTOR
const inspector = (message) => (request, env) => {
  console.log(message, '>', 'request.session is', request.session)
  console.log(message, '>', 'env is', env)
  console.log(message, '>', 'env.__session is', env.__session)
}

// CORS HANDLERS
const { preflight, corsify } = cors({
  origin: ['https://remkar.pages.dev', 'http://localhost:5173', 'https://barlaremise.com'],
  // origin: '*',
  maxAge: 3600,
});

// SESSION HANDLERS
const { sessionPreflight, sessionify } = createSessionsMiddleware();

// BRITELITE MIDDLEWARE
const addBriteLite = (request, env) => {
  request.britelite = new BriteLite({ name: 'users', db: env.DB });
}

type SessionRequest = {
  session: any // TODO: define a Session class and add the type reference here
} & IRequest

type CFArgs = [
  env: {
    DB: any // TODO: set this to the correct reference
    __sessions: Map<string, Object>
  }
]

// DEFINE ROUTER
const router = AutoRouter<SessionRequest, CFArgs>({
  before: [
    addBriteLite,
    // inspector('before preflight'), // optional inspector/logging
    preflight, 
    // inspector('after preflight'),  // optional inspector/logging
    sessionPreflight,
    // inspector('after sessionPreflight'),  // optional inspector/logging
  ],
  finally: [
    corsify, 
    sessionify,
  ],          
});

// ADD ROUTES
router.get('/song/:id', async ({ id }, env) => {
  const { results: files } = await env.DB.prepare(
    'SELECT * FROM files WHERE songid = ?;'
  )
    .bind(Number.parseInt(id)).all();
  const { results } = await env.DB.prepare(
    'SELECT * FROM songs WHERE id = ?;'
  )
    .bind(Number.parseInt(id)).run();

  return {
    song: results[0],
    files
  };
});

router.get('/search/:query', async ({ query }, env) => {
  const { results } = await env.DB.prepare(
    "SELECT * FROM songs WHERE hash LIKE ?;"
  )
    .bind(`%${query}%`).all();
  return results.slice(0, 100);
});

router.post('/login', withContent, async (request) => {
  const { content, britelite } = request
  console.log(content);
  const user = await britelite.get(content.username);
  if (!user) {
    return { message: 'username not found' };
  }
  if (user.password !== content.password) {
    return { message: 'wrong password' };
  }
  request.session.username = user.username;
  request.session.isLoggedIn = true;

  return {
    success: true,
    message: 'logged in',
    user: {
      username: user.username,
      avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
      role: 'admin',
      isLoggedIn: true,
    }
  };
});

router.get('/me', (request) => {
  if (!request.session?.isLoggedIn) {
    return { message: 'not logged in' };
  }

  return {
    username: request.session?.username,
    avatar: 'https://avatars.githubusercontent.com/u/1019278?v=4',
    role: 'admin',
    isLoggedIn: true,
  };
});

router.get('/logout', async (request) => {
  request.session.username = null;
  request.session.isLoggedIn = false;
  request.session?.destroy(request)

  return {
    success: true,
    message: 'logged out',
  };
});

router.post('/signup', withContent, async (request) => {
  const { content, britelite } = request
  const user = await britelite.get(content.username);
  if (user) {
    return json({ message: 'username already exists' });
  }
  await britelite.set(content.username, {
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

router.get('/sessions', (request, env) => env.__sessions.entries());

router.get('/sessions/clear', async (request, env) => {
  await env.__sessions.clear();

  return {
    success: true,
    message: 'sessions cleared',
  };
});

export default router