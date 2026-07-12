import { initPage } from '../../utils/initPage.js';
import { db } from '../../utils/db.js';
import { gsap } from 'gsap';

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
const modalFieldCategory = document.getElementById('modal-project-category');
const modalFieldThumbnail = document.getElementById('modal-project-thumbnail');
const modalFieldDescription = document.getElementById('modal-project-description');

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

  // 7.1. Clean up old placeholder assets from database records
  await cleanupBrokenPlaceholderAssets();

  // 7.5. Load dashboard overview data
  await loadDashboardOverview();

  // 8. Bind Portfolio CRUD triggers
  if (addProjectBtn) addProjectBtn.addEventListener('click', () => openProjectModal());
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeProjectModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeProjectModal);
  if (modalSaveBtn) modalSaveBtn.addEventListener('click', handleSaveProject);
  if (modalFieldCategory) modalFieldCategory.addEventListener('change', toggleDynamicFields);
  const radioYoutube = document.getElementById('modal-video-source-youtube');
  const radioLocal = document.getElementById('modal-video-source-local');
  if (radioYoutube) radioYoutube.addEventListener('change', toggleVideoSourceFields);
  if (radioLocal) radioLocal.addEventListener('change', toggleVideoSourceFields);
  if (filterCategorySelect) filterCategorySelect.addEventListener('change', filterProjects);

  // 9. Bind Settings controls
  if (testDbBtn) testDbBtn.addEventListener('click', async () => {
    showToast("Testing database connection...");
    await updateDbStatusBadge(true);
  });
  if (resetDbBtn) resetDbBtn.addEventListener('click', handleResetDatabaseSeed);
  
  // 9.2. Bind UGC CRUD triggers
  const addUgcBtn = document.getElementById('btn-ugc-add');
  const closeUgcModalBtn = document.getElementById('btn-ugc-modal-close');
  const cancelUgcModalBtn = document.getElementById('btn-ugc-modal-cancel');
  const saveUgcModalBtn = document.getElementById('btn-ugc-modal-save');

  if (addUgcBtn) addUgcBtn.addEventListener('click', () => openUgcModal());
  if (closeUgcModalBtn) closeUgcModalBtn.addEventListener('click', closeUgcModal);
  if (cancelUgcModalBtn) cancelUgcModalBtn.addEventListener('click', closeUgcModal);
  if (saveUgcModalBtn) saveUgcModalBtn.addEventListener('click', handleSaveUgc);
  
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
 * Compress images client-side using canvas scaling
 */
