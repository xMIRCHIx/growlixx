import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let activeScrollTriggers = [];

// Constants
const CATEGORY_PRIORITY = [
  "All",
  "Video Editing",
  "Photography & Videography",
  "Photography",
  "Videography",
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

  // Predefined Categories (Always show all of them as filter pills)
  const orderedCategories = CATEGORY_PRIORITY;

  // Read requested category or filter query parameter from URL robustly
  const urlParams = new URLSearchParams(window.location.search);
  const urlCategory = urlParams.get('category') || urlParams.get('filter');

  let matchedCategory = '';
  if (urlCategory) {
    const cleanUrlCat = urlCategory.trim().toLowerCase().replace(/[-_]/g, ' ');
    // Match against priority list
    matchedCategory = orderedCategories.find(cat => cat.trim().toLowerCase().replace(/[-_]/g, ' ') === cleanUrlCat);
    
    // Also try fuzzy matches (e.g. "branding" matching "Brand Identity" or "social-media" matching "Social Media Marketing")
    if (!matchedCategory) {
      matchedCategory = orderedCategories.find(cat => {
        const catLower = cat.trim().toLowerCase();
        return catLower.includes(cleanUrlCat) || cleanUrlCat.includes(catLower) ||
               (cleanUrlCat === 'branding' && catLower === 'brand identity') ||
               (cleanUrlCat === 'web dev' && catLower === 'website development') ||
               (cleanUrlCat === 'photography' && catLower === 'photography & videography') ||
               (cleanUrlCat === 'videography' && catLower === 'photography & videography');
      });
    }
  }

  if (matchedCategory) {
    activeFilter = matchedCategory;
  } else {
    activeFilter = "All"; // Default to show all
  }

  // Render Filters
  renderFilters(orderedCategories);
  
  // Apply Filter and Search
  currentPage = 1;
  applyFilterAndSearch(false);
}

function renderFilters(orderedCategories) {
  const pillsContainer = document.getElementById('portfolio-filter-pills');
  const dropdownContainer = document.getElementById('mobile-filter-dropdown');
  const triggerBtn = document.getElementById('mobile-filter-trigger');
  const triggerLabel = document.getElementById('mobile-filter-label');
  const arrowIcon = document.getElementById('mobile-filter-arrow');

  if (pillsContainer) {
    pillsContainer.innerHTML = orderedCategories.map(cat => {
      const isActive = cat === activeFilter;
      return `
        <button class="filter-pill ${isActive ? 'active' : ''}" data-category="${cat}">
          <span>${cat}</span>
        </button>
      `;
    }).join('');

    // Click handler for desktop pills
    pillsContainer.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const category = pill.getAttribute('data-category');
        if (category === activeFilter) return;

        pillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        activeFilter = category;
        if (triggerLabel) triggerLabel.textContent = `Category: ${category}`;
        currentPage = 1;
        applyFilterAndSearch(true);
      });
    });
  }

  // Populate mobile dropdown items
  if (dropdownContainer) {
    dropdownContainer.innerHTML = orderedCategories.map(cat => {
      const isActive = cat === activeFilter;
      return `
        <button class="mobile-filter-dropdown-item ${isActive ? 'active' : ''}" data-category="${cat}">
          ${cat}
        </button>
      `;
    }).join('');

    // Click handler for mobile dropdown items
    dropdownContainer.querySelectorAll('.mobile-filter-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const category = item.getAttribute('data-category');
        if (category === activeFilter) {
          dropdownContainer.style.display = 'none';
          if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
          return;
        }

        activeFilter = category;
        if (triggerLabel) triggerLabel.textContent = `Category: ${category}`;
        
        // Sync active state in pills row too
        if (pillsContainer) {
          pillsContainer.querySelectorAll('.filter-pill').forEach(p => {
            if (p.getAttribute('data-category') === category) {
              p.classList.add('active');
            } else {
              p.classList.remove('active');
            }
          });
        }

        dropdownContainer.style.display = 'none';
        if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
        currentPage = 1;
        applyFilterAndSearch(true);
      });
    });
  }

  if (triggerLabel) {
    triggerLabel.textContent = `Category: ${activeFilter || 'All'}`;
  }

  // Bind trigger click listener only once (use custom property flag to avoid duplicate bindings)
  if (triggerBtn && !triggerBtn.dataset.bound) {
    triggerBtn.dataset.bound = "true";
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = window.getComputedStyle(dropdownContainer).display === 'block';
      dropdownContainer.style.display = isVisible ? 'none' : 'block';
      if (arrowIcon) arrowIcon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (dropdownContainer && window.getComputedStyle(dropdownContainer).display === 'block') {
        if (!triggerBtn.contains(e.target) && !dropdownContainer.contains(e.target)) {
          dropdownContainer.style.display = 'none';
          if (arrowIcon) arrowIcon.style.transform = 'rotate(0deg)';
        }
      }
    });
  }
}

