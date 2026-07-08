import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeScrollTriggers = [];

async function renderHomeContent() {
  const config = await db.getLandingConfig();
  if (!config) return;

  // Clear old ScrollTriggers
  activeScrollTriggers.forEach(st => st.kill());
  activeScrollTriggers = [];

  // 1. Hero Content
  const heroBgImg = document.getElementById('hero-bg-media-img');
  const heroTagline = document.getElementById('hero-tagline-text');
  const heroTitle = document.getElementById('hero-title-text');
  const heroDesc = document.getElementById('hero-desc-text');

  if (heroBgImg) heroBgImg.src = config.heroBgImg;
  if (heroTagline) heroTagline.textContent = config.heroTagline;
  if (heroTitle) heroTitle.innerHTML = config.heroTitle;
  if (heroDesc) heroDesc.textContent = config.heroDescription;

  // 2. About Content
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

  if (aboutSubtitle) aboutSubtitle.textContent = config.aboutSubtitle;
  if (aboutTitle) aboutTitle.innerHTML = config.aboutTitle;
  if (aboutLead) aboutLead.textContent = config.aboutLeadText;
  if (aboutBody) aboutBody.textContent = config.aboutBodyText;

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

  // 3. Featured Services (Capabilities)
  const servicesSubtitle = document.getElementById('services-subtitle-text');
  const servicesTitle = document.getElementById('services-title-text');
  const servicesList = document.getElementById('services-list-container');

  if (servicesSubtitle) servicesSubtitle.textContent = config.servicesSubtitle || "OUR CAPABILITIES";
  if (servicesTitle) servicesTitle.textContent = config.servicesTitle || "Handcrafted Services.";

  if (servicesList) {
    const servicesData = [
      { prefix: 'service1', key: 'social-media' },
      { prefix: 'service2', key: 'web-app-dev' },
      { prefix: 'service3', key: 'video-editing' },
      { prefix: 'service4', key: 'graphics-design' },
      { prefix: 'service5', key: 'brand-identity' },
      { prefix: 'service6', key: 'photography-videography' }
    ];

    servicesList.innerHTML = servicesData.map(s => {
      const num = config[`${s.prefix}Num`] || '';
      const title = config[`${s.prefix}Title`] || '';
      const desc = config[`${s.prefix}Desc`] || '';
      const tagsRaw = config[`${s.prefix}Tags`] || '';
      const img = config[`${s.prefix}Img`] || '';
      const tagsList = tagsRaw.split(',').map(t => `<li class="service-card-tag">${t.trim()}</li>`).join('');

      return `
        <div class="service-card" data-service="${s.key}">
          ${img ? `
            <div class="service-card-img-wrap">
              <img src="${img}" alt="${title} Preview" class="service-card-img">
            </div>
          ` : ''}
          <div class="service-card-header">
            <h3 class="service-card-title">${title}</h3>
            <span class="service-card-num">${num}</span>
          </div>
          <p class="service-card-desc">${desc}</p>
          <ul class="service-card-tags">
            ${tagsList}
          </ul>
        </div>
      `;
    }).join('');
  }

  // 4. Featured Portfolio (6 published & featured projects)
  const list = await db.getProjects();
  const publishedProjects = list.filter(p => p.status === 'published');
  const featured = publishedProjects.filter(p => p.featured).slice(0, 6);
  const finalFeaturedList = featured.length >= 6 ? featured : publishedProjects.slice(0, 6);

  const portfolioGrid = document.getElementById('featured-portfolio-grid');
  if (portfolioGrid) {
    if (finalFeaturedList.length === 0) {
      portfolioGrid.innerHTML = `
        <div style="grid-column: span 12; text-align: center; padding: 4rem 2rem; color: rgba(18,18,18,0.4);">
          <p class="font-accent">No published work found.</p>
        </div>
      `;
    } else {
      portfolioGrid.innerHTML = finalFeaturedList.map((project, idx) => {
        const sizeClass = idx % 3 === 0 ? 'p-large' : 'p-medium';
        const videoMarkup = project.videoUrl
          ? `<video src="${project.videoUrl}" loop muted playsinline class="portfolio-hover-video" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.4s ease; pointer-events: none; z-index: 1;"></video>`
          : '';

        return `
          <div class="portfolio-item ${sizeClass} fade-in-up" data-id="${project.id}" style="cursor: pointer;">
            <div class="portfolio-img-container">
              <img src="${project.thumbnail}" alt="${project.title}" class="portfolio-img">
              ${videoMarkup}
              <div class="portfolio-overlay">
                <div class="portfolio-overlay-content">
                  <span class="portfolio-cat">${project.category.toUpperCase()}</span>
                  <h3 class="portfolio-name">${project.title}</h3>
                </div>
              </div>
            </div>
            <div class="portfolio-details">
              <span class="portfolio-meta">${project.category.toUpperCase()} / ${project.client.toUpperCase()}</span>
              <h4 class="portfolio-card-title">${project.title}</h4>
            </div>
          </div>
        `;
      }).join('');

      setupCardInteractions(portfolioGrid, publishedProjects);
    }
  }

  // 5. Testimonials
  const testSubtitle = document.getElementById('testimonials-subtitle-text');
  const testTitle = document.getElementById('testimonials-title-text');
  const testCarousel = document.getElementById('testimonials-carousel');

  if (testSubtitle) testSubtitle.textContent = config.testimonialsSubtitle;
  if (testTitle) testTitle.textContent = config.testimonialsTitle;

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

  // 6. Contact Inquiries Parameters
  const contactEmailLink = document.getElementById('contact-email-link');
  const contactLocation = document.getElementById('contact-location-text');
  if (contactEmailLink) {
    contactEmailLink.href = `mailto:${config.contactEmail}`;
    contactEmailLink.textContent = config.contactEmail;
  }
  if (contactLocation) {
    contactLocation.textContent = config.contactLocation;
  }
}

