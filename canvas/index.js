'use strict';

const request = require('request');
const NodeCache = require('node-cache');

/* This module handles communication between LTI Application and Canvas, using Canvas API V1. */
/* It requires an API Token, which can be generated from inside Canvas settings.              */
/* This token should be put in Azure Application Settings Key "canvasApiAccessToken".         */
/* The Uri to the Canvas API for your installation goes into Key "canvasApiPath".             */

const apiPath = process.env.canvasApiPath;
const apiBearerToken = process.env.canvasApiAccessToken;

const CACHE_TTL = 15 * 60;
const CACHE_CHECK_EXPIRE = 30 * 60;

/* Cache the results of API calls for a shorter period, to ease the load on API servers */
/* and make load time bearable for the user.                                            */

const courseGroupsCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const groupCategoriesCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const categoryGroupsCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const memberCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });
const userCache = new NodeCache({ errorOnMissing:true, stdTTL: CACHE_TTL, checkperiod: CACHE_CHECK_EXPIRE });

courseGroupsCache.on('expired', function(key) {
  console.log("[Cache] Expired NodeCache entry for courseGroupsCache key '" + key + "'.");
});
groupCategoriesCache.on('expired', function(key) {
  console.log("[Cache] Expired NodeCache entry for groupCategoriesCache key '" + key + "'.");
});
categoryGroupsCache.on('expired', function(key) {
  console.log("[Cache] Expired NodeCache entry for categoryGroupsCache key '" + key + "'.");
});
memberCache.on('expired', function(key) {
  console.log("[Cache] Expired NodeCache entry for memberCache key '" + key + "'.");
});
userCache.on('expired', function(key) {
  console.log("[Cache] Expired NodeCache entry for userCachekey '" + key + "'.");
});

// Compile category groups data for CSV export
exports.compileCategoryGroupsData = async (categoryId) => new Promise(async function(resolve, reject) {
  var hrstart = process.hrtime();
  var categoriesWithGroups = new Array();
  var groupsWithMembers = new Array();

  console.log("[API] GetCategoryGroups()");

  // Get data about each group in this category.
  await canvasApi.getCategoryGroups(category.id).then(async function (groupsData) {
    for (const group of groupsData) {
      var membersWithDetails = new Array();

      console.log("[API] GetGroupMembers()");

      // Get data about each member in the group.
      await canvasApi.getGroupMembers(group.id).then(async function (membersData) {
        for (const member of membersData) {
          console.log("[API] GetUser()");

          // Get more data like name about each member.
          await canvasApi.getUser(member.user_id).then(async function (user) {
            membersWithDetails.push({
              userId: member.user_id,
              workflowState: member.workflow_state,
              isModerator: member.moderator,
              name: user.name,
              sortableName: user.sortable_name,
              email: user.email,
              avatarUrl: user.avatar_url
            });
          })
          .catch(function (error) {
            reject(error);
          });
        }
      })
      .catch(function (error) {
        reject(error);
      });

      groupsWithMembers.push({ 
        id: group.id,
        name: group.name,
        description: group.description,
        category_id: group.group_category_id,
        members: membersWithDetails
      });
    }
  })
  .catch(function(error) {
    reject(error);
  });

  categoriesWithGroups.push({
    id: category.id,
    name: category.name,
    groups: groupsWithMembers
  });

  // Measure time it took to process.
  var hrend = process.hrtime(hrstart);

  // Compile JSON that returns to view.
  let data = {
    user: {
      fullname: request.session.fullname,
      id: request.session.userId
    },
    categories: categoriesWithGroups,
    statistics: {
      running_s: hrend[0],
      running_ms: (hrend[1] / 1000000)
    }
  };

  resolve(data);
});

