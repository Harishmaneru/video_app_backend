const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const https = require("https");
const http = require("http");
const app = express();
const PORT = 3000;
const uri = "mongodb+srv://harishmaneru:Xe2Mz13z83IDhbPW@cluster0.bu3exkw.mongodb.net/?retryWrites=true&w=majority&tls=true";

app.use(cors());

// Multer setup
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `video-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100000000 },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
}).single('video');

function checkFileType(file, cb) {
  const filetypes = /webm|mp4|avi/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Videos Only!');
  }
}

// MongoDB setup
let db;
MongoClient.connect(uri)
  .then(client => {
    console.log('Connected to Database');
    db = client.db('videoUploads');
  })
  .catch(error => console.error(error));

// Routes
app.post('/upload', (req, res) => {
  console.log('uploading video..')
  upload(req, res, (err) => {
    if (err) {
      res.status(400).send({ message: err });
    } else {
      if (req.file === undefined) {
        res.status(400).send({ message: 'No file selected!' });
      } else {
        const videoData = {
          filePath: `/uploads/${req.file.filename}`,
          uploadDate: new Date()
        };

        db.collection('videos').insertOne(videoData)
          .then(result => {
            console.log('video is uploaded successfully')
            res.json({ message: 'File uploaded and data saved to DB!', filePath: videoData.filePath });
          })
          .catch(error => {
            console.log('video failed to upload')
            res.status(500).send({ message: 'Failed to save data to DB.', error });
          });
      }
    }
  });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Server setup based on environment

  const base_path = __dirname;
  const privateKey = fs.readFileSync(base_path +'/onepgr.com.key',  'utf8');
  const certificate = fs.readFileSync(base_path + '/STAR_onepgr_com.crt', 'utf8');
  const caBundle = fs.readFileSync(base_path + '/STAR_onepgr_com.ca-bundle', 'utf8');
  
  const credentials = { key: privateKey, cert: certificate, ca: caBundle };
  
  const httpsServer = https.createServer(credentials, app);
  
  httpsServer.listen(PORT, () => {
    console.log('HTTPS Server running on port ' + PORT);
  });

  
  
  // HTTP to HTTPS redirect
  // http.createServer((req, res) => {
  //   res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
  //   res.end();
  // }).listen(80);

  // For development, run on HTTP
  // app.listen(PORT, () => console.log(`HTTP Server started on port ${PORT}`));
