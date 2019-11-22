'use strict';

const pkg = require('./package.json');
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const oauth = require('./oauth');
const canvas = require('./canvas');
const lti = require('./lti');
const db = require('./db');

const port = process.env.PORT || 3000;
const fileStoreOptions = {};

// Setup database
db.setupDatabase().then(console.log("Database initialized.")).catch(function(error) { console.error("Setting up database: " + error)});

// this express server should be secured/hardened for production use
const app = express();

// secure express server
app.use(helmet({
  frameguard: false
}));

app.disable('X-Powered-By');

// set view engine∏
app.set('view engine', 'pug');

// memory store shouldn't be used in production
app.use(session({
  store: new FileStore(fileStoreOptions),
  secret: process.env.SESSION_SECRET || 'c8Vbe1',
  name: 'ltiSession',
  resave: false,
  saveUninitialized: true,
  ttl: 43200 // 12h
}));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

app.set('json spaces', 2);
app.enable('trust proxy');

app.get('/', (req, res, next) => {
  return res.send({status: 'Up'});
});

app.get('/oauth', (request, response, next) => {
  try {
    return response.redirect(oauth.providerLogin());    
  }
  catch (error) {
    next(error);
  }
});

app.get('/oauth/redirect', async (request, response, next) => {
  try {
    request.session.token = await oauth.providerRequestToken(request);
    await db.updateUserToken(request.session.userId, request.session.token.access_token)
    console.log("Written data to session: " + JSON.stringify(request.session.token));
    console.log("Redirecting to /groups");
    response.redirect('/groups');
  }
  catch (error) {
    console.log("Error during token exchange in app.js: " + error);
    next(error);
  }
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
      const data = await canvas.compileGroupsData(request.session.canvasCourseId, request.session);
      data.statistics.name = pkg.name;
      data.statistics.version = pkg.version;
      
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

app.get('/csv/category/:id', async (request, result, next) => {
  if (request.session.userId && request.session.canvasCourseId) {
    try {
      const id = request.params.id;

      if (id > 0) {
        const data = await canvas.compileCategoryGroupsData(id, request.session);
  
        console.log("[JSON Result] " + JSON.stringify(data));
    
        result.setHeader("Content-Disposition", "attachment; filename=canvas-groups-category-" + id + ".csv");
        result.set("Content-Type", "text/csv");
  
        let csvData = "Group\tStudent\tEmail address\r\n";
  
        for (const group of data.categories[0].groups) {
          for (const user of group.users) {
            csvData = csvData + group.name + "\t" + user.sortableName + "\t" + user.email + "\r\n";
          }
        }
  
        console.log("Returning: " + csvData);
  
        return result.status(200).end(csvData);
      }
      else {
        throw(new Error("Category id missing."));
      }
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

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  process.exit(1); //mandatory (as per the Node docs)
});
