async function requireUser(){const {data,error}=await supabaseClient.auth.getUser();if(error||!data.user){location.href="login.html";return null;}return data.user;}
async function signOut(){await supabaseClient.auth.signOut();location.href="login.html";}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function adminMessage(text,type){const el=document.getElementById("adminMessage");if(!el)return;el.textContent=text;el.className="form-message "+(type||"");el.style.display="block";}
async function loadStudent(){const user=await requireUser();if(!user)return;const {data:profile,error}=await supabaseClient.from("profiles").select("*").eq("user_id",user.id).single();if(error){document.getElementById("portalContent").innerHTML='<div class="notice">Your student profile is not ready. Please ask ILM support to check the database setup.</div>';return;}document.getElementById("studentName").textContent=profile.full_name||user.email;document.getElementById("registrationId").textContent=profile.registration_id||"Pending";document.getElementById("profileDetails").innerHTML='<p><b>Email:</b> '+safe(user.email)+'</p><p><b>Class:</b> '+safe(profile.grade)+'</p><p><b>School:</b> '+safe(profile.school_name)+'</p><p><b>District:</b> '+safe(profile.district)+'</p><p><b>Program:</b> '+safe(profile.program_interest)+'</p>';
const [results,certs,comps]=await Promise.all([supabaseClient.from("results").select("*").eq("registration_id",profile.registration_id).order("result_date",{ascending:false}),supabaseClient.from("certificates").select("*").eq("registration_id",profile.registration_id).order("issued_on",{ascending:false}),supabaseClient.from("competitions").select("title,status,start_date,description").neq("status","draft").order("start_date",{ascending:true})]);
document.getElementById("studentResults").innerHTML=results.error?'<p class="muted">Results are not available yet.</p>':results.data.length?'<div class="table-wrap"><table><thead><tr><th>Competition</th><th>Score</th><th>Rank</th><th>Date</th></tr></thead><tbody>'+results.data.map(r=>'<tr><td>'+safe(r.competition)+'</td><td>'+safe(r.score)+' / '+safe(r.total_marks)+'</td><td>'+safe(r.rank||"—")+'</td><td>'+safe(r.result_date||"—")+'</td></tr>').join("")+'</tbody></table></div>':'<div class="empty-state">No published results are linked to your account yet.</div>';
document.getElementById("studentCertificates").innerHTML=certs.error?'<p class="muted">Certificates are not available yet.</p>':certs.data.length?certs.data.map(c=>'<div class="card"><h3>'+safe(c.program)+'</h3><p>Certificate No: '+safe(c.certificate_no)+'</p><p>Issued: '+safe(c.issued_on||"—")+'</p></div>').join(""):'<div class="empty-state">No certificates have been issued to your account yet.</div>';
document.getElementById("studentCompetitions").innerHTML=comps.error?'<p class="muted">Program information is not available.</p>':comps.data.length?comps.data.map(c=>'<div class="card"><h3>'+safe(c.title)+'</h3><p>'+safe(c.description)+'</p><span class="badge">'+safe(c.status)+'</span></div>').join(""):'<div class="empty-state">New ILM opportunities will appear here.</div>';
}
async function loadAdmin(){const user=await requireUser();if(!user)return;const {data:p,error}=await supabaseClient.from("profiles").select("role,full_name").eq("user_id",user.id).single();if(error||!p||!["admin","super_admin"].includes(p.role)){document.getElementById("adminContent").innerHTML='<div class="notice">This account does not have administrator access. Ask the project owner to assign the admin role securely in Supabase.</div>';return;}document.getElementById("adminWelcome").textContent="Welcome, "+(p.full_name||user.email);const [students,results,comps,certs]=await Promise.all([supabaseClient.from("profiles").select("user_id,registration_id,full_name,email,phone,grade,school_name,program_interest,created_at").order("created_at",{ascending:false}).limit(100),supabaseClient.from("results").select("*").order("created_at",{ascending:false}).limit(50),supabaseClient.from("competitions").select("*").order("created_at",{ascending:false}),supabaseClient.from("certificates").select("*").order("created_at",{ascending:false}).limit(50)]);document.getElementById("adminStudents").textContent=students.data?.length??"—";document.getElementById("adminResults").textContent=results.data?.length??"—";document.getElementById("adminPrograms").textContent=comps.data?.length??"—";document.getElementById("studentsTable").innerHTML=students.error?'<tr><td colspan="7">Could not load students.</td></tr>':students.data.map(s=>'<tr><td>'+safe(s.registration_id)+'</td><td>'+safe(s.full_name)+'</td><td>'+safe(s.grade)+'</td><td>'+safe(s.school_name)+'</td><td>'+safe(s.program_interest)+'</td><td>'+safe(s.phone)+'</td><td>'+safe(s.email)+'</td></tr>').join("");document.getElementById("resultsTable").innerHTML=results.error?'<tr><td colspan="5">Could not load results.</td></tr>':results.data.map(r=>'<tr><td>'+safe(r.registration_id)+'</td><td>'+safe(r.student_name)+'</td><td>'+safe(r.competition)+'</td><td>'+safe(r.score)+'/'+safe(r.total_marks)+'</td><td>'+safe(r.is_published?"Published":"Draft")+'</td></tr>').join("");document.getElementById("certificatesTable").innerHTML=certs.error?'<tr><td colspan="6">Could not load certificates.</td></tr>':certs.data.map(c=>'<tr><td>'+safe(c.certificate_no)+'</td><td>'+safe(c.registration_id)+'</td><td>'+safe(c.student_name)+'</td><td>'+safe(c.program)+'</td><td>'+safe(c.issued_on)+'</td><td>'+safe(c.verification_status)+'</td></tr>').join("");}
const resultForm=document.getElementById("resultForm");if(resultForm)resultForm.addEventListener("submit",async e=>{e.preventDefault();const user=await requireUser();if(!user)return;const score=Number(document.getElementById("rScore").value),total=Number(document.getElementById("rTotal").value);if(score>total){adminMessage("Score cannot be greater than total marks.","error");return;}const {error}=await supabaseClient.from("results").insert({registration_id:document.getElementById("rReg").value.trim(),student_name:document.getElementById("rName").value.trim(),grade:document.getElementById("rGrade").value.trim(),competition:document.getElementById("rCompetition").value.trim(),score,total_marks:total,rank:document.getElementById("rRank").value?Number(document.getElementById("rRank").value):null,is_published:document.getElementById("rPublished").checked,result_date:new Date().toISOString().slice(0,10)});if(error){adminMessage("Could not save result ("+(error.code||"database error")+"): "+error.message+(error.details?" | "+error.details:""),"error");return;}adminMessage("Result saved successfully and "+(document.getElementById("rPublished").checked?"published publicly.":"saved as a draft."),"success");resultForm.reset();await loadAdmin();});
const certificateForm=document.getElementById("certificateAdminForm");if(certificateForm)certificateForm.addEventListener("submit",async e=>{e.preventDefault();const user=await requireUser();if(!user)return;const {error}=await supabaseClient.from("certificates").insert({registration_id:document.getElementById("certReg").value.trim(),student_name:document.getElementById("certName").value.trim(),program:document.getElementById("certProgram").value.trim(),certificate_no:document.getElementById("certNumber").value.trim().toUpperCase(),issued_on:document.getElementById("certDate").value,verification_status:"valid"});if(error){adminMessage(error.message,"error");return;}adminMessage("Certificate record saved. The student can now see it in the Student Portal and verify its certificate number.","success");certificateForm.reset();await loadAdmin();});
const competitionForm=document.getElementById("competitionForm");if(competitionForm)competitionForm.addEventListener("submit",async e=>{e.preventDefault();const user=await requireUser();if(!user)return;const {error}=await supabaseClient.from("competitions").insert({title:document.getElementById("cTitle").value.trim(),description:document.getElementById("cDescription").value.trim(),grade_range:document.getElementById("cGrades").value.trim(),status:document.getElementById("cStatus").value,start_date:document.getElementById("cDate").value||null});if(error){adminMessage(error.message,"error");return;}adminMessage("Programme saved successfully.","success");competitionForm.reset();await loadAdmin();});

