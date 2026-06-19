/*
==================================================
SERVER
==================================================
*/

import express from "express";
import { IncomingForm } from "formidable";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT =
  process.env.PORT || 8080;

/*
==================================================
JSON support
==================================================
*/

app.use(express.json());

/*
==================================================
Serve website files
==================================================
*/

app.use(
  express.static("./")
);

/*
==================================================
Temporary folder
==================================================
*/

if (
  !fs.existsSync("./temp")
) {
  fs.mkdirSync("./temp");
}

/*
==================================================
Supported formats
==================================================
*/

const SUPPORTED_FORMATS = [
  "pdf",
  "jpg",
  "png",
  "docx",
  "mp3",
  "webp",
  "txt",
  "epub",
  "wav",
  "ogg",
  "tiff",
  "bmp",
  "gif",
  "doc",
  "odt",
  "rtf",
  "html"
];

/*
==================================================
Store verification codes
==================================================
*/

const verificationCodes =
  {};

/*
==================================================
Email transporter
==================================================
*/

const transporter =
  nodemailer.createTransport({
    service: "gmail",

    auth: {
      user:
        process.env.EMAIL_USER,

      pass:
        process.env.EMAIL_PASS
    }
  });

/*
==================================================
Send verification code
==================================================
*/

app.post(
  "/api/send-code",
  async (
    req,
    res
  ) => {

    try {

      const {
        email
      } = req.body;

      if (!email) {
        return res
          .status(400)
          .json({
            error:
              "Email required."
          });
      }

      const code =
        Math.floor(
          100000 +
          Math.random() *
          900000
        ).toString();

      verificationCodes[
        email
      ] = code;

      await transporter
        .sendMail({

          from:
            `"Online File Converter" <${process.env.EMAIL_USER}>`,

          to: email,

          subject:
            "Verification Code",

          html: `
            <h2>
              Online File Converter
            </h2>

            <p>
              Your verification code is:
            </p>

            <h1>
              ${code}
            </h1>

            <p>
              Enter this code to continue.
            </p>
          `
        });

      res.json({
        success: true
      });

    }
    catch (
      error
    ) {

      console.error(
        error
      );

      res
        .status(500)
        .json({
          error:
            "Failed to send verification email."
        });
    }
  }
);

/*
==================================================
Verify code
==================================================
*/

app.post(
  "/api/verify-code",
  (
    req,
    res
  ) => {

    const {
      email,
      code
    } = req.body;

    if (
      !email ||
      !code
    ) {
      return res
        .status(400)
        .json({
          success:
            false
        });
    }

    if (
      verificationCodes[
        email
      ] !== code
    ) {
      return res
        .json({
          success:
            false
        });
    }

    delete
      verificationCodes[
        email
      ];

    res.json({
      success:
        true
    });
  }
);

/*
==================================================
File conversion
==================================================
*/

app.post(
  "/api/convert",
  (
    req,
    res
  ) => {

    const form =
      new IncomingForm({

        uploadDir:
          "./temp",

        keepExtensions:
          true,

        maxFileSize:
          20 *
          1024 *
          1024
      });

    form.parse(
      req,
      (
        err,
        fields,
        files
      ) => {

        if (err) {
          return res
            .status(500)
            .json({
              error:
                "Upload failed"
            });
        }

        const file =
          Array.isArray(
            files.file
          )
            ? files.file[0]
            : files.file;

        const format =
          (
            Array.isArray(
              fields.format
            )
              ? fields.format[0]
              : fields.format
          )
            .toLowerCase();

        const currentExt =
          path
            .extname(
              file.originalFilename
            )
            .toLowerCase()
            .replace(
              ".",
              ""
            );

        if (
          currentExt ===
          format
        ) {
          return res
            .status(400)
            .json({
              error:
                `File is already in ${format.toUpperCase()} format.`
            });
        }

        if (
          !SUPPORTED_FORMATS
            .includes(
              format
            )
        ) {
          return res
            .status(400)
            .json({
              error:
                "Format not supported."
            });
        }

        const outputFilename =
          `${Date.now()}.${format}`;

        const outputPath =
          path.join(
            "./temp",
            outputFilename
          );

        let cmd = "";

        if (
          [
            "mp3",
            "wav",
            "ogg"
          ].includes(
            format
          )
        ) {
          cmd =
            `ffmpeg -i "${file.filepath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`;
        }
        else {
          cmd =
            `soffice --headless --convert-to ${format} "${file.filepath}" --outdir ./temp`;
        }

        exec(
          cmd,
          {
            timeout:
              45000
          },
          (
            error
          ) => {

            if (
              error
            ) {
              return res
                .status(500)
                .json({
                  error:
                    "Conversion failed."
                });
            }

            if (
              ![
                "mp3",
                "wav",
                "ogg"
              ].includes(
                format
              )
            ) {
              const filesInTemp =
                fs.readdirSync(
                  "./temp"
                );

              const convertedFile =
                filesInTemp.find(
                  (
                    f
                  ) =>
                    f.endsWith(
                      `.${format}`
                    ) &&
                    f !==
                    outputFilename
                );

              if (
                convertedFile
              ) {
                fs.renameSync(
                  path.join(
                    "./temp",
                    convertedFile
                  ),
                  outputPath
                );
              }
            }

            res.json({
              url:
                `/download/${outputFilename}`
            });
          }
        );
      }
    );
  }
);

/*
==================================================
Download file
==================================================
*/

app.get(
  "/download/:filename",
  (
    req,
    res
  ) => {

    const filePath =
      path.join(
        "./temp",
        req.params
          .filename
      );

    if (
      fs.existsSync(
        filePath
      )
    ) {
      res.download(
        filePath,
        () => {
          fs.unlinkSync(
            filePath
          );
        }
      );
    }
    else {
      res
        .status(404)
        .send(
          "File expired."
        );
    }
  }
);

/*
==================================================
Start server
==================================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `Converter running on port ${PORT}`
    );

  }
);