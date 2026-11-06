/**
 * ILM The Contest Center
 * Google Sheets + Drive backend for student admissions and published results.
 *
 * IMPORTANT:
 * 1. Set this script's deployment to Web app, Execute as: Me.
 * 2. Access: Anyone (the public website needs to submit and look up published results).
 * 3. Keep passwords out of this spreadsheet. Use Supabase Auth for student accounts.
 */
const ILM_SPREADSHEET_ID = "1l19BknEPDSQmxzUYsz9k0WRWZ486FwdAutLSSxKgqPQ";
const REGISTRATION_HEADERS = [
  "Application ID","Application Date","Student Full Name","Father / Guardian Name",
  "Date of Birth","Email","Contact Phone","Tehsil / Area","School Name","Current Class",
  "Programme","Attempted Online Test Before","Payment Reference / Trx ID","Payment Date",
  "Payment Screenshot Link","Payment Screen Shot","Payment Screenshot (Google Drive)","Password","Payment Status","Application Status","Admin Notes"
];
const RESULT_HEADERS = [
  "Application ID","Student Name","Class","Programme","Total Marks","Obtained Marks",
  "Percentage","Position","Result Status","Published"
];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const required = ["fullName","fatherName","dateOfBirth","email","phone","area","school","grade","program","previousTest"];
    required.forEach(function(key) {
      if (!String(data[key] || "").trim()) throw new Error("Missing required field: " + key);
    });
    if (String(data.fullName).length > 120 || String(data.email).length > 180) throw new Error("A field is too long.");
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const ss = SpreadsheetApp.openById(ILM_SPREADSHEET_ID);
      const sheet = getRegistrationSheet_(ss);
      const id = nextApplicationId_(sheet);
      if (!data.screenshot || !data.screenshot.base64) throw new Error("Payment screenshot was not received by the server.");
      const screenshotUrl = saveScreenshot_(data.screenshot, id);
      const values = {
        "Application ID": id,
        "Application Date": new Date(),
        "Student Full Name": clean_(data.fullName,120),
        "Father / Guardian Name": clean_(data.fatherName,120),
        "Date of Birth": clean_(data.dateOfBirth,20),
        "Email": clean_(data.email,180),
        "Contact Phone": clean_(data.phone,30),
        "Tehsil / Area": clean_(data.area,100),
        "School Name": clean_(data.school,180),
        "Current Class": clean_(data.grade,30),
        "Programme": clean_(data.program,100),
        "Attempted Online Test Before": clean_(data.previousTest,10),
        "Payment Reference / Trx ID": clean_(data.paymentReference,100),
        "Payment Date": clean_(data.paymentDate,20),
        "Payment Screenshot Link": screenshotUrl,
        "Payment Screen Shot": screenshotUrl,
        "Payment Screenshot (Google Drive)": screenshotUrl,
        "Password": "",
        "Payment Status": "Pending Verification",
        "Application Status": "Under Review",
        "Admin Notes": ""
      };
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      const row = headers.map(function(h) { return values[String(h).trim()] !== undefined ? values[String(h).trim()] : ""; });
      sheet.appendRow(row);
      let emailSent = false;
      try {
        sendAdmissionConfirmationEmail_(values);
        emailSent = true;
      } catch (emailError) {
        // Keep the saved admission even if the email provider rejects the message.
        console.error("Admission saved, but confirmation email failed: " + String(emailError.message || emailError));
      }
      return json_({success:true, applicationId:id, emailSent:emailSent});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({success:false, error:String(err.message || err)});
  }
}


/**
 * Send the applicant a confirmation after their admission row is saved.
 * This is called by doPost because the ILM website submits through fetch(),
 * not through a Google Forms spreadsheet submission event.
 */
function sendAdmissionConfirmationEmail_(values) {
  const recipient = clean_(values["Email"], 180);
  if (!recipient || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient)) {
    throw new Error("A valid student email address is required to send the confirmation.");
  }

  const studentName = clean_(values["Student Full Name"], 120);
  const applicationId = clean_(values["Application ID"], 50);
  const programme = clean_(values["Programme"], 100);
  const grade = clean_(values["Current Class"], 30);
  const subject = "ILM The Contest Center | Admission Received | " + applicationId;
  const body = [
    "Dear " + studentName + ",",
    "",
    "Thank you for applying to ILM The Contest Center.",
    "Your admission application has been received and is currently under review.",
    "",
    "Application ID: " + applicationId,
    "Programme: " + programme,
    "Class: " + grade,
    "Application Status: Under Review",
    "",
    "Please keep your Application ID for future communication. Payment and application details will be reviewed by the ILM team.",
    "",
    "Regards,",
    "Admissions Team",
    "ILM The Contest Center",
    "ilmthecontestcenter@gmail.com"
  ].join("\\n");

  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#24324a;line-height:1.6">',
    '<div style="background:#102b55;padding:22px 26px;color:#fff">',
    '<div style="font-size:20px;font-weight:700">ILM The Contest Center</div>',
    '<div style="color:#f2c65d">Admission Confirmation</div></div>',
    '<div style="padding:24px;border:1px solid #e5eaf1">',
    '<p>Dear ' + escapeHtml_(studentName) + ',</p>',
    '<p>Thank you for applying to ILM The Contest Center. Your admission application has been received and is currently under review.</p>',
    '<table style="border-collapse:collapse;width:100%;margin:18px 0">',
    '<tr><td style="padding:9px;border:1px solid #e5eaf1"><b>Application ID</b></td><td style="padding:9px;border:1px solid #e5eaf1">' + escapeHtml_(applicationId) + '</td></tr>',
    '<tr><td style="padding:9px;border:1px solid #e5eaf1"><b>Programme</b></td><td style="padding:9px;border:1px solid #e5eaf1">' + escapeHtml_(programme) + '</td></tr>',
    '<tr><td style="padding:9px;border:1px solid #e5eaf1"><b>Class</b></td><td style="padding:9px;border:1px solid #e5eaf1">' + escapeHtml_(grade) + '</td></tr>',
    '<tr><td style="padding:9px;border:1px solid #e5eaf1"><b>Status</b></td><td style="padding:9px;border:1px solid #e5eaf1">Under Review</td></tr>',
    '</table>',
    '<p>Please keep your Application ID for future communication. Payment and application details will be reviewed by the ILM team.</p>',
    '<p>Regards,<br><b>Admissions Team</b><br>ILM The Contest Center<br>ilmthecontestcenter@gmail.com</p>',
    '</div></div>'
  ].join("");

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    htmlBody: html,
    name: "ILM The Contest Center",
    replyTo: "ilmthecontestcenter@gmail.com"
  });
}

