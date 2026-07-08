import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeScrollTriggers = [];

async function renderContactContent() {
  const config = await db.getLandingConfig();
  if (!config) return;

  activeScrollTriggers.forEach(st => st.kill());
  activeScrollTriggers = [];

  // 1. Text overrides
  const contactSubtitle = document.getElementById('contact-subtitle-text');
  const contactTitle = document.getElementById('contact-title-text');
  const contactPitch = document.getElementById('contact-pitch-text');
  
  const contactEmailLink = document.getElementById('contact-email-link');
  const contactLocation = document.getElementById('contact-location-text');

  if (contactSubtitle) contactSubtitle.textContent = config.contactSubtitle || "CONNECT WITH US";
  if (contactTitle) contactTitle.innerHTML = config.contactTitle || "Let's Create Together.";
  if (contactPitch) contactPitch.textContent = config.contactPitch || "";
  
  if (contactEmailLink) {
    contactEmailLink.href = `mailto:${config.contactEmail}`;
    contactEmailLink.textContent = config.contactEmail;
  }
  if (contactLocation) contactLocation.textContent = config.contactLocation;

  // 2. FAQ Accordion
  const faqSubtitle = document.getElementById('faq-subtitle-text');
  const faqTitle = document.getElementById('faq-title-text');
  const faqList = document.getElementById('faq-list-container');

  if (faqSubtitle) faqSubtitle.textContent = config.faqSubtitle || "FAQ";
  if (faqTitle) faqTitle.textContent = config.faqTitle || "Frequently Asked Questions.";

  if (faqList) {
    const faqData = [
      { prefix: 'faq1' },
      { prefix: 'faq2' },
      { prefix: 'faq3' }
    ];

    faqList.innerHTML = faqData.map(f => {
      const q = config[`${f.prefix}Q`] || '';
      const a = config[`${f.prefix}A`] || '';

      return `
        <div class="faq-item">
          <button class="faq-trigger">
            <span class="faq-question">${q}</span>
            <div class="faq-icon">
              <span class="faq-line-h"></span>
              <span class="faq-line-v"></span>
            </div>
          </button>
          <div class="faq-answer" style="height: 0; overflow: hidden;">
            <div class="faq-answer-inner">
              <p>${a}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function initContactAnimations() {
  // Setup inputs labels alignment triggers
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    // Focus effect lines
    const line = input.nextElementSibling?.nextElementSibling;
    input.addEventListener('focus', () => {
      if (line && line.classList.contains('form-line')) {
        line.style.width = '100%';
      }
    });
    input.addEventListener('blur', () => {
      if (line && line.classList.contains('form-line') && !input.value) {
        line.style.width = '0';
      }
    });
  });

  // FAQs Accordion Listeners
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const trigger = item.querySelector('.faq-trigger');
    const answer = item.querySelector('.faq-answer');
    
    if (trigger && answer) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        faqItems.forEach((otherItem) => {
          if (otherItem !== item && otherItem.classList.contains('active')) {
            otherItem.classList.remove('active');
            const otherAnswer = otherItem.querySelector('.faq-answer');
            gsap.to(otherAnswer, { height: 0, duration: 0.4, ease: 'power2.inOut' });
          }
        });
        
        if (!isActive) {
          item.classList.add('active');
          if (prefersReducedMotion) {
            gsap.set(answer, { height: 'auto' });
          } else {
            gsap.to(answer, { 
              height: 'auto', 
              duration: 0.45,
              ease: 'power2.inOut',
              onComplete: () => ScrollTrigger.refresh() 
            });
          }
        } else {
          item.classList.remove('active');
          if (prefersReducedMotion) {
            gsap.set(answer, { height: 0 });
          } else {
            gsap.to(answer, { 
              height: 0, 
              duration: 0.45, 
              ease: 'power2.inOut',
              onComplete: () => ScrollTrigger.refresh() 
            });
          }
        }
      });
    }
  });

  // Fades
  if (prefersReducedMotion) {
    gsap.set('.contact-info, .contact-form-wrap, .faq-item', { opacity: 1, y: 0 });
    return;
  }

  const fadeElements = document.querySelectorAll('.contact-info, .contact-form-wrap, .faq-item');
  fadeElements.forEach(el => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.fromTo(el,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }
        );
      }
    });
    activeScrollTriggers.push(st);
  });

  ScrollTrigger.refresh();
}

function initContactForm() {
  const contactForm = document.getElementById('contact-form');
  const successMessage = document.getElementById('form-success');

  if (contactForm && successMessage) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('form-name').value;
      const email = document.getElementById('form-email').value;
      const message = document.getElementById('form-message').value;
      
      const interests = [];
      document.querySelectorAll('input[name="interest"]:checked').forEach(cb => {
        interests.push(cb.value);
      });
      const servicesText = interests.join(', ') || 'General Inquiry';

      try {
        await db.createQuery({
          name,
          email,
          query_type: 'contact',
          event_type: servicesText,
          message
        });
      } catch (err) {
        console.error("Failed to save contact query:", err);
      }
      
      const formTl = gsap.timeline();
      formTl.to(contactForm, { 
        opacity: 0, 
        y: -10, 
        duration: 0.4, 
        onComplete: () => {
          contactForm.style.display = 'none';
          successMessage.style.display = 'flex';
        }
      });
      formTl.fromTo(successMessage, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    });
  }
}

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('contact');
  renderContactContent().then(() => {
    initContactAnimations();
    initContactForm();

    // Entry Animations
    gsap.fromTo('.archive-main-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' });
    gsap.fromTo('.archive-tagline', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 });
  });
});
