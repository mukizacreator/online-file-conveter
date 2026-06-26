/* ============================================
   IMPORTS AND CONFIGURATION
   ============================================ */
import express from "express";
import { IncomingForm } from "formidable";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware: Parse JSON and serve static files
// Increase limit for photo uploads (base64 images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static("./"));

/* ============================================
   MONGODB CONNECTION
   ============================================ */
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

/* ============================================
   USER SCHEMA & MODEL
   ============================================ */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ============================================
   HTTPS REDIRECT
   ============================================ */
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

/* ============================================
   SECURITY HEADERS
   ============================================ */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Create temp directory if it doesn't exist
if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");

/* ============================================
   CONSTANTS AND SERVICES
   ============================================ */
const SUPPORTED_FORMATS = ["pdf", "jpg", "png", "docx", "webp", "txt", "epub", "tiff", "bmp", "gif", "doc", "odt", "rtf", "html"];
const verificationCodes = {};

/* ============================================
   EMAIL SERVICE - Brevo API
   ============================================ */
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'mukizacreator@gmail.com';
const FROM_NAME = 'Online File Converter';

/* ============================================
   API: SIGN UP (MongoDB)
   ============================================ */
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }
    
    // Create new user
    const newUser = new User({ username, email, password, photo: "" });
    await newUser.save();
    
    console.log(`✅ User registered: ${email}`);
    res.json({ success: true, message: "Account created successfully!" });
    
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account." });
  }
});

/* ============================================
   API: SIGN IN (MongoDB)
   ============================================ */
app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Account not found." });
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(400).json({ error: "Incorrect password." });
    }
    
    console.log(`✅ User signed in: ${email}`);
    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        photo: user.photo || ""
      }
    });
    
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Failed to sign in." });
  }
});

/* ============================================
   API: GET USER (MongoDB)
   ============================================ */
app.post("/api/get-user", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }
    
    res.json({
      username: user.username,
      email: user.email,
      photo: user.photo || "",
      password: user.password
    });
    
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user." });
  }
});

/* ============================================
   API: UPDATE USER (MongoDB) - Supports both JSON and FormData
   ============================================ */
app.post("/api/update-user", async (req, res) => {
  try {
    // Check if it's FormData or JSON
    let email, newEmail, newUsername, newPassword, photo;
    
    // If content-type is multipart/form-data, parse with formidable
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      const form = new IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          return res.status(400).json({ error: "Failed to parse form data." });
        }
        
        email = fields.email;
        newEmail = fields.newEmail;
        newUsername = fields.newUsername;
        newPassword = fields.newPassword;
        photo = fields.photo;
        
        await updateUser(email, newEmail, newUsername, newPassword, photo, res);
      });
    } else {
      // Handle JSON
      email = req.body.email;
      newEmail = req.body.newEmail;
      newUsername = req.body.newUsername;
      newPassword = req.body.newPassword;
      photo = req.body.photo;
      
      await updateUser(email, newEmail, newUsername, newPassword, photo, res);
    }
    
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user." });
  }
});

// Helper function for updating user
async function updateUser(email, newEmail, newUsername, newPassword, photo, res) {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "User not found." });
  }
  
  if (newEmail) user.email = newEmail;
  if (newUsername) user.username = newUsername;
  if (newPassword) user.password = newPassword;
  if (photo !== undefined && photo !== null && photo !== '') user.photo = photo;
  
  await user.save();
  
  console.log(`✅ User updated: ${user.email}`);
  res.json({
    success: true,
    user: {
      username: user.username,
      email: user.email,
      photo: user.photo || ""
    }
  });
}

/* ============================================
   API: DELETE USER (MongoDB)
   ============================================ */
app.post("/api/delete-user", async (req, res) => {
  try {
    const { email } = req.body;
    await User.deleteOne({ email });
    console.log(`✅ User deleted: ${email}`);
    res.json({ success: true });
    
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

/* ============================================
   API: EMAIL VERIFICATION
   ============================================ */
app.post("/api/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required." });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = code;
    
    console.log(`📧 Verification code for ${email}: ${code}`);

    // Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          email: FROM_EMAIL, 
          name: FROM_NAME 
        },
        to: [{ email: email }],
        subject: 'Your Verification Code - Online File Converter',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; border-radius: 15px; color: #ffffff;">
            <h2 style="color: #00bcd4; text-align: center;">🔐 Online File Converter</h2>
            <p style="text-align: center; font-size: 16px;">Your verification code is:</p>
            <div style="text-align: center; font-size: 36px; font-weight: bold; color: #00bcd4; background: rgba(0,188,212,0.1); padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="text-align: center; color: #888; font-size: 14px;">This code will expire in 5 minutes.</p>
            <p style="text-align: center; color: #555; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Verification email sent to ${email} via Brevo API (Message ID: ${data.messageId})`);
      return res.json({ success: true, message: "Verification code sent to your email." });
    } else {
      console.error("❌ Brevo API error:", data);
      throw new Error(data.message || "Failed to send email");
    }
    
  } catch (error) {
    console.error("❌ Email error:", error.message);
    
    // Fallback: Return code so user can proceed
    const code = verificationCodes[req.body.email];
    console.log(`⚠️ Fallback - Code for ${req.body.email}: ${code}`);
    
    return res.json({ 
      success: true, 
      message: "Verification code generated. Check your email or server logs.",
      fallback: true,
      code: code
    });
  }
});

