const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const https = require("https");
const http = require("http");
 const nodemailer = require('nodemailer'); 
const app = express();
const PORT = 3000;
const uri = "mongodb+srv://harishmaneru:Xe2Mz13z83IDhbPW@cluster0.bu3exkw.mongodb.net/?retryWrites=true&w=majority&tls=true";

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 300000000 },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
}).fields([
  { name: 'video1', maxCount: 1 },
  { name: 'video2', maxCount: 1 }
]);

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



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'harishmaneru44@gmail.com',
    pass: 'msxk vvgy ymhz ysbr'  
  }
});


app.post('/upload', (req, res) => {
  console.log('Processing upload request...');
  upload(req, res, (err) => {
    if (err) {
      res.status(400).send({ message: err });
    } else {
      if (!req.files || !req.files.video1 || !req.files.video2) {
        res.status(400).send({ message: 'Both video files are required!' });
      } else {
        const formData = req.body;
        const videoData = {
          video1Path: `/uploads/${req.files.video1[0].filename}`,
          video2Path: `/uploads/${req.files.video2[0].filename}`,
          uploadDate: new Date(),
          formData: formData
        };

        db.collection('applications').insertOne(videoData)
        .then(result => {
          
         
          const mailOptions = {
            from: 'harishmaneru44@gmail.com',
            to: 'rajiv@onepgr.com',
            subject: 'New Application Submitted',
            html: `
              <h1>New Application Details</h1>
              <p>Form Data:</p>
              ${Object.entries(formData).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
              <p>Video Links:</p>
              <ul>
                <li>Video 1: ${req.protocol}://${req.get('host')}${videoData.video1Path}</li>
                <li>Video 2: ${req.protocol}://${req.get('host')}${videoData.video2Path}</li>
              </ul>
            `
          };
          
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log('Error sending email:', error);
              res.status(500).send({ message: 'Failed to send email.', error });
            } else {
              console.log('Email sent:', info.response);
              res.json({ message: 'Application submitted successfully!', id: result.insertedId });
              console.log('Application submitted successfully!');
            }
          });
         
          res.json({ message: 'Application submitted successfully!', id: result.insertedId });
          console.log('Application submitted successfully!');
        });
      }
    }
  });
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

const options = {
  key: fs.readFileSync('./onepgr.com.key', 'utf8'),
  cert: fs.readFileSync('./STAR_onepgr_com.crt', 'utf8'),
  ca: fs.readFileSync('./STAR_onepgr_com.ca-bundle', 'utf8')
};

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = https.createServer(options, app);
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
