const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const https = require("https");
const nodemailer = require('nodemailer');
const app = express();
const router = express.Router();

// MongoDB Connection
const uri = "mongodb+srv://harishmaneru:Xe2Mz13z83IDhbPW@cluster0.bu3exkw.mongodb.net/?retryWrites=true&w=majority&tls=true";
let db;
MongoClient.connect(uri)
  .then(client => {
    console.log('Connected to Database');
    db = client.db('feedbackSubmissions');
  })
  .catch(error => console.error(error));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'harish@onepgr.us',
    pass: 'jwto ghgt mnec exrb'
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    cb(null, `video-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 300000000 }, // 300MB limit
  fileFilter: (req, file, cb) => {
    // Check file type
    const filetypes = /webm|mp4|avi/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Error: Videos Only!');
    }
  }
}).single('video'); 

// POST /feedback endpoint
router.post('/', (req, res) => {
  console.log('Request received at /feedback endpoint');  // Log request initiation

  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message || 'Error uploading video' });
    }

    try {
      console.log('Request body:', req.body);  // Log request body (form data)
      
      const { fullName, email, feedback, videoURL, sendConfirmationEmail } = req.body;
      
      // Prepare feedback data
      const feedbackData = {
        fullName,
        email,
        feedback,
        videoURL,
        submissionDate: new Date(),
        sendConfirmationEmail: sendConfirmationEmail === 'true'
      };

      // Add video path if video was uploaded
      if (req.file) {
        feedbackData.recordedVideoPath = `/uploads/${req.file.filename}`;
        console.log('Video uploaded:', feedbackData.recordedVideoPath);  // Log video path
      } else {
        console.log('No video uploaded');
      }

      // Store in MongoDB
      const result = await db.collection('feedbacks').insertOne(feedbackData);
      console.log('Feedback stored in MongoDB with ID:', result.insertedId);  // Log MongoDB insertion ID

      // Prepare admin email
      const adminMailOptions = {
        from: 'harish@onepgr.us',
        // to: 'harishmaneru@gmail.com',
         to: 'rajiv@onepgr.com',  
        subject: `New Feedback Submission - ${fullName}`,
        html: `
          <h1>New Feedback Submission</h1>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Video URL:</strong> ${videoURL || 'N/A'}</p>
          <p><strong>Feedback:</strong> ${feedback}</p>
          ${req.file ? `<p><strong>Recorded Video:</strong> <a href="${req.protocol}://${req.get('host')}${feedbackData.recordedVideoPath}">View Recording</a></p>` : ''}
        `
      };

      // Send admin notification
      await transporter.sendMail(adminMailOptions);
      console.log('Admin notification email sent');  // Log admin email status

      // Send user confirmation if requested
      if (sendConfirmationEmail === 'true') {
        const userMailOptions = {
          from: 'harish@onepgr.us',
          to: email,
          subject: 'Thank You for Your Feedback',
          html: `
            <h2>Thank You for Your Feedback, ${fullName}</h2>
            <p>We have received your feedback. Here are the details:</p>
            <ul>
              <li><strong>Name:</strong> ${fullName}</li>
              <li><strong>Video URL:</strong> ${videoURL || 'N/A'}</li>
              <li><strong>Your Comments:</strong> ${feedback}</li>
            </ul>
            <p>We appreciate your input and will review your feedback.</p>
            <p>Thank you!</p>
          `
        };

        await transporter.sendMail(userMailOptions);
        console.log('User confirmation email sent');  
      }

      // Send response back to frontend
      res.status(200).json({
        message: 'Feedback submitted successfully!',
        id: result.insertedId
      });
      console.log('Feedback submission response sent to frontend'); 
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({
        message: 'Error processing feedback submission',
        error: error.message
      });
    }
  });
});

 
module.exports = router;
