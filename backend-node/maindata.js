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
const BACKUP_FILE = FILE_DIR + 'backup.json';

// TODO Combine files and property into an object, and then centralize functions so we don't have to duplicate read/write
const THINGS_FILE = FILE_DIR + 'things.json';
const TEMPLATES_FILE = FILE_DIR + 'templates.json';
const FAVORITE_FILE = FILE_DIR + 'favorite.json';
const SETTINGS_FILE = FILE_DIR + 'settings.json';
const AUTH_FILE = FILE_DIR + 'auth.json';

// TODO Need login functionality to protect our APIs

// TODO Configure CORS to just be from our website, instead of global/public access
app.use(cors());
app.use(express.json());

// Maintain our JSON data in memory, and read/write as needed as a whole chunk. Realistically don't need to overthink appending or streaming files for the sizes involved
// Each file should correspond to a "table" in our JSON pseudo-database
// TODO Will eventually need to maintain each of these on a per-user basis. Just assuming singleton access per user to avoid a lot of complexity and over engineering
let inMemory = {
  things: null,
  templates: null,
  favorite: null,
  settings: null,
  auth: null
};

// Fire up the server
app.listen(PORT_NUM, () => {
  console.log("Server running on port " + PORT_NUM);
  
  ensureFilesAreSetup();
});

function ensureFilesAreSetup() {
  // TODO QUIDEL PRIORITY - File management should be by username
  // Ensure our initial files are ready
  setupSingleFile(THINGS_FILE);
  setupSingleFile(TEMPLATES_FILE);
  setupSingleFile(FAVORITE_FILE);
  setupSingleFile(SETTINGS_FILE);
  setupSingleFile(AUTH_FILE);
}

function setupSingleFile(name) {
  try{
    fs.readFileSync(name);
  }catch(err) {
    fs.mkdirSync(FILE_DIR, { recursive: true });
    fs.writeFileSync(name, '', { flag: 'wx' });
  }
}

function readSingleFile(name, property, defaultVal) {
  try{
    // Determine if our file is empty, in which case we'll use the default value
    if (fs.readFileSync(name)?.length <= 0) {
      inMemory[property] = defaultVal;
    }
    // Otherwise read our file
    else {
      inMemory[property] = JSON.parse(fs.readFileSync(name));
    }
  }catch(err) {
    setupSingleFile(name);
    inMemory[property] = defaultVal;
  }
}

function getInMemoryThings(limitDate) {
  if (inMemory.things === null) {
    readSingleFile(THINGS_FILE, 'things', []);
  }
  
  // If we have a date limit, apply it now
  if (typeof limitDate === 'number' && limitDate > 0) {
    const desiredDate = subMinutes(new Date(), limitDate).getTime();
    
    return inMemory.things.filter(thing => {
      if (thing.updated) {
        return new Date(thing.updated).getTime() > desiredDate ? thing : null;
      }
      return thing;
    });
  }
  
  return inMemory.things;
}

function getInMemoryTemplates() {
  if (inMemory.templates === null) {
    readSingleFile(TEMPLATES_FILE, 'templates', []);
  }
  
  // Default our templates if we have none, to ensure we at least have some preset
  if (!inMemory.templates || inMemory.templates.length === 0) {
    inMemory.templates = DEFAULT_TEMPLATES;
    try{
      saveTemplatesMemoryToFile();
    }catch (err) {
      console.error("Failed to save default Templates", err);
    }
  }
  
  return inMemory.templates;
}

function getInMemoryFavorite() {
  if (inMemory.favorite === null) {
    readSingleFile(FAVORITE_FILE, 'favorite', {});
  }
  return inMemory.favorite;
}

function getInMemorySettings() {
  if (inMemory.settings === null) {
    readSingleFile(SETTINGS_FILE, 'settings', {});
  }
  return inMemory.settings;
}

function getInMemoryAuth() {
  if (inMemory.auth === null) {
    readSingleFile(AUTH_FILE, 'auth', {});
  }
  return inMemory.auth;
}

function saveThingsMemoryToFile() {
  console.log("WRITE Things", inMemory.things.length);
  writeSafeFile(THINGS_FILE, inMemory.things);
}

function saveTemplatesMemoryToFile() {
  console.log("WRITE Templates", inMemory.templates.length);
  writeSafeFile(TEMPLATES_FILE, inMemory.templates);
}

function saveFavoriteMemoryToFile() {
  console.log("WRITE Favorite Template", inMemory.favorite);
  writeSafeFile(FAVORITE_FILE, inMemory.favorite);
}

