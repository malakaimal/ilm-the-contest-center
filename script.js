
// ======================================
// ILM THE CONTEST CENTER
// Main JavaScript
// ======================================

// Highlight the current navigation page
const currentPage = window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll(".header nav a").forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
        link.classList.add("active");
    }
});

// Update copyright year automatically
const footerParagraphs = document.querySelectorAll("footer p");

footerParagraphs.forEach(paragraph => {
    if (paragraph.textContent.includes("All Rights Reserved")) {
        paragraph.textContent =
            `© ${new Date().getFullYear()} ILM The Contest Center. All Rights Reserved.`;
    }
});

// Smooth scrolling for internal section links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function(event) {
        const target = document.querySelector(this.getAttribute("href"));

        if (target) {
            event.preventDefault();
            target.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});

console.log("ILM The Contest Center loaded successfully!");
