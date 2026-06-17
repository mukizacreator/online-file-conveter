import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.static('./')); // Serves index.html, style.css, script.js

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: './temp', keepExtensions: true });
  
  if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

  form.parse(req, (err, fields, files) => {
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;
    
    // Command selection logic
    const inputPath = file.filepath;
    const outputPath = path.join('./temp', `${Date.now()}.${format}`);
    let cmd = '';

    if (format === 'pdf' || format === 'docx') {
      cmd = `libreoffice --headless --convert-to ${format} "${inputPath}" --outdir ./temp`;
    } else {
      cmd = `convert "${inputPath}" "${outputPath}"`; // ImageMagick
    }

    exec(cmd, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ url: `/download/${path.basename(outputPath)}` });
    });
  });
});

app.listen(8080, () => console.log('Converter running on port 8080'));