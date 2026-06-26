  /* ============================================
    PASSWORD SHOW/HIDE TOGGLE LOGIC
    ============================================ */
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

  togglePassword("signupPassword", "toggleSignup");
  togglePassword("signinPassword", "toggleSignin");

  /* ============================================
    SIGN UP - MONGODB
    ============================================ */
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = document.getElementById("signupUsername").value.trim();
      const email = document.getElementById("signupEmail").value.trim().toLowerCase();
      const password = document.getElementById("signupPassword").value;
      const confirmPassword = document.getElementById("signupConfirmPassword").value;

      if (username.length < 3) {
        toastError("Username must have at least 3 characters.");
        return;
      }

      if (password !== confirmPassword) {
        toastError("Passwords do not match.");
        return;
      }

      const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
      if (!strongPassword.test(password)) {
        toastError("Password: 5+ chars, one capital, one number, one symbol.");
        return;
      }

      try {
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

        const code = await showVerificationModal();
        
        if (!code) {
          toastWarning("Sign up cancelled.");
          return;
        }

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
  const signinForm = document.getElementById("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("signinEmail").value.trim().toLowerCase();
      const password = document.getElementById("signinPassword").value;

      try {
        const res = await fetch("/api/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
          if (data.error === "Account not found.") {
            toastError("Account not registered. Redirecting to sign up...");
            setTimeout(() => { window.location.href = "signup.html"; }, 2000);
          } else {
            toastError(data.error || "Sign in failed.");
          }
          return;
        }

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
    FORGOT PASSWORD - MONGODB (COMPLETELY FIXED)
    ============================================ */
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", async function(e) {
      e.preventDefault();
      console.log("Forgot password clicked");
      
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

        // --- THIS IS THE FIX ---
        // Using showVerificationModal() with the correct message
        const code = await showVerificationModal();

        if (!code) {
          toastWarning("Password reset cancelled.");
          return;
        }

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

        const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{5,}$/;
        if (!strongPassword.test(newPassword)) {
          toastError("Password: 5+ chars, one capital, one number, one symbol.");
          return;
        }

        if (userData.password === newPassword) {
          toastError("New password must be different.");
          return;
        }

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