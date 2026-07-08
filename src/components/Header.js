import { gsap } from 'gsap';

/**
 * Dynamically injects and initializes the shared navigation header
 * @param {string} activePage - The name of the active page ('home', 'portfolio', 'services', 'about', 'contact')
 */
export function renderHeader(activePage) {
  const headerContainer = document.getElementById('main-header');
  if (!headerContainer) return;

  const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
  
  const homePath = isHomePage ? '#home' : '/index.html#home';
  const aboutPath = isHomePage ? '#about' : '/index.html#about';
  const servicesPath = isHomePage ? '#services' : '/index.html#services';
  const contactPath = isHomePage ? '#contact' : '/index.html#contact';
  const portfolioPath = '/portfolio.html';
  const bookingPath = isHomePage ? '#booking' : '/index.html#booking';

  // Render the header HTML structure: Home | About | Services | Contact | Portfolio
  headerContainer.innerHTML = `
    <nav class="nav-container">
      <a href="${isHomePage ? '#home' : '/index.html#home'}" class="logo magnetic" data-strength="15">
        <span class="logo-bold">GROWLIX</span>
        <span class="logo-light">DIGITAL</span>
      </a>
      
      <ul class="nav-links">
        <li><a href="${homePath}" class="nav-link ${activePage === 'home' && isHomePage ? 'active' : ''}">Home</a></li>
        <li><a href="${aboutPath}" class="nav-link ${activePage === 'about' ? 'active' : ''}">About</a></li>
        <li><a href="${servicesPath}" class="nav-link ${activePage === 'services' ? 'active' : ''}">Services</a></li>
        <li><a href="${contactPath}" class="nav-link ${activePage === 'contact' ? 'active' : ''}">Contact</a></li>
        <li><a href="${portfolioPath}" class="nav-link ${activePage === 'portfolio' ? 'active' : ''}">Portfolio</a></li>
        <li class="nav-indicator" id="nav-indicator"></li>
      </ul>

      <div class="nav-actions">
        <a href="${bookingPath}" class="btn-book btn-magnetic" id="header-cta">
          <span>Book Appointment</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-arrow">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
        <button class="mobile-menu-toggle" id="menu-toggle" aria-label="Toggle Menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  `;

  // Dynamically inject the Mobile Menu Drawer if it doesn't exist
  let drawer = document.getElementById('mobile-menu-drawer');
  let overlay = document.getElementById('mobile-menu-overlay');
  
  if (drawer) drawer.remove();
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  overlay.id = 'mobile-menu-overlay';
  document.body.appendChild(overlay);

  const drawerAside = document.createElement('aside');
  drawerAside.className = 'mobile-menu-drawer';
  drawerAside.id = 'mobile-menu-drawer';
  drawerAside.innerHTML = `
    <div class="drawer-header">
      <span class="logo-bold">GROWLIX</span>
      <button class="drawer-close" id="drawer-close" aria-label="Close Menu">&times;</button>
    </div>
    <ul class="drawer-links">
      <li><a href="${homePath}" class="drawer-link ${activePage === 'home' && isHomePage ? 'active' : ''}">Home</a></li>
      <li><a href="${aboutPath}" class="drawer-link ${activePage === 'about' ? 'active' : ''}">About</a></li>
      <li><a href="${servicesPath}" class="drawer-link ${activePage === 'services' ? 'active' : ''}">Services</a></li>
      <li><a href="${contactPath}" class="drawer-link ${activePage === 'contact' ? 'active' : ''}">Contact</a></li>
      <li><a href="${portfolioPath}" class="drawer-link ${activePage === 'portfolio' ? 'active' : ''}">Portfolio</a></li>
    </ul>
    <div class="drawer-footer">
      <a href="${bookingPath}" class="btn-book drawer-booking-btn">Book Appointment</a>
      <p class="drawer-copyright">© 2026 Growlix Digital. All rights reserved.</p>
    </div>
  `;
  document.body.appendChild(drawerAside);

  // Initialize Header Interactions
  initHeaderInteractions(isHomePage);
}

