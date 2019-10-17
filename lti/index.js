'use strict';

const lti = require('ims-lti');
const NodeCache = require('node-cache');
const nodeCacheNonceStore = require('../node-cache-nonce');

const myCache = new NodeCache();
const nonceStore = new nodeCacheNonceStore(myCache);

/* LTI Consumer Keys and Secrets go into Azure Configuration Key "ltiConsumerKeys", */
/* with format "consumer:secret[,consumer2:secret2]".                               */

const consumerKeys = process.env.ltiConsumerKeys;
var secrets = [];

const getSecret = (consumerKey, callback) => {
  if (consumerKeys && secrets.length == 0) {
    for (const key of consumerKeys.split(',')) {
      secrets.push({ 
        "consumerKey": key.split(':')[0], 
        "secret": key.split(':')[1] 
      });

      console.log("Added consumer key for '" + key.split(':')[0] + "'.");
    }
  }

  for (const secret of secrets) {
    if (secret.consumerKey == consumerKey) {
      return callback(null, secret.secret);
    }
  }

  let err = new Error("Unknown consumer '" + consumerKey + "'.");
  err.status = 403;

  return callback(err);
};

exports.handleLaunch = (req, res, next) => {
  if (!req.body) {
    let err = new Error('Expected a body');
    err.status = 400;
    return next(err);
  }

  const consumerKey = req.body.oauth_consumer_key;
  if (!consumerKey) {
    let err = new Error('Expected a consumer');
    err.status = 422;
    return next(err);
  }

  getSecret(consumerKey, (err, consumerSecret) => {
    if (err) {
      return next(err);
    }

    const provider = new lti.Provider(consumerKey, consumerSecret, nonceStore, lti.HMAC_SHA1);
    
    provider.valid_request(req, (err, isValid) => {
      if (err) {
        return next(err);
      }
      if (isValid) {
        req.session.regenerate(err => {
          if (err) next(err);
          req.session.email = provider.body.lis_person_contact_email_primary;
          req.session.contextId = provider.context_id;
          req.session.contextTitle = provider.context_title;
          req.session.userId = provider.userId;
          req.session.username = provider.username;
          req.session.fullname = provider.lis_person_name_family;
          req.session.ltiConsumer = provider.body.tool_consumer_instance_guid;
          req.session.isInstructor = provider.instructor === true;
          req.session.isAdmin = provider.admin === true;
          req.session.isAlumni = provider.alumni === true;
          req.session.isContentDeveloper = provider.content_developer === true;
          req.session.isGuest = provider.guest === true;
          req.session.isManager = provider.manager === true;
          req.session.isMentor = provider.mentor === true;
          req.session.isObserver = provider.observer === true;
          req.session.isStudent = provider.student === true;
          req.session.canvasUserId = provider.body.custom_canvas_user_id;
          req.session.canvasCourseId = provider.body.custom_canvas_course_id;
          req.session.canvasEnrollmentState = provider.body.custom_canvas_enrollment_state;
          req.session.rawProvider = JSON.stringify(provider);

          console.log("Provider object: " + JSON.stringify(provider));
          console.log("Redirecting 301 to /groups.");

          return res.redirect(301, '/groups');
        });
      } else {
        console.log("The request is NOT valid.");

        return next(err);
      }
    });
  });
};
