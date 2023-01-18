import fetch from 'node-fetch';
require('dotenv').config();

const sleep = (time: number) =>
	new Promise(resolve => setTimeout(resolve, time * 1000));

type DeviceResponse = {
	device_code: string;
	user_code: string;
	verification_url: string;
	expires_in: number;
	interval: number;
};

type OauthResponse = {
	access_token: string;
	token_type: string;
	scope: string;
};

(async () => {
	const clientId = process.env.CLIENT_ID;
	const deviceCode: string = await fetch(
		`https://github.com/login/device/code?client_id=${clientId}&scope=`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
			},
		}
	)
		.then(res => res.json())
		.then(data => {
			console.log('request to login/device/code');
			console.log(data);
			return (data as DeviceResponse).device_code;
		});

	await sleep(60);

	const accessToken: string = await fetch(
		`https://github.com/login/oauth/access_token?client_id=${clientId}&device_code=${deviceCode}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
		{
			method: 'POST',
			headers: {
				Accept: 'application/json',
			},
		}
	)
		.then(res => res.json())
		.then(data => {
			console.log('request to login/oauth/access_token');
			console.log(data);
			return (data as OauthResponse).access_token;
		});

	fetch('https://api.github.com/user', {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.then(res => res.json())
		.then(data => {
			console.log('request to /user');
			console.log(data);
		});
})();
