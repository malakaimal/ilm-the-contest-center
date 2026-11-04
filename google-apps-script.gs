// ILM The Contest Center: Google Sheets admissions + Google Drive payment screenshots.
// Deploy this project as a Web app: Execute as ME; access: Anyone.
// The Drive folder remains private unless its owner changes sharing settings.
const SPREADSHEET_ID = "1l19BknEPDSQmxzUYsz9k0WRWZ486FwdAutLSSxKgqPQ";
const ADMISSIONS_TAB = "Admissions";
const SCREENSHOT_FOLDER = "ILM Payment Screenshots";
const HEADERS = [
 "Application ID","Application Date","Student Full Name","Father / Guardian Name",
 "Date of Birth","Email","Contact Phone","Tehsil / Area","School Name","Current Class",
 "Programme","Attempted Online Test Before","Payment Reference / Trx ID","Payment Date",
 "Payment Status","Application Status","Payment Screenshot (Google Drive)"
];

function doGet() {
 return ContentService.createTextOutput("ILM Admissions endpoint is ready.")
  .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
 try {
  if (!e || !e.postData || !e.postData.contents) throw new Error("No form data received.");
  const data = JSON.parse(e.postData.contents);
  const required = ["fullName","fatherName","dateOfBirth","email","phone","area","school","grade","program","previousTest"];
  required.forEach(k => { if (!String(data[k] || "").trim()) throw new Error("Missing required field: " + k); });
  if (!data.screenshot || !data.screenshot.base64) throw new Error("Payment screenshot is required.");
  const mime = String(data.screenshot.mimeType || "");
  const allowed = ["image/jpeg","image/png","image/webp"];
  if (allowed.indexOf(mime) === -1) throw new Error("Only JPG, PNG and WebP screenshots are accepted.");
  const bytes = Utilities.base64Decode(data.screenshot.base64);
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Screenshot exceeds 5 MB.");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   let sheet = ss.getSheetByName(ADMISSIONS_TAB);
   if (!sheet) sheet = ss.insertSheet(ADMISSIONS_TAB);
   if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

   const folders = DriveApp.getFoldersByName(SCREENSHOT_FOLDER);
   const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(SCREENSHOT_FOLDER);
   const cleanName = String(data.screenshot.name || "payment-proof").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100);
   const blob = Utilities.newBlob(bytes, mime, new Date().getTime() + "_" + cleanName);
   const image = folder.createFile(blob); // Private by default; do not enable public link sharing.
   const appId = "ILM-" + Utilities.getUuid().slice(0,8).toUpperCase();
   sheet.appendRow([
    appId,new Date(),data.fullName,data.fatherName,data.dateOfBirth,data.email,
    data.phone,data.area,data.school,data.grade,data.program,data.previousTest,
    data.paymentReference || "",data.paymentDate || "","Pending","Pending",image.getUrl()
   ]);
  } finally {
   lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify({success:true}))
   .setMimeType(ContentService.MimeType.JSON);
 } catch (err) {
  return ContentService.createTextOutput(JSON.stringify({success:false,message:String(err.message || err)}))
   .setMimeType(ContentService.MimeType.JSON);
 }
}
