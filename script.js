const currentFile = location.pathname.split("/").pop() || "index.html";
const header = document.getElementById("site-header");
if (header) {
  header.className = "site-header";
  const groups = [
    {label:"Home",url:"index.html"},
    {label:"About",url:"about.html"},
    {label:"Programmes",items:[
      ["All Programmes","programs.html"],["Math Olympiads","olympiads.html"],
      ["Annual Mega Contest","contests.html"],["Admission","admission.html"],
      ["Practice Books","practice-books.html"],["Regional Math Clubs","regional-math-clubs.html"]
    ]},
    {label:"Results",items:[["Check Results","results.html"],["Verify Certificate","certificates.html"]]},
    {label:"Contact",url:"contact.html"}
  ];
  const groupActive = group => group.items ? group.items.some(item=>item[1]===currentFile) : group.url===currentFile;
  const navMarkup = groups.map((group,index) => {
    if (!group.items) return '<a class="ilm-nav-link '+(groupActive(group)?'active':'')+'" href="'+group.url+'" '+(groupActive(group)?'aria-current="page"':'')+'>'+group.label+'</a>';
    return '<div class="ilm-nav-dropdown '+(groupActive(group)?'is-active':'')+'"><button class="ilm-nav-link ilm-dropdown-trigger" type="button" aria-expanded="false">'+group.label+' <span aria-hidden="true">⌄</span></button><div class="ilm-dropdown-menu">'+group.items.map(([label,url])=>'<a href="'+url+'" '+(currentFile===url?'class="active" aria-current="page"':'')+'>'+label+'</a>').join("")+'</div></div>';
  }).join("");
  header.innerHTML = '<div class="ilm-academic-topbar"><div class="ilm-academic-topbar-inner"><span>ILM THE CONTEST CENTER <i></i> SHANGLA, PAKISTAN</span><div><a href="mailto:ilmthecontestcenter@gmail.com">ilmthecontestcenter@gmail.com</a><a href="tel:+923085372970">+92 308 5373970</a></div></div></div><div class="ilm-header-shell"><a class="brand" href="index.html" aria-label="ILM The Contest Center home"><img src="assets/ilm-logo.svg" alt="ILM The Contest Center"></a><button class="menu-toggle" id="menuToggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button><nav class="nav-links" id="navLinks" aria-label="Main navigation">'+navMarkup+'</nav><div class="nav-actions"><a class="ilm-login-link" href="login.html">Login</a><a class="btn btn-blue" href="portal.html">Student Portal <span aria-hidden="true">↗</span></a></div></div>';
  const toggle=document.getElementById("menuToggle"), nav=document.getElementById("navLinks");
  toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");toggle.classList.toggle("is-open",open);});
  header.querySelectorAll(".ilm-dropdown-trigger").forEach(button=>{
    button.addEventListener("click",()=>{
      const parent=button.closest(".ilm-nav-dropdown");
      const open=parent.classList.toggle("dropdown-open");
      button.setAttribute("aria-expanded",String(open));
      header.querySelectorAll(".ilm-nav-dropdown").forEach(other=>{
        if(other!==parent){other.classList.remove("dropdown-open");other.querySelector("button").setAttribute("aria-expanded","false");}
      });
    });
  });
  document.addEventListener("click",event=>{
    if(!header.contains(event.target)) header.querySelectorAll(".ilm-nav-dropdown").forEach(group=>{
      group.classList.remove("dropdown-open");group.querySelector("button").setAttribute("aria-expanded","false");
    });
  });
}
const footer=document.getElementById("site-footer");
if(footer){footer.className="site-footer";footer.innerHTML='<div class="container"><div class="footer-grid"><div class="footer-brand"><a href="index.html" aria-label="ILM home"><img src="assets/ilm-footer-logo.svg" alt="ILM The Contest Center logo"></a><p style="margin-top:16px">Empowering young minds through mathematics, healthy competition and meaningful learning opportunities.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="about.html">About ILM</a><a href="programs.html">Our Programs</a><a href="olympiads.html">Math Olympiads</a><a href="admission.html">Olympiad Admission</a><a href="https://malakaimal.github.io/etest/" target="_blank" rel="noopener noreferrer">Online Test</a><a href="contests.html">Annual Mega Contest</a></div></div><div><h4>Student Services</h4><div class="footer-links"><a href="signup.html">Create Student Account</a><a href="admission.html">Programme Admission</a><a href="portal.html">Student Portal</a><a href="results.html">Check Results</a><a href="certificates.html">Verify Certificate</a><a href="faqs.html">Frequently Asked Questions</a></div></div><div><h4>Contact</h4><div class="footer-links"><a href="mailto:ilmthecontestcenter@gmail.com">ilmthecontestcenter@gmail.com</a><a href="tel:+923085372970">+92 308 5373970</a><a href="contact.html">Contact Form</a></div></div></div><div class="footer-bottom">© '+new Date().getFullYear()+' ILM The Contest Center. All rights reserved.</div></div>';}


// Global accessibility and navigation enhancements
document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector(".ilm-skip-link")) {
    const skip = document.createElement("a");
    skip.className = "ilm-skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to main content";
    document.body.prepend(skip);
  }
  const main = document.querySelector("main");
  if (main && !main.id) main.id = "main-content";
  if (!document.getElementById("ilmBackToTop")) {
    const topButton = document.createElement("button");
    topButton.id = "ilmBackToTop";
    topButton.className = "ilm-back-to-top";
    topButton.type = "button";
    topButton.setAttribute("aria-label", "Back to top");
    topButton.textContent = "↑";
    document.body.appendChild(topButton);
    const updateTopButton = () => topButton.classList.toggle("visible", window.scrollY > 450);
    window.addEventListener("scroll", updateTopButton, { passive: true });
    updateTopButton();
    topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
});


/* Shared ILM favicon */
if (!document.querySelector('link[rel="icon"]')) {
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/svg+xml";
  favicon.href = "favicon.svg";
  document.head.appendChild(favicon);
}


/* ILM scroll reveals: progressive enhancement with reduced-motion support */
(() => {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const revealItems = document.querySelectorAll(
    "main .section-heading, main .card, main .step-card, main .feature-tile, main .form-card, main .stat"
  );
  revealItems.forEach((item, index) => {
    item.classList.add("ilm-reveal");
    const delay = index % 4;
    if (delay) item.setAttribute("data-ilm-delay", String(delay));
  });
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  revealItems.forEach(item => observer.observe(item));
})();
