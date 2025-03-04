import Fastify from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import Enmap from 'enmap';
import cors from '@fastify/cors';
import singersRoutes from './singers/index.js';

// Initialize Enmap for users
const users = new Enmap({ name: 'users' });
const songs = new Enmap({ name: 'songs' });
const files = new Enmap({ name: 'files' });

const fastify = Fastify({
  logger: true
});

// Register plugins
await fastify.register(cors, {
  origin: ['https://remkar.pages.dev', 'http://localhost:5173', 'https://barlaremise.com'],
  maxAge: 3600,
});

await fastify.register(fastifyCookie);
await fastify.register(fastifySession, {
  secret: 'a-secret-key-that-should-be-in-env-vars',
  cookie: {
    secure: process.env.NODE_ENV === 'production'
  }
});

// Routes
fastify.get('/api/song/:id', async (request, reply) => {
  const { id } = request.params;

  const song = await songs.get(id);
  if (!song) {
    return reply.status(404).send({ error: 'Song not found' });
  }
  
  return {
    song,
    files: await files.get(id),
  };
});

fastify.get('/api/search/:query', async (request) => {
  const { query } = request.params;
  const page = request.query.page || 1;
  
  const results = []; // await db.query...
  
  return {
    results: results.slice((page - 1) * 25, page * 25),
    total: results.length,
    page,
  };
});

fastify.post('/api/login', async (request, reply) => {
  const { username, password } = request.body;
  
  const user = await users.get(username);
  if (!user) {
    return { message: 'username not found' };
  }
  
  if (user.password !== password) {
    return { message: 'wrong password' };
  }

  request.session.user = {
    username: user.username,
    isAdmin: user.isAdmin,
    name: user.name,
    avatar: user.avatar,
    isLoggedIn: true
  };

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

fastify.get('/api/me', async (request) => {
  const user = request.session.user;
  if (!user?.isLoggedIn) {
    return { message: 'not logged in', isLoggedIn: false };
  }

  return {
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    isLoggedIn: true,
  };
});

fastify.get('/api/logout', async (request, reply) => {
  request.session.destroy();
  return {
    success: true,
    message: 'logged out',
  };
});

// Register singers routes
fastify.register(singersRoutes, { prefix: '/api/singers' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: 'Internal Server Error' });
});

// Start the server
const start = async () => {
  try {
    console.log("Starting fastify server on port", process.env.PORT || 3000);
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export default fastify;
