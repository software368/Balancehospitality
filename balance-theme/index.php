<?php
/**
 * Balance Hospitality — Main Template
 * All text is editable via Appearance > Customize
 * Restaurants & Jobs are editable via their admin menus
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo esc_url(home_url('/')); ?>">
    <meta property="og:title" content="<?php bloginfo('name'); ?>">
    <meta property="og:description" content="8 unieke restaurants aan het strand van Scheveningen. Ontdek onze merken en bekijk onze vacatures.">
    <meta property="og:locale" content="nl_NL">
    <meta property="og:locale:alternate" content="en_US">
    <meta property="og:site_name" content="Balance Hospitality Group">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php bloginfo('name'); ?>">
    <meta name="twitter:description" content="8 unieke restaurants aan het strand van Scheveningen.">

    <!-- Schema.org Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Balance Hospitality Group",
        "url": "<?php echo esc_url(home_url('/')); ?>",
        "description": "8 unieke restaurants aan het strand van Scheveningen, Den Haag.",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Scheveningen, Den Haag",
            "addressCountry": "NL"
        },
        "sameAs": [
            "<?php echo esc_url(balance_get('footer_instagram', 'https://www.instagram.com/balancehospitality/')); ?>"
        ]
    }
    </script>

    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <?php wp_body_open(); ?>
    <a href="#about" class="skip-link">Skip to content</a>

    <!-- NAVBAR -->
    <nav class="navbar" id="navbar" aria-label="Main navigation">
        <div class="navbar-inner">
            <a href="#hero" class="nav-logo" aria-label="Balance Hospitality Group - Home">
                <div class="nav-logo-mark"><span>B</span></div>
                <div class="nav-logo-text">
                    <strong>Balance</strong>
                    Hospitality Group
                </div>
            </a>
            <ul class="nav-links" id="navLinks">
                <li><a href="#about" data-i18n="nav_about">Over Ons</a></li>
                <li><a href="#restaurants" data-i18n="nav_restaurants">Restaurants</a></li>
                <li><a href="#videos" data-i18n="nav_videos">Videos</a></li>
                <li><a href="#jobs" data-i18n="nav_jobs">Vacatures</a></li>
                <li><button class="lang-toggle" id="langToggle" onclick="toggleLang()">EN</button></li>
            </ul>
            <button class="menu-toggle" id="menuToggle" onclick="toggleMenu()" aria-label="Open menu" aria-expanded="false">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <!-- HERO -->
    <main>
    <section class="hero" id="hero" aria-label="Hero">
        <div class="hero-bg"></div>
        <?php $hero_video = balance_get('hero_video_url', 'https://player.vimeo.com/video/1172891767?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0'); ?>
        <iframe class="hero-video" src="<?php echo esc_url($hero_video); ?>" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="Hero video"></iframe>
        <div class="hero-video-overlay"></div>
        <div class="hero-content">
            <p class="hero-eyebrow reveal" data-i18n="hero_eyebrow"><?php echo esc_html(balance_get('hero_eyebrow_nl', 'Scheveningen Beach')); ?></p>
            <h1 class="hero-title reveal reveal-delay-1">
                <span class="gold"><?php echo esc_html(balance_get('hero_title_gold', 'Balance')); ?></span><br><?php echo esc_html(balance_get('hero_title_white', 'Hospitality')); ?>
                <span class="thin" data-i18n="hero_thin"><?php echo esc_html(balance_get('hero_subtitle_nl', 'Acht restaurants aan zee')); ?></span>
            </h1>
            <div class="hero-cta-row reveal reveal-delay-2">
                <a href="#jobs" class="hero-cta" data-i18n="hero_cta"><?php echo esc_html(balance_get('hero_cta_nl', 'Bekijk Vacatures')); ?></a>
                <a href="#about" class="hero-cta-ghost" data-i18n="hero_cta2"><?php echo wp_kses_post(balance_get('hero_cta2_nl', 'Ons Verhaal &rarr;')); ?></a>
            </div>
        </div>
        <div class="hero-scroll">
            <span>Scroll</span>
            <div class="hero-scroll-line"></div>
        </div>
    </section>

    <!-- MARQUEE -->
    <div class="marquee-section">
        <div class="marquee-track" id="marqueeTrack"></div>
    </div>

    <!-- JOBS -->
    <section class="jobs section" id="jobs">
        <div class="container">
            <div class="section-header">
                <p class="section-label reveal" data-i18n="jobs_label"><?php echo wp_kses_post(balance_get('jobs_label_nl', 'Vacatures')); ?></p>
                <h2 class="section-title reveal reveal-delay-1" data-i18n="jobs_title"><?php echo wp_kses_post(balance_get('jobs_title_nl', 'Word Deel Van <em>Ons Team</em>')); ?></h2>
                <div class="ornament reveal reveal-delay-2">
                    <div class="ornament-line"></div>
                </div>
            </div>
            <div class="jobs-intro reveal">
                <p data-i18n="jobs_intro"><?php echo wp_kses_post(balance_get('jobs_intro_nl', 'Wij zijn altijd op zoek naar enthousiaste mensen die het verschil willen maken. Geen ervaring? Geen probleem &mdash; wij leiden je op. Solliciteer vandaag nog en werk op de mooiste locatie van Nederland.')); ?></p>
            </div>

            <div class="jobs-positions" id="jobsGrid"></div>

            <div class="benefits-section reveal">
                <h3 class="benefits-title" data-i18n="benefits_title"><?php echo wp_kses_post(balance_get('benefits_title_nl', 'Waarom werken bij <em>Balance</em>?')); ?></h3>
                <ul class="benefits-list" id="benefitsList">
                    <li><strong data-i18n="benefit_1_title">Balance Academy</strong> &mdash; <span data-i18n="benefit_1_desc">geen ervaring nodig, wij trainen je</span></li>
                    <li><strong data-i18n="benefit_2_title">Flexibele uren</strong> &mdash; <span data-i18n="benefit_2_desc">fulltime, parttime, seizoen of oproep</span></li>
                    <li><strong data-i18n="benefit_3_title">Personeelskorting</strong> &mdash; <span data-i18n="benefit_3_desc">korting op maaltijden &amp; pensioenregeling</span></li>
                    <li><strong data-i18n="benefit_4_title">Doorgroeien</strong> &mdash; <span data-i18n="benefit_4_desc">van medewerker naar Head Waiter, Manager of verder</span></li>
                    <li><strong data-i18n="benefit_5_title">Extra's</strong> &mdash; <span data-i18n="benefit_5_desc">kerstpakket, reiskosten- &amp; taxivergoeding</span></li>
                    <li><strong data-i18n="benefit_6_title">Teamevents</strong> &mdash; <span data-i18n="benefit_6_desc">borrels, feesten &amp; toffe collega's aan zee</span></li>
                </ul>
            </div>

            <div class="jobs-cta reveal">
                <?php $apply_url = balance_get('jobs_apply_url', 'https://marketingdm.typeform.com/BHG-jobs'); ?>
                <a href="<?php echo esc_url($apply_url); ?>" target="_blank" rel="noopener" class="btn-apply" id="applyBtn" data-i18n="jobs_apply"><?php echo esc_html(balance_get('jobs_apply_nl', 'Solliciteer Nu')); ?></a>
                <span class="btn-apply-sub" data-i18n="jobs_apply_sub"><?php echo esc_html(balance_get('jobs_apply_sub_nl', 'Alle locaties · Scheveningen')); ?></span>
            </div>
        </div>
    </section>

    <!-- ABOUT -->
    <section class="about section" id="about">
        <div class="container">
            <div class="about-layout">
                <div>
                    <p class="about-label reveal" data-i18n="about_label"><?php echo esc_html(balance_get('about_label_nl', 'Ons Verhaal')); ?></p>
                    <h2 class="about-heading reveal reveal-delay-1" data-i18n="about_heading"><?php echo wp_kses_post(balance_get('about_heading_nl', 'Waar het strand onze <em>eetkamer</em> is')); ?></h2>
                    <p class="about-text reveal reveal-delay-2" data-i18n="about_text1">
                        <?php echo wp_kses_post(balance_get('about_text1_nl', 'Balance Hospitality Group is de drijvende kracht achter acht unieke horecaconcepten aan de kust van Scheveningen. Van fine dining met je voeten in het zand tot bruisende grand caf&eacute;s &mdash; elk restaurant vertelt zijn eigen verhaal, verbonden door een gedeelde passie voor gastvrijheid.')); ?>
                    </p>
                    <p class="about-text reveal reveal-delay-3" data-i18n="about_text2">
                        <?php echo wp_kses_post(balance_get('about_text2_nl', 'Onze kracht zit in onze mensen. Of je nu achter de bar staat, in de keuken werkt of gasten verwelkomt aan de deur &mdash; bij Balance ben je onderdeel van een hecht team dat samen de mooiste locatie van Nederland tot leven brengt.')); ?>
                    </p>
                    <blockquote class="about-quote reveal reveal-delay-4" data-i18n="about_quote">
                        <?php echo wp_kses_post(balance_get('about_quote_nl', '&ldquo;Wij geloven dat de beste gastvrijheid ontstaat wanneer je team zich thuis voelt.&rdquo;')); ?>
                    </blockquote>
                    <div class="about-stats reveal reveal-delay-5">
                        <div>
                            <div class="about-stat-num">8</div>
                            <div class="about-stat-label" data-i18n="stat_restaurants">Restaurants</div>
                        </div>
                        <div>
                            <div class="about-stat-num">1</div>
                            <div class="about-stat-label" data-i18n="stat_family">Familie</div>
                        </div>
                        <div>
                            <div class="about-stat-num">&infin;</div>
                            <div class="about-stat-label" data-i18n="stat_passion">Passie</div>
                        </div>
                    </div>
                </div>
                <div class="about-visual reveal reveal-delay-2">
                    <div class="about-visual-frame">
                        <?php $about_video = balance_get('about_video_url', 'https://player.vimeo.com/video/1172884553?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0'); ?>
                        <iframe src="<?php echo esc_url($about_video); ?>" frameborder="0" allow="autoplay; fullscreen" style="width:100%;height:100%;position:absolute;top:0;left:0;" title="About video"></iframe>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- RESTAURANTS -->
    <section class="restaurants section" id="restaurants">
        <div class="container">
            <div class="section-header">
                <p class="section-label reveal" data-i18n="restaurants_label">Onze Merken</p>
                <h2 class="section-title reveal reveal-delay-1" data-i18n="restaurants_title">8 Concepten, <em>1 Familie</em></h2>
                <div class="ornament reveal reveal-delay-2">
                    <div class="ornament-line"></div>
                </div>
            </div>
            <div class="restaurants-grid" id="restaurantsGrid"></div>
            <p class="video-reel-hint reveal" data-i18n="restaurants_hint">&#8592; Sleep om te ontdekken &#8594;</p>
        </div>
    </section>

    <!-- VIDEO REEL -->
    <section class="video-reel section" id="videos">
        <div class="container">
            <div class="section-header">
                <p class="section-label reveal" data-i18n="videos_label">Behind the Scenes</p>
                <h2 class="section-title reveal reveal-delay-1" data-i18n="videos_title"><em>Sfeer</em>impressie</h2>
                <div class="ornament reveal reveal-delay-2">
                    <div class="ornament-line"></div>
                </div>
            </div>
        </div>
        <div class="container">
            <div class="video-reel-scroll" id="videoReelScroll">
                <?php for ($i = 1; $i <= 6; $i++) :
                    $reel_url = balance_get("reel_url_$i");
                    $reel_label = balance_get("reel_label_$i");
                    $reel_type = balance_get("reel_type_$i", 'vimeo');
                    if (empty($reel_url) && empty($reel_label)) continue;
                ?>
                <div class="video-reel-item">
                    <?php if ($reel_type === 'vimeo' && !empty($reel_url)) : ?>
                        <iframe src="<?php echo esc_url($reel_url); ?>" frameborder="0" allow="autoplay; fullscreen" style="position:absolute;top:50%;left:50%;width:120%;height:120%;transform:translate(-50%,-50%);" title="<?php echo esc_attr($reel_label); ?>"></iframe>
                    <?php elseif (!empty($reel_url)) : ?>
                        <img src="<?php echo esc_url($reel_url); ?>" alt="<?php echo esc_attr($reel_label); ?>" style="width:100%;height:100%;object-fit:cover;">
                    <?php endif; ?>
                    <?php if (!empty($reel_label)) : ?>
                        <div class="video-reel-label"><span><?php echo esc_html($reel_label); ?></span></div>
                    <?php endif; ?>
                </div>
                <?php endfor; ?>
            </div>
            <p class="video-reel-hint reveal" data-i18n="video_hint">&#8592; Drag to explore &#8594;</p>
        </div>
    </section>

    </main>

    <!-- FOOTER -->
    <footer class="footer" id="contact">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <div class="footer-brand">
                        Balance Hospitality
                        <span>Group &middot; Scheveningen</span>
                    </div>
                    <p class="footer-desc" data-i18n="footer_desc">
                        <?php echo wp_kses_post(balance_get('footer_desc_nl', 'Acht unieke restaurants aan de kust van Scheveningen, verenigd door een passie voor gastvrijheid en kwaliteit.')); ?>
                    </p>
                    <div class="footer-social">
                        <?php $instagram = balance_get('footer_instagram', 'https://www.instagram.com/balancehospitality/'); ?>
                        <a href="<?php echo esc_url($instagram); ?>" target="_blank" rel="noopener" aria-label="Instagram">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
                        </a>
                    </div>
                </div>
                <div>
                    <h4 class="footer-heading" data-i18n="footer_restaurants">Restaurants</h4>
                    <ul class="footer-links" id="footerRestaurants"></ul>
                </div>
                <div>
                    <h4 class="footer-heading" data-i18n="footer_more">Meer</h4>
                    <ul class="footer-links" id="footerMore"></ul>
                </div>
                <div>
                    <h4 class="footer-heading" data-i18n="footer_contact">Contact</h4>
                    <ul class="footer-links">
                        <li style="color: var(--white-dim); font-size: 0.82rem;">Scheveningen<br>Den Haag, NL</li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <span>&copy; <?php echo date('Y'); ?> Balance Hospitality Group</span>
                <span style="font-size: 0.6rem; letter-spacing: 3px; text-transform: uppercase;">Scheveningen &middot; The Netherlands</span>
            </div>
        </div>
    </footer>

    <?php wp_footer(); ?>
</body>
</html>
