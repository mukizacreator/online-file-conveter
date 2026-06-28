/* ============================================
   DOM ELEMENT SELECTION
   ============================================ */
// Get references to converter UI elements
const fileInput = document.getElementById("fileInput");
const result = document.getElementById("result");
const fileName = document.getElementById("fileName");
const convertBtn = document.getElementById("convertBtn");

// Only initialize if elements exist to prevent errors on non-converter pages
if (fileInput && result && fileName && convertBtn) {

  /* ============================================
     FILE SELECTION HANDLING
     ============================================ */
  // Triggers when user selects a file
  // Updates display with filename and truncates long names for UI consistency
  fileInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) {
      fileName.textContent = "No file chosen";
      result.innerHTML = "";
      return;
    }

    // Truncate long filenames: keep first 15 chars + last 6 chars + extension
    // Example: "verylongfilenamewithlotsofcharacters.pdf" -> "verylongfilena...acters.pdf"
    let name = file.name;
    if (name.length > 30) {
      const ext = name.substring(name.lastIndexOf("."));
      const base = name.substring(0, name.lastIndexOf("."));
      name = base.substring(0, 15) + "..." + base.substring(Math.max(base.length - 6, 15)) + ext;
    }
    fileName.textContent = name;
    result.innerHTML = ""; // Clear previous results when new file selected
  });

  /* ============================================
     CONVERSION PROCESS - MAIN BUTTON HANDLER
     ============================================ */
  // Main conversion button click handler
  // Manages authentication limits, visual progress tracking, and server interaction
  convertBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    // UI Feedback: Disable button to prevent multiple clicks and show spinner
    convertBtn.disabled = true;
    convertBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Converting...`;

    /* ============================================
       AUTHENTICATION & FILE SIZE VALIDATION
       ============================================ */
    // Guests are limited to 2MB files, logged-in users have no restriction
    const loggedInUser = localStorage.getItem("loggedInUser");
    const maxFreeSize = 2 * 1024 * 1024; // 2MB in bytes

    // Check if file exceeds limit and user is not logged in
    if (file.size > maxFreeSize && !loggedInUser) {
      // Show warning toast notification
      toastWarning("The file size is over the limit. Please sign in or sign up to convert files of 2+ MB");
      
      // After 2 seconds, display sign-in/sign-up options in result area
      setTimeout(() => { 
        result.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.08); padding:20px; border-radius:15px;">
            <p style="color:#ffcc80; line-height:1.8;">The file size is over the limit.<br><br>Please sign in or create an account to convert files of 2+ MB.</p>
            <a href="signin.html" class="download-btn" style="margin-right:10px;">Sign In</a>
            <a href="signup.html" class="download-btn">Sign Up</a>
          </div>
        `;
      }, 2000);
      
      // Reset button state
      convertBtn.disabled = false;
      convertBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Convert`;
      return; // Stop execution - don't proceed with conversion
    }

    /* ============================================
       PROGRESS TRACKING UI
       ============================================ */
    // Render progress bar in result area and start mock timer for client-side feedback
    result.innerHTML = `
      <div style="width:100%; background:#333; border-radius:12px; overflow:hidden;">
        <div id="progressBar" style="width:0%; height:22px; background:#28a745; transition: width .3s;"></div>
      </div>
      <p id="progressText">Preparing...</p>
    `;

    const bar = document.getElementById("progressBar");
    const text = document.getElementById("progressText");
    let progress = 0;
    
    // Simulate progress up to 95% while waiting for server response
    // This gives user visual feedback during the conversion process
    const timer = setInterval(() => {
      if (progress < 95) {
        progress += 5; // Increment by 5% every 300ms
        bar.style.width = progress + "%";
        text.textContent = progress + "%";
      }
    }, 300);

    /* ============================================
       UPLOAD AND API INTERACTION
       ============================================ */
    // Prepare form data with file and selected output format
    const formData = new FormData();
    formData.append("file", file);
    formData.append("format", document.getElementById("formatSelect").value);

    try {
      // Send conversion request to server via POST
      const response = await fetch("/api/convert", { 
        method: "POST", 
        body: formData 
      });
      const data = await response.json();
      clearInterval(timer); // Stop the progress simulation

      // Handle server-side failure (non-200 response)
      if (!response.ok) {
        toastError(data.error || "Conversion failed."); 
      } 
      // Handle successful conversion - show download link
      else {
        // Complete the progress bar to 100%
        bar.style.width = "100%";
        text.textContent = "100%";
        // Display success message with download button
        result.innerHTML = `
          <p>✅ Conversion completed successfully!</p>
          <a href="${data.url}" class="download-btn">Download File</a>
        `;
      }
    } catch (error) {
      // Handle network errors or server unavailability
      clearInterval(timer);
      toastError("Server error. Please try again.");
    }

    // Reset button state after completion (success or failure)
    convertBtn.disabled = false;
    convertBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Convert`;
  });
}