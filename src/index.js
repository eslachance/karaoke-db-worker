import { Router } from 'itty-router';

export default {
	async fetch(request, env) {
		if (!env.__router) {
			const router = Router();
			// GET collection index
			router.get('/', () => new Response('index'));

			// GET item
			router.get('/get/:id', async ({ params }) => {
				console.log(params.id);
				const { results } = await env.DB.prepare(
					`SELECT * FROM songs WHERE id = ?;`
				)
					.bind(parseInt(params.id, 10)).all();
				console.log(results);
				return new Response(JSON.stringify(results[0]));
			});

			router.get('/search/:query', async ({ params }) => {
				const { results } = await env.DB.prepare(
					`SELECT * FROM songs WHERE hash LIKE ?;`
				)
					.bind(`%${params.query}%`).all();
				console.log(results);
				return new Response(JSON.stringify(results));
			});

			router.get('/all', async () => {
				const { results } = await env.DB.prepare(
					`SELECT * FROM songs;`
				).all();
				console.log(results);
				return new Response(`Karaoke Search: ${JSON.stringify(results)}`);
			});

			// 404 for everything else
			router.all('*', () => new Response('Not Found.', { status: 404 }));
			env.__router = router;
		}

		return env.__router.handle(request);
	},
};
