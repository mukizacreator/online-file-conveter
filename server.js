import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.static('./'));

// Ensure the temporary directory exists
if (!fs.existsSync('./temp')) {
  fs.mkdirSync('./temp');
}

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: './temp', keepExtensions: true });
  
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error("Form Parse Error:", err);
      return res.status(500).json({ error: 'Upload failed' });
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;
    
    // We define our target final path here
    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join('./temp', outputFilename);
    
    // Convert command (only running the conversion)
    const cmd = `soffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp`;
    
    exec(cmd, (error) => {
      if (error) {
        console.error("Conversion Error:", error);
        return res.status(500).json({ error: "Conversion process failed." });
      }

      // DYNAMIC DETECTION: Find the file that LibreOffice just created
      const filesInTemp = fs.readdirSync('./temp');
      
      // Find the file that matches the requested format, excluding our target outputFilename
      const convertedFile = filesInTemp.find(f => f.endsWith(`.${format}`) && f !== outputFilename);

      if (convertedFile) {
        // Move/Rename it to our timestamped filename for secure serving
        fs.renameSync(path.join('./temp', convertedFile), outputPath);
        res.json({ url: `/download/${outputFilename}` });
      } else {
        // Fallback: If it already matches, just send the URL
        res.status(500).json({ error: "Conversion completed but output file not found." });
      }
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join('./temp', req.params.filename);
  
  if (fs.existsSync(filePath)) {
    // Serve the file and delete it after download
    res.download(filePath, (err) => {
      if (!err) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Error deleting file:", e);
        }
      }
    });
  } else {
    res.status(404).send('File not found or already downloaded.');
  }
});

// Use the port provided by Render, or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));