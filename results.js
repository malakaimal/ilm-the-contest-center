// ILM published-results lookup. Uses the Apps Script JSONP "prefix" parameter.
(function () {
  "use strict";
  const API_URL = "https://script.google.com/macros/s/AKfycbx-z39zRlcykXuWjbjVlLMtv-2rNpxrPY_t4EOThv6KoUDLr3tWnIyvzR_F3OV_M6Md/exec";
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
    output.appendChild(card);
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
