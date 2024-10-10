const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const { differenceInMinutes, subMinutes} = require("date-fns");
const mailjet = require('node-mailjet');
const config = require('config');
const crypto = require('crypto');
const zipper = require('yazl')
const { v4: uuidv4 } = require('uuid');
const rateLimiter = require('express-rate-limit');
const { add } = require("date-fns");
const path = require("path");
const sharp = require("sharp")
const fileUpload = require("express-fileupload");

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
const FILE_DIR = os.homedir() + '/.rememberitwholesale';
const DEMO_DATA_DIR = "src-demo$data"; // Directory for the basis to copy for Demo accounts
const GLOBAL_DATA = "global$data";
const UPLOADS_DIR = 'uploads';
const STATIC_PATH = 'static';
const MAX_BACKUP_COUNT = 5;
const BACKUP_DIR = 'backup';
const BACKUP_PREFIX = 'backup_';
const BACKUP_TIME_SPACING = 60 * 60 * 1000; // 1 hour
const TEMPORARY_FILE_PREFIX = 'temporary_';
const TEMPLATES_FILE = 'templates.json';
const THINGS_FILE = 'things.json';
const FAVORITE_FILE = 'favorite.json';
const SETTINGS_FILE = 'settings.json';
const AUTH_FILE = 'auth.json';
const MAX_AUTOSCALE = 1200; // Number of pixels before we attempt to autoscale an image
const MAX_RESIZE_CACHE = 50; // Number of resized images to cache

const imageResizeCache = new Map(); // In-memory cache of recently resized images

