// Import modal functions (they will be available globally via modal.js)


/* ============================================
   SESSION VERIFICATION & USER AUTHENTICATION
   ============================================ */
// Check if user is logged in, redirect to signin if not
const loggedInEmail = localStorage.getItem("loggedInUser");
if (!loggedInEmail) window.location.href = "signin.html";

// Load users from localStorage and find current user
let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = users.find((u) => u.email === loggedInEmail);

// If user not found in storage, clear session and redirect
if (!currentUser) {
  localStorage.removeItem("loggedInUser");
  window.location.href = "signin.html";
}

/* ============================================
   DOM ELEMENT REFERENCES
   ============================================ */
const profileImage = document.getElementById("profileImage");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const profileUsername = document.getElementById("profileUsername");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");

// Profile View (default)
const profileViewUsername = document.getElementById("profileViewUsername");
const profileViewEmail = document.getElementById("profileViewEmail");

// Account Panel
const accountUsernameDisplay = document.getElementById("accountUsernameDisplay");
const accountEmailDisplay = document.getElementById("accountEmailDisplay");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const accountCurrentPassword = document.getElementById("accountCurrentPassword");

// Panels
const profileView = document.getElementById("profileView");
const accountPanel = document.getElementById("accountPanel");
const securityPanel = document.getElementById("securityPanel");

// Tabs
const accountTab = document.getElementById("accountTab");
const securityTab = document.getElementById("securityTab");

/* ============================================
   LOAD USER DATA INTO PROFILE
   ============================================ */
function loadUserData() {
  // Update sidebar
  profileUsername.textContent = currentUser.username;
  profileEmailDisplay.textContent = currentUser.email;
  
  // Update Profile View (default)
  profileViewUsername.textContent = currentUser.username;
  profileViewEmail.textContent = currentUser.email;
  
  // Update Account Panel
  accountUsernameDisplay.textContent = currentUser.username;
  accountEmailDisplay.textContent = currentUser.email;
  profileEmail.value = currentUser.email;
  profileUsernameInput.value = currentUser.username;
  
  // Update profile photo
  if (currentUser.photo) {
    profileImage.src = currentUser.photo;
  }
}
loadUserData();


/* ============================================
   PASSWORD SHOW/HIDE TOGGLES FOR PROFILE
   ============================================ */

// Reusable function for password toggle
function togglePasswordVisibility(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  button.addEventListener("click", () => {
    const icon = button.querySelector("i");
    if (input.type === "password") {
      input.type = "text";
      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    } else {
      input.type = "password";
      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    }
  });
}

// Initialize all password toggles in profile
togglePasswordVisibility("accountCurrentPassword", "toggleAccountPassword");
togglePasswordVisibility("currentPassword", "toggleCurrentPassword");
togglePasswordVisibility("newPassword", "toggleNewPassword");
togglePasswordVisibility("confirmPassword", "toggleConfirmPassword");


// Fallback: Ensure button exists before adding listener
if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", changePasswordHandler);
} else {
  console.error("Change Password button not found in DOM");
}

// Move the change password logic to a named function
async function changePasswordHandler() {
  // The code from the previous section goes here
}


/* ============================================
   PROFILE PHOTO UPLOAD
   ============================================ */
uploadPhotoBtn.addEventListener("click", () => {
  profilePhotoInput.click();
});

profilePhotoInput.addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    toastError("Profile photo must be less than 2MB.");
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toastError("Please select an image file.");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    profileImage.src = e.target.result;
    currentUser.photo = e.target.result;
    localStorage.setItem("users", JSON.stringify(users));
    toastSuccess("Profile photo updated successfully!");
  };
  reader.onerror = () => {
    toastError("Failed to read image file.");
  };
  reader.readAsDataURL(file);
});

/* ============================================
   ACCOUNT INFORMATION UPDATE - WITH CUSTOM MODAL
   ============================================ */
