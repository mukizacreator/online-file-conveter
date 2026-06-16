import CloudConvert from 'cloudconvert';
import { IncomingForm } from 'formidable';

// This is crucial: it prevents Vercel from trying to parse the body automatically
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm();
  
  // Wrap in a promise to handle errors correctly
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable Error:", err);
      return res.status(500).json({ error: "File parsing failed: " + err.message });
    }

    try {
      // Robust file access: check if it's an array or single object
      const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
      const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;

      if (!uploadedFile) {
        return res.status(400).json({ error: "No file found in the request." });
      }

      console.log("File received:", uploadedFile.originalFilename);

      const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);
      
      let job = await cloudConvert.jobs.create({
        tasks: {
          'import-my-file': { operation: 'import/upload' },
          'convert-it': { 
            operation: 'convert', 
            input: 'import-my-file', 
            output_format: format 
          },
          'export-my-file': { 
            operation: 'export/url', 
            input: 'convert-it' 
          }
        }
      });

      await cloudConvert.tasks.upload(
        job.tasks.filter(t => t.name === 'import-my-file')[0], 
        uploadedFile.filepath, 
        uploadedFile.originalFilename
      );
      
      const finishedJob = await cloudConvert.jobs.wait(job.id);
      const url = finishedJob.tasks.filter(t => t.name === 'export-my-file')[0].result.files[0].url;

      res.status(200).json({ url });
    } catch (e) {
      console.error("CloudConvert Error:", e);
      res.status(500).json({ error: "Conversion error: " + e.message });
    }
  });
}