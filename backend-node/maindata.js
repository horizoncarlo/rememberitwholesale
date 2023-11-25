const express = require("express");
const app = express();
const cors = require('cors');
const fs = require("fs");
const os = require("os");

const DEFAULT_TEMPLATES = [
  {
    "name": "Milestone",
    "isDefault": true
  },
  { // TODO TEMPORARY Template data - set default templates when a new user and their files are setup
    "name": "Longboard",
    "color": "pink",
    "fields": [
      {
        "property": "distance",
        "label": "Distance",
        "required": true,
        "type": "number"
      },
    ]
  },
  { // TODO TEMPORARY Template data
    "name": "Boardgame",
    "color": "goldenrod",
    "fields": [
      {
        "property": "numPlayers",
        "label": "Number of Players",
        "type": "number"
      },
      {
        "property": "whoWon",
        "label": "Winner Name",
        "type": "text"
      }
    ]
  }
];

const PORT_NUM = 4333;
const FILE_DIR = os.homedir() + '/.rememberitwholesale/';
const BACKUP_FILE = FILE_DIR + 'backup.json';

// TODO Combine files and property into an object, and then centralize functions so we don't have to duplicate read/write?
const THINGS_FILE = FILE_DIR + 'things.json';
const TEMPLATES_FILE = FILE_DIR + 'templates.json';

// TODO Need login functionality to protect our APIs

// TODO Configure CORS to just be from our website, instead of global/public access
app.use(cors());
app.use(express.json());

// Maintain our JSON data in memory, and read/write as needed as a whole chunk. Realistically don't need to overthink appending or streaming files for the sizes involved
// Each file should correspond to a "table" in our JSON pseudo-database
// TODO Will eventually need to maintain each of these on a per-user basis. Just assuming singleton access per user to avoid a lot of complexity and over engineering
let inMemory = {
  things: null,
  templates: null
};

// Fire up the server
app.listen(PORT_NUM, () => {
  console.log("Server running on port " + PORT_NUM);
  
  ensureFilesAreSetup();
});

function ensureFilesAreSetup() {
  // Ensure our initial files are ready
  setupSingleFile(THINGS_FILE);
  setupSingleFile(TEMPLATES_FILE);
}

function setupSingleFile(name) {
  try{
    fs.readFileSync(name);
  }catch(err) {
    fs.mkdirSync(FILE_DIR, { recursive: true });
    fs.writeFileSync(name, '', { flag: 'wx' });
  }
}

function readSingleFile(name, property) {
  try{
    // Determine if our file is empty, in which case we'll use an empty array
    if (fs.readFileSync(name)?.length <= 0) {
      inMemory[property] = [];
    }
    // Otherwise read our file
    else {
      inMemory[property] = JSON.parse(fs.readFileSync(name));
    }
  }catch(err) {
    setupSingleFile(name);
    inMemory[property] = [];
  }
}

function getInMemoryThings() {
  if (inMemory.things === null) {
    readSingleFile(THINGS_FILE, 'things');
  }
  return inMemory.things;
}

function getInMemoryTemplates() {
  if (inMemory.templates === null) {
    readSingleFile(TEMPLATES_FILE, 'templates');
  }
  
  // Default our templates if we have none, to ensure we at least have some preset
  if (!inMemory.templates || inMemory.templates.length === 0) {
    inMemory.templates = DEFAULT_TEMPLATES;
    try{
      saveTemplatesMemoryToFile();
    }catch (err) {
      console.error("Failed to save default templates", err);
    }
  }
  
  return inMemory.templates;
}

function saveThingsMemoryToFile() {
  console.log("WRITE Things", inMemory.things.length);
  writeSafeFile(THINGS_FILE, inMemory.things);
}

function saveTemplatesMemoryToFile() {
  console.log("WRITE Templates", inMemory.templates.length);
  writeSafeFile(TEMPLATES_FILE, inMemory.templates);
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

/***** API Endpoints *****/
app.get("/things", (req, res) => {
  console.log("GET Things", getInMemoryThings().length);
  return res.send(getInMemoryThings()).end();
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
      failError = 'Missing name';
    }
    if (!req.body.templateType || req.body.templateType.trim().length === 0) {
      failError = 'Missing template type';
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