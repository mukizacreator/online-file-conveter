// ============================================
// PROFILE.JS - VERSION 10 (COMPLETE)
// ============================================
// Main JavaScript file for profile.html
// Handles: Loading user data, photo upload/removal, account updates,
//          password changes, logout, account deletion, and UI interactions

console.log("🚀 profile.js v10 LOADED!");

/* ============================================
   SESSION VERIFICATION
   ============================================ */
// Check if user is logged in by checking localStorage
const loggedInEmail = localStorage.getItem("loggedInUser");
if (!loggedInEmail) {
  // Redirect to sign-in page if not logged in
  window.location.href = "signin.html";
}

let currentUser = null;
const userData = localStorage.getItem("userData");
if (userData) {
  currentUser = JSON.parse(userData);
}

// If user data doesn't exist in localStorage, redirect to sign-in
if (!currentUser) {
  localStorage.removeItem("loggedInUser");
  window.location.href = "signin.html";
}

console.log("Current user:", currentUser);

/* ============================================
   DOM ELEMENTS - REFERENCES TO HTML ELEMENTS
   ============================================ */
// Profile photo elements
const profileImage = document.getElementById("profileImage");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");

// User info display elements
const profileUsername = document.getElementById("profileUsername");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");

// Profile view (read-only) elements
const profileViewUsername = document.getElementById("profileViewUsername");
const profileViewEmail = document.getElementById("profileViewEmail");

// Account panel elements (editable)
const accountUsernameDisplay = document.getElementById("accountUsernameDisplay");
const accountEmailDisplay = document.getElementById("accountEmailDisplay");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const accountCurrentPassword = document.getElementById("accountCurrentPassword");

// Panel containers
const profileView = document.getElementById("profileView");
const accountPanel = document.getElementById("accountPanel");
const securityPanel = document.getElementById("securityPanel");

// Tab navigation
const accountTab = document.getElementById("accountTab");
const securityTab = document.getElementById("securityTab");

// Action buttons
const saveAccountBtn = document.getElementById("saveAccountBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

// Default profile icon (used when no photo is uploaded)
const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

// Debug logging to verify elements exist
console.log("🔍 Buttons found:");
console.log("  uploadPhotoBtn:", !!uploadPhotoBtn);
console.log("  saveAccountBtn:", !!saveAccountBtn);
console.log("  accountTab:", !!accountTab);
console.log("  securityTab:", !!securityTab);

/* ============================================
   LOAD USER DATA FROM MONGODB
   ============================================ */
// Fetches user data from server and updates all UI elements
async function loadUserData() {
  try {
    // POST request to get user data from database
    const res = await fetch("/api/get-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loggedInEmail })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Update currentUser and cache in localStorage
    currentUser = data;
    localStorage.setItem("userData", JSON.stringify(data));

    console.log("User data loaded:", currentUser);

    // Update ALL UI elements with user data
    // Profile sidebar
    if (profileUsername) profileUsername.textContent = data.username || 'User';
    if (profileEmailDisplay) profileEmailDisplay.textContent = data.email || 'user@email.com';
    
    // Profile view (read-only)
    if (profileViewUsername) profileViewUsername.textContent = data.username || 'User';
    if (profileViewEmail) profileViewEmail.textContent = data.email || 'user@email.com';
    
    // Account panel (current info display)
    if (accountUsernameDisplay) accountUsernameDisplay.textContent = data.username || 'User';
    if (accountEmailDisplay) accountEmailDisplay.textContent = data.email || 'user@email.com';
    
    // Account panel (input fields)
    if (profileEmail) profileEmail.value = data.email || '';
    if (profileUsernameInput) profileUsernameInput.value = data.username || '';
    
    // Profile photo
    if (profileImage) profileImage.src = data.photo || DEFAULT_ICON;

    // Navigation bar profile photo and username
    const navProfilePhoto = document.getElementById("navProfilePhoto");
    if (navProfilePhoto) {
      navProfilePhoto.src = data.photo || DEFAULT_ICON;
    }
    const navUsername = document.getElementById("navUsername");
    if (navUsername) navUsername.textContent = data.username || 'Profile';

    // Update delete photo button visibility
    updateDeletePhotoButton();
  } catch (error) {
    console.error("Load user error:", error);
    toastError("Failed to load user data.");
  }
}

/* ============================================
   DELETE PHOTO BUTTON - DYNAMIC CREATION
   ============================================ */
// Shows/hides the "Remove" photo button based on whether user has a photo
function updateDeletePhotoButton() {
  const container = document.getElementById("removePhotoContainer");
  if (!container) return;
  container.innerHTML = ''; // Clear existing button

  // Check if user has a custom photo (not default or empty)
  const hasPhoto = currentUser && currentUser.photo && currentUser.photo !== DEFAULT_ICON && currentUser.photo !== "";

  if (hasPhoto) {
    // Create remove photo button
    const deletePhotoBtn = document.createElement("button");
    deletePhotoBtn.id = "deletePhotoBtn";
    deletePhotoBtn.className = "convert-btn";
    deletePhotoBtn.style.cssText = "padding:5px 15px; font-size:0.75rem; background:#e53935; display:inline-block;";
    deletePhotoBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove';
    
    // Click handler to remove photo
    deletePhotoBtn.onclick = async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      try {
        // Send request to set photo to empty string
        const res = await fetch("/api/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loggedInEmail, photo: "" })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove photo.");
        }
        
        // Update local data
        currentUser.photo = "";
        localStorage.setItem("userData", JSON.stringify(currentUser));
        
        // Update UI
        if (profileImage) profileImage.src = DEFAULT_ICON;
        const navProfilePhoto = document.getElementById("navProfilePhoto");
        if (navProfilePhoto) navProfilePhoto.src = DEFAULT_ICON;
        
        // Refresh delete button state
        updateDeletePhotoButton();
        toastSuccess("Profile photo removed!");
        
      } catch (error) {
        console.error("Remove photo error:", error);
        toastError(error.message || "Failed to remove photo.");
      }
    };
    
    container.appendChild(deletePhotoBtn);
  }
  // If no photo, container remains empty (button hidden)
}

