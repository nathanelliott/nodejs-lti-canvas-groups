'use strict';

const axios = require('axios');
const canvas = require('../canvas');
const db = require('../db');

const clientRedirectUri = "https://" + process.env.WEBSITE_HOSTNAME + "/oauth/redirect";
const clientId = process.env.oauthClientId ? process.env.oauthClientId : "125230000000000040";
const clientSecret = process.env.oauthClientSecret ? process.env.oauthClientSecret : "UyNraHQO8sTho8lMddO03Fl1QCKjObwgy500ligLnZXiFTa6FjAlLqksEOpB3uz9";
const clientState = process.env.oauthClientState ? process.env.oauthClientState : (process.env.COMPUTERNAME ? process.env.COMPUTERNAME : "C2D7938F027A5FD7A7076CA7");
const providerBaseUri = canvas.providerBaseUri;
const providerLoginUri = providerBaseUri + "/login/oauth2/auth?client_id=" + clientId + "&response_type=code&state=" + clientState + "&redirect_uri=" + clientRedirectUri;

exports.providerLogin = () => {
    if (providerLoginUri) {
        console.log("Redirecting to OAuth URI: " + providerLoginUri);
        return providerLoginUri;
    }
    else {
        throw(new Error("No configured URI for OAuth provider login."));
    }
};

exports.providerRequestToken = async (request) => new Promise(function(resolve, reject) {
    const requestToken = request.query.code;
    console.log("Request token: " + requestToken);

    if (request.session.userId && request.session.canvasCourseId) {
        console.log("POST to get OAuth Token.");
        axios({
            method: 'post',
            url: providerBaseUri + "/login/oauth2/token",
            data: {
                grant_type: "authorization_code",
                client_id: clientId,
                client_secret: clientSecret,
                code: requestToken
            }
        })
        .then(async (response) => {
            console.log("Response: " + JSON.stringify(response.data));

            const tokenData = {
                access_token: response.data.access_token,
                token_type: response.data.token_type,
                refresh_token: response.data.refresh_token,
                expires_in: response.data.expires_in,
                expires_at_utc: new Date(Date.now() + (response.data.expires_in * 1000))
            };

            console.log("Got token data: " + JSON.stringify(tokenData));

            db.setClientData(request.session.userId, canvas.providerEnvironment, tokenData.access_token, tokenData.refresh_token, tokenData.expires_at_utc)
            .then(() => {
                resolve(tokenData);
            })
            .catch((error) => {
                reject(error);
            })
        })
        .catch((error) => {
            reject(new Error("Error during POST: " + error));
        });
    }
    else {
        reject(new Error("LTI session is not valid."));
    }
});

exports.providerRefreshToken = (request) => {
    if (request.session.userId && request.session.canvasCourseId) {
        axios({
            method: 'post',
            url: providerBaseUri + "/login/oauth2/token",
            data: {
                grant_type: "refresh_token",
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: request.session.token.refresh_token
            }
        })
        .then((response) => {
            request.session.token.access_token = response.data.access_token;
            request.session.token.expires_in = response.data.expires_in;
            request.session.token.expires_at_utc = new Date(Date.now() + (response.data.expires_in * 1000));

            db.setClientData(
                request.session.userId, 
                canvas.providerEnvironment, 
                request.session.token.access_token, 
                request.session.token.refresh_token, 
                request.session.token.expires_at_utc
            )
            .then(() => {
                console.log("Refreshed token: " + JSON.stringify(request.session.token) + ", expires: " + request.session.token.expires_at_utc);

            })
            .catch((error) => {
                console.log("Error during token database store: " + error);
            })
        })
        .catch((error) => {
            console.log("Error during token Refresh POST: " + error);
        }); 
    }
};
