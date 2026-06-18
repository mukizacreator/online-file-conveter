import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('./'));

// Use system temp directory for better compatibility
const TEMP_DIR = path.join(os.tmpdir(), 'conv_files');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: TEMP_DIR, keepExtensions: true, maxFileSize: 20 * 1024 * 1024 });
  
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    
    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join(TEMP_DIR, outputFilename);
    
    // Command for PDF to DOCX or other docs
    const profileDir = path.join(TEMP_DIR, 'profile_' + Date.now());
    const cmd = `soffice -env:UserInstallation=file://${profileDir} --headless --convert-to ${format} "${file.filepath}" --outdir "${TEMP_DIR}"`;
    
    exec(cmd, { timeout: 60000 }, (error) => {
      // Cleanup profile directory
      if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
      
      if (error) return res.status(500).json({ error: "Conversion failed. File may be encrypted or too large." });

      const baseName = path.parse(file.newFilename).name;
      const expectedFile = path.join(TEMP_DIR, `${baseName}.${format}`);

      if (fs.existsSync(expectedFile)) {
        fs.renameSync(expectedFile, outputPath);
        res.json({ url: `/download/${outputFilename}` });
      } else {
        res.status(500).json({ error: "Conversion finished but file not found." });
      }
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(TEMP_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    // We stream the file and ensure it exists until the pipe is finished
    const stream = fs.createReadStream(filePath);
    stream.on('end', () => {
      // Delete after 5 minutes, allowing ample time for the transfer
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 300000);
    });
    stream.pipe(res);
  } else {
    res.status(404).send('File expired.');
  }
});

app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));