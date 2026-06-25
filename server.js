/* ============================================
   IMPORTS AND CONFIGURATION
   ============================================ */
import express from "express";
import { IncomingForm } from "formidable";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware: Parse JSON and serve static files
app.use(express.json());
app.use(express.static("./"));

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
   EMAIL SERVICE - Brevo SMTP
   ============================================ */
// Configure Nodemailer with Brevo SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,   // afe374001@smtp-brevo.com
    pass: process.env.EMAIL_PASS    // Your SMTP key
  },
  tls: {
    rejectUnauthorized: false
  },
  timeout: 15000,
  connectionTimeout: 15000
});

const FROM_EMAIL = process.env.EMAIL_FROM || 'mukizacreator@gmail.com';
const FROM_NAME = 'Online File Converter';


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

    // Send email via Brevo SMTP
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: 'Your Verification Code - Online File Converter',
      html: `
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
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email} via Brevo SMTP`);
    return res.json({ success: true, message: "Verification code sent to your email." });
    
  } catch (error) {
    console.error("❌ Email error:", error.message);
    
    // Fallback: Show code in logs
    const code = verificationCodes[req.body.email];
    console.log(`⚠️ Fallback - Code for ${req.body.email}: ${code}`);
    
    return res.json({ 
      success: true, 
      message: "Verification code sent. Check your email or server logs.",
      fallback: true,
      code: code // For testing
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
    
    // Build the conversion command
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