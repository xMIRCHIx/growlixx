import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';

// DOM Elements - Login
const loginOverlay = document.getElementById('admin-login-overlay');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('btn-logout');

// DOM Elements - Navigation & Layout
const sidebarButtons = document.querySelectorAll('.admin-nav-item[data-panel]');
const panels = document.querySelectorAll('.admin-panel');
const dbStatusBadge = document.getElementById('db-status-badge');

// DOM Elements - Landing Page Config
const configSaveBtn = document.getElementById('btn-config-save');

// DOM Elements - Portfolio Manager
const addProjectBtn = document.getElementById('btn-project-add');
const filterCategorySelect = document.getElementById('filter-category');
const tableBody = document.getElementById('admin-projects-table-body');

// DOM Elements - Project Modal
const projectModal = document.getElementById('project-modal');
const modalTitleDisplay = document.getElementById('modal-title-display');
const modalCloseBtn = document.getElementById('btn-modal-close');
const modalCancelBtn = document.getElementById('btn-modal-cancel');
const modalSaveBtn = document.getElementById('btn-modal-save');
const projectModalForm = document.getElementById('project-modal-form');

// Project Modal Fields
const modalFieldId = document.getElementById('modal-project-id');
const modalFieldTitle = document.getElementById('modal-project-title');
const modalFieldClient = document.getElementById('modal-project-client');
const modalFieldCategory = document.getElementById('modal-project-category');
const modalFieldThumbnail = document.getElementById('modal-project-thumbnail');
const modalFieldShortDesc = document.getElementById('modal-project-shortDescription');
const modalFieldDetailedDesc = document.getElementById('modal-project-detailedDescription');
const modalFieldDisplayOrder = document.getElementById('modal-project-displayOrder');
const modalFieldStatus = document.getElementById('modal-project-status');
const modalFieldFeatured = document.getElementById('modal-project-featured');

// Dynamic modal groups
const groupVideoInputs = document.getElementById('group-video-inputs');
const groupWebInputs = document.getElementById('group-web-inputs');
const groupGalleryInputs = document.getElementById('group-gallery-inputs');
const modalFieldVideoUrl = document.getElementById('modal-project-videoUrl');
const modalFieldDemoUrl = document.getElementById('modal-project-demoUrl');
const modalFieldGallery = document.getElementById('modal-project-gallery');

// DOM Elements - Settings Diagnostics
const testDbBtn = document.getElementById('btn-check-db');
const resetDbBtn = document.getElementById('btn-admin-reset-db');

// Global Cache State
let loadedProjects = [];

/**
 * Initialize Page
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check Authentication Gate
  checkAuth();

  // 2. Initialize Common Page Headers/Footers
  initPage('admin');

  // 3. Test Supabase database connection and set pill status
  await updateDbStatusBadge();

  // 4. Bind login event
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  const mobileLogoutBtn = document.getElementById('btn-mobile-logout');
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

  // 5. Bind sidebar panel switcher tabs
  initTabNavigation();

  // 6. Load Config inputs values
  await loadLandingConfig();

  // 7. Load portfolio table rows
  await loadPortfolioTable();

  // 7.5. Load dashboard overview data
  await loadDashboardOverview();

  // 8. Bind Portfolio CRUD triggers
  if (addProjectBtn) addProjectBtn.addEventListener('click', () => openProjectModal());
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProjectModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeProjectModal);
  if (modalSaveBtn) modalSaveBtn.addEventListener('click', handleSaveProject);
  if (modalFieldCategory) modalFieldCategory.addEventListener('change', toggleDynamicFields);
  if (filterCategorySelect) filterCategorySelect.addEventListener('change', filterProjects);

  // 9. Bind Settings controls
  if (testDbBtn) testDbBtn.addEventListener('click', async () => {
    showToast("Testing database connection...");
    await updateDbStatusBadge(true);
  });
  if (resetDbBtn) resetDbBtn.addEventListener('click', handleResetDatabaseSeed);
  
  // 9.5. Bind Dashboard Quick Actions
  const quickAddBtn = document.getElementById('btn-quick-add');
  const quickSettingsBtn = document.getElementById('btn-quick-settings');
  const quickRefreshBtn = document.getElementById('btn-quick-refresh');

  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', () => {
      switchToPanel('portfolio-manager');
      openProjectModal();
    });
  }
  if (quickSettingsBtn) {
    quickSettingsBtn.addEventListener('click', () => {
      switchToPanel('landing-config');
    });
  }
  if (quickRefreshBtn) {
    quickRefreshBtn.addEventListener('click', async () => {
      showToast("Syncing dashboard cache...");
      await loadDashboardOverview();
      showToast("Dashboard synchronized!");
    });
  }

  // 10. Initialize dynamic image uploader buttons
  initImageUploaders();
});

/**
 * Bind file inputs to automatic Supabase Storage uploads
 */
