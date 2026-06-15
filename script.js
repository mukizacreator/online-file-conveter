document.getElementById('convertBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput');
  const format = document.getElementById('formatSelect').value;
  const result = document.getElementById('result');

  if (!fileInput.files.length) {
    result.textContent = '⚠️ Please choose a file first.';
    result.style.color = '#ff9800';
    return;
  }

  const fileName = fileInput.files[0].name;
  result.textContent = `⏳ Converting ${fileName} to ${format.toUpperCase()}...`;
  result.style.color = '#00bcd4';

  // Simulate conversion delay
  setTimeout(() => {
    result.innerHTML = `✅ Successfully converted ${fileName} to ${format.toUpperCase()}!<br><br>
      <a href="#" id="downloadBtn" class="download-btn">Download Converted File</a>`;
    result.style.color = '#4caf50';

    // Style the download button dynamically
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.style.display = 'inline-block';
    downloadBtn.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
    downloadBtn.style.color = '#fff';
    downloadBtn.style.padding = '12px 28px';
    downloadBtn.style.borderRadius = '8px';
    downloadBtn.style.textDecoration = 'none';
    downloadBtn.style.fontWeight = '600';
    downloadBtn.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
    downloadBtn.style.transition = 'all 0.3s ease';
    downloadBtn.onmouseover = () => {
      downloadBtn.style.background = 'linear-gradient(135deg, #43a047, #1b5e20)';
      downloadBtn.style.transform = 'scale(1.05)';
    };
    downloadBtn.onmouseout = () => {
      downloadBtn.style.background = 'linear-gradient(135deg, #4caf50, #2e7d32)';
      downloadBtn.style.transform = 'scale(1)';
    };
  }, 2000);
});
