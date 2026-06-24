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
// Get references to all profile page elements for manipulation
const profileImage = document.getElementById("profileImage");
const profileImageLarge = document.getElementById("profileImageLarge");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoInputLarge = document.getElementById("profilePhotoInputLarge");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const uploadPhotoBtnLarge = document.getElementById("uploadPhotoBtnLarge");
const profileUsername = document.getElementById("profileUsername");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");
const overviewUsername = document.getElementById("overviewUsername");
const overviewEmail = document.getElementById("overviewEmail");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const profileMessage = document.getElementById("profileMessage");
const overviewPanel = document.getElementById("overviewPanel");
const accountPanel = document.getElementById("accountPanel");
const securityPanel = document.getElementById("securityPanel");
const accountCurrentPassword = document.getElementById("accountCurrentPassword");
const changePasswordBtn = document.getElementById("changePasswordBtn");

/* ============================================
   LOAD USER DATA INTO PROFILE FORM
   ============================================ */
// Populate all profile fields with current user data
function loadUserData() {
  profileUsername.textContent = currentUser.username;
  profileEmailDisplay.textContent = currentUser.email;
  overviewUsername.textContent = currentUser.username;
  overviewEmail.textContent = currentUser.email;
  profileEmail.value = currentUser.email;
  profileUsernameInput.value = currentUser.username;
  if (currentUser.photo) {
    profileImage.src = currentUser.photo;
    profileImageLarge.src = currentUser.photo;
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
   PROFILE PHOTO UPLOAD HANDLER
   ============================================ */
// Handle photo upload from sidebar button
uploadPhotoBtn.addEventListener("click", () => {
  profilePhotoInput.click();
});

// Handle photo upload from overview button
uploadPhotoBtnLarge.addEventListener("click", () => {
  profilePhotoInputLarge.click();
});

// Handle both file inputs
profilePhotoInput.addEventListener("change", handlePhotoUpload);
profilePhotoInputLarge.addEventListener("change", handlePhotoUpload);

function handlePhotoUpload(event) {
  const file = event.target.files[0];
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
    const photoData = e.target.result;
    profileImage.src = photoData;
    profileImageLarge.src = photoData;
    currentUser.photo = photoData;
    localStorage.setItem("users", JSON.stringify(users));
    toastSuccess("Profile photo updated successfully!");
  };
  reader.onerror = () => {
    toastError("Failed to read image file.");
  };
  reader.readAsDataURL(file);
}

/* ============================================
   ACCOUNT INFORMATION UPDATE (with password verification)
   ============================================ */
document.getElementById("saveAccountBtn").addEventListener("click", async () => {
  console.log("Save Account button clicked"); // Debug
  const currentPassword = accountCurrentPassword.value;
  const newEmail = profileEmail.value.trim().toLowerCase();
  const newUsername = profileUsernameInput.value.trim();
  
  console.log("Current Password entered:", currentPassword ? "Yes" : "No"); // Debug
  console.log("New Email:", newEmail); // Debug
  console.log("New Username:", newUsername); // Debug

  // Validate: Current password is required
  if (!currentPassword) {
    toastError("Please enter your current password to save changes.");
    return;
  }
  
  // Validate: Current password must match
  if (currentPassword !== currentUser.password) {
    toastError("Incorrect current password.");
    return;
  }
  
  // Validate: At least one field must change
  if (!newEmail && !newUsername) {
    toastError("Please update at least one field (email or username).");
    return;
  }
  
  // If email is being changed, verify it's not already used
  if (newEmail && newEmail !== currentUser.email) {
    if (users.some((u) => u.email === newEmail && u.email !== currentUser.email)) {
      toastError("Email already belongs to another account.");
      return;
    }
  }
  
  // If username is being changed, validate length
  if (newUsername && newUsername.length < 3) {
    toastError("Username must have at least 3 characters.");
    return;
  }
  
  try {
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
    
    const code = prompt("Enter the verification code sent to your email:");
    if (!code) return;
    
    // Verify the code
    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code }) 
    });
    
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code.");
      return;
    }
    
    // Update user data
    if (newEmail) currentUser.email = newEmail;
    if (newUsername) currentUser.username = newUsername;
    
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("loggedInUser", currentUser.email);
    
    // Update UI
    loadUserData();
    accountCurrentPassword.value = "";
    toastSuccess("Account updated successfully!");
    
  } catch (error) {
    toastError(error.message || "Failed to update account. Please try again.");
  }
});