// Setup express-rate-limit (https://express-rate-limit.mintlify.app/reference/configuration)
// We want a global limiter for all endpoints, and then a more restrictive one for each public endpoint
// We separate the public endpoints so that we can independently restrict login vs new account
const globalLimiter = rateLimiter({
  skip: () => process.env.NODE_ENV !== 'production',
	windowMs: 1 * 60 * 1000, // 1 minute
  limit: 200, // Max of 200 requests across 1 minute
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
// Demo limit: 3 calls per day
const tryDemoLimiter = rateLimiter({
	windowMs: 24 * 60 * 60 * 1000,
	limit: 3,
	standardHeaders: false,
	legacyHeaders: false,
});
// Demo limit: 3 calls per day
const staticLimiter = rateLimiter({
	windowMs: 1 * 60 * 1000,
	limit: 300,
	standardHeaders: false,
	legacyHeaders: false,
});

// Setup our middleware
app.use(cors());
app.use(globalLimiter);
app.use(express.json());
app.use(fileUpload());

// To prevent needless favicon.ico logging for our static files we just return NO CONTENT for the request
// Of course the app itself can manage a proper favicon, we just want to skip this default browser behaviour
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Ensure our auth token is valid and the user is logged in
app.use((req, res, next) => {
  // Allow a few pages that don't need a token
  // TODO Should put these under a similar /public/[endpoint] path and just match on that prefix, so we don't have to maintain a list manually
  if (req.originalUrl.startsWith('/login') ||
      req.originalUrl.startsWith('/new-account') ||
      req.originalUrl.startsWith('/demo-start') ||
      req.originalUrl.startsWith('/pthing/') ||
      req.originalUrl.startsWith('/pdownload/') ||
      req.originalUrl.startsWith('/static/')
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

/**
 * Give the ability to resize an image on the fly when passed a wscale/hscale (width and height PERCENT scaling)
 * The requester could also pass scale=auto, which means we determine if any scaling is needed dynamically
 * Otherwise we fall back to our standard Static image handling
 */
app.get(`/${STATIC_PATH}/*`, async (req, res, next) => {
  const { wscale, hscale, scale } = req.query;
  const isAutoScale = scale && scale.toLowerCase() === 'auto';
  
  if (wscale || hscale || isAutoScale) {
    try{
      const filePath = path.join(FILE_DIR, req.params[0]);
      if (fs.existsSync(filePath)) {
        // Create a cache key based on the file path and query parameters
        const cacheKey = `${filePath}-${wscale}-${hscale}-${isAutoScale}`;
        if (imageResizeCache.get(cacheKey)) {
          return res.end(imageResizeCache.get(cacheKey));
        }
        
        // Leverage the Sharp library to grab our current dimensions and resize based on the requested precent
        const image = sharp(filePath);
        const metadata = await image.metadata();
        let transform = {};
        
        // If we're trying to automatically scale base it purely on how big our image is to begin with, and reduce accordingly
        if (isAutoScale) {
          if (metadata.width > MAX_AUTOSCALE) {
            transform.width = MAX_AUTOSCALE;
            transform.height = Math.round(metadata.height * (transform.width / metadata.width));
          }
        }
        else {
          if (wscale) {
            let safeCheck = Math.round(metadata.width * (parseFloat(wscale) / 100));
            if (typeof safeCheck === 'number' && !isNaN(safeCheck)) { transform.width = safeCheck; }
          }
          if (hscale) {
            let safeCheck = Math.round(metadata.height * (parseFloat(hscale) / 100));
            if (typeof safeCheck === 'number' && !isNaN(safeCheck)) { transform.height = safeCheck; }
          }
        }
        
        // If we have a valid resize do so now, otherwise let the fallback static processing handle it
        if (transform.width || transform.height) {
          res.setHeader('Cache-Control', 'public, max-age=' + 60*60*24*30); // 30 days for caching
          
          const imageBuffer = await image
            .resize(transform)
            // .toFormat('jpeg', { quality: 80 }) // TODO Can also convert to a JPG to further save on file size - toggleable by user perhaps? Start on lowest setting and they can choose to go higher?
            .withMetadata() // Preserve metadata including orientation
            .toBuffer();
            
          // Store in our cache, up to a cap (at which point we remove our oldest key)
          if (imageResizeCache.size >= MAX_RESIZE_CACHE) {
            imageResizeCache.delete(imageResizeCache.keys().next().value);
          }
          imageResizeCache.set(cacheKey, imageBuffer);
          
          return res.end(imageBuffer);
        }
      }
    }catch (err) {
      console.error(req.params[0], err);
    }
  }
  
  return next();
});
app.use(`/${STATIC_PATH}`, staticLimiter, express.static(FILE_DIR, { maxAge: '30d' })); // Host static files directly, and cache for a good amount of time (default is no caching)

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

// Used for determining if there are any expired accounts
const EXPIRY_CHECK_INTERVAL_H = 4*60*60*1000; // 4 hours
let lastExpiryCheck = 0;
let checkingExpired = false;

// Fire up the server
app.listen(PORT_NUM, () => {
  log("Server running on port " + PORT_NUM);
  
  afterStart();
});

function afterStart() {
  // Ensure our initial files are ready
  readUserFile(GLOBAL_DATA, AUTH_FILE, 'auth', {});  
}

function log(message, ...extra) {
  console.log(new Date().toLocaleString() + " - " + message, extra && extra.length > 0 ? extra : '');
}

function error(message, ...extra) {
  console.error(new Date().toLocaleString() + " - " + message, extra && extra.length > 0 ? extra : '');
}

/**
 * Create an attachment URL path for an uploaded file
 * For example /static/[username]/uploads/[thing-id]/[fileName]
 * Later the reference to this backend API can be prefixed to make a direct link to the file
 */
function makeAttachmentURL(authUsername, thingId, fileName) {
  return path.join(STATIC_PATH, authUsername, UPLOADS_DIR, thingId, fileName);
}

function getAttachmentPath(authUsername, thingId) {
  const userDirectory = path.join(FILE_DIR, authUsername);
  const uploadDirectory = path.join(userDirectory, UPLOADS_DIR);
  return path.join(uploadDirectory, thingId);
}

function removeAttachmentDirectory(authUsername, thingId) {
  fs.rmSync(getAttachmentPath(authUsername, thingId),
    { recursive: true, force: true },
    callback => {});
}

function removeAttachmentFile(authUsername, thingId, fileName) {
  fs.rmSync(path.join(getAttachmentPath(authUsername, thingId), fileName), {},
    callback => {});
}

function addURLsToThings(authUsername, things) {
  // Dynamically append a URL for any attachment items
  // We don't save this to the Things file as we want to be more flexible on changing it
  if (things && Array.isArray(things)) {
    things.forEach(thing => {
      if (thing.gallery &&
          Array.isArray(thing.uploads) && thing.uploads.length > 0) {
        // Note we specifically don't check for existence of the uploaded file here
        // This is because then it will intentionally show as a broken link to the user,
        //   and they can properly delete or reupload or _deal_ with it somehow
        thing.uploads.forEach(upload => {
          if (upload && upload.name) {
            upload.url = makeAttachmentURL(authUsername, thing.id, upload.name);
          }
        });
      }
      
      return thing;
    });
  }
  
  return things;
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
  const fileDirectory = path.join(FILE_DIR, authUsername);
  let toSet = defaultVal;
  
  try{
    // Determine if our file is empty, in which case we'll use the default value above,
    //  otherwise read our file
    // If we error during the reading, try to create our file and attempt a single more time
    const contents = fs.readFileSync(path.join(fileDirectory, fileName));
    if (contents && contents.length > 0) {
      toSet = JSON.parse(contents);
    }
  }catch(err) {
    try{
      fs.mkdirSync(fileDirectory, { recursive: true });
      fs.writeFileSync(path.join(fileDirectory, fileName), '', { flag: 'wx' });
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
  // Check for any expired accounts every X hours
  if (!checkingExpired &&
      (new Date().getTime() - lastExpiryCheck) > EXPIRY_CHECK_INTERVAL_H) {
    const authData = getInMemoryUserData(GLOBAL_DATA, 'auth');
    checkingExpired = true;
    lastExpiryCheck = new Date().getTime();
    
    let needToSave = false;
    for (let key in authData) {
      if (authData.hasOwnProperty(key)) {
        // If we find an expired account, clean it up and mark for saving later
        if (typeof authData[key].expires === 'number' &&
            lastExpiryCheck >= authData[key].expires) {
          log("Cleanup expired user", key);
          cleanupDemoAccount(key, authData);
          needToSave = true;
        }
      }
    }
    
    if (needToSave) {
      saveAuthMemoryToFile(authData);
    }
    
    checkingExpired = false;
    return authData;
  }
  
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

function saveAuthMemoryToFile(overrideData) {
  log("WRITE Auth" + (overrideData ? ' (with override)' : ''));
  writeSafeFile(GLOBAL_DATA, AUTH_FILE, overrideData ? overrideData : getInMemoryAuth());
}

function writeSafeFile(authUsername, fileName, data, retryCount = 0) {
  const fileDirectory = path.join(FILE_DIR, authUsername);
  const backupDirectory = path.join(fileDirectory, BACKUP_DIR);
  const tempFile = path.join(backupDirectory, TEMPORARY_FILE_PREFIX+fileName);
  
  try{
    // Write to a temporary file first
    // This might fail due to not existing, but we retry in the catch
    fs.writeFileSync(tempFile, JSON.stringify(data));
    
    // Write to our actual file
    fs.writeFileSync(path.join(fileDirectory, fileName), JSON.stringify(data));
    
    // Once complete, take a copy as a backup if needed
    // Note we do this in a separate try-catch because we don't want it to interrupt the user
    // Also even though we're using a bunch of sync methods, do this off the main thread via a setTimeout
    setTimeout(() => {
    try{
      const backupTimestamp = fileName + '_';
      let performBackup = true;
      let filteredFiles = null;
      let safetyBreak = 0;
      do {
        safetyBreak++;
        
        const contents = fs.readdirSync(backupDirectory, { withFileTypes: true });
        
        // Grab all our files to work with
        filteredFiles = contents
          .filter(dirent => dirent.isFile() && dirent.name.includes(backupTimestamp))
          .map(dirent => dirent.name);
        
        const timeList = filteredFiles.map(file =>
          Number.parseInt(file.substring(file.indexOf(backupTimestamp) + backupTimestamp.length)));
        if (timeList && timeList.length > 0) {
          const maxTime = Math.max(...timeList);
          
          // Delete the oldest backup files until we're at MAX_BACKUP_COUNT
          if (!Number.isNaN(maxTime) &&
              filteredFiles && filteredFiles.length >= MAX_BACKUP_COUNT) {
            const oldestFile = path.join(backupDirectory, filteredFiles.filter(file => file.includes('' + maxTime))[0]); // This is safe given the filters we do before
            fs.unlinkSync(oldestFile, (err) => {
              if (err) {
                error("Failed to delete the desired oldest file", oldestFile);
                throw new Error(err);
              }
            });
          }
          
          // We only want to backup every BACKUP_TIME_SPACING as a maximum, otherwise there's less value in the backups
          // So if the newest file is fresher than that, don't bother backing up
          if (!Number.isNaN(maxTime) && Date.now() - maxTime <= BACKUP_TIME_SPACING) {
            performBackup = false;
          }
        }
        
        // Break out safely if the loop seems to be running too long
        // If we somehow end up with more than 100 backup files, next time we'll just chop the list down smaller
        //  basically a 100 at a time
        // Realistically we'll only be running this loop once since we won't get above MAX_BACKUP_COUNT by design
        if (safetyBreak > 100) {
          error("Broke out of file writing loop for backup files as we hit the cap, dir contents are:", contents);
          break;
        }
      } while (filteredFiles && filteredFiles.length > MAX_BACKUP_COUNT);
      
      // Do the actual backup copy of our temporary file
      if (performBackup) {
        const backupFile = path.join(backupDirectory, BACKUP_PREFIX+fileName+'_'+Date.now());
        fs.copyFile(tempFile, backupFile, (err) => {
          if (err) {
            error("Failed to create a backup to: ", backupFile);
            throw new Error(err);
          }
        });
      }
    }catch (backupErr) {
      error("Failed on managing backup files", err);
    }
    });
  }catch (err) {
    try{
      fs.mkdirSync(backupDirectory, { recursive: true });
      fs.writeFileSync(tempFile, '', { flag: 'wx' });
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

function generatePlainPassword() {
  return Math.random().toString(36);
}

function generateDemoUsername() {
  return 'demo-user_' + generateDemoUsernameSuffix();
}

function generateDemoUsernameSuffix() {
  return Math.random().toString(36).slice(2).substring(0, 5);
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
  error("Invalid endpoint token", message);
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

/**
 * Cleanup a demo account matching the passed username
 * This will delete their saved directory/files
 * Note this doesn't save the auth file, that's up to the caller
 */
function cleanupDemoAccount(username, authData) {
  if (authData &&
      username && typeof username === 'string' &&
      username.trim().length > 0) {
    // Try to remove our storage files for the demo user
    const fileDirectory = path.join(FILE_DIR, username);
    fs.rmSync(fileDirectory, { recursive: true });
    
    // Also delete from our local memory auth setup
    delete authData[username];
  }
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
        error("Couldn't convert date limit to number", req.query.limit);
        limitDate = -1;
      }
    }catch(err) {
      error("Failed to convert passed date limit [ "+ req.query.limit + " ]", err);
      limitDate = -1;
    }
  }
  
  // Limit our Things and wrap the return with some metadata
  const limitedThings = getInMemoryThings(getAuthUsername(req), limitDate);
  let toReturn = {
    metadata: {
      totalCount: getInMemoryThings(getAuthUsername(req)).length
    },
    data: addURLsToThings(getAuthUsername(req), limitedThings)
  };
  
  return res.send(toReturn).end();
});

app.get("/pthing/:thingId", (req, res) => {
  try{
    // We have the desired Thing ID as a param, and the Username to look in as a query string
    const thingId = req.params?.thingId;
    const username = req.query?.username;
    
    if (!thingId || !username) {
      throw new Error('Missing Thing ID or User');
    }
    
    log("GET Public Thing", thingId, username);
    
    // Pull in the Things for the desired user, then find our matching ID
    const userThings = getInMemoryThings(username);
    if (userThings && userThings.length > 0) {
      const matchingArray = userThings.filter(thing => thing.id === thingId);
      if (matchingArray && matchingArray.length > 0 &&
          matchingArray[0].public) {
        // Increase our view count and save the changes, in a separate thread to not block the page load
        setTimeout(() => {
          const matchingThing = matchingArray[0];
          matchingThing.viewCount = (typeof matchingThing.viewCount === 'number') ? matchingThing.viewCount+1 : 1;
          saveThingsMemoryToFile(username);
        });
        
        // Clone what we're going to return so the modified URLs don't save
        const toReturn = addURLsToThings(username, [ JSON.parse(JSON.stringify(matchingArray[0])) ]);
        return res.send(toReturn[0]).end();
      }
    }
  }catch (err) {
    error(err);
  }
  
  return res.status(400).end();
});

app.get("/pdownload/:thingId", async (req, res) => {
  try{
    // We have the desired Thing ID as a param, and the Username to look in as a query string
    const thingId = req.params?.thingId;
    const username = req.query?.username;
    
    if (!thingId || !username) {
      throw new Error('Missing Thing ID or User');
    }
    
    log("GET Download Public Thing", thingId, username);
    
    // Pull in the Things for the desired user, then find our matching ID and ensure we're valid to ZIP
    let downloadFilename = null;
    let downloadPath = null;
    const userThings = getInMemoryThings(username);
    if (userThings && userThings.length > 0) {
      let checkThings = userThings.filter(thing => thing.id === thingId);
      if (checkThings && checkThings.length > 0 &&
          checkThings[0].public && checkThings[0].gallery &&
          Array.isArray(checkThings[0].uploads) && checkThings[0].uploads.length > 0) {
        downloadPath = getAttachmentPath(username, thingId);
        downloadFilename = checkThings[0].name + '.zip';
      }
    }
    
    // If we couldn't find a valid Thing to try to download, error out
    if (!downloadPath || !downloadFilename) {
      error("Download path or filename is invalid when trying to get a ZIP");
      return res.status(400).end();
    }
    
    const zipFile = new zipper.ZipFile();
    // Add an entire directory recursively
    fs.readdirSync(downloadPath).forEach(file => {
        zipFile.addFile(path.join(downloadPath, file), file);
    });
    
    zipFile.outputStream.pipe(res);
    res.setHeader('Content-Type', 'application/zip');
    res.attachment(downloadFilename);
    zipFile.end(); // Don't need to return `res` itself as closing the stream via our library will achieve the same
    log('Download ZIP file ' + downloadFilename + ' from ' + username + ' and Thing ' + thingId);
  }catch (err) {
    error(err);
    return res.status(400).end();
  }
});

app.post("/things", (req, res) => {
  const toSave = req.body;
  log("POST Thing", toSave);
  if (hasInvalidFields(toSave.id, toSave.name, toSave.templateType)) { return res.status(400).end(); }
  
  // Determine if our object exists by ID or not
  let justAdd = true;
  const things = getInMemoryThings(getAuthUsername(req));
  for (let i = things.length-1; i >= 0; i--) {
    if (toSave.id === things[i].id) {
      try{
        // If we're editing an existing Thing determine if incoming uploads differs from saved uploads
        if (Array.isArray(things[i].uploads) && things[i].uploads.length > 0) {
          // Case 1: Existing Thing has uploads, but incoming has none = delete all uploads
          if (!Array.isArray(toSave.uploads) || toSave.uploads.length === 0) {
            removeAttachmentDirectory(getAuthUsername(req), things[i].id);
          }
          // Case 2: Both existing and incoming Thing have uploads, so check for differences
          else {
            // Loop through our existing uploads and ensure they are still present in the latest incoming version
            // If not we'll aim to delete them
            things[i].uploads.forEach(existingUpload => {
              let stillExists = toSave.uploads.filter(incomingUpload => {
                return incomingUpload.name === existingUpload.name &&
                       incomingUpload.size === existingUpload.size &&
                       incomingUpload.type === existingUpload.type;
              }).length > 0;
              
              if (!stillExists) {
                removeAttachmentFile(getAuthUsername(req), things[i].id, existingUpload.name);
              }
            });
          }
        }
      }catch (err) {
        // On error we don't want to prevent our Thing update, so just note the problem
        error('Upload diff failed for Thing ID=' + things[i].id, err);
      }
      
      justAdd = false;
      things.splice(i, 1, toSave);
    }
  }
  
  if (justAdd) {
    getInMemoryThings(getAuthUsername(req)).push(toSave);
  }
  
  saveThingsMemoryToFile(getAuthUsername(req));
  return res.status(200).end();
});

app.post("/things/delete", (req, res) => {
  log("POST Things Delete count", req.body.deleteIds?.length);
  if (hasInvalidFields(req.body.deleteIds)) { return res.status(400).end(); }
  
  if (Array.isArray(req.body.deleteIds) && req.body.deleteIds.length > 0) {
    const toWork = getInMemoryThings(getAuthUsername(req));
    
    // Loop through all our items, and determine if they match a deletion request
    for (let checkIndex = toWork.length-1; checkIndex >= 0; checkIndex--) {
      for (let deleteIndex = 0; deleteIndex < req.body.deleteIds.length; deleteIndex++) {
        // Safely try to delete in case any part of our data is invalid
        try{
          if (toWork[checkIndex]?.id === req.body.deleteIds[deleteIndex]) {
            // Also if we have any associated uploads burn 'em all
            // ALL OF THEM
            // The entire directory, no one is safe!
            try {
              if (toWork[checkIndex].gallery ||
                  (toWork[checkIndex].uploads || Array.isArray(toWork[checkIndex].uploads) || toWork[checkIndex].uploads.length > 0)) {
                removeAttachmentDirectory(getAuthUsername(req), toWork[checkIndex].id);
              }
            // Even more safety, as we can potentially end up with leftover directories, but still want to remove the Thing
            }catch (ignored) { }
            
            // Finally remove from our list
            toWork.splice(checkIndex, 1);
          }
        }catch (ignored) { }
      }
    }
    // TODO Run a scheduled task to determine if there's any hanging directories (with no related Thing) and auto-clean them up
    saveThingsMemoryToFile(getAuthUsername(req));
  }
  
  return res.status(200).end();
});

app.post('/upload-thing/:thingId', async (req, res) => {
  const thingId = req.params?.thingId;
  const authUsername = getAuthUsername(req);
  const uploadedFiles = req.files;
  if (!thingId || !authUsername ||
      !uploadedFiles || Object.keys(uploadedFiles).length === 0) {
    return res.status(400).end();
  }
  
  // Only take the first file, we're a single upload after all
  const toUpload = req.files[Object.keys(req.files)[0]];
  
  log('POST Upload File "' + toUpload.name + '" for ' + authUsername);
  
  const finalDirectory = getAttachmentPath(authUsername, thingId);
  try{
    fs.mkdirSync(finalDirectory, { recursive: true });
  }catch (err) {
    error('Failed to make upload directory', finalDirectory);
    return res.status(500).end();
  }
  
  const finalFinalPath = path.join(finalDirectory, toUpload.name); // v1.1_FiNal_Extra_v2_FINAL for sure, lol just for fun
  
  // Move our uploaded file to the final path
  await toUpload.mv(finalFinalPath, function(err) {
    // setTimeout(() => { // TODO Can be used to simulate upload latency to test a loading indicator
    if (err) {
      error("Error while trying to move uploaded file to ", finalFinalPath);
      return res.status(500).end();
    }
    
    return res.status(200).end();
    // }, Math.random() * 10000);
  });
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
  if (!hasInvalidFields(req.body.name)) {
    setInMemoryUserData(getAuthUsername(req), 'favorite', req.body);
  }
  else {
    setInMemoryUserData(getAuthUsername(req), 'favorite', null);
  }
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

app.post("/demo-end", tryDemoLimiter, async (req, res) => {
  log("END demo", req.body.username);
  if (hasInvalidFields(req.body.username)) { return res.status(400).end(); }
  
  try{
    // Cleanup the demo account (storage files and in-memory auth)
    cleanupDemoAccount(req.body.username, getInMemoryAuth());
    saveAuthMemoryToFile();
    
    return res.status(200).end();
  }catch (err) {
    error("Failed to remove demo account [ " + req.body.username + " ]", err);
  }
  
  return res.status(400).end();
});

// Public
app.post("/demo-start", tryDemoLimiter, async (req, res) => {
  log("***** START demo");
  
  const auth = getInMemoryAuth();
  if (auth) {
    // Create a user object to store in the auth file
    const demoObj = {
      isDemoAccount: true,
      username: generateDemoUsername(),
      password: createHashedPassword(generatePlainPassword()),
      authToken: generateAuthToken(),
      // Even though we clear the account on logout, there's a chance the user just leaves, so we will clear demo accounts after a day
      expires: add(new Date(), { days: 1 }).getTime()
    }
    
    // There's a crazy rare chance a username duplicates, I guess?
    // And that would lead to unintentional data leakage, which is bad enough we'll throw in a check
    // So if somehow our info already exists, just stack our username with random stuff even more
    if (auth[demoObj.username]) {
      error("Unbelievable, but a demo username was going to duplicate", demoObj.username);
      demoObj.username += generateDemoUsernameSuffix();
    }
    
    auth[demoObj.username] = demoObj;
    saveAuthMemoryToFile();
    
    // Setup our directory and file structure
    ensureUserFilesAreSetup(demoObj.username);
    
    // Then copy the latest Demo data in, so we have something to show the user
    // We'll do these safely, as one failure shouldn't wreck the demo
    // TODO Setup our live DEMO_DATA_DIR files with good, realistic, interesting data
    const baseSrcDir = path.join(FILE_DIR, DEMO_DATA_DIR);
    const baseTargetDir = path.join(FILE_DIR, demoObj.username);
    try{ fs.copyFileSync(path.join(baseSrcDir, THINGS_FILE), path.join(baseTargetDir, THINGS_FILE)); }catch (ignored) {}
    try{ fs.copyFileSync(path.join(baseSrcDir, TEMPLATES_FILE), path.join(baseTargetDir, TEMPLATES_FILE)); }catch (ignored) {}
    try{ fs.copyFileSync(path.join(baseSrcDir, FAVORITE_FILE), path.join(baseTargetDir, FAVORITE_FILE)); }catch (ignored) {}
    try{ fs.copyFileSync(path.join(baseSrcDir, SETTINGS_FILE), path.join(baseTargetDir, SETTINGS_FILE)); }catch (ignored) {}
    
    // After this, we need to re-read our files to store them in memory
    ensureUserFilesAreSetup(demoObj.username);
    
    return res.status(200).end(JSON.stringify(demoObj));
  }
  else {
    error("Invalid auth, couldn't read stored data");
  }
  
  // If we reached this far, give a 401 error as we don't have a valid user state
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
        // Determine if we have an existing session - this would be another tab or browser
        // In which case we just use our existing auth token to not invalidate the old session
        // We count "existing" as a last login of 10 minutes or less
        let generateNew = true;
        for (let key in auth) {
          // Check if we found our user
          if (req.body.username === key &&
              auth.hasOwnProperty(key)) {
            const matchingUser = auth[key];
            
            // Determine that we're valid
            if (matchingUser.authToken && matchingUser.lastLogin) {
              // Check if the timing of our last login is okay, in which case we just use our existing authToken
              if (differenceInMinutes(new Date(matchingUser.lastLogin), new Date()) <= 10) {
                log("Existing session found, using same token for", key);
                generateNew = false;
                break;
              }
            }
          }
        }
        
        // If requested update our auth token
        if (generateNew) {
          userObj.authToken = generateAuthToken();
        }
        
        // Update our login and store the info
        userObj.lastLogin = new Date().toLocaleString();
        saveAuthMemoryToFile();
        
        // Setup our files and in-memory data as needed
        ensureUserFilesAreSetup(convertUsernameToFilesafe(req.body.username));
        
        // Make our data to return, basic username and auth token
        const toReturn = {
          username: req.body.username,
          authToken: userObj.authToken,
        };
        
        // If we requested to save our login, return the hashed password too
        if (req.body.saveLogin) {
          toReturn.password = userObj.password;
        }
        
        // Mark our account as a demo if necessary
        if (userObj.isDemoAccount) {
          toReturn.isDemoAccount = true;
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
  log("***** New account requested as [ " + req.body.username + " ] from [ " + req.body.email + " ]");
  if (hasInvalidFields(req.body.username, req.body.email)) { return res.status(400).end(); }
  
  let success = false;
  try{
    const mailjetApi = mailjet.apiConnect(
      config.get('mailjet.apiKey'),
      config.get('mailjet.secretKey'),
    );
    
    const generatedPassword = generatePlainPassword();
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
