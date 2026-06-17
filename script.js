document.getElementById("fileInput").addEventListener("change", function() {
  const name = this.files[0]?.name || "No file chosen";
  document.getElementById("fileName").textContent = name;
});

document.getElementById("convertBtn").addEventListener("click", async () => {
  const file = document.getElementById("fileInput").files[0];
  const format = document.getElementById("formatSelect").value;
  const result = document.getElementById("result");

  if (!file) return alert("Please select a file first.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", format);

  result.innerHTML = "⏳ Converting... please wait.";

  try {
    const response = await fetch("/api/convert", { method: "POST", body: formData });
    const data = await response.json();

    if (data.url) {
      result.innerHTML = `
        <div style="margin-top: 15px;">
            <p>✅ Success!</p>
            <a href="${data.url}" class="download-btn">Download</a>
        </div>`;
    } else {
      result.textContent = "❌ Conversion failed.";
    }
  } catch (err) {
    result.textContent = "❌ Error connecting to server.";
  }
});