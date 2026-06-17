import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.static('./'));

// Ensure temp directory exists
if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: './temp', keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parsing error' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;
    
    const inputPath = file.filepath;
    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join('./temp', outputFilename);
    
    let cmd = '';
    if (['pdf', 'docx', 'doc', 'odt', 'txt'].includes(format)) {
      cmd = `libreoffice --headless --convert-to ${format} "${inputPath}" --outdir ./temp`;
    } else {
      cmd = `convert "${inputPath}" "${outputPath}"`;
    }

    exec(cmd, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ url: `/download/${outputFilename}` });
    });
  });
});

// ADDED: The missing download route
app.get('/download/:filename', (req, res) => {
  const filePath = path.join('./temp', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (!err) fs.unlinkSync(filePath); // Cleanup after download
    });
  } else {
    res.status(404).send('File not found or already downloaded.');
  }
});

app.listen(8080, () => console.log('Converter running on port 8080'));