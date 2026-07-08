import { gsap } from 'gsap';

/**
 * Dynamically injects and initializes the shared footer on every page
 */
export function renderFooter() {
  const footerEl = document.getElementById('main-footer');
  if (!footerEl) return;

  // Read brand and social configuration dynamically
  let brandName = 'GROWLIX';
  let instagram = '#';
  let behance = '#';
  let dribbble = '#';
  let vimeo = '#';
  let linkedin = '#';
  let whatsappNumber = '917828950968';
  let whatsappMessage = 'Hello Growlix, I would like to inquire about your creative services.';

  let footerTagline = 'Premium media. Flawless motion. Crafting visual identities for premium brands globally.';

  let logoType = 'text';
  let logoImgUrl = '';
  let logoWidth = 120;

  try {
    const configLocal = JSON.parse(localStorage.getItem('growlix_landing_db') || '{}');
    if (configLocal.brandName) {
      brandName = configLocal.brandName;
    }
    instagram = configLocal.socialInstagram || '#';
    behance = configLocal.socialBehance || '#';
    dribbble = configLocal.socialDribbble || '#';
    vimeo = configLocal.socialVimeo || '#';
    linkedin = configLocal.socialLinkedIn || '#';
    whatsappNumber = configLocal.whatsappNumber || '917828950968';
    whatsappMessage = configLocal.whatsappMessage || 'Hello Growlix, I would like to inquire about your creative services.';
    footerTagline = configLocal.footerTagline || 'Premium media. Flawless motion. Crafting visual identities for premium brands globally.';
    logoType = configLocal.logoType || 'text';
    logoImgUrl = configLocal.logoImgUrl || '';
    logoWidth = Number(configLocal.logoWidth) || 120;
  } catch (e) {}

  const footerLogoContent = logoType === 'image' && logoImgUrl
    ? `<img src="${logoImgUrl}" alt="${brandName}" style="height: auto; width: ${logoWidth * 1.5}px; max-width: 100%; display: block; margin: 0 auto;" id="footer-logo-img">`
    : `<span class="footer-giant-logo font-syne">${brandName}</span>`;

  footerEl.innerHTML = `
    <div class="footer-container">
      <div class="footer-logo-row" style="display: flex; justify-content: center; align-items: center;">
        ${footerLogoContent}
      </div>

      <div class="footer-links-row">
        <div class="footer-col-brand">
          <p class="footer-brand-tagline">
            ${footerTagline}
          </p>
          <span class="footer-copyright">© 2026 ${brandName}. Handcrafted.</span>
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
            <li><a href="${instagram}" target="_blank" rel="noopener noreferrer" class="magnetic" data-strength="10">Instagram</a></li>
            <li><a href="${behance}" target="_blank" rel="noopener noreferrer" class="magnetic" data-strength="10">Behance</a></li>
            <li><a href="${dribbble}" target="_blank" rel="noopener noreferrer" class="magnetic" data-strength="10">Dribbble</a></li>
            <li><a href="${vimeo}" target="_blank" rel="noopener noreferrer" class="magnetic" data-strength="10">Vimeo</a></li>
            <li><a href="${linkedin}" target="_blank" rel="noopener noreferrer" class="magnetic" data-strength="10">LinkedIn</a></li>
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

  // Inject floating WhatsApp button dynamically
  let waFloat = document.getElementById('whatsapp-floating-btn');
  if (waFloat) waFloat.remove();

  waFloat = document.createElement('a');
  waFloat.id = 'whatsapp-floating-btn';
  waFloat.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  waFloat.target = '_blank';
  waFloat.rel = 'noopener noreferrer';
  waFloat.className = 'whatsapp-float';
  waFloat.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.371a9.936 9.936 0 0 0 4.779 1.229h.004c5.505 0 9.989-4.478 9.99-9.984A9.97 9.97 0 0 0 12.012 2zm4.721 13.56c-.244.688-1.22 1.251-1.685 1.298-.464.047-.905.215-2.955-.595-2.585-1.019-4.179-3.639-4.307-3.809-.129-.169-1.042-1.385-1.042-2.644 0-1.258.658-1.879.89-2.13.23-.25.503-.314.671-.314.168 0 .336.002.483.009.15.007.351-.056.549.423.2.487.683 1.666.743 1.785.06.119.098.257.019.414-.079.158-.178.258-.297.397-.12.139-.25.291-.356.39-.12.112-.245.234-.105.474.14.24.622 1.025 1.332 1.657.915.815 1.683 1.067 1.922 1.186.24.119.38.1.52-.06.14-.16.6-1.002.76-1.353.16-.35.32-.29.54-.21.22.08 1.396.658 1.636.777.24.119.4.178.46.277.06.1.06.574-.184 1.262z"/>
    </svg>
  `;
  document.body.appendChild(waFloat);

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
