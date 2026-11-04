function showMessage(el,text,type){el.textContent=text;el.className="form-message "+(type||"");el.style.display="block";}
const loginForm=document.getElementById("loginForm");
if(loginForm) loginForm.addEventListener("submit",async e=>{
 e.preventDefault();const msg=document.getElementById("formMessage"),btn=loginForm.querySelector("button[type=submit]");
 if(!window.supabaseClient){showMessage(msg,"Authentication library could not load. Refresh and try again.","error");return;}
 btn.disabled=true;btn.textContent="Signing in...";
 try{const {error}=await supabaseClient.auth.signInWithPassword({email:document.getElementById("email").value.trim(),password:document.getElementById("password").value});if(error)throw error;location.href="student-dashboard.html";}
 catch(err){showMessage(msg,err.message||"Unable to sign in. Check your details.","error");}
 finally{btn.disabled=false;btn.textContent="Sign In";}
});
const signupForm=document.getElementById("signupForm");
if(signupForm) signupForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const msg=document.getElementById("formMessage"),btn=signupForm.querySelector("button[type=submit]");
 const password=document.getElementById("password").value,confirm=document.getElementById("confirmPassword").value;
 const file=document.getElementById("paymentScreenshot")?.files?.[0];
 if(password.length<8||password!==confirm){showMessage(msg,password!==confirm?"The passwords do not match.":"Use at least 8 password characters.","error");return;}
 if(!document.getElementById("terms").checked||!file){showMessage(msg,"Accept the declaration and select the required payment screenshot.","error");return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){showMessage(msg,"Upload a JPG, PNG or WebP screenshot no larger than 5 MB.","error");return;}
 if(!window.supabaseClient){showMessage(msg,"Account service unavailable. Refresh and try again.","error");return;}
 btn.disabled=true;btn.textContent="Creating account...";
 let created=false;
 try{
  const metadata={full_name:document.getElementById("fullName").value.trim(),father_name:document.getElementById("fatherName").value.trim(),date_of_birth:document.getElementById("dateOfBirth").value,phone:document.getElementById("phone").value.trim(),area:document.getElementById("area").value.trim(),school_name:document.getElementById("school").value.trim(),grade:document.getElementById("grade").value,program_interest:document.getElementById("program").value,previous_ilm_test:document.getElementById("previousTest").value,payment_reference:document.getElementById("paymentReference").value.trim(),payment_date:document.getElementById("paymentDate").value};
  const {data,error}=await supabaseClient.auth.signUp({email:document.getElementById("email").value.trim(),password,options:{emailRedirectTo:location.origin+"/login.html",data:metadata}});
  if(error)throw error;created=true;
  if(!data.session){showMessage(msg,"Account created, but email confirmation is enabled. Screenshot has NOT uploaded. Confirm your email, then contact ILM to complete the payment proof submission. Do not register again.","error");return;}
  const path=data.user.id+"/"+Date.now()+"_"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const {error:upErr}=await supabaseClient.storage.from("payment-screenshots").upload(path,file,{contentType:file.type,upsert:false});
  if(upErr)throw upErr;
  const {error:metaErr}=await supabaseClient.auth.updateUser({data:{...metadata,payment_screenshot_path:path}});
  if(metaErr)throw metaErr;
  showMessage(msg,"Admission submitted and payment screenshot uploaded securely.","success");signupForm.reset();
 }catch(err){showMessage(msg,(created?"Account created, but screenshot upload failed. Contact ILM before registering again. ":"")+(err.message||"Submission failed."),"error");}
 finally{btn.disabled=false;btn.textContent="Submit Admission & Create Account";}
});
const forgot=document.getElementById("forgotPassword");
if(forgot)forgot.addEventListener("click",async e=>{e.preventDefault();const email=document.getElementById("email").value.trim(),msg=document.getElementById("formMessage");if(!email){showMessage(msg,"Enter your email address first, then choose Forgot password.","error");return;}try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/login.html"});if(error)throw error;showMessage(msg,"If this email is registered, a password reset link has been sent.","success");}catch(err){showMessage(msg,err.message,"error");}});
