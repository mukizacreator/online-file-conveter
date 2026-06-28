/* ============================================
   PASSWORD SHOW/HIDE TOGGLE LOGIC
   ============================================ */
// Reusable function to handle switching password input visibility and updating the eye icon
// Used on both Sign Up and Sign In forms
function togglePassword(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);

  if (!input || !button) return;

  button.addEventListener("click", () => {
    const icon = button.querySelector("i");
    if (input.type === "password") {
      // Show password: change type to text, update icon to eye-slash
      input.type = "text";
      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    } else {
      // Hide password: change type to password, update icon to eye
      input.type = "password";
      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    }
  });
}

// Initialize password toggle for both Sign Up and Sign In forms
togglePassword("signupPassword", "toggleSignup");
togglePassword("signinPassword", "toggleSignin");

/* ============================================
   SIGN UP - MONGODB
   ============================================ */
// Complete registration flow:
// 1. Validate user input (username, password strength, password match)
// 2. Send verification code to email
// 3. Show verification modal for 6-digit code
// 4. Verify code with server
// 5. Create account in MongoDB
// 6. Redirect to sign-in page
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form values
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    // ===== VALIDATION 1: Username length =====
    if (username.length < 3) {
      toastError("Username must have at least 3 characters.");
      return;
    }

    // ===== VALIDATION 2: Password match =====
    if (password !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    // ===== VALIDATION 3: Password strength =====
    // Regex: At least 5 chars, one capital letter, one number, one symbol
    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
    if (!strongPassword.test(password)) {
      toastError("Password: 5+ chars, one capital, one number, one symbol.");
      return;
    }

    try {
      // ===== STEP 1: Send verification code =====
      toastInfo("Sending verification code...");
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

      // ===== STEP 2: Show verification modal =====
      const code = await showVerificationModal();
      if (!code) {
        toastWarning("Sign up cancelled.");
        return;
      }

      // ===== STEP 3: Verify code =====
      const verifyRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        return;
      }

      // ===== STEP 4: Create account =====
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        throw new Error(signupData.error || "Failed to create account.");
      }

      toastSuccess("Account created! Please sign in.");
      signupForm.reset();
      setTimeout(() => { window.location.href = "signin.html"; }, 2000);

    } catch (error) {
      toastError(error.message || "Failed to create account.");
      console.error("Signup error:", error);
    }
  });
}

/* ============================================
   SIGN IN - MONGODB WITH REDIRECT
   ============================================ */
// Complete login flow:
// 1. Verify credentials against MongoDB
// 2. If account not found, redirect to sign-up
// 3. On success, store session in localStorage
// 4. Redirect to dashboard
const signinForm = document.getElementById("signinForm");
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get login credentials
    const email = document.getElementById("signinEmail").value.trim().toLowerCase();
    const password = document.getElementById("signinPassword").value;

    try {
      // ===== STEP 1: Send login request =====
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        // ===== ERROR 1: Account not found =====
        if (data.error === "Account not found.") {
          toastError("Account not registered. Redirecting to sign up...");
          setTimeout(() => { window.location.href = "signup.html"; }, 2000);
        } else {
          toastError(data.error || "Sign in failed.");
        }
        return;
      }

      // ===== STEP 2: Login success - store session =====
      localStorage.setItem("loggedInUser", email);
      localStorage.setItem("userData", JSON.stringify(data.user));

      toastSuccess("Sign in successful!");
      setTimeout(() => { window.location.href = "index.html"; }, 1000);

    } catch (error) {
      toastError(error.message || "Sign in failed.");
      console.error("Signin error:", error);
    }
  });
}

/* ============================================
   FORGOT PASSWORD - MONGODB
   ============================================ */
// Complete password reset flow:
// 1. User enters registered email
// 2. Check if email exists in database
// 3. Send verification code to email
// 4. Verify code
// 5. Get new password (with strength validation)
// 6. Confirm new password
// 7. Update password in database
// 8. Redirect to sign-in
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("Forgot password clicked");
    
    // ===== STEP 1: Get user's email =====
    const email = await showModal({
      title: '🔑 Reset Password',
      message: 'Enter your registered email:',
      input: true,
      inputPlaceholder: 'Enter your email',
      inputType: 'email',
      confirmText: 'Send Code',
      cancelText: 'Cancel',
      showCancel: true
    });
    
    if (!email) {
      toastWarning("Password reset cancelled.");
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      toastError("Please enter a valid email.");
      return;
    }

    try {
      // ===== STEP 2: Check if email exists =====
      const userRes = await fetch("/api/get-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });

      const userData = await userRes.json();
      if (!userRes.ok) {
        throw new Error(userData.error || "User not found.");
      }

      console.log("User found:", userData.email);

      // ===== STEP 3: Send verification code =====
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox (and SPAM folder if not found).");

      // ===== STEP 4: Show verification modal =====
      const code = await showModal({
        title: '🔐 Verification Code',
        message: 'Enter the 6-digit code sent to your email.\n\nAlso check your SPAM/JUNK folder.',
        input: true,
        inputPlaceholder: 'Enter 6-digit code',
        inputType: 'text',
        confirmText: 'Verify',
        cancelText: 'Cancel',
        showCancel: true
      });

      if (!code) {
        toastWarning("Password reset cancelled.");
        return;
      }

      // ===== STEP 5: Verify code =====
      const verifyRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code: code.trim() })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        return;
      }

      // ===== STEP 6: Get new password =====
      const newPassword = await showModal({
        title: '🔑 New Password',
        message: 'Enter new password (5+ chars, one capital, one number, one symbol):',
        input: true,
        inputPlaceholder: 'Enter new password',
        inputType: 'password',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        showCancel: true
      });

      if (!newPassword) {
        toastWarning("Password reset cancelled.");
        return;
      }

      // ===== STEP 7: Validate new password strength =====
      const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
      if (!strongPassword.test(newPassword)) {
        toastError("Password: 5+ chars, one capital, one number, one symbol.");
        return;
      }

      // ===== STEP 8: Ensure new password is different =====
      if (userData.password === newPassword) {
        toastError("New password must be different.");
        return;
      }

      // ===== STEP 9: Confirm new password =====
      const confirmPassword = await showModal({
        title: '🔑 Confirm Password',
        message: 'Re-enter your new password:',
        input: true,
        inputPlaceholder: 'Confirm new password',
        inputType: 'password',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        showCancel: true
      });

      if (!confirmPassword) {
        toastWarning("Password reset cancelled.");
        return;
      }

      if (newPassword !== confirmPassword) {
        toastError("Passwords do not match.");
        return;
      }

      // ===== STEP 10: Update password in database =====
      const updateRes = await fetch("/api/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, newPassword })
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || "Failed to update password.");
      }

      toastSuccess("Password reset successfully! Please sign in.");
      setTimeout(() => { window.location.href = "signin.html"; }, 2000);

    } catch (error) {
      toastError(error.message || "Failed to reset password.");
      console.error("Reset password error:", error);
    }
  });
}