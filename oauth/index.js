'use strict';

const axios = require('axios');

const clientId = "125230000000000040";
const clientSecret = "UyNraHQO8sTho8lMddO03Fl1QCKjObwgy500ligLnZXiFTa6FjAlLqksEOpB3uz9";
const clientRedirectUri = "https://cth-lti-canvas-groups-development.azurewebsites.net/oauth/redirect";
const providerBaseUri = "https://chalmers.test.instructure.com";
const providerLoginUri = providerBaseUri + "/login/oauth2/auth?client_id=" + clientId + "&response_type=code&state=RANDOM123&redirect_uri=" + clientRedirectUri;

exports.providerLogin = (response) => {
    console.log("Redirecting to OAuth URI: " + providerLoginUri);
    return response.redirect(providerLoginUri);
};

exports.providerRequestToken = (request, response, onsuccess) => {
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
        .then((response) => {
            console.log("Response: " + JSON.stringify(response));

            const tokenData = {
                access_token: response.data.access_token,
                token_type: response.data.token_type,
                refresh_token: response.data.refresh_token,
                expires_at_utc: new Date(Date.now() + (response.data.expires_in * 1000))
            };

            request.session.token = tokenData;
            console.log("Got token: " + JSON.stringify(request.session.token.access_token));
        })
        .catch((error) => {
            throw(new Error("Error during POST: " + error));
        });

        console.log("Redirecting to " + onsuccess);
        response.redirect(onsuccess);
    }
};

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
            response.redirect('/groups');
        })
        .catch((error) => {
            console.log("Error during token Refresh POST: " + error);
        }); 
    }
};
