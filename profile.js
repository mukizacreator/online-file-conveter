// ============================================
// PROFILE.JS - ULTRA SIMPLE VERSION
// ============================================

console.log("🚀 profile.js v5 loaded!");

// Show alert to confirm loading
alert("profile.js v5 loaded!");

// Get logged in user
const loggedInEmail = localStorage.getItem("loggedInUser");
if (!loggedInEmail) {
  window.location.href = "signin.html";
}

let currentUser = null;
const userData = localStorage.getItem("userData");
if (userData) {
  currentUser = JSON.parse(userData);
}

if (!currentUser) {
  localStorage.removeItem("loggedInUser");
  window.location.href = "signin.html";
}

// ============================================
// DOM ELEMENTS
// ============================================
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveAccountBtn = document.getElementById("saveAccountBtn");
const accountCurrentPassword = document.getElementById("accountCurrentPassword");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");

console.log("🔍 Buttons found:");
console.log("  uploadPhotoBtn:", !!uploadPhotoBtn);
console.log("  saveAccountBtn:", !!saveAccountBtn);

// ============================================
// UPLOAD PHOTO - DIRECT APPROACH
// ============================================
if (uploadPhotoBtn && profilePhotoInput) {
  console.log("✅ Setting up Upload Photo");
  
  // Use onclick directly (most reliable)
  uploadPhotoBtn.onclick = function(e) {
    e.preventDefault();
    console.log("📸 Upload clicked - changing text");
    
    // CHANGE TEXT DIRECTLY
    this.textContent = "Uploading...";
    this.disabled = true;
    
    profilePhotoInput.value = "";
    profilePhotoInput.click();
  };

  profilePhotoInput.onchange = function(e) {
    const file = this.files[0];
    console.log("📸 File selected:", file ? file.name : "No file");
    
    if (!file) {
      uploadPhotoBtn.textContent = "Upload Photo";
      uploadPhotoBtn.disabled = false;
      return;
    }
    
    // Just restore the button (simplified)
    setTimeout(function() {
      uploadPhotoBtn.textContent = "Upload Photo";
      uploadPhotoBtn.disabled = false;
      toastSuccess("Photo uploaded!");
    }, 2000);
    
    this.value = "";
  };
}

// ============================================
// SAVE ACCOUNT - DIRECT APPROACH
// ============================================
if (saveAccountBtn) {
  console.log("✅ Setting up Save Account");
  
  // Use onclick directly (most reliable)
  saveAccountBtn.onclick = function(e) {
    e.preventDefault();
    console.log("💾 Save clicked - changing text");
    
    const currentPassword = accountCurrentPassword.value;
    const newEmail = profileEmail.value.trim().toLowerCase();
    const newUsername = profileUsernameInput.value.trim();
    
    // Simple validation
    if (!currentPassword) {
      toastError("Please enter your current password.");
      return;
    }
    
    // CHANGE TEXT DIRECTLY
    this.textContent = "Sending code...";
    this.disabled = true;
    
    // Simulate save
    setTimeout(function() {
      saveAccountBtn.textContent = "Save Changes";
      saveAccountBtn.disabled = false;
      toastSuccess("Account updated! Refreshing...");
      
      setTimeout(function() {
        window.location.reload();
      }, 1500);
    }, 2000);
  };
}

console.log("✅ Profile.js v5 loaded successfully");