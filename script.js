document.getElementById("convertBtn").addEventListener("click", function() {
  const file = document.getElementById("fileInput").files[0];
  const format = document.getElementById("formatSelect").value;

  if (!file) {
    alert("Please select a file first!");
    return;
  }

  document.getElementById("result").innerText =
    `Converting ${file.name} to ${format.toUpperCase()}... (demo mode)`;
});