function initImageUploaders() {
  const uploaders = document.querySelectorAll('.admin-file-uploader');
  uploaders.forEach(uploader => {
    uploader.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const targetId = uploader.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      const labelEl = uploader.closest('.btn-upload-label');
      const originalText = labelEl ? labelEl.querySelector('span').textContent : 'Upload';

      if (labelEl) {
        labelEl.classList.add('uploading');
        labelEl.querySelector('span').textContent = 'Uploading...';
      }

      showToast("Uploading media asset...");
      try {
        const publicUrl = await db.uploadImage(file);
        if (!publicUrl) throw new Error("Upload returned empty path");

        const mode = uploader.getAttribute('data-mode');
        if (mode === 'append') {
          // Comma-separated textarea list (for gallery)
          const currentVal = targetInput.value.trim();
          if (currentVal) {
            targetInput.value = `${currentVal}, ${publicUrl}`;
          } else {
            targetInput.value = publicUrl;
          }
        } else {
          // Regular text input
          targetInput.value = publicUrl;
        }

        showToast("Media asset uploaded successfully!");
      } catch (err) {
        console.error("Upload error:", err);
        showToast(`Upload failed: ${err.message}`);
      } finally {
        if (labelEl) {
          labelEl.classList.remove('uploading');
          labelEl.querySelector('span').textContent = originalText;
        }
        uploader.value = ''; // Reset uploader state
      }
    });
  });
}

/**
 * Authentication management
 */
function checkAuth() {
  const isAuth = sessionStorage.getItem('growlix_admin_auth') === 'true';
  if (isAuth) {
    if (loginOverlay) loginOverlay.style.display = 'none';
  } else {
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }
}

function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('admin-username').value;
  const passwordInput = document.getElementById('admin-password').value;

  if (usernameInput === 'admin' && passwordInput === 'admin') {
    sessionStorage.setItem('growlix_admin_auth', 'true');
    loginError.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'none';
    showToast("Access granted. Welcome to Builder Hub.");
  } else {
    loginError.style.display = 'block';
  }
}

function handleLogout() {
  if (confirm("Sign out of the admin session?")) {
    sessionStorage.removeItem('growlix_admin_auth');
    checkAuth();
  }
}

/**
 * DB Diagnostic Status Badge Sync
 */
async function updateDbStatusBadge(verbose = false) {
  if (!dbStatusBadge) return;
  const res = await db.testConnection();
  if (res.ok) {
    dbStatusBadge.className = 'db-status-pill online';
    dbStatusBadge.querySelector('span:not(.status-dot)').textContent = 'Supabase Online';
    if (verbose) showToast(res.message);
  } else {
    dbStatusBadge.className = 'db-status-pill offline';
    dbStatusBadge.querySelector('span:not(.status-dot)').textContent = 'Supabase Offline';
    if (verbose) showToast(res.message);
  }
}

/**
 * Side tab switcher tabs binding
 */
function initTabNavigation() {
  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Deactivate all sidebar tabs
      sidebarButtons.forEach(b => b.classList.remove('active'));
      // Activate clicked
      btn.classList.add('active');

      // Toggle panels visibility
      const panelId = btn.getAttribute('data-panel');
      panels.forEach(p => {
        if (p.id === `panel-${panelId}`) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });

      if (panelId === 'inquiries-manager') {
        loadInquiriesManager();
      }
    });
  });
}

