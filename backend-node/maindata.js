const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const subMinutes = require("date-fns/subMinutes");
const config = require('config');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Set some default templates for a new user
// TODO Once user accounts are finalized, this should likely be part of a larger default dataset (from outside the code) that is set in
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
const BACKUP_FILE = 'backup.json'; // TODO QUIDEL PRIORITY Better backups, per user and per file

// TODO Combine files and property into an object, and then centralize functions so we don't have to duplicate read/write
const GLOBAL_DATA = "global$data";
const THINGS_FILE = 'things.json';
const TEMPLATES_FILE = 'templates.json';
const FAVORITE_FILE = 'favorite.json';
const SETTINGS_FILE = 'settings.json';
const AUTH_FILE = 'auth.json';

// TODO Configure CORS to just be from our website, instead of global/public access
app.use(cors());
app.use(express.json());

// Ensure our auth token is valid and the user is logged in
app.use((req, res, next) => {
  // Allow a few pages that don't need a token
  if (req.originalUrl.startsWith('/login') ||
      req.originalUrl.startsWith('/password-hash')) {
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
  console.log("Server running on port " + PORT_NUM);
  
  // Ensure our initial files are ready
  readUserFile(GLOBAL_DATA, AUTH_FILE, 'auth', {});
});

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

function readUserFile(authUsername, fileName, property, defaultVal, isRecursive) {
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
    fs.mkdirSync(fileDirectory, { recursive: true });
    fs.writeFileSync(fileDirectory + fileName, '', { flag: 'wx' });
    if (!isRecursive) {
      return readUserFile(authUsername, fileName, property, defaultVal, isRecursive);
    }
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
      console.error("Failed to save default Templates", err);
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
  console.log("WRITE Things", getInMemoryThings(authUsername).length);
  writeSafeFile(authUsername, THINGS_FILE, getInMemoryThings(authUsername));
}

function saveTemplatesMemoryToFile(authUsername) {
  console.log("WRITE Templates", getInMemoryTemplates(authUsername).length);
  writeSafeFile(authUsername, TEMPLATES_FILE, getInMemoryTemplates(authUsername));
}

function saveFavoriteMemoryToFile(authUsername) {
  console.log("WRITE Favorite Template", getInMemoryFavorite(authUsername));
  writeSafeFile(authUsername, FAVORITE_FILE, getInMemoryFavorite(authUsername));
}

function saveSettingsMemoryToFile(authUsername) {
  console.log("WRITE Settings", getInMemorySettings(authUsername));
  writeSafeFile(authUsername, SETTINGS_FILE, getInMemorySettings(authUsername));
}

function saveAuthMemoryToFile() {
  console.log("WRITE Auth", getInMemoryAuth());
  writeSafeFile(GLOBAL_DATA, AUTH_FILE, getInMemoryAuth());
}

function writeSafeFile(authUsername, fileName, data, retryCount = 0) {
  const fileDirectory = FILE_DIR + (authUsername ? authUsername + '/' : '');
  
  try{
    // Write to a temporary file first
    fs.writeFileSync(fileDirectory + BACKUP_FILE, JSON.stringify(data));
    
    // Write to our actual file
    fs.writeFileSync(fileDirectory + fileName, JSON.stringify(data));
  }catch (err) {
    console.error("Failed to write a safe file", err);
    
    // Retry up to 5 times
    retryCount++;
    if (retryCount < 5) {
      writeSafeFile(authUsername, fileName, data, retryCount);
    }
    else {
      throw new Error('Failed to write the file');
    }
  }
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
  console.error("Invalid endpoint token of [" + message + "]");
  return {
    valid: false
  };
}

function convertUsernameToFilesafe(username) {
  return username.replace(/[^\w-]+/g, "");
}

function getAuthUsername(req) {
  return req && req.authUsername ? req.authUsername : null;
}

/***** API Endpoints *****/
app.get("/things", (req, res) => {
  console.log("GET Things", getInMemoryThings(getAuthUsername(req)).length);
  
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
      console.error("Failed to convert passed date limit [" + req.query.limit + "]", err);
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
  console.log("POST Thing", req.body);
  
  // Check our body for errors
  let failError = '';
  if (req.body) {
    if (!req.body.id) {
      failError = 'Missing ID';
    }
    if (!req.body.name || req.body.name.trim().length === 0) {
      failError = 'Missing Name';
    }
    if (!req.body.templateType || req.body.templateType.trim().length === 0) {
      failError = 'Missing Template type';
    }
  }
  else {
    failError = 'Incorrect or no data sent';
  }
  
  if (failError && failError.trim().length > 0) {
    return res.status(400).json({ status: 400, message: failError }).end();
  }
  
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
  console.log("DELETE Thing", req.params.id);
  
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
  console.log("GET Templates", getInMemoryTemplates(getAuthUsername(req)).length);
  return res.send(getInMemoryTemplates(getAuthUsername(req))).end();
});

app.post("/templates", (req, res) => {
  // TODO Our validation, like ensuring template names are unique, needs to be done on the backend as well, not just the front end. Look for similar with Things and other services
  console.log("POST Template", req.body);
  
  if (req.body && req.body.name) {
    getInMemoryTemplates(getAuthUsername(req)).push(req.body);
    saveTemplatesMemoryToFile(getAuthUsername(req));
    return res.status(200).end();
  }
  else {
    return res.status(400).end();
  }
});

app.get("/templates/favorite", (req, res) => {
  // If we are a blank object, return nothing
  const toReturn = getInMemoryFavorite(getAuthUsername(req));
  if (toReturn && Object.keys(toReturn).length > 0) {
    console.log("GET Favorite Template:", toReturn.name);
    return res.send(toReturn).end();
  }
  return res.send().end();
});

app.post("/templates/favorite", (req, res) => {
  console.log("POST Favorite Template");
  
  if (req.body && req.body.name) {
    setInMemoryUserData(getAuthUsername(req), 'favorite', req.body);
    saveFavoriteMemoryToFile(getAuthUsername(req));
    return res.status(200).end();
  }
  else {
    return res.status(400).end();
  }
});

app.post("/templates/delete", (req, res) => {
  console.log("POST Template Delete", req.body);
  
  if (req.body && req.body.templateNameToDelete) {
    const toSearch = getInMemoryTemplates(getAuthUsername(req));
    const withDeleted = toSearch.filter((template) => template.name.toLowerCase() !== req.body.templateNameToDelete.toLowerCase());
    if (withDeleted.length !== toSearch.length) {
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
  }
  else {
    return res.status(400).end();
  }
});

app.get("/settings", (req, res) => {
  console.log("GET Settings", getInMemorySettings(getAuthUsername(req)));
  return res.send(getInMemorySettings(getAuthUsername(req))).end();
});

app.post("/settings", (req, res) => {
  console.log("POST Settings");
  
  // TODO Properly validate our Settings post
  //if (req.body && req.body.name) {
    setInMemoryUserData(getAuthUsername(req), 'settings', req.body);
    saveSettingsMemoryToFile(getAuthUsername(req));
    return res.status(200).end();
  //}
  //else {
  //  return res.status(400).end();
  //}
});

app.post("/login", (req, res) => {
  console.log("POST Login", req.body?.username);
  
  if (req && req.body &&
      req.body.username &&
      req.body.password) {
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
          return res.status(200).end(JSON.stringify(toReturn));
        }
      }
    }
    else {
      console.error("Invalid auth, couldn't read stored data");
    }
  }
  else {
    console.error("Invalid Login - missing username or password");
  }
  
  // If we reached this far, give a 401 error as we don't have a valid user state
  return res.status(401).end();
});

/**
 * Generate a password hash that matches a username and can be manually added to our auth file
 */
// TODO Make a "request new account" from the login page that uses Nodemailer to email me with a requested username. For now just manually create accounts
app.get("/password-hash", (req, res) => {
  console.log("GET New Account", req.query);
  
  // Determine if our params are good, otherwise give 'em the old 401
  // Basically looking for ?username=somenewperson&createCheck=matchesconfig&newPassword=theirpass&
  if (req && req.query && req.query.username &&
      typeof req.query.username === 'string' &&
      req.query.username.trim().length > 0) {
      if (req.query.createCheck &&
          typeof req.query.createCheck === 'string' &&
          req.query.createCheck.trim().length > 0 &&
          req.query.createCheck === config.get('auth.newAccountCheck')) {
        if (req.query.newPassword &&
            typeof req.query.newPassword === 'string' &&
            req.query.newPassword.trim().length > 0) {
          const toReturn = {
            username: convertUsernameToFilesafe(req.query.username),
            passwordHash: createHashedPassword(req.query.newPassword)
          };
          console.log("RETURN New Account", toReturn);
          return res.send(toReturn).end();
        }
      }
  }
  return res.status(401).end();
});