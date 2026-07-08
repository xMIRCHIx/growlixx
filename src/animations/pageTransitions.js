import { gsap } from 'gsap';

/**
 * Initializes premium full-page transitions using a GSAP slide overlay
 */
export function initPageTransitions() {
  let overlay = document.getElementById('page-transition-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #121212;
      z-index: 99999;
      pointer-events: all;
      transform: translateY(0);
    `;
    document.body.appendChild(overlay);
  }

  // Ensure pointer-events are active during animation block
  overlay.style.pointerEvents = 'all';

  // 1. Page Entry Transition (Reveal Content on Load)
  gsap.fromTo(overlay, 
    { yPercent: 0 },
    { 
      yPercent: -100, 
      duration: 0.75, 
      ease: 'power3.inOut',
      onComplete: () => {
        overlay.style.pointerEvents = 'none';
      }
    }
  );

  // 2. Intercept Click on Links for Page Exit Transition
  document.body.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Check if it's an internal page navigation (not hash anchors, external sites, or mailto/tel)
    const isHash = href.startsWith('#');
    const isMailTo = href.startsWith('mailto:');
    const isTel = href.startsWith('tel:');
    const isExternal = href.startsWith('http') && !href.includes(window.location.host);

    if (isHash || isMailTo || isTel || isExternal) return;

    // Skip if admin edit clicks or dynamic case studies trigger redirects manually
    if (anchor.classList.contains('no-transition') || anchor.closest('#view-admin')) return;

    e.preventDefault();

    // Trigger page exit animation, then redirect
    overlay.style.pointerEvents = 'all';
    gsap.fromTo(overlay,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 0.6,
        ease: 'power3.inOut',
        onComplete: () => {
          window.location.href = href;
        }
      }
    );
  });
}