function initHeaderInteractions(isHomePage) {
  const headerEl = document.getElementById('main-header');
  const navIndicator = document.getElementById('nav-indicator');
  const navLinksList = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-link');
  const menuToggle = document.getElementById('menu-toggle');
  const drawerClose = document.getElementById('drawer-close');
  const drawer = document.getElementById('mobile-menu-drawer');
  const overlay = document.getElementById('mobile-menu-overlay');
  const drawerLinks = document.querySelectorAll('.drawer-link, .drawer-booking-btn');
  
  let lastScrollY = window.scrollY;

  // Move indicator to active link
  function moveNavIndicator(activeLink) {
    if (!navIndicator || !activeLink || !navLinksList) return;
    const linkRect = activeLink.getBoundingClientRect();
    const parentRect = navLinksList.getBoundingClientRect();
    const leftOffset = linkRect.left - parentRect.left;
    
    gsap.to(navIndicator, {
      left: leftOffset,
      width: linkRect.width,
      duration: 0.45,
      ease: 'power3.out'
    });
  }

  // Initial indicator position
  setTimeout(() => {
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) moveNavIndicator(activeLink);
  }, 200);

  // Link Hover Transitions
  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => moveNavIndicator(link));
    link.addEventListener('mouseleave', () => {
      const activeLink = document.querySelector('.nav-link.active');
      if (activeLink) moveNavIndicator(activeLink);
    });
  });

  // Smooth click scroll to home hash links
  const allNavigableLinks = document.querySelectorAll('a[href^="#"], a[href^="/index.html#"]');
  allNavigableLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const hash = href.includes('#') ? href.substring(href.indexOf('#')) : '';
      
      if (hash) {
        const targetEl = document.querySelector(hash);
        if (targetEl) {
          e.preventDefault();
          closeMobileMenu();
          if (window.lenis) {
            window.lenis.scrollTo(targetEl);
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  });

  // Handle transparent/scrolled states
  function updateHeaderTheme() {
    const currentScrollY = window.scrollY;
    if (headerEl.classList.contains('header-subpage')) return;

    if (currentScrollY < 80) {
      headerEl.classList.add('header-transparent');
    } else {
      headerEl.classList.remove('header-transparent');
    }
  }

  // Hide/Reveal navigation on scroll & update active sections
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > lastScrollY && currentScrollY > 150) {
      headerEl.classList.add('nav-hidden');
    } else {
      headerEl.classList.remove('nav-hidden');
    }
    lastScrollY = currentScrollY;
    updateHeaderTheme();
  });

  // Scroll active section tracking on home page
  if (isHomePage) {
    const sections = ['home', 'about', 'services', 'contact'];
    
    const trackScrollActiveSection = () => {
      let currentSection = 'home';
      let minDistance = Infinity;

      sections.forEach(secId => {
        const el = document.getElementById(secId);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Find the section whose top is closest to the header offset (e.g. 120px)
          const distance = Math.abs(rect.top - 120);
          
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = secId;
          }
        }
      });

      // Default to home if scroll is near top of screen
      if (window.scrollY < 120) {
        currentSection = 'home';
      }

      // Update active nav links
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          const key = href.substring(1);
          if (key === currentSection) {
            link.classList.add('active');
            moveNavIndicator(link);
          } else {
            link.classList.remove('active');
          }
        }
      });
    };

    window.addEventListener('scroll', trackScrollActiveSection);
    window.addEventListener('resize', trackScrollActiveSection);
    setTimeout(trackScrollActiveSection, 300);
  }

  window.addEventListener('resize', () => {
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) moveNavIndicator(activeLink);
  });

  // Mobile Drawer toggles
  if (menuToggle) menuToggle.addEventListener('click', openMobileMenu);
  if (drawerClose) drawerClose.addEventListener('click', closeMobileMenu);
  if (overlay) overlay.addEventListener('click', closeMobileMenu);

  function openMobileMenu() {
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      
      gsap.fromTo(drawerLinks, 
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', delay: 0.15 }
      );
    }
  }

  function closeMobileMenu() {
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  }

  updateHeaderTheme();
}