document.getElementById("saveAccountBtn").addEventListener("click", async () => {
  const currentPassword = accountCurrentPassword.value;
  const newEmail = profileEmail.value.trim().toLowerCase();
  const newUsername = profileUsernameInput.value.trim();
  
  if (!currentPassword) {
    toastError("Please enter your current password to save changes.");
    return;
  }
  
  if (currentPassword !== currentUser.password) {
    toastError("Incorrect current password.");
    return;
  }
  
  if (!newEmail && !newUsername) {
    toastError("Please update at least one field (email or username).");
    return;
  }
  
  if (newEmail && newEmail !== currentUser.email) {
    if (users.some((u) => u.email === newEmail && u.email !== currentUser.email)) {
      toastError("Email already belongs to another account.");
      return;
    }
  }
  
  if (newUsername && newUsername.length < 3) {
    toastError("Username must have at least 3 characters.");
    return;
  }
  
  try {
    const res = await fetch("/api/send-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email }) 
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send verification code.");
    }
    
    toastInfo("Verification code sent to your email. Please check your inbox.");
    
    // Use custom modal for verification code
    const code = await showVerificationModal('Enter the verification code sent to your email to confirm changes:');
    
    if (!code) {
      toastWarning("Account update cancelled.");
      return;
    }
    
    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code: code.trim() }) 
    });
    
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code.");
      return;
    }
    
    if (newEmail) currentUser.email = newEmail;
    if (newUsername) currentUser.username = newUsername;
    
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("loggedInUser", currentUser.email);
    
    loadUserData();
    accountCurrentPassword.value = "";
    toastSuccess("Account updated successfully!");
    
  } catch (error) {
    toastError(error.message || "Failed to update account. Please try again.");
  }
});

/* ============================================
   TAB SWITCHING - Show Profile View by Default
   ============================================ */
// By default: Show Profile View, hide Account and Security panels
profileView.style.display = 'block';
accountPanel.style.display = 'none';
securityPanel.style.display = 'none';
accountTab.classList.remove('active');
securityTab.classList.remove('active');

// Account Tab Click
accountTab.addEventListener("click", function(e) {
  e.preventDefault();
  console.log("Account tab clicked");
  
  // Hide Profile View
  profileView.style.display = 'none';
  
  // Update tab styles
  accountTab.classList.add('active');
  securityTab.classList.remove('active');
  
  // Show/hide panels
  accountPanel.style.display = 'block';
  securityPanel.style.display = 'none';
});

// Security Tab Click
securityTab.addEventListener("click", function(e) {
  e.preventDefault();
  console.log("Security tab clicked");
  
  // Hide Profile View
  profileView.style.display = 'none';
  
  // Update tab styles
  securityTab.classList.add('active');
  accountTab.classList.remove('active');
  
  // Show/hide panels
  securityPanel.style.display = 'block';
  accountPanel.style.display = 'none';
});

/* ============================================
   CHANGE PASSWORD WITH CUSTOM MODAL
   ============================================ */
