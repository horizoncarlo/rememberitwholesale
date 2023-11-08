const express = require("express");
const app = express();
const cors = require('cors');
const fs = require("fs");
const os = require("os");

const PORT_NUM = 4333;
const FILE_DIR = os.homedir() + '/.rememberitwholesale/';
const DATA_FILE = FILE_DIR + 'data.json';

// TODO Configure CORS to just be from our website, instead of global/public access
app.use(cors());
app.use(express.json());

// Maintain our JSON data in memory, and read/write as needed as a whole chunk. Realistically don't need to overthink appending or streaming files for the sizes involved
// Children elements should correspond to each "table" in our JSON pseudo-database
// TODO Will eventually need to maintain each of these on a per-user basis. Just assuming singleton access per user to avoid a lot of complexity and over engineering
let inMemory = {
  data: null
};

// Fire up the server
app.listen(PORT_NUM, () => {
  console.log("Server running on port " + PORT_NUM);
  
  checkFilesSetup();
});

function checkFilesSetup() {
  // Ensure our initial files are ready
  try{
    fs.readFileSync(DATA_FILE);
  }catch(err) {
    fs.mkdirSync(FILE_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, '', { flag: 'wx' });
  }
}

function refreshInMemoryData() {
  try{
    // Determine if our file is empty, in which case we'll use an empty array
    if (fs.readFileSync(DATA_FILE)?.length <= 0) {
      inMemory.data = [];
    }
    // Otherwise read our file
    else {
      inMemory.data = JSON.parse(fs.readFileSync(DATA_FILE));
    }
  }catch(err) {
    checkFilesSetup();
    inMemory.data = [];
  }
}

function getInMemoryData() {
  if (inMemory.data === null) {
    refreshInMemoryData();
  }
  return inMemory.data;
}

function saveMemoryToFile() {
  console.error("WRITE", inMemory.data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(inMemory.data));
}

app.get("/data", (req, res) => {
  console.log("GET", getInMemoryData()); // TODO TEMPORARY Logging
  res.send(getInMemoryData()).end();
});

app.post("/data", (req, res) => {
  console.log("POST", req.body);
  
  // TODO Safely check req.body for validity
  // Add to our in memory data and write to JSON
  getInMemoryData().push(req.body);
  
  // TODO Write more safely - temp file first, once that is complete move it over the original
  // TODO Also handle errors
  saveMemoryToFile();
  res.status(200).end();
});

app.delete("/data/:id", (req, res) => {
  console.log("DELETE", req.params.id);
  
  let toWork = getInMemoryData();
  for (let i = toWork.length-1; i >= 0; i--) {
    if (req.params.id === toWork[i].id) {
      toWork.splice(i, 1);
    }
  }
  saveMemoryToFile();
  res.status(200).end();
});