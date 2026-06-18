app.post('/api/convert', (req, res) => {
  const form = new IncomingForm({ uploadDir: TEMP_DIR, keepExtensions: true });
  
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format).toLowerCase();
    
    const profileDir = path.join(TEMP_DIR, 'prof_' + Date.now());
    const startTime = Date.now();

    // Use absolute paths and verify
    const cmd = `soffice -env:UserInstallation=file://${profileDir} --headless --convert-to ${format} --outdir "${TEMP_DIR}" "${file.filepath}"`;

    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      // CLEANUP
      if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
      
      if (error) {
        // THIS IS WHERE THE TRUTH IS
        console.error("CONVERSION FAILED:");
        console.error("STDOUT:", stdout);
        console.error("STDERR:", stderr);
        return res.status(500).json({ error: "Conversion process exited with error." });
      }

      const filesInTemp = fs.readdirSync(TEMP_DIR);
      const convertedFile = filesInTemp
        .map(f => ({ name: f, time: fs.statSync(path.join(TEMP_DIR, f)).mtimeMs }))
        .filter(f => f.name.endsWith(`.${format}`) && f.time >= startTime)
        .sort((a, b) => b.time - a.time)[0];

      if (convertedFile) {
        res.json({ url: `/download/${convertedFile.name}` });
      } else {
        res.status(500).json({ error: "File not created by converter." });
      }
    });
  });
});