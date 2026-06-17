const fileInput = document.getElementById("fileInput");
const fileNameDisplay = document.getElementById("fileName");
const result = document.getElementById("result");

fileInput.addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  // Truncation logic: 15 chars + ... + last 4 chars before extension
  let name = file.name;
  if (name.length > 25) {
    const ext = name.substring(name.lastIndexOf('.'));
    const base = name.substring(0, name.lastIndexOf('.'));
    name = base.substring(0, 15) + "..." + base.substring(base.length - 4) + ext;
  }
  fileNameDisplay.textContent = name;
  result.innerHTML = ""; // Hide download button on new selection
});

document.getElementById("convertBtn").addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Select file first.");
  
  result.innerHTML = `<progress style="width:100%"></progress><p>Converting...</p>`;
  
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", document.getElementById("formatSelect").value);

  const res = await fetch("/api/convert", { method: "POST", body: formData });
  const data = await res.json();
  
  if (data.url) {
    result.innerHTML = `<p>✅ Success!</p><a href="${data.url}" class="download-btn">Download</a>`;
  }
});