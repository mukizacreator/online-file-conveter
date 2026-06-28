/* ============================================
   MODERN TOAST NOTIFICATION SYSTEM
   ============================================ */
// A sleek, glass-morphism toast notification system
// Toast types: success, error, warning, info
// All toasts auto-dismiss after 2 seconds (configurable)
// Features: slide-in animation, hover pause, close button, backdrop blur

// ============================================
// MAIN TOAST FUNCTION
// ============================================
// Creates and displays a toast notification with the specified message and type
// @param {string} message - The message to display
// @param {string} type - 'success', 'error', 'warning', or 'info' (default: 'info')
// @param {number} duration - Time in milliseconds before auto-dismiss (default: 2000ms)
function showToast(message, type = 'info', duration = 2000) {
  // Remove any existing toast container to prevent duplicates
  const existingContainer = document.getElementById('toastContainer');
  if (existingContainer) existingContainer.remove();

  // ===== CREATE TOAST CONTAINER =====
  // Fixed position in top-right corner, above all other content (z-index: 10000)
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    width: 100%;
    pointer-events: none;
  `;

  // ===== CREATE TOAST ELEMENT =====
  const toast = document.createElement('div');
  
  // Color configuration for each toast type
  const colors = {
    success: { bg: '#28a745', border: '#34ce57', icon: 'fa-check-circle' },
    error: { bg: '#dc3545', border: '#ff6b6b', icon: 'fa-exclamation-circle' },
    warning: { bg: '#ff9800', border: '#ffb74d', icon: 'fa-exclamation-triangle' },
    info: { bg: '#00bcd4', border: '#4dd0e1', icon: 'fa-info-circle' }
  };

  // Select color scheme based on toast type (fallback to info if invalid)
  const color = colors[type] || colors.info;

  // Toast styling: glass-morphism with colored left border
  toast.style.cssText = `
    background: rgba(20, 30, 40, 0.95);
    backdrop-filter: blur(12px);
    border-left: 4px solid ${color.border};
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    gap: 14px;
    color: white;
    font-family: 'Segoe UI', sans-serif;
    font-size: 0.95rem;
    transform: translateX(120%);
    animation: slideIn 0.4s ease forwards;
    pointer-events: auto;
    transition: all 0.3s ease;
  `;

  // ===== ICON =====
  // Font Awesome icon corresponding to toast type
  const icon = document.createElement('i');
  icon.className = `fa-solid ${color.icon}`;
  icon.style.cssText = `
    font-size: 1.4rem;
    color: ${color.border};
    flex-shrink: 0;
  `;

  // ===== MESSAGE TEXT =====
  const text = document.createElement('span');
  text.textContent = message;
  text.style.cssText = `
    flex: 1;
    line-height: 1.4;
    word-break: break-word;
  `;

  // ===== CLOSE BUTTON =====
  // '×' symbol to manually dismiss the toast
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: rgba(255,255,255,0.5);
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0 4px;
    transition: 0.2s;
    pointer-events: auto;
  `;
  // Hover effect: close button turns white
  closeBtn.onmouseover = () => closeBtn.style.color = 'white';
  closeBtn.onmouseout = () => closeBtn.style.color = 'rgba(255,255,255,0.5)';
  // Click handler: slide out and remove
  closeBtn.onclick = () => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  };

  // ===== ASSEMBLE TOAST =====
  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(closeBtn);
  container.appendChild(toast);
  document.body.appendChild(container);

  // ===== AUTO-DISMISS TIMER =====
  // Automatically removes toast after specified duration
  const timer = setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
      if (container.children.length === 0) container.remove();
    }, 400);
  }, duration);

  // ===== PAUSE ON HOVER =====
  // Hovering over toast pauses the auto-dismiss timer
  toast.onmouseenter = () => clearTimeout(timer);
  // When mouse leaves, restart the auto-dismiss timer
  toast.onmouseleave = () => {
    setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
        if (container.children.length === 0) container.remove();
      }, 400);
    }, duration);
  };
}

// ============================================
// CSS ANIMATIONS
// ============================================
// Injects slideIn animation keyframes for toast entrance effect
// The toast slides in from the right side (translateX 120% -> 0)
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes slideIn {
    0% { transform: translateX(120%); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);

// ============================================
// SHORTHAND FUNCTIONS
// ============================================
// Convenience functions for each toast type
// Makes code more readable: toastSuccess("Done!") vs showToast("Done!", "success")

// Success toast - green themed, checkmark icon
function toastSuccess(msg) { showToast(msg, 'success'); }

// Error toast - red themed, exclamation circle icon
function toastError(msg) { showToast(msg, 'error'); }

// Warning toast - orange themed, exclamation triangle icon
function toastWarning(msg) { showToast(msg, 'warning'); }

// Info toast - cyan themed, info circle icon (default)
function toastInfo(msg) { showToast(msg, 'info'); }

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================
// Make functions available for use in other scripts
window.showToast = showToast;
window.toastSuccess = toastSuccess;
window.toastError = toastError;
window.toastWarning = toastWarning;
window.toastInfo = toastInfo;

console.log("✅ Toast notification system loaded successfully!");