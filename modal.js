/* ============================================
   CUSTOM MODAL SYSTEM - Modern & User-Friendly
   ============================================ */

// Show a custom modal with modern design
function showModal(options) {
    const {
        title,
        message,
        input = false,
        inputPlaceholder = '',
        inputType = 'text',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm,
        onCancel,
        showCancel = true
    } = options;

    // Remove existing modal if any
    const existingModal = document.getElementById('customModal');
    if (existingModal) existingModal.remove();

    // Create overlay
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

    // Create modal box
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: rgba(25, 35, 45, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 35px 40px;
        max-width: 450px;
        width: 92%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        animation: slideUp 0.3s ease;
        text-align: center;
    `;

    // Title
    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    titleEl.style.cssText = `
        color: white;
        font-size: 1.4rem;
        margin: 0 0 10px 0;
        font-family: 'Segoe UI', sans-serif;
    `;
    modal.appendChild(titleEl);

    // Message
    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.cssText = `
        color: #cccccc;
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0 0 20px 0;
        font-family: 'Segoe UI', sans-serif;
    `;
    modal.appendChild(msgEl);

    // Input field (if requested)
    let inputEl = null;
    if (input) {
        inputEl = document.createElement('input');
        inputEl.type = inputType;
        inputEl.placeholder = inputPlaceholder;
        inputEl.style.cssText = `
            width: 100%;
            padding: 14px 16px;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 12px;
            background: rgba(255,255,255,0.08);
            color: white;
            font-size: 1rem;
            outline: none;
            margin-bottom: 20px;
            box-sizing: border-box;
            font-family: 'Segoe UI', sans-serif;
            text-align: center;
            letter-spacing: 8px;
            font-size: 1.4rem;
        `;
        inputEl.focus();
        modal.appendChild(inputEl);
    }

    // Buttons container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
    `;

    // Cancel button
    if (showCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.style.cssText = `
            padding: 12px 30px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            background: rgba(255,255,255,0.08);
            color: #aaa;
            font-size: 0.95rem;
            cursor: pointer;
            transition: 0.3s;
            font-weight: 600;
            font-family: 'Segoe UI', sans-serif;
            flex: 1;
            min-width: 100px;
        `;
        cancelBtn.onmouseover = () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.15)';
            cancelBtn.style.color = 'white';
        };
        cancelBtn.onmouseout = () => {
            cancelBtn.style.background = 'rgba(255,255,255,0.08)';
            cancelBtn.style.color = '#aaa';
        };
        cancelBtn.onclick = () => {
            overlay.remove();
            if (onCancel) onCancel();
        };
        btnContainer.appendChild(cancelBtn);
    }

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText = `
        padding: 12px 30px;
        border: none;
        border-radius: 12px;
        background: #00bcd4;
        color: white;
        font-size: 0.95rem;
        cursor: pointer;
        transition: 0.3s;
        font-weight: 600;
        font-family: 'Segoe UI', sans-serif;
        flex: 1;
        min-width: 100px;
    `;
    confirmBtn.onmouseover = () => {
        confirmBtn.style.background = '#008ba3';
        confirmBtn.style.transform = 'scale(1.02)';
    };
    confirmBtn.onmouseout = () => {
        confirmBtn.style.background = '#00bcd4';
        confirmBtn.style.transform = 'scale(1)';
    };
    confirmBtn.onclick = () => {
        const value = inputEl ? inputEl.value : true;
        overlay.remove();
        if (onConfirm) onConfirm(value);
    };
    btnContainer.appendChild(confirmBtn);

    modal.appendChild(btnContainer);

    // Close on overlay click (but not on modal click)
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    };

    // Enter key support
    modal.onkeydown = (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
        if (e.key === 'Escape') {
            cancelBtn?.click();
        }
    };

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Return promise for async usage
    return new Promise((resolve) => {
        // Store resolve for later use
        overlay._resolve = resolve;
        const originalOnConfirm = onConfirm;
        const originalOnCancel = onCancel;
        overlay.onConfirm = (value) => {
            if (originalOnConfirm) originalOnConfirm(value);
            resolve(value);
        };
        overlay.onCancel = () => {
            if (originalOnCancel) originalOnCancel();
            resolve(null);
        };
        // Override button handlers
        confirmBtn.onclick = () => {
            const value = inputEl ? inputEl.value : true;
            overlay.remove();
            if (originalOnConfirm) originalOnConfirm(value);
            resolve(value);
        };
        cancelBtn.onclick = () => {
            overlay.remove();
            if (originalOnCancel) originalOnCancel();
            resolve(null);
        };
    });
}

// Add animations to document
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

// Shorthand functions
function showVerificationModal(message = 'Enter the verification code sent to your email:') {
    return showModal({
        title: '🔐 Verification Code',
        message: message,
        input: true,
        inputPlaceholder: 'Enter 6-digit code',
        inputType: 'text',
        confirmText: 'Verify',
        cancelText: 'Cancel',
        showCancel: true
    });
}

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