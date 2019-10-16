'use strict';

const lti = require('ims-lti');

/* LTI Consumer Keys and Secrets go into Azure Configuration Key "ltiConsumerKeys", */
/* with format "consumer:secret[,consumer2:secret2]".                               */

// MemoryStore shouldn't be used in production. Timestamps must be valid within a 5 minute grace period.
// const nonceStore = new lti.Stores.MemoryStore();
const nonceStore = new lti.Stores.NonceStore();

// secrets should be stored securely in a production app
var secrets = [];
const consumerKeys = process.env.ltiConsumerKeys;

if (consumerKeys && secrets.length == 0) {
  consumerKeys.split(',').forEach(consumerKey => {
    secrets.push({ 
      "consumerKey": consumerKey.split(':')[0], 
      "secret": consumerKey.split(':')[1] 
    });

    console.log("Added Consumer: " + consumerKey.split(':')[0]);
  });
}

const getSecret = (consumerKey, callback) => {
  secrets.forEach(secret => {
    console.log("Checking for consumer '" + consumerKey + "' in '" + secret.consumerKey + "'.");

    if (secret.consumerKey == consumerKey) {
      console.log("Found a match, returning to callback with secret.");

      return callback(null, secret.secret);
    }
  });

  let err = new Error(`Unknown consumer ${consumerKey}`);
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

    console.log("Setting up provider for consumer " + consumerKey);
    const provider = new lti.Provider(consumerKey, consumerSecret, nonceStore, lti.HMAC_SHA1);

    console.log("Provider object: " + JSON.stringify(provider));

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

          return res.redirect(301, '/groups');
        });
      } else {
        return next(err);
      }
    });
  });
};
