/* ============================================
   SESSION VERIFICATION & USER AUTHENTICATION
   ============================================ */
const loggedInEmail = localStorage.getItem("loggedInUser");
if (!loggedInEmail) window.location.href = "signin.html";

let users = JSON.parse(localStorage.getItem("users")) || [];
let currentUser = users.find((u) => u.email === loggedInEmail);

if (!currentUser) {
  localStorage.removeItem("loggedInUser");
  window.location.href = "signin.html";
}

console.log("Current user loaded:", currentUser);

/* ============================================
   DOM ELEMENT REFERENCES
   ============================================ */
const profileImage = document.getElementById("profileImage");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const profileUsername = document.getElementById("profileUsername");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");

const profileViewUsername = document.getElementById("profileViewUsername");
const profileViewEmail = document.getElementById("profileViewEmail");

const accountUsernameDisplay = document.getElementById("accountUsernameDisplay");
const accountEmailDisplay = document.getElementById("accountEmailDisplay");
const profileEmail = document.getElementById("profileEmail");
const profileUsernameInput = document.getElementById("profileUsernameInput");
const accountCurrentPassword = document.getElementById("accountCurrentPassword");

const profileView = document.getElementById("profileView");
const accountPanel = document.getElementById("accountPanel");
const securityPanel = document.getElementById("securityPanel");

const accountTab = document.getElementById("accountTab");
const securityTab = document.getElementById("securityTab");

const saveAccountBtn = document.getElementById("saveAccountBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteAccountBtn = document.getElementById("deleteAccountBtn");

/* ============================================
   DEFAULT PROFILE ICON - HUMAN SHAPE
   ============================================ */
const DEFAULT_PROFILE_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
const DEFAULT_NAV_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

/* ============================================
   LOAD USER DATA INTO PROFILE
   ============================================ */
function loadUserData() {
  console.log("Loading user data:", currentUser);
  
  // Update sidebar
  if (profileUsername) profileUsername.textContent = currentUser.username || 'User';
  if (profileEmailDisplay) profileEmailDisplay.textContent = currentUser.email || 'user@email.com';
  
  // Update Profile View
  if (profileViewUsername) profileViewUsername.textContent = currentUser.username || 'User';
  if (profileViewEmail) profileViewEmail.textContent = currentUser.email || 'user@email.com';
  
  // Update Account Panel
  if (accountUsernameDisplay) accountUsernameDisplay.textContent = currentUser.username || 'User';
  if (accountEmailDisplay) accountEmailDisplay.textContent = currentUser.email || 'user@email.com';
  
  // Update form fields
  if (profileEmail) profileEmail.value = currentUser.email || '';
  if (profileUsernameInput) profileUsernameInput.value = currentUser.username || '';
  
  // Update profile photo - Use human icon as default
  if (profileImage) {
    profileImage.src = currentUser.photo || DEFAULT_PROFILE_ICON;
  }
  
  // Update navigation photo - Use human icon as default
  const navProfilePhoto = document.getElementById("navProfilePhoto");
  if (navProfilePhoto) {
    navProfilePhoto.src = currentUser.photo || DEFAULT_NAV_ICON;
    console.log("Nav photo set to:", navProfilePhoto.src);
  }
  
  // Update navigation username
  const navUsername = document.getElementById("navUsername");
  if (navUsername) navUsername.textContent = currentUser.username || 'Profile';
  
  // Update delete photo button
  updateDeletePhotoButton();
}

/* ============================================
   DELETE PHOTO BUTTON - FIXED
   ============================================ */
function updateDeletePhotoButton() {
  // Remove existing delete button
  const existingDeleteBtn = document.getElementById("deletePhotoBtn");
  if (existingDeleteBtn) {
    existingDeleteBtn.remove();
  }
  
  // Only show if user has a photo (not the default)
  if (currentUser && currentUser.photo && currentUser.photo !== DEFAULT_PROFILE_ICON) {
    const deletePhotoBtn = document.createElement("button");
    deletePhotoBtn.id = "deletePhotoBtn";
    deletePhotoBtn.className = "convert-btn";
    deletePhotoBtn.style.cssText = "padding:5px 15px; font-size:0.75rem; margin-top:5px; background:#e53935; display:inline-block;";
    deletePhotoBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove Photo';
    
    deletePhotoBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      currentUser.photo = null;
      localStorage.setItem("users", JSON.stringify(users));
      
      // Reset to default human icon
      if (profileImage) profileImage.src = DEFAULT_PROFILE_ICON;
      
      const navProfilePhoto = document.getElementById("navProfilePhoto");
      if (navProfilePhoto) navProfilePhoto.src = DEFAULT_NAV_ICON;
      
      updateDeletePhotoButton();
      toastSuccess("Profile photo removed!");
    };
    
    if (uploadPhotoBtn && uploadPhotoBtn.parentNode) {
      uploadPhotoBtn.parentNode.insertBefore(deletePhotoBtn, uploadPhotoBtn.nextSibling);
    }
  }
}

