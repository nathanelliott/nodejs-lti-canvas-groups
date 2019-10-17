'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const lti = require('./lti');
const canvasApi = require('./canvas');

const port = process.env.PORT || 3000;
const fileStoreOptions = {};

// this express server should be secured/hardened for production use
const app = express();

// secure express server
app.use(helmet({
  frameguard: false
}));

app.disable('X-Powered-By');

// set view engine
app.set('view engine', 'pug');

// memory store shouldn't be used in production
app.use(session({
  store: new FileStore(fileStoreOptions),
  secret: process.env.SESSION_SECRET || 'c8Vbe1',
  name: 'ltiSession',
  resave: false,
  saveUninitialized: true
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

app.get('/groups', async (request, result, next) => { 
  if (request.session.userId && request.session.canvasCourseId) {
    try {
      const data = await canvasApi.compileGroupsData(request.session.canvasCourseId, request.session);
      console.log("[JSON Result] " + JSON.stringify(data));  
      return result.render('groups', data);  
    }
    catch (error) {
      next(new Error(error));
    }
  }
  else {
    next(new Error('The session is invalid. Please login via LTI to use this application.'));
  }
});

app.get('/csv/category/:id', async function (request, result) {
  if (request.session.userId && request.session.canvasCourseId) {
    try {
      const id = request.params.id;
      const data = await canvasApi.compileCategoryGroupsData(id, request.session);
  
      console.log("[JSON Result] " + JSON.stringify(data));
  
      result.setHeader("Content-Disposition", "attachment; filename=canvas-groups-" + id + ".csv");
      result.set("Content-Type", "text/csv");
      return result.status(200).end(JSON.stringify(data));
    }
    catch (error) {
      next(new Error(error));
    }
  }
  else {
    next(new Error('The session is invalid. Please login via LTI to use this application.'));
  }
});

app.post('/launch_lti', lti.handleLaunch);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
