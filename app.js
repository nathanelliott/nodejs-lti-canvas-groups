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
  // store: new FileStore(fileStoreOptions),
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
  var hrstart = process.hrtime();
  var groupsWithMembers = new Array();
  
  if (request.session.userId && request.session.canvasCourseId) {
    console.log("___canvasApi.getCourseGroups()");

    // Get data about each group in this course.
    await canvasApi.getCourseGroups(request.session.canvasCourseId).then(async function (groupsData) {
      for (const group of groupsData) {
        var membersWithDetails = new Array();

        console.log("___canvasApi.getGroupMembers()");

        // Get data about each member in the group.
        await canvasApi.getGroupMembers(group.id).then(async function (membersData) {
          for (const member of membersData) {
            console.log("___canvasApi.getUser()");

            // Get more data like name about each member.
            await canvasApi.getUser(member.user_id).then(async function (user) {
              membersWithDetails.push({
                userId: member.user_id,
                workflowState: member.workflow_state,
                isModerator: member.moderator,
                name: user.name,
                sortableName: user.sortable_name,
                avatarUrl: user.avatar_url
              });
            }).catch(function (error) {
              next(error);
            });
          }
        }).catch(function (error) {
          next (error);
        });

        groupsWithMembers.push({ 
          id: group.id,
          name: group.name,
          description: group.description,
          category_id: group.group_category_id,
          members: membersWithDetails
        });
      }
    }).catch(function(error) {
      next (error);
    });

    console.log("___DATA=" + JSON.stringify(groupsWithMembers));

    // Measure time it took to process.
    var hrend = process.hrtime(hrstart);

    let data = {
      fullname: request.session.fullname,
      userId: request.session.userId,
      courseId: request.session.canvasCourseId,
      contextTitle: request.session.contextTitle,
      groups: groupsWithMembers,
      rawGroups: JSON.stringify(groupsWithMembers),
      statistics: {
        running_s: hrend[0],
        running_ms: (hrend[1] / 1000000)
      }
    };

    return result.render('groups', data);
  }
  else {
    next(new Error('The session is invalid. Please login via LTI to use this application.'));
  }  
});

app.post('/launch_lti', lti.handleLaunch);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
