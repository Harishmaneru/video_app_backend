const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const http = require('http');
const app = express();
const PORT = 3000;

 
app.use(cors());
app.use(express.json());


// Import routes from other files
const feedbackRoutes = require('./feedback');
const uploadRoutes = require('./server');   

 
app.use('/feedback', feedbackRoutes);
app.use('/server', uploadRoutes);   

 
const options = {
  key: fs.readFileSync('./onepgr.com.key', 'utf8'),
  cert: fs.readFileSync('./STAR_onepgr_com.crt', 'utf8'),
  ca: fs.readFileSync('./STAR_onepgr_com.ca-bundle', 'utf8')
};

// Create HTTPS server
const server = https.createServer(options, app);
 

// Start server
server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

