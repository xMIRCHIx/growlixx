import { gsap } from 'gsap';

/**
 * Dynamically injects and initializes the shared footer on every page
 */
export function renderFooter() {
  const footerEl = document.getElementById('main-footer');
  if (!footerEl) return;

  footerEl.innerHTML = `
    <div class="footer-container">
      <div class="footer-logo-row">
        <span class="footer-giant-logo font-syne">GROWLIX</span>
      </div>

      <div class="footer-links-row">
        <div class="footer-col-brand">
          <p class="footer-brand-tagline">
            Premium media. Flawless motion. Crafting visual identities for premium brands globally.
          </p>
          <span class="footer-copyright">© 2026 Growlix Digital. Handcrafted.</span>
        </div>

        <div class="footer-col-nav">
          <h5 class="footer-col-title">Navigation</h5>
          <ul>
            <li><a href="/index.html">Home</a></li>
            <li><a href="/portfolio.html">Portfolio</a></li>
            <li><a href="/services.html">Services</a></li>
            <li><a href="/about.html">About</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>

        <div class="footer-col-socials">
          <h5 class="footer-col-title">Socials</h5>
          <ul>
            <li><a href="#" class="magnetic" data-strength="10">Instagram</a></li>
            <li><a href="#" class="magnetic" data-strength="10">Behance</a></li>
            <li><a href="#" class="magnetic" data-strength="10">Dribbble</a></li>
            <li><a href="#" class="magnetic" data-strength="10">Vimeo</a></li>
            <li><a href="#" class="magnetic" data-strength="10">LinkedIn</a></li>
          </ul>
        </div>
        
        <div class="footer-col-top">
          <button class="btn-back-to-top btn-magnetic" id="back-to-top" aria-label="Scroll to top">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="top-arrow">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
            <span>Back to Top</span>
          </button>
        </div>
      </div>
    </div>
  `;

  initFooterInteractions();
}

function initFooterInteractions() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      // Find lenis smooth scroll instance if window contains one
      if (window.lenis) {
        window.lenis.scrollTo(0, {
          duration: 1.8,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
