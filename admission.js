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
 if(document.getElementById("email").value.trim().toLowerCase()!==document.getElementById("confirmEmail").value.trim().toLowerCase()){ilmShowFormMessage("Email addresses do not match.","error");return;}
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
   paymentMethod:document.getElementById("paymentMethod").value,
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
  ilmShowFormMessage("Your application has been submitted. A confirmation email will be sent to your registered email address. Your application is under review. For assistance, contact ilmthecontestcenter@gmail.com.","success");
  ilmForm.reset();
 }catch(err){
  ilmShowFormMessage("We could not send your application. Check your connection and try again. "+(err.message||""),"error");
 }finally{btn.disabled=false;btn.textContent="Submit Admission";}
});

function ilmSetAdmissionStep(step){
 const one=document.getElementById("admissionStep1"),two=document.getElementById("admissionStep2");
 one.classList.toggle("hidden",step!==1);two.classList.toggle("hidden",step!==2);
}
document.getElementById("nextAdmissionStep")?.addEventListener("click",()=>{
 const panel=document.getElementById("admissionStep1");
 const fields=Array.from(panel.querySelectorAll("input[required],select[required]"));
 const bad=fields.find(x=>!x.checkValidity());
 if(bad){bad.reportValidity();return;}
 const a=document.getElementById("email").value.trim().toLowerCase();
 const b=document.getElementById("confirmEmail").value.trim().toLowerCase();
 if(a!==b){ilmShowFormMessage("Email addresses do not match. Please check both fields.","error");return;}
 ilmSetAdmissionStep(2);
});
document.getElementById("backAdmissionStep")?.addEventListener("click",()=>ilmSetAdmissionStep(1));
const ilmPaymentGuideButton=document.getElementById("viewPaymentInstructions");
const ilmPaymentGuide=document.getElementById("paymentInstructions");
ilmPaymentGuideButton?.addEventListener("click",()=>{
 const willOpen=ilmPaymentGuide.classList.contains("hidden");
 ilmPaymentGuide.classList.toggle("hidden",!willOpen);
 ilmPaymentGuideButton.setAttribute("aria-expanded",String(willOpen));
 ilmPaymentGuideButton.textContent=willOpen?"Hide Payment Instructions":"View Payment Instructions";
});