/* ============================================
   ACCOUNT & SECURITY TABS - COMPLETE FIX
   ============================================ */
console.log("Setting up tabs...");

// DEFAULT STATE: Show profile view, hide panels
if (profileView) profileView.style.display = "block";
if (accountPanel) accountPanel.style.display = "none";
if (securityPanel) securityPanel.style.display = "none";

// Remove active class from tabs (will be added on click)
if (accountTab) {
  accountTab.classList.remove('active');
}
if (securityTab) {
  securityTab.classList.remove('active');
}

// ===== ACCOUNT TAB =====
if (accountTab) {
  console.log("✅ Adding Account tab listener");
  accountTab.addEventListener("click", function(e) {
    e.preventDefault();
    console.log("📋 Account tab CLICKED");
    
    // Show account panel, hide others
    if (profileView) profileView.style.display = "none";
    if (accountPanel) accountPanel.style.display = "block";
    if (securityPanel) securityPanel.style.display = "none";
    
    // Update active styles
    this.classList.add('active');
    if (securityTab) securityTab.classList.remove('active');
    
    console.log("Account panel display:", accountPanel.style.display);
  });
} else {
  console.error("❌ accountTab element not found!");
}

// ===== SECURITY TAB =====
if (securityTab) {
  console.log("✅ Adding Security tab listener");
  securityTab.addEventListener("click", function(e) {
    e.preventDefault();
    console.log("🔒 Security tab CLICKED");
    
    // Show security panel, hide others
    if (profileView) profileView.style.display = "none";
    if (securityPanel) securityPanel.style.display = "block";
    if (accountPanel) accountPanel.style.display = "none";
    
    // Update active styles
    this.classList.add('active');
    if (accountTab) accountTab.classList.remove('active');
    
    console.log("Security panel display:", securityPanel.style.display);
  });
} else {
  console.error("❌ securityTab element not found!");
}

/* ============================================
   PASSWORD TOGGLES - SHOW/HIDE
   ============================================ */
