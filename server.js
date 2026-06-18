import express from 'express';
import { IncomingForm } from 'formidable';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static('./'));

if (!fs.existsSync('./temp')) {
  fs.mkdirSync('./temp');
}

const SUPPORTED_FORMATS = ['pdf', 'jpg', 'png', 'docx', 'mp3', 'webp', 'txt', 'epub', 'wav', 'ogg', 'tiff', 'bmp', 'gif', 'doc', 'odt', 'rtf', 'html'];

app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: './temp', keepExtensions: true, maxFileSize: 20 * 1024 * 1024 });
  
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    const currentExt = path.extname(file.originalFilename).toLowerCase().replace('.', '');

    if (currentExt === format) {
      return res.status(400).json({ error: `File is already in ${format.toUpperCase()} format.` });
    }

    if (!SUPPORTED_FORMATS.includes(format)) {
      return res.status(400).json({ error: "Format not supported." });
    }

    const outputFilename = `${Date.now()}.${format}`;
    const outputPath = path.join('./temp', outputFilename);
    
    let cmd = '';
    if (['mp3', 'wav', 'ogg'].includes(format)) {
        cmd = `ffmpeg -i "${file.filepath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`;
    } else {
        cmd = `soffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp`;
    }
    
    exec(cmd, { timeout: 45000 }, (error) => {
      if (error) return res.status(500).json({ error: "Conversion failed." });

      if (!['mp3', 'wav', 'ogg'].includes(format)) {
        const filesInTemp = fs.readdirSync('./temp');
        const convertedFile = filesInTemp.find(f => f.endsWith(`.${format}`) && f !== outputFilename);
        if (convertedFile) {
          fs.renameSync(path.join('./temp', convertedFile), outputPath);
        }
      }
      res.json({ url: `/download/${outputFilename}` });
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join('./temp', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, () => fs.unlinkSync(filePath));
  } else {
    res.status(404).send('File expired.');
  }
});

app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));