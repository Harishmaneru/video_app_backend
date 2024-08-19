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


let db;
MongoClient.connect(uri)
  .then(client => {
    console.log('Connected to Database');
    db = client.db('videoUploads');
  })
  .catch(error => console.error(error));


app.post('/upload', (req, res) => {
  console.log('video uploading...')
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
            res.json({ message: 'File uploaded and data saved to DB!', filePath: videoData.filePath });
            console.log('video uploaded successfully!...')
          })
          .catch(error => {
            res.status(500).send({ message: 'Failed to save data to DB.', error });
          });
      }
    }
  });
});

const options = {
  key: fs.readFileSync('./onepgr.com.key', 'utf8'),
  cert: fs.readFileSync('./STAR_onepgr_com.crt', 'utf8'),
  ca: fs.readFileSync('./STAR_onepgr_com.ca-bundle', 'utf8')
};
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const server = https.createServer(options, app);
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
