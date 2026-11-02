const siteNav = [
  ["Home","index.html"],["About Us","about.html"],["Programs","programs.html"],
  ["Olympiads","olympiads.html"],["Admission","signup.html"],["Contests","contests.html"],
  ["Results","results.html"],["Certificates","certificates.html"],["Contact","contact.html"]
];
const currentFile = location.pathname.split("/").pop() || "index.html";
const header = document.getElementById("site-header");
if (header) {
  header.className = "site-header";
  header.innerHTML = '<div class="container nav-wrap"><a class="brand" href="index.html"><strong>ILM</strong><small>THE CONTEST CENTER</small></a><button class="menu-toggle" id="menuToggle" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="nav-links" id="navLinks">' +
    siteNav.map(([label,url]) => '<a href="'+url+'" '+(currentFile===url?'class="active" aria-current="page"':'')+'>'+label+'</a>').join("") +
    '</nav><div class="nav-actions"><a class="btn btn-blue" href="login.html">Student Portal</a></div></div>';
  const toggle=document.getElementById("menuToggle"), nav=document.getElementById("navLinks");
  toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"×":"☰";});
}
const footer=document.getElementById("site-footer");
if(footer){footer.className="site-footer";footer.innerHTML='<div class="container"><div class="footer-grid"><div class="footer-brand"><strong>ILM</strong><small>THE CONTEST CENTER</small><p style="margin-top:16px">Empowering young minds through mathematics, healthy competition and meaningful learning opportunities.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="about.html">About ILM</a><a href="programs.html">Our Programs</a><a href="olympiads.html">Math Olympiads</a><a href="signup.html">Olympiad Admission</a><a href="contests.html">Annual Mega Contest</a></div></div><div><h4>Student Services</h4><div class="footer-links"><a href="signup.html">Student Registration</a><a href="login.html">Student Portal</a><a href="results.html">Check Results</a><a href="certificates.html">Verify Certificate</a></div></div><div><h4>Contact</h4><div class="footer-links"><a href="mailto:ilmthecontestcenter@gmail.com">ilmthecontestcenter@gmail.com</a><a href="tel:+923085372970">+92 308 5373970</a><a href="contact.html">Contact Form</a></div></div></div><div class="footer-bottom">© '+new Date().getFullYear()+' ILM The Contest Center. All rights reserved.</div></div>';}