/* ============================================
   TAB SWITCHING (ACCOUNT ↔ SECURITY)
   ============================================ */
// TAB SWITCHING
document.getElementById("overviewTab").addEventListener("click", (e) => {
  e.preventDefault();
  switchTab("overviewTab", "overviewPanel");
});

document.getElementById("accountTab").addEventListener("click", (e) => {
  e.preventDefault();
  switchTab("accountTab", "accountPanel");
});

document.getElementById("securityTab").addEventListener("click", (e) => {
  e.preventDefault();
  switchTab("securityTab", "securityPanel");
});

function switchTab(activeTabId, panelId) {
  // Remove active class from all tabs
  document.querySelectorAll('.support-link').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active class to clicked tab
  document.getElementById(activeTabId).classList.add('active');
  
  // Hide all panels
  overviewPanel.style.display = "none";
  accountPanel.style.display = "none";
  securityPanel.style.display = "none";
  
  // Show the selected panel
  document.getElementById(panelId).style.display = "block";
}

/* ============================================
   CHANGE PASSWORD WITH EMAIL VERIFICATION
   ============================================ */
document.getElementById("changePasswordBtn").addEventListener("click", async () => {
  // Get password values
  const curPass = document.getElementById("currentPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const confPass = document.getElementById("confirmPassword").value;

  // VALIDATION 1: Current password must match
  if (curPass !== currentUser.password) {
    toastError("Incorrect current password.");
    return;
  }

  // VALIDATION 2: New password must meet requirements (same as signup)
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
    // Disable button to prevent double-clicking
    const btn = document.getElementById("changePasswordBtn");
    btn.disabled = true;
    btn.textContent = "Sending code...";

    // STEP 1: Send verification code to user's email
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

    // STEP 2: Prompt user for verification code
    const code = prompt("Enter the verification code sent to your email:");
    if (!code) {
      btn.disabled = false;
      btn.textContent = "Change Password";
      return;
    }

    // STEP 3: Verify the code with server
    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code }) 
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code. Please try again.");
      btn.disabled = false;
      btn.textContent = "Change Password";
      return;
    }

    // STEP 4: Update password in localStorage
    currentUser.password = newPass;
    localStorage.setItem("users", JSON.stringify(users));

    // Clear password fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    toastSuccess("Password changed successfully!");

    // Reset button
    btn.disabled = false;
    btn.textContent = "Change Password";

  } catch (error) {
    // Handle errors
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
   DELETE ACCOUNT WITH EMAIL VERIFICATION
   ============================================ */
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  // STEP 1: Confirm with user before proceeding
  if (!confirm("⚠️ Are you sure you want to permanently delete your account?\n\nThis action cannot be undone. All your data will be lost.")) {
    return;
  }

  // STEP 2: Double confirmation for safety
  if (!confirm("Are you absolutely sure? This will delete all your data permanently.")) {
    return;
  }

  try {
    // STEP 3: Disable button to prevent double-clicking
    const btn = document.getElementById("deleteAccountBtn");
    btn.disabled = true;
    btn.textContent = "Sending code...";

    // STEP 4: Send verification code to user's email
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

    // STEP 5: Prompt user for verification code
    const code = prompt("Enter the verification code sent to your email to confirm deletion:");
    if (!code) {
      btn.disabled = false;
      btn.textContent = "Delete Account";
      toastWarning("Account deletion cancelled.");
      return;
    }

    // STEP 6: Verify the code with server
    const verifyRes = await fetch("/api/verify-code", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: currentUser.email, code }) 
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toastError("Incorrect verification code. Account deletion cancelled.");
      btn.disabled = false;
      btn.textContent = "Delete Account";
      return;
    }

    // STEP 7: Final confirmation before deletion
    if (!confirm("Final confirmation: Delete your account permanently?")) {
      btn.disabled = false;
      btn.textContent = "Delete Account";
      toastWarning("Account deletion cancelled.");
      return;
    }

    // STEP 8: Delete user from localStorage
    users = users.filter((u) => u.email !== currentUser.email);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.removeItem("loggedInUser");

    // STEP 9: Show success message and redirect
    toastSuccess("Account deleted successfully!");
    
    // Wait a moment for the toast to show, then redirect
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);

  } catch (error) {
    // Handle errors
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