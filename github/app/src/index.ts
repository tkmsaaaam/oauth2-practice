import fetch from 'node-fetch';
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

(async () => {
	const now = Math.floor(Date.now() / 1000);
	const jwtPayload = {
		iat: now,
		exp: now + 60 * 10 - 30,
		iss: process.env.APP_ID,
	};
	const jwtSecret = fs.readFileSync('private-key.pem');
	const jwtOptions = {
		algorithm: 'RS256',
	};

	const token = jwt.sign(jwtPayload, jwtSecret, jwtOptions);

	console.log(
		`request to /app/installations/${process.env.INSTALL_ID}/access_tokens`
	);
	const accessTokenRes = await fetch(
		`https://api.github.com/app/installations/${process.env.INSTALL_ID}/access_tokens`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
			},
		}
	).then(res => res.json());
	console.log(accessTokenRes);

	const accessToken = accessTokenRes.token;
	if (!process.env.REPOS) return;
	const repos = process.env.REPOS;

	for (const repo of repos.split(',')) {
		console.log(`request to /repos/${process.env.OWNER}/${repo}`);
		const repoOwnereRepo1 = await fetch(
			`https://api.github.com/repos/${process.env.OWNER}/${repo}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/vnd.github+json',
				},
			}
		).then(res => res.json());
		console.log(repoOwnereRepo1);
	}
})();
