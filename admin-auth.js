/* ILM Exam Centre administrator authentication. */
(() => {
  const client = window.supabaseClient;
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("adminLoginMessage");
  const button = document.getElementById("adminLoginButton");
  const showMessage = (value) => { if (message) { message.textContent=value; message.classList.add("show"); } };
  if (!client) { showMessage("Login service is unavailable. Refresh and try again."); return; }
  async function isAdmin(user) {
    const {data,error}=await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(error) throw error;
    return !!data && String(data.role).toLowerCase()==="admin";
  }
  if(form) form.addEventListener("submit",async event=>{
    event.preventDefault(); message.classList.remove("show"); button.disabled=true; button.textContent="Checking account…";
    try {
      const email=document.getElementById("adminEmail").value.trim();
      const password=document.getElementById("adminPassword").value;
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      if(!data.user || !(await isAdmin(data.user))) { await client.auth.signOut(); throw new Error("This account is not authorised as an ILM administrator."); }
      window.location.replace("exam-admin.html");
    } catch(error) {
      showMessage(error.message||"Unable to sign in. Check your details and try again.");
      button.disabled=false; button.textContent="Sign in securely";
    }
  });
  const content=document.getElementById("adminContent");
  if(content) (async()=>{
    try {
      const {data:{session}}=await client.auth.getSession();
      if(!session || !(await isAdmin(session.user))) { await client.auth.signOut(); window.location.replace("admin-login.html"); return; }
      content.style.display="";
      const gate=document.getElementById("adminAccessGate");
      if(gate) gate.style.display="none";
      const status=document.getElementById("adminAccessStatus");
      if(status) status.textContent="Signed in as authorised administrator";
      const logout=document.getElementById("adminLogout");
      if(logout) logout.addEventListener("click",async e=>{e.preventDefault();await client.auth.signOut();window.location.replace("admin-login.html");});
    } catch(error) { window.location.replace("admin-login.html"); }
  })();
})();