import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { renderHeader } from '../components/Header.js';
import { renderFooter } from '../components/Footer.js';
import { initPageTransitions } from '../animations/pageTransitions.js';

// Register GSAP plugins globally
gsap.registerPlugin(ScrollTrigger);

/**
 * Common bootstrapper for all physical pages.
 * Handles header, footer, Lenis scroll, and page entry transitions.
 * @param {string} pageName - The name of the active page ('home', 'portfolio', 'services', 'about', 'contact')
 * @returns {Object} The Lenis smooth scroll instance
 */
export function initPage(pageName) {
  // 1. Render components (skip header/footer on admin page)
  if (pageName !== 'admin') {
    renderHeader(pageName);
    renderFooter();
  }

  // 2. Initialize Page Transitions
  initPageTransitions();

  // 3. Initialize Lenis Smooth Scrolling
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis = null;

  if (!prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
      infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
    
    // Bind to window for components to access
    window.lenis = lenis;
  }

  // Refresh ScrollTrigger after elements render
  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 100);

  return lenis;
}
