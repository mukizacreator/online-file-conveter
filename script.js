document.getElementById("fileInput").addEventListener("change", function() {
  const file = this.files[0];
  if (!file) {
    document.getElementById("fileName").textContent = "No file chosen";
    return;
  }
  const name = file.name;
  if (name.length > 25) {
    const ext = name.substring(name.lastIndexOf('.'));
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    document.getElementById("fileName").textContent = 
      nameWithoutExt.substring(0, 15) + "..." + 
      nameWithoutExt.substring(nameWithoutExt.length - 4) + ext;
  } else {
    document.getElementById("fileName").textContent = name;
  }
});

document.getElementById("convertBtn").addEventListener("click", async () => {
  const file = document.getElementById("fileInput").files[0];
  const format = document.getElementById("formatSelect").value;
  const result = document.getElementById("result");

  if (!file) return alert("Please select a file first.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", format);

  result.textContent = "⏳ Uploading and converting...";

  try {
    const response = await fetch("/api/convert", { method: "POST", body: formData });
    const data = await response.json();

    if (data.url) {
      result.innerHTML = `✅ Success!<br><a href="${data.url}" target="_blank" style="color:#00bcd4">Download Converted File</a>`;
    } else {
      result.textContent = "❌ Conversion failed.";
    }
  } catch (err) {
    result.textContent = "❌ Error connecting to server.";
    console.error(err);
  }
});