// Generic function to toggle password visibility for any password field
function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;
  
  button.addEventListener("click", () => {
    const icon = button.querySelector("i");
    if (input.type === "password") {
      // Show password: change input type to text, update icon to eye-slash
      input.type = "text";
      if (icon) icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      // Hide password: change input type to password, update icon to eye
      input.type = "password";
      if (icon) icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

// Apply toggle to all password fields on profile page
togglePasswordVisibility("accountCurrentPassword", "toggleAccountPassword");
togglePasswordVisibility("currentPassword", "toggleCurrentPassword");
togglePasswordVisibility("newPassword", "toggleNewPassword");
togglePasswordVisibility("confirmPassword", "toggleConfirmPassword");

/* ============================================
   UPLOAD PHOTO - WORKING
   ============================================ */
// Handles photo upload via file input and FormData
if (uploadPhotoBtn && profilePhotoInput) {
  console.log("✅ Setting up Upload Photo");
  
  // Click upload button -> trigger hidden file input
  uploadPhotoBtn.onclick = function(e) {
    e.preventDefault();
    console.log("📸 Upload clicked - changing text");
    
    // Show uploading state
    this.textContent = "Uploading...";
    this.disabled = true;
    
    // Reset and trigger file picker
    profilePhotoInput.value = "";
    profilePhotoInput.click();
  };

  // File selection handler
  profilePhotoInput.onchange = async function(e) {
    const file = this.files[0];
    console.log("📸 File selected:", file ? file.name : "No file");
    
    if (!file) {
      // Reset button if no file selected
      uploadPhotoBtn.textContent = "Upload Photo";
      uploadPhotoBtn.disabled = false;
      return;
    }
    
    // Validate file type (must be an image)
    if (!file.type.startsWith('image/')) {
      toastError("Please select an image.");
      this.value = "";
      uploadPhotoBtn.textContent = "Upload Photo";
      uploadPhotoBtn.disabled = false;
      return;
    }

    // Read file as data URL (base64)
    const reader = new FileReader();
    reader.onload = async function(event) {
      const photoData = event.target.result;
      try {
        // Send photo as FormData (to handle large base64 strings)
        const formData = new FormData();
        formData.append('email', loggedInEmail);
        formData.append('photo', photoData);
        
        const res = await fetch("/api/update-user", {
          method: "POST",
          body: formData
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload photo.");

        // Update local data and UI
        currentUser.photo = photoData;
        localStorage.setItem("userData", JSON.stringify(currentUser));
        if (profileImage) profileImage.src = photoData;
        const navProfilePhoto = document.getElementById("navProfilePhoto");
        if (navProfilePhoto) navProfilePhoto.src = photoData;
        updateDeletePhotoButton();
        
        uploadPhotoBtn.textContent = "Upload Photo";
        uploadPhotoBtn.disabled = false;
        
        toastSuccess("Profile photo updated!");
      } catch (error) {
        uploadPhotoBtn.textContent = "Upload Photo";
        uploadPhotoBtn.disabled = false;
        toastError(error.message);
        console.error("Photo upload error:", error);
      }
    };
    reader.readAsDataURL(file);
    this.value = ""; // Reset input
  };
}

/* ============================================
   SAVE ACCOUNT - WORKING
   ============================================ */
// Handles updating email and/or username with verification
if (saveAccountBtn) {
  console.log("✅ Setting up Save Account");
  
  saveAccountBtn.onclick = async function(e) {
    e.preventDefault();
    console.log("💾 Save clicked");
    
    const currentPassword = accountCurrentPassword.value;
    const newEmail = profileEmail.value.trim().toLowerCase();
    const newUsername = profileUsernameInput.value.trim();
    
    // ===== VALIDATION =====
    // Current password is required for any change
    if (!currentPassword) {
      toastError("Please enter your current password.");
      return;
    }
    
    // Check if any changes were made
    const isEmailChanged = newEmail && newEmail !== currentUser.email;
    const isUsernameChanged = newUsername && newUsername !== currentUser.username;
    
    if (!isEmailChanged && !isUsernameChanged) {
      toastError("Please change your email or username.");
      return;
    }
    
    // Validate username length
    if (isUsernameChanged && newUsername.length < 3) {
      toastError("Username must have at least 3 characters.");
      return;
    }
    
    // Check if new email is already taken
    if (isEmailChanged) {
      const checkRes = await fetch("/api/get-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail })
      });
      if (checkRes.ok) {
        toastError("Email already used by another account.");
        return;
      }
    }
    
    // ===== SEND VERIFICATION CODE =====
    // Show loading state
    this.textContent = "Sending code...";
    this.disabled = true;
    console.log("💾 Button changed to: Sending code...");

    try {
      // Verify current password by attempting sign-in
      const verifyRes = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail, password: currentPassword })
      });

      if (!verifyRes.ok) {
        toastError("Incorrect current password.");
        this.textContent = "Save Changes";
        this.disabled = false;
        return;
      }

      // Send verification code to user's email
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

      // Show verification modal and wait for user input
      const code = await showVerificationModal();
      
      if (!code) {
        toastWarning("Update cancelled.");
        this.textContent = "Save Changes";
        this.disabled = false;
        return;
      }

      // Verify the code entered by user
      const verifyCodeRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, code: code.trim() })
      });

      const verifyData = await verifyCodeRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        this.textContent = "Save Changes";
        this.disabled = false;
        return;
      }

      // ===== UPDATE ACCOUNT =====
      const updateData = { email: currentUser.email };
      if (isEmailChanged) updateData.newEmail = newEmail;
      if (isUsernameChanged) updateData.newUsername = newUsername;

      const updateRes = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateResult.error || "Failed to update account.");
      }

      // Update localStorage with new data
      if (isEmailChanged) {
        currentUser.email = newEmail;
        localStorage.setItem("loggedInUser", newEmail);
      }
      if (isUsernameChanged) currentUser.username = newUsername;
      
      localStorage.setItem("userData", JSON.stringify(currentUser));
      accountCurrentPassword.value = ""; // Clear password field
      
      toastSuccess("Account updated! Refreshing...");
      
      this.textContent = "Save Changes";
      this.disabled = false;
      
      // Reload page to reflect changes
      setTimeout(function() {
        window.location.reload();
      }, 1500);

    } catch (error) {
      this.textContent = "Save Changes";
      this.disabled = false;
      toastError(error.message || "Failed to update account.");
      console.error("Save account error:", error);
    }
  };
}

