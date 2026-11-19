// ILM admission form: Google Sheets + Google Drive via the ILM Apps Script web app.

// District and tehsil remain standard dropdowns. Only School Name uses search suggestions.
const ilmDistrictTehsils = {
 Shangla: ["Alpuri", "Besham", "Chakesar", "Martung", "Puran"],
 Buner: ["Daggar", "Gagra", "Gadezai", "Chagharzai", "Khado Khel", "Mandanr"],
 Swat: ["Babuzai", "Barikot", "Bahrain", "Charbagh", "Kabal", "Khwazakhela", "Matta"]
};
const ilmDistrictSelect = document.getElementById("district");
const ilmTehsilSelect = document.getElementById("tehsil");
const ilmSchoolList = document.getElementById("ilmSchoolSuggestions");
const ilmSchoolNames = {"Swat":["THE MODEL SCHOOL SWAT","ABASIN CHILDREN ACADEMY","ABASYN INTERNATIONAL SCHOOL KABAL SWAT","ABASIN PUBLIC SCHOOL AND COLLEGE","ABDAL EDUCATION ACADEMY","ABDALI GIRLS SCHOOL & COLLEGE","ABDALI PUBLIC SCHOOL MATTA","AFAQ MODEL SCHOOL KOKARAI SWAT","AL - RAZI SCHOOL & COLLEGE KANJU SWAT","AL MADINA PUBLIC SCHOOL KABAL SWAT","THE ASIAN SCHOOL AND COLLEGE CAMPUS 1","BEACONHOUSE SCHOOL SYSTEM SWAT BRANCH","THE LEARNERS SCHOOL SWAT","SWAT ENGLISH ACADEMY SCHOOL AND COLLEGE","SWAT VALLEY SCHOOL SYSTEM KANJU","ALLIED SCHOOL SWAT CAMPUS","THE PEACE GROUP OF SCHOOLS AND COLLEGES SWAT","Government High School No. 1 Mingora","Government Higher Secondary School Balogram","Government Primary School Burhanabad Barama","Government Primary School Dakorak","Government High School Seer","Government Primary/Middle/High School Kota"],"Buner":["ABASIA PUBLIC SCHOOL JOWAR BUNER","ABBOTTABAD INTERNATIONAL MODEL SCHOOL & COLLEGE (BUNER CAMPUS)","ABDALI GIRLS SCHOOL & COLLAGE JOWAR BUNER","AFAQ PUBLIC SCHOOL","AIM COLLEGE OF MODERN SCIENCES (GIRLS)","AISHA MODEL SCHOOL BUDAL","AL QALAM EDUCATION ACADEMY","AL BAHAR GROUP OF SCHOOLS AND COLLEGES","AL FARABI PUBLIC SCHOOL","BUNER CHILDREN ACADEMY","BUNER EDUCATION ACADEMY","BUNER GRAMMAR SCHOOL","BUNER MODEL SCHOOL & COLLEGE REGA"],"Shangla":["A ONE PUBLIC SCHOOL","ABASEEN PUBLIC SCHOOL DEDAL","ABASIN MODEL SCHOOL","ABDULLAH IBNE ABBAS ACADMY MANDORYA","ABU HURAIRA MODEL SCHOOL","AFAQ MODEL SCHOOL","AFAQ MODEL SCHOOL SHEPNAI","AHMAD PUBLIC SCHOOL BARKANA","AL HUDA PUBLIC SCHOOL FAIZA","AL MEEZAN PUBLIC SCHOOL JATKOOL","CHAKESAR EDUCATION ACADEMY","CHAKESAR MODEL SCHOOL","CHAKESAR PUBLIC SCHOOL & COLLEGE","BESHAM MODEL SCHOOL & COLLEGE","ENGLISH GRAMMAR SCHOOL BESHAM","IQRA USMANIA PUBLIC SCHOOL DANAKOOL"]};
function ilmUpdateTehsils() {
 const names = ilmDistrictTehsils[ilmDistrictSelect?.value] || [];
 if (!ilmTehsilSelect) return;
 const selected = ilmTehsilSelect.value;
 ilmTehsilSelect.replaceChildren(new Option("Select tehsil", ""));
 names.forEach(name => ilmTehsilSelect.add(new Option(name, name)));
 ilmTehsilSelect.disabled = names.length === 0;
 if (names.includes(selected)) ilmTehsilSelect.value = selected;
}
function ilmUpdateSchoolSuggestions() {
 if (!ilmSchoolList) return;
 const district = ilmDistrictSelect?.value || "";
 const sector = document.getElementById("schoolSector")?.value || "";
 let options = ilmSchoolNames[district] || [];
 if (sector === "Government") options = options.filter(name => name.startsWith("Government"));
 if (sector === "Private") options = options.filter(name => !name.startsWith("Government"));
 ilmSchoolList.replaceChildren(...options.map(name => new Option(name, name)));
}
ilmDistrictSelect?.addEventListener("change", () => { ilmUpdateTehsils(); ilmUpdateSchoolSuggestions(); });
document.getElementById("schoolSector")?.addEventListener("change", ilmUpdateSchoolSuggestions);
ilmUpdateTehsils();
ilmUpdateSchoolSuggestions();
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
   district:document.getElementById("district").value,
   tehsil:document.getElementById("tehsil").value,
   // Keep the combined area value for compatibility with the existing admissions sheet.
   area:document.getElementById("tehsil").value+", "+document.getElementById("district").value,
   school:document.getElementById("school").value.trim(),
   schoolSector:document.getElementById("schoolSector").value,
   schoolLevel:document.getElementById("schoolLevel").value,
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
