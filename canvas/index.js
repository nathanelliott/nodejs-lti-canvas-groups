'use strict';

const request = require('request');

const apiPath = "https://chalmers.instructure.com/api/v1";
const apiBearerToken = process.env.canvasApiAccessToken;

getCourseGroups = (courseId) => {
  request.get({
    url: apiPath + "/courses/" + courseid + "/groups",
    json: true,
    headers: {
      "User-Agent": "Chalmers/Azure/Request",
      "Authorization": "Bearer " + apiBearerToken
    }
  }, (error, result, data) => {
    if (error) {
      console.log("Error: " + error);
    }
    else if (result.statusCode !== 200) {
      console.log("Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = 500;
      return callback(err);
    }
    else {
      console.log("OK, data: " + JSON.stringify(data));
      return data;
    }
  });
};

