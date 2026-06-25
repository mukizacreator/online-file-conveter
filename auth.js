/* ============================================
   PASSWORD SHOW/HIDE TOGGLE LOGIC
   ============================================ */
// Reusable function to handle switching password input visibility and updating the eye icon
function togglePassword(inputId, buttonId) {
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

// Initialize password toggle for both Sign Up and Sign In forms
togglePassword("signupPassword", "toggleSignup");
togglePassword("signinPassword", "toggleSignin");

/* ============================================
   SIGN UP FORM HANDLING WITH EMAIL VERIFICATION
   ============================================ */
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;
    const message = document.getElementById("signupMessage");

    // Validation: Username length check
    if (username.length < 3) {
      toastError("Username must have at least 3 characters.");
      return;
    }

    // Validation: Password match
    if (password !== confirmPassword) {
      toastError("Passwords do not match.");
      return;
    }

    // Validation: Check if email is already registered
    let users = JSON.parse(localStorage.getItem("users")) || [];
    const exists = users.some((user) => user.email === email);
    if (exists) {
      toastError("Email already registered. Please sign in.");
      setTimeout(() => { window.location.href = "signin.html"; }, 1500);
      return;
    }

    // Validation: Password complexity
    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
    if (!strongPassword.test(password)) {
      toastError("Password must contain: At least 5 characters, one capital letter, one number, and one symbol.");
      return;
    }

    try {
      // Temporarily save user data
      const tempUser = { username, email, password, photo: "" };
      
      // Send verification code
      toastInfo("Sending verification code to your email...");
      const res = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send verification code.");
      }

      toastInfo("Verification code sent to your email. Please check your inbox.");

      // Show verification modal
      const code = await showVerificationModal('Enter the verification code sent to your email:');
      
      if (!code) {
        toastWarning("Sign up cancelled.");
        return;
      }

      // Verify the code
      const verifyRes = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, code: code.trim() })
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code. Please try again.");
        return;
      }

      // Save user to localStorage
      users.push(tempUser);
      localStorage.setItem("users", JSON.stringify(users));

      toastSuccess("Account created successfully! Please sign in.");
      signupForm.reset();
      
      setTimeout(() => {
        window.location.href = "signin.html";
      }, 2000);

    } catch (error) {
      toastError(error.message || "Failed to create account. Please try again.");
      console.error("Signup error:", error);
    }
  });
}

/* ============================================
   SIGN IN FORM HANDLING
   ============================================ */
// Verifies user credentials against stored data and manages the login session
const signinForm = document.getElementById("signinForm");
if (signinForm) {
  signinForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get login credentials
    const email = document.getElementById("signinEmail").value.trim().toLowerCase();
    const password = document.getElementById("signinPassword").value;
    const message = document.getElementById("signinMessage");
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find((u) => u.email === email);

    // ERROR 1: Account not found - prompt user to sign up
    if (!user) {
      toastError("Account not registered. Please sign up.");
      setTimeout(() => { window.location.href = "signup.html"; }, 1500);
      return;
    }

    // ERROR 2: Password doesn't match stored password
    if (user.password !== password) {
      toastError("Incorrect password.");
      return;
    }

    // SUCCESS: Store logged-in user session and redirect to dashboard
    localStorage.setItem("loggedInUser", email);
    toastSuccess("Sign in successful. Redirecting...");
    setTimeout(() => { window.location.href = "index.html"; }, 1000);
  });
}

/* ============================================
   FORGOT PASSWORD - RESET PASSWORD
   ============================================ */
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async function(e) {
    e.preventDefault();
    console.log("Forgot password clicked");
    
    // Step 1: Ask for email
    const email = await showModal({
      title: '🔑 Reset Password',
      message: 'Enter your registered email address to receive a verification code:',
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
    
    // Validate email
    if (!email.includes('@') || !email.includes('.')) {
      toastError("Please enter a valid email address.");
      return;
    }
    
    // Check if email exists
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find((u) => u.email === email.toLowerCase().trim());
    
    if (!user) {
      toastError("No account found with this email address.");
      return;
    }
    
    try {
      // Send verification code
      const res = await fetch("/api/send-code", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email: email }) 
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send code.");
      }
      
      toastInfo("Verification code sent to your email.");
      
      // Step 2: Ask for verification code
      const code = await showModal({
        title: '🔐 Verification Code',
        message: 'Enter the 6-digit verification code sent to your email:',
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
      
      // Verify code
      const verifyRes = await fetch("/api/verify-code", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ email: email, code: code.trim() }) 
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        toastError("Incorrect verification code.");
        return;
      }
      
      // Step 3: Enter new password
      const newPassword = await showModal({
        title: '🔑 New Password',
        message: 'Enter your new password.\n\nRequirements: At least 5 characters, one capital letter, one number, one symbol.',
        input: true,
        inputPlaceholder: 'Enter new password',
        inputType: 'text',
        confirmText: 'Reset Password',
        cancelText: 'Cancel',
        showCancel: true
      });
      
      if (!newPassword) {
        toastWarning("Password reset cancelled.");
        return;
      }
      
      // Validate password strength
      const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
      if (!strongPassword.test(newPassword)) {
        toastError("Password must have: 5+ chars, one capital, one number, one symbol.");
        return;
      }
      
      // Step 4: Confirm password
      const confirmPassword = await showModal({
        title: '🔑 Confirm Password',
        message: 'Re-enter your new password to confirm:',
        input: true,
        inputPlaceholder: 'Confirm new password',
        inputType: 'text',
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
      
      // Update password
      const allUsers = JSON.parse(localStorage.getItem("users")) || [];
      const targetUser = allUsers.find((u) => u.email === email.toLowerCase().trim());
      
      if (targetUser) {
        targetUser.password = newPassword;
        localStorage.setItem("users", JSON.stringify(allUsers));
        toastSuccess("Password reset successfully! Please sign in.");
        
        setTimeout(() => {
          window.location.href = "signin.html";
        }, 2000);
      } else {
        toastError("User not found. Please try again.");
      }
      
    } catch (error) {
      toastError(error.message || "Failed to reset password.");
      console.error("Reset password error:", error);
    }
  });
}