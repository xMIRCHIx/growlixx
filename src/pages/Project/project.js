import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let activeScrollTriggers = [];

async function renderProjectDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  
  if (!id) {
    window.location.href = '/portfolio.html';
    return;
  }

  const project = await db.getProjectById(id);
  if (!project) {
    window.location.href = '/portfolio.html';
    return;
  }

  // Set page title dynamically
  document.title = `Growlix Digital — ${project.title} (${project.category})`;

  const allProjects = (await db.getProjects()).filter(p => p.status === 'published');
  const currentIndex = allProjects.findIndex(p => p.id === String(id));

  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : allProjects[allProjects.length - 1];
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : allProjects[0];

  let related = allProjects.filter(p => p.category === project.category && p.id !== project.id);
  if (related.length === 0) {
    related = allProjects.filter(p => p.id !== project.id);
  }
  related = related.slice(0, 3);

  const container = document.getElementById('project-details-content');
  if (!container) return;

  // Cover image/video markup
  let heroMediaMarkup = '';
  if (project.videoUrl) {
    heroMediaMarkup = `
      <video src="${project.videoUrl}" autoplay loop muted playsinline class="details-hero-video" style="width:100%; height:100%; object-fit:cover;"></video>
    `;
  } else {
    heroMediaMarkup = `
      <img src="${project.coverImage}" alt="${project.title}" class="details-hero-img" style="width:100%; height:100%; object-fit:cover;">
    `;
  }

  // Gallery items markup
  const galleryMarkup = (project.gallery || []).map(imgUrl => `
    <div class="gallery-item-details mask-reveal">
      <img src="${imgUrl}" alt="Gallery asset" class="zoom-img" style="width:100%; height:100%; object-fit:cover;">
    </div>
  `).join('');

  // Related projects markup
  const relatedMarkup = related.map(rel => `
    <div class="related-card btn-magnetic" data-id="${rel.id}" style="cursor: pointer;">
      <div class="related-img-container">
        <img src="${rel.thumbnail}" alt="${rel.title}">
        <div class="related-overlay">
          <span>${rel.category.toUpperCase()}</span>
        </div>
      </div>
      <h4 class="related-card-title">${rel.title}</h4>
      <span class="related-card-client">${rel.client}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <!-- Case Study Header Back Nav -->
    <div class="details-nav-bar" style="padding: 0 6%; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
      <a href="/portfolio.html" class="btn-back-archive btn-magnetic">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="back-arrow" style="width: 16px; height: 16px; margin-right: 8px;">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Archive</span>
      </a>
      <span class="details-nav-indicator font-accent">CASE STUDY / ${project.category.toUpperCase()}</span>
    </div>

    <!-- Immersive Cover Banner -->
    <section class="details-hero-section">
      <div class="details-hero-canvas">
        ${heroMediaMarkup}
        <div class="details-hero-overlay"></div>
      </div>
      <div class="details-hero-heading-wrap">
        <span class="details-hero-client font-accent fade-up">${project.client.toUpperCase()}</span>
        <h1 class="details-hero-title reveal-text">${project.title}</h1>
      </div>
    </section>

    <!-- Editorial Project Info & Metadata -->
    <section class="details-meta-section">
      <div class="details-meta-grid">
        <div class="meta-desc-col fade-up">
          <h2 class="meta-section-header">The Overview</h2>
          <p class="meta-desc-text" style="font-size: 1.1rem; line-height: 1.7;">${project.detailedDescription}</p>
        </div>
        <div class="meta-table-col fade-up">
          <div class="meta-table-row">
            <span class="meta-label">Client</span>
            <span class="meta-value">${project.client}</span>
          </div>
          <div class="meta-table-row">
            <span class="meta-label">Category</span>
            <span class="meta-value">${project.category}</span>
          </div>
          <div class="meta-table-row">
            <span class="meta-label">Completion</span>
            <span class="meta-value">${project.completionDate}</span>
          </div>
          <div class="meta-table-row">
            <span class="meta-label">Technologies</span>
            <span class="meta-value">${project.technologies}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Case Study Challenge & Solution -->
    <section class="details-case-narrative">
      <div class="narrative-grid">
        <div class="narrative-block fade-up">
          <div class="narrative-tag font-accent">THE CHALLENGE</div>
          <h3 class="narrative-heading">Pushing the Boundaries.</h3>
          <p class="narrative-text">${project.challenge}</p>
        </div>
        <div class="narrative-block fade-up">
          <div class="narrative-tag font-accent">THE SOLUTION</div>
          <h3 class="narrative-heading">Bespoke Strategic Execution.</h3>
          <p class="narrative-text">${project.solution}</p>
        </div>
      </div>
    </section>

    <!-- Before & After Comparison Slider -->
    ${project.beforeImage && project.afterImage ? `
      <section class="details-slider-section fade-up">
        <div class="slider-section-header">
          <span class="section-subtitle">VISUAL METAMORPHOSIS</span>
          <h2 class="section-title">Color Grading & Retouching</h2>
          <p class="slider-section-desc">Drag the center handle horizontally to compare raw capture vs finalized editorial grading</p>
        </div>
        
        <div class="before-after-slider" id="project-ba-slider">
          <div class="ba-image ba-before">
            <img src="${project.beforeImage}" alt="Before Grade">
            <div class="ba-label">Raw Capture</div>
          </div>
          <div class="ba-image ba-after" id="ba-after-wrapper">
            <img src="${project.afterImage}" alt="Final Grade">
            <div class="ba-label">Final Production</div>
          </div>
          <div class="ba-drag-handle" id="ba-drag-handle">
            <div class="ba-handle-line"></div>
            <div class="ba-handle-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 12px; height: 12px;">
                <path d="M8 5l-5 7 5 7M16 5l5 7-5 7" />
              </svg>
            </div>
            <div class="ba-handle-line"></div>
          </div>
        </div>
      </section>
    ` : ''}

    <!-- Photo Gallery -->
    ${galleryMarkup ? `
      <section class="details-gallery-section">
        <div class="details-gallery-grid">
          ${galleryMarkup}
        </div>
      </section>
    ` : ''}

    <!-- Related Works -->
    ${relatedMarkup ? `
      <section class="details-related-section">
        <div class="related-header">
          <span class="section-subtitle">NEXT SELECTIONS</span>
          <h2 class="section-title">Related Projects</h2>
        </div>
        <div class="related-projects-grid">
          ${relatedMarkup}
        </div>
      </section>
    ` : ''}

    <!-- Previous / Next Case Study Pagination Navigation -->
    <section class="details-prev-next-nav">
      <div class="prev-next-container">
        <a href="/project.html?id=${prevProject.id}" class="nav-prev-link btn-magnetic">
          <span class="nav-direction font-accent">PREVIOUS PROJECT</span>
          <span class="nav-title">${prevProject.title}</span>
        </a>
        <a href="/project.html?id=${nextProject.id}" class="nav-next-link btn-magnetic">
          <span class="nav-direction font-accent" style="text-align: right;">NEXT PROJECT</span>
          <span class="nav-title" style="text-align: right;">${nextProject.title}</span>
        </a>
      </div>
    </section>
  `;

  bindSliderInteraction();
  bindRelatedClickEvents(container);
  animateDetailsEntrance();
}

