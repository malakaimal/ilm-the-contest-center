const siteNav = [
  ["Home","index.html"],["About Us","about.html"],["Programs","programs.html"],
  ["Olympiads","olympiads.html"],["Admission","admission.html"],["Contests","contests.html"],
  ["Results","results.html"],["Certificates","certificates.html"],["Online Test","https://malakaimal.github.io/etest/"],["FAQs","faqs.html"],["Contact","contact.html"]
];
const currentFile = location.pathname.split("/").pop() || "index.html";
const header = document.getElementById("site-header");
if (header) {
  header.className = "site-header";
  header.innerHTML = '<div class="container nav-wrap"><a class="brand" href="index.html" aria-label="ILM The Contest Center home"><img src="assets/ilm-logo.svg" alt="ILM The Contest Center logo"></a><button class="menu-toggle" id="menuToggle" aria-label="Open navigation" aria-expanded="false">☰</button><nav class="nav-links" id="navLinks">' +
    siteNav.map(([label,url]) => '<a href="'+url+'" '+(currentFile===url?'class="active" aria-current="page"':'')+(url.startsWith('http')?' target="_blank" rel="noopener noreferrer"':'')+'>'+label+'</a>').join("") +
    '</nav><div class="nav-actions"><a class="btn btn-blue" href="portal.html">Student Portal</a></div></div>';
  const toggle=document.getElementById("menuToggle"), nav=document.getElementById("navLinks");
  toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"×":"☰";});
}
const footer=document.getElementById("site-footer");
if(footer){footer.className="site-footer";footer.innerHTML='<div class="container"><div class="footer-grid"><div class="footer-brand"><a href="index.html" aria-label="ILM home"><img src="assets/ilm-logo.svg" alt="ILM The Contest Center logo"></a><p style="margin-top:16px">Empowering young minds through mathematics, healthy competition and meaningful learning opportunities.</p></div><div><h4>Explore</h4><div class="footer-links"><a href="about.html">About ILM</a><a href="programs.html">Our Programs</a><a href="olympiads.html">Math Olympiads</a><a href="admission.html">Olympiad Admission</a><a href="https://malakaimal.github.io/etest/" target="_blank" rel="noopener noreferrer">Online Test</a><a href="contests.html">Annual Mega Contest</a></div></div><div><h4>Student Services</h4><div class="footer-links"><a href="signup.html">Create Student Account</a><a href="admission.html">Programme Admission</a><a href="portal.html">Student Portal</a><a href="results.html">Check Results</a><a href="certificates.html">Verify Certificate</a><a href="faqs.html">Frequently Asked Questions</a></div></div><div><h4>Contact</h4><div class="footer-links"><a href="mailto:ilmthecontestcenter@gmail.com">ilmthecontestcenter@gmail.com</a><a href="tel:+923085372970">+92 308 5373970</a><a href="contact.html">Contact Form</a></div></div></div><div class="footer-bottom">© '+new Date().getFullYear()+' ILM The Contest Center. All rights reserved.</div></div>';}


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
