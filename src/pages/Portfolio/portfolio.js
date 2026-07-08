import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let activeScrollTriggers = [];

// Constants
const CATEGORY_PRIORITY = [
  "All",
  "Video Editing",
  "Videography",
  "Photography",
  "Graphic Design",
  "Brand Identity",
  "Social Media Marketing",
  "Website Development",
  "Software Development"
];
const PROJECTS_PER_PAGE = 6;

// Local Page State
let activeFilter = '';
let searchQuery = '';
let currentPage = 1;
let allProjects = [];
let filteredProjects = [];

async function renderPortfolioContent() {
  activeScrollTriggers.forEach(st => st.kill());
  activeScrollTriggers = [];

  // Load published projects
  const list = await db.getProjects();
  allProjects = list.filter(p => p.status === 'published');

  // Determine available categories and pick the first one
  const projectCategories = [...new Set(allProjects.map(p => p.category))];
  const orderedCategories = [];
  
  CATEGORY_PRIORITY.forEach(cat => {
    if (cat !== 'All' && projectCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  });
  projectCategories.forEach(cat => {
    if (cat !== 'All' && !orderedCategories.includes(cat)) {
      orderedCategories.push(cat);
    }
  });

  if (orderedCategories.length > 0) {
    activeFilter = orderedCategories[0];
  } else {
    activeFilter = '';
  }

  // Render Filters
  renderFilters(orderedCategories);
  
  // Apply Filter and Search
  currentPage = 1;
  applyFilterAndSearch(false);
}

function renderFilters(orderedCategories) {
  const pillsContainer = document.getElementById('portfolio-filter-pills');
  if (!pillsContainer) return;

  pillsContainer.innerHTML = orderedCategories.map(cat => {
    const isActive = cat === activeFilter;
    return `
      <button class="filter-pill ${isActive ? 'active' : ''}" data-category="${cat}">
        <span>${cat}</span>
      </button>
    `;
  }).join('');

  // Click handler
  pillsContainer.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const category = pill.getAttribute('data-category');
      if (category === activeFilter) return;

      pillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeFilter = category;
      currentPage = 1;
      applyFilterAndSearch(true);
    });
  });
}

function applyFilterAndSearch(animate = true) {
  // Filter by category
  let temp = allProjects;
  if (activeFilter) {
    temp = temp.filter(p => p.category === activeFilter);
  } else {
    temp = [];
  }

  // Filter by search query
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    temp = temp.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.client.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) || 
      p.shortDescription.toLowerCase().includes(q) || 
      p.detailedDescription.toLowerCase().includes(q) || 
      p.technologies.toLowerCase().includes(q)
    );
  }

  filteredProjects = temp;

  const grid = document.getElementById('archive-portfolio-grid');
  if (!grid) return;

  if (animate) {
    const currentItems = grid.querySelectorAll('.portfolio-item');
    if (currentItems.length > 0) {
      gsap.to(currentItems, {
        opacity: 0,
        y: 15,
        scale: 0.96,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.in',
        onComplete: () => {
          renderGridItems();
          animateInGridItems();
        }
      });
    } else {
      renderGridItems();
      animateInGridItems();
    }
  } else {
    renderGridItems();
  }
}

function renderGridItems() {
  const grid = document.getElementById('archive-portfolio-grid');
  const loadMoreWrap = document.getElementById('portfolio-load-more-wrap');
  if (!grid) return;

  const totalVisibleLimit = currentPage * PROJECTS_PER_PAGE;
  const visibleProjects = filteredProjects.slice(0, totalVisibleLimit);

  if (visibleProjects.length === 0) {
    grid.innerHTML = `
      <div class="portfolio-empty-message" style="grid-column: span 12; text-align: center; padding: 6rem 2rem; color: rgba(15,15,15,0.4);">
        <p class="font-accent" style="font-size: 1.2rem; margin-bottom: 1rem;">No creative stories found matching your filter.</p>
        <span style="font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Try using another search term or filter category</span>
      </div>
    `;
    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
    return;
  }

  grid.innerHTML = visibleProjects.map((project, idx) => {
    const sizeClass = idx % 3 === 0 ? 'p-large' : 'p-medium';
    const videoMarkup = project.videoUrl
      ? `<video src="${project.videoUrl}" loop muted playsinline class="portfolio-hover-video" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.4s ease; pointer-events: none; z-index: 1;"></video>`
      : '';

    return `
      <div class="portfolio-item ${sizeClass} fade-item" data-id="${project.id}" style="cursor: pointer;">
        <div class="portfolio-img-container revealed">
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

  if (loadMoreWrap) {
    if (filteredProjects.length > totalVisibleLimit) {
      loadMoreWrap.style.display = 'flex';
    } else {
      loadMoreWrap.style.display = 'none';
    }
  }

  setupCardInteractions(grid, allProjects);
}

function animateInGridItems() {
  const grid = document.getElementById('archive-portfolio-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.portfolio-item');
  gsap.fromTo(cards,
    { opacity: 0, y: 20, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.06, ease: 'power2.out' }
  );
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

function handleLoadMore() {
  currentPage++;
  
  const grid = document.getElementById('archive-portfolio-grid');
  if (!grid) return;

  const prevCardCount = grid.querySelectorAll('.portfolio-item').length;
  renderGridItems();
  
  const allCards = grid.querySelectorAll('.portfolio-item');
  const newCards = Array.from(allCards).slice(prevCardCount);
  
  gsap.fromTo(newCards,
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
  );
}

// Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
  initPage('portfolio');

  renderPortfolioContent().then(() => {
    // Setup search listener
    const searchInput = document.getElementById('portfolio-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        applyFilterAndSearch(true);
      });
    }

    // Setup load more
    const loadMoreBtn = document.getElementById('btn-portfolio-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', handleLoadMore);
    }

    // Animate header reveals
    gsap.fromTo('.archive-main-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' });
    gsap.fromTo('.archive-tagline', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 });

    // Fade up other elements
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

    ScrollTrigger.refresh();
  });
});
