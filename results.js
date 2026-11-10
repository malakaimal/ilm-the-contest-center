// ILM published-results lookup. Uses the Apps Script JSONP "prefix" parameter.
(function () {
  "use strict";
  const API_URL = "https://script.google.com/macros/s/AKfycbwGvXpTiN2DBwio0NdnSqAgQBdG1SFV3ISkrFet-mO86UUPUXIyfC1AlmrOdxPGaviF/exec";
  const CALLBACK = "ilmResultCallback";
  const form = document.getElementById("resultLookup");
  const message = document.getElementById("resultMessage");
  const output = document.getElementById("resultOutput");
  if (!form || !message || !output) return;

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "form-message " + (type || "");
    message.style.display = "block";
  }

  function addRow(card, label, value) {
    if (value === undefined || value === null || String(value).trim() === "") return;
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    p.append(strong, document.createTextNode(String(value)));
    card.appendChild(p);
  }

  function requestResult(applicationId) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      let finished = false;
      const timeout = window.setTimeout(function () {
        finish(new Error("The results service did not respond. Check the Apps Script deployment."));
      }, 20000);

      function finish(error, data) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        delete window[CALLBACK];
        script.remove();
        if (error) reject(error);
        else resolve(data);
      }

      window[CALLBACK] = function (data) { finish(null, data); };
      script.onerror = function () {
        finish(new Error("Could not load the results service. Confirm the latest Apps Script deployment URL and access setting."));
      };
      const url = new URL(API_URL);
      url.searchParams.set("applicationId", applicationId);
      url.searchParams.set("prefix", CALLBACK);
      url.searchParams.set("_", String(Date.now()));
      script.src = url.toString();
      document.head.appendChild(script);
    });
  }

  function renderResult(result) {
    const card = document.createElement("article");
    card.className = "card";
    const title = document.createElement("h3");
    title.textContent = result.Programme || "ILM Examination Result";
    card.appendChild(title);
    addRow(card, "Student", result["Student Name"] || result["Student Full Name"]);
    addRow(card, "Class", result.Class || result["Current Class"]);
    addRow(card, "Programme", result.Programme);
    addRow(card, "Total Marks", result["Total Marks"]);
    addRow(card, "Obtained Marks", result["Obtained Marks"]);
    addRow(card, "Percentage", result.Percentage);
    addRow(card, "Grade", result.Grade);
    addRow(card, "Position", result.Position);
    addRow(card, "Result", result["Result Status"] || result.Remarks);

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "btn btn-primary";
    downloadButton.textContent = "Download Result PDF";
    downloadButton.style.marginTop = "18px";
    downloadButton.addEventListener("click", function () {
      downloadResultPDF(result);
    });
    card.appendChild(downloadButton);
    output.appendChild(card);
  }

  function downloadResultPDF(result) {
    const JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) {
      showMessage("PDF generator did not load. Refresh the page and try again.", "error");
      return;
    }

    const doc = new JsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const studentName = result["Student Name"] || result["Student Full Name"] || "Student";
    const applicationId = document.getElementById("applicationId").value.trim().toUpperCase();

    doc.setFillColor(8, 39, 68);
    doc.rect(0, 0, pageWidth, 42, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ILM THE CONTEST CENTER", 16, 18);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL STUDENT RESULT", 16, 29);
    doc.setTextColor(35, 48, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Examination Result", 16, 57);

    const rows = [
      ["Student Name", studentName],
      ["Application ID", applicationId],
      ["Class", result.Class || result["Current Class"] || ""],
      ["Programme", result.Programme || ""],
      ["Total Marks", result["Total Marks"] || ""],
      ["Obtained Marks", result["Obtained Marks"] || ""],
      ["Percentage", result.Percentage || ""],
      ["Grade", result.Grade || ""],
      ["Position", result.Position || ""],
      ["Result", result["Result Status"] || result.Remarks || ""]
    ];

    let y = 70;
    rows.forEach(function (row, index) {
      if (row[1] === undefined || row[1] === null || String(row[1]).trim() === "") return;
      if (index % 2 === 0) {
        doc.setFillColor(242, 247, 250);
        doc.rect(14, y - 6, pageWidth - 28, 12, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(8, 39, 68);
      doc.setFontSize(10);
      doc.text(String(row[0]), 19, y + 1);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(45, 57, 70);
      const valueLines = doc.splitTextToSize(String(row[1]), pageWidth - 100);
      doc.text(valueLines, 85, y + 1);
      y += Math.max(12, valueLines.length * 5 + 4);
    });

    doc.setDrawColor(210, 173, 88);
    doc.line(16, y + 8, pageWidth - 16, y + 8);
    doc.setFontSize(9);
    doc.setTextColor(100, 112, 126);
    doc.text("This document reflects the result published by ILM The Contest Center.", 16, y + 17);
    doc.text("Generated: " + new Date().toLocaleString(), 16, y + 23);
    doc.save("ILM-Result-" + applicationId.replace(/[^A-Z0-9_-]/g, "") + ".pdf");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    output.replaceChildren();
    const input = document.getElementById("applicationId");
    const button = document.getElementById("resultButton");
    const applicationId = input.value.trim().toUpperCase();
    if (!applicationId) {
      showMessage("Please enter your Application ID.", "error");
      return;
    }
    button.disabled = true;
    showMessage("Searching published results...");
    try {
      const response = await requestResult(applicationId);
      if (!response || response.success !== true) {
        throw new Error((response && response.message) || "The results service returned an error.");
      }
      const records = Array.isArray(response.results) ? response.results : [];
      if (!records.length) {
        showMessage("No published result was found. Check your Application ID or contact ILM.", "");
      } else {
        records.forEach(renderResult);
        showMessage("Official published result found.", "success");
      }
    } catch (error) {
      showMessage(error.message || "Result lookup failed.", "error");
    } finally {
      button.disabled = false;
    }
  });
})();
