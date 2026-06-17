import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.static('./'));
if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: './temp', keepExtensions: true });
  form.parse(req, (err, fields, files) => {
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;
    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join('./temp', outputFilename);
    
    // Improved command: output directly to the specific path
    const cmd = `libreoffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp && mv "./temp/${path.parse(file.originalFilename).name}.${format}" "${outputPath}"`;
    
    exec(cmd, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ url: `/download/${outputFilename}` });
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join('./temp', req.params.filename);
  res.download(filePath, (err) => { if (!err) fs.unlinkSync(filePath); });
});

app.listen(8080);