/* ============================================
   CHANGE PASSWORD - WORKING
   ============================================ */
// Handles password change with verification
if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", async function() {
    const curPass = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confPass = document.getElementById("confirmPassword").value;

    // ===== VALIDATION =====
    // Verify current password
    const verifyRes = await fetch("/api/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loggedInEmail, password: curPass })
    });

    if (!verifyRes.ok) {
      toastError("Incorrect current password.");
      return;
    }

    // Validate new password strength
    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
    if (!strongPassword.test(newPass)) {
      toastError("Password: 5+ chars, one capital, one number, one symbol.");
      return;
    }

    // Check if passwords match
    if (!newPass || newPass !== confPass) {
      toastError("Passwords do not match.");
      return;
    }

    // Check if new password is different from current
    if (newPass === curPass) {
      toastError("New password must be different.");
      return;
    }

    // ===== SEND VERIFICATION CODE =====
    try {
      this.disabled = true;
      this.textContent = "Sending code...";

      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

      const code = await showVerificationModal();
      
      if (!code) {
        this.disabled = false;
        this.textContent = "Change Password";
        toastWarning("Password change cancelled.");
        return;
      }

      // Verify the code
      const verifyCodeRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, code: code.trim() })
      });

      const verifyData = await verifyCodeRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        this.disabled = false;
        this.textContent = "Change Password";
        return;
      }

      // ===== UPDATE PASSWORD =====
      const updateRes = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          newPassword: newPass
        })
      });

      if (!updateRes.ok) {
        const data = await updateRes.json();
        throw new Error(data.error || "Failed to update password.");
      }

      // Clear password fields
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";

      toastSuccess("Password changed successfully!");
      this.disabled = false;
      this.textContent = "Change Password";

    } catch (error) {
      toastError(error.message || "Failed to change password.");
      this.disabled = false;
      this.textContent = "Change Password";
      console.error("Change password error:", error);
    }
  });
}

