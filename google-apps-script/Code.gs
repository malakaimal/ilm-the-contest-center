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
  "Payment Screen Shot","Password","Payment Status","Application Status","Admin Notes"
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
      let screenshotUrl = "";
      if (data.screenshot && data.screenshot.base64) {
        screenshotUrl = saveScreenshot_(data.screenshot, id);
      }
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
        "Payment Screen Shot": screenshotUrl,
        "Password": "",
        "Payment Status": "Pending Verification",
        "Application Status": "Under Review",
        "Admin Notes": ""
      };
      const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0];
      const row = headers.map(function(h) { return values[String(h).trim()] !== undefined ? values[String(h).trim()] : ""; });
      sheet.appendRow(row);
      return json_({success:true, applicationId:id});
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({success:false, error:String(err.message || err)});
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || "");
  if (!/^[$A-Z_][0-9A-Z_$\.]{0,80}$/i.test(callback)) {
    return ContentService.createTextOutput("Invalid callback").setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    const applicationId = clean_(params.applicationId || "",50).toUpperCase();
    if (!applicationId) return jsonp_(callback,{success:false,message:"Enter your Application ID."});
    const ss = SpreadsheetApp.openById(ILM_SPREADSHEET_ID);
    const sheet = ss.getSheetByName("Student Results");
    if (!sheet || sheet.getLastRow() < 2) return jsonp_(callback,{success:true,results:[]});
    const values = sheet.getDataRange().getDisplayValues();
    const headers = values[0].map(function(h){return String(h).trim();});
    const idCol = headers.indexOf("Application ID");
    const publishedCol = headers.indexOf("Published");
    if (idCol < 0 || publishedCol < 0) throw new Error("Results sheet headers are missing.");
    const results = [];
    for (let i=1;i<values.length;i++) {
      const row = values[i];
      if (String(row[idCol]).trim().toUpperCase() !== applicationId) continue;
      if (!/^(yes|true|published)$/i.test(String(row[publishedCol]).trim())) continue;
      const item = {};
      headers.forEach(function(h,j){ if (h && h !== "Published") item[h] = row[j]; });
      results.push(item);
    }
    return jsonp_(callback,{success:true,results:results});
  } catch (err) {
    return jsonp_(callback,{success:false,message:"Result search is temporarily unavailable."});
  }
}

function getRegistrationSheet_(ss) {
  const sheets = ss.getSheets();
  for (let i=0;i<sheets.length;i++) {
    if (sheets[i].getLastColumn() < 1) continue;
    const h = sheets[i].getRange(1,1,1,sheets[i].getLastColumn()).getDisplayValues()[0].map(function(x){return String(x).trim();});
    if (h.indexOf("Application ID") >= 0 && h.indexOf("Student Full Name") >= 0) return sheets[i];
  }
  const sheet = ss.getSheetByName("Student Registrations") || ss.insertSheet("Student Registrations");
  if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,REGISTRATION_HEADERS.length).setValues([REGISTRATION_HEADERS]);
  return sheet;
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

