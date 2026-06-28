/* ============================================
   PROFILE.JS - WRAPPED IN DOMContentLoaded
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {

  console.log("🚀 DOM fully loaded - profile.js starting");

  const loggedInEmail = localStorage.getItem("loggedInUser");
  if (!loggedInEmail) {
    window.location.href = "signin.html";
    return;
  }

  let currentUser = null;
  const userData = localStorage.getItem("userData");
  if (userData) {
    currentUser = JSON.parse(userData);
  }

  if (!currentUser) {
    localStorage.removeItem("loggedInUser");
    window.location.href = "signin.html";
    return;
  }

  console.log("Current user:", currentUser);

  /* ============================================
     DOM ELEMENTS
     ============================================ */
  const profileImage = document.getElementById("profileImage");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
  const uploadBtnText = document.getElementById("uploadBtnText");
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
  const saveAccountText = document.getElementById("saveAccountText");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // LOG ALL BUTTONS TO CONFIRM THEY ARE FOUND
  console.log("🔍 Button elements found in DOMContentLoaded:");
  console.log("  uploadPhotoBtn:", !!uploadPhotoBtn);
  console.log("  saveAccountBtn:", !!saveAccountBtn);
  console.log("  changePasswordBtn:", !!changePasswordBtn);
  console.log("  deleteAccountBtn:", !!deleteAccountBtn);
  console.log("  uploadBtnText:", !!uploadBtnText);
  console.log("  saveAccountText:", !!saveAccountText);

  /* ============================================
     LOAD USER DATA FROM MONGODB
     ============================================ */
  async function loadUserData() {
    try {
      const res = await fetch("/api/get-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentUser = data;
      localStorage.setItem("userData", JSON.stringify(data));

      if (profileUsername) profileUsername.textContent = data.username || 'User';
      if (profileEmailDisplay) profileEmailDisplay.textContent = data.email || 'user@email.com';
      if (profileViewUsername) profileViewUsername.textContent = data.username || 'User';
      if (profileViewEmail) profileViewEmail.textContent = data.email || 'user@email.com';
      if (accountUsernameDisplay) accountUsernameDisplay.textContent = data.username || 'User';
      if (accountEmailDisplay) accountEmailDisplay.textContent = data.email || 'user@email.com';
      if (profileEmail) profileEmail.value = data.email || '';
      if (profileUsernameInput) profileUsernameInput.value = data.username || '';
      if (profileImage) profileImage.src = data.photo || DEFAULT_ICON;

      const navProfilePhoto = document.getElementById("navProfilePhoto");
      if (navProfilePhoto) {
        navProfilePhoto.src = data.photo || DEFAULT_ICON;
        console.log("Navigation photo updated from database");
      }
      const navUsername = document.getElementById("navUsername");
      if (navUsername) navUsername.textContent = data.username || 'Profile';

      updateDeletePhotoButton();
    } catch (error) {
      console.error("Load user error:", error);
      toastError("Failed to load user data.");
    }
  }

  /* ============================================
     DELETE PHOTO BUTTON
     ============================================ */
  function updateDeletePhotoButton() {
    const container = document.getElementById("removePhotoContainer");
    if (!container) return;
    container.innerHTML = '';

    const hasPhoto = currentUser && currentUser.photo && currentUser.photo !== DEFAULT_ICON && currentUser.photo !== "";

    if (hasPhoto) {
      const deletePhotoBtn = document.createElement("button");
      deletePhotoBtn.id = "deletePhotoBtn";
      deletePhotoBtn.className = "convert-btn";
      deletePhotoBtn.style.cssText = "padding:5px 15px; font-size:0.75rem; background:#e53935; display:inline-block;";
      deletePhotoBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Remove';
      
      deletePhotoBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const res = await fetch("/api/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: loggedInEmail, photo: "" })
          });
          
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to remove photo.");
          }
          
          currentUser.photo = "";
          localStorage.setItem("userData", JSON.stringify(currentUser));
          
          if (profileImage) profileImage.src = DEFAULT_ICON;
          const navProfilePhoto = document.getElementById("navProfilePhoto");
          if (navProfilePhoto) navProfilePhoto.src = DEFAULT_ICON;
          
          updateDeletePhotoButton();
          toastSuccess("Profile photo removed!");
          
        } catch (error) {
          console.error("Remove photo error:", error);
          toastError(error.message || "Failed to remove photo.");
        }
      };
      
      container.appendChild(deletePhotoBtn);
    }
  }

  /* ============================================
     ACCOUNT & SECURITY TABS
     ============================================ */
  if (profileView) profileView.style.display = "block";
  if (accountPanel) accountPanel.style.display = "none";
  if (securityPanel) securityPanel.style.display = "none";

  if (accountTab) {
    accountTab.classList.remove('active');
  }
  if (securityTab) {
    securityTab.classList.remove('active');
  }

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
     PASSWORD TOGGLES
     ============================================ */
  function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;
    button.addEventListener("click", () => {
      const icon = button.querySelector("i");
      if (input.type === "password") {
        input.type = "text";
        if (icon) icon.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        input.type = "password";
        if (icon) icon.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  }

  togglePasswordVisibility("accountCurrentPassword", "toggleAccountPassword");
  togglePasswordVisibility("currentPassword", "toggleCurrentPassword");
  togglePasswordVisibility("newPassword", "toggleNewPassword");
  togglePasswordVisibility("confirmPassword", "toggleConfirmPassword");

  /* ============================================
     UPLOAD PHOTO BUTTON - WITH SPAN PROTECTION
     ============================================ */
  if (uploadPhotoBtn && profilePhotoInput) {
    console.log("✅ Setting up Upload Photo button");
    
    uploadPhotoBtn.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("📸 Upload button clicked");
      
      // Change button text using the span to protect the icon
      uploadBtnText.textContent = "Uploading...";
      uploadPhotoBtn.querySelector("i").className = "fa-solid fa-spinner fa-spin";
      uploadPhotoBtn.querySelector("i").style.animationDuration = "0.5s";
      uploadPhotoBtn.disabled = true;
      
      profilePhotoInput.value = "";
      profilePhotoInput.click();
    });

    profilePhotoInput.addEventListener("change", async function(e) {
      const file = this.files[0];
      console.log("📸 File selected:", file ? file.name : "No file");
      
      if (!file) {
        // Restore button
        uploadBtnText.textContent = "Upload Photo";
        uploadPhotoBtn.querySelector("i").className = "fa-solid fa-camera";
        uploadPhotoBtn.disabled = false;
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toastError("Please select an image.");
        this.value = "";
        // Restore button
        uploadBtnText.textContent = "Upload Photo";
        uploadPhotoBtn.querySelector("i").className = "fa-solid fa-camera";
        uploadPhotoBtn.disabled = false;
        return;
      }

      const reader = new FileReader();
      reader.onload = async function(event) {
        const photoData = event.target.result;
        try {
          const formData = new FormData();
          formData.append('email', loggedInEmail);
          formData.append('photo', photoData);
          
          const res = await fetch("/api/update-user", {
            method: "POST",
            body: formData
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to upload photo.");

          currentUser.photo = photoData;
          localStorage.setItem("userData", JSON.stringify(currentUser));
          if (profileImage) profileImage.src = photoData;
          const navProfilePhoto = document.getElementById("navProfilePhoto");
          if (navProfilePhoto) navProfilePhoto.src = photoData;
          updateDeletePhotoButton();
          
          // Restore button
          uploadBtnText.textContent = "Upload Photo";
          uploadPhotoBtn.querySelector("i").className = "fa-solid fa-camera";
          uploadPhotoBtn.disabled = false;
          
          toastSuccess("Profile photo updated!");
        } catch (error) {
          // Restore on error
          uploadBtnText.textContent = "Upload Photo";
          uploadPhotoBtn.querySelector("i").className = "fa-solid fa-camera";
          uploadPhotoBtn.disabled = false;
          toastError(error.message);
          console.error("Photo upload error:", error);
        }
      };
      reader.readAsDataURL(file);
      this.value = "";
    });
  }

  /* ============================================
     SAVE ACCOUNT BUTTON - WITH PROPER VALIDATION
     ============================================ */
  if (saveAccountBtn) {
    console.log("✅ Setting up Save Account button");
    
    saveAccountBtn.addEventListener("click", async function() {
      console.log("💾 Save Account button clicked");
      
      const currentPassword = accountCurrentPassword.value;
      const newEmail = profileEmail.value.trim().toLowerCase();
      const newUsername = profileUsernameInput.value.trim();
      
      // ============================================
      // VALIDATION - Button text does NOT change here
      // ============================================
      
      // 1. Check: Current password must be entered
      if (!currentPassword) {
        toastError("Please enter your current password.");
        return;
      }
      
      // 2. Check: At least one field must be changed
      const isEmailChanged = newEmail && newEmail !== currentUser.email;
      const isUsernameChanged = newUsername && newUsername !== currentUser.username;
      
      if (!isEmailChanged && !isUsernameChanged) {
        toastError("Please change your email or username.");
        return;
      }
      
      // 3. Check: Username length (if changed)
      if (isUsernameChanged && newUsername.length < 3) {
        toastError("Username must have at least 3 characters.");
        return;
      }
      
      // 4. Check: Email not already used (if changed)
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
      
      // ============================================
      // ALL VALIDATIONS PASSED - CHANGE BUTTON TEXT
      // ============================================
      saveAccountText.textContent = "Sending code...";
      this.disabled = true;
      console.log("💾 Button changed to: Sending code...");

      try {
        // Verify current password
        const verifyRes = await fetch("/api/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loggedInEmail, password: currentPassword })
        });

        if (!verifyRes.ok) {
          toastError("Incorrect current password.");
          saveAccountText.textContent = "Save Changes";
          this.disabled = false;
          return;
        }

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
          toastWarning("Update cancelled.");
          saveAccountText.textContent = "Save Changes";
          this.disabled = false;
          return;
        }

        const verifyCodeRes = await fetch("/api/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email, code: code.trim() })
        });

        const verifyData = await verifyCodeRes.json();
        if (!verifyData.success) {
          toastError("Incorrect verification code.");
          saveAccountText.textContent = "Save Changes";
          this.disabled = false;
          return;
        }

        // Prepare update data - only send changed fields
        const updateData = {
          email: currentUser.email
        };
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

        // Update current user data
        if (isEmailChanged) currentUser.email = newEmail;
        if (isUsernameChanged) currentUser.username = newUsername;
        
        localStorage.setItem("userData", JSON.stringify(currentUser));
        if (isEmailChanged) {
          localStorage.setItem("loggedInUser", newEmail);
        }
        
        accountCurrentPassword.value = "";
        
        toastSuccess("Account updated! Refreshing...");
        
        // Restore button
        saveAccountText.textContent = "Save Changes";
        this.disabled = false;
        
        // REFRESH PAGE
        setTimeout(function() {
          window.location.reload();
        }, 1500);

      } catch (error) {
        saveAccountText.textContent = "Save Changes";
        this.disabled = false;
        toastError(error.message || "Failed to update account.");
        console.error("Save account error:", error);
      }
    });
  }

  /* ============================================
     CHANGE PASSWORD - WORKING (UNCHANGED)
     ============================================ */
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", async function() {
      const curPass = document.getElementById("currentPassword").value;
      const newPass = document.getElementById("newPassword").value;
      const confPass = document.getElementById("confirmPassword").value;

      const verifyRes = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loggedInEmail, password: curPass })
      });

      if (!verifyRes.ok) {
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

        toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

        const code = await showVerificationModal();
        
        if (!code) {
          this.disabled = false;
          this.textContent = "Change Password";
          toastWarning("Password change cancelled.");
          return;
        }

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
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function(e) {
      e.preventDefault();
      
      const confirm = await showConfirmModal(
        '🚪 Log Out',
        'Are you sure you want to log out?',
        'Yes, Log Out',
        'Cancel'
      );
      
      if (confirm) {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userData");
        toastSuccess("Logged out successfully!");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      }
    });
  }

  /* ============================================
     DELETE ACCOUNT - UNCHANGED (WORKING)
     ============================================ */
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener("click", async function(e) {
      e.preventDefault();
      
      const confirm1 = await showConfirmModal(
        '⚠️ Delete Account',
        'Are you sure you want to permanently delete your account? This cannot be undone.',
        'Yes, Delete',
        'Cancel'
      );
      
      if (!confirm1) return;

      const confirm2 = await showConfirmModal(
        '⚠️ Final Warning',
        'Are you absolutely sure? This will delete all your data permanently.',
        'Yes, Delete Permanently',
        'Cancel'
      );
      
      if (!confirm2) return;

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

        const deleteRes = await fetch("/api/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentUser.email })
        });

        if (!deleteRes.ok) {
          const data = await deleteRes.json();
          throw new Error(data.error || "Failed to delete account.");
        }

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
  console.log("✅ Profile.js loaded successfully");

}); // End of DOMContentLoaded