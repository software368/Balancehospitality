// ============ DATA ============
const restaurants = (window.balanceData && window.balanceData.restaurants) || [];
const jobs = (window.balanceData && window.balanceData.jobs) || [];

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ============ i18n ============
let currentLang = localStorage.getItem('bh-lang') || 'nl';

const translations = {
    nl: {
        nav_about: "Over Ons", nav_restaurants: "Restaurants", nav_videos: "Videos", nav_jobs: "Vacatures",
        hero_eyebrow: "Scheveningen Beach",
        hero_thin: "Acht restaurants aan zee",
        hero_ring: "Est. Scheveningen",
        hero_cta: "Bekijk Vacatures",
        hero_cta2: "Ons Verhaal &rarr;",
        about_label: "Ons Verhaal",
        about_heading: 'Waar het strand onze <em>eetkamer</em> is',
        about_text1: "Balance Hospitality Group is de drijvende kracht achter acht unieke horecaconcepten aan de kust van Scheveningen. Van fine dining met je voeten in het zand tot bruisende grand caf&eacute;s &mdash; elk restaurant vertelt zijn eigen verhaal, verbonden door een gedeelde passie voor gastvrijheid.",
        about_text2: "Onze kracht zit in onze mensen. Of je nu achter de bar staat, in de keuken werkt of gasten verwelkomt aan de deur &mdash; bij Balance ben je onderdeel van een hecht team dat samen de mooiste locatie van Nederland tot leven brengt.",
        about_quote: '&ldquo;Wij geloven dat de beste gastvrijheid ontstaat wanneer je team zich thuis voelt.&rdquo;',
        about_tag: "Scheveningen",
        stat_restaurants: "Restaurants", stat_family: "Familie", stat_passion: "Passie",
        restaurants_label: "Onze Merken", restaurants_title: '8 Concepten, <em>1 Familie</em>',
        videos_label: "Behind the Scenes", videos_title: '<em>Sfeer</em>impressie',
        video_hint: "&#8592; Sleep om te ontdekken &#8594;",
        restaurants_hint: "&#8592; Sleep om te ontdekken &#8594;",
        jobs_label: "Vacatures", jobs_title: 'Word Deel Van <em>Ons Team</em>',
        jobs_intro: "Kom werken bij de leukste horecagroep van Scheveningen!",
        jobs_apply: "Solliciteer in 1 minuut", jobs_apply_sub: "Alle locaties &middot; Scheveningen",
        benefits_title: 'Waarom werken bij <em>Balance</em>?',
        benefit_1_title: "Balance Academy", benefit_1_desc: "geen ervaring nodig, wij trainen je",
        benefit_2_title: "Flexibele uren", benefit_2_desc: "fulltime, parttime, seizoen of oproep",
        benefit_3_title: "Personeelskorting", benefit_3_desc: "korting op maaltijden & pensioenregeling",
        benefit_4_title: "Doorgroeien", benefit_4_desc: "van medewerker naar Head Waiter, Manager of verder",
        benefit_5_title: "Extra's", benefit_5_desc: "kerstpakket, reiskosten- & taxivergoeding",
        benefit_6_title: "Teamevents", benefit_6_desc: "borrels, feesten & toffe collega's aan zee",
        footer_desc: "Acht unieke restaurants aan de kust van Scheveningen, verenigd door een passie voor gastvrijheid en kwaliteit.",
        footer_restaurants: "Restaurants", footer_more: "Meer", footer_contact: "Contact",
        footer_jobs_link: "Bekijk Vacatures", footer_about: "Over Ons", footer_videos: "Videos",
        badge_coming: "Binnenkort",
        visit_link: "Bezoek",
        coming_soon_placeholder: "Binnenkort",
        skip_to_content: "Naar inhoud",
        page_title: "Balance Hospitality Group | Scheveningen",
        meta_description: "Balance Hospitality Group - 8 restaurants aan het strand van Scheveningen. Ontdek onze merken en bekijk onze vacatures."
    },
    en: {
        nav_about: "About", nav_restaurants: "Restaurants", nav_videos: "Videos", nav_jobs: "Careers",
        hero_eyebrow: "Scheveningen Beach",
        hero_thin: "Eight restaurants by the sea",
        hero_ring: "Est. Scheveningen",
        hero_cta: "View Open Positions",
        hero_cta2: "Our Story &rarr;",
        about_label: "Our Story",
        about_heading: 'Where the beach is our <em>dining room</em>',
        about_text1: "Balance Hospitality Group is the driving force behind eight unique hospitality concepts on the Scheveningen coast. From fine dining with your feet in the sand to vibrant grand caf&eacute;s &mdash; each restaurant tells its own story, united by a shared passion for hospitality.",
        about_text2: "Our strength lies in our people. Whether you're behind the bar, working in the kitchen, or welcoming guests at the door &mdash; at Balance you're part of a close-knit team bringing the most beautiful location in the Netherlands to life.",
        about_quote: '&ldquo;We believe the best hospitality happens when your team feels at home.&rdquo;',
        about_tag: "Scheveningen",
        stat_restaurants: "Restaurants", stat_family: "Family", stat_passion: "Passion",
        restaurants_label: "Our Brands", restaurants_title: '8 Concepts, <em>1 Family</em>',
        videos_label: "Behind the Scenes", videos_title: '<em>Atmo</em>sphere',
        video_hint: "&#8592; Drag to explore &#8594;",
        restaurants_hint: "&#8592; Drag to explore &#8594;",
        jobs_label: "Careers", jobs_title: 'Join <em>Our Team</em>',
        jobs_intro: "Come work at the coolest hospitality group in Scheveningen!",
        jobs_apply: "Apply in 1 minute", jobs_apply_sub: "All locations &middot; Scheveningen",
        benefits_title: 'Why work at <em>Balance</em>?',
        benefit_1_title: "Balance Academy", benefit_1_desc: "no experience needed, we'll train you",
        benefit_2_title: "Flexible hours", benefit_2_desc: "full-time, part-time, seasonal or on-call",
        benefit_3_title: "Staff discount", benefit_3_desc: "discounts on meals & pension plan",
        benefit_4_title: "Growth", benefit_4_desc: "from staff to Head Waiter, Manager or beyond",
        benefit_5_title: "Extras", benefit_5_desc: "Christmas package, travel & taxi reimbursement",
        benefit_6_title: "Team events", benefit_6_desc: "parties, drinks & great colleagues by the sea",
        footer_desc: "Eight unique restaurants on the Scheveningen coast, united by a passion for hospitality and quality.",
        footer_restaurants: "Restaurants", footer_more: "More", footer_contact: "Contact",
        footer_jobs_link: "View Careers", footer_about: "About", footer_videos: "Videos",
        badge_coming: "Coming Soon",
        visit_link: "Visit",
        coming_soon_placeholder: "Coming Soon",
        skip_to_content: "Skip to content",
        page_title: "Balance Hospitality Group | Scheveningen",
        meta_description: "Balance Hospitality Group - 8 unique restaurants on the Scheveningen beach. Discover our brands and explore our careers."
    }
};