function setupCardInteractions(container, projects) {
  container.querySelectorAll('.portfolio-item').forEach(item => {
    const projectId = item.getAttribute('data-id');
    const project = projects.find(p => String(p.id) === String(projectId));
    const hoverVideo = item.querySelector('.portfolio-hover-video');
    const hoverImg = item.querySelector('.portfolio-img');

    item.addEventListener('click', () => {
      if (project) {
        openMediaLightbox(project);
      }
    });

    item.addEventListener('mouseenter', () => {
      if (hoverVideo) {
        hoverVideo.style.opacity = '1';
        hoverVideo.play().catch(e => console.log("Video autoplay blocked:", e));
      }
      if (hoverImg) {
        hoverImg.style.transform = 'scale(1.04)';
      }
    });

    item.addEventListener('mouseleave', () => {
      if (hoverVideo) {
        hoverVideo.style.opacity = '0';
        hoverVideo.pause();
        hoverVideo.currentTime = 0;
      }
      if (hoverImg) {
        hoverImg.style.transform = 'scale(1)';
      }
    });
  });
}

function openMediaLightbox(project) {
  const modal = document.getElementById('media-lightbox-modal');
  const mediaContainer = document.getElementById('lightbox-media-container');
  const catEl = document.getElementById('lightbox-category');
  const titleEl = document.getElementById('lightbox-title');
  const descEl = document.getElementById('lightbox-description');
  const closeBtn = document.getElementById('btn-lightbox-close');

  if (!modal || !mediaContainer) return;

  mediaContainer.innerHTML = '';

  if (catEl) catEl.textContent = project.category.toUpperCase();
  if (titleEl) titleEl.textContent = project.title;
  
  const clientInfo = project.client ? ` | CLIENT: ${project.client.toUpperCase()}` : '';
  if (catEl) catEl.textContent = `${project.category.toUpperCase()}${clientInfo}`;
  if (descEl) descEl.textContent = project.detailedDescription || project.shortDescription || '';

  if (project.videoUrl) {
    const isYoutube = project.videoUrl.includes('youtube.com') || project.videoUrl.includes('youtu.be');
    if (isYoutube) {
      const embed = getYoutubeEmbedUrl(project.videoUrl);
      mediaContainer.innerHTML = `<iframe src="${embed}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width: 1000px; height: 560px; max-width: 100%; aspect-ratio: 16/9; border-radius: 4px;"></iframe>`;
    } else {
      mediaContainer.innerHTML = `<video src="${project.videoUrl}" controls autoplay style="max-width: 100%; max-height: 60vh; border-radius: 4px;"></video>`;
    }
  } else {
    const images = [project.thumbnail, ...(project.gallery || [])].filter(Boolean);
    if (images.length > 1) {
      let currentSlide = 0;
      mediaContainer.innerHTML = `
        <div class="lightbox-slider" style="position: relative; width: 100%; height: 60vh; display: flex; justify-content: center; align-items: center; background: #000;">
          ${images.map((img, i) => `
            <img class="lightbox-slide" src="${img}" style="max-width: 100%; max-height: 60vh; object-fit: contain; display: ${i === 0 ? 'block' : 'none'}; border-radius: 4px;">
          `).join('')}
          <button class="slider-nav-btn prev" style="position: absolute; left: 1.5rem; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); border: none; color: #fff; font-size: 2.5rem; cursor: pointer; padding: 0.5rem 1.2rem; border-radius: 4px; z-index: 10; line-height: 1;">&lsaquo;</button>
          <button class="slider-nav-btn next" style="position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); border: none; color: #fff; font-size: 2.5rem; cursor: pointer; padding: 0.5rem 1.2rem; border-radius: 4px; z-index: 10; line-height: 1;">&rsaquo;</button>
        </div>
      `;

      const slides = mediaContainer.querySelectorAll('.lightbox-slide');
      const prevBtn = mediaContainer.querySelector('.slider-nav-btn.prev');
      const nextBtn = mediaContainer.querySelector('.slider-nav-btn.next');

      const showSlide = (idx) => {
        slides.forEach((slide, i) => {
          slide.style.display = i === idx ? 'block' : 'none';
        });
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentSlide = (currentSlide - 1 + slides.length) % slides.length;
          showSlide(currentSlide);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          currentSlide = (currentSlide + 1) % slides.length;
          showSlide(currentSlide);
        });
      }
    } else if (images.length === 1) {
      mediaContainer.innerHTML = `<img src="${images[0]}" style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px;">`;
    } else {
      mediaContainer.innerHTML = `<div style="color: #777; padding: 4rem;">No preview media available</div>`;
    }
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  gsap.fromTo(modal, 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: () => { modal.style.pointerEvents = 'auto'; } }
  );

  const closeHandler = () => {
    gsap.to(modal, {
      opacity: 0,
      duration: 0.35,
      ease: 'power2.inOut',
      onComplete: () => {
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
        document.body.style.overflow = '';
        mediaContainer.innerHTML = '';
      }
    });
    closeBtn.removeEventListener('click', closeHandler);
    modal.removeEventListener('click', bgClickHandler);
  };

  const bgClickHandler = (e) => {
    if (e.target === modal || e.target.classList.contains('lightbox-content-container') || e.target.id === 'lightbox-media-container') {
      closeHandler();
    }
  };

  closeBtn.addEventListener('click', closeHandler);
  modal.addEventListener('click', bgClickHandler);
}

