import express from 'express';
import open from 'open';
import bodyParser from 'body-parser';
import { Issuer, generators, TokenSet, BaseClient } from 'openid-client';
import fetch from 'node-fetch';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
(() => {
	const HOST: string = '127.0.0.1';
	const PORT: number = 3000;
	const app: express.Express = express();
	const codeVerifier: string = generators.codeVerifier();
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	const issuer: Issuer<BaseClient> = new Issuer({
		issuer: 'https://twitter.com',
		authorization_endpoint: 'https://twitter.com/i/oauth2/authorize',
		token_endpoint: 'https://api.twitter.com/2/oauth2/token',
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
				fetch('https://api.twitter.com/2/users/me', {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${sessionToken.access_token}`,
					},
				})
					.then(res => res.json())
					.then(data => {
						res.send(data);
					});
				return;
			}
			const codeChallenge = generators.codeChallenge(codeVerifier);
			const state = generators.state();
			const url = client.authorizationUrl({
				redirect_uri: `http://${HOST}:${PORT}/cb`,
				response_type: 'code',
				scope: req.query.scope as string,
				state,
				code_challenge: codeChallenge,
				code_challenge_method: 'S256',
			});
			sessionState = state;
			sessionCodeVerifier = codeVerifier;
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

	app.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, '/index.html'));
	});

	app.listen(PORT, () => {
		console.log(`App listening on PORT ${PORT}`);
	});

	open(`http://${HOST}:${PORT}/`);
})();