function bindSliderInteraction() {
  const slider = document.getElementById('project-ba-slider');
  const handle = document.getElementById('ba-drag-handle');
  if (!slider || !handle) return;

  let isDragging = false;
  slider.style.setProperty('--clip-percent', '50%');
  handle.style.left = '50%';

  const move = (clientX) => {
    const rect = slider.getBoundingClientRect();
    const x = clientX - rect.left;
    let percent = (x / rect.width) * 100;
    
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    slider.style.setProperty('--clip-percent', `${percent}%`);
    handle.style.left = `${percent}%`;
  };

  handle.addEventListener('mousedown', () => {
    isDragging = true;
    slider.classList.add('dragging');
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    slider.classList.remove('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    move(e.clientX);
  });

  handle.addEventListener('touchstart', () => {
    isDragging = true;
    slider.classList.add('dragging');
  });

  window.addEventListener('touchend', () => {
    isDragging = false;
    slider.classList.remove('dragging');
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    move(e.touches[0].clientX);
  });

  slider.addEventListener('click', (e) => {
    if (e.target === handle || handle.contains(e.target)) return;
    move(e.clientX);
  });
}

function bindRelatedClickEvents(container) {
  container.querySelectorAll('.related-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      window.location.href = `/project.html?id=${id}`;
    });
  });
}

function animateDetailsEntrance() {
  if (prefersReducedMotion) {
    gsap.set('.fade-up, .reveal-text, .mask-reveal', { opacity: 1, y: 0 });
    return;
  }

  // Cover fade-in
  gsap.fromTo('.details-hero-canvas', { scale: 1.04, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' });

  // Stagger reveal titles
  gsap.fromTo('.details-hero-client', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.3 });
  gsap.fromTo('.details-hero-title', { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.45 });

  // Fade up content blocks
  const fades = document.querySelectorAll('.fade-up');
  fades.forEach(el => {
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

  const maskImages = document.querySelectorAll('.mask-reveal');
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

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('portfolio');
  renderProjectDetails();
});