/* ============================================
   LOGOUT
   ============================================ */
// Clears session and redirects to home page
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    
    // Show confirmation modal
    const confirm = await showConfirmModal(
      '🚪 Log Out',
      'Are you sure you want to log out?',
      'Yes, Log Out',
      'Cancel'
    );
    
    if (confirm) {
      // Clear localStorage session data
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userData");
      toastSuccess("Logged out successfully!");
      // Redirect to home page after delay
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    }
  });
}

/* ============================================
   DELETE ACCOUNT
   ============================================ */
// Permanently deletes user account with multiple confirmations and verification
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    
    // ===== FIRST CONFIRMATION =====
    const confirm1 = await showConfirmModal(
      '⚠️ Delete Account',
      'Are you sure you want to permanently delete your account? This cannot be undone.',
      'Yes, Delete',
      'Cancel'
    );
    
    if (!confirm1) return;

    // ===== SECOND CONFIRMATION (Final Warning) =====
    const confirm2 = await showConfirmModal(
      '⚠️ Final Warning',
      'Are you absolutely sure? This will delete all your data permanently.',
      'Yes, Delete Permanently',
      'Cancel'
    );
    
    if (!confirm2) return;

    // ===== SEND VERIFICATION CODE =====
    try {
      this.disabled = true;
      this.textContent = "Sending code...";

      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

      const code = await showVerificationModal();
      
      if (!code) {
        this.disabled = false;
        this.textContent = "Delete Account";
        toastWarning("Deletion cancelled.");
        return;
      }

      // Verify the code
      const verifyCodeRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, code: code.trim() })
      });

      const verifyData = await verifyCodeRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        this.disabled = false;
        this.textContent = "Delete Account";
        return;
      }

      // ===== FINAL CONFIRMATION =====
      const finalConfirm = await showConfirmModal(
        '⚠️ Final Confirmation',
        'Delete your account permanently?',
        'Yes, Delete',
        'Cancel'
      );
      
      if (!finalConfirm) {
        this.disabled = false;
        this.textContent = "Delete Account";
        toastWarning("Deletion cancelled.");
        return;
      }

      // ===== DELETE ACCOUNT FROM DATABASE =====
      const deleteRes = await fetch("/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email })
      });

      if (!deleteRes.ok) {
        const data = await deleteRes.json();
        throw new Error(data.error || "Failed to delete account.");
      }

      // Clear session and redirect
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userData");

      toastSuccess("Account deleted successfully!");
      this.disabled = false;
      this.textContent = "Delete Account";
      
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);

    } catch (error) {
      toastError(error.message || "Failed to delete account.");
      this.disabled = false;
      this.textContent = "Delete Account";
      console.error("Delete account error:", error);
    }
  });
}

/* ============================================
   CLICKABLE PROFILE PICTURE - ENLARGE
   ============================================ */
// Creates a fullscreen overlay to enlarge profile photo when clicked
const profileImageWrapper = document.getElementById("profileImageWrapper");

if (profileImageWrapper && profileImage) {
  profileImageWrapper.addEventListener("click", function(e) {
    e.preventDefault();
    const imageSrc = profileImage.src;
    
    // Create overlay with blur backdrop
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10002;
      cursor: pointer;
    `;
    
    // Create enlarged image
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
      max-width: 80%;
      max-height: 80%;
      border-radius: 20px;
      border: 4px solid #00bcd4;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      object-fit: contain;
    `;
    
    overlay.appendChild(img);
    // Click overlay to close (remove it)
    overlay.addEventListener('click', function() {
      overlay.remove();
    });
    document.body.appendChild(overlay);
  });
}

/* ============================================
   LOAD USER DATA ON PAGE LOAD
   ============================================ */
// Initial data load when page loads
loadUserData();
console.log("✅ Profile.js v10 loaded successfully");