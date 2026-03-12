/**
 * Visual Editor v2.0 — Wix-like Page Builder + SEO
 * Standalone inline editor for any static HTML site.
 * Drop in with a single <script> tag — no dependencies, no build step.
 *
 * Usage:
 *   <script src="visual-editor.js"
 *     data-ve-login-url="/api/login"
 *     data-ve-save-url="/api/save"
 *     data-ve-session-key="bh-edit-session"
 *   ></script>
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════
  const scriptTag = document.currentScript;
  const userCfg = window.VisualEditorConfig || {};
  function attr(name) { return scriptTag ? scriptTag.getAttribute('data-ve-' + name) : null; }

  const CONFIG = {
    loginUrl:       userCfg.loginUrl       || attr('login-url')      || '/api/login',
    saveUrl:        userCfg.saveUrl        || attr('save-url')       || '/api/save',
    saveFile:       userCfg.saveFile       || attr('save-file')      || 'index.html',
    sessionKey:     userCfg.sessionKey     || attr('session-key')    || 've-session',
    activate:       userCfg.activate       || attr('activate')       || '?edit',
    onSave:         userCfg.onSave         || null,
    excludeSelectors: userCfg.excludeSelectors || [],
    includeSelectors: userCfg.includeSelectors || [],
  };

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVATION CHECK
  // ═══════════════════════════════════════════════════════════════════
  function shouldActivate() {
    const a = CONFIG.activate;
    if (a === '?edit') return new URLSearchParams(window.location.search).has('edit');
    if (a.startsWith('/')) return window.location.pathname === a || window.location.pathname === a + '/';
    if (a === 'manual') return false;
    return new URLSearchParams(window.location.search).has(a.replace('?', ''));
  }
  if (!shouldActivate()) return;

  // ═══════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  let session = sessionStorage.getItem(CONFIG.sessionKey);
  let editorActive = false;
  let pendingChanges = {};
  let linkChanges = {};
  let imageChanges = {};
  let veIdCounter = 0;
  let historyStack = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // Section registry
  let sectionRegistry = [];

  // Selected element for properties panel
  let selectedEl = null;

  // SEO state
  let seoState = {
    title: '', metaDescription: '', canonicalUrl: '',
    robots: { index: true, follow: true },
    og: { title: '', description: '', image: '', type: 'website' },
    twitter: { card: 'summary_large_image', title: '', description: '', image: '' },
    structuredData: '',
    customHeadTags: ''
  };

  // Layout state
  let leftSidebarOpen = true;
  let rightSidebarOpen = true;
  let currentDevice = 'desktop'; // desktop | tablet | mobile
  const LEFT_W = 260;
  const RIGHT_W = 300;
  const TOPBAR_H = 48;

  // ═══════════════════════════════════════════════════════════════════
  // SHADOW DOM HOST
  // ═══════════════════════════════════════════════════════════════════
  const host = document.createElement('div');
  host.id = 've-host';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:999999;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const editorRoot = document.createElement('div');
  editorRoot.id = 've-root';
  shadow.appendChild(editorRoot);

  // ═══════════════════════════════════════════════════════════════════
  // EDITOR STYLES (Shadow DOM)
  // ═══════════════════════════════════════════════════════════════════
  const VF = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const GOLD = '#c6a355';
  const GOLD_DIM = 'rgba(198,163,85,0.3)';
  const GOLD_HOVER = '#d4b56a';
  const BG = '#1a1a1a';
  const BG2 = '#111';
  const BG3 = '#222';
  const WHITE = '#fff';
  const WHITE_DIM = 'rgba(255,255,255,0.5)';
  const WHITE_DIMMER = 'rgba(255,255,255,0.3)';
  const BORDER = 'rgba(255,255,255,0.1)';
  const RED = '#e74c3c';

  const styles = document.createElement('style');
  styles.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    :host { font-family: ${VF}; }

    /* ── Login ── */
    .ve-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; pointer-events: auto; font-family: ${VF}; z-index: 100; }
    .ve-login { background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 16px; padding: 48px; text-align: center; max-width: 380px; width: 90%; }
    .ve-login h2 { color: ${WHITE}; font-size: 1.5rem; margin-bottom: 4px; font-family: Georgia, serif; }
    .ve-login p { color: ${WHITE_DIM}; font-size: 0.8rem; margin-bottom: 24px; }
    .ve-login input { display: block; width: 100%; padding: 12px 16px; margin-bottom: 12px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 8px; color: ${WHITE}; font-size: 0.85rem; outline: none; transition: border 0.3s; font-family: ${VF}; }
    .ve-login input:focus { border-color: ${GOLD_DIM}; }
    .ve-login input::placeholder { color: ${WHITE_DIMMER}; }
    .ve-login-btn { display: block; width: 100%; padding: 12px; background: ${GOLD}; color: #111; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.3s; font-family: ${VF}; }
    .ve-login-btn:hover { background: ${GOLD_HOVER}; }
    .ve-login-error { color: ${RED}; font-size: 0.75rem; margin-top: 8px; min-height: 1.2em; }

    /* ── Top Bar ── */
    .ve-topbar { position: fixed; top: 0; left: 0; right: 0; height: ${TOPBAR_H}px; background: ${BG}; border-bottom: 1px solid ${BORDER}; display: flex; align-items: center; padding: 0 16px; gap: 8px; pointer-events: auto; z-index: 50; font-family: ${VF}; }
    .ve-topbar-title { color: ${GOLD}; font-weight: 700; font-size: 0.85rem; margin-right: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .ve-topbar-sep { width: 1px; height: 24px; background: ${BORDER}; margin: 0 4px; }
    .ve-topbar button, .ve-topbar .ve-tb { border: none; background: transparent; color: ${WHITE_DIM}; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; font-family: ${VF}; white-space: nowrap; }
    .ve-topbar button:hover { background: rgba(255,255,255,0.08); color: ${WHITE}; }
    .ve-topbar button:disabled { opacity: 0.3; cursor: not-allowed; }
    .ve-topbar button.active { background: rgba(198,163,85,0.15); color: ${GOLD}; }
    .ve-tb-save { background: ${GOLD} !important; color: #111 !important; font-weight: 600; padding: 6px 16px !important; }
    .ve-tb-save:hover { background: ${GOLD_HOVER} !important; }
    .ve-tb-save:disabled { opacity: 0.4 !important; }
    .ve-tb-changes { color: ${GOLD}; font-weight: 600; font-size: 0.7rem; }
    .ve-saving-indicator { opacity: 0.6; pointer-events: none; }

    /* ── Left Sidebar ── */
    .ve-left { position: fixed; top: ${TOPBAR_H}px; left: 0; bottom: 0; width: ${LEFT_W}px; background: ${BG}; border-right: 1px solid ${BORDER}; pointer-events: auto; overflow-y: auto; transition: transform 0.3s; z-index: 40; font-family: ${VF}; }
    .ve-left.collapsed { transform: translateX(-${LEFT_W}px); }
    .ve-left-header { padding: 12px 16px; border-bottom: 1px solid ${BORDER}; display: flex; align-items: center; justify-content: space-between; }
    .ve-left-header span { color: ${WHITE_DIM}; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; }
    .ve-section-list { padding: 8px 0; }
    .ve-section-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: grab; border-left: 3px solid transparent; transition: all 0.2s; }
    .ve-section-item:hover { background: rgba(255,255,255,0.04); border-left-color: ${GOLD_DIM}; }
    .ve-section-item.active { background: rgba(198,163,85,0.08); border-left-color: ${GOLD}; }
    .ve-section-item.hidden-section { opacity: 0.4; }
    .ve-section-item.drag-over { border-top: 2px solid ${GOLD}; }
    .ve-section-label { color: ${WHITE_DIM}; font-size: 0.75rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ve-section-item.active .ve-section-label { color: ${WHITE}; }
    .ve-section-grip { color: ${WHITE_DIMMER}; font-size: 0.65rem; cursor: grab; }
    .ve-section-btn { background: none; border: none; color: ${WHITE_DIMMER}; cursor: pointer; font-size: 0.7rem; padding: 2px 4px; border-radius: 3px; transition: all 0.2s; }
    .ve-section-btn:hover { color: ${WHITE}; background: rgba(255,255,255,0.1); }
    .ve-section-btn.danger:hover { color: ${RED}; }
    .ve-add-section-btn { display: block; margin: 12px auto; padding: 8px 20px; background: transparent; border: 1px dashed ${GOLD_DIM}; border-radius: 8px; color: ${GOLD}; font-size: 0.75rem; cursor: pointer; transition: all 0.3s; font-family: ${VF}; }
    .ve-add-section-btn:hover { background: rgba(198,163,85,0.08); border-color: ${GOLD}; }

    /* ── Right Sidebar ── */
    .ve-right { position: fixed; top: ${TOPBAR_H}px; right: 0; bottom: 0; width: ${RIGHT_W}px; background: ${BG}; border-left: 1px solid ${BORDER}; pointer-events: auto; overflow-y: auto; transition: transform 0.3s; z-index: 40; font-family: ${VF}; }
    .ve-right.collapsed { transform: translateX(${RIGHT_W}px); }
    .ve-right-header { padding: 12px 16px; border-bottom: 1px solid ${BORDER}; display: flex; align-items: center; justify-content: space-between; }
    .ve-right-header span { color: ${WHITE_DIM}; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; }
    .ve-right-empty { padding: 40px 20px; text-align: center; color: ${WHITE_DIMMER}; font-size: 0.75rem; }
    .ve-tabs { display: flex; border-bottom: 1px solid ${BORDER}; }
    .ve-tab { flex: 1; padding: 8px 4px; text-align: center; color: ${WHITE_DIMMER}; font-size: 0.65rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
    .ve-tab:hover { color: ${WHITE_DIM}; }
    .ve-tab.active { color: ${GOLD}; border-bottom-color: ${GOLD}; }
    .ve-tab-content { padding: 12px 16px; display: none; }
    .ve-tab-content.active { display: block; }
    .ve-prop-group { margin-bottom: 12px; }
    .ve-prop-label { color: ${WHITE_DIMMER}; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .ve-prop-input { width: 100%; padding: 6px 10px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${WHITE}; font-size: 0.8rem; outline: none; font-family: ${VF}; }
    .ve-prop-input:focus { border-color: ${GOLD_DIM}; }
    .ve-prop-row { display: flex; gap: 6px; margin-bottom: 6px; }
    .ve-prop-row .ve-prop-input { flex: 1; }
    .ve-prop-row label { color: ${WHITE_DIMMER}; font-size: 0.6rem; min-width: 14px; display: flex; align-items: center; }
    select.ve-prop-input { appearance: none; padding-right: 24px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; }
    .ve-align-btns { display: flex; gap: 4px; }
    .ve-align-btns button { flex: 1; padding: 6px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${WHITE_DIM}; cursor: pointer; font-size: 0.75rem; }
    .ve-align-btns button:hover, .ve-align-btns button.active { border-color: ${GOLD_DIM}; color: ${GOLD}; }
    .ve-color-row { display: flex; align-items: center; gap: 8px; }
    .ve-color-swatch { width: 28px; height: 28px; border-radius: 4px; border: 1px solid ${BORDER}; cursor: pointer; }
    input[type="range"].ve-prop-range { width: 100%; accent-color: ${GOLD}; }

    /* ── Toast ── */
    .ve-toast { position: fixed; top: ${TOPBAR_H + 12}px; left: 50%; transform: translateX(-50%); background: ${GOLD}; color: #111; padding: 10px 24px; border-radius: 8px; font-size: 0.8rem; font-weight: 500; z-index: 60; opacity: 0; transition: opacity 0.4s; pointer-events: auto; font-family: ${VF}; }
    .ve-toast.show { opacity: 1; }

    /* ── Popover (links, images) ── */
    .ve-popover { position: fixed; background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 12px; padding: 16px; min-width: 300px; pointer-events: auto; font-family: ${VF}; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 55; }
    .ve-popover label { display: block; color: ${WHITE_DIM}; font-size: 0.7rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ve-popover input[type="text"], .ve-popover input[type="url"] { display: block; width: 100%; padding: 8px 12px; margin-bottom: 10px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 6px; color: ${WHITE}; font-size: 0.8rem; outline: none; font-family: ${VF}; }
    .ve-popover input:focus { border-color: ${GOLD_DIM}; }
    .ve-popover-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
    .ve-popover-row input[type="checkbox"] { accent-color: ${GOLD}; }
    .ve-popover-row span { color: rgba(255,255,255,0.6); font-size: 0.75rem; }
    .ve-popover-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .ve-popover-actions button { border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: ${VF}; }
    .ve-pop-apply { background: ${GOLD}; color: #111; font-weight: 600; }
    .ve-pop-apply:hover { background: ${GOLD_HOVER}; }
    .ve-pop-remove { background: transparent; color: ${RED}; border: 1px solid rgba(231,76,60,0.3) !important; }
    .ve-pop-cancel { background: transparent; color: ${WHITE_DIM}; border: 1px solid ${BORDER} !important; }
    .ve-img-preview { max-width: 100%; max-height: 120px; border-radius: 6px; margin-bottom: 10px; object-fit: cover; }
    .ve-file-btn { display: inline-block; padding: 6px 14px; background: ${BG3}; color: rgba(255,255,255,0.6); border: 1px solid ${BORDER}; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-bottom: 10px; font-family: ${VF}; }
    .ve-file-btn:hover { color: ${WHITE}; border-color: ${WHITE_DIMMER}; }

    /* ── Rich text toolbar ── */
    .ve-rtbar { position: fixed; background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 8px; padding: 4px; display: flex; gap: 2px; pointer-events: auto; box-shadow: 0 4px 16px rgba(0,0,0,0.5); z-index: 56; font-family: ${VF}; }
    .ve-rtbar button { border: none; background: transparent; color: rgba(255,255,255,0.7); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .ve-rtbar button:hover { background: rgba(255,255,255,0.1); color: ${WHITE}; }
    .ve-rtbar button.active { background: rgba(198,163,85,0.2); color: ${GOLD}; }
    .ve-rtbar .ve-rt-sep { width: 1px; background: ${BORDER}; margin: 4px 2px; }

    /* ── SEO Panel (modal) ── */
    .ve-seo-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: flex-start; justify-content: center; pointer-events: auto; z-index: 70; padding-top: 60px; overflow-y: auto; }
    .ve-seo-panel { background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 16px; width: 680px; max-width: 95vw; padding: 32px; max-height: 85vh; overflow-y: auto; }
    .ve-seo-panel h3 { color: ${WHITE}; font-size: 1.1rem; margin-bottom: 20px; font-family: Georgia, serif; }
    .ve-seo-panel h4 { color: ${GOLD}; font-size: 0.8rem; margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 1px; }
    .ve-seo-field { margin-bottom: 14px; }
    .ve-seo-field label { display: block; color: ${WHITE_DIM}; font-size: 0.7rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ve-seo-field input, .ve-seo-field textarea, .ve-seo-field select { width: 100%; padding: 8px 12px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 6px; color: ${WHITE}; font-size: 0.8rem; outline: none; font-family: ${VF}; }
    .ve-seo-field textarea { min-height: 60px; resize: vertical; }
    .ve-seo-field input:focus, .ve-seo-field textarea:focus { border-color: ${GOLD_DIM}; }
    .ve-seo-field .ve-char-count { font-size: 0.65rem; color: ${WHITE_DIMMER}; margin-top: 2px; }
    .ve-seo-field .ve-char-warn { color: ${RED}; }
    .ve-seo-field .ve-char-ok { color: #2ecc71; }
    .ve-seo-row { display: flex; gap: 12px; }
    .ve-seo-row .ve-seo-field { flex: 1; }
    .ve-seo-check { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .ve-seo-check input { accent-color: ${GOLD}; }
    .ve-seo-check span { color: ${WHITE_DIM}; font-size: 0.8rem; }
    .ve-serp-preview { background: ${WHITE}; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .ve-serp-title { color: #1a0dab; font-size: 1.1rem; font-family: Arial, sans-serif; margin-bottom: 2px; cursor: pointer; }
    .ve-serp-title:hover { text-decoration: underline; }
    .ve-serp-url { color: #006621; font-size: 0.8rem; margin-bottom: 4px; }
    .ve-serp-desc { color: #545454; font-size: 0.85rem; line-height: 1.4; }
    .ve-social-preview { background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 8px; overflow: hidden; margin: 16px 0; max-width: 500px; }
    .ve-social-img { width: 100%; height: 200px; background: #333; background-size: cover; background-position: center; }
    .ve-social-body { padding: 12px; }
    .ve-social-body small { color: ${WHITE_DIMMER}; font-size: 0.65rem; text-transform: uppercase; }
    .ve-social-body h5 { color: ${WHITE}; font-size: 0.9rem; margin: 4px 0; }
    .ve-social-body p { color: ${WHITE_DIM}; font-size: 0.75rem; }
    .ve-seo-jsonld { width: 100%; min-height: 150px; padding: 10px; background: #0d0d0d; border: 1px solid ${BORDER}; border-radius: 6px; color: #7ec; font-size: 0.75rem; font-family: 'Courier New', monospace; resize: vertical; outline: none; }
    .ve-seo-jsonld:focus { border-color: ${GOLD_DIM}; }
    .ve-seo-tpl-btns { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
    .ve-seo-tpl-btns button { padding: 4px 10px; background: ${BG3}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${WHITE_DIM}; font-size: 0.7rem; cursor: pointer; font-family: ${VF}; }
    .ve-seo-tpl-btns button:hover { border-color: ${GOLD_DIM}; color: ${GOLD}; }
    .ve-seo-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .ve-seo-actions button { padding: 8px 20px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-family: ${VF}; border: none; }
    .ve-seo-close { background: transparent; color: ${WHITE_DIM}; border: 1px solid ${BORDER} !important; }
    .ve-seo-apply { background: ${GOLD}; color: #111; font-weight: 600; }
    .ve-seo-apply:hover { background: ${GOLD_HOVER}; }

    /* ── Template Chooser ── */
    .ve-tpl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; pointer-events: auto; z-index: 70; }
    .ve-tpl-panel { background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 16px; width: 600px; max-width: 95vw; padding: 32px; max-height: 80vh; overflow-y: auto; }
    .ve-tpl-panel h3 { color: ${WHITE}; font-size: 1.1rem; margin-bottom: 16px; font-family: Georgia, serif; }
    .ve-tpl-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .ve-tpl-card { background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 8px; padding: 20px 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .ve-tpl-card:hover { border-color: ${GOLD}; background: rgba(198,163,85,0.05); }
    .ve-tpl-icon { font-size: 1.8rem; margin-bottom: 8px; }
    .ve-tpl-name { color: ${WHITE_DIM}; font-size: 0.75rem; }

    /* ── Global Styles Panel ── */
    .ve-gs-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; pointer-events: auto; z-index: 70; }
    .ve-gs-panel { background: ${BG}; border: 1px solid ${GOLD_DIM}; border-radius: 16px; width: 420px; max-width: 95vw; padding: 32px; }
    .ve-gs-panel h3 { color: ${WHITE}; font-size: 1.1rem; margin-bottom: 16px; font-family: Georgia, serif; }
    .ve-gs-panel h4 { color: ${GOLD}; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px; }
    .ve-gs-color-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .ve-gs-color-row label { color: ${WHITE_DIM}; font-size: 0.75rem; min-width: 80px; }
    .ve-gs-color-row input[type="color"] { width: 36px; height: 28px; border: 1px solid ${BORDER}; border-radius: 4px; background: transparent; cursor: pointer; padding: 0; }
    .ve-gs-color-row input[type="text"] { flex: 1; padding: 4px 8px; background: ${BG2}; border: 1px solid ${BORDER}; border-radius: 4px; color: ${WHITE}; font-size: 0.75rem; outline: none; font-family: monospace; }
    .ve-gs-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .ve-gs-actions button { padding: 8px 20px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-family: ${VF}; border: none; }

    /* ── Confirm Dialog ── */
    .ve-confirm { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; pointer-events: auto; z-index: 80; }
    .ve-confirm-box { background: ${BG}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 24px; min-width: 300px; text-align: center; }
    .ve-confirm-box p { color: ${WHITE}; font-size: 0.9rem; margin-bottom: 16px; }
    .ve-confirm-box .ve-confirm-btns { display: flex; gap: 8px; justify-content: center; }
    .ve-confirm-box button { padding: 8px 20px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-family: ${VF}; border: none; }
  `;
  shadow.appendChild(styles);

  // ═══════════════════════════════════════════════════════════════════
  // PAGE-LEVEL STYLES (editable highlights + canvas offset)
  // ═══════════════════════════════════════════════════════════════════
  const pageStyle = document.createElement('style');
  pageStyle.id = 've-page-styles';
  pageStyle.textContent = '';

  function updatePageStyles() {
    const lOff = leftSidebarOpen ? LEFT_W : 0;
    const rOff = rightSidebarOpen ? RIGHT_W : 0;
    const deviceMaxW = currentDevice === 'tablet' ? '768px' : currentDevice === 'mobile' ? '375px' : 'none';
    const deviceMargin = currentDevice !== 'desktop' ? 'auto' : '0';
    pageStyle.textContent = `
      body.ve-active { padding-top: ${TOPBAR_H}px !important; padding-left: ${lOff}px !important; padding-right: ${rOff}px !important; transition: padding 0.3s !important; min-height: 100vh; }
      body.ve-active > .navbar, body.ve-active > nav, body.ve-active > header { left: ${lOff}px !important; right: ${rOff}px !important; top: ${TOPBAR_H}px !important; }
      ${currentDevice !== 'desktop' ? `body.ve-active { max-width: ${deviceMaxW} !important; margin-left: ${lOff + 20}px !important; margin-right: auto !important; padding-right: 0 !important; background: #0a0a0a; }` : ''}
      [data-ve-id].ve-editable { outline: 2px dashed transparent; cursor: text; transition: outline 0.3s, background 0.3s; border-radius: 3px; }
      [data-ve-id].ve-editable:hover { outline: 2px dashed rgba(198,163,85,0.5); background: rgba(198,163,85,0.06); }
      [data-ve-id].ve-editable:focus { outline: 2px solid ${GOLD}; background: rgba(198,163,85,0.1); }
      [data-ve-id].ve-editable-img { cursor: pointer; position: relative; }
      [data-ve-id].ve-editable-img:hover { outline: 2px dashed rgba(198,163,85,0.5); outline-offset: 2px; }
      .ve-selected-outline { outline: 2px solid ${GOLD} !important; outline-offset: 2px; }
      .ve-section-hover { outline: 2px dashed rgba(198,163,85,0.3) !important; outline-offset: 4px; }
    `;
  }

  // ═══════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════
  function $(sel, root) { return (root || editorRoot).querySelector(sel); }
  function $$(sel, root) { return (root || editorRoot).querySelectorAll(sel); }

  function showToast(msg) {
    const t = $('.ve-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  function stampId(el) {
    if (!el.dataset.veId) el.dataset.veId = 've-' + (++veIdCounter);
    return el.dataset.veId;
  }

  function confirm(msg) {
    return new Promise(resolve => {
      const d = document.createElement('div');
      d.className = 've-confirm';
      d.innerHTML = `<div class="ve-confirm-box"><p>${msg}</p><div class="ve-confirm-btns"><button class="ve-pop-cancel">Cancel</button><button class="ve-pop-apply">Confirm</button></div></div>`;
      editorRoot.appendChild(d);
      d.querySelector('.ve-pop-apply').onclick = () => { d.remove(); resolve(true); };
      d.querySelector('.ve-pop-cancel').onclick = () => { d.remove(); resolve(false); };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // HISTORY (Undo/Redo)
  // ═══════════════════════════════════════════════════════════════════
  function pushHistory() {
    const snap = collectState();
    if (historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(snap);
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
    historyIndex = historyStack.length - 1;
    updateUndoButtons();
  }

  function collectState() {
    const state = {};
    document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
      state[el.dataset.veId] = el.innerHTML;
    });
    document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => {
      if (el.tagName === 'IMG') state[el.dataset.veId] = { src: el.src, alt: el.alt };
    });
    document.querySelectorAll('a[data-ve-id]').forEach(el => {
      const id = el.dataset.veId;
      if (!state[id]) state[id] = el.innerHTML;
      state[id + '__href'] = el.href;
      state[id + '__target'] = el.target;
    });
    return JSON.stringify(state);
  }

  function restoreState(snapStr) {
    const state = JSON.parse(snapStr);
    for (const [key, val] of Object.entries(state)) {
      if (key.endsWith('__href') || key.endsWith('__target')) continue;
      const el = document.querySelector('[data-ve-id="' + key + '"]');
      if (!el) continue;
      if (typeof val === 'object' && val.src !== undefined) { el.src = val.src; el.alt = val.alt || ''; }
      else el.innerHTML = val;
    }
    for (const [key, val] of Object.entries(state)) {
      if (key.endsWith('__href')) {
        const el = document.querySelector('[data-ve-id="' + key.replace('__href', '') + '"]');
        if (el && el.tagName === 'A') el.href = val;
      }
      if (key.endsWith('__target')) {
        const el = document.querySelector('[data-ve-id="' + key.replace('__target', '') + '"]');
        if (el && el.tagName === 'A') el.target = val;
      }
    }
    recalcChanges();
  }

  function undo() { if (historyIndex <= 0) return; historyIndex--; restoreState(historyStack[historyIndex]); updateUndoButtons(); }
  function redo() { if (historyIndex >= historyStack.length - 1) return; historyIndex++; restoreState(historyStack[historyIndex]); updateUndoButtons(); }

  function updateUndoButtons() {
    const u = $('.ve-undo-btn'); const r = $('.ve-redo-btn');
    if (u) u.disabled = historyIndex <= 0;
    if (r) r.disabled = historyIndex >= historyStack.length - 1;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ELEMENT DETECTION
  // ═══════════════════════════════════════════════════════════════════
  const TEXT_SELECTORS = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,label,blockquote,figcaption,caption,a,button,dt,dd';
  const IMG_SELECTORS = 'img';
  const SKIP_SELECTORS = 'script,style,noscript,svg,iframe,#ve-host,[data-ve-skip]';

  function isSkipped(el) {
    if (el.matches && el.matches(SKIP_SELECTORS)) return true;
    if (el.closest && el.closest(SKIP_SELECTORS)) return true;
    for (const sel of CONFIG.excludeSelectors) { if (el.matches && el.matches(sel)) return true; }
    return false;
  }

  function hasDirectText(el) {
    for (const node of el.childNodes) { if (node.nodeType === 3 && node.textContent.trim().length > 0) return true; }
    return false;
  }

  function detectElements(scope) {
    const root = scope || document;
    const textEls = [];
    const imgEls = [];
    for (const sel of CONFIG.includeSelectors) {
      root.querySelectorAll(sel).forEach(el => { if (!isSkipped(el)) { stampId(el); textEls.push(el); } });
    }
    root.querySelectorAll(TEXT_SELECTORS).forEach(el => {
      if (isSkipped(el)) return;
      if (el.dataset.veId && textEls.includes(el)) return;
      if (!hasDirectText(el) && el.querySelector(TEXT_SELECTORS)) return;
      if (!el.textContent.trim()) return;
      stampId(el); textEls.push(el);
    });
    root.querySelectorAll('[data-editable]').forEach(el => {
      if (isSkipped(el)) return;
      if (!el.dataset.veId) { stampId(el); textEls.push(el); }
    });
    root.querySelectorAll(IMG_SELECTORS).forEach(el => {
      if (isSkipped(el)) return;
      stampId(el); imgEls.push(el);
    });
    return { textEls, imgEls };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION DETECTION
  // ═══════════════════════════════════════════════════════════════════
  function detectSections() {
    sectionRegistry = [];
    const candidates = document.querySelectorAll('body > section, body > header, body > footer, body > main, main > section, main > div, [data-ve-section]');
    const seen = new Set();
    candidates.forEach(el => {
      if (seen.has(el) || el.id === 've-host' || el.matches('#ve-host, script, style, link')) return;
      seen.add(el);
      const heading = el.querySelector('h1,h2,h3');
      const label = el.id || (heading ? heading.textContent.trim().slice(0, 30) : '') || el.tagName.toLowerCase();
      sectionRegistry.push({ id: stampId(el), el, label, visible: el.style.display !== 'none' });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHANGE TRACKING
  // ═══════════════════════════════════════════════════════════════════
  function recalcChanges() {
    pendingChanges = {}; linkChanges = {}; imageChanges = {};
    document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
      const id = el.dataset.veId;
      if (el.innerHTML !== (el.dataset.veOriginal || '')) pendingChanges[id] = { el, original: el.dataset.veOriginal, current: el.innerHTML };
      if (el.tagName === 'A') {
        if (el.href !== (el.dataset.veOrigHref || '') || el.target !== (el.dataset.veOrigTarget || '')) linkChanges[id] = { el, href: el.href, target: el.target };
      }
    });
    document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => {
      const id = el.dataset.veId;
      if (el.src !== (el.dataset.veOrigSrc || '') || el.alt !== (el.dataset.veOrigAlt || '')) imageChanges[id] = { el, src: el.src, alt: el.alt };
    });
    updateToolbar();
  }

  function totalChanges() { return Object.keys(pendingChanges).length + Object.keys(linkChanges).length + Object.keys(imageChanges).length; }

  function updateToolbar() {
    const c = totalChanges();
    const countEl = $('.ve-tb-changes');
    const saveBtn = $('.ve-tb-save');
    if (countEl) countEl.textContent = c > 0 ? c + ' change' + (c > 1 ? 's' : '') : '';
    if (saveBtn) saveBtn.disabled = c === 0;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LINK POPOVER
  // ═══════════════════════════════════════════════════════════════════
  let activePopover = null;
  function closePopover() { if (activePopover) { activePopover.remove(); activePopover = null; } }

  function showLinkPopover(el) {
    closePopover();
    const rect = el.getBoundingClientRect();
    const isLink = el.tagName === 'A';
    const pop = document.createElement('div');
    pop.className = 've-popover';
    pop.innerHTML = `
      <label>Text</label>
      <input type="text" class="ve-pop-text" value="${el.textContent.replace(/"/g, '&quot;')}">
      ${isLink ? `<label>URL</label><input type="url" class="ve-pop-url" value="${(el.href || '').replace(/"/g, '&quot;')}">
        <div class="ve-popover-row"><input type="checkbox" class="ve-pop-newtab" ${el.target === '_blank' ? 'checked' : ''}><span>Open in new tab</span></div>` : ''}
      <div class="ve-popover-actions">${isLink ? '<button class="ve-pop-remove">Remove Link</button>' : ''}<button class="ve-pop-cancel">Cancel</button><button class="ve-pop-apply">Apply</button></div>`;
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 320)) + 'px';
    editorRoot.appendChild(pop);
    activePopover = pop;

    pop.querySelector('.ve-pop-apply').addEventListener('click', () => {
      pushHistory();
      el.textContent = pop.querySelector('.ve-pop-text').value;
      if (isLink) { el.href = pop.querySelector('.ve-pop-url').value; el.target = pop.querySelector('.ve-pop-newtab').checked ? '_blank' : ''; }
      recalcChanges(); closePopover();
    });
    pop.querySelector('.ve-pop-cancel').addEventListener('click', closePopover);
    const rb = pop.querySelector('.ve-pop-remove');
    if (rb) rb.addEventListener('click', () => {
      pushHistory();
      const span = document.createElement('span');
      span.textContent = el.textContent;
      span.dataset.veId = el.dataset.veId;
      span.dataset.veOriginal = el.dataset.veOriginal;
      span.classList.add('ve-editable');
      span.setAttribute('contenteditable', 'true');
      el.replaceWith(span);
      recalcChanges(); closePopover();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // IMAGE POPOVER
  // ═══════════════════════════════════════════════════════════════════
  function showImagePopover(el) {
    closePopover();
    const rect = el.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 've-popover';
    pop.innerHTML = `
      <img class="ve-img-preview" src="${el.src}">
      <label>Image URL</label><input type="url" class="ve-pop-imgsrc" value="${(el.src || '').replace(/"/g, '&quot;')}">
      <label class="ve-file-btn">Upload Image<input type="file" accept="image/*" style="display:none" class="ve-pop-file"></label>
      <label>Alt Text</label><input type="text" class="ve-pop-imgalt" value="${(el.alt || '').replace(/"/g, '&quot;')}">
      <div class="ve-popover-actions"><button class="ve-pop-cancel">Cancel</button><button class="ve-pop-apply">Apply</button></div>`;
    pop.style.top = Math.min(rect.bottom + 8, window.innerHeight - 350) + 'px';
    pop.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 320)) + 'px';
    editorRoot.appendChild(pop);
    activePopover = pop;

    const preview = pop.querySelector('.ve-img-preview');
    const srcInput = pop.querySelector('.ve-pop-imgsrc');
    srcInput.addEventListener('input', () => { preview.src = srcInput.value; });
    pop.querySelector('.ve-pop-file').addEventListener('change', function () {
      if (this.files[0]) { const u = URL.createObjectURL(this.files[0]); preview.src = u; srcInput.value = u; }
    });
    pop.querySelector('.ve-pop-apply').addEventListener('click', () => {
      pushHistory(); el.src = srcInput.value; el.alt = pop.querySelector('.ve-pop-imgalt').value; recalcChanges(); closePopover();
    });
    pop.querySelector('.ve-pop-cancel').addEventListener('click', closePopover);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RICH TEXT TOOLBAR
  // ═══════════════════════════════════════════════════════════════════
  let rtBar = null;
  function createRTBar() {
    rtBar = document.createElement('div');
    rtBar.className = 've-rtbar';
    rtBar.style.display = 'none';
    rtBar.innerHTML = `
      <button data-cmd="bold" title="Bold"><b>B</b></button>
      <button data-cmd="italic" title="Italic"><i>I</i></button>
      <button data-cmd="underline" title="Underline"><u>U</u></button>
      <div class="ve-rt-sep"></div>
      <button data-cmd="createLink" title="Add Link">&#128279;</button>
      <button data-cmd="removeFormat" title="Clear">&#10006;</button>`;
    editorRoot.appendChild(rtBar);
    rtBar.querySelectorAll('button[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        if (cmd === 'createLink') { const u = prompt('Enter URL:'); if (u) document.execCommand('createLink', false, u); }
        else document.execCommand(cmd, false, null);
        pushHistory(); recalcChanges();
      });
    });
  }
  function positionRTBar() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (rtBar) rtBar.style.display = 'none'; return; }
    const anchor = sel.anchorNode;
    const parent = anchor && (anchor.nodeType === 3 ? anchor.parentElement : anchor);
    const editable = parent && parent.closest && parent.closest('[data-ve-id].ve-editable');
    if (!editable) { if (rtBar) rtBar.style.display = 'none'; return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0) { rtBar.style.display = 'none'; return; }
    rtBar.style.display = 'flex';
    rtBar.style.top = (rect.top - 44) + 'px';
    rtBar.style.left = Math.max(8, rect.left + rect.width / 2 - 80) + 'px';
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLICK INTERCEPTION
  // ═══════════════════════════════════════════════════════════════════
  function clickInterceptor(e) {
    if (!editorActive) return;
    if (activePopover && !activePopover.contains(e.target)) closePopover();

    const img = e.target.closest('img');
    if (img && img.dataset.veId && img.classList.contains('ve-editable-img')) {
      e.preventDefault(); e.stopImmediatePropagation(); showImagePopover(img); return;
    }
    const link = e.target.closest('a');
    if (link && link.dataset.veId) {
      e.preventDefault(); e.stopImmediatePropagation(); showLinkPopover(link); return;
    }
    const button = e.target.closest('button');
    if (button && button.dataset.veId) {
      e.preventDefault(); e.stopImmediatePropagation(); button.focus(); return;
    }

    // Select element for properties panel
    const veEl = e.target.closest('[data-ve-id]');
    if (veEl) selectElement(veEl);
  }

  // ═══════════════════════════════════════════════════════════════════
  // PROPERTIES PANEL — Element Selection
  // ═══════════════════════════════════════════════════════════════════
  function selectElement(el) {
    // Deselect previous
    if (selectedEl) selectedEl.classList.remove('ve-selected-outline');
    selectedEl = el;
    el.classList.add('ve-selected-outline');
    renderPropsPanel(el);
    // Highlight in section tree
    const sec = el.closest('[data-ve-id]');
    if (sec) highlightSection(sec.dataset.veId);
  }

  function renderPropsPanel(el) {
    const panel = $('.ve-right-body');
    if (!panel) return;
    const cs = window.getComputedStyle(el);

    panel.innerHTML = `
      <div class="ve-tabs">
        <div class="ve-tab active" data-tab="text">Text</div>
        <div class="ve-tab" data-tab="layout">Layout</div>
        <div class="ve-tab" data-tab="bg">BG</div>
        <div class="ve-tab" data-tab="border">Border</div>
        <div class="ve-tab" data-tab="fx">Effects</div>
      </div>

      <div class="ve-tab-content active" data-tab="text">
        <div class="ve-prop-group">
          <div class="ve-prop-label">Font Family</div>
          <select class="ve-prop-input" data-prop="fontFamily">
            <option value="">— inherited —</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Playfair Display', serif">Playfair Display</option>
            <option value="Inter, sans-serif">Inter</option>
            <option value="inherit">Inherit</option>
          </select>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Font Size</div>
          <div class="ve-prop-row"><input class="ve-prop-input" data-prop="fontSize" value="${cs.fontSize}"></div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Font Weight</div>
          <select class="ve-prop-input" data-prop="fontWeight">
            <option value="normal">Normal</option><option value="bold">Bold</option>
            <option value="100">100</option><option value="200">200</option><option value="300">300</option>
            <option value="400">400</option><option value="500">500</option><option value="600">600</option>
            <option value="700">700</option><option value="800">800</option><option value="900">900</option>
          </select>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Color</div>
          <div class="ve-color-row">
            <input type="color" class="ve-color-swatch" data-prop="color" value="${rgbToHex(cs.color)}">
            <input class="ve-prop-input" data-prop="color" value="${rgbToHex(cs.color)}">
          </div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Line Height</div>
          <input class="ve-prop-input" data-prop="lineHeight" value="${cs.lineHeight}">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Text Align</div>
          <div class="ve-align-btns">
            <button data-prop="textAlign" data-val="left" ${cs.textAlign === 'left' ? 'class="active"' : ''}>L</button>
            <button data-prop="textAlign" data-val="center" ${cs.textAlign === 'center' ? 'class="active"' : ''}>C</button>
            <button data-prop="textAlign" data-val="right" ${cs.textAlign === 'right' ? 'class="active"' : ''}>R</button>
            <button data-prop="textAlign" data-val="justify" ${cs.textAlign === 'justify' ? 'class="active"' : ''}>J</button>
          </div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Letter Spacing</div>
          <input class="ve-prop-input" data-prop="letterSpacing" value="${cs.letterSpacing}">
        </div>
      </div>

      <div class="ve-tab-content" data-tab="layout">
        <div class="ve-prop-group">
          <div class="ve-prop-label">Width</div>
          <input class="ve-prop-input" data-prop="width" value="${el.style.width || ''}">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Max Width</div>
          <input class="ve-prop-input" data-prop="maxWidth" value="${el.style.maxWidth || ''}">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Padding</div>
          <div class="ve-prop-row">
            <label>T</label><input class="ve-prop-input" data-prop="paddingTop" value="${px(cs.paddingTop)}">
            <label>R</label><input class="ve-prop-input" data-prop="paddingRight" value="${px(cs.paddingRight)}">
            <label>B</label><input class="ve-prop-input" data-prop="paddingBottom" value="${px(cs.paddingBottom)}">
            <label>L</label><input class="ve-prop-input" data-prop="paddingLeft" value="${px(cs.paddingLeft)}">
          </div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Margin</div>
          <div class="ve-prop-row">
            <label>T</label><input class="ve-prop-input" data-prop="marginTop" value="${px(cs.marginTop)}">
            <label>R</label><input class="ve-prop-input" data-prop="marginRight" value="${px(cs.marginRight)}">
            <label>B</label><input class="ve-prop-input" data-prop="marginBottom" value="${px(cs.marginBottom)}">
            <label>L</label><input class="ve-prop-input" data-prop="marginLeft" value="${px(cs.marginLeft)}">
          </div>
        </div>
      </div>

      <div class="ve-tab-content" data-tab="bg">
        <div class="ve-prop-group">
          <div class="ve-prop-label">Background Color</div>
          <div class="ve-color-row">
            <input type="color" class="ve-color-swatch" data-prop="backgroundColor" value="${rgbToHex(cs.backgroundColor)}">
            <input class="ve-prop-input" data-prop="backgroundColor" value="${rgbToHex(cs.backgroundColor)}">
          </div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Background Image URL</div>
          <input class="ve-prop-input" data-prop="backgroundImage" value="${extractUrl(cs.backgroundImage) || ''}" placeholder="url(...)">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Opacity</div>
          <input type="range" class="ve-prop-range" data-prop="opacity" min="0" max="1" step="0.05" value="${cs.opacity}">
        </div>
      </div>

      <div class="ve-tab-content" data-tab="border">
        <div class="ve-prop-group">
          <div class="ve-prop-label">Border Width</div>
          <input class="ve-prop-input" data-prop="borderWidth" value="${px(cs.borderTopWidth)}">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Border Color</div>
          <div class="ve-color-row">
            <input type="color" class="ve-color-swatch" data-prop="borderColor" value="${rgbToHex(cs.borderTopColor)}">
            <input class="ve-prop-input" data-prop="borderColor" value="${rgbToHex(cs.borderTopColor)}">
          </div>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Border Style</div>
          <select class="ve-prop-input" data-prop="borderStyle">
            <option value="none">None</option><option value="solid" ${cs.borderTopStyle === 'solid' ? 'selected' : ''}>Solid</option>
            <option value="dashed" ${cs.borderTopStyle === 'dashed' ? 'selected' : ''}>Dashed</option>
            <option value="dotted" ${cs.borderTopStyle === 'dotted' ? 'selected' : ''}>Dotted</option>
          </select>
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Border Radius</div>
          <input class="ve-prop-input" data-prop="borderRadius" value="${px(cs.borderRadius)}">
        </div>
      </div>

      <div class="ve-tab-content" data-tab="fx">
        <div class="ve-prop-group">
          <div class="ve-prop-label">Box Shadow</div>
          <input class="ve-prop-input" data-prop="boxShadow" value="${cs.boxShadow === 'none' ? '' : cs.boxShadow}" placeholder="0px 4px 12px rgba(0,0,0,0.3)">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Opacity</div>
          <input type="range" class="ve-prop-range" data-prop="opacity" min="0" max="1" step="0.05" value="${cs.opacity}">
        </div>
        <div class="ve-prop-group">
          <div class="ve-prop-label">Rotate (deg)</div>
          <input class="ve-prop-input" data-prop="transform" value="${extractRotation(cs.transform)}" placeholder="0">
        </div>
      </div>`;

    // Tab switching
    panel.querySelectorAll('.ve-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.ve-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.ve-tab-content').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        panel.querySelector(`.ve-tab-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
      });
    });

    // Property change handlers
    panel.querySelectorAll('.ve-prop-input, .ve-prop-range').forEach(input => {
      const handler = () => {
        if (!selectedEl) return;
        pushHistory();
        const prop = input.dataset.prop;
        let val = input.value;
        if (prop === 'backgroundImage' && val && !val.startsWith('url(')) val = 'url(' + val + ')';
        if (prop === 'transform') val = val ? 'rotate(' + val + 'deg)' : '';
        selectedEl.style[prop] = val;

        // Sync color swatch with text input
        const row = input.closest('.ve-color-row');
        if (row) {
          const swatch = row.querySelector('input[type="color"]');
          const text = row.querySelector('input:not([type="color"])');
          if (input.type === 'color') text.value = input.value;
          else if (swatch) swatch.value = input.value.match(/^#[0-9a-f]{6}$/i) ? input.value : '#000000';
        }
        recalcChanges();
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });

    // Set current font-weight/family values
    const fwSel = panel.querySelector('select[data-prop="fontWeight"]');
    if (fwSel) fwSel.value = cs.fontWeight;
    const ffSel = panel.querySelector('select[data-prop="fontFamily"]');
    if (ffSel) {
      const match = Array.from(ffSel.options).find(o => o.value && cs.fontFamily.includes(o.value.split(',')[0].replace(/'/g, '')));
      if (match) ffSel.value = match.value;
    }

    // Align buttons
    panel.querySelectorAll('.ve-align-btns button').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!selectedEl) return;
        pushHistory();
        selectedEl.style.textAlign = btn.dataset.val;
        panel.querySelectorAll('.ve-align-btns button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        recalcChanges();
      });
    });
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return '#000000';
    return '#' + [m[0], m[1], m[2]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
  }

  function px(val) { return val ? val.replace('px', '') : ''; }

  function extractUrl(val) {
    if (!val || val === 'none') return '';
    const m = val.match(/url\(["']?([^"')]+)["']?\)/);
    return m ? m[1] : '';
  }

  function extractRotation(val) {
    if (!val || val === 'none') return '0';
    const m = val.match(/rotate\(([\d.-]+)deg\)/);
    return m ? m[1] : '0';
  }

  // ═══════════════════════════════════════════════════════════════════
  // SEO PANEL
  // ═══════════════════════════════════════════════════════════════════
  function parseSEO() {
    seoState.title = document.title || '';
    const getMeta = (name, attr) => {
      const el = document.querySelector(`meta[${attr || 'name'}="${name}"]`);
      return el ? el.getAttribute('content') || '' : '';
    };
    seoState.metaDescription = getMeta('description');
    seoState.canonicalUrl = (document.querySelector('link[rel="canonical"]') || {}).href || '';
    seoState.og.title = getMeta('og:title', 'property');
    seoState.og.description = getMeta('og:description', 'property');
    seoState.og.image = getMeta('og:image', 'property');
    seoState.og.type = getMeta('og:type', 'property') || 'website';
    seoState.twitter.card = getMeta('twitter:card') || 'summary_large_image';
    seoState.twitter.title = getMeta('twitter:title');
    seoState.twitter.description = getMeta('twitter:description');
    seoState.twitter.image = getMeta('twitter:image');
    const robots = getMeta('robots');
    seoState.robots.index = !robots.includes('noindex');
    seoState.robots.follow = !robots.includes('nofollow');
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    seoState.structuredData = jsonLd ? jsonLd.textContent : '';
  }

  function showSEOPanel() {
    closePopover();
    const ov = document.createElement('div');
    ov.className = 've-seo-overlay';
    const s = seoState;
    const siteUrl = window.location.origin + window.location.pathname;
    ov.innerHTML = `<div class="ve-seo-panel">
      <h3>SEO Settings</h3>

      <div class="ve-seo-field"><label>Page Title</label><input class="ve-seo-title" value="${esc(s.title)}" maxlength="70"><div class="ve-char-count"><span class="ve-title-count">${s.title.length}</span>/60 chars</div></div>
      <div class="ve-seo-field"><label>Meta Description</label><textarea class="ve-seo-desc" maxlength="320">${esc(s.metaDescription)}</textarea><div class="ve-char-count"><span class="ve-desc-count">${s.metaDescription.length}</span>/160 chars</div></div>
      <div class="ve-seo-field"><label>Canonical URL</label><input class="ve-seo-canonical" value="${esc(s.canonicalUrl)}" placeholder="${siteUrl}"></div>

      <div class="ve-seo-check"><input type="checkbox" class="ve-seo-index" ${s.robots.index ? 'checked' : ''}><span>Allow indexing (index)</span></div>
      <div class="ve-seo-check"><input type="checkbox" class="ve-seo-follow" ${s.robots.follow ? 'checked' : ''}><span>Allow link following (follow)</span></div>

      <h4>Google Preview</h4>
      <div class="ve-serp-preview"><div class="ve-serp-title">${esc(s.title) || 'Page Title'}</div><div class="ve-serp-url">${siteUrl}</div><div class="ve-serp-desc">${esc(s.metaDescription) || 'Page description will appear here...'}</div></div>

      <h4>Open Graph</h4>
      <div class="ve-seo-row">
        <div class="ve-seo-field"><label>OG Title</label><input class="ve-seo-og-title" value="${esc(s.og.title)}"></div>
        <div class="ve-seo-field"><label>OG Type</label><select class="ve-seo-og-type"><option value="website" ${s.og.type === 'website' ? 'selected' : ''}>Website</option><option value="article" ${s.og.type === 'article' ? 'selected' : ''}>Article</option><option value="restaurant" ${s.og.type === 'restaurant' ? 'selected' : ''}>Restaurant</option></select></div>
      </div>
      <div class="ve-seo-field"><label>OG Description</label><textarea class="ve-seo-og-desc">${esc(s.og.description)}</textarea></div>
      <div class="ve-seo-field"><label>OG Image URL</label><input class="ve-seo-og-img" value="${esc(s.og.image)}"></div>

      <h4>Social Preview</h4>
      <div class="ve-social-preview"><div class="ve-social-img" style="background-image:url('${esc(s.og.image)}')"></div><div class="ve-social-body"><small>${new URL(siteUrl).hostname}</small><h5>${esc(s.og.title || s.title) || 'Title'}</h5><p>${esc(s.og.description || s.metaDescription) || 'Description'}</p></div></div>

      <h4>Twitter Card</h4>
      <div class="ve-seo-row">
        <div class="ve-seo-field"><label>Card Type</label><select class="ve-seo-tw-card"><option value="summary_large_image" ${s.twitter.card === 'summary_large_image' ? 'selected' : ''}>Large Image</option><option value="summary" ${s.twitter.card === 'summary' ? 'selected' : ''}>Summary</option></select></div>
        <div class="ve-seo-field"><label>Title</label><input class="ve-seo-tw-title" value="${esc(s.twitter.title)}"></div>
      </div>
      <div class="ve-seo-field"><label>Description</label><input class="ve-seo-tw-desc" value="${esc(s.twitter.description)}"></div>
      <div class="ve-seo-field"><label>Image URL</label><input class="ve-seo-tw-img" value="${esc(s.twitter.image)}"></div>

      <h4>Structured Data (JSON-LD)</h4>
      <div class="ve-seo-tpl-btns">
        <button data-tpl="restaurant">Restaurant</button>
        <button data-tpl="localbusiness">Local Business</button>
        <button data-tpl="organization">Organization</button>
        <button data-tpl="webpage">WebPage</button>
      </div>
      <textarea class="ve-seo-jsonld">${esc(s.structuredData)}</textarea>

      <div class="ve-seo-actions"><button class="ve-seo-close">Cancel</button><button class="ve-seo-apply">Apply SEO</button></div>
    </div>`;

    editorRoot.appendChild(ov);

    // Live SERP preview updates
    const titleInput = ov.querySelector('.ve-seo-title');
    const descInput = ov.querySelector('.ve-seo-desc');
    const serpTitle = ov.querySelector('.ve-serp-title');
    const serpDesc = ov.querySelector('.ve-serp-desc');
    titleInput.addEventListener('input', () => {
      serpTitle.textContent = titleInput.value || 'Page Title';
      ov.querySelector('.ve-title-count').textContent = titleInput.value.length;
    });
    descInput.addEventListener('input', () => {
      serpDesc.textContent = descInput.value || 'Description';
      ov.querySelector('.ve-desc-count').textContent = descInput.value.length;
    });

    // Live social preview
    const ogImg = ov.querySelector('.ve-seo-og-img');
    const ogTitle = ov.querySelector('.ve-seo-og-title');
    const ogDesc = ov.querySelector('.ve-seo-og-desc');
    const socialImg = ov.querySelector('.ve-social-img');
    const socialTitle = ov.querySelector('.ve-social-body h5');
    const socialDesc = ov.querySelector('.ve-social-body p');
    ogImg.addEventListener('input', () => { socialImg.style.backgroundImage = `url('${ogImg.value}')`; });
    ogTitle.addEventListener('input', () => { socialTitle.textContent = ogTitle.value || titleInput.value || 'Title'; });
    ogDesc.addEventListener('input', () => { socialDesc.textContent = ogDesc.value || descInput.value || 'Description'; });

    // JSON-LD templates
    ov.querySelectorAll('.ve-seo-tpl-btns button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tpl = btn.dataset.tpl;
        const templates = {
          restaurant: JSON.stringify({"@context":"https://schema.org","@type":"Restaurant","name":"","image":"","address":{"@type":"PostalAddress","streetAddress":"","addressLocality":"","postalCode":"","addressCountry":"NL"},"telephone":"","servesCuisine":"","priceRange":"$$","url":""}, null, 2),
          localbusiness: JSON.stringify({"@context":"https://schema.org","@type":"LocalBusiness","name":"","image":"","address":{"@type":"PostalAddress","streetAddress":"","addressLocality":"","postalCode":"","addressCountry":"NL"},"telephone":"","openingHours":"Mo-Su 09:00-23:00","url":""}, null, 2),
          organization: JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":"","url":"","logo":"","sameAs":[]}, null, 2),
          webpage: JSON.stringify({"@context":"https://schema.org","@type":"WebPage","name":"","description":"","url":""}, null, 2),
        };
        ov.querySelector('.ve-seo-jsonld').value = templates[tpl] || '';
      });
    });

    // Apply
    ov.querySelector('.ve-seo-apply').addEventListener('click', () => {
      seoState.title = titleInput.value;
      seoState.metaDescription = descInput.value;
      seoState.canonicalUrl = ov.querySelector('.ve-seo-canonical').value;
      seoState.robots.index = ov.querySelector('.ve-seo-index').checked;
      seoState.robots.follow = ov.querySelector('.ve-seo-follow').checked;
      seoState.og.title = ogTitle.value;
      seoState.og.description = ogDesc.value;
      seoState.og.image = ogImg.value;
      seoState.og.type = ov.querySelector('.ve-seo-og-type').value;
      seoState.twitter.card = ov.querySelector('.ve-seo-tw-card').value;
      seoState.twitter.title = ov.querySelector('.ve-seo-tw-title').value;
      seoState.twitter.description = ov.querySelector('.ve-seo-tw-desc').value;
      seoState.twitter.image = ov.querySelector('.ve-seo-tw-img').value;
      seoState.structuredData = ov.querySelector('.ve-seo-jsonld').value;
      // Mark as changed
      pendingChanges['__seo__'] = { el: null, original: '', current: 'seo-changed' };
      updateToolbar();
      document.title = seoState.title;
      showToast('SEO settings updated');
      ov.remove();
    });

    ov.querySelector('.ve-seo-close').addEventListener('click', () => ov.remove());
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }

  function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION TEMPLATES
  // ═══════════════════════════════════════════════════════════════════
  const TEMPLATES = {
    hero: { icon: '🏠', name: 'Hero', html: () => `<section style="padding:80px 20px;text-align:center;background:#111;"><h1 style="font-size:3rem;color:#fff;margin-bottom:16px;">Your Heading Here</h1><p style="font-size:1.2rem;color:rgba(255,255,255,0.6);max-width:600px;margin:0 auto 24px;">Add your subheading text here to describe this section.</p><a href="#" style="display:inline-block;padding:14px 32px;background:${GOLD};color:#111;text-decoration:none;border-radius:8px;font-weight:600;">Call to Action</a></section>` },
    about: { icon: '📖', name: 'About', html: () => `<section style="padding:60px 20px;max-width:900px;margin:auto;display:flex;gap:40px;align-items:center;flex-wrap:wrap;"><div style="flex:1;min-width:280px;"><h2 style="font-size:2rem;color:#fff;margin-bottom:16px;">About Us</h2><p style="color:rgba(255,255,255,0.6);line-height:1.7;">Tell your story here. Share what makes your business unique and why customers should choose you.</p></div><div style="flex:1;min-width:280px;"><img src="https://placehold.co/500x350/1a1a1a/c6a355?text=Image" alt="About" style="width:100%;border-radius:12px;"></div></section>` },
    features: { icon: '⭐', name: 'Features', html: () => `<section style="padding:60px 20px;"><h2 style="text-align:center;font-size:2rem;color:#fff;margin-bottom:40px;">Our Features</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:24px;max-width:1000px;margin:auto;">${[1,2,3].map(i => `<div style="background:#1a1a1a;padding:32px;border-radius:12px;text-align:center;border:1px solid rgba(255,255,255,0.05);"><div style="font-size:2rem;margin-bottom:12px;">✦</div><h3 style="color:#fff;margin-bottom:8px;">Feature ${i}</h3><p style="color:rgba(255,255,255,0.5);font-size:0.9rem;">Describe this feature and its benefits to your customers.</p></div>`).join('')}</div></section>` },
    gallery: { icon: '🖼️', name: 'Gallery', html: () => `<section style="padding:60px 20px;"><h2 style="text-align:center;font-size:2rem;color:#fff;margin-bottom:32px;">Gallery</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;max-width:1000px;margin:auto;">${[1,2,3,4,5,6].map(i => `<img src="https://placehold.co/400x300/1a1a1a/c6a355?text=Photo+${i}" alt="Gallery ${i}" style="width:100%;border-radius:8px;">`).join('')}</div></section>` },
    testimonials: { icon: '💬', name: 'Testimonials', html: () => `<section style="padding:60px 20px;background:#0a0a0a;"><h2 style="text-align:center;font-size:2rem;color:#fff;margin-bottom:32px;">What People Say</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;max-width:900px;margin:auto;">${['Great experience!','Highly recommended.','Outstanding service.'].map((q,i) => `<div style="background:#1a1a1a;padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);"><p style="color:rgba(255,255,255,0.7);font-style:italic;margin-bottom:12px;">"${q}"</p><p style="color:${GOLD};font-size:0.85rem;font-weight:600;">— Customer ${i+1}</p></div>`).join('')}</div></section>` },
    cta: { icon: '📢', name: 'CTA Banner', html: () => `<section style="padding:60px 20px;text-align:center;background:linear-gradient(135deg,#1a1a1a,#111);border:1px solid rgba(198,163,85,0.1);"><h2 style="font-size:2rem;color:#fff;margin-bottom:12px;">Ready to Get Started?</h2><p style="color:rgba(255,255,255,0.5);margin-bottom:24px;">Take the next step today.</p><a href="#" style="display:inline-block;padding:14px 40px;background:${GOLD};color:#111;text-decoration:none;border-radius:8px;font-weight:600;font-size:1rem;">Get Started</a></section>` },
    faq: { icon: '❓', name: 'FAQ', html: () => `<section style="padding:60px 20px;max-width:700px;margin:auto;"><h2 style="text-align:center;font-size:2rem;color:#fff;margin-bottom:32px;">FAQ</h2>${['What are your opening hours?','Do you accept reservations?','Where are you located?'].map(q => `<details style="margin-bottom:12px;background:#1a1a1a;border-radius:8px;border:1px solid rgba(255,255,255,0.05);"><summary style="padding:16px;color:#fff;cursor:pointer;font-size:0.95rem;">${q}</summary><div style="padding:0 16px 16px;color:rgba(255,255,255,0.5);font-size:0.9rem;">Add your answer here.</div></details>`).join('')}</section>` },
    footer: { icon: '📋', name: 'Footer', html: () => `<footer style="padding:40px 20px;background:#0a0a0a;border-top:1px solid rgba(255,255,255,0.05);"><div style="max-width:1000px;margin:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;"><div><h4 style="color:#fff;margin-bottom:12px;">Company</h4><p style="color:rgba(255,255,255,0.4);font-size:0.85rem;line-height:1.6;">Your company description here.</p></div><div><h4 style="color:#fff;margin-bottom:12px;">Links</h4><p style="color:rgba(255,255,255,0.4);font-size:0.85rem;line-height:2;">Home<br>About<br>Contact</p></div><div><h4 style="color:#fff;margin-bottom:12px;">Contact</h4><p style="color:rgba(255,255,255,0.4);font-size:0.85rem;line-height:1.6;">info@example.com<br>+31 6 1234 5678</p></div></div></footer>` },
  };

  function showTemplateChooser() {
    const ov = document.createElement('div');
    ov.className = 've-tpl-overlay';
    ov.innerHTML = `<div class="ve-tpl-panel"><h3>Add Section</h3><div class="ve-tpl-grid">
      ${Object.entries(TEMPLATES).map(([key, t]) => `<div class="ve-tpl-card" data-tpl="${key}"><div class="ve-tpl-icon">${t.icon}</div><div class="ve-tpl-name">${t.name}</div></div>`).join('')}
    </div></div>`;
    editorRoot.appendChild(ov);

    ov.querySelectorAll('.ve-tpl-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.tpl;
        const html = TEMPLATES[key].html();
        pushHistory();
        const frag = document.createRange().createContextualFragment(html);
        const newEl = frag.firstElementChild;
        // Insert before footer or at end of body
        const footer = document.querySelector('footer');
        if (footer) footer.before(newEl);
        else document.body.appendChild(newEl);
        // Re-detect
        detectSections();
        renderSectionTree();
        const detected = detectElements(newEl);
        setupTextEls(detected.textEls);
        setupImgEls(detected.imgEls);
        pendingChanges['__section_add__'] = { el: null, original: '', current: 'added-' + key };
        updateToolbar();
        showToast('Section added');
        ov.remove();
      });
    });

    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }

  // ═══════════════════════════════════════════════════════════════════
  // GLOBAL STYLES
  // ═══════════════════════════════════════════════════════════════════
  let globalStyles = { primary: GOLD, secondary: '#111', accent: '#d4b56a', background: '#030303', text: '#ede9e0', headingFont: '', bodyFont: '' };

  function readGlobalStyles() {
    const root = getComputedStyle(document.documentElement);
    globalStyles.primary = root.getPropertyValue('--gold')?.trim() || GOLD;
    globalStyles.secondary = root.getPropertyValue('--bg')?.trim() || '#111';
    globalStyles.text = root.getPropertyValue('--white')?.trim() || '#ede9e0';
  }

  function showGlobalStyles() {
    const ov = document.createElement('div');
    ov.className = 've-gs-overlay';
    const g = globalStyles;
    ov.innerHTML = `<div class="ve-gs-panel"><h3>Global Styles</h3>
      <h4>Color Palette</h4>
      ${['primary','secondary','accent','background','text'].map(k => `
        <div class="ve-gs-color-row">
          <label>${k.charAt(0).toUpperCase() + k.slice(1)}</label>
          <input type="color" data-gs="${k}" value="${g[k] || '#000000'}">
          <input type="text" data-gs="${k}" value="${g[k] || ''}">
        </div>`).join('')}
      <h4>Fonts</h4>
      <div class="ve-gs-color-row"><label>Heading</label>
        <select data-gs="headingFont" style="flex:1;padding:4px 8px;background:${BG2};border:1px solid ${BORDER};border-radius:4px;color:${WHITE};font-size:0.75rem;outline:none;">
          <option value="">Default</option><option value="'Playfair Display', serif">Playfair Display</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option><option value="Arial, sans-serif">Arial</option>
        </select></div>
      <div class="ve-gs-color-row"><label>Body</label>
        <select data-gs="bodyFont" style="flex:1;padding:4px 8px;background:${BG2};border:1px solid ${BORDER};border-radius:4px;color:${WHITE};font-size:0.75rem;outline:none;">
          <option value="">Default</option><option value="Inter, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Verdana, sans-serif">Verdana</option><option value="Georgia, serif">Georgia</option>
        </select></div>
      <div class="ve-gs-actions"><button class="ve-seo-close">Cancel</button><button class="ve-seo-apply">Apply</button></div>
    </div>`;
    editorRoot.appendChild(ov);

    // Sync color inputs
    ov.querySelectorAll('.ve-gs-color-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs.length === 2) {
        inputs[0].addEventListener('input', () => { inputs[1].value = inputs[0].value; });
        inputs[1].addEventListener('input', () => { try { inputs[0].value = inputs[1].value; } catch(e) {} });
      }
    });

    ov.querySelector('.ve-seo-apply').addEventListener('click', () => {
      pushHistory();
      ov.querySelectorAll('[data-gs]').forEach(inp => {
        const key = inp.dataset.gs;
        const val = inp.value;
        if (inp.type === 'color' || inp.tagName === 'SELECT') return; // skip duplicate
        globalStyles[key] = val;
      });
      // Also read selects
      ov.querySelectorAll('select[data-gs]').forEach(sel => { globalStyles[sel.dataset.gs] = sel.value; });
      // Read color pickers (they fire first)
      ov.querySelectorAll('input[type="color"][data-gs]').forEach(inp => {
        const textInp = inp.parentElement.querySelector('input[type="text"]');
        if (textInp) globalStyles[inp.dataset.gs] = textInp.value;
      });

      // Apply to :root
      const r = document.documentElement.style;
      if (globalStyles.primary) r.setProperty('--gold', globalStyles.primary);
      if (globalStyles.secondary) r.setProperty('--bg', globalStyles.secondary);
      if (globalStyles.text) r.setProperty('--white', globalStyles.text);
      if (globalStyles.accent) r.setProperty('--gold-bright', globalStyles.accent);
      if (globalStyles.headingFont) r.setProperty('--serif', globalStyles.headingFont);
      if (globalStyles.bodyFont) r.setProperty('--body', globalStyles.bodyFont);

      pendingChanges['__global_styles__'] = { el: null, original: '', current: 'styles-changed' };
      updateToolbar();
      showToast('Global styles applied');
      ov.remove();
    });

    ov.querySelector('.ve-seo-close').addEventListener('click', () => ov.remove());
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CLEAN HTML SERIALIZATION
  // ═══════════════════════════════════════════════════════════════════
  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);

    // Remove editor artifacts
    const veHost = clone.querySelector('#ve-host');
    if (veHost) veHost.remove();
    const veStyles = clone.querySelector('#ve-page-styles');
    if (veStyles) veStyles.remove();

    // Remove ve-active class from body
    const body = clone.querySelector('body');
    if (body) body.classList.remove('ve-active');

    // Clean editor attributes
    clone.querySelectorAll('[data-ve-id]').forEach(el => {
      el.removeAttribute('data-ve-id');
      el.removeAttribute('data-ve-original');
      el.removeAttribute('data-ve-orig-href');
      el.removeAttribute('data-ve-orig-target');
      el.removeAttribute('data-ve-orig-src');
      el.removeAttribute('data-ve-orig-alt');
      el.removeAttribute('contenteditable');
      el.classList.remove('ve-editable', 've-editable-img', 've-selected-outline', 've-section-hover');
      if (el.classList.length === 0) el.removeAttribute('class');
    });

    // Apply SEO state to <head>
    const head = clone.querySelector('head');
    if (head) {
      // Title
      let title = head.querySelector('title');
      if (!title) { title = document.createElement('title'); head.prepend(title); }
      title.textContent = seoState.title;

      // Helper to set/create meta
      function setMeta(attrName, attrVal, content) {
        let el = head.querySelector(`meta[${attrName}="${attrVal}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attrName, attrVal); head.appendChild(el); }
        el.setAttribute('content', content);
      }
      setMeta('name', 'description', seoState.metaDescription);
      setMeta('property', 'og:title', seoState.og.title || seoState.title);
      setMeta('property', 'og:description', seoState.og.description || seoState.metaDescription);
      setMeta('property', 'og:image', seoState.og.image);
      setMeta('property', 'og:type', seoState.og.type);
      setMeta('name', 'twitter:card', seoState.twitter.card);
      setMeta('name', 'twitter:title', seoState.twitter.title || seoState.og.title || seoState.title);
      setMeta('name', 'twitter:description', seoState.twitter.description || seoState.og.description || seoState.metaDescription);
      setMeta('name', 'twitter:image', seoState.twitter.image || seoState.og.image);

      // Robots
      const robotsVal = (seoState.robots.index ? 'index' : 'noindex') + ', ' + (seoState.robots.follow ? 'follow' : 'nofollow');
      setMeta('name', 'robots', robotsVal);

      // Canonical
      let canonical = head.querySelector('link[rel="canonical"]');
      if (seoState.canonicalUrl) {
        if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; head.appendChild(canonical); }
        canonical.href = seoState.canonicalUrl;
      }

      // Structured data
      let jsonLd = head.querySelector('script[type="application/ld+json"]');
      if (seoState.structuredData.trim()) {
        if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.type = 'application/ld+json'; head.appendChild(jsonLd); }
        jsonLd.textContent = seoState.structuredData;
      } else if (jsonLd) {
        jsonLd.remove();
      }
    }

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════
  async function saveChanges() {
    if (totalChanges() === 0) return;
    const saveBtn = $('.ve-tb-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
      const html = getCleanHTML();
      if (CONFIG.onSave) {
        const result = await CONFIG.onSave({ html, changes: pendingChanges, linkChanges, imageChanges });
        if (result && result.error) throw new Error(result.error);
      } else {
        const res = await fetch(CONFIG.saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session, file: CONFIG.saveFile, content: html, message: 'Visual edit: ' + totalChanges() + ' changes' })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Save failed');
      }
      showToast('Published! Changes are live in ~30 seconds.');
      document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
        el.dataset.veOriginal = el.innerHTML;
        if (el.tagName === 'A') { el.dataset.veOrigHref = el.href; el.dataset.veOrigTarget = el.target; }
      });
      document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => { el.dataset.veOrigSrc = el.src; el.dataset.veOrigAlt = el.alt; });
      pendingChanges = {}; linkChanges = {}; imageChanges = {};
    } catch (e) {
      showToast('Error: ' + e.message);
    }
    if (saveBtn) { saveBtn.textContent = 'Save & Publish'; saveBtn.disabled = totalChanges() === 0; }
  }

  // ═══════════════════════════════════════════════════════════════════
  // RESET
  // ═══════════════════════════════════════════════════════════════════
  function resetChanges() {
    document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
      el.innerHTML = el.dataset.veOriginal || '';
      if (el.tagName === 'A') { el.href = el.dataset.veOrigHref || ''; el.target = el.dataset.veOrigTarget || ''; }
    });
    document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => { el.src = el.dataset.veOrigSrc || ''; el.alt = el.dataset.veOrigAlt || ''; });
    pendingChanges = {}; linkChanges = {}; imageChanges = {};
    updateToolbar();
  }

  // ═══════════════════════════════════════════════════════════════════
  // SETUP TEXT & IMAGE ELEMENTS
  // ═══════════════════════════════════════════════════════════════════
  function setupTextEls(textEls) {
    textEls.forEach(el => {
      if (el.classList.contains('ve-editable')) return; // already set up
      el.classList.add('ve-editable');
      if (el.tagName !== 'A') el.setAttribute('contenteditable', 'true');
      el.dataset.veOriginal = el.innerHTML;
      if (el.tagName === 'A') { el.dataset.veOrigHref = el.href; el.dataset.veOrigTarget = el.target; }
      el.addEventListener('input', () => recalcChanges());
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
      el.addEventListener('focus', () => { if (historyStack.length === 0 || collectState() !== historyStack[historyIndex]) pushHistory(); });
      el.addEventListener('blur', () => { const c = collectState(); if (historyStack.length === 0 || c !== historyStack[historyIndex]) pushHistory(); });
    });
  }

  function setupImgEls(imgEls) {
    imgEls.forEach(el => {
      if (el.classList.contains('ve-editable-img')) return;
      el.classList.add('ve-editable-img');
      el.dataset.veOrigSrc = el.src;
      el.dataset.veOrigAlt = el.alt;
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION TREE (Left Sidebar)
  // ═══════════════════════════════════════════════════════════════════
  function renderSectionTree() {
    const list = $('.ve-section-list');
    if (!list) return;
    list.innerHTML = '';
    sectionRegistry.forEach((sec, idx) => {
      const item = document.createElement('div');
      item.className = 've-section-item' + (sec.visible ? '' : ' hidden-section');
      item.draggable = true;
      item.dataset.idx = idx;
      item.innerHTML = `
        <span class="ve-section-grip">⋮⋮</span>
        <span class="ve-section-label">${esc(sec.label)}</span>
        <button class="ve-section-btn" data-action="toggle" title="${sec.visible ? 'Hide' : 'Show'}">${sec.visible ? '👁' : '🚫'}</button>
        <button class="ve-section-btn" data-action="dup" title="Duplicate">⧉</button>
        <button class="ve-section-btn danger" data-action="del" title="Delete">✕</button>`;
      list.appendChild(item);

      // Click to scroll
      item.querySelector('.ve-section-label').addEventListener('click', () => {
        sec.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        highlightSection(sec.id);
      });

      // Toggle visibility
      item.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        pushHistory();
        sec.visible = !sec.visible;
        sec.el.style.display = sec.visible ? '' : 'none';
        pendingChanges['__section_vis__'] = { el: null, original: '', current: 'toggled' };
        updateToolbar();
        renderSectionTree();
      });

      // Duplicate
      item.querySelector('[data-action="dup"]').addEventListener('click', () => {
        pushHistory();
        const clone = sec.el.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('data-ve-id');
        clone.querySelectorAll('[data-ve-id]').forEach(c => { c.removeAttribute('data-ve-id'); c.removeAttribute('contenteditable'); c.classList.remove('ve-editable', 've-editable-img', 've-selected-outline'); });
        sec.el.after(clone);
        detectSections();
        renderSectionTree();
        const detected = detectElements(clone);
        setupTextEls(detected.textEls);
        setupImgEls(detected.imgEls);
        pendingChanges['__section_dup__'] = { el: null, original: '', current: 'duplicated' };
        updateToolbar();
        showToast('Section duplicated');
      });

      // Delete
      item.querySelector('[data-action="del"]').addEventListener('click', async () => {
        const ok = await confirm('Delete this section?');
        if (!ok) return;
        pushHistory();
        sec.el.remove();
        detectSections();
        renderSectionTree();
        pendingChanges['__section_del__'] = { el: null, original: '', current: 'deleted' };
        updateToolbar();
        showToast('Section deleted');
      });

      // Drag & drop
      item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', idx); item.style.opacity = '0.5'; });
      item.addEventListener('dragend', () => { item.style.opacity = '1'; list.querySelectorAll('.ve-section-item').forEach(i => i.classList.remove('drag-over')); });
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('drag-over'); });
      item.addEventListener('dragleave', () => { item.classList.remove('drag-over'); });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = idx;
        if (fromIdx === toIdx) return;
        pushHistory();
        const fromSec = sectionRegistry[fromIdx];
        const toSec = sectionRegistry[toIdx];
        if (fromIdx < toIdx) toSec.el.after(fromSec.el);
        else toSec.el.before(fromSec.el);
        detectSections();
        renderSectionTree();
        pendingChanges['__section_reorder__'] = { el: null, original: '', current: 'reordered' };
        updateToolbar();
      });
    });
  }

  function highlightSection(veId) {
    const items = $$('.ve-section-item');
    items.forEach(i => i.classList.remove('active'));
    const idx = sectionRegistry.findIndex(s => s.id === veId);
    if (idx >= 0 && items[idx]) items[idx].classList.add('active');
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVATE EDITOR
  // ═══════════════════════════════════════════════════════════════════
  function activateEditor() {
    editorActive = true;
    document.body.appendChild(host);
    document.head.appendChild(pageStyle);
    document.body.classList.add('ve-active');
    updatePageStyles();

    // Parse SEO & global styles
    parseSEO();
    readGlobalStyles();

    // Toast
    const toast = document.createElement('div');
    toast.className = 've-toast';
    editorRoot.appendChild(toast);

    // ── Top Bar ──
    const topbar = document.createElement('div');
    topbar.className = 've-topbar';
    topbar.innerHTML = `
      <button class="ve-tb-toggle-left" title="Toggle sections">☰</button>
      <span class="ve-topbar-title">${document.title || 'Page Editor'}</span>
      <span class="ve-tb-changes"></span>
      <div class="ve-topbar-sep"></div>
      <button class="ve-undo-btn" disabled title="Undo (Ctrl+Z)">↩</button>
      <button class="ve-redo-btn" disabled title="Redo (Ctrl+Shift+Z)">↪</button>
      <div class="ve-topbar-sep"></div>
      <button class="ve-device-btn active" data-device="desktop" title="Desktop">🖥</button>
      <button class="ve-device-btn" data-device="tablet" title="Tablet">📱</button>
      <button class="ve-device-btn" data-device="mobile" title="Mobile">📲</button>
      <div class="ve-topbar-sep"></div>
      <button class="ve-tb-styles" title="Global Styles">🎨</button>
      <button class="ve-tb-seo" title="SEO Settings">SEO</button>
      <div class="ve-topbar-sep"></div>
      <button class="ve-tb-save" disabled>Save & Publish</button>
      <button class="ve-tb-toggle-right" title="Toggle properties">⚙</button>
      <button class="ve-tb-logout" title="Logout">↗</button>
    `;
    editorRoot.appendChild(topbar);

    // Top bar events
    topbar.querySelector('.ve-tb-toggle-left').addEventListener('click', () => {
      leftSidebarOpen = !leftSidebarOpen;
      $('.ve-left').classList.toggle('collapsed', !leftSidebarOpen);
      updatePageStyles();
    });
    topbar.querySelector('.ve-tb-toggle-right').addEventListener('click', () => {
      rightSidebarOpen = !rightSidebarOpen;
      $('.ve-right').classList.toggle('collapsed', !rightSidebarOpen);
      updatePageStyles();
    });
    topbar.querySelector('.ve-undo-btn').addEventListener('click', undo);
    topbar.querySelector('.ve-redo-btn').addEventListener('click', redo);
    topbar.querySelector('.ve-tb-save').addEventListener('click', saveChanges);
    topbar.querySelector('.ve-tb-seo').addEventListener('click', showSEOPanel);
    topbar.querySelector('.ve-tb-styles').addEventListener('click', showGlobalStyles);
    topbar.querySelector('.ve-tb-logout').addEventListener('click', () => {
      sessionStorage.removeItem(CONFIG.sessionKey);
      window.location.href = window.location.pathname;
    });

    // Device toggle
    topbar.querySelectorAll('.ve-device-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentDevice = btn.dataset.device;
        topbar.querySelectorAll('.ve-device-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePageStyles();
      });
    });

    // ── Left Sidebar ──
    const left = document.createElement('div');
    left.className = 've-left';
    left.innerHTML = `
      <div class="ve-left-header"><span>Sections</span></div>
      <div class="ve-section-list"></div>
      <button class="ve-add-section-btn">+ Add Section</button>`;
    editorRoot.appendChild(left);
    left.querySelector('.ve-add-section-btn').addEventListener('click', showTemplateChooser);

    // ── Right Sidebar ──
    const right = document.createElement('div');
    right.className = 've-right';
    right.innerHTML = `
      <div class="ve-right-header"><span>Properties</span></div>
      <div class="ve-right-body"><div class="ve-right-empty">Click any element to edit its properties</div></div>`;
    editorRoot.appendChild(right);

    // ── Detect sections & elements ──
    detectSections();
    renderSectionTree();
    const { textEls, imgEls } = detectElements();
    setupTextEls(textEls);
    setupImgEls(imgEls);

    // ── Event listeners ──
    document.addEventListener('click', clickInterceptor, true);
    createRTBar();
    document.addEventListener('selectionchange', positionRTBar);

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (!editorActive) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveChanges(); }
      if (e.key === 'Escape') closePopover();
    }, true);

    // Initial history
    pushHistory();
    showToast('Editor ready — click any element to edit');
  }

  // ═══════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════
  function showLogin() {
    document.body.appendChild(host);
    const overlay = document.createElement('div');
    overlay.className = 've-overlay';
    overlay.innerHTML = `<div class="ve-login"><h2>Visual Editor</h2><p>Log in to edit this site</p>
      <input type="email" class="ve-email" placeholder="Email" autocomplete="email">
      <input type="password" class="ve-pass" placeholder="Password" autocomplete="current-password">
      <button class="ve-login-btn">Log In</button><div class="ve-login-error"></div></div>`;
    editorRoot.appendChild(overlay);

    const emailInput = overlay.querySelector('.ve-email');
    const passInput = overlay.querySelector('.ve-pass');
    const btn = overlay.querySelector('.ve-login-btn');
    const errEl = overlay.querySelector('.ve-login-error');

    async function doLogin() {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      if (!email || !pass) { errEl.textContent = 'Enter email and password'; return; }
      btn.disabled = true; btn.textContent = 'Logging in...'; errEl.textContent = '';
      try {
        const res = await fetch(CONFIG.loginUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
        const data = await res.json();
        if (data.success && data.session) {
          session = data.session;
          sessionStorage.setItem(CONFIG.sessionKey, session);
          overlay.remove();
          activateEditor();
        } else {
          errEl.textContent = data.error || 'Login failed';
        }
      } catch (e) { errEl.textContent = 'Connection error. Try again.'; }
      btn.disabled = false; btn.textContent = 'Log In';
    }
    btn.addEventListener('click', doLogin);
    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passInput.focus(); });
    setTimeout(() => emailInput.focus(), 100);
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  function init() {
    if (session) activateEditor();
    else showLogin();
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 200);

  // ═══════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════
  window.VisualEditor = {
    activate: activateEditor,
    deactivate() {
      editorActive = false;
      document.removeEventListener('click', clickInterceptor, true);
      document.querySelectorAll('[data-ve-id]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('ve-editable', 've-editable-img', 've-selected-outline');
        el.removeAttribute('data-ve-id');
        el.removeAttribute('data-ve-original');
      });
      document.body.classList.remove('ve-active');
      host.remove();
      pageStyle.remove();
    },
    save: saveChanges,
    getCleanHTML,
    showSEO: showSEOPanel,
  };

})();
