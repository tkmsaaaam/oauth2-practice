import express from 'express';
import open from 'open';
import bodyParser from 'body-parser';
import { Issuer, generators, TokenSet, BaseClient } from 'openid-client';
import fetch from 'node-fetch';
import path from 'path';
require('dotenv').config();
(() => {
	const HOST: string = '127.0.0.1';
	const PORT: number = 3000;
	const app: express.Express = express();
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const issuer: Issuer<BaseClient> = new Issuer({
		issuer: 'https://github.com',
		authorization_endpoint: 'https://github.com/login/oauth/authorize',
		token_endpoint: 'https://github.com/login/oauth/access_token',
	});

	if (!process.env.CLIENT_ID) return;

	const client = new issuer.Client({
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
	});

	let sessionState: string;
	let sessionOriginalUrl: string;
	let sessionCodeVerifier: string;
	let sessionToken: TokenSet;

	app.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, '/index.html'));
	});

	app.post('/authorize', (req, res) => {
		(async () => {
			console.log(req.body.scope);
			const url = `http://${HOST}:${PORT}/scope?scope=${req.body.scope}`;
			return res.redirect(url);
		})();
	});

	app.get('/scope', (req, res, next) => {
		(async () => {
			if (sessionToken) {
				console.log(sessionToken.access_token);
				fetch('https://api.github.com/user', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${sessionToken.access_token}`,
					},
				})
					.then(apiRes => {
						return apiRes.json();
					})
					.then(data => {
						res.send(data);
					});
				return;
			}
			const state = generators.state();
			const url = client.authorizationUrl({
				redirect_uri: `http://${HOST}:${PORT}/cb`,
				scope: req.query.scope as string,
				state,
			});
			sessionState = state;
			sessionOriginalUrl = req.originalUrl;
			return res.redirect(url);
		})().catch(next);
	});

	app.get('/cb', (req, res, next) => {
		(async () => {
			if (!sessionState) {
				return res.status(403).send('NG');
			}
			const state = sessionState;
			const params = client.callbackParams(req);
			console.log(params);
			const tokenSet = await client.oauthCallback(
				`http://${HOST}:${PORT}/cb`,
				params,
				{ code_verifier: sessionCodeVerifier, state },
				{ exchangeBody: { client_id: process.env.CLIENT_ID } }
			);
			console.log('received and validated tokens %j', tokenSet);
			sessionToken = tokenSet;
			return res.redirect(sessionOriginalUrl);
		})().catch(next);
	});

	app.listen(PORT, () => {
		console.log(`App listening on PORT ${PORT}`);
	});

	open(`http://${HOST}:${PORT}/`);
})();
