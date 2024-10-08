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
const router = express.Router();
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
  { name: 'video2', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]);

function checkFileType(file, cb) {
  // Check if it's a resume file
  if (file.fieldname === 'resume') {
    const resumeFiletypes = /pdf|doc|docx/;
    const extname = resumeFiletypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.includes('pdf') || 
                    file.mimetype.includes('document') || 
                    file.mimetype.includes('msword') ||
                    file.mimetype.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Resume must be PDF or Word document!');
    }
  } 
  // Check if it's a video file
  else if (file.fieldname === 'video1' || file.fieldname === 'video2') {
    const videoFiletypes = /webm|mp4|avi/;
    const extname = videoFiletypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = videoFiletypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Videos Only!');
    }
  } else {
    cb('Error: Unknown file type!');
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
    user: 'harish@onepgr.us',
    pass: 'jwto ghgt mnec exrb'
  }
});

router.post('/', (req, res) => {
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
          resumePath: `/uploads/${req.files.resume[0].filename}`,
          uploadDate: new Date(),
          formData: formData
        };

        db.collection('applications').insertOne(videoData)
          .then(result => {
            const nameOfPerson = formData.fullName || 'Applicant';
            const currentDate = new Date().toLocaleDateString('en-US');
            const resumeDownloadUrl = `${req.protocol}://${req.get('host')}${videoData.resumePath}`;
            const mailOptions = {
              from: 'harish@onepgr.us',
              // to: 'harishmaneru@gmail.com',
               to: 'rajiv@onepgr.com',  
              subject: `VIDQU SUBMISSION - ${nameOfPerson} - ${currentDate}`,
              html: `
              <h1>New Application Details</h1>
        <table style="border-collapse: collapse; width: 60%;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Field</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Information</th>
          </tr>
          ${Object.entries(formData)
                  .filter(([key]) => key !== 'sendConfirmationEmail')
                  .map(([key, value]) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
              </tr>
            `).join('')}
        </table>

        <h3>Video Submissions:</h3>
        <ul>
          <li>Video 1: <a href="${req.protocol}://${req.get('host')}${videoData.video1Path}">View Video 1</a></li>
          <li>Video 2: <a href="${req.protocol}://${req.get('host')}${videoData.video2Path}">View Video 2</a></li>
          <li> <a href="${resumeDownloadUrl}">Download Resume</a></li>
        </ul>
            `
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.log('Error sending email:', error);
                res.status(500).send({ message: 'Failed to send email.', error });
              } else {
                console.log('Email sent:', info.response);

                // Send confirmation email to applicant if checkbox is checked
                if (formData.sendConfirmationEmail === 'true') {
                  const applicantMailOptions = {
                    from: 'harish@onepgr.us',
                    to: formData.email,
                    subject: 'Application Received - Thank You!',
                    html: `
                    <h2>Thank You for Your Application</h2>
                    <p>Dear ${nameOfPerson},</p>
                    <p>We have received your application for the position of ${formData.jobTitle}. Thank you for your interest in joining our team.</p>
                    
                    <h3>Application Details:</h3>
                    <table style="border-collapse: collapse; width: 50%;">
                      <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Field</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Information</th>
                      </tr>
                      ${Object.entries(formData)
                        .filter(([key]) => key !== 'sendConfirmationEmail')
                        .map(([key, value]) => `
                          <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;"><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong></td>
                            <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
                          </tr>
                        `).join('')}
                    </table>
                    <p>Our team will carefully review your application and get back to you regarding the next steps in the process.</p>
                    <p>We appreciate your interest and wish you the best in your job search.</p>
                    <p>Best regards,<br>ONEPGR Recruitment Team</p>
                  `
                  };
                  transporter.sendMail(applicantMailOptions, (applicantError, applicantInfo) => {
                    if (applicantError) {
                      console.log('Error sending confirmation email to applicant:', applicantError);
                    } else {
                      console.log('Confirmation email sent to applicant:', applicantInfo.response);
                    }
                  });
                }
                res.json({ message: 'Application submitted successfully!', id: result.insertedId });
                console.log('Application submitted successfully!');
              }
            });
          });
      }
    }
  });
});

module.exports = router;


// app.get('/api/hello', (req, res) => {
//   res.json({ message: 'Hello, World!' });
// });
// const options = {
//   key: fs.readFileSync('./onepgr.com.key', 'utf8'),
//   cert: fs.readFileSync('./STAR_onepgr_com.crt', 'utf8'),
//   ca: fs.readFileSync('./STAR_onepgr_com.ca-bundle', 'utf8')
// };
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// const server = https.createServer(options, app);
// server.listen(PORT, () => console.log(`Server started on port ${PORT}`));