'use strict';

const request = require('request');

/* This module handles communication between LTI Application and Canvas, using Canvas API V1. */
/* It requires an API Token, which can be generated from inside Canvas settings.              */
/* This token should be put in Azure Application Settings Key "canvasApiAccessToken".         */

const apiPath = "https://chalmers.instructure.com/api/v1";
const apiBearerToken = process.env.canvasApiAccessToken;
var userCache = [];

// Get groups for a specified course.
exports.getCourseGroups = async (courseId) => new Promise(function(resolve, reject) {
  console.log("GET " + apiPath + "/courses/" + courseId + "/groups");

  request.get({
    url: apiPath + "/courses/" + courseId + "/groups",
    json: true,
    headers: {
      "User-Agent": "Chalmers/Azure/Request",
      "Authorization": "Bearer " + apiBearerToken
    }
  }, 
  (error, result, data) => {
    if (error) {
      console.log("Error: " + error);

      let err = new Error("Error from API.");
      err.status = 500;

      reject(err);
    }
    else if (result.statusCode !== 200) {
      console.log("Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = result.statusCode;

      reject(err);
    }
    else {
      console.log("OK, data: " + JSON.stringify(data));

      resolve(data);
    }
  });
});

// Get members for a specified group.
exports.getGroupMembers = async (groupId) => new Promise(function(resolve, reject) {
  console.log("GET " + apiPath + "/groups/" + groupId + "/memberships");

  request.get({
    url: apiPath + "/groups/" + groupId + "/memberships",
    json: true,
    headers: {
      "User-Agent": "Chalmers/Azure/Request",
      "Authorization": "Bearer " + apiBearerToken
    }
  }, 
  (error, result, data) => {
    if (error) {
      console.log("Error: " + error);

      let err = new Error("Error from API.");
      err.status = 500;

      reject(err);
    }
    else if (result.statusCode !== 200) {
      console.log("Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = result.statusCode;

      reject(err);
    }
    else {
      console.log("OK, data: " + JSON.stringify(data));

      resolve(data);
    }
  });
});

// Get details about a specified user.
exports.getUser = async (userID) => new Promise(function(resolve, reject) {
  console.log("GET " + apiPath + "/users/" + userID);

  userCache.forEach(entry => {
    if (entry.id == userID) {
      console.log("___getUser(): CACHE HIT!");

      resolve(entry);
    }
  });

  request.get({
    url: apiPath + "/users/" + userID,
    json: true,
    headers: {
      "User-Agent": "Chalmers/Azure/Request",
      "Authorization": "Bearer " + apiBearerToken
    }
  }, 
  (error, result, data) => {
    if (error) {
      console.log("Error: " + error);

      let err = new Error("Error from API.");
      err.status = 500;

      reject(err);
    }
    else if (result.statusCode !== 200) {
      console.log("Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = result.statusCode;

      reject(err);
    }
    else {
      console.log("OK, data: " + JSON.stringify(data));
      userCache.push(data);

      resolve(data);
    }
  });
});