// Compile groups data
exports.compileGroupsData = async (canvasCourseId) => new Promise(async function(resolve, reject) {
  var hrstart = process.hrtime();
  var categoriesWithGroups = new Array();

  console.log("[API] GetGroupCategories()");

  await canvasApi.getGroupCategories(canvasCourseId).then(async function (categoriesData) {
    for (const category of categoriesData) {
      var groupsWithMembers = new Array();

      console.log("[API] GetCategoryGroups()");

      // Get data about each group in this category.
      await canvasApi.getCategoryGroups(category.id).then(async function (groupsData) {
        for (const group of groupsData) {
          var membersWithDetails = new Array();
  
          console.log("[API] GetGroupMembers()");
  
          // Get data about each member in the group.
          await canvasApi.getGroupMembers(group.id).then(async function (membersData) {
            for (const member of membersData) {
              console.log("[API] GetUser()");
  
              // Get more data like name about each member.
              await canvasApi.getUser(member.user_id).then(async function (user) {
                membersWithDetails.push({
                  userId: member.user_id,
                  workflowState: member.workflow_state,
                  isModerator: member.moderator,
                  name: user.name,
                  sortableName: user.sortable_name,
                  email: user.email,
                  avatarUrl: user.avatar_url
                });
              })
              .catch(function (error) {
                reject(error);
              });
            }
          })
          .catch(function (error) {
            reject(error);
          });
  
          groupsWithMembers.push({ 
            id: group.id,
            name: group.name,
            description: group.description,
            category_id: group.group_category_id,
            members: membersWithDetails
          });
        }
      })
      .catch(function(error) {
        reject(error);
      });

      categoriesWithGroups.push({
        id: category.id,
        name: category.name,
        groups: groupsWithMembers
      });
    }
  })
  .catch(function(error) {
    reject(error);   
  });

  // Measure time it took to process.
  var hrend = process.hrtime(hrstart);

  // Compile JSON that returns to view.
  let data = {
    user: {
      fullname: request.session.fullname,
      id: request.session.userId
    },
    course: {
      id: request.session.canvasCourseId,
      contextTitle: request.session.contextTitle,
      categories: categoriesWithGroups
    },
    statistics: {
      running_s: hrend[0],
      running_ms: (hrend[1] / 1000000)
    }
  };

  resolve(data);
});

// Get groups for a specified course.
exports.getCourseGroups = async (courseId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = courseGroupsCache.get(courseId, true);
    console.log("[Cache] Using found NodeCache entry for courseId " + courseId + ".");
    console.log("[Cache] Statistics: " + JSON.stringify(courseGroupsCache.getStats()));
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

// Get group categories for a specified course.
exports.getGroupCategories = async (courseId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = groupCategoriesCache.get(courseId, true);
    console.log("[Cache] Using found NodeCache entry for courseId " + courseId + ".");
    console.log("[Cache] Statistics: " + JSON.stringify(groupCategoriesCache.getStats()));
    resolve(cachedData);
  }
  catch {
    const thisPath = apiPath + "/courses/" + courseId + "/group_categories";
    console.log("[API] GET " + thisPath);

    request.get({
      url: thisPath,
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
        groupCategoriesCache.set(courseId, data);

        console.log("[Cache] Data cached for " + CACHE_TTL / 60 + " minutes: " + JSON.stringify(data));
        console.log("[Cache] Statistics: " + JSON.stringify(groupCategoriesCache.getStats()));
        console.log("[Cache] Keys: " + groupCategoriesCache.keys());

        resolve(data);
      }
    });
  }
});

// Get groups for a specified category.
exports.getCategoryGroups = async (categoryId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = categoryGroupsCache.get(categoryId, true);
    console.log("[Cache] Using found NodeCache entry for categoryId " + categoryId + ".");
    console.log("[Cache] Statistics: " + JSON.stringify(categoryGroupsCache.getStats()));
    resolve(cachedData);
  }
  catch {
    const thisPath = apiPath + "/group_categories/" + categoryId + "/groups";
    console.log("[API] GET " + thisPath);

    request.get({
      url: thisPath,
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
        categoryGroupsCache.set(categoryId, data);

        console.log("[Cache] Data cached for " + CACHE_TTL / 60 + " minutes: " + JSON.stringify(data));
        console.log("[Cache] Statistics: " + JSON.stringify(categoryGroupsCache.getStats()));
        console.log("[Cache] Keys: " + categoryGroupsCache.keys());

        resolve(data);
      }
    });
  }
});

// Get members for a specified group.
exports.getGroupMembers = async (groupId) => new Promise(function(resolve, reject) {
  try {
    const cachedData = memberCache.get(groupId, true);
    console.log("[Cache] Using found NodeCache entry for groupId " + groupId + ".");
    console.log("[Cache] Statistics: " + JSON.stringify(memberCache.getStats()));
    resolve(cachedData);
  }
  catch {
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
        memberCache.set(groupId, data);

        console.log("[Cache] Data cached for " + CACHE_TTL / 60 + " minutes: " + JSON.stringify(data));
        console.log("[Cache] Statistics: " + JSON.stringify(memberCache.getStats()));
        console.log("[Cache] Keys: " + memberCache.keys());

        resolve(data);
      }
    });
  }
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
