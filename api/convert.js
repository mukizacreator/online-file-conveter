import CloudConvert from 'cloudconvert';
import { IncomingForm } from 'formidable';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "File parsing error" });
    try {
      const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const format = Array.isArray(fields.format) ? fields.format[0] : fields.format;
      let job = await cloudConvert.jobs.create({
        tasks: {
          'import': { operation: 'import/upload' },
          'convert': { operation: 'convert', input: 'import', output_format: format },
          'export': { operation: 'export/url', input: 'convert' }
        }
      });
      await cloudConvert.tasks.upload(job.tasks.filter(t => t.name === 'import')[0], file.filepath, file.originalFilename);
      const finishedJob = await cloudConvert.jobs.wait(job.id);
      const url = finishedJob.tasks.filter(t => t.name === 'export')[0].result.files[0].url;
      res.status(200).json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}