/* ============================================
   PROFILE PHOTO UPLOAD
   ============================================ */
if (uploadPhotoBtn && profilePhotoInput) {
  // Clone to remove old listeners
  const newUploadBtn = uploadPhotoBtn.cloneNode(true);
  uploadPhotoBtn.parentNode.replaceChild(newUploadBtn, uploadPhotoBtn);
  
  const freshUploadBtn = document.getElementById("uploadPhotoBtn");
  
  freshUploadBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    profilePhotoInput.value = "";
    profilePhotoInput.click();
  });
  
  profilePhotoInput.addEventListener("change", function(e) {
    const file = this.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toastError("Photo must be less than 2MB.");
      this.value = "";
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toastError("Please select an image file.");
      this.value = "";
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const photoData = event.target.result;
      
      if (profileImage) profileImage.src = photoData;
      
      const navProfilePhoto = document.getElementById("navProfilePhoto");
      if (navProfilePhoto) navProfilePhoto.src = photoData;
      
      currentUser.photo = photoData;
      localStorage.setItem("users", JSON.stringify(users));
      
      updateDeletePhotoButton();
      toastSuccess("Profile photo updated!");
    };
    reader.onerror = function() {
      toastError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
    this.value = "";
  });
}

/* ============================================
   ACCOUNT & SECURITY TABS
   ============================================ */
if (profileView) profileView.style.display = "block";
if (accountPanel) accountPanel.style.display = "none";
if (securityPanel) securityPanel.style.display = "none";

if (accountTab) {
  accountTab.addEventListener("click", function(e) {
    e.preventDefault();
    if (profileView) profileView.style.display = "none";
    if (accountPanel) accountPanel.style.display = "block";
    if (securityPanel) securityPanel.style.display = "none";
    this.classList.add('active');
    if (securityTab) securityTab.classList.remove('active');
  });
}

if (securityTab) {
  securityTab.addEventListener("click", function(e) {
    e.preventDefault();
    if (profileView) profileView.style.display = "none";
    if (securityPanel) securityPanel.style.display = "block";
    if (accountPanel) accountPanel.style.display = "none";
    this.classList.add('active');
    if (accountTab) accountTab.classList.remove('active');
  });
}

/* ============================================
   PASSWORD SHOW/HIDE TOGGLES
   ============================================ */
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

togglePasswordVisibility("accountCurrentPassword", "toggleAccountPassword");
togglePasswordVisibility("currentPassword", "toggleCurrentPassword");
togglePasswordVisibility("newPassword", "toggleNewPassword");
togglePasswordVisibility("confirmPassword", "toggleConfirmPassword");

/* ============================================
   ACCOUNT INFORMATION UPDATE
   ============================================ */
if (saveAccountBtn) {
  saveAccountBtn.addEventListener("click", async function() {
    const currentPassword = accountCurrentPassword ? accountCurrentPassword.value : '';
    const newEmail = profileEmail ? profileEmail.value.trim().toLowerCase() : '';
    const newUsername = profileUsernameInput ? profileUsernameInput.value.trim() : '';
    
    if (!currentPassword) {
      toastError("Please enter your current password.");
      return;
    }
    
    if (currentPassword !== currentUser.password) {
      toastError("Incorrect current password.");
      return;
    }
    
    if (!newEmail && !newUsername) {
      toastError("Update at least one field.");
      return;
    }
    
    if (newEmail && newEmail !== currentUser.email) {
      if (users.some((u) => u.email === newEmail && u.email !== currentUser.email)) {
        toastError("Email already used by another account.");
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
        throw new Error(data.error || "Failed to send code.");
      }
      
      toastInfo("Verification code sent to your email.");
      
      const code = await showVerificationModal('Enter verification code:');
      
      if (!code) {
        toastWarning("Update cancelled.");
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
      
      if (accountCurrentPassword) accountCurrentPassword.value = "";
      
      loadUserData();
      toastSuccess("Account updated successfully!");
      
    } catch (error) {
      toastError(error.message || "Failed to update account.");
    }
  });
}

/* ============================================
   CHANGE PASSWORD - FIXED
   ============================================ */
if (changePasswordBtn) {
  changePasswordBtn.addEventListener("click", async function() {
    const curPass = document.getElementById("currentPassword") ? document.getElementById("currentPassword").value : '';
    const newPass = document.getElementById("newPassword") ? document.getElementById("newPassword").value : '';
    const confPass = document.getElementById("confirmPassword") ? document.getElementById("confirmPassword").value : '';

    if (curPass !== currentUser.password) {
      toastError("Incorrect current password.");
      return;
    }

    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
    if (!strongPassword.test(newPass)) {
      toastError("Password: 5+ chars, one capital, one number, one symbol.");
      return;
    }

    if (!newPass || newPass !== confPass) {
      toastError("Passwords do not match.");
      return;
    }

    if (newPass === curPass) {
      toastError("New password must be different.");
      return;
    }

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

      toastInfo("Verification code sent to your email.");
      this.textContent = "Waiting for code...";

      const code = await showVerificationModal('Enter verification code:');
      
      if (!code) {
        this.disabled = false;
        this.textContent = "Change Password";
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
        toastError("Incorrect verification code.");
        this.disabled = false;
        this.textContent = "Change Password";
        return;
      }

      currentUser.password = newPass;
      localStorage.setItem("users", JSON.stringify(users));

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
    }
  });
}

