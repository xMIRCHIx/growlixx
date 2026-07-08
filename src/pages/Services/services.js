import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeScrollTriggers = [];

async function renderServicesContent() {
  const config = await db.getLandingConfig();
  if (!config) return;

  activeScrollTriggers.forEach(st => st.kill());
  activeScrollTriggers = [];

  // 1. Capabilities / Services
  const servicesSubtitle = document.getElementById('services-subtitle-text');
  const servicesTitle = document.getElementById('services-title-text');
  const servicesList = document.getElementById('services-list-container');

  if (servicesSubtitle) servicesSubtitle.textContent = config.servicesSubtitle || "CAPABILITIES";
  if (servicesTitle) servicesTitle.textContent = config.servicesTitle || "Detailed Services & Software stacks.";

  if (servicesList) {
    const servicesData = [
      { prefix: 'service1', key: 'photography' },
      { prefix: 'service2', key: 'videography' },
      { prefix: 'service3', key: 'design' },
      { prefix: 'service4', key: 'development' }
    ];

    servicesList.innerHTML = servicesData.map(s => {
      const num = config[`${s.prefix}Num`] || '';
      const title = config[`${s.prefix}Title`] || '';
      const desc = config[`${s.prefix}Desc`] || '';
      const tagsRaw = config[`${s.prefix}Tags`] || '';
      const img = config[`${s.prefix}Img`] || '';
      const tagsList = tagsRaw.split(',').map(t => `<li>${t.trim()}</li>`).join('');

      return `
        <div class="service-card" data-service="${s.key}">
          <div class="service-collapsed-row">
            <span class="service-num">${num}</span>
            <h3 class="service-title">${title}</h3>
            <div class="service-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="service-arrow">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>
          <div class="service-expanded-content" style="height:0; opacity:0; overflow:hidden;">
            <div class="service-content-inner">
              <div class="service-text-col">
                <p class="service-desc">${desc}</p>
                <ul class="service-details-list">
                  ${tagsList}
                </ul>
              </div>
              <div class="service-media-col">
                <div class="service-preview-wrapper">
                  <img src="${img}" alt="${title} Preview" class="service-preview-img">
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Bento Grid (Why Choose Us)
  const bentoSubtitle = document.getElementById('bento-subtitle-text');
  const bentoTitle = document.getElementById('bento-title-text');
  const bentoGrid = document.getElementById('bento-grid-container');

  if (bentoSubtitle) bentoSubtitle.textContent = config.bentoSubtitle;
  if (bentoTitle) bentoTitle.textContent = config.bentoTitle;

  if (bentoGrid) {
    bentoGrid.innerHTML = `
      <div class="bento-item bento-intro fade-in-up">
        <span class="bento-num">${config.bentoItem1Num}</span>
        <h3>${config.bentoItem1Title}</h3>
        <p>${config.bentoItem1Desc}</p>
      </div>
      <div class="bento-item bento-feature-1 fade-in-up">
        <span class="bento-num">${config.bentoItem2Num}</span>
        <h3>${config.bentoItem2Title}</h3>
        <p>${config.bentoItem2Desc}</p>
      </div>
      <div class="bento-item bento-detail fade-in-up">
        <span class="bento-num">${config.bentoItem3Num}</span>
        <h3>${config.bentoItem3Title}</h3>
        <p>${config.bentoItem3Desc}</p>
      </div>
      <div class="bento-item bento-wide fade-in-up">
        <span class="bento-num">${config.bentoItem4Num}</span>
        <h3>${config.bentoItem4Title}</h3>
        <p>${config.bentoItem4Desc}</p>
      </div>
    `;
  }

  // 3. Creative Process steps
  const processSubtitle = document.getElementById('process-subtitle-text');
  const processTitle = document.getElementById('process-title-text');
  const processScroll = document.getElementById('process-scroll-element');

  if (processSubtitle) processSubtitle.textContent = config.processSubtitle;
  if (processTitle) processTitle.textContent = config.processTitle;

  if (processScroll) {
    const steps = [
      { prefix: 'processStep1', last: false },
      { prefix: 'processStep2', last: false },
      { prefix: 'processStep3', last: false },
      { prefix: 'processStep4', last: false },
      { prefix: 'processStep5', last: true }
    ];

    processScroll.innerHTML = steps.map(s => {
      const num = config[`${s.prefix}Num`] || '';
      const title = config[`${s.prefix}Title`] || '';
      const desc = config[`${s.prefix}Desc`] || '';
      const barClass = s.last ? 'step-bar-end' : 'step-bar';

      return `
        <div class="process-step">
          <span class="step-number">${num}</span>
          <h3 class="step-title">${title}</h3>
          <p class="step-desc">${desc}</p>
          <div class="${barClass}"></div>
        </div>
      `;
    }).join('');
  }
}

function initServicesAnimations() {
  if (prefersReducedMotion) {
    gsap.set('.fade-in-up, .service-card, .bento-item', { opacity: 1, y: 0 });
    return;
  }

  // 1. Accorion Capability Cards
  const serviceCards = document.querySelectorAll('.service-card');
  serviceCards.forEach((card) => {
    const collapsedRow = card.querySelector('.service-collapsed-row');
    const expandedContent = card.querySelector('.service-expanded-content');
    const listItems = card.querySelectorAll('.service-details-list li');
    
    if (collapsedRow && expandedContent) {
      collapsedRow.addEventListener('click', () => {
        const isActive = card.classList.contains('active');
        
        serviceCards.forEach(otherCard => {
          if (otherCard !== card && otherCard.classList.contains('active')) {
            otherCard.classList.remove('active');
            const otherContent = otherCard.querySelector('.service-expanded-content');
            gsap.to(otherContent, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.inOut' });
          }
        });
        
        if (!isActive) {
          card.classList.add('active');
          gsap.fromTo(expandedContent, 
            { height: 0, opacity: 0 },
            { 
              height: 'auto', 
              opacity: 1, 
              duration: 0.5,
              ease: 'power3.inOut',
              onComplete: () => ScrollTrigger.refresh() 
            }
          );
          gsap.fromTo(listItems,
            { y: 8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out', delay: 0.1 }
          );
        } else {
          card.classList.remove('active');
          gsap.to(expandedContent, { 
            height: 0, 
            opacity: 0, 
            duration: 0.45, 
            ease: 'power3.inOut',
            onComplete: () => ScrollTrigger.refresh() 
          });
        }
      });
    }
  });

  // 2. Process Horizontal Scroll (Pin Scroll)
  const processScrollElement = document.getElementById('process-scroll-element');
  const processPinContainer = document.getElementById('process-pin-container');
  const progressBar = document.getElementById('process-progress-bar');
  
  if (processScrollElement && processPinContainer) {
    const getDisplacement = () => {
      return -(processScrollElement.scrollWidth - window.innerWidth + (window.innerWidth * 0.16));
    };

    const st = gsap.to(processScrollElement, {
      x: getDisplacement,
      ease: 'none',
      scrollTrigger: {
        trigger: '#process',
        pin: true,
        scrub: 1,
        start: 'top top',
        end: () => `+=${processScrollElement.scrollWidth - window.innerWidth + 350}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progressBar) {
            progressBar.style.width = `${self.progress * 100}%`;
          }
        }
      }
    });
    activeScrollTriggers.push(st.scrollTrigger);
  }

  // 3. Bento & Reveals Fades
  const fadeElements = document.querySelectorAll('.fade-in-up, .service-card, .bento-item');
  fadeElements.forEach(el => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
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

  ScrollTrigger.refresh();
}

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('services');
  renderServicesContent().then(() => {
    initServicesAnimations();

    // Entry Animations
    gsap.fromTo('.archive-main-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' });
    gsap.fromTo('.archive-tagline', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 });
  });
});
