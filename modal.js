/* ============================================
   CUSTOM MODAL SYSTEM - Modern & User-Friendly
   ============================================ */
// A fully customizable modal system with glass-morphism design
// Supports: alerts, confirmations, and password/input prompts
// Features: keyboard shortcuts (Enter/Escape), click outside to close,
//           password show/hide toggle, async/await support

// ============================================
// MAIN MODAL FUNCTION
// ============================================
// Core function that creates and displays a custom modal
// Returns a Promise that resolves with user input or confirmation
function showModal(options) {
    // Destructure options with defaults
    const {
        title,                  // Modal title (string)
        message,                // Modal message (string, supports \n for line breaks)
        input = false,          // Show input field? (boolean)
        inputPlaceholder = '',  // Placeholder text for input
        inputType = 'text',     // Input type: 'text' or 'password'
        confirmText = 'Confirm', // Text on confirm button
        cancelText = 'Cancel',   // Text on cancel button
        onConfirm,              // Callback when confirm is clicked
        onCancel,               // Callback when cancel is clicked
        showCancel = true       // Show cancel button? (boolean)
    } = options;

    // Remove any existing modal to prevent duplicates
    const existingModal = document.getElementById('customModal');
    if (existingModal) existingModal.remove();

    // ===== CREATE OVERLAY =====
    // Dark background with blur effect behind the modal
    const overlay = document.createElement('div');
    overlay.id = 'customModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;

    // ===== CREATE MODAL BOX =====
    // Glass-morphism design with rounded corners and shadow
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(25, 35, 45, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 30px 35px;
        max-width: 450px;
        width: 92%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        animation: slideUp 0.3s ease;
        text-align: center;
    `;

    // ===== TITLE =====
    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        color: white;
        font-size: 1.3rem;
        margin: 0 0 8px 0;
        font-family: 'Segoe UI', sans-serif;
    `;
    modal.appendChild(titleEl);

    // ===== MESSAGE =====
    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.cssText = `
        color: #cccccc;
        font-size: 0.9rem;
        line-height: 1.5;
        margin: 0 0 16px 0;
        font-family: 'Segoe UI', sans-serif;
        white-space: pre-line;
    `;
    modal.appendChild(msgEl);

    // ===== INPUT FIELD (Optional) =====
    let inputEl = null;
    if (input) {
        // Wrapper for input and optional toggle button
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: center;
            margin-bottom: 18px;
            width: 100%;
        `;

        // Create input field
        inputEl = document.createElement('input');
        inputEl.type = inputType === 'password' ? 'password' : inputType;
        inputEl.placeholder = inputPlaceholder;
        inputEl.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 12px;
            background: rgba(255,255,255,0.08);
            color: white;
            font-size: 1rem;
            outline: none;
            box-sizing: border-box;
            font-family: 'Segoe UI', sans-serif;
            text-align: left;
            letter-spacing: 1px;
        `;
        wrapper.appendChild(inputEl);

        // If password type, add show/hide toggle button
        if (inputType === 'password') {
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
            toggleBtn.style.cssText = `
                padding: 12px 14px;
                border: none;
                border-radius: 12px;
                background: rgba(255,255,255,0.08);
                color: white;
                cursor: pointer;
                font-size: 1rem;
                transition: 0.3s;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            // Hover effects
            toggleBtn.onmouseover = () => {
                toggleBtn.style.background = 'rgba(255,255,255,0.15)';
            };
            toggleBtn.onmouseout = () => {
                toggleBtn.style.background = 'rgba(255,255,255,0.08)';
            };
            // Toggle password visibility
            toggleBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const icon = this.querySelector('i');
                if (inputEl.type === 'password') {
                    inputEl.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    inputEl.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
                inputEl.focus();
            };
            wrapper.appendChild(toggleBtn);
        }

        modal.appendChild(wrapper);
        inputEl.focus(); // Auto-focus input field
    }

    // ===== BUTTONS CONTAINER =====
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
    `;

    // ===== CANCEL BUTTON =====
    let cancelBtn = null;
    if (showCancel) {
        cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding: 10px 25px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            background: rgba(255,255,255,0.08);
            color: #aaa;
            font-size: 0.9rem;
            cursor: pointer;
            transition: 0.3s;
            font-weight: 600;
            font-family: 'Segoe UI', sans-serif;
            flex: 1;
            min-width: 80px;
        `;
        // Hover effects
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.15)';
            cancelBtn.style.color = 'white';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.08)';
            cancelBtn.style.color = '#aaa';
        };
        // Cancel button handler
        cancelBtn.onclick = () => {
            overlay.remove();
            if (onCancel) onCancel();
            if (overlay._resolve) overlay._resolve(null);
        };
        btnContainer.appendChild(cancelBtn);
    }

    // ===== CONFIRM BUTTON =====
    // Primary action button (cyan themed)
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText = `
        padding: 10px 25px;
        border: none;
        border-radius: 12px;
        background: #00bcd4;
        color: white;
        font-size: 0.9rem;
        cursor: pointer;
        transition: 0.3s;
        font-weight: 600;
        font-family: 'Segoe UI', sans-serif;
        flex: 1;
        min-width: 80px;
    `;
    // Hover effects with scale animation
    confirmBtn.onmouseover = () => {
        confirmBtn.style.background = '#008ba3';
        confirmBtn.style.transform = 'scale(1.02)';
    };
    confirmBtn.onmouseout = () => {
        confirmBtn.style.background = '#00bcd4';
        confirmBtn.style.transform = 'scale(1)';
    };
    // Confirm button handler
    confirmBtn.onclick = () => {
        const value = inputEl ? inputEl.value.trim() : true;
        overlay.remove();
        if (onConfirm) onConfirm(value);
        if (overlay._resolve) overlay._resolve(value);
    };
    btnContainer.appendChild(confirmBtn);

    modal.appendChild(btnContainer);

    // ===== CLOSE ON OUTSIDE CLICK =====
    // Clicking the overlay (background) closes the modal
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
            if (overlay._resolve) overlay._resolve(null);
        }
    };

    // ===== KEYBOARD SUPPORT =====
    // Enter key: Confirm action
    // Escape key: Cancel action
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmBtn.click();
        }
        if (e.key === 'Escape') {
            if (cancelBtn) cancelBtn.click();
        }
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // ===== RETURN PROMISE =====
    // Allows async/await usage: const result = await showModal({...})
    return new Promise((resolve) => {
        overlay._resolve = resolve;
    });
}

// ============================================
// CSS ANIMATIONS
// ============================================
// Injects animation keyframes for fadeIn and slideUp effects
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(modalStyles);

/* ============================================
   SHORTHAND FUNCTIONS
   ============================================ */
// Pre-configured modal types for common use cases

// ===== VERIFICATION MODAL =====
// Prompts user to enter 6-digit verification code
// Includes SPAM folder reminder to help users find the email
function showVerificationModal() {
    return showModal({
        title: '🔐 Verification Code',
        message: 'Enter the 6-digit code sent to your email.\n\nAlso check your SPAM/JUNK folder.',
        input: true,
        inputPlaceholder: 'Enter 6-digit code',
        inputType: 'text',
        confirmText: 'Verify',
        cancelText: 'Cancel',
        showCancel: true
    });
}

// ===== CONFIRMATION MODAL =====
// Asks user to confirm an action (e.g., delete, logout)
// Returns true if confirmed, false/null if cancelled
function showConfirmModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return showModal({
        title: title,
        message: message,
        input: false,
        confirmText: confirmText,
        cancelText: cancelText,
        showCancel: true
    });
}

// ===== ALERT MODAL =====
// Shows a simple message with only an OK button
// Used for information messages that don't require choice
function showAlertModal(title, message, confirmText = 'OK') {
    return showModal({
        title: title,
        message: message,
        input: false,
        confirmText: confirmText,
        cancelText: '',
        showCancel: false
    });
}

/* ============================================
   EXPOSE FUNCTIONS GLOBALLY
   ============================================ */
// Make functions available for use in other scripts (profile.js, auth.js, etc.)
window.showModal = showModal;
window.showVerificationModal = showVerificationModal;
window.showConfirmModal = showConfirmModal;
window.showAlertModal = showAlertModal;

console.log("✅ Modal system loaded successfully!");
console.log("📝 Verification message: Enter the 6-digit code sent to your email. Also check SPAM/JUNK folder.");