function saveSettingsMemoryToFile() {
  console.log("WRITE Settings", inMemory.settings);
  writeSafeFile(SETTINGS_FILE, inMemory.settings);
}

function saveAuthMemoryToFile() {
  console.log("WRITE Auth", inMemory.auth);
  writeSafeFile(AUTH_FILE, inMemory.auth);
}

function writeSafeFile(name, data, retryCount = 0) {
  try{
    // Write to a temporary file first
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data));
    
    // Write to our actual file
    fs.writeFileSync(name, JSON.stringify(data));
  }catch (err) {
    console.error("Failed to write a safe file", err);
    
    // Retry up to 5 times
    retryCount++;
    if (retryCount < 5) {
      writeSafeFile(name, data, retryCount);
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

/***** API Endpoints *****/
app.get("/things", (req, res) => {
  console.log("GET Things", getInMemoryThings().length);
  
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
  const limitedThings = getInMemoryThings(limitDate);
  let toReturn = {
    metadata: {
      totalCount: inMemory.things.length
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
  const things = getInMemoryThings();
  for (let i = things.length-1; i >= 0; i--) {
    if (req.body.id === things[i].id) {
      justAdd = false;
      things.splice(i, 1, req.body);
    }
  }
  
  if (justAdd) {
    getInMemoryThings().push(req.body);
  }
  
  saveThingsMemoryToFile();
  return res.status(200).end();
});

app.delete("/things/:id", (req, res) => {
  console.log("DELETE Thing", req.params.id);
  
  let toWork = getInMemoryThings();
  for (let i = toWork.length-1; i >= 0; i--) {
    if (req.params.id === toWork[i].id) {
      toWork.splice(i, 1);
    }
  }
  
  saveThingsMemoryToFile();
  return res.status(200).end();
});

app.get("/templates", (req, res) => {
  console.log("GET Templates", getInMemoryTemplates().length);
  return res.send(getInMemoryTemplates()).end();
});

app.post("/templates", (req, res) => {
  // TODO Our validation, like ensuring template names are unique, needs to be done on the backend as well, not just the front end. Look for similar with Things and other services
  console.log("POST Template", req.body);
  
  if (req.body && req.body.name) {
    getInMemoryTemplates().push(req.body);
    saveTemplatesMemoryToFile();
    return res.status(200).end();
  }
  else {
    return res.status(400).end();
  }
});

app.get("/templates/favorite", (req, res) => {
  // If we are a blank object, return nothing
  const toReturn = getInMemoryFavorite();
  if (toReturn && Object.keys(toReturn).length > 0) {
    console.log("GET Favorite Template:", toReturn.name);
    return res.send(toReturn).end();
  }
  return res.send().end();
});

app.post("/templates/favorite", (req, res) => {
  console.log("POST Favorite Template", req.body);
  
  if (req.body && req.body.name) {
    getInMemoryFavorite();
    inMemory.favorite = req.body;
    saveFavoriteMemoryToFile();
    return res.status(200).end();
  }
  else {
    return res.status(400).end();
  }
});

app.post("/templates/delete", (req, res) => {
  console.log("POST Template Delete", req.body);
  
  if (req.body && req.body.templateNameToDelete) {
    const toSearch = getInMemoryTemplates();
    const withDeleted = toSearch.filter((template) => template.name.toLowerCase() !== req.body.templateNameToDelete.toLowerCase());
    if (withDeleted.length !== toSearch.length) {
      inMemory.templates = withDeleted;
      
      // If requested, clean up related Things as well
      if (req.body.deleteThingsToo) {
        const cleanupThings = getInMemoryThings();
        const newThings = cleanupThings.filter((things) => {
          return things.templateType &&
                 things.templateType.toLowerCase() !== req.body.templateNameToDelete.toLowerCase();
        });
        inMemory.things = newThings;
        saveThingsMemoryToFile();
      }
      
      saveTemplatesMemoryToFile();
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
  console.log("GET Settings", getInMemorySettings());
  return res.send(getInMemorySettings()).end();
});

app.post("/settings", (req, res) => {
  console.log("POST Settings", req.body);
  
  // TODO Properly validate our Settings post
  //if (req.body && req.body.name) {
    getInMemorySettings();
    inMemory.settings = req.body;
    saveSettingsMemoryToFile();
    return res.status(200).end();
  //}
  //else {
  //  return res.status(400).end();
  //}
});

app.post("/login", (req, res) => {
  console.log("POST Login", req.body?.username);
  
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
            username: req.query.username,
            passwordHash: createHashedPassword(req.query.newPassword)
          };
          console.log("RETURN New Account", toReturn);
          return res.send(toReturn).end();
        }
      }
  }
  return res.status(401).end();
});