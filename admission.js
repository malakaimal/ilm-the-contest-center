// ILM admission form: Google Sheets + Google Drive only (no Supabase).
const ILM_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxz2mBlANzvWwQsBDbCtUHCHVa3EF72DIrBDZokGOEyWdcLf_JBXIdnhfMTrKtxnada/exec";
function ilmShowFormMessage(text,type){
 const el=document.getElementById("formMessage");
 el.textContent=text;el.className="form-message "+(type||"");el.style.display="block";
}
const ilmForm=document.getElementById("signupForm");
if(ilmForm) ilmForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const btn=ilmForm.querySelector('button[type="submit"]');
 const file=document.getElementById("paymentScreenshot").files[0];
 if(!file){ilmShowFormMessage("Payment screenshot is required.","error");return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
  ilmShowFormMessage("Choose a JPG, PNG or WebP image up to 5 MB.","error");return;
 }
 if(!document.getElementById("terms").checked){ilmShowFormMessage("Please accept the declaration before submitting.","error");return;}
 btn.disabled=true;btn.textContent="Submitting admission...";
 try{
  const base64=await new Promise((resolve,reject)=>{
   const reader=new FileReader();reader.onerror=()=>reject(new Error("Could not read the screenshot."));
   reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.readAsDataURL(file);
  });
  const payload={
   fullName:document.getElementById("fullName").value.trim(),
   fatherName:document.getElementById("fatherName").value.trim(),
   dateOfBirth:document.getElementById("dateOfBirth").value,
   email:document.getElementById("email").value.trim(),
   phone:document.getElementById("phone").value.trim(),
   area:document.getElementById("area").value.trim(),
   school:document.getElementById("school").value.trim(),
   grade:document.getElementById("grade").value,
   program:document.getElementById("program").value,
   previousTest:document.getElementById("previousTest").value,
   paymentReference:document.getElementById("paymentReference").value.trim(),
   paymentDate:document.getElementById("paymentDate").value,
   screenshot:{name:file.name,mimeType:file.type,base64:base64}
  };
  // Apps Script is cross-origin; no-cors sends the request but does not expose its response.
  await fetch(ILM_APPS_SCRIPT_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  ilmShowFormMessage("Your admission request has been sent. Please wait for ILM to verify it. If you do not receive confirmation, contact ilmthecontestcenter@gmail.com. Do not submit the form again unless ILM asks you to.","success");
  ilmForm.reset();
 }catch(err){
  ilmShowFormMessage("We could not send your application. Please check your internet connection and try again. "+(err.message||""),"error");
 }finally{btn.disabled=false;btn.textContent="Submit Admission";}
});
