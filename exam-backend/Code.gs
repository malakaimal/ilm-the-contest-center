/**
 * ILM Exam API - security-hardened backend foundation.
 * Separate from the Admissions/Results spreadsheet and Apps Script.
 *
 * Required Script Properties (Project Settings > Script properties):
 * ILM_EXAM_SPREADSHEET_ID = existing NEW exam spreadsheet ID
 * SUPABASE_URL = https://YOUR_PROJECT.supabase.co
 * SUPABASE_ANON_KEY = Supabase publishable/anon key (never service-role key)
 *
 * Public Web App endpoints accept POST only for student/admin operations.
 * Admin operations verify the Supabase access token and profiles.role server-side.
 */
const EXAM_SHEETS = {
  sessions: ["Test Sessions", ["Test ID","Test Name","Class","Start At","End At","Duration Minutes","Status","Instructions"]],
  access: ["Student Test Access", ["Registration ID","Test ID","Access Code","Assigned At","Status","Started At","Submitted At"]],
  questions: ["Test Questions", ["Test ID","Question ID","Question","Option A","Option B","Option C","Option D","Correct Option","Marks"]],
  responses: ["Student Responses", ["Submitted At","Registration ID","Test ID","Question ID","Selected Option"]],
  results: ["Test Results", ["Submitted At","Registration ID","Test ID","Marks Obtained","Total Marks","Percentage","Review Status"]],
  events: ["Monitoring Events", ["Event At","Registration ID","Test ID","Event Type","Details","Consent Recorded"]],
  recordings: ["Recording Records", ["Created At","Registration ID","Test ID","Drive File ID","Access Status","Retention Until"]]
};
const MAX_BODY_CHARS = 100000;
const MAX_QUESTIONS = 200;
const ALLOWED_EVENTS = ["camera_check_started","screen_check_started","screen_share_stopped","visibility_hidden","fullscreen_exited","device_check_stopped"];

function setupExamDatabase() {
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty("ILM_EXAM_SPREADSHEET_ID"), ss;
  if(id) ss=SpreadsheetApp.openById(id);
  else { ss=SpreadsheetApp.create("ILM Online Examination Database"); props.setProperty("ILM_EXAM_SPREADSHEET_ID",ss.getId()); }
  Object.keys(EXAM_SHEETS).forEach(k=>{
    const def=EXAM_SHEETS[k]; let sh=ss.getSheetByName(def[0]);
    if(!sh) sh=ss.insertSheet(def[0]);
    if(sh.getLastRow()===0) {
      sh.getRange(1,1,1,def[1].length).setValues([def[1]]);
      sh.setFrozenRows(1); sh.getRange(1,1,1,def[1].length).setFontWeight("bold").setBackground("#123f78").setFontColor("#fff");
    } else if(k==="access") {
      const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
      ["Started At","Submitted At"].forEach(h=>{if(!headers.includes(h)){sh.getRange(1,sh.getLastColumn()+1).setValue(h);}});
    }
  });
  const blank=ss.getSheetByName("Sheet1");
  if(blank && ss.getSheets().length>1 && blank.getLastRow()===0) ss.deleteSheet(blank);
  const result={success:true,spreadsheetId:ss.getId(),spreadsheetUrl:ss.getUrl(),tabs:ss.getSheets().map(s=>s.getName()),message:"Exam database checked and required columns ensured. Existing rows preserved."};
  Logger.log(JSON.stringify(result)); return result;
}

function doGet(e) {
  const action=String(e&&e.parameter&&e.parameter.action||"health");
  if(action==="health") return json_({success:true,service:"ILM Exam API",version:"2.0-secure-foundation",message:"POST is required for all student and admin operations."});
  return json_({success:false,error:"For security, use POST for this operation."});
}