function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  let videoId = '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  }
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }
  return url;
}

function initHomeAnimations() {
  if (prefersReducedMotion) {
    gsap.set(['.main-header', '.hero-tagline', '.hero-title', '.hero-description', '.hero-cta-wrap', '.hero-bg-img'], { opacity: 1, y: 0, scale: 1 });
    gsap.set('.fade-in-up, .lead-paragraph, .body-paragraph, .stats-grid, .service-card, .testimonials-carousel-wrapper', { opacity: 1, y: 0 });
    return;
  }

  // 1. Initial Load timeline
  const timelines = gsap.timeline();
  timelines
    .fromTo('.main-header', { y: -25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' })
    .fromTo('.hero-bg-img', { scale: 1.05, opacity: 0 }, { scale: 1, opacity: 0.58, duration: 1.2, ease: 'power3.out' }, '-=0.6')
    .fromTo('.hero-tagline', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.9')
    .fromTo('.hero-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }, '-=0.75')
    .fromTo('.hero-description', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out' }, '-=0.65')
    .fromTo('.hero-cta-wrap', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.6');

  // 2. Scroll count trigger
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

  // 3. Static Service Cards (No accordions required)

  // 4. Testimonials Drag
  initTestimonialsDrag();

  // 5. Horizontal Timeline Scroll
  const scrollSection = document.getElementById('process-horizontal-scroll');
  const scrollWrapper = document.getElementById('process-scroll-wrapper');
  const scrollBar = document.getElementById('process-scroll-bar');
  
  if (scrollSection && scrollWrapper) {
    const scrollDistance = scrollSection.scrollWidth - scrollWrapper.clientWidth;
    
    if (scrollDistance > 0) {
      const st = ScrollTrigger.create({
        trigger: '#process',
        start: 'top top',
        end: `+=${scrollDistance * 1.5}`,
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          gsap.set(scrollSection, { x: -scrollDistance * self.progress });
          if (scrollBar) gsap.set(scrollBar, { width: `${self.progress * 100}%` });
        }
      });
      activeScrollTriggers.push(st);
    }
  }

  // 6. General Scroll Fade Reveals
  const fadeElements = document.querySelectorAll('.fade-in-up, .lead-paragraph, .body-paragraph, .stats-grid, .service-card, .testimonials-carousel-wrapper, .portfolio-item, .section-card-wrapper');
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

  // Masks
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
          successMessage.style.display = 'block';
        }
      });
      formTl.fromTo(successMessage, 
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
    });
  }
}

/* ==========================================================================
   INTERACTIVE APPOINTMENT CALENDAR SCHEDULER MODULE
   ========================================================================== */
