import express from 'express';
import open from 'open';
import bodyParser from 'body-parser';
import { Issuer, generators, TokenSet } from 'openid-client';
import fetch from 'node-fetch';
require('dotenv').config();
const HOST = '127.0.0.1';
const PORT = 3000;
const app: express.Express = express();
const codeVerifier = generators.codeVerifier();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const issuer = new Issuer({
	issuer: 'https://twitter.com',
	authorization_endpoint: 'https://twitter.com/i/oauth2/authorize',
	token_endpoint: 'https://api.twitter.com/2/oauth2/token',
});
const client = new issuer.Client({
	client_id: process.env.CLIENT_ID as string,
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
				.then(apiRes => {
					return apiRes.json();
				})
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
			{ code_verifier: codeVerifier, state },
			{ exchangeBody: { client_id: process.env.CLIENT_ID } }
		);
		console.log('received and validated tokens %j', tokenSet);
		sessionToken = tokenSet;
		return res.redirect(sessionOriginalUrl);
	})().catch(next);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
	console.log(`App listening on PORT ${PORT}`);
});

open(`http://${HOST}:${PORT}/`);