import { parse as parseCookies, serialize as serializeCookies } from 'cookie';

export const createSessionsMiddleware = () => ({
  sessionPreflight: async (request, env) => {
    env.__sessions = env.__sessions || new Map();
    
    request.cookieJar = [];
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    
    // attempt to retrieve an existing session if possible
    request.session = env.__sessions.get(cookies?.session);

    if (!request.session) {
      const sessionID = crypto.randomUUID();
      request.session = {}
      env.__sessions.set(sessionID, request.session);
      request.cookieJar.push(
        serializeCookies('session', sessionID, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 365 * 10,
        })
      );
    }

    // request.session should exist by this point
    request.session.destroy = () => {
      const cookies = parseCookies(request.headers.get('Cookie') || '');
      env.__sessions.delete(cookies.session);
      request.cookieJar.push(
        serializeCookies('session', '', {
          httpOnly: true,
          secure: false,
          path: '/',
          sameSite: 'strict',
          maxAge: 0,
        })
      );
    }
  },    

  sessionify: async (response, request, env, ctx) => {
    if (!response) {
      throw new Error('No fetch handler responded and no upstream to proxy to specified.');
    }
    const { headers, status, body } = response;
    const existingHeaders = Object.fromEntries(headers);
    const cookies = request.cookieJar.join('; ');

    // TODO: ctx.waitUntil(env.DB call to persist)

    return new Response(body, {
      status,
      headers: {
        ...existingHeaders,
        'set-cookie': cookies,
        'content-type': headers.get('content-type'),
      },
    });
  },
})