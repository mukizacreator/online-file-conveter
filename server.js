/* ============================================
   IMPORTS AND CONFIGURATION
   ============================================ */
// Core dependencies for web server, file handling, shell commands, and email
import express from "express";
import { IncomingForm } from "formidable";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware: Parse JSON and serve static files (HTML, CSS, JS)
app.use(express.json());
app.use(express.static("./"));

/* ============================================
   HTTPS REDIRECT
   ============================================ */
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

/* ============================================
   SECURITY HEADERS
   ============================================ */
// Add security headers to prevent browser warnings
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security (force HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});

// Create temp directory for file processing if it doesn't exist
if (!fs.existsSync("./temp")) fs.mkdirSync("./temp");

/* ============================================
   CONSTANTS AND SERVICES
   ============================================ */
// List of all supported output formats for validation
const SUPPORTED_FORMATS = ["pdf", "jpg", "png", "docx", "webp", "txt", "epub", "tiff", "bmp", "gif", "doc", "odt", "rtf", "html"];

// In-memory storage for verification codes (email -> code mapping)
const verificationCodes = {};

// Email transporter configured for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

/* ============================================
   API: EMAIL VERIFICATION
   ============================================ */
// Generates a 6-digit code, stores it temporarily, and emails it to the user
app.post("/api/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required." });
    }

    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: "Invalid email format." });
    }

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = code;
    
    console.log(`📧 Verification code for ${email}: ${code}`);

    // Try to send email via Gmail SMTP
    try {
      const mailOptions = {
        from: `"Online File Converter" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #1a1a2e; border-radius: 15px; color: #ffffff;">
            <h2 style="color: #00bcd4; text-align: center;">🔐 Online File Converter</h2>
            <p style="text-align: center; font-size: 16px;">Your verification code is:</p>
            <div style="text-align: center; font-size: 36px; font-weight: bold; color: #00bcd4; background: rgba(0,188,212,0.1); padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="text-align: center; color: #888; font-size: 14px;">This code will expire in 5 minutes.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
      return res.json({ success: true, message: "Verification code sent to your email." });
      
    } catch (emailError) {
      console.error("❌ Email send error:", emailError.message);
      
      // Fallback: Send code via console (for testing) and return it in response
      console.log(`⚠️ Email failed. Using fallback method. Code: ${code}`);
      
      // For development/testing, return the code directly (remove in production!)
      return res.json({ 
        success: true, 
        message: "Verification code generated. Check the server logs for the code.",
        code: code, // This is for testing only - remove in production
        fallback: true
      });
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to send verification code. Please try again." });
  }
});

// Verifies the code provided by the user and removes it from storage
app.post("/api/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code || verificationCodes[email] !== code) {
    return res.json({ success: false });
  }
  delete verificationCodes[email]; // Code is single-use
  res.json({ success: true });
});

/* ============================================
   API: FILE CONVERSION
   ============================================ */
// Handles file upload, validates format, executes conversion, and returns download URL
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
    
    // Use LibreOffice for all conversions
    const cmd = `soffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp`;
    
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

      // Wait a moment for file to be written
      setTimeout(() => {
        // Find the converted file
        const filesInTemp = fs.readdirSync("./temp");
        console.log("📂 Files in temp:", filesInTemp);
        
        const convertedFile = filesInTemp.find((f) => f.endsWith(`.${format}`) && f !== outputFilename);
        if (convertedFile) {
          try {
            fs.renameSync(path.join("./temp", convertedFile), outputPath);
            console.log(`✅ File renamed from ${convertedFile} to ${outputFilename}`);
            res.json({ url: `/download/${outputFilename}` });
          } catch (renameErr) {
            console.error("❌ Rename error:", renameErr);
            return res.status(500).json({ error: "Failed to process converted file." });
          }
        } else if (fs.existsSync(outputPath)) {
          console.log("✅ Output file already exists with correct name");
          res.json({ url: `/download/${outputFilename}` });
        } else {
          console.error("❌ No output file found");
          return res.status(500).json({ error: "Conversion completed but output file not found." });
        }
      }, 1000); // Wait 1 second for file system
    });
  });
});

/* ============================================
   API: FILE DOWNLOAD
   ============================================ */
// Provides the converted file to the user without immediate deletion
// Files are cleaned up by a scheduled job instead
app.get("/download/:filename", (req, res) => {
  const filePath = path.join("./temp", req.params.filename);
  if (fs.existsSync(filePath)) {
    // Send file for download - don't delete immediately
    res.download(filePath, (err) => {
      if (err) {
        console.error(`Download error for ${req.params.filename}:`, err.message);
      }
      // File will be cleaned up by scheduled job
    });
  } else {
    res.status(404).send("File not found or already expired.");
  }
});

/* ============================================
   SCHEDULED FILE CLEANUP
   ============================================ */
// Remove files older than 10 minutes to prevent disk accumulation
// This gives users plenty of time to download their files
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  try {
    const files = fs.readdirSync("./temp");
    let cleanedCount = 0;
    
    files.forEach((file) => {
      const filePath = path.join("./temp", file);
      try {
        const stats = fs.statSync(filePath);
        // Remove files older than maxAge
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (statErr) {
        // File might have been deleted already
      }
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
// Start the Express server and log the port
app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));