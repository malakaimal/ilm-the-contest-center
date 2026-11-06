// ILM admission form: Google Sheets + Google Drive via the ILM Apps Script web app.
const ILM_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGvXpTiN2DBwio0NdnSqAgQBdG1SFV3ISkrFet-mO86UUPUXIyfC1AlmrOdxPGaviF/exec";
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
  // no-cors does not reveal the server response; the success message is deliberately qualified.
  await fetch(ILM_APPS_SCRIPT_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  ilmShowFormMessage("Your application request was sent. The server response cannot be verified in this browser. Please contact ilmthecontestcenter@gmail.com if your Application ID does not appear in your confirmation from ILM.","success");
  ilmForm.reset();
 }catch(err){
  ilmShowFormMessage("We could not send your application. Check your connection and try again. "+(err.message||""),"error");
 }finally{btn.disabled=false;btn.textContent="Submit Admission";}
});
