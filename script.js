const fileInput = document.getElementById("fileInput");
const result = document.getElementById("result");

fileInput.addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  let name = file.name;
  if (name.length > 25) {
    const ext = name.substring(name.lastIndexOf('.'));
    const base = name.substring(0, name.lastIndexOf('.'));
    name = base.substring(0, 15) + "..." + base.substring(base.length - 4) + ext;
  }
  document.getElementById("fileName").textContent = name;
  result.innerHTML = "";
});

document.getElementById("convertBtn").addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return alert("Please select a file first.");
  
  result.innerHTML = `
    <div style="width:100%; background:#333; border-radius:10px; overflow:hidden;">
      <div id="progressBar" style="width:0%; height:20px; background:#28a745; transition: width 0.3s;"></div>
    </div>
    <p id="progressText">0%</p>`;

  let progress = 0;
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progressText");
  const timer = setInterval(() => {
    if (progress < 95) { progress += 5; bar.style.width = progress + "%"; text.textContent = progress + "%"; }
  }, 300);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", document.getElementById("formatSelect").value);

  try {
    const res = await fetch("/api/convert", { method: "POST", body: formData });
    const data = await res.json();
    clearInterval(timer);
    bar.style.width = "100%";
    text.textContent = "100%";
    if (data.url) result.innerHTML = `<p>✅ Success!</p><a href="${data.url}" class="download-btn">Download</a>`;
    else result.textContent = "❌ Conversion failed.";
  } catch (err) { clearInterval(timer); result.textContent = "❌ Server error."; }
});