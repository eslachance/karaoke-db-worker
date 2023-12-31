import { Router } from 'itty-router';
import { createCors } from 'itty-cors'
const { preflight, corsify } = createCors({
	// GET is included by default... omit this if only using GET
	// methods: ['GET', 'POST', 'DELETE'],
	origins: ['https://remkar.pages.dev', 'http://localhost:5173'],
	maxAge: 3600,
});

export default {
	async fetch(request, env) {
		if (!env.__router) {

			const router = Router();
			router
				.all('*', preflight)
				.get('/version', () => corsify(json({ version: '0.1.0' })));

			// GET collection index
			router.get('/', () => new Response('index'));

			// GET item
			router.get('/get/:id', async ({ params }) => {
				console.log(params.id);
				const { results } = await env.DB.prepare(
					`SELECT * FROM songs WHERE id = ?;`
				)
					.bind(parseInt(params.id, 10)).all();
				return new Response(JSON.stringify(results[0]));
			});

			router.get('/search/:query', async ({ params }) => {
				const { results } = await env.DB.prepare(
					`SELECT * FROM songs WHERE hash LIKE ?;`
				)
					.bind(`%${params.query}%`).all();
				return new Response(JSON.stringify(results.slice(0, 100)));
			});

			// router.get('/all', async () => {
			// 	const { results } = await env.DB.prepare(
			// 		`SELECT * FROM songs;`
			// 	).all();
			// 	return new Response(`Karaoke Search: ${JSON.stringify(results)}`);
			// });

			// 404 for everything else
			router.all('*', () => new Response('Not Found.', { status: 404 }));
			env.__router = router;
		}

		return env.__router.handle(request).then(corsify);
	},
};