function escapeHtml_(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  // Google Apps Script's documented JSONP convention is "prefix".
  // Accept "callback" too, for compatibility with older website versions.
  const callback = String(params.prefix || params.callback || "").trim();

  if (params.action === "health") {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      service: "ILM Admissions and Results API",
      version: "2026-11-05"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const applicationId = clean_(params.applicationId || "", 50).toUpperCase();
  if (!applicationId) {
    return outputResponse_({success:false,message:"Enter your Application ID."}, callback);
  }

  try {
    const ss = SpreadsheetApp.openById(ILM_SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Student Results");
    if (!sheet || sheet.getLastRow() < 2) {
      return outputResponse_({success:true,results:[]}, callback);
    }

    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0].map(function(h) { return String(h).trim(); });
    const idCol = headers.indexOf("Application ID");
    const publishedCol = headers.indexOf("Published");
    if (idCol < 0 || publishedCol < 0) {
      throw new Error("Student Results must contain Application ID and Published columns.");
    }

    const results = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[idCol]).trim().toUpperCase() !== applicationId) continue;
      if (!/^(yes|true|published)$/i.test(String(row[publishedCol]).trim())) continue;
      const item = {};
      headers.forEach(function(header, j) {
        if (header && header !== "Published") item[header] = row[j];
      });
      results.push(item);
    }
    return outputResponse_({success:true,results:results}, callback);
  } catch (err) {
    return outputResponse_({success:false,message:String(err.message || err)}, callback);
  }
}

function outputResponse_(data, callback) {
  // Only allow a simple JavaScript function name for JSONP.
  // Without a valid prefix, return ordinary JSON instead of "Invalid callback".
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) {
    return ContentService.createTextOutput(
      callback + "(" + JSON.stringify(data).replace(/</g, "\\u003c") + ");"
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRegistrationSheet_(ss) {
  // Keep all existing registrations untouched. New admissions go to a fresh tab.
  const sheetName = "New Student Registrations";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,REGISTRATION_HEADERS.length).setValues([REGISTRATION_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureHeader_(sheet, headerName) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(function(h) { return String(h).trim(); });
  let index = headers.indexOf(headerName);
  if (index < 0) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(headerName);
  }
  return index + 1;
}

function nextApplicationId_(sheet) {
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy");
  const key = "ILM_APPLICATION_COUNTER_" + year;
  const props = PropertiesService.getScriptProperties();

  // Start from the saved counter, but also inspect existing IDs so older
  // registrations are not overwritten if the script property is missing.
  let highest = Number(props.getProperty(key) || 0);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(function(h) { return String(h).trim(); });
  const idColumn = headers.indexOf("Application ID") + 1;

  if (idColumn > 0 && sheet.getLastRow() >= 2) {
    const ids = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1).getDisplayValues();
    const pattern = new RegExp("^ILM" + year + "(\\d{3,})$");
    ids.forEach(function(item) {
      const match = String(item[0]).trim().match(pattern);
      if (match) highest = Math.max(highest, Number(match[1]));
    });
  }

  const next = highest + 1;
  props.setProperty(key, String(next));
  return "ILM" + year + String(next).padStart(3, "0");
}

function saveScreenshot_(file, applicationId) {
  const mime = String(file.mimeType || "");
  const allowed = ["image/jpeg","image/png","image/webp"];
  if (allowed.indexOf(mime) < 0) throw new Error("Unsupported payment screenshot type.");
  const bytes = Utilities.base64Decode(String(file.base64));
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Payment screenshot exceeds 5 MB.");
  const folders = DriveApp.getFoldersByName("ILM Payment Screenshots");
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("ILM Payment Screenshots");
  const safeName = String(file.name || "payment-proof").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,80);
  const blob = Utilities.newBlob(bytes,mime,applicationId + "_" + safeName);
  const created = folder.createFile(blob);
  return created.getUrl();
}

function clean_(value,max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g,"").trim().slice(0,max);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function jsonp_(callback,obj) {
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(obj).replace(/</g,"\\u003c") + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/** Run once from the Apps Script editor to create the results tab without touching existing tabs. */
function setupILMResultsSheet() {
  const ss = SpreadsheetApp.openById(ILM_SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Student Results");
  if (!sheet) sheet = ss.insertSheet("Student Results");
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,RESULT_HEADERS.length).setValues([RESULT_HEADERS]);
}

/**
 * Run this function manually once from the Apps Script editor.
 * It creates the separate admissions tab without changing existing student records.
 */
function setupNewRegistrationsSheet() {
  const ss = SpreadsheetApp.openById(ILM_SPREADSHEET_ID);
  const sheetName = "New Student Registrations";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, REGISTRATION_HEADERS.length).setValues([REGISTRATION_HEADERS]);
    sheet.setFrozenRows(1);
  }
  Logger.log("Ready: " + sheetName + " in spreadsheet " + ss.getUrl());
}