function doPost(e) {
  try {
    const raw=String(e&&e.postData&&e.postData.contents||"");
    if(!raw || raw.length>MAX_BODY_CHARS) throw new Error("Invalid or oversized request.");
    const b=JSON.parse(raw), a=String(b.action||"");
    let out;
    switch(a) {
      case "student_lookup": out=studentLookup_(b); break;
      case "student_start": out=studentStart_(b); break;
      case "student_questions": out=studentQuestions_(b); break;
      case "student_submit": out=studentSubmit_(b); break;
      case "student_event": out=studentEvent_(b); break;
      case "admin_list": out=adminList_(b); break;
      case "admin_create_test": out=adminCreateTest_(b); break;
      case "admin_add_question": out=adminAddQuestion_(b); break;
      case "admin_assign_student": out=adminAssign_(b); break;
      case "admin_publish_test": out=adminPublish_(b); break;
      default: out={success:false,error:"Unknown action."};
    }
    return json_(out);
  } catch(err) { return json_({success:false,error:String(err.message||"Request failed.")}); }
}

function examDb_() {
  const id=PropertiesService.getScriptProperties().getProperty("ILM_EXAM_SPREADSHEET_ID");
  if(!id) throw new Error("Exam database is not configured. Run setupExamDatabase().");
  return SpreadsheetApp.openById(id);
}
function rows_(name) {
  const sh=examDb_().getSheetByName(name); if(!sh||sh.getLastRow()<2) return [];
  const v=sh.getDataRange().getValues(), h=v.shift().map(String);
  return v.filter(r=>r.some(x=>x!=="")).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o;});
}
function headerMap_(sh) {
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String), m={};
  h.forEach((x,i)=>m[x]=i+1); return m;
}
function clean_(v,max) { return String(v==null?"":v).replace(/[\u0000-\u001f]/g," ").trim().slice(0,max||500); }
function date_(v) { const d=v instanceof Date?v:new Date(v); return isNaN(d.getTime())?null:d; }
function now_(){return new Date();}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function fail_(m){return {success:false,error:m};}

