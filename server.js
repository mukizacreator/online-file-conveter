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
        // Using --nologo to keep the console output clean for successful parsing
        cmd = `soffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp`;
    }
    
    exec(cmd, { timeout: 60000 }, (error) => {
      if (error) {
        console.error("Conversion Error:", error);
        return res.status(500).json({ error: "Conversion failed. File might be protected or incompatible." });
      }

      // Robust file finding: look for the file just converted
      const baseName = path.parse(file.newFilename).name;
      const potentialOutput = path.join('./temp', `${baseName}.${format}`);
      
      if (fs.existsSync(potentialOutput)) {
        fs.renameSync(potentialOutput, outputPath);
        res.json({ url: `/download/${outputFilename}` });
      } else {
        res.status(500).json({ error: "Conversion finished, but output file not found." });
      }
    });
  });
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join('./temp', req.params.filename);
  if (fs.existsSync(filePath)) {
    // We do NOT delete immediately. We set a 5-minute timeout to allow the browser to finish
    res.download(filePath, (err) => {
      if (!err) {
        setTimeout(() => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 300000); 
      }
    });
  } else {
    res.status(404).send('File expired.');
  }
});

app.listen(PORT, () => console.log(`Converter running on port ${PORT}`));