/* ============================================
   LOGOUT - COMPLETELY FIXED
   ============================================ */
if (logoutBtn) {
  console.log("Logout button found, adding event listener");
  
  logoutBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("Logout button clicked");
    
    // Use the global showConfirmModal function
    if (typeof showConfirmModal !== 'undefined') {
      const confirm = await showConfirmModal(
        '🚪 Log Out',
        'Are you sure you want to log out?',
        'Yes, Log Out',
        'Cancel'
      );
      
      if (confirm) {
        console.log("Logout confirmed");
        localStorage.removeItem("loggedInUser");
        toastSuccess("Logged out successfully!");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        console.log("Logout cancelled");
      }
    } else {
      // Fallback if modal function not available
      if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("loggedInUser");
        alert("Logged out successfully!");
        window.location.href = "index.html";
      }
    }
  });
} else {
  console.error("Logout button not found!");
}

/* ============================================
   DELETE ACCOUNT - COMPLETELY FIXED
   ============================================ */
if (deleteAccountBtn) {
  console.log("Delete account button found, adding event listener");
  
  deleteAccountBtn.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("Delete account button clicked");
    
    // Use the global showConfirmModal function
    if (typeof showConfirmModal !== 'undefined') {
      const confirm1 = await showConfirmModal(
        '⚠️ Delete Account',
        'Are you sure you want to permanently delete your account? This cannot be undone.',
        'Yes, Delete',
        'Cancel'
      );
      
      if (!confirm1) {
        console.log("Delete cancelled at step 1");
        return;
      }

      const confirm2 = await showConfirmModal(
        '⚠️ Final Warning',
        'Are you absolutely sure? This will delete all your data permanently.',
        'Yes, Delete Permanently',
        'Cancel'
      );
      
      if (!confirm2) {
        console.log("Delete cancelled at step 2");
        return;
      }

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

        toastInfo("Verification code sent to your email.");
        this.textContent = "Waiting for code...";

        const code = await showVerificationModal('Enter verification code to confirm deletion:');
        
        if (!code) {
          this.disabled = false;
          this.textContent = "Delete Account";
          toastWarning("Deletion cancelled.");
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
          this.disabled = false;
          this.textContent = "Delete Account";
          return;
        }

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

        users = users.filter((u) => u.email !== currentUser.email);
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.removeItem("loggedInUser");

        toastSuccess("Account deleted successfully!");
        console.log("Account deleted");
        
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);

      } catch (error) {
        toastError(error.message || "Failed to delete account.");
        this.disabled = false;
        this.textContent = "Delete Account";
        console.error("Delete account error:", error);
      }
    } else {
      // Fallback if modal function not available
      if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
        if (confirm("Are you absolutely sure?")) {
          users = users.filter((u) => u.email !== currentUser.email);
          localStorage.setItem("users", JSON.stringify(users));
          localStorage.removeItem("loggedInUser");
          alert("Account deleted successfully!");
          window.location.href = "index.html";
        }
      }
    }
  });
} else {
  console.error("Delete account button not found!");
}

/* ============================================
   CLICKABLE PROFILE PICTURE
   ============================================ */
const profileImageWrapper = document.getElementById("profileImageWrapper");

if (profileImageWrapper && profileImage) {
  profileImageWrapper.addEventListener("click", function(e) {
    e.preventDefault();
    const imageSrc = profileImage.src;
    
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
    
    overlay.addEventListener('click', function() {
      overlay.remove();
    });
    
    document.body.appendChild(overlay);
  });
}

/* ============================================
   LOAD USER DATA ON PAGE LOAD
   ============================================ */
loadUserData();
console.log("Profile.js loaded successfully");
console.log("Logout button exists:", !!logoutBtn);
console.log("Delete account button exists:", !!deleteAccountBtn);
console.log("showConfirmModal exists:", typeof showConfirmModal !== 'undefined');