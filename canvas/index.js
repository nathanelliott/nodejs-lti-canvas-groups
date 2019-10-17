'use strict';

const request = require('request');
const NodeCache = require('node-cache');

/* This module handles communication between LTI Application and Canvas, using Canvas API V1. */
/* It requires an API Token, which can be generated from inside Canvas settings.              */
/* This token should be put in Azure Application Settings Key "canvasApiAccessToken".         */
/* The Uri to the Canvas API for your installation goes into Key "canvasApiPath".             */

const apiPath = process.env.canvasApiPath;
const apiBearerToken = process.env.canvasApiAccessToken;

const CACHE_TTL = 5 * 60;
const CACHE_CHECK_EXPIRE = 30 * 60;

/* Cache the results of API calls for a shorter period, to ease the load on API servers */
/* and make load time bearable for the user.                                            */

const courseGroupsCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const groupCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const memberCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const userCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });

// Get groups for a specified course.
exports.getCourseGroups = async (courseId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = courseGroupsCache.get(courseId, true);

    console.log("[Cache] Using found courseGroupsCache entry for courseId " + courseId + ".");
    resolve(cachedData);
  }
  catch (err) {
    console.log("[API] GET " + apiPath + "/courses/" + courseId + "/groups");

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
        console.log("[API] Error: " + error);
  
        let err = new Error("Error from API.");
        err.status = 500;
  
        reject(err);
      }
      else if (result.statusCode !== 200) {
        console.log("[API] Status: " + result.statusCode);
  
        let err = new Error("Non-OK status code returned from API.");
        err.status = result.statusCode;
  
        reject(err);
      }
      else {
        courseGroupsCache.set(courseId, data);

        console.log("[Cache] Data cached for " + CACHE_TTL / 60 + " minutes: " + JSON.stringify(data));
        console.log("[Cache] Statistics: " + JSON.stringify(courseGroupsCache.getStats()));
        console.log("[Cache] Keys: " + courseGroupsCache.keys());

        resolve(data);
      }
    });
  }
});

// Get members for a specified group.
exports.getGroupMembers = async (groupId) => new Promise(function(resolve, reject) {
  console.log("[API] GET " + apiPath + "/groups/" + groupId + "/memberships");

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
      console.log("[API] Error: " + error);

      let err = new Error("Error from API.");
      err.status = 500;

      reject(err);
    }
    else if (result.statusCode !== 200) {
      console.log("[API] Status: " + result.statusCode);

      let err = new Error("Non-OK status code returned from API.");
      err.status = result.statusCode;

      reject(err);
    }
    else {
      resolve(data);
    }
  });
});

// Get details about a specified user.
exports.getUser = async (userId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = userCache.get(userId, true);

    console.log("[Cache] Using found NodeCache entry for userId " + userId + ".");
    resolve(cachedData);
  }
  catch {
    console.log("[API] GET " + apiPath + "/users/" + userId);
  
    request.get({
      url: apiPath + "/users/" + userId,
      json: true,
      headers: {
        "User-Agent": "Chalmers/Azure/Request",
        "Authorization": "Bearer " + apiBearerToken
      }
    }, 
    (error, result, data) => {
      if (error) {
        console.log("[API] Error: " + error);
  
        let err = new Error("Error from API.");
        err.status = 500;
  
        reject(err);
      }
      else if (result.statusCode !== 200) {
        console.log("[API] Status: " + result.statusCode);
  
        let err = new Error("Non-OK status code returned from API.");
        err.status = result.statusCode;
  
        reject(err);
      }
      else {
        userCache.set(userId, data);

        console.log("[Cache] Data cached for " + CACHE_TTL / 60 + " minutes: " + JSON.stringify(data));
        console.log("[Cache] Statistics: " + JSON.stringify(userCache.getStats()));
        console.log("[Cache] Keys: " + userCache.keys());
  
        resolve(data);
      }
    });
  }
});
