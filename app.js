'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const lti = require('./lti');
const canvasApi = require('./canvas');

const port = process.env.PORT || 3000;

// this express server should be secured/hardened for production use
const app = express();

app.set('view engine', 'pug');

// memory store shouldn't be used in production
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev',
  resave: false,
  saveUninitialized: true,
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

app.set('json spaces', 2);

app.enable('trust proxy');

app.get('/', (req, res, next) => {
  return res.send({status: 'Up'});
});

app.get('/application', (req, res, next) => {
  if (req.session.userId) {
    return res.render('index', {
      email: req.session.email,
      username: req.session.username,
      fullname: req.session.fullname,
      ltiConsumer: req.session.ltiConsumer,
      userId: req.session.userId,
      isInstructor: req.session.isInstructor,
      contextId: req.session.contextId,
      rawProvider: req.session.rawProvider,
      rawSession: JSON.stringify(req.session)
    })
  }
  else {
    next(new Error('Session invalid. Please login via LTI to use this application.'));
  }
});

app.get('/groups', (request, result, next) => {
  /* request.session.userId = 1234;
  request.session.canvasCourseId = 1508;
  request.session.contextTitle = "LOCAL_TEST_COURSE"; */

  if (request.session.userId && request.session.canvasCourseId) {
    canvasApi.getCourseGroups(request.session.canvasCourseId, function(error, data) {
      if (error) {
        next(error);
      }
      else {
        return result.render('groups', {
          fullname: request.session.fullname,
          userId: request.session.userId,
          courseId: request.session.canvasCourseId,
          contextTitle: request.session.contextTitle,
          apiData: data,
          rawApiData: JSON.stringify(data)
        });
      }
    });
  }
  else {
    next(new Error('Session invalid. Please login via LTI to use this application.'));
  }
});

app.post('/launch_lti', lti.handleLaunch);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