function initAppointmentScheduler() {
  let currentDate = new Date();
  let selectedDate = null;
  let selectedTimeSlot = null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const monthYearDisplay = document.getElementById('calendar-month-year');
  const daysGrid = document.getElementById('calendar-days-grid');
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  const selectedDateDisplay = document.getElementById('booking-selected-date-display');
  const timeSlotsGrid = document.getElementById('booking-time-slots-grid');
  
  const bookingForm = document.getElementById('appointment-booking-form');
  const successContainer = document.getElementById('appointment-success-container');
  const successDateTime = document.getElementById('success-confirmed-datetime');
  const resetSchedulerBtn = document.getElementById('btn-reset-booking-scheduler');

  if (!daysGrid || !bookingForm) return;

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (monthYearDisplay) {
      monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
    }

    daysGrid.innerHTML = '';

    // First day of the month
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0).getDate();
    // Today's date
    const today = new Date();

    // Render blank spaces for previous month offset
    for (let i = 0; i < firstDayIndex; i++) {
      const blank = document.createElement('div');
      daysGrid.appendChild(blank);
    }

    // Render current month days
    for (let day = 1; day <= lastDay; day++) {
      const dayEl = document.createElement('div');
      dayEl.classList.add('calendar-day');
      dayEl.textContent = day;

      const dateOfEl = new Date(year, month, day);

      // Disable past days
      // Normalize dates to midnight for clean comparison
      const checkDate = new Date(dateOfEl.getFullYear(), dateOfEl.getMonth(), dateOfEl.getDate());
      const checkToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (checkDate < checkToday) {
        dayEl.classList.add('disabled');
      } else {
        // Today indicator
        if (checkDate.getTime() === checkToday.getTime()) {
          dayEl.classList.add('today');
        }

        // Highlight selected day
        if (selectedDate && checkDate.getTime() === selectedDate.getTime()) {
          dayEl.classList.add('selected');
        }

        dayEl.addEventListener('click', () => {
          selectedDate = dateOfEl;
          
          const formatted = `${monthNames[month]} ${day}, ${year}`;
          selectedDateDisplay.value = formatted;
          
          // Re-render days to highlight selected
          renderCalendar();
        });
      }

      daysGrid.appendChild(dayEl);
    }
  }

  // Month navigation links
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // Slot Selection Event
  if (timeSlotsGrid) {
    const chips = timeSlotsGrid.querySelectorAll('.slot-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedTimeSlot = chip.getAttribute('data-time');
      });
    });
  }

  // Form submit intercept
  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedDate) {
      alert("Please choose a date from the calendar on the right side.");
      return;
    }
    if (!selectedTimeSlot) {
      alert("Please select a time slot for your creative briefing.");
      return;
    }

    const clientName = document.getElementById('booking-client-name').value;
    const clientEmail = document.getElementById('booking-client-email').value;
    const clientDesc = document.getElementById('booking-client-desc').value;
    const dateFormatted = selectedDateDisplay.value;

    db.createQuery({
      name: clientName,
      email: clientEmail,
      query_type: 'booking',
      event_type: 'Creative Briefing',
      event_date: `${dateFormatted} at ${selectedTimeSlot}`,
      message: clientDesc
    }).catch(err => console.error("Failed to save booking query:", err));

    successDateTime.textContent = `${dateFormatted} at ${selectedTimeSlot}`;

    const submitTl = gsap.timeline();
    submitTl.to(bookingForm, {
      opacity: 0,
      y: -15,
      duration: 0.4,
      onComplete: () => {
        bookingForm.style.display = 'none';
        successContainer.style.display = 'flex';
      }
    });

    submitTl.fromTo(successContainer,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    );
  });

  // Reset form to book another
  if (resetSchedulerBtn) {
    resetSchedulerBtn.addEventListener('click', () => {
      bookingForm.reset();
      selectedDate = null;
      selectedTimeSlot = null;
      selectedDateDisplay.value = "Please select a date on the calendar...";
      
      if (timeSlotsGrid) {
        timeSlotsGrid.querySelectorAll('.slot-chip').forEach(c => c.classList.remove('selected'));
      }

      const resetTl = gsap.timeline();
      resetTl.to(successContainer, {
        opacity: 0,
        y: 15,
        duration: 0.4,
        onComplete: () => {
          successContainer.style.display = 'none';
          bookingForm.style.display = 'block';
          bookingForm.style.opacity = '1';
          bookingForm.style.transform = 'translateY(0)';
          renderCalendar();
        }
      });
    });
  }

  renderCalendar();
}

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('home');
  renderHomeContent().then(() => {
    initHomeAnimations();
    initContactForm();
    initAppointmentScheduler();
  });
});