/**
 * Programmatically switch panels inside dashboard sidebar navigation
 */
function switchToPanel(panelId) {
  sidebarButtons.forEach(btn => {
    if (btn.getAttribute('data-panel') === panelId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  panels.forEach(p => {
    if (p.id === `panel-${panelId}`) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  if (panelId === 'inquiries-manager') {
    loadInquiriesManager();
  }
}

/**
 * Load dashboard statistics and enquiries dynamically
 */
async function loadDashboardOverview() {
  try {
    const projects = await db.getProjects();
    const queries = await db.getQueries();

    // Set metrics display
    const totalProjectsEl = document.getElementById('metric-total-projects');
    const featuredProjectsEl = document.getElementById('metric-featured-projects');
    const totalQueriesEl = document.getElementById('metric-total-queries');

    if (totalProjectsEl) totalProjectsEl.textContent = projects.length;
    if (featuredProjectsEl) featuredProjectsEl.textContent = projects.filter(p => p.featured === true || p.featured === 'true').length;
    if (totalQueriesEl) totalQueriesEl.textContent = queries.length;

    // Render inquiries table
    const queriesTableBody = document.getElementById('admin-queries-table-body');
    if (queriesTableBody) {
      if (queries.length === 0) {
        queriesTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 2rem; color: #777;">No customer inquiries received yet.</td>
          </tr>
        `;
        return;
      }

      queriesTableBody.innerHTML = queries.slice(0, 5).map(query => {
        const qDate = new Date(query.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const details = query.query_type === 'booking' ? `Slot: ${query.event_date}` : `Interest: ${query.event_type}`;
        return `
          <tr style="border-bottom: 1px solid rgba(18,18,18,0.04);">
            <td style="padding: 1rem 0.8rem;">
              <div style="font-weight: 700; color: var(--text-primary);">${query.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">${query.email || query.phone || 'No Contact Info'}</div>
            </td>
            <td style="padding: 1rem 0.8rem;"><span class="status-badge" style="background: ${query.query_type === 'booking' ? '#F4EDE2' : '#E8E8E8'}; color: #121212; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase;">${query.query_type}</span></td>
            <td style="padding: 1rem 0.8rem; font-size: 0.85rem; color: var(--text-secondary);">${details}</td>
            <td style="padding: 1rem 0.8rem; font-size: 0.85rem; color: var(--text-primary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${query.message || '-'}</td>
            <td style="padding: 1rem 0.8rem; text-align: right;">
              <button class="btn-secondary btn-view-query" data-id="${query.id}" style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: 4px; border: 1px solid #121212; cursor: pointer; background: transparent; font-weight: 600;">View</button>
            </td>
          </tr>
        `;
      }).join('');

      // Bind view query details click
      queriesTableBody.querySelectorAll('.btn-view-query').forEach(btn => {
        btn.addEventListener('click', () => {
          const qId = btn.getAttribute('data-id');
          const q = queries.find(item => item.id === qId);
          if (q) {
            alert(`Inquiry from: ${q.name}\nEmail: ${q.email}\nPhone: ${q.phone}\nType: ${q.query_type}\nDetails: ${q.query_type === 'booking' ? q.event_date : q.event_type}\n\nMessage:\n${q.message}`);
          }
        });
      });
    }
  } catch (err) {
    console.warn("Failed to load dashboard overview stats:", err);
  }
}

/**
 * Landing configuration controllers
 */
async function loadLandingConfig() {
  const config = await db.getLandingConfig();

  // Populate general settings
  setInputVal('brand-name-val', config.brandName || 'GROWLIX');
  setInputVal('brand-subtext-val', config.brandSubtext || '');

  // Populate hero section inputs
  setInputVal('hero-tagline-val', config.heroTagline);
  setInputVal('hero-title-val', config.heroTitle);
  setInputVal('hero-desc-val', config.heroDescription);
  setInputVal('hero-bgimg-val', config.heroBgImg);

  // Populate about section inputs
  setInputVal('about-subtitle-val', config.aboutSubtitle);
  setInputVal('about-title-val', config.aboutTitle);
  setInputVal('about-lead-val', config.aboutLeadText);
  setInputVal('about-body-val', config.aboutBodyText);

  setInputVal('about-stat1num-val', config.aboutStat1Num);
  setInputVal('about-stat1label-val', config.aboutStat1Label);
  setInputVal('about-stat2num-val', config.aboutStat2Num);
  setInputVal('about-stat2label-val', config.aboutStat2Label);
  setInputVal('about-stat3num-val', config.aboutStat3Num);
  setInputVal('about-stat3label-val', config.aboutStat3Label);

  setInputVal('about-collage-main-val', config.aboutCollageMain);
  setInputVal('about-collage-sub-val', config.aboutCollageSub);

  // Populate services titles
  setInputVal('services-subtitle-val', config.servicesSubtitle || 'OUR CAPABILITIES');
  setInputVal('services-title-val', config.servicesTitle || 'Handcrafted Services.');

  // Populate service item 1
  setInputVal('service1-title-val', config.service1Title);
  setInputVal('service1-num-val', config.service1Num);
  setInputVal('service1-desc-val', config.service1Desc);
  setInputVal('service1-tags-val', config.service1Tags);
  setInputVal('service1-img-val', config.service1Img);

  // Populate service item 2
  setInputVal('service2-title-val', config.service2Title);
  setInputVal('service2-num-val', config.service2Num);
  setInputVal('service2-desc-val', config.service2Desc);
  setInputVal('service2-tags-val', config.service2Tags);
  setInputVal('service2-img-val', config.service2Img);

  // Populate service item 3
  setInputVal('service3-title-val', config.service3Title);
  setInputVal('service3-num-val', config.service3Num);
  setInputVal('service3-desc-val', config.service3Desc);
  setInputVal('service3-tags-val', config.service3Tags);
  setInputVal('service3-img-val', config.service3Img);

  // Populate service item 4
  setInputVal('service4-title-val', config.service4Title);
  setInputVal('service4-num-val', config.service4Num);
  setInputVal('service4-desc-val', config.service4Desc);
  setInputVal('service4-tags-val', config.service4Tags);
  setInputVal('service4-img-val', config.service4Img);

  // Populate service item 5
  setInputVal('service5-title-val', config.service5Title);
  setInputVal('service5-num-val', config.service5Num);
  setInputVal('service5-desc-val', config.service5Desc);
  setInputVal('service5-tags-val', config.service5Tags);
  setInputVal('service5-img-val', config.service5Img);

  // Populate service item 6
  setInputVal('service6-title-val', config.service6Title);
  setInputVal('service6-num-val', config.service6Num);
  setInputVal('service6-desc-val', config.service6Desc);
  setInputVal('service6-tags-val', config.service6Tags);
  setInputVal('service6-img-val', config.service6Img);

  // Populate contact fields
  setInputVal('contact-email-val', config.contactEmail);
  setInputVal('contact-location-val', config.contactLocation);

  // Bind config save trigger
  if (configSaveBtn) {
    configSaveBtn.onclick = async (e) => {
      e.preventDefault();
      showToast("Saving landing configs...");
      
      const updatedConfig = {
        brandName: getInputVal('brand-name-val'),
        brandSubtext: getInputVal('brand-subtext-val'),
        heroTagline: getInputVal('hero-tagline-val'),
        heroTitle: getInputVal('hero-title-val'),
        heroDescription: getInputVal('hero-desc-val'),
        heroBgImg: getInputVal('hero-bgimg-val'),

        aboutSubtitle: getInputVal('about-subtitle-val'),
        aboutTitle: getInputVal('about-title-val'),
        aboutLeadText: getInputVal('about-lead-val'),
        aboutBodyText: getInputVal('about-body-val'),

        aboutStat1Num: getInputVal('about-stat1num-val'),
        aboutStat1Label: getInputVal('about-stat1label-val'),
        aboutStat2Num: getInputVal('about-stat2num-val'),
        aboutStat2Label: getInputVal('about-stat2label-val'),
        aboutStat3Num: getInputVal('about-stat3num-val'),
        aboutStat3Label: getInputVal('about-stat3label-val'),

        aboutCollageMain: getInputVal('about-collage-main-val'),
        aboutCollageSub: getInputVal('about-collage-sub-val'),

        servicesSubtitle: getInputVal('services-subtitle-val'),
        servicesTitle: getInputVal('services-title-val'),

        service1Title: getInputVal('service1-title-val'),
        service1Num: getInputVal('service1-num-val'),
        service1Desc: getInputVal('service1-desc-val'),
        service1Tags: getInputVal('service1-tags-val'),
        service1Img: getInputVal('service1-img-val'),

        service2Title: getInputVal('service2-title-val'),
        service2Num: getInputVal('service2-num-val'),
        service2Desc: getInputVal('service2-desc-val'),
        service2Tags: getInputVal('service2-tags-val'),
        service2Img: getInputVal('service2-img-val'),

        service3Title: getInputVal('service3-title-val'),
        service3Num: getInputVal('service3-num-val'),
        service3Desc: getInputVal('service3-desc-val'),
        service3Tags: getInputVal('service3-tags-val'),
        service3Img: getInputVal('service3-img-val'),

        service4Title: getInputVal('service4-title-val'),
        service4Num: getInputVal('service4-num-val'),
        service4Desc: getInputVal('service4-desc-val'),
        service4Tags: getInputVal('service4-tags-val'),
        service4Img: getInputVal('service4-img-val'),

        service5Title: getInputVal('service5-title-val'),
        service5Num: getInputVal('service5-num-val'),
        service5Desc: getInputVal('service5-desc-val'),
        service5Tags: getInputVal('service5-tags-val'),
        service5Img: getInputVal('service5-img-val'),

        service6Title: getInputVal('service6-title-val'),
        service6Num: getInputVal('service6-num-val'),
        service6Desc: getInputVal('service6-desc-val'),
        service6Tags: getInputVal('service6-tags-val'),
        service6Img: getInputVal('service6-img-val'),

        contactEmail: getInputVal('contact-email-val'),
        contactLocation: getInputVal('contact-location-val')
      };

      await db.updateLandingConfig(updatedConfig);
      await updateDbStatusBadge();
      showToast("Landing configurations saved successfully!");
    };
  }
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getInputVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/**
 * Portfolio list controllers (Read & Filter)
 */
async function loadPortfolioTable() {
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading creative showcase list...</td></tr>`;

  loadedProjects = await db.getProjects();
  renderProjectsToTable(loadedProjects);
}

function renderProjectsToTable(list) {
  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 3rem; color: #777;">
          No showcase items. Click "Add Creative Piece" to add a new project.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = list.map(item => {
    const isFeatured = item.featured === true || item.featured === 'true';
    return `
      <tr>
        <td>
          <img src="${item.thumbnail || '/src/assets/portfolio_photography.png'}" class="table-thumb" alt="">
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-primary);">${item.title}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${item.client}</div>
        </td>
        <td><span class="status-badge draft">${item.category}</span></td>
        <td>
          <span class="featured-icon" style="cursor: pointer;" data-id="${item.id}">
            ${isFeatured ? '★' : '☆'}
          </span>
        </td>
        <td>
          <span class="status-badge ${item.status === 'published' ? 'published' : 'draft'}">
            ${item.status || 'published'}
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-primary edit-action-btn" data-id="${item.id}" style="padding: 0.4rem 0.9rem; font-size: 0.8rem; border-radius: 4px; display: inline-flex;">
            <span>Edit</span>
          </button>
          <button class="btn-magnetic delete-action-btn" data-id="${item.id}" style="padding: 0.4rem 0.9rem; font-size: 0.8rem; border-radius: 4px; border: 1px solid rgba(217, 56, 56, 0.15); color: #d93838; margin-left: 0.5rem; display: inline-flex;">
            <span>Delete</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind edit, delete and toggle featured actions
  tableBody.querySelectorAll('.edit-action-btn').forEach(btn => {
    btn.onclick = () => openProjectModal(btn.getAttribute('data-id'));
  });

  tableBody.querySelectorAll('.delete-action-btn').forEach(btn => {
    btn.onclick = () => handleDeleteProject(btn.getAttribute('data-id'));
  });

  tableBody.querySelectorAll('.featured-icon').forEach(star => {
    star.onclick = () => handleToggleFeatured(star.getAttribute('data-id'));
  });
}

function filterProjects() {
  const cat = filterCategorySelect.value;
  if (cat === 'all') {
    renderProjectsToTable(loadedProjects);
  } else {
    const filtered = loadedProjects.filter(p => p.category === cat);
    renderProjectsToTable(filtered);
  }
}

/**
 * Portfolio CRUD handlers
 */
async function handleToggleFeatured(id) {
  const proj = loadedProjects.find(p => p.id === id);
  if (!proj) return;
  
  const nextFeatured = !(proj.featured === true || proj.featured === 'true');
  showToast("Updating featured state...");
  await db.updateProject(id, { featured: nextFeatured });
  await updateDbStatusBadge();
  await loadPortfolioTable();
}

async function handleDeleteProject(id) {
  const proj = loadedProjects.find(p => p.id === id);
  if (!proj) return;

  if (confirm(`Are you sure you want to permanently delete "${proj.title}"?`)) {
    showToast("Deleting showcase project...");
    await db.deleteProject(id);
    await updateDbStatusBadge();
    await loadPortfolioTable();
    showToast("Showcase project deleted.");
  }
}

/**
 * Modal dialog control
 */
async function openProjectModal(id = null) {
  projectModalForm.reset();
  toggleDynamicFields();

  if (id) {
    // Edit mode
    modalTitleDisplay.textContent = "Edit Showcase Item";
    const proj = loadedProjects.find(p => p.id === id);
    if (!proj) return;

    modalFieldId.value = proj.id;
    modalFieldTitle.value = proj.title;
    modalFieldClient.value = proj.client;
    modalFieldCategory.value = proj.category;
    modalFieldThumbnail.value = proj.thumbnail;
    modalFieldShortDesc.value = proj.shortDescription || '';
    modalFieldDetailedDesc.value = proj.detailedDescription || '';
    modalFieldDisplayOrder.value = proj.displayOrder || 1;
    modalFieldStatus.value = proj.status || 'published';
    modalFieldFeatured.checked = proj.featured === true || proj.featured === 'true';

    // Populate category dynamic values
    modalFieldVideoUrl.value = proj.videoUrl || '';
    modalFieldDemoUrl.value = proj.demoUrl || '';
    modalFieldGallery.value = Array.isArray(proj.gallery) ? proj.gallery.join(', ') : '';

    toggleDynamicFields();
  } else {
    // Add mode
    modalTitleDisplay.textContent = "Add Showcase Item";
    modalFieldId.value = '';
    modalFieldDisplayOrder.value = loadedProjects.length + 1;
  }

  projectModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  projectModal.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleDynamicFields() {
  const category = modalFieldCategory.value;

  // Deactivate all dynamic input panels
  groupVideoInputs.classList.remove('active');
  groupWebInputs.classList.remove('active');
  groupGalleryInputs.classList.remove('active');

  // Activate matching panel based on Selected Category
  if (category === 'Videography' || category === 'Video Editing') {
    groupVideoInputs.classList.add('active');
  } else if (category === 'Website Development' || category === 'Software Development') {
    groupWebInputs.classList.add('active');
  } else if (category === 'Photography' || category === 'Graphic Design' || category === 'Brand Identity' || category === 'Social Media Marketing') {
    groupGalleryInputs.classList.add('active');
  }
}

async function handleSaveProject() {
  const id = modalFieldId.value.trim();
  const title = modalFieldTitle.value.trim();
  const client = modalFieldClient.value.trim();
  const category = modalFieldCategory.value;
  const thumbnail = modalFieldThumbnail.value.trim();
  const shortDescription = modalFieldShortDesc.value.trim();
  const detailedDescription = modalFieldDetailedDesc.value.trim();
  const displayOrder = Number(modalFieldDisplayOrder.value) || 1;
  const status = modalFieldStatus.value;
  const featured = modalFieldFeatured.checked;

  if (!title) {
    alert("Please fill in the project title.");
    return;
  }

  // Fallback defaults for optional inputs
  const clientName = client || 'Creative Concept';
  
  let thumbnailPath = thumbnail;
  if (!thumbnailPath) {
    if (category === 'Videography' || category === 'Video Editing') {
      thumbnailPath = '/src/assets/portfolio_videography.png';
    } else if (category === 'Website Development' || category === 'Software Development') {
      thumbnailPath = '/src/assets/portfolio_web.png';
    } else if (category === 'Brand Identity') {
      thumbnailPath = '/src/assets/portfolio_branding.png';
    } else {
      thumbnailPath = '/src/assets/portfolio_photography.png';
    }
  }

  // Handle dynamic field assignments
  const videoUrl = (category === 'Videography' || category === 'Video Editing') ? modalFieldVideoUrl.value.trim() : '';
  const demoUrl = (category === 'Website Development' || category === 'Software Development') ? modalFieldDemoUrl.value.trim() : '';
  const galleryRaw = (category === 'Photography' || category === 'Graphic Design' || category === 'Brand Identity' || category === 'Social Media Marketing') ? modalFieldGallery.value.trim() : '';
  const gallery = galleryRaw ? galleryRaw.split(',').map(u => u.trim()).filter(Boolean) : [];

  const projectData = {
    title,
    client: clientName,
    category,
    thumbnail: thumbnailPath,
    shortDescription,
    detailedDescription,
    displayOrder,
    status,
    featured,
    videoUrl,
    demoUrl,
    gallery,
    coverImage: thumbnailPath, // Fallback cover
    completionDate: new Date().toISOString().substring(0, 10)
  };

  showToast("Saving creative project...");
  if (id) {
    // Update
    await db.updateProject(id, projectData);
  } else {
    // Create
    await db.createProject(projectData);
  }

  await updateDbStatusBadge();
  closeProjectModal();
  await loadPortfolioTable();
  showToast("Creative project saved successfully!");
}

/**
 * Diagnostics & Reset Seed Handlers
 */
async function handleResetDatabaseSeed() {
  if (confirm("Restore default configurations and seeded project items? This will reset all records on your online Supabase tables too.")) {
    showToast("Resetting database tables...");
    const res = await db.resetDatabase();
    await updateDbStatusBadge();
    
    // Reload layout configs and table
    await loadLandingConfig();
    await loadPortfolioTable();
    
    showToast(res.message);
  }
}

/**
 * Toast notification popup helper
 */
function showToast(message) {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.setAttribute('style', 'position: fixed; bottom: 2rem; right: 2rem; background-color: #121212; color: #ffffff; padding: 0.8rem 1.5rem; border-radius: 4px; font-family: sans-serif; font-size: 0.88rem; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 999999; display: flex; align-items: center; justify-content: center; pointer-events: none; transition: opacity 0.3s ease; opacity: 0;');
    document.body.appendChild(container);
  }
  
  container.textContent = message;
  container.style.opacity = '1';
  
  setTimeout(() => {
    container.style.opacity = '0';
  }, 3500);
}

// Global cache for inquiries
let loadedInquiries = [];

async function loadInquiriesManager() {
  const fullTableBody = document.getElementById('full-inquiries-table-body');
  if (!fullTableBody) return;

  try {
    loadedInquiries = await db.getQueries();

    // Render table
    renderInquiriesTable(loadedInquiries);

    // Bind search and filter
    const searchInput = document.getElementById('inquiry-search-input');
    const filterSelect = document.getElementById('inquiry-filter-type');

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', filterInquiries);
    }
    if (filterSelect && !filterSelect.dataset.bound) {
      filterSelect.dataset.bound = 'true';
      filterSelect.addEventListener('change', filterInquiries);
    }

  } catch (err) {
    console.error("Failed to load inquiries manager list:", err);
    fullTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: #d93838;">Error loading inquiries: ${err.message}</td>
      </tr>
    `;
  }
}

function renderInquiriesTable(list) {
  const fullTableBody = document.getElementById('full-inquiries-table-body');
  if (!fullTableBody) return;

  if (list.length === 0) {
    fullTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: #777;">No matching inquiries found.</td>
      </tr>
    `;
    return;
  }

  fullTableBody.innerHTML = list.map(query => {
    const qDate = new Date(query.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const details = query.query_type === 'booking' ? `Slot: <strong>${query.event_date}</strong>` : `Interest: <strong>${query.event_type}</strong>`;
    
    return `
      <tr style="border-bottom: 1px solid rgba(18,18,18,0.06); transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#faf9f6'" onmouseout="this.style.backgroundColor='transparent'">
        <td style="padding: 1.2rem 1rem; color: var(--text-secondary); font-size: 0.85rem;">${qDate}</td>
        <td style="padding: 1.2rem 1rem; font-weight: 700; color: var(--text-primary);">${query.name}</td>
        <td style="padding: 1.2rem 1rem; color: var(--text-secondary); font-size: 0.88rem;">${query.email || '—'}<br><span style="font-size: 0.8rem;">${query.phone || ''}</span></td>
        <td style="padding: 1.2rem 1rem;">
          <span class="status-badge" style="background: ${query.query_type === 'booking' ? '#F4EDE2' : '#E8E8E8'}; color: #121212; padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; border: 1px solid rgba(18,18,18,0.05); display: inline-block;">
            ${query.query_type}
          </span>
        </td>
        <td style="padding: 1.2rem 1rem; font-size: 0.85rem; color: var(--text-secondary);">${details}</td>
        <td style="padding: 1.2rem 1rem; font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; max-width: 350px; word-wrap: break-word; white-space: normal;">
          ${query.message || '—'}
        </td>
        <td style="padding: 1.2rem 1rem; text-align: right;">
          <button class="btn-delete-inquiry" data-id="${query.id}" style="border: none; background: transparent; color: #d93838; font-size: 1.1rem; cursor: pointer; padding: 0.5rem; transition: transform 0.2s; will-change: transform;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind deletes
  fullTableBody.querySelectorAll('.btn-delete-inquiry').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = btn.getAttribute('data-id');
      if (confirm("Are you sure you want to permanently delete this customer inquiry?")) {
        showToast("Deleting inquiry...");
        try {
          const success = await db.deleteQuery(qId);
          if (success) {
            showToast("Inquiry deleted successfully!");
            // Reload tables
            await loadInquiriesManager();
            await loadDashboardOverview();
          } else {
            throw new Error("Query delete operation failed");
          }
        } catch (err) {
          console.error("Delete error:", err);
          showToast(`Delete failed: ${err.message}`);
        }
      }
    });
  });
}

function filterInquiries() {
  const searchInput = document.getElementById('inquiry-search-input');
  const filterSelect = document.getElementById('inquiry-filter-type');

  const queryText = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterType = filterSelect ? filterSelect.value : 'all';

  const filtered = loadedInquiries.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(queryText) ||
      (item.email && item.email.toLowerCase().includes(queryText)) ||
      (item.message && item.message.toLowerCase().includes(queryText)) ||
      (item.event_type && item.event_type.toLowerCase().includes(queryText)) ||
      (item.event_date && item.event_date.toLowerCase().includes(queryText));

    const matchesType = filterType === 'all' || item.query_type === filterType;

    return matchesSearch && matchesType;
  });

  renderInquiriesTable(filtered);
}