app.post("/api/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || verificationCodes[email] !== code) {
    return res.json({ success: false });
  }
  delete verificationCodes[email];
  res.json({ success: true });
});

/* ============================================
   API: FILE CONVERSION
   ============================================ */
app.post("/api/convert", (req, res) => {
  const form = new IncomingForm({ uploadDir: "./temp", keepExtensions: true, maxFileSize: 20 * 1024 * 1024 });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    const currentExt = path.extname(file.originalFilename).toLowerCase().replace(".", "");

    console.log(`📁 File: ${file.originalFilename}, Current ext: ${currentExt}, Target: ${format}`);

    if (currentExt === format) {
      return res.status(400).json({ error: `File is already in ${format.toUpperCase()} format.` });
    }
    if (!SUPPORTED_FORMATS.includes(format)) {
      return res.status(400).json({ error: "Format not supported." });
    }

    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join("./temp", outputFilename);
    
    let cmd;
    const filePath = file.filepath;

    if (format === 'docx') {
      cmd = `soffice --headless --convert-to docx:"MS Word 2007 XML" "${filePath}" --outdir ./temp`;
    } else if (format === 'pdf') {
      cmd = `soffice --headless --convert-to pdf:writer_pdf_Export "${filePath}" --outdir ./temp`;
    } else {
      cmd = `soffice --headless --convert-to ${format} "${filePath}" --outdir ./temp`;
    }
    
    console.log(`🔧 Running command: ${cmd}`);

    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Conversion error:", error.message);
        console.error("Stderr:", stderr);
        return res.status(500).json({ error: `Conversion failed: ${error.message}` });
      }
      
      console.log("✅ Conversion completed");
      console.log("Stdout:", stdout);
      if (stderr) console.log("Stderr:", stderr);

      setTimeout(() => {
        try {
          const filesInTemp = fs.readdirSync("./temp");
          console.log("📂 Files in temp:", filesInTemp);
          
          if (fs.existsSync(outputPath)) {
            console.log("✅ Output file exists with correct name");
            return res.json({ url: `/download/${outputFilename}` });
          }
          
          const convertedFile = filesInTemp.find((f) => {
            const ext = path.extname(f).toLowerCase().replace(".", "");
            return ext === format && f !== outputFilename;
          });
          
          if (convertedFile) {
            const sourcePath = path.join("./temp", convertedFile);
            fs.renameSync(sourcePath, outputPath);
            console.log(`✅ File renamed from ${convertedFile} to ${outputFilename}`);
            return res.json({ url: `/download/${outputFilename}` });
          }
          
          if (format === 'docx') {
            const anyDocx = filesInTemp.find((f) => f.endsWith('.docx'));
            if (anyDocx) {
              const sourcePath = path.join("./temp", anyDocx);
              fs.renameSync(sourcePath, outputPath);
              console.log(`✅ Found and renamed DOCX: ${anyDocx} -> ${outputFilename}`);
              return res.json({ url: `/download/${outputFilename}` });
            }
          }
          
          console.error("❌ No output file found");
          return res.status(500).json({ error: "Conversion completed but output file not found. Please try a different format." });
          
        } catch (err) {
          console.error("❌ File processing error:", err);
          return res.status(500).json({ error: "Failed to process converted file." });
        }
      }, 3000);
    });
  });
});

/* ============================================
   API: FILE DOWNLOAD
   ============================================ */
app.get("/download/:filename", (req, res) => {
  const filePath = path.join("./temp", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error(`Download error for ${req.params.filename}:`, err.message);
      }
    });
  } else {
    res.status(404).send("File not found or already expired.");
  }
});

/* ============================================
   SCHEDULED FILE CLEANUP
   ============================================ */
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000;
  
  try {
    const files = fs.readdirSync("./temp");
    let cleanedCount = 0;
    
    files.forEach((file) => {
      const filePath = path.join("./temp", file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (statErr) {}
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old file(s) from temp directory`);
    }
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}, 5 * 60 * 1000);

/* ============================================
   SERVER STARTUP
   ============================================ */
app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));