// Bulk result import: accepts CSV files and copied spreadsheet rows (CSV or tab-separated).
let ilmBulkRows = [];
function parseIlmDelimited(text){
  const firstLine=(text.split(/\r?\n/).find(line=>line.trim())||"");
  const delimiter=firstLine.includes("\t")?"\t":",";
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'&&quoted&&next==='"'){cell+='"';i++;}
    else if(ch==='"'){quoted=!quoted;}
    else if(ch===delimiter&&!quoted){row.push(cell.trim());cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&next==="\n")i++;row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);row=[];cell="";}
    else cell+=ch;
  }
  row.push(cell.trim());if(row.some(v=>v!==""))rows.push(row);
  if(rows.length<2)throw new Error("Add a header row and at least one student row.");
  const headers=rows.shift().map(h=>h.toLowerCase().replace(/^\uFEFF/,"").trim());
  const required=["registration_id","student_name","grade","competition","score","total_marks"];
  const missing=required.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error("Missing required column(s): "+missing.join(", "));
  return rows.map((cells,index)=>{const item={};headers.forEach((h,i)=>item[h]=cells[i]||"");return {...item,_line:index+2};});
}
function validateIlmBulkRows(rows){
  const errors=[],clean=[];
  rows.forEach(r=>{
    const score=Number(r.score),total=Number(r.total_marks);
    if(!r.registration_id||!r.student_name||!r.grade||!r.competition)errors.push("Row "+r._line+": registration_id, student_name, grade and competition are required.");
    else if(r.score===""||r.total_marks===""||!Number.isFinite(score)||!Number.isFinite(total)||score<0||total<=0||score>total)errors.push("Row "+r._line+": check score and total_marks.");
    else clean.push({registration_id:r.registration_id.trim(),student_name:r.student_name.trim(),grade:r.grade.trim(),competition:r.competition.trim(),score,total_marks:total,rank:r.rank&&Number(r.rank)>0?Number(r.rank):null,result_date:/^\d{4}-\d{2}-\d{2}$/.test(r.result_date||"")?r.result_date:new Date().toISOString().slice(0,10),is_published:document.getElementById("bulkPublish").checked});
  });
  return {clean,errors};
}
const bulkFile=document.getElementById("bulkResultsFile");
if(bulkFile)bulkFile.addEventListener("change",async()=>{
  const file=bulkFile.files?.[0];if(!file)return;
  document.getElementById("bulkResultsText").value=await file.text();
  document.getElementById("bulkResultCount").textContent=file.name+" loaded. Select Preview and validate.";
  document.getElementById("importBulkResults").disabled=true;ilmBulkRows=[];
});
const previewBulk=document.getElementById("previewBulkResults");
if(previewBulk)previewBulk.addEventListener("click",()=>{
  const preview=document.getElementById("bulkPreview"),count=document.getElementById("bulkResultCount");
  try{
    const parsed=parseIlmDelimited(document.getElementById("bulkResultsText").value);
    const checked=validateIlmBulkRows(parsed);ilmBulkRows=checked.clean;
    count.textContent=checked.clean.length+" valid row(s)"+(checked.errors.length?", "+checked.errors.length+" error(s)":"")+".";
    preview.innerHTML=(checked.errors.length?'<div class="notice"><b>Please correct these rows:</b><ul>'+checked.errors.map(e=>'<li>'+safe(e)+'</li>').join("")+'</ul></div>':'<div class="notice">All rows passed basic checks. Confirm the student Registration IDs before saving.</div>')+
      (checked.clean.length?'<div class="table-wrap"><table><thead><tr><th>Registration ID</th><th>Student</th><th>Class</th><th>Competition</th><th>Score</th><th>Position</th></tr></thead><tbody>'+checked.clean.slice(0,20).map(r=>'<tr><td>'+safe(r.registration_id)+'</td><td>'+safe(r.student_name)+'</td><td>'+safe(r.grade)+'</td><td>'+safe(r.competition)+'</td><td>'+r.score+'/'+r.total_marks+'</td><td>'+safe(r.rank||"—")+'</td></tr>').join("")+'</tbody></table></div><p class="muted">Showing up to 20 preview rows.</p>':'');
    document.getElementById("importBulkResults").disabled=checked.clean.length===0||checked.errors.length>0;
  }catch(err){ilmBulkRows=[];count.textContent="No valid data.";preview.innerHTML='<div class="form-message error">'+safe(err.message)+'</div>';document.getElementById("importBulkResults").disabled=true;}
});
const importBulk=document.getElementById("importBulkResults");
if(importBulk)importBulk.addEventListener("click",async()=>{
  importBulk.disabled=true;importBulk.textContent="Saving...";
  try{
    const user=await requireUser();if(!user)return;
    const ids=[...new Set(ilmBulkRows.map(r=>r.registration_id))];
    const {data:profiles,error:profileError}=await supabaseClient.from("profiles").select("registration_id").in("registration_id",ids);
    if(profileError)throw new Error("Could not validate student Registration IDs: "+profileError.message);
    const known=new Set((profiles||[]).map(p=>p.registration_id));
    const unknown=ids.filter(id=>!known.has(id));
    if(unknown.length)throw new Error("These Registration IDs were not found in the student database: "+unknown.slice(0,10).join(", ")+(unknown.length>10?" and more":"")+". Check the IDs in the Registered Students table.");
    let saved=0;
    for(let i=0;i<ilmBulkRows.length;i+=100){
      const batch=ilmBulkRows.slice(i,i+100);
      const {error}=await supabaseClient.from("results").insert(batch);
      if(error)throw new Error("Batch "+(Math.floor(i/100)+1)+" failed after "+saved+" row(s): "+error.message+(error.details?" | "+error.details:""));
      saved+=batch.length;
    }
    adminMessage(saved+" student result(s) saved "+(document.getElementById("bulkPublish").checked?"and published publicly.":"as drafts."),"success");
    document.getElementById("bulkResultsText").value="";bulkFile.value="";document.getElementById("bulkPreview").innerHTML="";document.getElementById("bulkResultCount").textContent="Import complete.";ilmBulkRows=[];
    await loadAdmin();
  }catch(err){adminMessage(err.message,"error");}
  finally{importBulk.textContent="Save all results";importBulk.disabled=ilmBulkRows.length===0;}
});
