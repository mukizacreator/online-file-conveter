import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static('./'));

const TEMP_DIR = path.join(os.tmpdir(), 'conv_files');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: TEMP_DIR, keepExtensions: true });
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    
    // Command with detailed error output
    const cmd = `soffice --headless --convert-to ${format} --outdir "${TEMP_DIR}" "${file.filepath}" 2>&1`;
    
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("DEBUG - Command Failed!");
        console.error("STDOUT:", stdout);
        console.error("STDERR:", stderr);
        return res.status(500).json({ error: "Conversion failed. Check Render logs for details." });
      }
      
      const filesInTemp = fs.readdirSync(TEMP_DIR);
      const convertedFile = filesInTemp.find(f => f.endsWith(`.${format}`));
      
      if (convertedFile) {
        const finalName = `${Date.now()}.${format}`;
        fs.renameSync(path.join(TEMP_DIR, convertedFile), path.join(TEMP_DIR, finalName));
        res.json({ url: `/download/${finalName}` });
      } else {
        res.status(500).json({ error: "Conversion finished, but output file not found." });
      }
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(TEMP_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (!err) setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 600000);
    });
  } else {
    res.status(404).send('File expired.');
  }
});

app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));