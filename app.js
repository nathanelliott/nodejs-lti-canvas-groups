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
const log = require('./log');
const db = require('./db');

const port = process.env.PORT || 3000;
const fileStoreOptions = {};
const cookieMaxAge = 3600000 * 12; // 12h

const adminUserIds = process.env.adminCanvasUserIds ? process.env.adminCanvasUserIds.split(",") : "";

// Setup database
db.setupDatabase().then(log.info("Database initialized.")).catch(function(error) { log.error("Setting up database: " + error)});

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
  saveUninitialized: false,
  rolling: true,
  cookie: { secure: true, httpOnly: false, maxAge: cookieMaxAge }
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
    log.info("Written data to session: " + JSON.stringify(request.session.token));
    log.info("Redirecting to /groups");
    response.redirect('/groups');
  }
  catch (error) {
    log.error("Error during token exchange in app.js: " + error);
    response.redirect('/error?text=Error during token exchange in app.js: ' + error);
  }
});

app.get('/error', (request, response, next) => {
  return response.render('error', {
    error: {
      text: request.param('text')
    },
    statistics: {
      name: pkg.name,
      version: pkg.version,
      pid: process.pid,
      ppid: process.ppid,
      resourceUsage: JSON.stringify(process.resourceUsage(), null, 2),
      versions: JSON.stringify(process.versions, null, 2)
    }
  });
});

app.get('/stats', async (request, response, next) => {
  if (adminUserIds.length && request.session.userId && adminUserIds.includes(request.session.userId)) {
    const authorizedUsers = await db.getAllClientsData();
    const cacheContents = await canvas.getCacheStat();

    return response.render('stats', {
      users: authorizedUsers,
      usersString: JSON.stringify(authorizedUsers, null, 2),
      caches: cacheContents,
      cachesString: JSON.stringify(cacheContents, null, 2),
      statistics: {
        name: pkg.name,
        version: pkg.version,
        pid: process.pid,
        ppid: process.ppid,
        resourceUsage: JSON.stringify(process.resourceUsage(), null, 2),
        versions: JSON.stringify(process.versions, null, 2)
      }
    });
  }
  else {
    next(new Error('Session invalid. Please login via LTI to use this application.'));
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
      const data = await canvas.compileGroupsData(request.session.canvasCourseId, request);
      data.statistics.name = pkg.name;
      data.statistics.version = pkg.version;
      
      return result.render('groups', data);  
    }
    catch (error) {
      log.error(error);

      if (error.response.status == 401) {
        try {
          return result.redirect(oauth.providerLogin());    
        }
        catch (error) {
          next(error);
        }
      }
      else {
        next(new Error(error));
      }
    }
  }
  else {
    return result.redirect('/error?text=Session is invalid. Please login via LTI in Canvas.'); 
  }
});

app.get('/csv/category/:id/:name', async (request, result, next) => {
  if (request.session.userId && request.session.canvasCourseId) {
    try {
      const id = request.params.id;
      const name = request.params.name;

      if (id > 0) {
        const data = await canvas.compileCategoryGroupsData(id, request);
  
        log.info("[JSON Result] " + JSON.stringify(data));
    
        result.setHeader("Content-Disposition", "attachment; filename=Canvas Groups " + name.replace(/[^a-zA-Z0-9\s]+/g, "-").replace(/[\-]+$/, "") + ".csv");
        result.set("Content-Type", "text/csv");
  
        let csvData = "\ufeffGroup;Student;Email address\r\n";
  
        for (const group of data.categories[0].groups) {
          for (const user of group.users) {
            csvData = csvData + "\"" + group.name + "\";\"" + user.sortableName + "\";\"" + user.email + "\"\r\n";
          }
        }
  
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
    next(new Error('Session is invalid. Please login via LTI in Canvas first to use this application.'));
  }
});

app.post('/launch_lti', lti.handleLaunch('groups'));
app.post('/launch_lti_stats', lti.handleLaunch('stats'));

app.listen(port, () => log.info(`Example app listening on port ${port}!`));

process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
  process.exit(1); //mandatory (as per the Node docs)
});
