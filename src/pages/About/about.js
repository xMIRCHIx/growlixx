import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeScrollTriggers = [];

async function renderAboutContent() {
  const config = await db.getLandingConfig();
  if (!config) return;

  activeScrollTriggers.forEach(st => st.kill());
  activeScrollTriggers = [];

  // Hero & Narrative
  const aboutSubtitle = document.getElementById('about-subtitle-text');
  const aboutTitle = document.getElementById('about-title-text');
  const aboutLead = document.getElementById('about-lead-text');
  const aboutBody = document.getElementById('about-body-text');

  const aboutStat1Num = document.getElementById('about-stat1-num');
  const aboutStat1Label = document.getElementById('about-stat1-label');
  const aboutStat2Num = document.getElementById('about-stat2-num');
  const aboutStat2Label = document.getElementById('about-stat2-label');
  const aboutStat3Num = document.getElementById('about-stat3-num');
  const aboutStat3Label = document.getElementById('about-stat3-label');

  const aboutCollageMain = document.getElementById('about-collage-main-img');
  const aboutCollageSub = document.getElementById('about-collage-sub-img');

  if (aboutSubtitle) aboutSubtitle.textContent = config.aboutSubtitle || "OUR STORY";
  if (aboutTitle) aboutTitle.innerHTML = config.aboutTitle || "Defining the Next Era of Luxury Media.";
  if (aboutLead) aboutLead.textContent = config.aboutLeadText || "";
  if (aboutBody) aboutBody.textContent = config.aboutBodyText || "";

  if (aboutStat1Num) {
    aboutStat1Num.setAttribute('data-count', config.aboutStat1Num);
    aboutStat1Num.textContent = '0';
  }
  if (aboutStat1Label) aboutStat1Label.textContent = config.aboutStat1Label;
  if (aboutStat2Num) {
    aboutStat2Num.setAttribute('data-count', config.aboutStat2Num);
    aboutStat2Num.textContent = '0';
  }
  if (aboutStat2Label) aboutStat2Label.textContent = config.aboutStat2Label;
  if (aboutStat3Num) {
    aboutStat3Num.setAttribute('data-count', config.aboutStat3Num);
    aboutStat3Num.textContent = '0';
  }
  if (aboutStat3Label) aboutStat3Label.textContent = config.aboutStat3Label;

  if (aboutCollageMain) aboutCollageMain.src = config.aboutCollageMain;
  if (aboutCollageSub) aboutCollageSub.src = config.aboutCollageSub;

  // Testimonials list
  const testCarousel = document.getElementById('testimonials-carousel');
  if (testCarousel) {
    const reviews = [
      { prefix: 'testimonial1' },
      { prefix: 'testimonial2' },
      { prefix: 'testimonial3' },
      { prefix: 'testimonial4' }
    ];

    testCarousel.innerHTML = reviews.map(r => {
      const quote = config[`${r.prefix}Quote`] || '';
      const author = config[`${r.prefix}Author`] || '';
      const role = config[`${r.prefix}Role`] || '';

      return `
        <div class="testimonial-card">
          <div class="testimonial-quote-icon">“</div>
          <p class="testimonial-quote">${quote}</p>
          <div class="testimonial-author-wrap">
            <h4 class="testimonial-author">${author}</h4>
            <span class="testimonial-role">${role}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

function initAboutAnimations() {
  if (prefersReducedMotion) {
    gsap.set('.fade-in-up, .stat-number', { opacity: 1, y: 0 });
    return;
  }

  // Stats Counters
  const statNumbers = document.querySelectorAll('.stat-number');
  statNumbers.forEach((stat) => {
    const targetCount = parseInt(stat.getAttribute('data-count'), 10) || 0;
    const countObj = { val: 0 };
    
    const st = ScrollTrigger.create({
      trigger: stat,
      start: 'top 95%',
      once: true,
      onEnter: () => {
        gsap.to(countObj, {
          val: targetCount,
          duration: 1.5,
          ease: 'power3.out',
          onUpdate: () => {
            stat.innerText = Math.floor(countObj.val);
          }
        });
      }
    });
    activeScrollTriggers.push(st);
  });

  // Testimonials Carousel Drag
  initTestimonialsDrag();

  // Fades
  const fadeElements = document.querySelectorAll('.fade-in-up, .body-paragraph, .stats-grid, .timeline-node');
  fadeElements.forEach(el => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        gsap.fromTo(el,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
        );
      }
    });
    activeScrollTriggers.push(st);
  });

  // Collage
  const maskImages = document.querySelectorAll('.mask-reveal, .collage-main, .collage-sub');
  maskImages.forEach((img) => {
    const st = ScrollTrigger.create({
      trigger: img,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        img.classList.add('revealed');
      }
    });
    activeScrollTriggers.push(st);
  });

  ScrollTrigger.refresh();
}

function initTestimonialsDrag() {
  const carouselWrapper = document.getElementById('testimonials-carousel-wrapper');
  const carousel = document.getElementById('testimonials-carousel');
  
  if (carouselWrapper && carousel) {
    let isDown = false;
    let startX;
    let xTranslation = 0;
    let velocity = 0;
    let animationFrameId = null;

    carousel.style.transform = 'translate3d(0px, 0, 0)';

    carouselWrapper.addEventListener('mousedown', (e) => {
      isDown = true;
      carousel.classList.add('dragging');
      startX = e.pageX - xTranslation;
      cancelAnimationFrame(animationFrameId);
    });

    carouselWrapper.addEventListener('mouseleave', () => {
      isDown = false;
      carousel.classList.remove('dragging');
      applyInertia();
    });

    carouselWrapper.addEventListener('mouseup', () => {
      isDown = false;
      carousel.classList.remove('dragging');
      applyInertia();
    });

    carouselWrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      
      const x = e.pageX;
      const walk = x - startX;
      const minTranslate = -(carousel.scrollWidth - carouselWrapper.clientWidth);
      const maxTranslate = 0;
      
      let targetTranslation = walk;
      if (targetTranslation > maxTranslate) {
        targetTranslation = targetTranslation * 0.3;
      } else if (targetTranslation < minTranslate) {
        targetTranslation = minTranslate + (targetTranslation - minTranslate) * 0.3;
      }
      
      velocity = targetTranslation - xTranslation;
      xTranslation = targetTranslation;
      carousel.style.transform = `translate3d(${xTranslation}px, 0, 0)`;
    });

    // Touch support
    carouselWrapper.addEventListener('touchstart', (e) => {
      isDown = true;
      carousel.classList.add('dragging');
      startX = e.touches[0].pageX - xTranslation;
      cancelAnimationFrame(animationFrameId);
    });

    carouselWrapper.addEventListener('touchend', () => {
      isDown = false;
      carousel.classList.remove('dragging');
      applyInertia();
    });

    carouselWrapper.addEventListener('touchmove', (e) => {
      if (!isDown) return;
      const x = e.touches[0].pageX;
      const walk = x - startX;
      const minTranslate = -(carousel.scrollWidth - carouselWrapper.clientWidth);
      const maxTranslate = 0;
      
      let targetTranslation = walk;
      if (targetTranslation > maxTranslate) {
        targetTranslation = targetTranslation * 0.3;
      } else if (targetTranslation < minTranslate) {
        targetTranslation = minTranslate + (targetTranslation - minTranslate) * 0.3;
      }
      
      velocity = targetTranslation - xTranslation;
      xTranslation = targetTranslation;
      carousel.style.transform = `translate3d(${xTranslation}px, 0, 0)`;
    });

    function applyInertia() {
      const friction = 0.95;
      velocity *= friction;
      xTranslation += velocity;
      
      const minTranslate = -(carousel.scrollWidth - carouselWrapper.clientWidth);
      const maxTranslate = 0;
      
      if (xTranslation > maxTranslate) {
        xTranslation += (maxTranslate - xTranslation) * 0.15;
        velocity = 0;
      } else if (xTranslation < minTranslate) {
        xTranslation += (minTranslate - xTranslation) * 0.15;
        velocity = 0;
      }
      
      carousel.style.transform = `translate3d(${xTranslation}px, 0, 0)`;
      
      if (Math.abs(velocity) > 0.05 || xTranslation > maxTranslate || xTranslation < minTranslate) {
        animationFrameId = requestAnimationFrame(applyInertia);
      }
    }
  }
}

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('about');
  renderAboutContent().then(() => {
    initAboutAnimations();

    // Entry Animations
    gsap.fromTo('.archive-main-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' });
    gsap.fromTo('.archive-tagline', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 });
  });
});
