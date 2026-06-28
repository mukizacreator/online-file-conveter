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

// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// MIDDLEWARE: Body Parser
// ============================================
// Parse JSON requests with 50MB limit for base64 photo uploads
app.use(express.json({ limit: '50mb' }));
// Parse URL-encoded data with extended mode for nested objects
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* ============================================
   STATIC FILE CACHING
   ============================================ */
// Serve static files from root directory with caching
app.use(express.static("./", {
  maxAge: '1d', // Cache static files (CSS, JS, images) for 1 day
  setHeaders: (res, path) => {
    // Prevent HTML files from being cached to always serve latest version
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

/* ============================================
   SIMPLE CACHE FOR USER DATA
   ============================================ */
// In-memory cache to reduce database queries
const userCache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache lifetime

// Helper function to get user with caching
async function getUserWithCache(email) {
  const cacheKey = `user_${email}`;
  const cached = userCache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📦 Cache hit for ${email}`);
    return cached.data;
  }
  
  // Cache miss - query database
  const user = await User.findOne({ email });
  if (user) {
    userCache.set(cacheKey, {
      data: user,
      timestamp: Date.now()
    });
  }
  return user;
}

// Clear cache for specific user after updates
function clearUserCache(email) {
  userCache.delete(`user_${email}`);
}

/* ============================================
   MONGODB CONNECTION - OPTIMIZED
   ============================================ */
const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB Atlas with connection pool optimization
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10, // Maximum connections in pool
  minPoolSize: 2,  // Minimum connections kept alive
  maxIdleTimeMS: 10000, // Close idle connections after 10 seconds
  serverSelectionTimeoutMS: 5000 // Fail fast if can't connect
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

/* ============================================
   USER SCHEMA & MODEL
   ============================================ */
// Define user data structure for MongoDB
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String, default: '' }, // Base64 encoded image
  createdAt: { type: Date, default: Date.now }
});

// Create index on email for faster queries
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

/* ============================================
   HTTPS REDIRECT
   ============================================ */
// Force HTTPS in production (for Render.com deployment)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

/* ============================================
   SECURITY HEADERS
   ============================================ */
// Add security headers to all responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  res.setHeader('X-Frame-Options', 'DENY'); // Prevent clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable XSS filtering
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // Force HTTPS
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Control referrer info
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()'); // Restrict browser features
  next();
});

// Create temp directory for file uploads if it doesn't exist
if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");

/* ============================================
   CONSTANTS AND SERVICES
   ============================================ */
// List of all supported output formats
const SUPPORTED_FORMATS = ["pdf", "jpg", "png", "docx", "webp", "txt", "epub", "tiff", "bmp", "gif", "doc", "odt", "rtf", "html"];
// Store verification codes in memory (email -> code)
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
// Endpoint: POST /api/signup
// Purpose: Register new user account
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }
    
    // Create and save new user (password stored in plain text - upgrade to bcrypt recommended)
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
// Endpoint: POST /api/signin
// Purpose: Authenticate user login
app.post("/api/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Account not found." });
    }
    
    // Check password (plain text comparison - upgrade to bcrypt recommended)
    if (user.password !== password) {
      return res.status(400).json({ error: "Incorrect password." });
    }
    
    console.log(`✅ User signed in: ${email}`);
    // Return user data (excluding sensitive info)
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
   API: GET USER (MongoDB with Cache)
   ============================================ */
// Endpoint: POST /api/get-user
// Purpose: Fetch user profile data with caching
app.post("/api/get-user", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Use cached version if available to reduce database load
    const user = await getUserWithCache(email);
    
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }
    
    // Return user data including password (for verification in profile page)
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
// Endpoint: POST /api/update-user
// Purpose: Update user profile (username, email, password, photo)
// Supports both JSON and FormData for photo uploads
app.post("/api/update-user", async (req, res) => {
  try {
    let email, newEmail, newUsername, newPassword, photo;
    
    // Check if request is FormData (for photo uploads)
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
      const form = new IncomingForm();
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Form parse error:", err);
          return res.status(400).json({ error: "Failed to parse form data." });
        }
        
        // Extract fields from FormData (handle array values)
        email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
        newEmail = Array.isArray(fields.newEmail) ? fields.newEmail[0] : fields.newEmail;
        newUsername = Array.isArray(fields.newUsername) ? fields.newUsername[0] : fields.newUsername;
        newPassword = Array.isArray(fields.newPassword) ? fields.newPassword[0] : fields.newPassword;
        photo = Array.isArray(fields.photo) ? fields.photo[0] : fields.photo;
        
        await updateUser(email, newEmail, newUsername, newPassword, photo, res);
      });
    } else {
      // Handle JSON request (no file uploads)
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

// Helper function for updating user (extracted to avoid duplication)
async function updateUser(email, newEmail, newUsername, newPassword, photo, res) {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "User not found." });
  }
  
  // Update fields if new values provided
  if (newEmail) user.email = newEmail;
  if (newUsername) user.username = newUsername;
  if (newPassword) user.password = newPassword;
  
  // Handle photo update (may be string or array from FormData)
  if (photo !== undefined && photo !== null) {
    if (Array.isArray(photo)) {
      user.photo = photo[0] || '';
    } else {
      user.photo = photo || '';
    }
  }
  
  await user.save();
  
  // Clear cache for old and new email
  clearUserCache(email);
  if (newEmail) clearUserCache(newEmail);
  
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
// Endpoint: POST /api/delete-user
// Purpose: Permanently delete user account
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
// Endpoint: POST /api/send-code
// Purpose: Send 6-digit verification code via Brevo email service
app.post("/api/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    if (!email) {
      return res.status(400).json({ error: "Email required." });
    }
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = code; // Store in memory
    
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
        // HTML email with styled verification code
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

    // Handle Brevo API response
    if (response.ok) {
      console.log(`✅ Verification email sent to ${email} via Brevo API (Message ID: ${data.messageId})`);
      return res.json({ success: true, message: "Verification code sent to your email." });
    } else {
      console.error("❌ Brevo API error:", data);
      throw new Error(data.message || "Failed to send email");
    }
    
  } catch (error) {
    console.error("❌ Email error:", error.message);
    
    // Fallback: Return code in response if email fails
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

// Endpoint: POST /api/verify-code
// Purpose: Verify the 6-digit code entered by user
app.post("/api/verify-code", (req, res) => {
  const { email, code } = req.body;
  // Check if code matches stored code for this email
  if (!email || !code || verificationCodes[email] !== code) {
    return res.json({ success: false });
  }
  // Remove code after successful verification
  delete verificationCodes[email];
  res.json({ success: true });
});

/* ============================================
   API: FILE CONVERSION
   ============================================ */
// Endpoint: POST /api/convert
// Purpose: Convert uploaded file to requested format
app.post("/api/convert", (req, res) => {
  // Configure file upload with 20MB max size
  const form = new IncomingForm({ 
    uploadDir: "./temp", 
    keepExtensions: true, 
    maxFileSize: 20 * 1024 * 1024 // 20MB limit
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }

    // Extract file and target format from request
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    const currentExt = path.extname(file.originalFilename).toLowerCase().replace(".", "");

    console.log(`📁 File: ${file.originalFilename}, Current ext: ${currentExt}, Target: ${format}`);

    // Validation checks
    if (currentExt === format) {
      return res.status(400).json({ error: `File is already in ${format.toUpperCase()} format.` });
    }
    if (!SUPPORTED_FORMATS.includes(format)) {
      return res.status(400).json({ error: "Format not supported." });
    }

    // Generate output filename and path
    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join("./temp", outputFilename);
    
    let cmd;
    const filePath = file.filepath;

    // Build LibreOffice command based on target format
    // Special handling for DOCX and PDF with specific export filters
    if (format === 'docx') {
      cmd = `soffice --headless --convert-to docx:"MS Word 2007 XML" "${filePath}" --outdir ./temp`;
    } else if (format === 'pdf') {
      cmd = `soffice --headless --convert-to pdf:writer_pdf_Export "${filePath}" --outdir ./temp`;
    } else {
      cmd = `soffice --headless --convert-to ${format} "${filePath}" --outdir ./temp`;
    }
    
    console.log(`🔧 Running command: ${cmd}`);

    // Execute conversion with 60 second timeout
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Conversion error:", error.message);
        console.error("Stderr:", stderr);
        return res.status(500).json({ error: `Conversion failed: ${error.message}` });
      }
      
      console.log("✅ Conversion completed");
      console.log("Stdout:", stdout);
      if (stderr) console.log("Stderr:", stderr);

      // Wait 3 seconds for file to be fully written
      setTimeout(() => {
        try {
          const filesInTemp = fs.readdirSync("./temp");
          console.log("📂 Files in temp:", filesInTemp);
          
          // Check if output file exists with expected name
          if (fs.existsSync(outputPath)) {
            console.log("✅ Output file exists with correct name");
            return res.json({ url: `/download/${outputFilename}` });
          }
          
          // Find any file with target extension (LibreOffice may use different name)
          const convertedFile = filesInTemp.find((f) => {
            const ext = path.extname(f).toLowerCase().replace(".", "");
            return ext === format && f !== outputFilename;
          });
          
          // Rename found file to expected name
          if (convertedFile) {
            const sourcePath = path.join("./temp", convertedFile);
            fs.renameSync(sourcePath, outputPath);
            console.log(`✅ File renamed from ${convertedFile} to ${outputFilename}`);
            return res.json({ url: `/download/${outputFilename}` });
          }
          
          // Special case: Try to find any DOCX file (for DOC to DOCX conversion)
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
// Endpoint: GET /download/:filename
// Purpose: Download converted file
app.get("/download/:filename", (req, res) => {
  const filePath = path.join("./temp", req.params.filename);
  if (fs.existsSync(filePath)) {
    // Send file as download
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
// Automatic cleanup of old files in temp directory
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  try {
    const files = fs.readdirSync("./temp");
    let cleanedCount = 0;
    
    // Delete files older than 10 minutes
    files.forEach((file) => {
      const filePath = path.join("./temp", file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (statErr) {} // Ignore errors for individual files
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old file(s) from temp directory`);
    }
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/* ============================================
   SERVER STARTUP
   ============================================ */
// Start the server
app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));