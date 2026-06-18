import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('./'));
const TEMP_DIR = path.join(os.tmpdir(), 'conv_files');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: TEMP_DIR, keepExtensions: true });
  
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    
    const profileDir = path.join(TEMP_DIR, 'prof_' + Date.now());
    const startTime = Date.now();

    let cmd = `soffice -env:UserInstallation=file://${profileDir} --headless --convert-to ${format} --outdir "${TEMP_DIR}" "${file.filepath}"`;
    if (['mp3', 'wav', 'ogg'].includes(format)) {
      cmd = `ffmpeg -i "${file.filepath}" -vn -acodec libmp3lame -q:a 2 "${file.filepath}.${format}"`;
    }

    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
      
      if (error) {
        console.error("CONVERSION FAILED:", stderr);
        return res.status(500).json({ error: "Conversion failed." });
      }

      setTimeout(() => {
        const filesInTemp = fs.readdirSync(TEMP_DIR);
        const convertedFile = filesInTemp
          .map(f => ({ name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtimeMs }))
          .filter(f => f.name.endsWith(`.${format}`) && f.time >= startTime)
          .sort((a, b) => b.time - a.time)[0];

        if (convertedFile) {
          res.json({ url: `/download/${convertedFile.name}` });
        } else {
          res.status(500).json({ error: "File not created." });
        }
      }, 1000);
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(TEMP_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (!err) fs.unlink(filePath, () => {});
    });
  } else {
    res.status(404).send('File not found.');
  }
});

app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));