/**
 * ILM Exam Portal - separate Google Apps Script backend.
 * Run setupExamDatabase() once in a NEW Apps Script project.
 * Deploy as Web App: Execute as Me; access: Anyone.
 * Keep this script project separate from the existing admissions API.
 *
 * IMPORTANT: This first release provides assignment lookup and answer submission.
 * It does not provide AI proctoring or video recording.
 */
const EXAM_SHEETS = {
  sessions: ["Test Sessions", ["Test ID","Test Name","Class","Start At","End At","Duration Minutes","Status","Instructions"]],
  access: ["Student Test Access", ["Registration ID","Test ID","Access Code","Assigned At","Status"]],
  questions: ["Test Questions", ["Test ID","Question ID","Question","Option A","Option B","Option C","Option D","Correct Option","Marks"]],
  responses: ["Student Responses", ["Submitted At","Registration ID","Test ID","Question ID","Selected Option"]],
  results: ["Test Results", ["Submitted At","Registration ID","Test ID","Marks Obtained","Total Marks","Percentage","Review Status"]],
  events: ["Monitoring Events", ["Event At","Registration ID","Test ID","Event Type","Details","Consent Recorded"]],
  recordings: ["Recording Records", ["Created At","Registration ID","Test ID","Drive File ID","Access Status","Retention Until"]]
};

function setupExamDatabase() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("ILM_EXAM_SPREADSHEET_ID");
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create("ILM Online Examination Database");
    props.setProperty("ILM_EXAM_SPREADSHEET_ID", ss.getId());
  }
  Object.keys(EXAM_SHEETS).forEach(key => {
    const def = EXAM_SHEETS[key];
    let sh = ss.getSheetByName(def[0]);
    if (!sh) sh = ss.insertSheet(def[0]);
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,def[1].length).setValues([def[1]]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,def[1].length).setFontWeight("bold").setBackground("#123f78").setFontColor("#ffffff");
      sh.autoResizeColumns(1, def[1].length);
    }
  });
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) ss.deleteSheet(defaultSheet);
  const result = {success:true, spreadsheetUrl:ss.getUrl(), spreadsheetId:ss.getId(), message:"New ILM exam database created. Existing ILM spreadsheets were not changed."};
  Logger.log(JSON.stringify(result));
  return result;
}

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "health");
  if (action === "health") return json_({success:true, service:"ILM Exam Portal API", version:"1.0"});
  if (action === "lookup") return json_(lookupAssignedTest_(e.parameter.registrationId, e.parameter.accessCode));
  if (action === "questions") return json_(getQuestions_(e.parameter.testId, e.parameter.registrationId, e.parameter.accessCode));
  return json_({success:false,error:"Unknown action"});
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.action === "submit") return json_(submitAnswers_(body));
    if (body.action === "event") return json_(logEvent_(body));
    return json_({success:false,error:"Unknown action"});
  } catch (err) {
    return json_({success:false,error:String(err.message || err)});
  }
}

function examDb_() {
  const id = PropertiesService.getScriptProperties().getProperty("ILM_EXAM_SPREADSHEET_ID");
  if (!id) throw new Error("Run setupExamDatabase() first.");
  return SpreadsheetApp.openById(id);
}
function rows_(name) {
  const sh = examDb_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  return values.filter(r => r.some(v => v !== "")).map(r => {
    const o = {}; headers.forEach((h,i) => o[h] = r[i]); return o;
  });
}
function lookupAssignedTest_(registrationId, accessCode) {
  const reg = String(registrationId || "").trim();
  const code = String(accessCode || "").trim();
  if (!reg || !code) return {success:false,error:"Registration ID and access code are required."};
  const assignment = rows_("Student Test Access").find(r =>
    String(r["Registration ID"]).trim() === reg &&
    String(r["Access Code"]).trim() === code &&
    String(r.Status).toLowerCase() === "assigned"
  );
  if (!assignment) return {success:false,error:"No active test assignment was found. Check your details or contact ILM."};
  const test = rows_("Test Sessions").find(r => String(r["Test ID"]) === String(assignment["Test ID"]) && String(r.Status).toLowerCase() === "published");
  if (!test) return {success:false,error:"Your assigned test is not currently published."};
  return {success:true,test:{id:String(test["Test ID"]),name:String(test["Test Name"]),className:String(test.Class),durationMinutes:Number(test["Duration Minutes"]),instructions:String(test.Instructions || "")}};
}
function getQuestions_(testId, registrationId, accessCode) {
  const id = String(testId || "").trim();
  const assignment = lookupAssignedTest_(registrationId, accessCode);
  if (!assignment.success || assignment.test.id !== id) return {success:false,error:"Test assignment could not be verified."};
  const qs = rows_("Test Questions").filter(r => String(r["Test ID"]) === id).map(r => ({
    id:String(r["Question ID"]), question:String(r.Question),
    options:[String(r["Option A"]),String(r["Option B"]),String(r["Option C"]),String(r["Option D"])],
    marks:Number(r.Marks) || 1
  }));
  if (!qs.length) return {success:false,error:"No questions are available for this test."};
  return {success:true,questions:qs};
}
function submitAnswers_(body) {
  const reg=String(body.registrationId||"").trim(), code=String(body.accessCode||"").trim(), testId=String(body.testId||"").trim();
  const check=lookupAssignedTest_(reg,code);
  if (!check.success || check.test.id !== testId) return {success:false,error:"Test assignment could not be verified."};
  const answers=Array.isArray(body.answers)?body.answers:[];
  if (!answers.length) return {success:false,error:"No answers were submitted."};
  const ss=examDb_(), sh=ss.getSheetByName("Student Responses");
  const prior = rows_("Test Results").some(r => String(r["Registration ID"]) === reg && String(r["Test ID"]) === testId);
  if (prior) return {success:false,error:"A submission for this test has already been received."};
  const now=new Date();
  const safe=answers.map(a=>[now,reg,testId,String(a.questionId||""),String(a.option||"")]);
  sh.getRange(sh.getLastRow()+1,1,safe.length,safe[0].length).setValues(safe);
  const qs=rows_("Test Questions").filter(r=>String(r["Test ID"])===testId);
  let score=0,total=0;
  qs.forEach(q=>{const marks=Number(q.Marks)||1;total+=marks;const ans=answers.find(a=>String(a.questionId)===String(q["Question ID"]));if(ans&&String(ans.option).toUpperCase()===String(q["Correct Option"]).toUpperCase())score+=marks;});
  const pct=total?Math.round(score/total*10000)/100:0;
  ss.getSheetByName("Test Results").appendRow([now,reg,testId,score,total,pct,"Pending admin review"]);
  return {success:true,marks:score,totalMarks:total,percentage:pct,message:"Your answers have been submitted."};
}
function logEvent_(body) {
  const check=lookupAssignedTest_(body.registrationId,body.accessCode);
  if(!check.success || check.test.id!==String(body.testId)) return {success:false,error:"Assignment not verified."};
  examDb_().getSheetByName("Monitoring Events").appendRow([new Date(),String(body.registrationId),String(body.testId),String(body.eventType||"event"),String(body.details||""),body.consent===true?"Yes":"No"]);
  return {success:true};
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
