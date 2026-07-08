// ==========================================================================
// GROWLIX DIGITAL — PORTFOLIO DATA LAYER (SUPABASE BACKEND CONNECTIVITY)
// ==========================================================================
// This service interfaces with Supabase REST endpoints using clean fetch calls.
// If tables do not exist or the API is unreachable, it seamlessly falls back to 
// local storage databases so the application continues to run flawlessly.

const SUPABASE_RAW_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lbcwprjvbcjslietlekz.supabase.co';
const SUPABASE_URL = `${SUPABASE_RAW_URL.replace(/\/$/, '')}/rest/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY3dwcmp2YmNqc2xpZXRsZWt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MzgzNTcsImV4cCI6MjA5OTAxNDM1N30.Cb7yAbIKz32aCePylauKu7jGEKnhAEp6-baZfVG6hi0';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Prefer': 'return=representation'
};

const LOCAL_STORAGE_KEY = 'growlix_projects_db';
const LANDING_STORAGE_KEY = 'growlix_landing_db';

// High-quality seeded default landing configs
const DEFAULT_LANDING_CONFIG = {
  brandName: "GROWLIX",
  brandSubtext: "",
  heroTagline: "Award-Winning Creative Studio",
  heroTitle: "WE SHAPE <br> <span class=\"italic-serif text-accent\">Cinematic</span> <br> VISUAL STORIES",
  heroDescription: "Growlix is an elite creative agency handcrafting premium photography, videography, and bold brand identities that stand the test of time.",
  heroBgImg: "/src/assets/hero_concept.png",
  
  socialInstagram: "",
  socialBehance: "",
  socialDribbble: "",
  socialVimeo: "",
  socialLinkedIn: "",
  whatsappNumber: "917828950968",
  whatsappMessage: "Hello Growlix, I would like to inquire about your creative services.",
  footerTagline: "Premium media. Flawless motion. Crafting visual identities for premium brands globally.",

  aboutSubtitle: "ABOUT GROWLIX",
  aboutTitle: "Defining the Next Era of Luxury Media.",
  aboutLeadText: "We don’t believe in templated aesthetics. Every project we undertake is handcrafted from the ground up, blending cutting-edge cinematic videography, high-fashion editorial photography, and premium digital design.",
  aboutBodyText: "Based globally and working with forward-thinking visionaries, we elevate brands into experiences. Our design is minimal; our execution is loud. We live at the intersection of aesthetic brilliance and flawless motion design.",
  aboutStat1Num: "150",
  aboutStat1Label: "Projects Completed",
  aboutStat2Num: "12",
  aboutStat2Label: "Industry Awards",
  aboutStat3Num: "99",
  aboutStat3Label: "Client Satisfaction",
  aboutCollageMain: "/src/assets/about_studio.png",
  aboutCollageSub: "/src/assets/portfolio_photography.png",

  bentoSubtitle: "THE GROWLIX ADVANTAGE",
  bentoTitle: "Why Choose Us.",
  bentoItem1Num: "01",
  bentoItem1Title: "Uncompromised Visual Quality",
  bentoItem1Desc: "We work with medium-format cameras and high-end cinema tools to deliver image sharpness and production quality that typical digital web platforms cannot achieve.",
  bentoItem2Num: "02",
  bentoItem2Title: "Bespoke Handcrafted Motion",
  bentoItem2Desc: "We write customized scroll-linked timelines. Every card, page transition, and interaction is designed to keep users engaged and mesmerized.",
  bentoItem3Num: "03",
  bentoItem3Title: "Editorial Grids",
  bentoItem3Desc: "We craft layout structures that follow classic high-fashion editorial print designs, giving your digital space a sense of luxury structure.",
  bentoItem4Num: "04",
  bentoItem4Title: "End-to-End Creative Synergy",
  bentoItem4Desc: "From the moment we shoot the commercial to coding the landing page, we manage the entire asset chain. No asset compression discrepancies. No creative ideas lost in translation between studios.",

  service1Num: "01/",
  service1Title: "Social Media Marketing",
  service1Desc: "We plan, curate, and scale high-end social media campaigns. From content strategy to running visual feeds that command audience attention.",
  service1Tags: "Campaign Curation, Strategy & Auditing, Copywriting, Audience Engagement",
  service1Img: "/src/assets/hero_concept.png",

  service2Num: "02/",
  service2Title: "Web Dev & App Dev",
  service2Desc: "Premium interactive websites and custom applications built with GSAP animations, headless setups, and flawless 60 FPS performance.",
  service2Tags: "Bespoke Frontend, App Architecture, Headless CMS, Web Motion Design",
  service2Img: "/src/assets/portfolio_web.png",

  service3Num: "03/",
  service3Title: "Video Editing",
  service3Desc: "Cinema-grade post-production editing, custom color grading, sound scoring, and VFX pipelines to turn raw reels into moving masterpieces.",
  service3Tags: "Post Production, Cinematic Grading, VFX Pipelines, Sound Scoring",
  service3Img: "/src/assets/portfolio_videography.png",

  service4Num: "04/",
  service4Title: "Graphics Design",
  service4Desc: "Luxury typography, custom packaging layouts, business portfolios, and high-fashion printed lookbooks styled on classical grids.",
  service4Tags: "Visual Assets, Luxury Packaging, Lookbooks & Print, Typography Systems",
  service4Img: "/src/assets/portfolio_photography.png",

  service5Num: "05/",
  service5Title: "Brand Identity",
  service5Desc: "Bespoke logo designs, visual guides, brand guidelines, and unique color palettes that define the holistic visual tone of modern agencies.",
  service5Tags: "Brand Logos, Visual Guidelines, Identity Frameworks, Color Mapping",
  service5Img: "/src/assets/portfolio_branding.png",

  service6Num: "06/",
  service6Title: "Photography & Videography",
  service6Desc: "Medium-format studio photography and cinema camera shoots. We capture visual assets with absolute lighting precision and resolution.",
  service6Tags: "Fashion Editorial, Commercial Shoots, Medium Format, Studio Lighting",
  service6Img: "/src/assets/about_studio.png",

  processSubtitle: "OUR TIMELINE",
  processTitle: "The Creative Journey.",
  processStep1Num: "01",
  processStep1Title: "Discover",
  processStep1Desc: "We dive deep into your brand universe, analyzing market aesthetics, target demographic cultures, and alignment strategies. We outline the vision.",
  processStep2Num: "02",
  processStep2Title: "Plan",
  processStep2Desc: "Developing detailed shot lists, scripting core narrative videos, establishing editorial typography rules, and sketching user experience paths.",
  processStep3Num: "03",
  processStep3Title: "Shoot",
  processStep3Desc: "Production phase. Utilizing cinema cameras, studio strokes, and premium art direction to capture raw media assets that look expensive.",
  processStep4Num: "04",
  processStep4Title: "Edit",
  processStep4Desc: "Post-production phase. Refining visuals, correcting colors with high-fashion grading styles, and timing transitions to custom music.",
  processStep5Num: "05",
  processStep5Title: "Deliver",
  processStep5Desc: "Launching your website, embedding smooth video components, optimizing visual sizes, and ensuring 60 FPS across all digital touchpoints.",

  testimonialsSubtitle: "THEIR VOICE",
  testimonialsTitle: "Client Testimonials.",
  testimonial1Quote: "Growlix Digital took our luxury brand identity and delivered visual art that blew our board members away. Their production standard is outstandingly high.",
  testimonial1Author: "Alexander Vance",
  testimonial1Role: "Founder, Luxe Essence",
  
  testimonial2Quote: "The interactive animations they built for our launch campaign did not just increase user session duration; it positioned us as pioneers of design in our space.",
  testimonial2Author: "Clara Montaigne",
  testimonial2Role: "Director of Marketing, Aether Corp",

  testimonial3Quote: "They handled our photography and videography, then built the website to showcase it. The result is seamless, beautiful, fast, and completely custom.",
  testimonial3Author: "Marcus Sterling",
  testimonial3Role: "Creative Director, Apex Agency",

  testimonial4Quote: "Every interaction on our website feels deliberate and satisfying. The attention they pay to kinetic movement and smooth scroll is unmatched.",
  testimonial4Author: "Elena Rostova",
  testimonial4Role: "COO, Varna Fine Art",

  faqSubtitle: "FAQ",
  faqTitle: "Frequently Asked Questions.",
  faq1Q: "Do you work globally or only locally?",
  faq1A: "We work globally. Our remote art direction and production pipelines allow us to scout locations and capture high-end photography/videography virtually anywhere, and develop interactive systems for clients around the globe.",
  faq2Q: "How long does a typical creative and development cycle take?",
  faq2A: "A full-cycle creative project (from discovering concepts, planning and producing content, to interactive front-end launch) takes between 6 to 10 weeks. This ensures every frame is corrected and every scroll animation operates at 60 FPS.",
  faq3Q: "Can we book individual services like videography only?",
  faq3A: "Yes. While we prefer handling complete brand transformations (combining content creation and interactive web development to guarantee total aesthetic consistency), we also cater to individual requests for photography, videography, or specialized motion development.",

  contactSubtitle: "CONNECT WITH US",
  contactTitle: "Let's Create Together.",
  contactPitch: "Have a project that requires visual excellence and interactive edge? Fill out the form or reach out directly to learn how we can elevate your brand.",
  contactEmail: "hello@growlix.digital",
  contactLocation: "London / Los Angeles / Tokyo"
};

const DEFAULT_SEED_PROJECTS = [
  {
    id: "1",
    title: "Elegance in Monochrome",
    client: "Varna Fine Art",
    category: "Photography",
    shortDescription: "A high-fashion editorial series capturing lines, shadows, and textures of modern luxury.",
    detailedDescription: "An editorial collection exploring minimalist architecture, structural high-fashion wardrobe, and extreme shadow contrast. Shot entirely on medium format, the series highlights structural silhouettes and textured drapery against brutalist backgrounds.",
    challenge: "Staging high-contrast black and white visual art that maintains highlight and shadow details without looking muddy or compressed on digital platforms.",
    solution: "Using custom medium format sensor calibrations and a 16-bit workflow color space, exported with customized tonal response curves optimized for high-end HDR web displays.",
    coverImage: "/src/assets/portfolio_photography.png",
    thumbnail: "/src/assets/portfolio_photography.png",
    videoUrl: "",
    demoUrl: "",
    gallery: ["/src/assets/portfolio_photography.png", "/src/assets/about_studio.png", "/src/assets/hero_concept.png"],
    beforeImage: "/src/assets/portfolio_photography.png",
    afterImage: "/src/assets/about_studio.png",
    technologies: "Hasselblad H6D, Adobe Lightroom, Phase One Capture One",
    completionDate: "2025-11-12",
    featured: true,
    displayOrder: 1,
    status: "published"
  },
  {
    id: "2",
    title: "Chasing Golden Light",
    client: "Apex Agency",
    category: "Videography",
    shortDescription: "A cinematic commercial shot during golden hours in California, detailing visual storytelling.",
    detailedDescription: "A premium marketing film capturing raw daylight beauty and fluid vehicle dynamics along the Pacific Coast Highway. Focusing on warmth, atmospheric flare, and precise motion framing.",
    challenge: "Shooting dynamic vehicles in fast-changing sunset conditions with a tiny window of usable golden hour light each day.",
    solution: "Pre-scouting locations and pre-programming camera gimbal track paths, enabling high-speed tracking and quick setup times during the key 22-minute sunset window.",
    coverImage: "/src/assets/portfolio_videography.png",
    thumbnail: "/src/assets/portfolio_videography.png",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    demoUrl: "",
    gallery: ["/src/assets/portfolio_videography.png", "/src/assets/hero_concept.png", "/src/assets/about_studio.png"],
    beforeImage: "/src/assets/portfolio_videography.png",
    afterImage: "/src/assets/hero_concept.png",
    technologies: "RED V-Raptor, Cooke Anamorphic Lenses, DaVinci Resolve Studio",
    completionDate: "2026-02-28",
    featured: true,
    displayOrder: 2,
    status: "published"
  },
  {
    id: "3",
    title: "Luxe Essence Brand",
    client: "Luxe Essence LLC",
    category: "Brand Identity",
    shortDescription: "A complete visual universe for a high-end sustainable cosmetic brand, including packaging.",
    detailedDescription: "A full scale brand identity transformation. We crafted everything from custom typography logos to glass packaging structures, focusing on neutral cream tones and premium tactile sensations.",
    challenge: "Creating a packaging system that feels premium and luxury while using 100% recycled glass and organic inks.",
    solution: "Developing a minimalist architectural layout, printing with debossed tactile textures directly onto sandblasted glass surfaces to avoid paper labels completely.",
    coverImage: "/src/assets/portfolio_branding.png",
    thumbnail: "/src/assets/portfolio_branding.png",
    videoUrl: "",
    demoUrl: "",
    gallery: ["/src/assets/portfolio_branding.png", "/src/assets/portfolio_photography.png", "/src/assets/about_studio.png"],
    beforeImage: "/src/assets/portfolio_branding.png",
    afterImage: "/src/assets/portfolio_photography.png",
    technologies: "Adobe Illustrator, Maxon Cinema 4D, Octane Render",
    completionDate: "2025-09-15",
    featured: true,
    displayOrder: 3,
    status: "published"
  },
  {
    id: "4",
    title: "Aether Digital Experience",
    client: "Aether Corp",
    category: "Website Development",
    shortDescription: "An award-winning interactive experience built for a contemporary digital agency.",
    detailedDescription: "A high-performance interactive website featuring smooth GSAP timelines, WebGL shader transitions, and a fluid layout designed to keep visitors scrolling and engaged.",
    challenge: "Rendering dense image layouts and custom fluid simulations at a stable 60 FPS on lower-end mobile devices.",
    solution: "Offloading animations to GPU transform rules, applying lazy asset decoding, and bundling standard fallback layouts for unsupported renderers.",
    coverImage: "/src/assets/portfolio_web.png",
    thumbnail: "/src/assets/portfolio_web.png",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    demoUrl: "https://example.com/demo",
    gallery: ["/src/assets/portfolio_web.png", "/src/assets/portfolio_branding.png", "/src/assets/about_studio.png"],
    beforeImage: "/src/assets/portfolio_web.png",
    afterImage: "/src/assets/portfolio_branding.png",
    technologies: "Vite, GSAP Motion, Canvas API, Lenis Smooth Scroll",
    completionDate: "2026-04-10",
    featured: true,
    displayOrder: 4,
    status: "published"
  },
  {
    id: "5",
    title: "Midnight Resonance",
    client: "Vesper Horology",
    category: "Video Editing",
    shortDescription: "Dynamic color grading and narrative composition for a luxury watch campaign.",
    detailedDescription: "A precise, fast-paced commercial edit highlighting the micro-mechanical movements of high-luxury Swiss timepieces. Syncing rapid editing cuts to custom sound architecture.",
    challenge: "Syncing detailed macro footage of micro-gears smoothly to a complex cinematic audio track while keeping visual coherence.",
    solution: "Designing custom audio markers, editing in nested multi-camera grids, and matching frame pacing to visual beats via bespoke time-remapping curves.",
    coverImage: "/src/assets/about_studio.png",
    thumbnail: "/src/assets/about_studio.png",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    demoUrl: "",
    gallery: ["/src/assets/about_studio.png", "/src/assets/portfolio_videography.png", "/src/assets/portfolio_photography.png"],
    beforeImage: "/src/assets/about_studio.png",
    afterImage: "/src/assets/portfolio_videography.png",
    technologies: "Adobe Premiere Pro, After Effects, DaVinci Resolve",
    completionDate: "2026-01-20",
    featured: false,
    displayOrder: 5,
    status: "published"
  },
  {
    id: "6",
    title: "Prism of Couture",
    client: "Maison de L'Est",
    category: "Graphic Design",
    shortDescription: "Editorial print design and high-end visual packaging layout for a fashion label.",
    detailedDescription: "Design of a limited-edition high-fashion editorial book. We established custom typesetting grids, visual layouts, and specified artisanal heavy card stocks and stitching details.",
    challenge: "Translating digital photographic depth exactly to CMYK press inks without losing subtle texture details and gradients.",
    solution: "Working closely with master printers, running custom ink calibration tests, and utilizing premium uncoated Japanese papers with custom spot inks.",
    coverImage: "/src/assets/portfolio_branding.png",
    thumbnail: "/src/assets/portfolio_branding.png",
    videoUrl: "",
    demoUrl: "",
    gallery: ["/src/assets/portfolio_branding.png", "/src/assets/portfolio_photography.png", "/src/assets/about_studio.png"],
    beforeImage: "/src/assets/portfolio_branding.png",
    afterImage: "/src/assets/portfolio_photography.png",
    technologies: "Adobe InDesign, Illustrator, Adobe Photoshop",
    completionDate: "2025-10-05",
    featured: false,
    displayOrder: 6,
    status: "published"
  },
  {
    id: "7",
    title: "Urban Solitude",
    client: "Metropolitan Hotels",
    category: "Social Media Marketing",
    shortDescription: "Creative content direction and social campaigns that generated 12M+ views.",
    detailedDescription: "A curated visual campaign designed specifically for short-form platforms, positioning Metropolitan Hotels as the ultimate destination for contemporary architectural stays.",
    challenge: "Generating highly engaged, high-fashion aesthetic layouts under social media aspect ratios and compressions.",
    solution: "Shooting high-framerate vertical layouts using cinema filters, color-grading for small screens, and deploying interactive, immersive storytelling stories.",
    coverImage: "/src/assets/portfolio_photography.png",
    thumbnail: "/src/assets/portfolio_photography.png",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    demoUrl: "",
    gallery: ["/src/assets/portfolio_photography.png", "/src/assets/about_studio.png", "/src/assets/portfolio_videography.png"],
    beforeImage: "/src/assets/portfolio_photography.png",
    afterImage: "/src/assets/about_studio.png",
    technologies: "CapCut Pro, Instagram API, Lightroom Mobile presets",
    completionDate: "2026-05-18",
    featured: false,
    displayOrder: 7,
    status: "published"
  },
  {
    id: "8",
    title: "Quantum Core Interface",
    client: "Quantum Data Systems",
    category: "Software Development",
    shortDescription: "A state-of-the-art interactive analytics platform built with custom WebGL components.",
    detailedDescription: "A custom data visualizer web application designed to render million-node graph structures with real-time hardware accelerated physics simulations.",
    challenge: "Handling real-time physics layouts and render processes on standard browser threads without freezing UI interactions.",
    solution: "Offloading physics computations to HTML5 Web Workers and mapping vertex positions in GPU memory buffers via custom WebGL buffers.",
    coverImage: "/src/assets/portfolio_web.png",
    thumbnail: "/src/assets/portfolio_web.png",
    videoUrl: "",
    demoUrl: "https://example.com/demo",
    gallery: ["/src/assets/portfolio_web.png", "/src/assets/about_studio.png", "/src/assets/hero_concept.png"],
    beforeImage: "/src/assets/portfolio_web.png",
    afterImage: "/src/assets/about_studio.png",
    technologies: "Three.js, WebGL, Web Workers, CSS Grid",
    completionDate: "2026-03-01",
    featured: false,
    displayOrder: 8,
    status: "published"
  }
];

// LocalStorage helpers (Fallback Database)
function loadRawLandingConfig() {
  const data = localStorage.getItem(LANDING_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(DEFAULT_LANDING_CONFIG));
    return DEFAULT_LANDING_CONFIG;
  }
  try { return JSON.parse(data); } catch (e) { return DEFAULT_LANDING_CONFIG; }
}

function saveRawLandingConfig(config) {
  localStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(config));
}

function loadRawProjects() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_PROJECTS));
    return DEFAULT_SEED_PROJECTS;
  }
  try { return JSON.parse(data); } catch (e) { return DEFAULT_SEED_PROJECTS; }
}

function saveRawProjects(projects) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
}

function loadRawQueries() {
  const data = localStorage.getItem('growlix_queries_db');
  return data ? JSON.parse(data) : [];
}

function saveRawQueries(queries) {
  localStorage.setItem('growlix_queries_db', JSON.stringify(queries));
}

// Active database status logger
let isUsingSupabase = false;

// API Abstract Layer
export const db = {
  // Check connection diagnostics
  async testConnection() {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects?select=id&limit=1`, {
        method: 'GET',
        headers: HEADERS
      });
      if (res.ok) {
        isUsingSupabase = true;
        return { ok: true, message: 'Connected to Supabase successfully' };
      }
      throw new Error(`Connection status ${res.status}`);
    } catch (e) {
      isUsingSupabase = false;
      return { ok: false, message: `Falling back to LocalStorage: ${e.message}` };
    }
  },

  async getProjects() {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects?select=*`, {
        method: 'GET',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase returned status ${res.status}`);
      const data = await res.json();
      isUsingSupabase = true;
      return data.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to LocalStorage:", e);
      isUsingSupabase = false;
      const list = loadRawProjects();
      return [...list].sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));
    }
  },

  async getProjectById(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects?id=eq.${id}&select=*`, {
        method: 'GET',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase returned status ${res.status}`);
      const data = await res.json();
      isUsingSupabase = true;
      return data[0] || null;
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to LocalStorage:", e);
      isUsingSupabase = false;
      const list = loadRawProjects();
      return list.find(p => p.id === String(id)) || null;
    }
  },

  async createProject(projectData) {
    const finalData = {
      ...projectData,
      id: projectData.id || String(Date.now()),
      featured: projectData.featured === true || projectData.featured === 'true',
      displayOrder: Number(projectData.displayOrder) || 999,
      gallery: Array.isArray(projectData.gallery) ? projectData.gallery : []
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(finalData)
      });
      if (!res.ok) throw new Error(`Supabase write failed: ${res.status}`);
      const inserted = await res.json();
      isUsingSupabase = true;
      return inserted[0] || finalData;
    } catch (e) {
      console.warn("Supabase create failed, syncing to LocalStorage fallback:", e);
      isUsingSupabase = false;
      const list = loadRawProjects();
      list.push(finalData);
      saveRawProjects(list);
      return finalData;
    }
  },

  async updateProject(id, projectData) {
    const patchData = {
      ...projectData,
      featured: projectData.featured === true || projectData.featured === 'true',
      displayOrder: Number(projectData.displayOrder) || undefined,
      gallery: Array.isArray(projectData.gallery) ? projectData.gallery : undefined
    };

    // Remove undefined properties to make a clean patch body
    Object.keys(patchData).forEach(key => patchData[key] === undefined && delete patchData[key]);

    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects?id=eq.${id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(patchData)
      });
      if (!res.ok) throw new Error(`Supabase update failed: ${res.status}`);
      const updated = await res.json();
      isUsingSupabase = true;
      return updated[0] || { id, ...patchData };
    } catch (e) {
      console.warn("Supabase update failed, syncing to LocalStorage fallback:", e);
      isUsingSupabase = false;
      const list = loadRawProjects();
      const idx = list.findIndex(p => p.id === String(id));
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...patchData };
        saveRawProjects(list);
      }
      return { id, ...patchData };
    }
  },

  async deleteProject(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_projects?id=eq.${id}`, {
        method: 'DELETE',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase delete failed: ${res.status}`);
      isUsingSupabase = true;
      return true;
    } catch (e) {
      console.warn("Supabase delete failed, syncing to LocalStorage fallback:", e);
      isUsingSupabase = false;
      const list = loadRawProjects();
      const idx = list.findIndex(p => p.id === String(id));
      if (idx !== -1) {
        list.splice(idx, 1);
        saveRawProjects(list);
        return true;
      }
      return false;
    }
  },

  async getLandingConfig() {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_config?id=eq.1&select=*`, {
        method: 'GET',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase returned status ${res.status}`);
      const data = await res.json();
      isUsingSupabase = true;
      
      // If config row doesn't exist, seed it automatically (self-healing database)
      if (data.length === 0) {
        await fetch(`${SUPABASE_URL}/growlix_config`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ id: 1, data: DEFAULT_LANDING_CONFIG })
        });
        return DEFAULT_LANDING_CONFIG;
      }
      return data[0].data;
    } catch (e) {
      console.warn("Supabase config fetch failed, falling back to LocalStorage:", e);
      isUsingSupabase = false;
      return loadRawLandingConfig();
    }
  },

  async updateLandingConfig(updatedConfig) {
    try {
      // First get current config to perform clean merge
      const currentConfig = await this.getLandingConfig();
      const mergedConfig = { ...currentConfig, ...updatedConfig };

      const res = await fetch(`${SUPABASE_URL}/growlix_config?id=eq.1`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify({ data: mergedConfig, updated_at: new Date().toISOString() })
      });
      if (!res.ok) throw new Error(`Supabase config update failed: ${res.status}`);
      isUsingSupabase = true;
      return mergedConfig;
    } catch (e) {
      console.warn("Supabase config update failed, syncing to LocalStorage fallback:", e);
      isUsingSupabase = false;
      const config = loadRawLandingConfig();
      const finalConfig = { ...config, ...updatedConfig };
      saveRawLandingConfig(finalConfig);
      return finalConfig;
    }
  },

  async resetDatabase() {
    // Reset local cache
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_PROJECTS));
    localStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(DEFAULT_LANDING_CONFIG));

    try {
      // 1. Reset projects table in Supabase
      await fetch(`${SUPABASE_URL}/growlix_projects?id=not.is.null`, {
        method: 'DELETE',
        headers: HEADERS
      });
      for (const proj of DEFAULT_SEED_PROJECTS) {
        await fetch(`${SUPABASE_URL}/growlix_projects`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(proj)
        });
      }

      // 2. Reset config table in Supabase
      await fetch(`${SUPABASE_URL}/growlix_config?id=eq.1`, {
        method: 'DELETE',
        headers: HEADERS
      });
      await fetch(`${SUPABASE_URL}/growlix_config`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ id: 1, data: DEFAULT_LANDING_CONFIG })
      });

      isUsingSupabase = true;
      return { ok: true, message: 'Seeded online database successfully!' };
    } catch (e) {
      console.warn("Failed to reset online Supabase database:", e);
      isUsingSupabase = false;
      return { ok: false, message: `Reset locally. Online fail: ${e.message}` };
    }
  },

  async uploadImage(file) {
    if (!file) return null;

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const uploadUrl = `${SUPABASE_RAW_URL}/storage/v1/object/growlix-media/${fileName}`;
      
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': file.type
        },
        body: file
      });

      if (!res.ok) {
        throw new Error(`Upload response failed: ${res.statusText}`);
      }

      // Return public retrieval URL
      const publicUrl = `${SUPABASE_RAW_URL}/storage/v1/object/public/growlix-media/${fileName}`;
      return publicUrl;
    } catch (e) {
      console.warn("Storage upload failed, falling back to base64 data URL:", e);
      // LocalStorage fallback: convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    }
  },

  async createQuery(queryData) {
    const enrichedQuery = {
      id: queryData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
      name: queryData.name,
      email: queryData.email || '',
      phone: queryData.phone || '',
      query_type: queryData.query_type,
      event_type: queryData.event_type || '',
      event_date: queryData.event_date || '',
      message: queryData.message || '',
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_queries`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(enrichedQuery)
      });
      if (!res.ok) throw new Error(`Supabase query insert failed: ${res.status}`);
      isUsingSupabase = true;
    } catch (e) {
      console.warn("Supabase query insert failed, saving to LocalStorage fallback:", e);
      isUsingSupabase = false;
    }

    // Always save/sync to local storage fallback
    const list = loadRawQueries();
    list.unshift(enrichedQuery); // prepend to show recent ones first
    saveRawQueries(list);

    return enrichedQuery;
  },

  async getQueries() {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_queries?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase queries fetch failed: ${res.status}`);
      const data = await res.json();
      isUsingSupabase = true;
      saveRawQueries(data);
      return data;
    } catch (e) {
      console.warn("Supabase queries fetch failed, falling back to LocalStorage:", e);
      isUsingSupabase = false;
      return loadRawQueries();
    }
  },

  async deleteQuery(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/growlix_queries?id=eq.${id}`, {
        method: 'DELETE',
        headers: HEADERS
      });
      if (!res.ok) throw new Error(`Supabase returned status ${res.status}`);
      isUsingSupabase = true;
      
      // Also delete locally
      const list = loadRawQueries();
      const idx = list.findIndex(q => String(q.id) === String(id));
      if (idx !== -1) {
        list.splice(idx, 1);
        saveRawQueries(list);
      }
      return true;
    } catch (e) {
      console.warn("Supabase query delete failed, syncing to LocalStorage fallback:", e);
      isUsingSupabase = false;
      const list = loadRawQueries();
      const idx = list.findIndex(q => String(q.id) === String(id));
      if (idx !== -1) {
        list.splice(idx, 1);
        saveRawQueries(list);
        return true;
      }
      return false;
    }
  },

  isDbOnline() {
    return isUsingSupabase;
  }
};