function compressImage(file, maxWidth = 1600, maxHeight = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

let activeCropper = null;

/**
 * Open crop dialog and return a Promise that resolves with the cropped File (or null if cancelled)
 */
function cropImageDialog(file) {
  return new Promise((resolve) => {
    const modal = document.getElementById('admin-crop-modal');
    const imageEl = document.getElementById('crop-modal-image');
    const btnCancel = document.getElementById('btn-crop-cancel');
    const btnCancelX = document.getElementById('btn-crop-cancel-x');
    const btnApply = document.getElementById('btn-crop-apply');
    const btnZoomIn = document.getElementById('btn-crop-zoom-in');
    const btnZoomOut = document.getElementById('btn-crop-zoom-out');
    const btnZoomReset = document.getElementById('btn-crop-zoom-reset');
    const ratioBtns = document.querySelectorAll('.crop-ratio-btn');

    if (!modal || !imageEl || !btnApply) {
      resolve(file); // fallback if DOM elements missing
      return;
    }

    // Read file and load image
    const reader = new FileReader();
    reader.onload = (e) => {
      imageEl.src = e.target.result;

      // Open Modal
      modal.style.display = 'flex';
      modal.style.pointerEvents = 'auto';
      
      gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });

      // Destroy old cropper instance if any
      if (activeCropper) {
        activeCropper.destroy();
        activeCropper = null;
      }

      // Default aspect ratio button active is 16:9
      let currentRatio = 1.7777777777777777;
      ratioBtns.forEach(btn => {
        const ratio = parseFloat(btn.getAttribute('data-ratio'));
        if (Math.abs(ratio - currentRatio) < 0.01) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Initialize Cropper.js
      activeCropper = new Cropper(imageEl, {
        aspectRatio: currentRatio,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        background: false
      });
    };
    reader.readAsDataURL(file);

    // Clean up function
    const cleanup = () => {
      if (activeCropper) {
        activeCropper.destroy();
        activeCropper = null;
      }
      gsap.to(modal, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: () => {
          modal.style.display = 'none';
          modal.style.pointerEvents = 'none';
        }
      });
    };

    // Aspect ratio switching
    ratioBtns.forEach(btn => {
      btn.onclick = () => {
        ratioBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ratioStr = btn.getAttribute('data-ratio');
        const ratioVal = ratioStr === 'NaN' ? NaN : parseFloat(ratioStr);
        if (activeCropper) {
          activeCropper.setAspectRatio(ratioVal);
        }
      };
    });

    // Zoom controls
    if (btnZoomIn) {
      btnZoomIn.onclick = () => {
        if (activeCropper) activeCropper.zoom(0.1);
      };
    }
    if (btnZoomOut) {
      btnZoomOut.onclick = () => {
        if (activeCropper) activeCropper.zoom(-0.1);
      };
    }
    if (btnZoomReset) {
      btnZoomReset.onclick = () => {
        if (activeCropper) {
          activeCropper.reset();
        }
      };
    }

    // Cancel triggers
    const onCancel = () => {
      cleanup();
      resolve(null); // resolve with null to indicate cancel
    };
    if (btnCancel) btnCancel.onclick = onCancel;
    if (btnCancelX) btnCancelX.onclick = onCancel;

    // Apply crop
    btnApply.onclick = () => {
      if (!activeCropper) {
        resolve(file);
        cleanup();
        return;
      }

      // Get cropped canvas
      const canvas = activeCropper.getCroppedCanvas({
        maxWidth: 2048,
        maxHeight: 2048,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      if (!canvas) {
        resolve(file);
        cleanup();
        return;
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
        } else {
          // Convert blob back to a File object
          const croppedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_cropped.jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(croppedFile);
        }
        cleanup();
      }, 'image/jpeg', 0.9);
    };

  });
}

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
        labelEl.querySelector('span').textContent = 'Processing...';
      }

      let finalFile = file;

      // Open cropping dialog if it's an image
      if (file.type.startsWith('image/')) {
        showToast("Opening crop editor...");
        const cropped = await cropImageDialog(file);
        if (!cropped) {
          // Cropping cancelled
          showToast("Crop cancelled.");
          if (labelEl) {
            labelEl.classList.remove('uploading');
            labelEl.querySelector('span').textContent = originalText;
          }
          uploader.value = '';
          return;
        }
        finalFile = cropped;
      }

      // Compress cropped image
      if (finalFile.type.startsWith('image/')) {
        if (labelEl) {
          labelEl.querySelector('span').textContent = 'Compressing...';
        }
        showToast("Compressing media asset...");
        try {
          finalFile = await compressImage(finalFile);
        } catch (err) {
          console.warn("Compression failed, using uncompressed file:", err);
        }
      }

      if (labelEl) {
        labelEl.querySelector('span').textContent = 'Uploading...';
      }

      showToast("Uploading media asset...");
      try {
        const publicUrl = await db.uploadImage(finalFile);
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
      if (panelId === 'ugc-manager') {
        loadUgcManager();
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
  if (panelId === 'ugc-manager') {
    loadUgcManager();
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
  setInputVal('logo-type-val', config.logoType || 'text');
  setInputVal('logo-img-val', config.logoImgUrl || '');
  setInputVal('logo-width-val', config.logoWidth || 120);
  
  // Set slider text value
  const widthDisplay = document.getElementById('logo-width-display');
  if (widthDisplay) widthDisplay.textContent = `${config.logoWidth || 120}px`;

  // Toggle dynamic fields visibility on load
  const logoTypeSelect = document.getElementById('logo-type-val');
  const logoUploadGroup = document.getElementById('logo-upload-group');
  const logoWidthGroup = document.getElementById('logo-width-group');
  if (logoTypeSelect) {
    const toggleLogoGroups = () => {
      const isImg = logoTypeSelect.value === 'image';
      if (logoUploadGroup) logoUploadGroup.style.display = isImg ? 'block' : 'none';
      if (logoWidthGroup) logoWidthGroup.style.display = isImg ? 'block' : 'none';
    };
    toggleLogoGroups();
    logoTypeSelect.onchange = toggleLogoGroups;
  }

  const logoWidthSlider = document.getElementById('logo-width-val');
  if (logoWidthSlider && widthDisplay) {
    logoWidthSlider.oninput = () => {
      widthDisplay.textContent = `${logoWidthSlider.value}px`;
    };
  }

  setInputVal('whatsapp-number-val', config.whatsappNumber || '917828950968');
  setInputVal('whatsapp-message-val', config.whatsappMessage || 'Hello Growlix, I would like to inquire about your creative services.');
  setInputVal('social-instagram-val', config.socialInstagram || '');
  setInputVal('social-behance-val', config.socialBehance || '');
  setInputVal('social-dribbble-val', config.socialDribbble || '');
  setInputVal('social-vimeo-val', config.socialVimeo || '');
  setInputVal('social-linkedin-val', config.socialLinkedIn || '');
  setInputVal('footer-tagline-val', config.footerTagline || 'Premium media. Flawless motion. Crafting visual identities for premium brands globally.');

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
        logoType: getInputVal('logo-type-val'),
        logoImgUrl: getInputVal('logo-img-val'),
        logoWidth: Number(getInputVal('logo-width-val')) || 120,
        whatsappNumber: getInputVal('whatsapp-number-val'),
        whatsappMessage: getInputVal('whatsapp-message-val'),
        socialInstagram: getInputVal('social-instagram-val'),
        socialBehance: getInputVal('social-behance-val'),
        socialDribbble: getInputVal('social-dribbble-val'),
        socialVimeo: getInputVal('social-vimeo-val'),
        socialLinkedIn: getInputVal('social-linkedin-val'),
        footerTagline: getInputVal('footer-tagline-val'),
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
          <img src="${item.thumbnail || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23121212'/><text x='50' y='55' fill='white' font-family='sans-serif' font-weight='bold' font-size='32' text-anchor='middle'>${item.title.substring(0,2).toUpperCase()}</text></svg>`}" class="table-thumb" alt="">
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
/**
 * Toggle custom dynamic form fields based on category
 */
function toggleDynamicFields() {
  const modalFieldCategory = document.getElementById('modal-project-category');
  if (!modalFieldCategory) return;
  const category = modalFieldCategory.value ? modalFieldCategory.value.trim() : '';
  const categoryLower = category.toLowerCase();
  
  const isVideo = ['videography', 'video editing'].includes(categoryLower);
  const isWebsite = ['website development', 'software development'].includes(categoryLower);

  console.log('toggleDynamicFields category:', category, 'isVideo:', isVideo, 'isWebsite:', isWebsite);

  const secStandard = document.getElementById('sec-standard-fields');
  const secVideo = document.getElementById('sec-video-fields');
  const secWebsite = document.getElementById('sec-website-fields');

  if (secStandard) {
    if (isVideo || isWebsite) {
      secStandard.style.display = 'none';
    } else {
      secStandard.style.display = 'block';
    }
  }
  if (secVideo) secVideo.style.display = isVideo ? 'block' : 'none';
  if (secWebsite) secWebsite.style.display = isWebsite ? 'block' : 'none';

  if (isVideo) {
    toggleVideoSourceFields();
  }
}

function toggleVideoSourceFields() {
  const radioYoutube = document.getElementById('modal-video-source-youtube');
  const isYoutube = radioYoutube ? radioYoutube.checked : true;
  const groupYoutube = document.getElementById('group-video-youtube');
  const groupLocal = document.getElementById('group-video-local');

  if (groupYoutube) groupYoutube.style.display = isYoutube ? 'block' : 'none';
  if (groupLocal) groupLocal.style.display = isYoutube ? 'none' : 'block';
}

/**
 * Modal dialog control
 */
async function openProjectModal(id = null) {
  const projectModalForm = document.getElementById('project-modal-form');
  const projectModal = document.getElementById('project-modal');
  const modalTitleDisplay = document.getElementById('modal-title-display');
  const modalFieldId = document.getElementById('modal-project-id');
  const modalFieldTitle = document.getElementById('modal-project-title');
  const modalFieldCategory = document.getElementById('modal-project-category');
  const modalFieldDescription = document.getElementById('modal-project-description');

  if (projectModalForm) projectModalForm.reset();

  // Reset defaults for conditional forms
  const radioYoutube = document.getElementById('modal-video-source-youtube');
  const radioLocal = document.getElementById('modal-video-source-local');
  if (radioYoutube) radioYoutube.checked = true;
  if (radioLocal) radioLocal.checked = false;

  const radioRatioLandscape = document.getElementById('modal-video-ratio-landscape');
  const radioRatioPortrait = document.getElementById('modal-video-ratio-portrait');
  if (radioRatioLandscape) radioRatioLandscape.checked = true;
  if (radioRatioPortrait) radioRatioPortrait.checked = false;

  // Clear inputs explicitly
  const standardImageInput = document.getElementById('modal-standard-image');
  const videoYoutubeUrlInput = document.getElementById('modal-video-youtube-url');
  const videoYoutubeCoverInput = document.getElementById('modal-video-youtube-cover');
  const videoLocalFileInput = document.getElementById('modal-video-local-file');
  const videoLocalCoverInput = document.getElementById('modal-video-local-cover');
  const websiteUrlInput = document.getElementById('modal-website-url');
  const websiteBannerInput = document.getElementById('modal-website-banner');

  if (standardImageInput) standardImageInput.value = '';
  if (videoYoutubeUrlInput) videoYoutubeUrlInput.value = '';
  if (videoYoutubeCoverInput) videoYoutubeCoverInput.value = '';
  if (videoLocalFileInput) videoLocalFileInput.value = '';
  if (videoLocalCoverInput) videoLocalCoverInput.value = '';
  if (websiteUrlInput) websiteUrlInput.value = '';
  if (websiteBannerInput) websiteBannerInput.value = '';

  if (id) {
    // Edit mode
    if (modalTitleDisplay) modalTitleDisplay.textContent = "Edit Showcase Item";
    const proj = loadedProjects.find(p => p.id === id);
    if (!proj) return;

    if (modalFieldId) modalFieldId.value = proj.id;
    if (modalFieldTitle) modalFieldTitle.value = proj.title;
    if (modalFieldCategory) modalFieldCategory.value = proj.category;
    if (modalFieldDescription) modalFieldDescription.value = proj.detailedDescription || proj.shortDescription || '';

    // Load orientation selection
    if (proj.videoLayout === 'portrait') {
      if (radioRatioPortrait) radioRatioPortrait.checked = true;
    } else {
      if (radioRatioLandscape) radioRatioLandscape.checked = true;
    }

    const categoryLower = proj.category.toLowerCase();
    const isVideo = ['videography', 'video editing'].includes(categoryLower);
    const isWebsite = ['website development', 'software development'].includes(categoryLower);

    if (isVideo) {
      const isYoutube = (proj.videoUrl || '').includes('youtube.com') || (proj.videoUrl || '').includes('youtu.be');
      if (isYoutube) {
        if (radioYoutube) radioYoutube.checked = true;
        if (videoYoutubeUrlInput) videoYoutubeUrlInput.value = proj.videoUrl || '';
        if (videoYoutubeCoverInput) videoYoutubeCoverInput.value = proj.thumbnail || '';
      } else {
        if (radioLocal) radioLocal.checked = true;
        if (videoLocalFileInput) videoLocalFileInput.value = proj.videoUrl || '';
        if (videoLocalCoverInput) videoLocalCoverInput.value = proj.thumbnail || '';
      }
    } else if (isWebsite) {
      if (websiteUrlInput) websiteUrlInput.value = proj.demoUrl || '';
      if (websiteBannerInput) websiteBannerInput.value = proj.thumbnail || '';
    } else {
      if (standardImageInput) standardImageInput.value = proj.thumbnail || '';
    }
  } else {
    // Add mode
    if (modalTitleDisplay) modalTitleDisplay.textContent = "Add Showcase Item";
    if (modalFieldId) modalFieldId.value = '';
  }

  toggleDynamicFields();

  if (projectModal) projectModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.body.classList.add('lightbox-active');
  if (window.lenis) window.lenis.stop();
}

function closeProjectModal() {
  const projectModal = document.getElementById('project-modal');
  if (projectModal) projectModal.classList.remove('active');
  document.body.style.overflow = '';
  document.body.classList.remove('lightbox-active');
  if (window.lenis) window.lenis.start();
}

async function handleSaveProject() {
  const modalFieldId = document.getElementById('modal-project-id');
  const modalFieldTitle = document.getElementById('modal-project-title');
  const modalFieldCategory = document.getElementById('modal-project-category');
  const modalFieldDescription = document.getElementById('modal-project-description');

  const id = modalFieldId ? modalFieldId.value.trim() : '';
  const title = modalFieldTitle ? modalFieldTitle.value.trim() : '';
  const category = modalFieldCategory ? modalFieldCategory.value : 'Photography';
  const description = modalFieldDescription ? modalFieldDescription.value.trim() : '';

  if (!title) {
    alert("Please fill in the project title.");
    return;
  }

  const categoryLower = category.toLowerCase();
  const isVideo = ['videography', 'video editing'].includes(categoryLower);
  const isWebsite = ['website development', 'software development'].includes(categoryLower);

  let videoUrl = '';
  let demoUrl = '';
  let thumbnail = '';

  if (isVideo) {
    const radioYoutube = document.getElementById('modal-video-source-youtube');
    const isYoutube = radioYoutube ? radioYoutube.checked : true;
    if (isYoutube) {
      const videoYoutubeUrlInput = document.getElementById('modal-video-youtube-url');
      const videoYoutubeCoverInput = document.getElementById('modal-video-youtube-cover');
      videoUrl = videoYoutubeUrlInput ? videoYoutubeUrlInput.value.trim() : '';
      thumbnail = videoYoutubeCoverInput ? videoYoutubeCoverInput.value.trim() : '';
      if (!thumbnail && videoUrl) {
        const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch && ytMatch[1]) {
          thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
        }
      }
    } else {
      const videoLocalFileInput = document.getElementById('modal-video-local-file');
      const videoLocalCoverInput = document.getElementById('modal-video-local-cover');
      videoUrl = videoLocalFileInput ? videoLocalFileInput.value.trim() : '';
      thumbnail = videoLocalCoverInput ? videoLocalCoverInput.value.trim() : '';
    }
  } else if (isWebsite) {
    const websiteUrlInput = document.getElementById('modal-website-url');
    const websiteBannerInput = document.getElementById('modal-website-banner');
    demoUrl = websiteUrlInput ? websiteUrlInput.value.trim() : '';
    thumbnail = websiteBannerInput ? websiteBannerInput.value.trim() : '';
    if (!thumbnail && demoUrl) {
      let cleanUrl = demoUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      thumbnail = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&embed=screenshot.url`;
    }
  } else {
    const standardImageInput = document.getElementById('modal-standard-image');
    thumbnail = standardImageInput ? standardImageInput.value.trim() : '';
  }

  const selectedRatio = document.querySelector('input[name="video-aspect-ratio"]:checked');
  const videoLayout = selectedRatio ? selectedRatio.value : 'landscape';

  let finalVideoUrl = videoUrl;
  if (videoLayout === 'portrait' && finalVideoUrl) {
    const ytMatch = finalVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      finalVideoUrl = `https://www.youtube.com/shorts/${ytMatch[1]}`;
    } else if (!finalVideoUrl.includes('#portrait')) {
      finalVideoUrl = finalVideoUrl + '#portrait';
    }
  }

  const projectData = {
    title,
    client: 'Creative Concept',
    category,
    thumbnail: thumbnail,
    shortDescription: description,
    detailedDescription: description,
    displayOrder: 1,
    status: 'published',
    featured: false,
    videoUrl: finalVideoUrl,
    demoUrl,
    videoLayout,
    gallery: thumbnail ? [thumbnail] : [],
    coverImage: thumbnail,
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

/**
 * Cleanup function to remove old template image assets from live Supabase table
 */
async function cleanupBrokenPlaceholderAssets() {
  try {
    let cleaned = false;
    for (const proj of loadedProjects) {
      let needsUpdate = false;
      let newThumb = proj.thumbnail || '';
      
      // 1. If it starts with legacy placeholder path, clear it
      if (newThumb.startsWith('/src/assets/')) {
        newThumb = '';
        needsUpdate = true;
      }
      
      // 2. If it is empty, but has a videoUrl, generate the youtube thumbnail!
      if (!newThumb && proj.videoUrl) {
        const ytMatch = proj.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch && ytMatch[1]) {
          newThumb = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
          needsUpdate = true;
        }
      }
      // 3. If it is empty, but has a demoUrl, generate the live Microlink screenshot!
      else if (!newThumb && proj.demoUrl) {
        let cleanUrl = proj.demoUrl.trim();
        if (!/^https?:\/\//i.test(cleanUrl)) {
          cleanUrl = 'https://' + cleanUrl;
        }
        newThumb = `https://api.microlink.io/?url=${encodeURIComponent(cleanUrl)}&screenshot=true&embed=screenshot.url`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        proj.thumbnail = newThumb;
        proj.coverImage = newThumb;
        await db.updateProject(proj.id, { thumbnail: newThumb, coverImage: newThumb });
        cleaned = true;
      }
    }
    if (cleaned) {
      await loadPortfolioTable();
    }
  } catch (e) {
    console.warn("Failed placeholder clean-up:", e);
  }
}

// ==========================================================================
// UGC REELS & COMMUNITY MEDIA MANAGER
// ==========================================================================
let loadedUgcList = [];

async function loadUgcManager() {
  await loadUgcTable();
}

async function loadUgcTable() {
  const tableBody = document.getElementById('admin-ugc-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 3rem; color: #777;">Loading community reels...</td>
    </tr>
  `;

  try {
    loadedUgcList = await db.getUgcList();
    renderUgcTable(loadedUgcList);
  } catch (err) {
    console.error("UGC load error:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem; color: #d93838;">Failed to load UGC database: ${err.message}</td>
      </tr>
    `;
  }
}

function renderUgcTable(items) {
  const tableBody = document.getElementById('admin-ugc-table-body');
  if (!tableBody) return;

  if (items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem; color: #777;">No community reels found. Click "Add UGC Reel" to create one.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items.map(item => {
    // Resolve thumbnail
    let thumb = item.thumbnail || '';
    if (!thumb && item.videoUrl) {
      const ytMatch = item.videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        thumb = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    if (!thumb) thumb = '/src/assets/hero_concept.png';

    return `
      <tr style="border-bottom: 1px solid rgba(18,18,18,0.05);">
        <td style="padding: 1rem 0.5rem;">
          <img src="${thumb}" alt="${item.title}" style="width: 70px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(18,18,18,0.08);">
        </td>
        <td style="padding: 1rem 0.5rem;">
          <strong style="display: block; font-size: 0.95rem; color: var(--text-primary);">${item.title}</strong>
        </td>
        <td style="padding: 1rem 0.5rem;">
          <span style="background: rgba(184, 159, 116, 0.1); color: var(--accent); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(184, 159, 116, 0.15);">${item.category || 'UGC'}</span>
        </td>
        <td style="padding: 1rem 0.5rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">
          <a href="${item.videoUrl || '#'}" target="_blank" style="color: var(--accent); text-decoration: underline;">${item.videoUrl || 'N/A'}</a>
        </td>
        <td style="padding: 1rem 0.5rem; text-align: right;">
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="btn-delete-ugc" data-id="${item.id}" style="padding: 0.4rem 0.8rem; border-radius: 4px; background: rgba(217, 56, 56, 0.08); border: 1px solid rgba(217, 56, 56, 0.15); color: #d93838; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind deletes
  tableBody.querySelectorAll('.btn-delete-ugc').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ugcId = btn.getAttribute('data-id');
      if (confirm("Are you sure you want to permanently delete this community reel?")) {
        showToast("Deleting UGC item...");
        try {
          const success = await db.deleteUgc(ugcId);
          if (success) {
            showToast("UGC item deleted successfully!");
            await loadUgcTable();
          } else {
            throw new Error("Delete operation failed");
          }
        } catch (err) {
          console.error("Delete error:", err);
          showToast(`Delete failed: ${err.message}`);
        }
      }
    });
  });
}

function openUgcModal(ugc = null) {
  const modal = document.getElementById('ugc-modal');
  const titleDisplay = document.getElementById('ugc-modal-title-display');
  if (!modal) return;

  // Reset form
  document.getElementById('ugc-modal-form').reset();
  document.getElementById('modal-ugc-id').value = '';
  document.getElementById('modal-ugc-thumbnail').value = '';
  document.getElementById('modal-ugc-thumbnail-display').value = '';

  if (ugc) {
    titleDisplay.textContent = 'Edit UGC Community Reel';
    document.getElementById('modal-ugc-id').value = ugc.id;
    document.getElementById('modal-ugc-title').value = ugc.title;
    document.getElementById('modal-ugc-category').value = ugc.category || 'Instagram Video';
    document.getElementById('modal-ugc-video-url').value = ugc.videoUrl || '';
    document.getElementById('modal-ugc-thumbnail').value = ugc.thumbnail || '';
    document.getElementById('modal-ugc-thumbnail-display').value = ugc.thumbnail || '';
  } else {
    titleDisplay.textContent = 'Add UGC Community Reel';
  }

  modal.style.display = 'flex';
  modal.style.pointerEvents = 'auto';
  gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
}

function closeUgcModal() {
  const modal = document.getElementById('ugc-modal');
  if (!modal) return;
  
  gsap.to(modal, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.inOut',
    onComplete: () => {
      modal.style.display = 'none';
      modal.style.pointerEvents = 'none';
    }
  });
}

async function handleSaveUgc() {
  const title = document.getElementById('modal-ugc-title').value.trim();
  const category = document.getElementById('modal-ugc-category').value;
  const videoUrl = document.getElementById('modal-ugc-video-url').value.trim();
  
  // Custom uploaded thumbnail path
  const customThumb = document.getElementById('modal-ugc-thumbnail-display').value.trim();

  if (!title) {
    showToast("Please enter a video title.");
    return;
  }

  showToast("Saving UGC item...");
  
  const id = document.getElementById('modal-ugc-id').value || String(Date.now());
  const ugcData = {
    id,
    title,
    category,
    videoUrl,
    thumbnail: customThumb
  };

  try {
    await db.createUgc(ugcData);
    showToast("UGC item saved successfully!");
    closeUgcModal();
    await loadUgcTable();
  } catch (err) {
    console.error("Save error:", err);
    showToast(`Save failed: ${err.message}`);
  }
}
