use serde::{Deserialize, Serialize};
use serde_json::Number;
#[tokio::main]
async fn main() {
    let client_id = dotenv::var("CLIENT_ID").unwrap();
    let client = reqwest::Client::new();
    let device_code: String = get_device_code(&client_id, &client).await;

    tokio::time::sleep(tokio::time::Duration::from_millis(60000)).await;

    println!("{:?}", device_code);

    let access_token: String = get_access_token(&client_id, &device_code, &client).await;

    println!("{:?}", access_token);

    let bearer: String = String::new() + "Bearer " + &access_token;
    println!("{:?}", bearer);
    let res: String = client
        .get("https://api.github.com/user")
        .header(reqwest::header::AUTHORIZATION, bearer)
        .header(reqwest::header::ACCEPT, "application/json")
        .header(reqwest::header::USER_AGENT, "oauth2-practice")
        .send()
        .await
        .expect("")
        .text()
        .await
        .expect("text err");
    println!("{:?}", res);
}

async fn get_device_code(client_id: &str, client: &reqwest::Client) -> String {
    let url: String = String::new()
        + "https://github.com/login/device/code?client_id="
        + &client_id
        + "&scope=user";
    let codes: DeviceCode = client
        .post(&url)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .expect("")
        .json::<DeviceCode>()
        .await
        .expect("json err");

    println!("{:?}", codes.user_code);
    codes.device_code
}

async fn get_access_token(client_id: &str, device_code: &str, client: &reqwest::Client) -> String {
    let url: String = String::new()
        + "https://github.com/login/oauth/access_token?client_id="
        + &client_id
        + "&device_code="
        + &device_code
        + "&grant_type=urn:ietf:params:oauth:grant-type:device_code";
    let access_token: String = client
        .post(url)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .expect("")
        .json::<AccessToken>()
        .await
        .expect("json err")
        .access_token;
    access_token
}

#[derive(Serialize, Deserialize)]
pub struct DeviceCode {
    pub device_code: String,
    pub expires_in: Number,
    pub interval: Number,
    pub user_code: String,
    pub verification_uri: String,
}
#[derive(Serialize, Deserialize)]
pub struct AccessToken {
    pub access_token: String,
    pub token_type: String,
    pub scope: String,
}