function applyFilterAndSearch(animate = true) {
  // Filter by category
  let temp = allProjects;
  if (activeFilter && activeFilter !== 'All') {
    temp = temp.filter(p => {
      const pCat = (p.category || '').trim().toLowerCase();
      const fCat = activeFilter.trim().toLowerCase();
      return pCat === fCat || 
             (fCat === 'brand identity' && pCat === 'branding') ||
             (fCat === 'photography & videography' && (pCat === 'photography' || pCat === 'videography'));
    });
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
    const categoryClean = (project.category || '').trim().toLowerCase().replace(/[-_]/g, ' ');
    const isHorizontal = ['video editing', 'videography', 'website development', 'software development'].includes(categoryClean);
    const horizontalClass = isHorizontal ? 'horizontal-thumb' : '';
    const inlineStyle = isHorizontal ? 'style="aspect-ratio: 16/9 !important;"' : '';
    const videoMarkup = project.videoUrl
      ? `<video src="${project.videoUrl}" loop muted playsinline class="portfolio-hover-video" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; opacity:0; transition: opacity 0.4s ease; pointer-events: none; z-index: 1;"></video>`
      : '';

    const resolvedThumb = resolveProjectThumbnail(project);
    const imgMarkup = resolvedThumb
      ? `<img src="${resolvedThumb}" alt="${project.title}" class="portfolio-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="portfolio-img-placeholder" style="width: 100%; height: 100%; display: none; align-items: center; justify-content: center; background: linear-gradient(135deg, #1c1c1c 0%, #0d0d0d 100%); border: 1px solid rgba(255,255,255,0.05); color: var(--accent); font-family: var(--font-display); font-size: 3rem; font-weight: 800; text-transform: uppercase;">${project.title.substring(0, 2)}</div>`
      : `<div class="portfolio-img-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1c1c1c 0%, #0d0d0d 100%); border: 1px solid rgba(255,255,255,0.05); color: var(--accent); font-family: var(--font-display); font-size: 3rem; font-weight: 800; text-transform: uppercase;">${project.title.substring(0, 2)}</div>`;

    return `
      <div class="portfolio-item ${sizeClass} fade-item" data-id="${project.id}" style="cursor: pointer;">
        <div class="portfolio-img-container revealed ${horizontalClass}" ${inlineStyle}>
          ${imgMarkup}
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

  // Dynamic Editorial Info Panel Generation
  const infoContainer = document.getElementById('lightbox-info-container');
  if (infoContainer) {
    const dateStr = project.completionDate ? new Date(project.completionDate).getFullYear() : '2026';
    const techTags = project.technologies 
      ? project.technologies.split(',').map(t => `<span style="background: rgba(255,255,255,0.06); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.72rem; border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.85);">${t.trim()}</span>`).join(' ') 
      : '';

    infoContainer.innerHTML = `
      <div class="lightbox-info-header" style="margin-bottom: 1.2rem; text-align: left;">
        <span style="font-size: 0.75rem; letter-spacing: 0.15em; color: var(--accent); text-transform: uppercase; font-family: var(--font-sans); font-weight: 700;">${project.category.toUpperCase()}</span>
        <h3 style="margin: 0.4rem 0 0.8rem 0; font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: #ffffff; line-height: 1.1; letter-spacing: -0.01em;">${project.title}</h3>
      </div>
      
      <div class="lightbox-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; padding: 1.2rem 0; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; font-family: var(--font-sans); font-size: 0.82rem; text-align: left;">
        <div>
          <span style="color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem; font-size: 0.7rem; font-weight: 600;">Client</span>
          <strong style="color: #ffffff; font-weight: 600; font-size: 0.9rem;">${project.client || 'Creative Studio'}</strong>
        </div>
        <div>
          <span style="color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.2rem; font-size: 0.7rem; font-weight: 600;">Year</span>
          <strong style="color: #ffffff; font-weight: 600; font-size: 0.9rem;">${dateStr}</strong>
        </div>
        ${techTags ? `
        <div style="grid-column: span 2;">
          <span style="color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.4rem; font-size: 0.7rem; font-weight: 600;">Keywords & Tech</span>
          <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
            ${techTags}
          </div>
        </div>
        ` : ''}
      </div>

      <div class="lightbox-desc-wrap" style="margin-bottom: 2rem; text-align: left;">
        <span style="color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.4rem; font-family: var(--font-sans); font-size: 0.7rem; font-weight: 600;">Description</span>
        <p style="color: #cccccc; font-size: 0.92rem; line-height: 1.65; font-family: var(--font-sans); margin: 0;">
          ${project.detailedDescription || project.shortDescription || 'No detailed case study description provided for this visual production.'}
        </p>
      </div>

      <div id="lightbox-action-wrap" style="display: flex; width: 100%; text-align: left;"></div>
    `;
  }

  // Helper to detect vertical ratio for UGC shorts/reels
  const isVertical = project.videoLayout === 'portrait' || (project.videoUrl && (
    project.videoUrl.toLowerCase().includes('/shorts/') ||
    project.videoUrl.toLowerCase().includes('instagram.com') ||
    project.videoUrl.toLowerCase().includes('tiktok.com') ||
    project.videoUrl.toLowerCase().includes('#portrait') ||
    (project.category && (
      project.category.toLowerCase().includes('shorts') ||
      project.category.toLowerCase().includes('reel') ||
      project.category.toLowerCase().includes('instagram') ||
      project.category.toLowerCase().includes('review')
    )) ||
    (project.title && (
      project.title.toLowerCase().includes('short') ||
      project.title.toLowerCase().includes('reel')
    ))
  ));

  // Handle Media Preview Rendering
  if (project.videoUrl) {
    const isYoutube = project.videoUrl.includes('youtube.com') || project.videoUrl.includes('youtu.be');
    const isInstagram = project.videoUrl.includes('instagram.com');
    if (isYoutube) {
      const embed = getYoutubeEmbedUrl(project.videoUrl);
      if (isVertical) {
        mediaContainer.innerHTML = `
          <div class="lightbox-media-wrapper">
            <iframe src="${embed}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen class="lightbox-iframe"></iframe>
          </div>
        `;
      } else {
        mediaContainer.innerHTML = `
          <div class="lightbox-media-wrapper landscape-media">
            <iframe src="${embed}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen class="lightbox-iframe"></iframe>
          </div>
        `;
      }
    } else if (isInstagram) {
      const embed = getInstagramEmbedUrl(project.videoUrl);
      mediaContainer.innerHTML = `
        <div class="lightbox-media-wrapper">
          <iframe src="${embed}" frameborder="0" allowtransparency="true" allowfullscreen="true" class="lightbox-iframe"></iframe>
        </div>
      `;
    } else {
      const wrapperClass = isVertical ? 'lightbox-media-wrapper' : 'lightbox-media-wrapper landscape-media';
      mediaContainer.innerHTML = `
        <div class="${wrapperClass}">
          <video src="${project.videoUrl}" controls autoplay class="lightbox-video"></video>
        </div>
      `;
    }
  } else {
    const resolvedThumb = resolveProjectThumbnail(project);
    // Remove duplicates from the gallery array if thumbnail is already present
    let galleryList = Array.isArray(project.gallery) ? project.gallery : [];
    const images = [resolvedThumb, ...galleryList].filter(Boolean).filter((val, idx, self) => self.indexOf(val) === idx);
    
    if (images.length > 1) {
      // Render slide container HTML
      let slideItems = images.map((img, idx) => `
        <div class="lightbox-slide ${idx === 0 ? 'active' : ''}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: ${idx === 0 ? 1 : 0}; transition: opacity 0.5s ease; display: flex; align-items: center; justify-content: center; z-index: 1;">
          <img src="${img}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;">
        </div>
      `).join('');

      let dots = images.map((_, idx) => `
        <span class="lightbox-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.35); cursor: pointer; transition: all 0.3s; ${idx === 0 ? 'background: #ffffff; transform: scale(1.2);' : ''}"></span>
      `).join('');

      mediaContainer.innerHTML = `
        <div class="lightbox-media-wrapper landscape-media" style="position: relative; overflow: hidden; background: #080808; border-radius: 12px; height: 100%; width: 100%; min-height: 380px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
          <div class="lightbox-slides-container" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${slideItems}
          </div>
          
          <!-- Navigation Arrows -->
          <button class="lightbox-arrow prev" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.5)'">&lsaquo;</button>
          <button class="lightbox-arrow next" style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: none; color: #fff; width: 44px; height: 44px; border-radius: 50%; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.8)'" onmouseout="this.style.background='rgba(0,0,0,0.5)'">&rsaquo;</button>
          
          <!-- Dots Container -->
          <div class="lightbox-dots-container" style="position: absolute; bottom: 1.2rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; z-index: 10;">
            ${dots}
          </div>
        </div>
      `;

      // Slideshow logic
      let activeIndex = 0;
      const slides = mediaContainer.querySelectorAll('.lightbox-slide');
      const dotEls = mediaContainer.querySelectorAll('.lightbox-dot');
      
      const showSlide = (index) => {
        slides.forEach((slide, idx) => {
          slide.style.opacity = idx === index ? '1' : '0';
          slide.style.zIndex = idx === index ? '2' : '1';
        });
        dotEls.forEach((dot, idx) => {
          dot.style.background = idx === index ? '#ffffff' : 'rgba(255,255,255,0.35)';
          dot.style.transform = idx === index ? 'scale(1.2)' : 'scale(1)';
        });
        activeIndex = index;
      };

      mediaContainer.querySelector('.lightbox-arrow.prev').addEventListener('click', (e) => {
        e.stopPropagation();
        let idx = activeIndex - 1;
        if (idx < 0) idx = images.length - 1;
        showSlide(idx);
      });

      mediaContainer.querySelector('.lightbox-arrow.next').addEventListener('click', (e) => {
        e.stopPropagation();
        let idx = activeIndex + 1;
        if (idx >= images.length) idx = 0;
        showSlide(idx);
      });

      dotEls.forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(dot.getAttribute('data-index'));
          showSlide(idx);
        });
      });
      
    } else if (images.length === 1) {
      mediaContainer.innerHTML = `
        <div class="lightbox-media-wrapper landscape-media">
          <div class="lightbox-img-wrapper">
            <img src="${images[0]}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="lightbox-img-fallback" style="display: none; width: 100%; height: 100%; min-height: 300px; align-items: center; justify-content: center; background: linear-gradient(135deg, #1c1c1c 0%, #0d0d0d 100%); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; color: var(--accent); font-family: var(--font-display); font-size: 5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
              ${project.title.substring(0, 2)}
            </div>
          </div>
        </div>
      `;
    } else {
      mediaContainer.innerHTML = `<div style="color: #777; padding: 4rem;">No preview media available</div>`;
    }
  }

  // Handle action button rendering
  const actionWrap = document.getElementById('lightbox-action-wrap');
  if (actionWrap) {
    actionWrap.innerHTML = '';
    const link = project.demoUrl || project.videoUrl;
    if (link) {
      let cleanUrl = link.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      let buttonText = 'Visit Project Link';
      if (project.videoUrl) {
        const isYoutube = project.videoUrl.includes('youtube.com') || project.videoUrl.includes('youtu.be');
        const isInstagram = project.videoUrl.includes('instagram.com');
        if (isYoutube) {
          const isChannel = project.videoUrl.includes('/channel/') || 
                            project.videoUrl.includes('/c/') || 
                            project.videoUrl.includes('/user/') || 
                            project.videoUrl.includes('@');
          buttonText = isChannel ? 'Visit YouTube Channel' : 'Watch on YouTube';
        } else if (isInstagram) {
          buttonText = 'Watch on Instagram';
        } else {
          buttonText = 'Watch Video';
        }
      } else if (project.demoUrl) {
        buttonText = 'Visit Live Website';
      }

      actionWrap.innerHTML = `
        <a href="${cleanUrl}" target="_blank" class="btn-lightbox-action">
          <span>${buttonText}</span>
        </a>
      `;
    }
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.body.classList.add('lightbox-active');
  if (window.lenis) window.lenis.stop();
  
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
        document.body.classList.remove('lightbox-active');
        if (window.lenis) window.lenis.start();
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
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
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

function resolveProjectThumbnail(project) {
  let thumb = project.thumbnail || '';
  if (!thumb || thumb.startsWith('/src/assets/') || thumb.includes('image.thum.io')) {
    if (project.videoUrl) {
      const ytMatch = project.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
      }
    } else if (project.demoUrl) {
      let cleanUrl = project.demoUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      return `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&embed=screenshot.url`;
    }
    return '';
  }
  return thumb;
}

function getInstagramEmbedUrl(url) {
  if (!url) return '';
  let cleanUrl = url.trim();
  const match = cleanUrl.match(/instagram\.com\/(?:p|reel|reels)\/([^/?#]+)/i);
  if (match && match[1]) {
    return `https://www.instagram.com/p/${match[1]}/embed/`;
  }
  if (cleanUrl.includes('instagram.com')) {
    let normalized = cleanUrl;
    if (!normalized.endsWith('/')) normalized += '/';
    return normalized + 'embed/';
  }
  return cleanUrl;
}