function getAssignment_(b) {
  const reg=clean_(b.registrationId,80), code=clean_(b.accessCode,120);
  if(!reg||!code) throw new Error("Registration ID and private access code are required.");
  const matches=rows_("Student Test Access").filter(r=>String(r["Registration ID"]).trim()===reg);
  const row=matches.find(r=>constantTimeEqual_(String(r["Access Code"]),code));
  if(!row) throw new Error("Assignment could not be verified.");
  const status=String(row.Status||"").toLowerCase();
  if(!["assigned","in progress"].includes(status)) throw new Error("This test access is no longer active.");
  const test=rows_("Test Sessions").find(t=>String(t["Test ID"])===String(row["Test ID"]));
  if(!test || String(test.Status).toLowerCase()!=="published") throw new Error("This test is not published.");
  return {reg,code,row,test};
}
function constantTimeEqual_(a,b) {
  if(a.length!==b.length) return false;
  let n=0; for(let i=0;i<a.length;i++) n|=a.charCodeAt(i)^b.charCodeAt(i); return n===0;
}
function checkWindow_(test,startedAt) {
  const now=now_(), start=date_(test["Start At"]), end=date_(test["End At"]);
  if(!start||!end||end<=start) throw new Error("The test schedule is invalid. Contact ILM.");
  if(now<start) throw new Error("This test has not started yet.");
  if(now>end) throw new Error("The test time window has ended.");
  const duration=Number(test["Duration Minutes"]);
  if(!duration||duration<1||duration>360) throw new Error("The test duration is invalid.");
  if(startedAt && now>new Date(startedAt.getTime()+duration*60000)) throw new Error("Your allotted test time has ended.");
  return duration;
}
function findAccessRow_(reg,testId) {
  const sh=examDb_().getSheetByName("Student Test Access"), data=sh.getDataRange().getValues(), h=data[0].map(String);
  const ri=h.indexOf("Registration ID"), ti=h.indexOf("Test ID");
  for(let i=1;i<data.length;i++) if(String(data[i][ri]).trim()===reg&&String(data[i][ti])===testId) return {sheet:sh,row:i+1,headers:headerMap_(sh),values:data[i]};
  throw new Error("Student assignment record was not found.");
}
function studentLookup_(b) {
  try {
    const x=getAssignment_(b), start=date_(x.row["Started At"]);
    checkWindow_(x.test,start);
    return {success:true,test:{id:String(x.test["Test ID"]),name:clean_(x.test["Test Name"],160),className:clean_(x.test.Class,60),durationMinutes:Number(x.test["Duration Minutes"]),instructions:clean_(x.test.Instructions,2000)},status:String(x.row.Status)};
  } catch(e){return fail_(e.message);}
}
function studentStart_(b) {
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const x=getAssignment_(b), access=findAccessRow_(x.reg,String(x.test["Test ID"])), h=access.headers;
    const existing=date_(access.sheet.getRange(access.row,h["Started At"]).getValue());
    checkWindow_(x.test,existing);
    if(!existing) {
      access.sheet.getRange(access.row,h["Started At"]).setValue(now_());
      access.sheet.getRange(access.row,h["Status"]).setValue("In Progress");
    }
    return {success:true,startedAt:(existing||now_()).toISOString(),durationMinutes:Number(x.test["Duration Minutes"])};
  } catch(e){return fail_(e.message);} finally {lock.releaseLock();}
}
function studentQuestions_(b) {
  try {
    const x=getAssignment_(b), access=findAccessRow_(x.reg,String(x.test["Test ID"]));
    const started=date_(access.sheet.getRange(access.row,access.headers["Started At"]).getValue());
    if(String(x.row.Status).toLowerCase()!=="in progress"||!started) throw new Error("Start your assigned test first.");
    checkWindow_(x.test,started);
    const qs=rows_("Test Questions").filter(q=>String(q["Test ID"])===String(x.test["Test ID"]));
    if(!qs.length||qs.length>MAX_QUESTIONS) throw new Error("Question set is empty or exceeds the allowed limit.");
    return {success:true,questions:qs.map(q=>({id:clean_(q["Question ID"],80),question:clean_(q.Question,3000),options:[clean_(q["Option A"],1000),clean_(q["Option B"],1000),clean_(q["Option C"],1000),clean_(q["Option D"],1000)],marks:Number(q.Marks)||1}))};
  } catch(e){return fail_(e.message);}
}
function studentSubmit_(b) {
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const x=getAssignment_(b), testId=String(x.test["Test ID"]), access=findAccessRow_(x.reg,testId), h=access.headers;
    if(String(x.row.Status).toLowerCase()!=="in progress") throw new Error("This test has not been started or has already been submitted.");
    const started=date_(access.sheet.getRange(access.row,h["Started At"]).getValue());
    if(!started) throw new Error("Test start time is missing.");
    checkWindow_(x.test,started);
    const qs=rows_("Test Questions").filter(q=>String(q["Test ID"])===testId);
    const answers=Array.isArray(b.answers)?b.answers:[];
    if(!qs.length||qs.length>MAX_QUESTIONS||answers.length!==qs.length) throw new Error("Answer list does not match the assigned question set.");
    const ids=qs.map(q=>String(q["Question ID"])), seen={};
    answers.forEach(a=>{
      const id=clean_(a.questionId,80), opt=String(a.option||"").toUpperCase();
      if(!ids.includes(id)||seen[id]||!["","A","B","C","D"].includes(opt)) throw new Error("Invalid or duplicate answer detected.");
      seen[id]=true;
    });
    if(ids.some(id=>!seen[id])) throw new Error("Some questions are missing from the submission.");
    const now=now_(), responseSheet=examDb_().getSheetByName("Student Responses");
    const resultSheet=examDb_().getSheetByName("Test Results");
    const already=rows_("Test Results").some(r=>String(r["Registration ID"])===x.reg&&String(r["Test ID"])===testId);
    if(already) throw new Error("A submission has already been recorded.");
    const correct=Object.fromEntries(qs.map(q=>[String(q["Question ID"]),String(q["Correct Option"]).toUpperCase()]));
    let score=0,total=0;
    qs.forEach(q=>{const m=Number(q.Marks)||1; total+=m; const a=answers.find(z=>String(z.questionId)===String(q["Question ID"])); if(a.option&&String(a.option).toUpperCase()===correct[String(q["Question ID"])]) score+=m;});
    const rows=answers.map(a=>[now,x.reg,testId,clean_(a.questionId,80),String(a.option||"").toUpperCase()]);
    responseSheet.getRange(responseSheet.getLastRow()+1,1,rows.length,5).setValues(rows);
    const pct=total?Math.round(score/total*10000)/100:0;
    resultSheet.appendRow([now,x.reg,testId,score,total,pct,"Pending admin review"]);
    access.sheet.getRange(access.row,h["Status"]).setValue("Submitted");
    access.sheet.getRange(access.row,h["Submitted At"]).setValue(now);
    return {success:true,message:"Your answers have been submitted successfully. Your result is pending ILM review."};
  } catch(e){return fail_(e.message);} finally {lock.releaseLock();}
}
function studentEvent_(b) {
  try {
    const x=getAssignment_(b), type=clean_(b.eventType,60);
    if(!ALLOWED_EVENTS.includes(type)) throw new Error("Event type is not permitted.");
    if(b.consent!==true) throw new Error("Monitoring event logging requires explicit consent.");
    const details=clean_(b.details,240);
    examDb_().getSheetByName("Monitoring Events").appendRow([now_(),x.reg,String(x.test["Test ID"]),type,details,"Yes"]);
    return {success:true};
  } catch(e){return fail_(e.message);}
}

