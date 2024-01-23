const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const { subMinutes } = require("date-fns");
const mailjet = require('node-mailjet');
const config = require('config');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const rateLimiter = require('express-rate-limit');

// Set some default templates for a new user
const DEFAULT_TEMPLATES = [
  {
    "name": "Milestone",
    "isDefault": true
  },
  {
    "name": "TODO",
    "color": "goldenrod",
    "initialReminder": true,
    "fields": [
      {
        "property": "notes",
        "label": "Notes",
        "type": "textarea"
      },
    ]
  }
];

const PORT_NUM = 4333;
const FILE_DIR = os.homedir() + '/.rememberitwholesale/';
const BACKUP_FOLDER = 'backup/';
const BACKUP_PREFIX = 'backup_';
const GLOBAL_DATA = "global$data";
const THINGS_FILE = 'things.json';
const TEMPLATES_FILE = 'templates.json';
const FAVORITE_FILE = 'favorite.json';
const SETTINGS_FILE = 'settings.json';
const AUTH_FILE = 'auth.json';

// Setup express-rate-limit (https://express-rate-limit.mintlify.app/reference/configuration)
// We want a global limiter for all endpoints, and then a more restrictive one for each public endpoint
// We separate the public endpoints so that we can independently restrict login vs new account
const globalLimiter = rateLimiter({
	windowMs: 1 * 60 * 1000, // 1 minute
  limit: 50, // Max of 50 requests across 1 minute
	standardHeaders: false, // Don't return any RateLimit headers
	legacyHeaders: false, // Don't return any RateLimit headers
});
// Login limit: 20 calls per 20 minutes
const loginLimiter = rateLimiter({
	windowMs: 20 * 60 * 1000,
	limit: 20,
	standardHeaders: false,
	legacyHeaders: false,
});
// New account limit: 5 calls per 1 hour
const newAccountLimiter = rateLimiter({
	windowMs: 60 * 60 * 1000,
	limit: 5,
	standardHeaders: false,
	legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use(cors({
    origin: 'https://riw.onrender.com/'
  }));
}
else {
  app.use(cors()); // TODO Configure CORS to just be from our website, instead of global/public access
}

app.use(globalLimiter);
app.use(express.json());

// Ensure our auth token is valid and the user is logged in
app.use((req, res, next) => {
  // Allow a few pages that don't need a token
  if (req.originalUrl.startsWith('/login') ||
      req.originalUrl.startsWith('/new-account')
    ) {
    next();
  }
  else {
    // Check if we have an invalid token, and if so, return a 401
    const authRes = checkAuthToken(req);
    if (!authRes.valid ||
        !authRes.username) {
      return res.status(401).end();
    }
    
    // Store our username for use further down the chain
    req.authUsername = authRes.username;
    
    next();
  }
});

// Maintain our JSON data in memory, and read/write as needed as a whole chunk. Realistically don't need to overthink appending or streaming files for the sizes involved
// Each file should correspond to a "table" in our JSON pseudo-database. Just assuming singleton access per user to avoid a lot of complexity and over engineering
let inMemory = {
  // username: {
    // things: null,
    // templates: null,
    // favorite: null,
    // settings: null,
  // }
};
// Setup our global (not user specific) data such as Auth
inMemory[GLOBAL_DATA] = {
  auth: {}
};

// Fire up the server
app.listen(PORT_NUM, () => {
  log("Server running on port " + PORT_NUM);
  log("Test var", config.get('mailjet.apiKey')); // TODO TEMPORARY Logging
  log("Test env", process.env);
  log("Test env specific", process.env.MAILJET_API_KEY);
  
  // Ensure our initial files are ready
  readUserFile(GLOBAL_DATA, AUTH_FILE, 'auth', {});
});

function log(message, ...extra) {
  console.log(new Date().toLocaleString() + " - " + message, extra);
}

function error(message, ...extra) {
  console.error(new Date().toLocaleString() + " - " + message, extra);
}

function ensureUserFilesAreSetup(authUsername) {
  readUserFile(authUsername, THINGS_FILE, 'things', []);
  readUserFile(authUsername, TEMPLATES_FILE, 'templates', []);
  readUserFile(authUsername, FAVORITE_FILE, 'favorite', {});
  readUserFile(authUsername, SETTINGS_FILE, 'settings', {});
}

function ensureUserInMemorySetup(authUsername, noReadFiles) {
  if (authUsername) {
    if (!inMemory[authUsername]) {
      if (noReadFiles) {
        inMemory[authUsername] = {};
      }
      else {
        ensureUserFilesAreSetup(authUsername);
      }
    }
  }
}

function readUserFile(authUsername, fileName, property, defaultVal, recursiveCount) {
  const fileDirectory = FILE_DIR + (authUsername ? authUsername + '/' : '');
  let toSet = defaultVal;
  
  try{
    // Determine if our file is empty, in which case we'll use the default value above,
    //  otherwise read our file
    // If we error during the reading, try to create our file and attempt a single more time
    const contents = fs.readFileSync(fileDirectory + fileName);
    if (contents && contents.length > 0) {
      toSet = JSON.parse(contents);
    }
  }catch(err) {
    try{
      fs.mkdirSync(fileDirectory, { recursive: true });
      fs.writeFileSync(fileDirectory + fileName, '', { flag: 'wx' });
    }catch (ignored) { }
    
    // Determine if we should try again, up to 10 times
    if (typeof recursiveCount === 'undefined') {
      recursiveCount = 0;
    }
    else if (typeof recursiveCount === 'number') {
      if (recursiveCount < 10) {
        recursiveCount++;
      }
      else {
        // Failed over our tries, just abort
        return null;
      }
    }
    
    // Keep recursing
    return readUserFile(authUsername, fileName, property, defaultVal, recursiveCount);
  }
  
  // Store in-memory depending on what type we are
  if (authUsername) {
    // Ensure our parent username is setup in our JSON
    ensureUserInMemorySetup(authUsername, true);
    
    inMemory[authUsername][property] = toSet;
  }
  
  return toSet;
}

function getInMemoryUserData(authUsername, property) {
  if (authUsername) {
    ensureUserInMemorySetup(authUsername);
    return inMemory[authUsername][property];
  }
  return null;
}

function setInMemoryUserData(authUsername, property, newVal) {
  if (authUsername) {
    ensureUserInMemorySetup(authUsername);
    inMemory[authUsername][property] = newVal;
  }
}

function getInMemoryThings(authUsername, limitDate) {
  // If we have a date limit, apply it now
  if (typeof limitDate === 'number' && limitDate > 0) {
    const desiredDate = subMinutes(new Date(), limitDate).getTime();
    
    return getInMemoryUserData(authUsername, 'things').filter(thing => {
      if (thing.updated) {
        return new Date(thing.updated).getTime() > desiredDate ? thing : null;
      }
      return thing;
    });
  }
  
  return getInMemoryUserData(authUsername, 'things');
}

function getInMemoryTemplates(authUsername) {
  // Default our templates if we have none, to ensure we at least have some preset
  if (!getInMemoryUserData(authUsername, 'templates') ||
      getInMemoryUserData(authUsername, 'templates').length === 0) {
    setInMemoryUserData(authUsername, 'templates', DEFAULT_TEMPLATES);
    try{
      saveTemplatesMemoryToFile(authUsername);
    }catch (err) {
      error("Failed to save default Templates", err);
    }
  }
  
  return getInMemoryUserData(authUsername, 'templates');
}

function getInMemoryFavorite(authUsername) {
  return getInMemoryUserData(authUsername, 'favorite');
}

function getInMemorySettings(authUsername) {
  return getInMemoryUserData(authUsername, 'settings');
}

function getInMemoryAuth() {
  return getInMemoryUserData(GLOBAL_DATA, 'auth');
}

function saveThingsMemoryToFile(authUsername) {
  log("WRITE Things", getInMemoryThings(authUsername).length);
  writeSafeFile(authUsername, THINGS_FILE, getInMemoryThings(authUsername));
}

function saveTemplatesMemoryToFile(authUsername) {
  log("WRITE Templates", getInMemoryTemplates(authUsername).length);
  writeSafeFile(authUsername, TEMPLATES_FILE, getInMemoryTemplates(authUsername));
}

function saveFavoriteMemoryToFile(authUsername) {
  log("WRITE Favorite Template", getInMemoryFavorite(authUsername));
  writeSafeFile(authUsername, FAVORITE_FILE, getInMemoryFavorite(authUsername));
}

function saveSettingsMemoryToFile(authUsername) {
  log("WRITE Settings", getInMemorySettings(authUsername));
  writeSafeFile(authUsername, SETTINGS_FILE, getInMemorySettings(authUsername));
}

function saveAuthMemoryToFile() {
  log("WRITE Auth");
  writeSafeFile(GLOBAL_DATA, AUTH_FILE, getInMemoryAuth());
}

function writeSafeFile(authUsername, fileName, data, retryCount = 0) {
  const fileDirectory = FILE_DIR + (authUsername ? authUsername + '/' : '');
  const backupFolder = fileDirectory + BACKUP_FOLDER;
  const backupFile = backupFolder + BACKUP_PREFIX + fileName;
  
  try{
    // Write to a temporary file first
    // This might fail due to not existing, but we retry in the catch
    fs.writeFileSync(backupFile, JSON.stringify(data));
    
    // Write to our actual file
    fs.writeFileSync(fileDirectory + fileName, JSON.stringify(data));
  }catch (err) {
    try{
      fs.mkdirSync(backupFolder, { recursive: true });
      fs.writeFileSync(backupFile, '', { flag: 'wx' });
    }catch (ignored) { }
    
    // Retry up to 5 times
    retryCount++;
    if (retryCount < 5) {
      writeSafeFile(authUsername, fileName, data, retryCount);
    }
    else {
      error("Failed to write a safe file", err);
      throw new Error('Failed to write the file');
    }
  }
}

function createAuthAccount(username, password) {
  return {
    [convertUsernameToFilesafe(username)]: {
      "password": createHashedPassword(password)
    }
  };
}

function createHashedPassword(password) {
  const hashObj = crypto.createHash('sha256');
  hashObj.update(password + config.get('auth.salt'));
  return hashObj.digest('hex');
}

function generateAuthToken() {
  return uuidv4();
}

function checkAuthToken(req) {
  if (req && req.query && req.query.token) {
    for (let key in getInMemoryAuth()) {
      if (getInMemoryAuth().hasOwnProperty(key)) {
        if (req.query.token === getInMemoryAuth()[key].authToken) {
          return {
            username: convertUsernameToFilesafe(key),
            valid: true
          };
        }
      }
    }
  }
  let message = 'unknown value';
  if (req && req.query) {
    message = req.query.token;
  }
  error("Invalid endpoint token of [" + message + "]");
  return {
    valid: false
  };
}

function hasInvalidFields(...fields) {
  if (fields && fields.length > 0) {
    for (let i = 0; i < fields.length; i++) {
      // Check that we're not undefined or null
      if (typeof fields[i] === 'undefined' &&
          fields[i] === null) {
        return true;
      }
      // For strings also ensure we're not just blank
      else if (typeof fields[i] === 'string' &&
               fields[i].trim().length === 0) {
        return true;
      }
    }
  }
  
  // Empty params means we don't want to check anything, so we're innately valid (aka return false for invalid)
  return false;
}

function convertUsernameToFilesafe(username) {
  return username.replace(/[^\w-]+/g, "");
}

function getAuthUsername(req) {
  return req && req.authUsername ? req.authUsername : null;
}

/***** API Endpoints *****/
app.get("/things", (req, res) => {
  log("GET Things", getInMemoryThings(getAuthUsername(req)).length);
  
  // Determine if we are limiting by date/time
  let limitDate = -1;
  if (req && req.query && req.query.limit) {
    try{
      limitDate = parseInt(req.query.limit);
      
      if (isNaN(limitDate)) {
        console.warn("Couldn't convert date limit to number [" + req.query.limit + "]");
        limitDate = -1;
      }
    }catch(err) {
      error("Failed to convert passed date limit [" + req.query.limit + "]", err);
      limitDate = -1;
    }
  }
  
  // Limit our Things and wrap the return with some metadata
  const limitedThings = getInMemoryThings(getAuthUsername(req), limitDate);
  let toReturn = {
    metadata: {
      totalCount: getInMemoryThings(getAuthUsername(req)).length
    },
    data: limitedThings
  };
  
  return res.send(toReturn).end();
});

app.post("/things", (req, res) => {
  log("POST Thing", req.body);
  if (hasInvalidFields(req.body.id, req.body.name, req.body.templateType)) { return res.status(400).end(); }
  
  // Determine if our object exists by ID or not
  let justAdd = true;
  const things = getInMemoryThings(getAuthUsername(req));
  for (let i = things.length-1; i >= 0; i--) {
    if (req.body.id === things[i].id) {
      justAdd = false;
      things.splice(i, 1, req.body);
    }
  }
  
  if (justAdd) {
    getInMemoryThings(getAuthUsername(req)).push(req.body);
  }
  
  saveThingsMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.delete("/things/:id", (req, res) => {
  if (hasInvalidFields(req.params.id)) { return res.status(400).end(); }
  
  const toWork = getInMemoryThings(getAuthUsername(req));
  for (let i = toWork.length-1; i >= 0; i--) {
    if (req.params.id === toWork[i].id) {
      toWork.splice(i, 1);
    }
  }
  
  saveThingsMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.get("/templates", (req, res) => {
  log("GET Templates", getInMemoryTemplates(getAuthUsername(req)).length);
  return res.send(getInMemoryTemplates(getAuthUsername(req))).end();
});

app.post("/templates", (req, res) => {
  log("POST Template", req.body);
  if (hasInvalidFields(req.body.name)) { return res.status(400).end(); }
  
  // Check that our template name is unique
  const templatesList = getInMemoryTemplates(getAuthUsername(req));
  const isUnique =
    templatesList.filter((template) => req.body.name.toLowerCase() === template.name.toLowerCase()).length === 0;
  if (!isUnique) { return res.status(400).end(); }
  
  getInMemoryTemplates(getAuthUsername(req)).push(req.body);
  saveTemplatesMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.get("/templates/favorite", (req, res) => {
  const toReturn = getInMemoryFavorite(getAuthUsername(req));
  if (toReturn && Object.keys(toReturn).length > 0) {
    log("GET Favorite Template:", toReturn.name);
    return res.send(toReturn).end();
  }
  // If we are a blank object, return nothing
  return res.send().end();
});

app.post("/templates/favorite", (req, res) => {
  log("POST Favorite Template");
  if (hasInvalidFields(req.body.name)) { return res.status(400).end(); }
  
  setInMemoryUserData(getAuthUsername(req), 'favorite', req.body);
  saveFavoriteMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.post("/templates/delete", (req, res) => {
  log("POST Template Delete", req.body);
  if (hasInvalidFields(req.body.templateNameToDelete)) { return res.status(400).end(); }
  
  const toSearch = getInMemoryTemplates(getAuthUsername(req));
  const withDeleted = toSearch.filter((template) => template.name.toLowerCase() !== req.body.templateNameToDelete.toLowerCase());
  if (withDeleted.length !== toSearch.length) { // Couldn't match a template to delete
    setInMemoryUserData(getAuthUsername(req), 'templates', withDeleted);
    
    // If requested, clean up related Things as well
    if (req.body.deleteThingsToo) {
      const cleanupThings = getInMemoryThings(getAuthUsername(req));
      const newThings = cleanupThings.filter((things) => {
        return things.templateType &&
                things.templateType.toLowerCase() !== req.body.templateNameToDelete.toLowerCase();
      });
      setInMemoryUserData(getAuthUsername(req), 'things', newThings);
      saveThingsMemoryToFile(getAuthUsername(req));
    }
    
    saveTemplatesMemoryToFile(getAuthUsername(req));
    return res.status(200).end();
  }
  else {
    return res.status(404).end();
  }
});

app.get("/settings", (req, res) => {
  log("GET Settings", getInMemorySettings(getAuthUsername(req)));
  return res.send(getInMemorySettings(getAuthUsername(req))).end();
});

app.post("/settings", (req, res) => {
  log("POST Settings");
  
  setInMemoryUserData(getAuthUsername(req), 'settings', req.body);
  saveSettingsMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.post("/change-password", (req, res) => {
  log("POST Change Password", req.body.username);
  if (hasInvalidFields(req.body.username, req.body.currentPassword, req.body.newPassword)) { return res.status(400).end(); }
  
  // Determine if our current password is valid
  const auth = getInMemoryAuth();
  if (auth && Object.keys(auth).length > 0) {
    const userObj = auth[req.body.username];
    const currentPasswordHash = createHashedPassword(req.body.currentPassword);
    if (userObj &&
        userObj.password === currentPasswordHash ||
        userObj.password === req.body.password) {
      const newPasswordHash = createHashedPassword(req.body.newPassword);
      userObj.password = newPasswordHash;
      userObj.authToken = generateAuthToken();
      saveAuthMemoryToFile();
      
      const toReturn = {
        username: req.body.username,
        authToken: userObj.authToken,
        password: userObj.password
      };
      return res.status(200).end(JSON.stringify(toReturn));
    }
  }
  else {
    error("Invalid auth, couldn't read stored data");
  }
  
  return res.status(401).end();
});

// Public
app.post("/login", loginLimiter, (req, res) => {
  log("POST Login", req.body.username);
  if (hasInvalidFields(req.body.username, req.body.password)) { return res.status(400).end(); }
  
  const auth = getInMemoryAuth();
  if (auth && Object.keys(auth).length > 0) {
    const userObj = auth[req.body.username];
    if (userObj) {
      // Create a password hash for the case of a user sending a plain text password
      const passwordHash = createHashedPassword(req.body.password);
      
      if (userObj.password === passwordHash ||
          userObj.password === req.body.password) {
        // Generate a new auth token and save it
        userObj.authToken = generateAuthToken();
        userObj.lastLogin = new Date().toLocaleString();
        saveAuthMemoryToFile();
        
        // Setup our files and in-memory data as needed
        ensureUserFilesAreSetup(convertUsernameToFilesafe(req.body.username));
        
        const toReturn = {
          username: req.body.username,
          authToken: userObj.authToken,
        };
        if (req.body.saveLogin) {
          toReturn.password = userObj.password;
        }
        log("Login valid for", req.body.username);
        return res.status(200).end(JSON.stringify(toReturn));
      }
    }
  }
  else {
    error("Invalid auth, couldn't read stored data");
  }
  
  // If we reached this far, give a 401 error as we don't have a valid user state
  return res.status(401).end();
});

// Public
app.post("/new-account", newAccountLimiter, async (req, res) => {
  log("***** New account requested as [" + req.body.username + "] from [" + req.body.email + "]"); // Mark with a few stars so this is easier to notice in the logs
  if (hasInvalidFields(req.body.username, req.body.email)) { return res.status(400).end(); }
  
  let success = false;
  try{
    const mailjetApi = mailjet.apiConnect(
      config.get('mailjet.apiKey'),
      config.get('mailjet.secretKey'),
    );
    
    const generatedPassword = Math.random().toString(36);
    const replyBody = "Hey, I made your account " + req.body.username + " with a password of " + generatedPassword + " (I know it is a weird one, you can reset in the app).";
    const request = mailjetApi.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: config.get('mailjet.fromAddress'),
            Name: config.get('mailjet.fromName')
          },
          To: [
            {
              Email: config.get('mailjet.toAddress'),
              Name: config.get('mailjet.toName')
            },
          ],
          Subject: "Account Requested",
          HTMLPart:
            "<b>" + req.body.username + "</b> has requested a new account at " +
            new Date().toLocaleString() + "<br/><br/>Respond to: <a href='mailto:" +
            req.body.email + "?subject=Information on your new account&body=" + replyBody + "'>" + req.body.email + "</a><br/><br/>" +
            "Their new password is <b>" + generatedPassword + "</b> and the JSON format to paste into auth.json is:<br/>" +
            "<pre>" + JSON.stringify(createAuthAccount(req.body.username, generatedPassword)) + "</pre>" +
            (req.body.note && typeof req.body.note === 'string' && req.body.note.trim().length > 0 ? "They also included this note:<br/><blockquote><i>" + req.body.note + "</i></blockquote>" : "")
        },
      ],
    });
    
    await request.then((result) => {
      success = true;
    }).catch((err) => {
      let data = null;
      if (err && err.response && err.response.data) {
        data = err.response.data;
      }
      
      // Show as specific a message as we can
      if (data && data.ErrorMessage) {
        error("***** Failure to send mailjet email", data.ErrorMessage);
      }
      else {
        error("***** Failure to send mailjet email", data);
      }
    });
  }catch (err) {
    error("***** General failure to send mailjet email", err);
  }
  
  if (!success) {
    return res.status(500).end();
  }
  return res.status(201).end();
});
