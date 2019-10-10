'use strict';

const request = require('request');

const apiPath = "https://chalmers.instructure.com/api/v1";
const apiBearerToken = process.env.canvasApiAccessToken;

exports.getGroupMembers = (groupId, callback) => {
}

exports.getCourseEnrollments = (courseId, callback) => {
} 

exports.getCourseGroups = (courseId, callback) => {
  console.log("GET " + apiPath + "/courses/" + courseId + "/groups");

  request.get({
    url: apiPath + "/courses/" + courseId + "/groups",
    json: true,
    headers: {
      "User-Agent": "Chalmers/Azure/Request",
      "Authorization": "Bearer " + apiBearerToken
    }
  }, (error, result, data) => {
    if (error) {
      console.log("Error: " + error);

      let err = new Error("Error from API.");
      err.status = 500;

      callback(err);
    }
    else if (result.statusCode !== 200) {
      console.log("Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = result.statusCode;

      callback(err);
    }
    else {
      console.log("OK, data: " + JSON.stringify(data));
      callback(null, data);
    }
  });
};