function toggleLang() {
    currentLang = currentLang === 'nl' ? 'en' : 'nl';
    localStorage.setItem('bh-lang', currentLang);
    applyLang();
}

function applyLang() {
    const t = translations[currentLang];
    document.documentElement.lang = currentLang === 'nl' ? 'nl' : 'en';
    document.title = t.page_title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = t.meta_description;
    const skipLink = document.querySelector('.skip-link');
    if (skipLink) skipLink.textContent = t.skip_to_content;
    document.getElementById('langToggle').textContent = currentLang === 'nl' ? 'EN' : 'NL';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerHTML = t[key];
    });
    renderRestaurants();
    renderJobs();
    renderFooter();
}

// ============ RENDER ============
function renderRestaurants() {
    const grid = document.getElementById('restaurantsGrid');
    const badge = translations[currentLang].badge_coming;
    grid.innerHTML = restaurants.map((r, i) => `
        <a href="${esc(r.url)}" target="_blank" rel="noopener" class="restaurant-card">
            ${r.status === 'coming-soon' ? `<div class="badge">${esc(badge)}</div>` : ''}
            <div class="restaurant-card-media">
                ${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.name)}" loading="lazy">` : `<span class="restaurant-card-media-placeholder">${esc(translations[currentLang].coming_soon_placeholder)}</span>`}
                <div class="restaurant-card-media-overlay"></div>
                ${r.cuisine ? `<span class="restaurant-card-cuisine">${esc(r.cuisine)}</span>` : ''}
            </div>
            <div class="restaurant-card-body">
                <h3 class="restaurant-card-name">${esc(r.name)}</h3>
                <p class="restaurant-card-desc">${esc(r.desc[currentLang])}</p>
                <span class="restaurant-card-link">${esc(translations[currentLang].visit_link)} &nearr;</span>
            </div>
        </a>
    `).join('');
    // Duplicate cards for seamless infinite loop
    grid.innerHTML += grid.innerHTML;
    observeReveals();
}

function renderJobs() {
    const grid = document.getElementById('jobsGrid');
    grid.innerHTML = jobs.map((j, i) => `
        <a href="https://marketingdm.typeform.com/BHG-jobs" target="_blank" rel="noopener" class="job-card reveal reveal-delay-${Math.min(i + 1, 6)}" style="text-decoration:none;color:inherit;display:block;">
            <span class="job-card-index">0${i + 1}</span>
            <span class="job-card-cat">${esc(j.cat[currentLang])}</span>
            <h3 class="job-card-title">${esc(j.title[currentLang])}</h3>
            <p class="job-card-sub">${esc(j.sub[currentLang])}</p>
            ${j.detail ? `<p class="job-card-detail">${esc(j.detail[currentLang])}</p>` : ''}
            <span class="job-card-arrow">${currentLang === 'nl' ? 'Solliciteer' : 'Apply'} &rarr;</span>
        </a>
    `).join('');
    observeReveals();
}

function renderFooter() {
    const t = translations[currentLang];
    document.getElementById('footerRestaurants').innerHTML = restaurants.map(r =>
        `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></li>`
    ).join('');
    document.getElementById('footerMore').innerHTML = `<li><a href="#about" data-i18n="footer_about">${t.footer_about}</a></li><li><a href="#videos" data-i18n="footer_videos">${t.footer_videos}</a></li><li><a href="#jobs" data-i18n="footer_jobs_link">${t.footer_jobs_link}</a></li>`;
}

// ============ MARQUEE ============
function buildMarquee() {
    const names = restaurants.map(r => r.name);
    const track = document.getElementById('marqueeTrack');
    let html = '';
    for (let i = 0; i < 4; i++) {
        names.forEach(n => { html += `<div class="marquee-item">${esc(n)}<div class="marquee-dot"></div></div>`; });
    }
    track.innerHTML = html;
}

window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);

    // Nav active state
    const sections = ['about', 'restaurants', 'videos', 'jobs'];
    const scrollPos = window.scrollY + 160;
    let current = '';
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section && section.offsetTop <= scrollPos) current = id;
    });
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
});

// ============ DRAG SCROLL ============
function initDragScroll() {
    ['videoReelScroll', 'restaurantsGrid', 'jobsGrid'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        let isDown = false, startX, scrollLeft;
        el.addEventListener('mousedown', (e) => { isDown = true; el.classList.add('grabbing'); startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
        el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('grabbing'); });
        el.addEventListener('mouseup', () => { isDown = false; el.classList.remove('grabbing'); });
        el.addEventListener('mousemove', (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX) * 1.5; });
    });
}

// ============ SCROLL REVEAL ============
function observeReveals() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ============ MOBILE MENU ============
function toggleMenu() {
    const btn = document.getElementById('menuToggle');
    const nav = document.getElementById('navLinks');
    btn.classList.toggle('active');
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    btn.setAttribute('aria-expanded', isOpen);
    btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}
document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
        document.getElementById('menuToggle').classList.remove('active');
        document.getElementById('navLinks').classList.remove('open');
    });
});

// ============ FOOTER REVEAL ============
function observeFooter() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.footer-grid > div').forEach(el => observer.observe(el));
}

// ============ STAT COUNTER ============
function observeStats() {
    const nums = document.querySelectorAll('.about-stat-num');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const raw = el.textContent.trim();
                const num = parseInt(raw);
                if (!isNaN(num) && num > 0) {
                    const suffix = raw.replace(String(num), '');
                    let start = 0;
                    const duration = 1800;
                    const startTime = performance.now();
                    function step(now) {
                        const progress = Math.min((now - startTime) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        el.textContent = Math.round(eased * num) + suffix;
                        if (progress < 1) requestAnimationFrame(step);
                    }
                    el.textContent = '0' + suffix;
                    requestAnimationFrame(step);
                }
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    nums.forEach(el => observer.observe(el));
}

// ============ AUTO SCROLL ============
function initAutoScroll(elementId, speed) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let paused = false;
    let rafId;

    function step() {
        if (!paused) {
            el.scrollLeft += speed;
            // Seamless loop: when we reach the duplicate halfway point, reset
            if (el.scrollLeft >= el.scrollWidth / 2) {
                el.scrollLeft = 0;
            }
        }
        rafId = requestAnimationFrame(step);
    }

    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
    el.addEventListener('touchstart', () => { paused = true; }, { passive: true });
    el.addEventListener('touchend', () => { setTimeout(() => { paused = false; }, 2000); });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                rafId = requestAnimationFrame(step);
            } else {
                cancelAnimationFrame(rafId);
            }
        });
    }, { threshold: 0.1 });
    observer.observe(el);
}

function duplicateForLoop(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML += el.innerHTML;
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    buildMarquee();
    applyLang();
    observeReveals();
    initDragScroll();
    observeFooter();
    observeStats();
    // Auto-scroll carousels
    duplicateForLoop('videoReelScroll');
    initAutoScroll('restaurantsGrid', 0.5);
    initAutoScroll('videoReelScroll', 0.4);
});
