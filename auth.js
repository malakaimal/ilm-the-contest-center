function showMessage(el,text,type){el.textContent=text;el.className="form-message "+(type||"");el.style.display="block";}
const loginForm=document.getElementById("loginForm");
if(loginForm) loginForm.addEventListener("submit",async e=>{
 e.preventDefault();const msg=document.getElementById("formMessage"),btn=loginForm.querySelector("button[type=submit]");
 if(!window.supabaseClient){showMessage(msg,"Authentication library could not load. Refresh and try again.","error");return;}
 btn.disabled=true;btn.textContent="Signing in...";
 try{const {error}=await supabaseClient.auth.signInWithPassword({email:document.getElementById("email").value.trim(),password:document.getElementById("password").value});if(error)throw error;location.href="student-dashbord.html";}
 catch(err){showMessage(msg,err.message||"Unable to sign in. Check your details.","error");}
 finally{btn.disabled=false;btn.textContent="Sign In";}
});
const signupForm=document.getElementById("signupForm");
if(signupForm) signupForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const msg=document.getElementById("formMessage"),btn=signupForm.querySelector("button[type=submit]");
 const password=document.getElementById("password").value,confirm=document.getElementById("confirmPassword").value;
 if(password.length<8){showMessage(msg,"Use a password with at least 8 characters.","error");return;}
 if(password!==confirm){showMessage(msg,"The passwords do not match.","error");return;}
 if(!document.getElementById("terms").checked){showMessage(msg,"Please accept the account declaration.","error");return;}
 if(!window.supabaseClient){showMessage(msg,"Account service unavailable. Refresh and try again.","error");return;}
 btn.disabled=true;btn.textContent="Creating account...";
 try{
  const {data,error}=await supabaseClient.auth.signUp({
   email:document.getElementById("email").value.trim(),
   password,
   options:{emailRedirectTo:location.origin+"/login.html",data:{full_name:document.getElementById("fullName").value.trim()}}
  });
  if(error)throw error;
  if(data.session){showMessage(msg,"Your student account is ready. Opening your dashboard...","success");setTimeout(()=>location.assign("student-dashbord.html"),900);}
  else{showMessage(msg,"Account created. Check your email for the confirmation link, then sign in to the Student Portal.","success");signupForm.reset();}
 }catch(err){showMessage(msg,err.message||"Account creation failed. Please try again.","error");}
 finally{btn.disabled=false;btn.textContent="Create Student Account";}
});
const forgot=document.getElementById("forgotPassword");
if(forgot)forgot.addEventListener("click",async e=>{e.preventDefault();const email=document.getElementById("email").value.trim(),msg=document.getElementById("formMessage");if(!email){showMessage(msg,"Enter your email address first, then choose Forgot password.","error");return;}try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/login.html"});if(error)throw error;showMessage(msg,"If this email is registered, a password reset link has been sent.","success");}catch(err){showMessage(msg,err.message,"error");}});
