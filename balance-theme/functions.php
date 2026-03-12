<?php
/**
 * Balance Hospitality Theme Functions
 */

// ============ ENQUEUE ASSETS ============
function balance_enqueue_assets() {
    wp_enqueue_style('balance-fonts', 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap', array(), null);
    wp_enqueue_style('balance-style', get_template_directory_uri() . '/assets/style.css', array('balance-fonts'), '1.0');
    wp_enqueue_script('balance-main', get_template_directory_uri() . '/assets/main.js', array(), '1.0', true);
    wp_enqueue_script('vimeo-player', 'https://player.vimeo.com/api/player.js', array(), null, true);

    // Pass Customizer data to JS
    wp_localize_script('balance-main', 'balanceData', array(
        'restaurants' => balance_get_restaurants(),
        'jobs' => balance_get_jobs(),
    ));
}
add_action('wp_enqueue_scripts', 'balance_enqueue_assets');

// ============ THEME SUPPORT ============
function balance_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', 'balance_setup');

// ============ CUSTOM POST TYPES ============
function balance_register_cpts() {
    // Restaurants
    register_post_type('restaurant', array(
        'labels' => array(
            'name' => 'Restaurants',
            'singular_name' => 'Restaurant',
            'add_new_item' => 'Add New Restaurant',
            'edit_item' => 'Edit Restaurant',
            'all_items' => 'All Restaurants',
            'menu_name' => 'Restaurants',
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-store',
        'supports' => array('title', 'thumbnail'),
        'has_archive' => false,
        'rewrite' => false,
    ));

    // Jobs
    register_post_type('job', array(
        'labels' => array(
            'name' => 'Jobs / Vacatures',
            'singular_name' => 'Job',
            'add_new_item' => 'Add New Job',
            'edit_item' => 'Edit Job',
            'all_items' => 'All Jobs',
            'menu_name' => 'Jobs',
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-id-alt',
        'supports' => array('title'),
        'has_archive' => false,
        'rewrite' => false,
    ));
}
add_action('init', 'balance_register_cpts');

// ============ META BOXES — RESTAURANTS ============
function balance_restaurant_meta_boxes() {
    add_meta_box('restaurant_details', 'Restaurant Details', 'balance_restaurant_meta_html', 'restaurant', 'normal', 'high');
}
add_action('add_meta_boxes', 'balance_restaurant_meta_boxes');

function balance_restaurant_meta_html($post) {
    wp_nonce_field('balance_restaurant_nonce', 'balance_restaurant_nonce_field');
    $url = get_post_meta($post->ID, '_restaurant_url', true);
    $status = get_post_meta($post->ID, '_restaurant_status', true) ?: 'active';
    $cuisine = get_post_meta($post->ID, '_restaurant_cuisine', true);
    $desc_nl = get_post_meta($post->ID, '_restaurant_desc_nl', true);
    $desc_en = get_post_meta($post->ID, '_restaurant_desc_en', true);
    ?>
    <table class="form-table">
        <tr><th><label for="restaurant_url">Website URL</label></th>
            <td><input type="url" id="restaurant_url" name="restaurant_url" value="<?php echo esc_attr($url); ?>" class="regular-text"></td></tr>
        <tr><th><label for="restaurant_status">Status</label></th>
            <td><select id="restaurant_status" name="restaurant_status">
                <option value="active" <?php selected($status, 'active'); ?>>Active</option>
                <option value="coming-soon" <?php selected($status, 'coming-soon'); ?>>Coming Soon</option>
            </select></td></tr>
        <tr><th><label for="restaurant_cuisine">Cuisine Tag</label></th>
            <td><input type="text" id="restaurant_cuisine" name="restaurant_cuisine" value="<?php echo esc_attr($cuisine); ?>" class="regular-text" placeholder="e.g. Hawaiian Fusion"></td></tr>
        <tr><th><label for="restaurant_desc_nl">Description (NL)</label></th>
            <td><textarea id="restaurant_desc_nl" name="restaurant_desc_nl" rows="3" class="large-text"><?php echo esc_textarea($desc_nl); ?></textarea></td></tr>
        <tr><th><label for="restaurant_desc_en">Description (EN)</label></th>
            <td><textarea id="restaurant_desc_en" name="restaurant_desc_en" rows="3" class="large-text"><?php echo esc_textarea($desc_en); ?></textarea></td></tr>
    </table>
    <p><em>Use the Featured Image (right sidebar) to set the restaurant photo.</em></p>
    <?php
}

function balance_save_restaurant_meta($post_id) {
    if (!isset($_POST['balance_restaurant_nonce_field']) || !wp_verify_nonce($_POST['balance_restaurant_nonce_field'], 'balance_restaurant_nonce')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $fields = array('restaurant_url', 'restaurant_status', 'restaurant_cuisine', 'restaurant_desc_nl', 'restaurant_desc_en');
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
        }
    }
}
add_action('save_post_restaurant', 'balance_save_restaurant_meta');

// ============ META BOXES — JOBS ============
function balance_job_meta_boxes() {
    add_meta_box('job_details', 'Job Details', 'balance_job_meta_html', 'job', 'normal', 'high');
}
add_action('add_meta_boxes', 'balance_job_meta_boxes');

function balance_job_meta_html($post) {
    wp_nonce_field('balance_job_nonce', 'balance_job_nonce_field');
    $cat_nl = get_post_meta($post->ID, '_job_cat_nl', true);
    $cat_en = get_post_meta($post->ID, '_job_cat_en', true);
    $title_nl = get_post_meta($post->ID, '_job_title_nl', true);
    $title_en = get_post_meta($post->ID, '_job_title_en', true);
    $sub_nl = get_post_meta($post->ID, '_job_sub_nl', true);
    $sub_en = get_post_meta($post->ID, '_job_sub_en', true);
    $detail_nl = get_post_meta($post->ID, '_job_detail_nl', true);
    $detail_en = get_post_meta($post->ID, '_job_detail_en', true);
    ?>
    <table class="form-table">
        <tr><th><label for="job_cat_nl">Category (NL)</label></th>
            <td><input type="text" id="job_cat_nl" name="job_cat_nl" value="<?php echo esc_attr($cat_nl); ?>" class="regular-text" placeholder="e.g. Keuken"></td></tr>
        <tr><th><label for="job_cat_en">Category (EN)</label></th>
            <td><input type="text" id="job_cat_en" name="job_cat_en" value="<?php echo esc_attr($cat_en); ?>" class="regular-text" placeholder="e.g. Kitchen"></td></tr>
        <tr><th><label for="job_title_nl">Title (NL)</label></th>
            <td><input type="text" id="job_title_nl" name="job_title_nl" value="<?php echo esc_attr($title_nl); ?>" class="regular-text" placeholder="e.g. Keuken / Kok"></td></tr>
        <tr><th><label for="job_title_en">Title (EN)</label></th>
            <td><input type="text" id="job_title_en" name="job_title_en" value="<?php echo esc_attr($title_en); ?>" class="regular-text" placeholder="e.g. Kitchen / Chef"></td></tr>
        <tr><th><label for="job_sub_nl">Subtitle (NL)</label></th>
            <td><input type="text" id="job_sub_nl" name="job_sub_nl" value="<?php echo esc_attr($sub_nl); ?>" class="regular-text"></td></tr>
        <tr><th><label for="job_sub_en">Subtitle (EN)</label></th>
            <td><input type="text" id="job_sub_en" name="job_sub_en" value="<?php echo esc_attr($sub_en); ?>" class="regular-text"></td></tr>
        <tr><th><label for="job_detail_nl">Details (NL)</label></th>
            <td><input type="text" id="job_detail_nl" name="job_detail_nl" value="<?php echo esc_attr($detail_nl); ?>" class="regular-text" placeholder="e.g. Fulltime &amp; parttime · Flexibele uren"></td></tr>
        <tr><th><label for="job_detail_en">Details (EN)</label></th>
            <td><input type="text" id="job_detail_en" name="job_detail_en" value="<?php echo esc_attr($detail_en); ?>" class="regular-text" placeholder="e.g. Full-time &amp; part-time · Flexible hours"></td></tr>
    </table>
    <?php
}

function balance_save_job_meta($post_id) {
    if (!isset($_POST['balance_job_nonce_field']) || !wp_verify_nonce($_POST['balance_job_nonce_field'], 'balance_job_nonce')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $fields = array('job_cat_nl', 'job_cat_en', 'job_title_nl', 'job_title_en', 'job_sub_nl', 'job_sub_en', 'job_detail_nl', 'job_detail_en');
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            update_post_meta($post_id, '_' . $field, sanitize_text_field($_POST[$field]));
        }
    }
}
add_action('save_post_job', 'balance_save_job_meta');

// ============ HELPER: GET RESTAURANTS ============
function balance_get_restaurants() {
    $posts = get_posts(array(
        'post_type' => 'restaurant',
        'numberposts' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC',
    ));

    $restaurants = array();
    foreach ($posts as $p) {
        $img = get_the_post_thumbnail_url($p->ID, 'large');
        $restaurants[] = array(
            'name' => $p->post_title,
            'url' => get_post_meta($p->ID, '_restaurant_url', true),
            'status' => get_post_meta($p->ID, '_restaurant_status', true) ?: 'active',
            'cuisine' => get_post_meta($p->ID, '_restaurant_cuisine', true),
            'img' => $img ?: null,
            'desc' => array(
                'nl' => get_post_meta($p->ID, '_restaurant_desc_nl', true),
                'en' => get_post_meta($p->ID, '_restaurant_desc_en', true),
            ),
        );
    }
    return $restaurants;
}

// ============ HELPER: GET JOBS ============
function balance_get_jobs() {
    $posts = get_posts(array(
        'post_type' => 'job',
        'numberposts' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC',
    ));

    $jobs = array();
    foreach ($posts as $p) {
        $jobs[] = array(
            'cat' => array(
                'nl' => get_post_meta($p->ID, '_job_cat_nl', true),
                'en' => get_post_meta($p->ID, '_job_cat_en', true),
            ),
            'title' => array(
                'nl' => get_post_meta($p->ID, '_job_title_nl', true),
                'en' => get_post_meta($p->ID, '_job_title_en', true),
            ),
            'sub' => array(
                'nl' => get_post_meta($p->ID, '_job_sub_nl', true),
                'en' => get_post_meta($p->ID, '_job_sub_en', true),
            ),
            'detail' => array(
                'nl' => get_post_meta($p->ID, '_job_detail_nl', true),
                'en' => get_post_meta($p->ID, '_job_detail_en', true),
            ),
        );
    }
    return $jobs;
}

// ============ CUSTOMIZER ============
function balance_customizer($wp_customize) {

    // ---- Hero Section ----
    $wp_customize->add_section('balance_hero', array(
        'title' => 'Hero Section',
        'priority' => 30,
    ));

    $hero_fields = array(
        'hero_video_url' => array('Hero Video URL (Vimeo embed)', 'url', 'https://player.vimeo.com/video/1172891767?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0'),
        'hero_eyebrow_nl' => array('Eyebrow Text (NL)', 'text', 'Scheveningen Beach'),
        'hero_eyebrow_en' => array('Eyebrow Text (EN)', 'text', 'Scheveningen Beach'),
        'hero_title_gold' => array('Title Gold Word', 'text', 'Balance'),
        'hero_title_white' => array('Title White Word', 'text', 'Hospitality'),
        'hero_subtitle_nl' => array('Subtitle (NL)', 'text', 'Acht restaurants aan zee'),
        'hero_subtitle_en' => array('Subtitle (EN)', 'text', 'Eight restaurants by the sea'),
        'hero_cta_nl' => array('CTA Button (NL)', 'text', 'Bekijk Vacatures'),
        'hero_cta_en' => array('CTA Button (EN)', 'text', 'View Careers'),
        'hero_cta2_nl' => array('CTA Ghost (NL)', 'text', 'Ons Verhaal →'),
        'hero_cta2_en' => array('CTA Ghost (EN)', 'text', 'Our Story →'),
    );

    foreach ($hero_fields as $id => $args) {
        $wp_customize->add_setting("balance_$id", array('default' => $args[2], 'sanitize_callback' => $args[1] === 'url' ? 'esc_url_raw' : 'sanitize_text_field'));
        $wp_customize->add_control("balance_$id", array('label' => $args[0], 'section' => 'balance_hero', 'type' => $args[1]));
    }

    // ---- About Section ----
    $wp_customize->add_section('balance_about', array(
        'title' => 'About Section',
        'priority' => 35,
    ));

    $about_fields = array(
        'about_label_nl' => array('Label (NL)', 'text', 'Ons Verhaal'),
        'about_label_en' => array('Label (EN)', 'text', 'Our Story'),
        'about_heading_nl' => array('Heading (NL) — use &lt;em&gt; for gold italic', 'text', 'Waar het strand onze <em>eetkamer</em> is'),
        'about_heading_en' => array('Heading (EN)', 'text', 'Where the beach is our <em>dining room</em>'),
        'about_text1_nl' => array('Paragraph 1 (NL)', 'textarea', ''),
        'about_text1_en' => array('Paragraph 1 (EN)', 'textarea', ''),
        'about_text2_nl' => array('Paragraph 2 (NL)', 'textarea', ''),
        'about_text2_en' => array('Paragraph 2 (EN)', 'textarea', ''),
        'about_quote_nl' => array('Quote (NL)', 'text', ''),
        'about_quote_en' => array('Quote (EN)', 'text', ''),
        'about_video_url' => array('About Video URL (Vimeo embed)', 'url', 'https://player.vimeo.com/video/1172884553?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=1&controls=0&title=0&byline=0&portrait=0'),
    );

    foreach ($about_fields as $id => $args) {
        $sanitize = $args[1] === 'url' ? 'esc_url_raw' : ($args[1] === 'textarea' ? 'wp_kses_post' : 'wp_kses_post');
        $wp_customize->add_setting("balance_$id", array('default' => $args[2], 'sanitize_callback' => $sanitize));
        $control_type = $args[1] === 'textarea' ? 'textarea' : ($args[1] === 'url' ? 'url' : 'text');
        $wp_customize->add_control("balance_$id", array('label' => $args[0], 'section' => 'balance_about', 'type' => $control_type));
    }

    // ---- Jobs Section ----
    $wp_customize->add_section('balance_jobs', array(
        'title' => 'Jobs Section',
        'priority' => 40,
    ));

    $jobs_fields = array(
        'jobs_label_nl' => array('Label (NL)', 'text', 'Vacatures'),
        'jobs_label_en' => array('Label (EN)', 'text', 'Careers'),
        'jobs_title_nl' => array('Title (NL) — use &lt;em&gt; for gold italic', 'text', 'Word Deel Van <em>Ons Team</em>'),
        'jobs_title_en' => array('Title (EN)', 'text', 'Join <em>Our Team</em>'),
        'jobs_intro_nl' => array('Intro Text (NL)', 'textarea', ''),
        'jobs_intro_en' => array('Intro Text (EN)', 'textarea', ''),
        'jobs_apply_nl' => array('Apply Button (NL)', 'text', 'Solliciteer Nu'),
        'jobs_apply_en' => array('Apply Button (EN)', 'text', 'Apply Now'),
        'jobs_apply_url' => array('Apply Button URL', 'url', 'https://marketingdm.typeform.com/BHG-jobs'),
        'jobs_apply_sub_nl' => array('Apply Subtext (NL)', 'text', 'Alle locaties · Scheveningen'),
        'jobs_apply_sub_en' => array('Apply Subtext (EN)', 'text', 'All locations · Scheveningen'),
        'benefits_title_nl' => array('Benefits Title (NL)', 'text', 'Waarom werken bij <em>Balance</em>?'),
        'benefits_title_en' => array('Benefits Title (EN)', 'text', 'Why work at <em>Balance</em>?'),
    );

    foreach ($jobs_fields as $id => $args) {
        $sanitize = $args[1] === 'url' ? 'esc_url_raw' : 'wp_kses_post';
        $wp_customize->add_setting("balance_$id", array('default' => $args[2], 'sanitize_callback' => $sanitize));
        $wp_customize->add_control("balance_$id", array('label' => $args[0], 'section' => 'balance_jobs', 'type' => $args[1] === 'textarea' ? 'textarea' : ($args[1] === 'url' ? 'url' : 'text')));
    }

    // ---- Video Reel ----
    $wp_customize->add_section('balance_videos', array(
        'title' => 'Video Reel',
        'priority' => 38,
    ));

    for ($i = 1; $i <= 6; $i++) {
        $wp_customize->add_setting("balance_reel_url_$i", array('default' => '', 'sanitize_callback' => 'esc_url_raw'));
        $wp_customize->add_control("balance_reel_url_$i", array('label' => "Video/Image $i — Vimeo URL", 'section' => 'balance_videos', 'type' => 'url'));
        $wp_customize->add_setting("balance_reel_label_$i", array('default' => '', 'sanitize_callback' => 'sanitize_text_field'));
        $wp_customize->add_control("balance_reel_label_$i", array('label' => "Video/Image $i — Label", 'section' => 'balance_videos', 'type' => 'text'));
        $wp_customize->add_setting("balance_reel_type_$i", array('default' => 'vimeo', 'sanitize_callback' => 'sanitize_text_field'));
        $wp_customize->add_control("balance_reel_type_$i", array('label' => "Video/Image $i — Type", 'section' => 'balance_videos', 'type' => 'select', 'choices' => array('vimeo' => 'Vimeo Video', 'image' => 'Image URL')));
    }

    // ---- Footer ----
    $wp_customize->add_section('balance_footer', array(
        'title' => 'Footer',
        'priority' => 50,
    ));

    $footer_fields = array(
        'footer_desc_nl' => array('Description (NL)', 'textarea', ''),
        'footer_desc_en' => array('Description (EN)', 'textarea', ''),
        'footer_instagram' => array('Instagram URL', 'url', 'https://www.instagram.com/balancehospitality/'),
    );

    foreach ($footer_fields as $id => $args) {
        $sanitize = $args[1] === 'url' ? 'esc_url_raw' : 'wp_kses_post';
        $wp_customize->add_setting("balance_$id", array('default' => $args[2], 'sanitize_callback' => $sanitize));
        $wp_customize->add_control("balance_$id", array('label' => $args[0], 'section' => 'balance_footer', 'type' => $args[1] === 'textarea' ? 'textarea' : ($args[1] === 'url' ? 'url' : 'text')));
    }
}
add_action('customize_register', 'balance_customizer');

// ============ HELPER: GET CUSTOMIZER VALUE ============
function balance_get($key, $default = '') {
    return get_theme_mod("balance_$key", $default);
}