document.getElementById("changePasswordBtn").addEventListener("click", async () => {
  const curPass = document.getElementById("currentPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const confPass = document.getElementById("confirmPassword").value;

  // VALIDATION 1: Current password must match
  if (curPass !== currentUser.password) {
    toastError("Incorrect current password.");
    return;
  }

  // VALIDATION 2: New password must meet requirements
  const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
  if (!strongPassword.test(newPass)) {
    toastError("Password must contain: At least 5 characters, one capital letter, one number, and one symbol.");
    return;
  }

  // VALIDATION 3: New password and confirm password must match
  if (!newPass || newPass !== confPass) {
    toastError("Passwords do not match.");
    return;
  }

  // VALIDATION 4: New password must be different from current
  if (newPass === curPass) {
    toastError("New password must be different from current password.");
    return;
  }

  try {
    const btn = document.getElementById("changePasswordBtn");
    btn.disabled = true;
    btn.textContent = "Sending code...";

    const res = await fetch("/api/send-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email }) 
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send verification code.");
    }

    toastInfo("Verification code sent to your email. Please check your inbox.");
    btn.textContent = "Waiting for code...";

    // Use custom modal for verification code
    const code = await showVerificationModal('Enter the verification code sent to your email:');
    
    if (!code) {
      btn.disabled = false;
      btn.textContent = "Change Password";
      toastWarning("Password change cancelled.");
      return;
    }

    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code: code.trim() }) 
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code. Please try again.");
      btn.disabled = false;
      btn.textContent = "Change Password";
      return;
    }

    // Update password
    currentUser.password = newPass;
    localStorage.setItem("users", JSON.stringify(users));

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    toastSuccess("Password changed successfully!");
    btn.disabled = false;
    btn.textContent = "Change Password";

  } catch (error) {
    toastError(error.message || "Failed to change password. Please try again.");
    const btn = document.getElementById("changePasswordBtn");
    btn.disabled = false;
    btn.textContent = "Change Password";
    console.error("Change password error:", error);
  }
});

/* ============================================
   LOGOUT FUNCTION
   ============================================ */
document.getElementById("logoutBtn").addEventListener("click", () => {
  // Confirm logout
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("loggedInUser");
    toastSuccess("Logged out successfully!");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  }
});

/* ============================================
   DELETE ACCOUNT WITH CUSTOM MODALS
   ============================================ */
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  // First confirmation
  const confirm1 = await showConfirmModal(
    '⚠️ Delete Account',
    'Are you sure you want to permanently delete your account?\n\nThis action cannot be undone. All your data will be lost.',
    'Yes, Delete',
    'Cancel'
  );
  
  if (!confirm1) return;

  // Second confirmation
  const confirm2 = await showConfirmModal(
    '⚠️ Final Warning',
    'Are you absolutely sure? This will delete all your data permanently.',
    'Yes, Delete Permanently',
    'Cancel'
  );
  
  if (!confirm2) return;

  try {
    const btn = document.getElementById("deleteAccountBtn");
    btn.disabled = true;
    btn.textContent = "Sending code...";

    // Send verification code
    const res = await fetch("/api/send-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email }) 
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to send verification code.");
    }

    toastInfo("Verification code sent to your email. Please check your inbox.");
    btn.textContent = "Waiting for code...";

    // Get verification code with custom modal
    const code = await showVerificationModal('Enter the verification code sent to your email to confirm deletion:');
    
    if (!code) {
      btn.disabled = false;
      btn.textContent = "Delete Account";
      toastWarning("Account deletion cancelled.");
      return;
    }

    // Verify the code
    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code: code.trim() }) 
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code. Account deletion cancelled.");
      btn.disabled = false;
      btn.textContent = "Delete Account";
      return;
    }

    // Final confirmation
    const finalConfirm = await showConfirmModal(
      '⚠️ Final Confirmation',
      'Delete your account permanently? This action cannot be undone.',
      'Yes, Delete',
      'Cancel'
    );
    
    if (!finalConfirm) {
      btn.disabled = false;
      btn.textContent = "Delete Account";
      toastWarning("Account deletion cancelled.");
      return;
    }

    // Delete user
    users = users.filter((u) => u.email !== currentUser.email);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.removeItem("loggedInUser");

    toastSuccess("Account deleted successfully!");
    
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);

  } catch (error) {
    toastError(error.message || "Failed to delete account. Please try again.");
    const btn = document.getElementById("deleteAccountBtn");
    btn.disabled = false;
    btn.textContent = "Delete Account";
    console.error("Delete account error:", error);
  }
});

/* ============================================
   DEBUG: Check if buttons exist
   ============================================ */
console.log("Change Password Button exists:", !!document.getElementById("changePasswordBtn"));
console.log("Delete Account Button exists:", !!document.getElementById("deleteAccountBtn"));
console.log("Save Account Button exists:", !!document.getElementById("saveAccountBtn"));