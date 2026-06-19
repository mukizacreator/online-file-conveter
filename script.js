/*
=========================================
ONLINE FILE CONVERTER
Main Frontend JavaScript File

This file:

1. Detects selected files
2. Displays the file name
3. Limits large files for guests
4. Sends files to the server
5. Shows conversion progress
6. Displays download links
=========================================
*/

/*
-----------------------------------------
Get HTML elements
-----------------------------------------
*/
const fileInput =
  document.getElementById(
    "fileInput"
  );

const result =
  document.getElementById(
    "result"
  );

const fileName =
  document.getElementById(
    "fileName"
  );

const convertBtn =
  document.getElementById(
    "convertBtn"
  );

/*
-----------------------------------------
Only continue if required elements exist.

This prevents JavaScript errors if this
file is loaded on other pages.
-----------------------------------------
*/
if (
  fileInput &&
  result &&
  fileName &&
  convertBtn
) {

  /*
  =========================================
  FILE SELECTION
  =========================================
  */

  fileInput.addEventListener(
    "change",
    function () {

      const file =
        this.files[0];

      /*
      No file selected
      */
      if (!file) {
        fileName.textContent =
          "No file chosen";

        result.innerHTML = "";
        return;
      }

      /*
      Display shorter names
      for very long filenames.
      */
      let name =
        file.name;

      if (
        name.length > 30
      ) {

        const ext =
          name.substring(
            name.lastIndexOf(".")
          );

        const base =
          name.substring(
            0,
            name.lastIndexOf(".")
          );

        name =
          base.substring(
            0,
            15
          ) +
          "..." +
          base.substring(
            Math.max(
              base.length - 6,
              15
            )
          ) +
          ext;
      }

      fileName.textContent =
        name;

      /*
      Clear previous result
      */
      result.innerHTML = "";
    }
  );

  /*
  =========================================
  CONVERT BUTTON
  =========================================
  */

  convertBtn.addEventListener(
    "click",
    async () => {

      const file =
        fileInput.files[0];

      /*
      User selected nothing
      */
      if (!file) {
        alert(
          "Please select a file first."
        );
        return;
      }

      /*
      Prevent multiple clicks
      while conversion is running.
      */
      convertBtn.disabled =
        true;

      convertBtn.innerHTML =
        `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Converting...
        `;

      /*
      Get logged in user
      */
      const loggedInUser =
        localStorage.getItem(
          "loggedInUser"
        );

      /*
      Guests may only convert
      files up to 3 MB.
      */
      const maxFreeSize =
        3 *
        1024 *
        1024;

      if (
        file.size >
          maxFreeSize &&
        !loggedInUser
      ) {

        result.innerHTML =
          `
          <div
            style="
              background:
                rgba(
                  255,
                  255,
                  255,
                  0.08
                );
              padding:20px;
              border-radius:15px;
            "
          >

            <p
              style="
                color:#ffcc80;
                line-height:1.8;
              "
            >
              Your file is larger
              than 3 MB.

              <br><br>

              Please sign in or
              create an account to
              convert larger files.
            </p>

            <a
              href="signin.html"
              class="download-btn"
              style="
                margin-right:10px;
              "
            >
              Sign In
            </a>

            <a
              href="signup.html"
              class="download-btn"
            >
              Sign Up
            </a>

          </div>
          `;

        convertBtn.disabled =
          false;

        convertBtn.innerHTML =
          `
          <i class="fa-solid fa-arrows-rotate"></i>
          Convert
          `;

        return;
      }

      /*
      =====================================
      Show Progress Bar
      =====================================
      */
      result.innerHTML =
        `
        <div
          style="
            width:100%;
            background:#333;
            border-radius:12px;
            overflow:hidden;
          "
        >

          <div
            id="progressBar"
            style="
              width:0%;
              height:22px;
              background:#28a745;
              transition:
                width .3s;
            "
          ></div>

        </div>

        <p
          id="progressText"
        >
          Preparing...
        </p>
        `;

      const bar =
        document.getElementById(
          "progressBar"
        );

      const text =
        document.getElementById(
          "progressText"
        );

      /*
      Fake progress while
      server is processing.
      */
      let progress =
        0;

      const timer =
        setInterval(() => {

          if (
            progress < 95
          ) {

            progress += 5;

            bar.style.width =
              progress +
              "%";

            text.textContent =
              progress +
              "%";
          }

        }, 300);

      /*
      =====================================
      Prepare Upload
      =====================================
      */
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "format",
        document.getElementById(
          "formatSelect"
        ).value
      );

      /*
      =====================================
      Send File To Server
      =====================================
      */
      try {

        const response =
          await fetch(
            "/api/convert",
            {
              method:
                "POST",
              body:
                formData
            }
          );

        const data =
          await response.json();

        clearInterval(
          timer
        );

        /*
        Conversion failed
        */
        if (
          !response.ok
        ) {

          result.innerHTML =
            `
            <p>
              ❌
              ${
                data.error ||
                "Conversion failed."
              }
            </p>
            `;

          convertBtn.disabled =
            false;

          convertBtn.innerHTML =
            `
            <i class="fa-solid fa-arrows-rotate"></i>
            Convert
            `;

          return;
        }

        /*
        Conversion successful
        */
        bar.style.width =
          "100%";

        text.textContent =
          "100%";

        result.innerHTML =
          `
          <p>
            ✅ Conversion completed successfully!
          </p>

          <a
            href="${data.url}"
            class="download-btn"
          >
            Download File
          </a>
          `;

      } catch (
        error
      ) {

        clearInterval(
          timer
        );

        /*
        Server error
        */
        result.innerHTML =
          `
          <p>
            ❌ Server error.
            Please try again.
          </p>
          `;
      }

      /*
      Restore Convert button
      */
      convertBtn.disabled =
        false;

      convertBtn.innerHTML =
        `
        <i class="fa-solid fa-arrows-rotate"></i>
        Convert
        `;
    }
  );
}