/* Supabase user-token verification. The service-role key is never used here. */
function requireAdmin_(b) {
  const token=clean_(b.accessToken,5000);
  if(!token) throw new Error("Administrator sign-in is required.");
  const p=PropertiesService.getScriptProperties(), base=String(p.getProperty("SUPABASE_URL")||"").replace(/\/$/,""), key=p.getProperty("SUPABASE_ANON_KEY");
  if(!base||!key) throw new Error("Supabase verification is not configured in Apps Script Script Properties.");
  const userResp=UrlFetchApp.fetch(base+"/auth/v1/user",{method:"get",headers:{apikey:key,Authorization:"Bearer "+token},muteHttpExceptions:true});
  if(userResp.getResponseCode()!==200) throw new Error("Administrator session is invalid or expired.");
  const user=JSON.parse(userResp.getContentText()), uid=clean_(user.id,80);
  if(!uid) throw new Error("Supabase user identity could not be verified.");
  const profileResp=UrlFetchApp.fetch(base+"/rest/v1/profiles?id=eq."+encodeURIComponent(uid)+"&select=role",{method:"get",headers:{apikey:key,Authorization:"Bearer "+token},muteHttpExceptions:true});
  if(profileResp.getResponseCode()!==200) throw new Error("Administrator role could not be verified.");
  const profiles=JSON.parse(profileResp.getContentText());
  if(!Array.isArray(profiles)||profiles.length!==1||String(profiles[0].role).toLowerCase()!=="admin") throw new Error("This account is not authorised for ILM administration.");
  return user;
}
function adminList_(b) {
  try { requireAdmin_(b);
    return {success:true,sessions:rows_("Test Sessions"),assignments:rows_("Student Test Access").map(r=>({registrationId:r["Registration ID"],testId:r["Test ID"],assignedAt:r["Assigned At"],status:r.Status})),questions:rows_("Test Questions"),results:rows_("Test Results"),events:rows_("Monitoring Events")};
  } catch(e){return fail_(e.message);}
}
function adminCreateTest_(b) {
  try { requireAdmin_(b); const t=b.test||{}, id=clean_(t.id,60), name=clean_(t.name,160), cls=clean_(t.className,60), start=date_(t.startAt), end=date_(t.endAt), duration=Number(t.durationMinutes);
    if(!id||!name||!cls||!start||!end||end<=start||!duration||duration<1||duration>360) throw new Error("Provide valid test ID, name, class, schedule and duration.");
    if(rows_("Test Sessions").some(r=>String(r["Test ID"])===id)) throw new Error("This Test ID already exists.");
    examDb_().getSheetByName("Test Sessions").appendRow([id,name,cls,start,end,duration,"Draft",clean_(t.instructions,2000)]);
    return {success:true,message:"Test created as Draft. It is not visible to students."};
  } catch(e){return fail_(e.message);}
}
function adminAddQuestion_(b) {
  try { requireAdmin_(b); const q=b.question||{}, tid=clean_(q.testId,60), id=clean_(q.id,80), question=clean_(q.question,3000), opts=Array.isArray(q.options)?q.options.map(v=>clean_(v,1000)):[];
    if(!tid||!id||!question||opts.length!==4||opts.some(v=>!v)||!["A","B","C","D"].includes(String(q.correctOption).toUpperCase())) throw new Error("Question, unique ID, four options and correct option are required.");
    if(!rows_("Test Sessions").some(t=>String(t["Test ID"])===tid)) throw new Error("Test ID not found.");
    if(rows_("Test Questions").some(r=>String(r["Test ID"])===tid&&String(r["Question ID"])===id)) throw new Error("Question ID already exists for this test.");
    const marks=Number(q.marks)||1; if(marks<=0||marks>100) throw new Error("Marks must be between 1 and 100.");
    examDb_().getSheetByName("Test Questions").appendRow([tid,id,question,opts[0],opts[1],opts[2],opts[3],String(q.correctOption).toUpperCase(),marks]);
    return {success:true,message:"Question saved."};
  } catch(e){return fail_(e.message);}
}
function adminAssign_(b) {
  try { requireAdmin_(b); const a=b.assignment||{}, reg=clean_(a.registrationId,80), tid=clean_(a.testId,60), code=clean_(a.accessCode,120);
    if(!reg||!tid||code.length<12) throw new Error("Registration ID, valid Test ID and a private access code of at least 12 characters are required.");
    if(!rows_("Test Sessions").some(t=>String(t["Test ID"])===tid)) throw new Error("Test ID not found.");
    if(rows_("Student Test Access").some(r=>String(r["Registration ID"])===reg&&String(r["Test ID"])===tid)) throw new Error("This student is already assigned to this test.");
    examDb_().getSheetByName("Student Test Access").appendRow([reg,tid,code,now_(),"Assigned","",""]);
    return {success:true,message:"Student assignment saved."};
  } catch(e){return fail_(e.message);}
}
function adminPublish_(b) {
  try { requireAdmin_(b); const id=clean_(b.testId,60), status=String(b.status||"").toLowerCase();
    if(!["draft","published","closed"].includes(status)) throw new Error("Status must be Draft, Published or Closed.");
    const sh=examDb_().getSheetByName("Test Sessions"), data=sh.getDataRange().getValues(), h=data[0].map(String), ix=h.indexOf("Test ID"), si=h.indexOf("Status");
    for(let i=1;i<data.length;i++) if(String(data[i][ix])===id) {
      if(status==="published") {
        const t=rows_("Test Sessions").find(x=>String(x["Test ID"])===id), qs=rows_("Test Questions").filter(q=>String(q["Test ID"])===id);
        if(!date_(t["Start At"])||!date_(t["End At"])||date_(t["End At"])<=date_(t["Start At"])||!qs.length) throw new Error("Add valid dates and at least one question before publishing.");
      }
      sh.getRange(i+1,si+1).setValue(status.charAt(0).toUpperCase()+status.slice(1));
      return {success:true,message:"Test status updated."};
    }
    throw new Error("Test ID not found.");
  } catch(e){return fail_(e.message);}
}
