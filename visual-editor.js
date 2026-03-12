/**
 * Visual Editor v1.0
 * Standalone inline editor for any static HTML site.
 * Drop in with a single <script> tag — no dependencies, no build step.
 *
 * Usage:
 *   <script src="visual-editor.js"
 *     data-ve-password="yourpassword"
 *     data-ve-save-url="/api/save"
 *     data-ve-session-key="bhg-session-2026-x9k4m"
 *   ></script>
 *
 * Or configure via JS before load:
 *   window.VisualEditorConfig = { password: '...', saveUrl: '/api/save', ... };
 */
(function () {
  'use strict';

  // ─── Config ──────────────────────────────────────────────────────
  const scriptTag = document.currentScript;
  const userCfg = window.VisualEditorConfig || {};

  function attr(name) { return scriptTag ? scriptTag.getAttribute('data-ve-' + name) : null; }

  const CONFIG = {
    password:       userCfg.password       || attr('password')       || '',
    saveUrl:        userCfg.saveUrl        || attr('save-url')       || '/api/save',
    saveFile:       userCfg.saveFile       || attr('save-file')      || 'index.html',
    sessionKey:     userCfg.sessionKey     || attr('session-key')    || 've-session',
    sessionSecret:  userCfg.sessionSecret  || attr('session-secret') || 've-auth-ok',
    activate:       userCfg.activate       || attr('activate')       || '?edit',
    onSave:         userCfg.onSave         || null,
    excludeSelectors: userCfg.excludeSelectors || [],
    includeSelectors: userCfg.includeSelectors || [],
  };

  // ─── Activation check ────────────────────────────────────────────
  function shouldActivate() {
    const a = CONFIG.activate;
    if (a === '?edit') return new URLSearchParams(window.location.search).has('edit');
    if (a.startsWith('/')) return window.location.pathname === a || window.location.pathname === a + '/';
    if (a === 'manual') return false;
    return new URLSearchParams(window.location.search).has(a.replace('?', ''));
  }

  if (!shouldActivate()) return;

  // ─── State ────────────────────────────────────────────────────────
  let session = sessionStorage.getItem(CONFIG.sessionKey);
  let editorActive = false;
  let pendingChanges = {};       // veId -> { el, original, current }
  let linkChanges = {};          // veId -> { href, target }
  let imageChanges = {};         // veId -> { src, alt }
  let veIdCounter = 0;
  let historyStack = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  // ─── Shadow DOM Host ──────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 've-host';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:999999;pointer-events:none;';

  const shadow = host.attachShadow({ mode: 'open' });
  const editorRoot = document.createElement('div');
  editorRoot.id = 've-root';
  shadow.appendChild(editorRoot);

  // ─── Editor Styles (inside shadow DOM) ────────────────────────────
  const styles = document.createElement('style');
  styles.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Login overlay */
    .ve-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ve-login { background: #1a1a1a; border: 1px solid rgba(198,163,85,0.3); border-radius: 16px; padding: 48px; text-align: center; max-width: 380px; width: 90%; }
    .ve-login h2 { color: #fff; font-size: 1.5rem; margin-bottom: 4px; font-family: Georgia, serif; }
    .ve-login p { color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-bottom: 24px; }
    .ve-login input { display: block; width: 100%; padding: 12px 16px; margin-bottom: 12px; background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 0.85rem; outline: none; transition: border 0.3s; }
    .ve-login input:focus { border-color: rgba(198,163,85,0.5); }
    .ve-login input::placeholder { color: rgba(255,255,255,0.3); }
    .ve-login-btn { display: block; width: 100%; padding: 12px; background: #c6a355; color: #111; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.3s; }
    .ve-login-btn:hover { background: #d4b56a; }
    .ve-login-error { color: #e74c3c; font-size: 0.75rem; margin-top: 8px; min-height: 1.2em; }

    /* Badge */
    .ve-badge { position: fixed; top: 12px; right: 12px; background: #c6a355; color: #111; padding: 4px 12px; border-radius: 20px; font-size: 0.65rem; font-weight: 600; z-index: 10; letter-spacing: 1px; text-transform: uppercase; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* Toolbar */
    .ve-toolbar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a1a; border: 1px solid rgba(198,163,85,0.3); border-radius: 12px; padding: 12px 20px; display: flex; gap: 12px; align-items: center; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    .ve-toolbar span { color: rgba(255,255,255,0.5); font-size: 0.75rem; letter-spacing: 0.5px; }
    .ve-toolbar .ve-count { color: #c6a355; font-weight: 600; }
    .ve-toolbar button { border: none; padding: 8px 18px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.3s; font-family: inherit; }
    .ve-btn-save { background: #c6a355; color: #111; }
    .ve-btn-save:hover { background: #d4b56a; }
    .ve-btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
    .ve-btn-undo { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1) !important; font-size: 0.75rem; }
    .ve-btn-undo:hover { color: #fff; }
    .ve-btn-undo:disabled { opacity: 0.3; cursor: not-allowed; }
    .ve-btn-cancel { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1) !important; }
    .ve-btn-cancel:hover { color: #fff; border-color: rgba(255,255,255,0.3) !important; }
    .ve-btn-logout { background: transparent; color: rgba(255,255,255,0.4); font-size: 0.7rem; }
    .ve-saving { pointer-events: none; opacity: 0.6; }

    /* Toast */
    .ve-toast { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); background: #c6a355; color: #111; padding: 10px 24px; border-radius: 8px; font-size: 0.8rem; font-weight: 500; z-index: 20; opacity: 0; transition: opacity 0.4s; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ve-toast.show { opacity: 1; }

    /* Link popover */
    .ve-popover { position: fixed; background: #1a1a1a; border: 1px solid rgba(198,163,85,0.3); border-radius: 12px; padding: 16px; min-width: 300px; pointer-events: auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 15; }
    .ve-popover label { display: block; color: rgba(255,255,255,0.5); font-size: 0.7rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .ve-popover input[type="text"], .ve-popover input[type="url"] { display: block; width: 100%; padding: 8px 12px; margin-bottom: 10px; background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; font-size: 0.8rem; outline: none; }
    .ve-popover input:focus { border-color: rgba(198,163,85,0.5); }
    .ve-popover-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
    .ve-popover-row input[type="checkbox"] { accent-color: #c6a355; }
    .ve-popover-row span { color: rgba(255,255,255,0.6); font-size: 0.75rem; }
    .ve-popover-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .ve-popover-actions button { border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-family: inherit; }
    .ve-pop-apply { background: #c6a355; color: #111; font-weight: 600; }
    .ve-pop-apply:hover { background: #d4b56a; }
    .ve-pop-remove { background: transparent; color: #e74c3c; border: 1px solid rgba(231,76,60,0.3) !important; }
    .ve-pop-cancel { background: transparent; color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1) !important; }

    /* Image popover extras */
    .ve-img-preview { max-width: 100%; max-height: 120px; border-radius: 6px; margin-bottom: 10px; object-fit: cover; }
    .ve-file-btn { display: inline-block; padding: 6px 14px; background: #222; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-bottom: 10px; }
    .ve-file-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }

    /* Rich text toolbar */
    .ve-rtbar { position: fixed; background: #1a1a1a; border: 1px solid rgba(198,163,85,0.3); border-radius: 8px; padding: 4px; display: flex; gap: 2px; pointer-events: auto; box-shadow: 0 4px 16px rgba(0,0,0,0.5); z-index: 16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ve-rtbar button { border: none; background: transparent; color: rgba(255,255,255,0.7); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .ve-rtbar button:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .ve-rtbar button.active { background: rgba(198,163,85,0.2); color: #c6a355; }
    .ve-rtbar .ve-rt-sep { width: 1px; background: rgba(255,255,255,0.1); margin: 4px 2px; }
  `;
  shadow.appendChild(styles);

  // ─── Page-level styles (for editable highlights) ──────────────────
  const pageStyle = document.createElement('style');
  pageStyle.id = 've-page-styles';
  pageStyle.textContent = `
    [data-ve-id].ve-editable { outline: 2px dashed transparent; cursor: text; transition: outline 0.3s, background 0.3s; border-radius: 3px; }
    [data-ve-id].ve-editable:hover { outline: 2px dashed rgba(198,163,85,0.5); background: rgba(198,163,85,0.06); }
    [data-ve-id].ve-editable:focus { outline: 2px solid #c6a355; background: rgba(198,163,85,0.1); }
    [data-ve-id].ve-editable-img { cursor: pointer; position: relative; }
    [data-ve-id].ve-editable-img:hover { outline: 2px dashed rgba(198,163,85,0.5); outline-offset: 2px; }
  `;

  // ─── Helpers ──────────────────────────────────────────────────────
  function $(sel, root) { return (root || editorRoot).querySelector(sel); }
  function showToast(msg) {
    const t = $('.ve-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
  function stampId(el) {
    if (!el.dataset.veId) {
      el.dataset.veId = 've-' + (++veIdCounter);
    }
    return el.dataset.veId;
  }

  // ─── History (Undo/Redo) ──────────────────────────────────────────
  function pushHistory() {
    const snap = collectState();
    // Trim future if we undid something
    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
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
      const id = el.dataset.veId;
      if (el.tagName === 'IMG') {
        state[id] = { src: el.src, alt: el.alt };
      }
    });
    // Link hrefs
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
      if (typeof val === 'object' && val.src !== undefined) {
        el.src = val.src;
        el.alt = val.alt || '';
      } else {
        el.innerHTML = val;
      }
    }
    // Restore link attrs
    for (const [key, val] of Object.entries(state)) {
      if (key.endsWith('__href')) {
        const id = key.replace('__href', '');
        const el = document.querySelector('[data-ve-id="' + id + '"]');
        if (el && el.tagName === 'A') el.href = val;
      }
      if (key.endsWith('__target')) {
        const id = key.replace('__target', '');
        const el = document.querySelector('[data-ve-id="' + id + '"]');
        if (el && el.tagName === 'A') el.target = val;
      }
    }
    recalcChanges();
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreState(historyStack[historyIndex]);
    updateUndoButtons();
  }

  function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    restoreState(historyStack[historyIndex]);
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const undoBtn = $('.ve-btn-undo-back');
    const redoBtn = $('.ve-btn-undo-fwd');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
  }

  // ─── Element Detection ────────────────────────────────────────────
  const TEXT_SELECTORS = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,label,blockquote,figcaption,caption,a,button,dt,dd';
  const IMG_SELECTORS = 'img';
  const SKIP_SELECTORS = 'script,style,noscript,svg,iframe,#ve-host,[data-ve-skip]';

  function isSkipped(el) {
    if (el.matches && el.matches(SKIP_SELECTORS)) return true;
    if (el.closest && el.closest(SKIP_SELECTORS)) return true;
    for (const sel of CONFIG.excludeSelectors) {
      if (el.matches && el.matches(sel)) return true;
    }
    return false;
  }

  function hasDirectText(el) {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim().length > 0) return true;
    }
    return false;
  }

  function detectElements() {
    const textEls = [];
    const imgEls = [];

    // Include forced elements
    for (const sel of CONFIG.includeSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        if (!isSkipped(el)) { stampId(el); textEls.push(el); }
      });
    }

    // Text elements
    const allText = document.querySelectorAll(TEXT_SELECTORS);
    allText.forEach(el => {
      if (isSkipped(el)) return;
      if (el.dataset.veId && textEls.includes(el)) return; // already included
      // Prefer leaf-most: skip if all text is inside child editables
      if (!hasDirectText(el) && el.querySelector(TEXT_SELECTORS)) return;
      // Skip empty
      if (!el.textContent.trim()) return;
      stampId(el);
      textEls.push(el);
    });

    // Elements with [data-editable]
    document.querySelectorAll('[data-editable]').forEach(el => {
      if (isSkipped(el)) return;
      if (!el.dataset.veId) { stampId(el); textEls.push(el); }
    });

    // Images
    document.querySelectorAll(IMG_SELECTORS).forEach(el => {
      if (isSkipped(el)) return;
      stampId(el);
      imgEls.push(el);
    });

    return { textEls, imgEls };
  }

  // ─── Track changes ────────────────────────────────────────────────
  function recalcChanges() {
    pendingChanges = {};
    linkChanges = {};
    imageChanges = {};

    document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
      const id = el.dataset.veId;
      const orig = el.dataset.veOriginal || '';
      if (el.innerHTML !== orig) {
        pendingChanges[id] = { el, original: orig, current: el.innerHTML };
      }
      // Link href/target changes
      if (el.tagName === 'A') {
        const origHref = el.dataset.veOrigHref || '';
        const origTarget = el.dataset.veOrigTarget || '';
        if (el.href !== origHref || el.target !== origTarget) {
          linkChanges[id] = { el, href: el.href, target: el.target };
        }
      }
    });

    document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => {
      const id = el.dataset.veId;
      const origSrc = el.dataset.veOrigSrc || '';
      const origAlt = el.dataset.veOrigAlt || '';
      if (el.src !== origSrc || el.alt !== origAlt) {
        imageChanges[id] = { el, src: el.src, alt: el.alt };
      }
    });

    updateToolbar();
  }

  function totalChanges() {
    return Object.keys(pendingChanges).length + Object.keys(linkChanges).length + Object.keys(imageChanges).length;
  }

  function updateToolbar() {
    const countEl = $('.ve-count');
    const saveBtn = $('.ve-btn-save');
    if (!countEl || !saveBtn) return;
    const c = totalChanges();
    countEl.textContent = c;
    saveBtn.disabled = c === 0;
  }

  // ─── Link Popover ─────────────────────────────────────────────────
  let activePopover = null;

  function closePopover() {
    if (activePopover) { activePopover.remove(); activePopover = null; }
  }

  function showLinkPopover(el) {
    closePopover();
    const rect = el.getBoundingClientRect();
    const isLink = el.tagName === 'A';

    const pop = document.createElement('div');
    pop.className = 've-popover';
    pop.innerHTML = `
      <label>Text</label>
      <input type="text" class="ve-pop-text" value="${el.textContent.replace(/"/g, '&quot;')}">
      ${isLink ? `
        <label>URL</label>
        <input type="url" class="ve-pop-url" value="${(el.href || '').replace(/"/g, '&quot;')}">
        <div class="ve-popover-row">
          <input type="checkbox" class="ve-pop-newtab" ${el.target === '_blank' ? 'checked' : ''}>
          <span>Open in new tab</span>
        </div>
      ` : ''}
      <div class="ve-popover-actions">
        ${isLink ? '<button class="ve-pop-remove">Remove Link</button>' : ''}
        <button class="ve-pop-cancel">Cancel</button>
        <button class="ve-pop-apply">Apply</button>
      </div>
    `;

    // Position
    const top = rect.bottom + 8;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 320));
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';

    editorRoot.appendChild(pop);
    activePopover = pop;

    // Events
    pop.querySelector('.ve-pop-apply').addEventListener('click', () => {
      pushHistory();
      el.textContent = pop.querySelector('.ve-pop-text').value;
      if (isLink) {
        el.href = pop.querySelector('.ve-pop-url').value;
        el.target = pop.querySelector('.ve-pop-newtab').checked ? '_blank' : '';
      }
      recalcChanges();
      closePopover();
    });

    pop.querySelector('.ve-pop-cancel').addEventListener('click', closePopover);

    const removeBtn = pop.querySelector('.ve-pop-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        pushHistory();
        // Replace <a> with its text content
        const span = document.createElement('span');
        span.textContent = el.textContent;
        span.dataset.veId = el.dataset.veId;
        span.dataset.veOriginal = el.dataset.veOriginal;
        span.classList.add('ve-editable');
        span.setAttribute('contenteditable', 'true');
        el.replaceWith(span);
        recalcChanges();
        closePopover();
      });
    }
  }

  // ─── Image Popover ────────────────────────────────────────────────
  function showImagePopover(el) {
    closePopover();
    const rect = el.getBoundingClientRect();

    const pop = document.createElement('div');
    pop.className = 've-popover';
    pop.innerHTML = `
      <img class="ve-img-preview" src="${el.src}">
      <label>Image URL</label>
      <input type="url" class="ve-pop-imgsrc" value="${(el.src || '').replace(/"/g, '&quot;')}">
      <label class="ve-file-btn">Upload Image
        <input type="file" accept="image/*" style="display:none" class="ve-pop-file">
      </label>
      <label>Alt Text</label>
      <input type="text" class="ve-pop-imgalt" value="${(el.alt || '').replace(/"/g, '&quot;')}">
      <div class="ve-popover-actions">
        <button class="ve-pop-cancel">Cancel</button>
        <button class="ve-pop-apply">Apply</button>
      </div>
    `;

    const top = rect.bottom + 8;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 320));
    pop.style.top = Math.min(top, window.innerHeight - 350) + 'px';
    pop.style.left = left + 'px';

    editorRoot.appendChild(pop);
    activePopover = pop;

    const preview = pop.querySelector('.ve-img-preview');
    const srcInput = pop.querySelector('.ve-pop-imgsrc');
    const fileInput = pop.querySelector('.ve-pop-file');

    srcInput.addEventListener('input', () => { preview.src = srcInput.value; });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        preview.src = url;
        srcInput.value = url;
        // Store file for later upload if needed
        srcInput.dataset.fileBlob = 'true';
      }
    });

    pop.querySelector('.ve-pop-apply').addEventListener('click', () => {
      pushHistory();
      el.src = srcInput.value;
      el.alt = pop.querySelector('.ve-pop-imgalt').value;
      recalcChanges();
      closePopover();
    });

    pop.querySelector('.ve-pop-cancel').addEventListener('click', closePopover);
  }

  // ─── Rich Text Toolbar ────────────────────────────────────────────
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
      <button data-cmd="removeFormat" title="Clear Formatting">&#10006;</button>
    `;
    editorRoot.appendChild(rtBar);

    rtBar.querySelectorAll('button[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep selection alive
        const cmd = btn.dataset.cmd;
        if (cmd === 'createLink') {
          const url = prompt('Enter URL:');
          if (url) document.execCommand('createLink', false, url);
        } else {
          document.execCommand(cmd, false, null);
        }
        pushHistory();
        recalcChanges();
      });
    });
  }

  function positionRTBar() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      if (rtBar) rtBar.style.display = 'none';
      return;
    }
    // Check if selection is inside an editable element
    const anchor = sel.anchorNode;
    const editable = anchor && (anchor.nodeType === 3 ? anchor.parentElement : anchor).closest && (anchor.nodeType === 3 ? anchor.parentElement : anchor).closest('[data-ve-id].ve-editable');
    if (!editable) {
      if (rtBar) rtBar.style.display = 'none';
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { rtBar.style.display = 'none'; return; }

    rtBar.style.display = 'flex';
    rtBar.style.top = (rect.top - 44) + 'px';
    rtBar.style.left = Math.max(8, rect.left + rect.width / 2 - 80) + 'px';
  }

  // ─── Click Interception (links & buttons) ─────────────────────────
  function clickInterceptor(e) {
    if (!editorActive) return;

    // Close popover on click outside
    if (activePopover && !activePopover.contains(e.target)) {
      closePopover();
    }

    const link = e.target.closest('a');
    const button = e.target.closest('button');
    const img = e.target.closest('img');

    // Image click
    if (img && img.dataset.veId && img.classList.contains('ve-editable-img')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showImagePopover(img);
      return;
    }

    // Link click — show popover instead of navigating
    if (link && link.dataset.veId) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showLinkPopover(link);
      return;
    }

    // Button click (non-link) — just let contenteditable handle it
    if (button && button.dataset.veId) {
      e.preventDefault();
      e.stopImmediatePropagation();
      button.focus();
      return;
    }
  }

  // ─── Clean HTML Serialization ─────────────────────────────────────
  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);

    // Remove editor host
    const veHost = clone.querySelector('#ve-host');
    if (veHost) veHost.remove();

    // Remove page styles
    const veStyles = clone.querySelector('#ve-page-styles');
    if (veStyles) veStyles.remove();

    // Clean up editor attributes from all elements
    clone.querySelectorAll('[data-ve-id]').forEach(el => {
      el.removeAttribute('data-ve-id');
      el.removeAttribute('data-ve-original');
      el.removeAttribute('data-ve-orig-href');
      el.removeAttribute('data-ve-orig-target');
      el.removeAttribute('data-ve-orig-src');
      el.removeAttribute('data-ve-orig-alt');
      el.removeAttribute('contenteditable');
      el.classList.remove('ve-editable', 've-editable-img');
      if (el.classList.length === 0) el.removeAttribute('class');
    });

    // Remove the visual-editor.js script tag itself (optional — keep it so editor still works)
    // const veScript = clone.querySelector('script[src*="visual-editor"]');
    // if (veScript) veScript.remove();

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  // ─── Save ─────────────────────────────────────────────────────────
  async function saveChanges() {
    if (totalChanges() === 0) return;

    const saveBtn = $('.ve-btn-save');
    const toolbar = $('.ve-toolbar');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    toolbar.classList.add('ve-saving');

    try {
      const html = getCleanHTML();

      if (CONFIG.onSave) {
        // Custom save handler
        const result = await CONFIG.onSave({ html, changes: pendingChanges, linkChanges, imageChanges });
        if (result && result.error) throw new Error(result.error);
      } else {
        // Default: POST to save endpoint
        const res = await fetch(CONFIG.saveUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session: session,
            file: CONFIG.saveFile,
            content: html,
            message: 'Visual edit: ' + totalChanges() + ' changes'
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Save failed');
      }

      showToast('Published! Changes are live in ~30 seconds.');

      // Update originals to current state
      document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
        el.dataset.veOriginal = el.innerHTML;
        if (el.tagName === 'A') {
          el.dataset.veOrigHref = el.href;
          el.dataset.veOrigTarget = el.target;
        }
      });
      document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => {
        el.dataset.veOrigSrc = el.src;
        el.dataset.veOrigAlt = el.alt;
      });

      pendingChanges = {};
      linkChanges = {};
      imageChanges = {};
    } catch (e) {
      showToast('Error: ' + e.message);
    }

    saveBtn.textContent = 'Save & Publish';
    saveBtn.disabled = totalChanges() === 0;
    toolbar.classList.remove('ve-saving');
  }

  // ─── Reset ────────────────────────────────────────────────────────
  function resetChanges() {
    document.querySelectorAll('[data-ve-id].ve-editable').forEach(el => {
      el.innerHTML = el.dataset.veOriginal || '';
      if (el.tagName === 'A') {
        el.href = el.dataset.veOrigHref || '';
        el.target = el.dataset.veOrigTarget || '';
      }
    });
    document.querySelectorAll('[data-ve-id].ve-editable-img').forEach(el => {
      el.src = el.dataset.veOrigSrc || '';
      el.alt = el.dataset.veOrigAlt || '';
    });
    pendingChanges = {};
    linkChanges = {};
    imageChanges = {};
    updateToolbar();
  }

  // ─── Activate Editor ──────────────────────────────────────────────
  function activateEditor() {
    editorActive = true;
    document.body.appendChild(host);
    document.head.appendChild(pageStyle);

    // Badge
    const badge = document.createElement('div');
    badge.className = 've-badge';
    badge.textContent = 'EDIT MODE';
    editorRoot.appendChild(badge);

    // Toast container
    const toast = document.createElement('div');
    toast.className = 've-toast';
    editorRoot.appendChild(toast);

    // Detect & setup elements
    const { textEls, imgEls } = detectElements();

    textEls.forEach(el => {
      el.classList.add('ve-editable');
      // Only make non-link text elements contenteditable (links use popover)
      if (el.tagName !== 'A') {
        el.setAttribute('contenteditable', 'true');
      }
      el.dataset.veOriginal = el.innerHTML;
      if (el.tagName === 'A') {
        el.dataset.veOrigHref = el.href;
        el.dataset.veOrigTarget = el.target;
      }

      el.addEventListener('input', () => {
        recalcChanges();
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      });

      el.addEventListener('focus', () => {
        // Snapshot before editing
        if (historyStack.length === 0 || collectState() !== historyStack[historyIndex]) {
          pushHistory();
        }
      });

      el.addEventListener('blur', () => {
        // Push state after edit
        const current = collectState();
        if (historyStack.length === 0 || current !== historyStack[historyIndex]) {
          pushHistory();
        }
      });
    });

    imgEls.forEach(el => {
      el.classList.add('ve-editable-img');
      el.dataset.veOrigSrc = el.src;
      el.dataset.veOrigAlt = el.alt;
    });

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 've-toolbar';
    toolbar.innerHTML = `
      <span><span class="ve-count">0</span> changes</span>
      <button class="ve-btn-undo ve-btn-undo-back" disabled title="Undo (Ctrl+Z)">&#8617;</button>
      <button class="ve-btn-undo ve-btn-undo-fwd" disabled title="Redo (Ctrl+Shift+Z)">&#8618;</button>
      <button class="ve-btn-save" disabled>Save & Publish</button>
      <button class="ve-btn-cancel">Reset</button>
      <button class="ve-btn-logout">Logout</button>
    `;
    editorRoot.appendChild(toolbar);

    toolbar.querySelector('.ve-btn-save').addEventListener('click', saveChanges);
    toolbar.querySelector('.ve-btn-cancel').addEventListener('click', resetChanges);
    toolbar.querySelector('.ve-btn-undo-back').addEventListener('click', undo);
    toolbar.querySelector('.ve-btn-undo-fwd').addEventListener('click', redo);
    toolbar.querySelector('.ve-btn-logout').addEventListener('click', () => {
      sessionStorage.removeItem(CONFIG.sessionKey);
      window.location.href = window.location.pathname;
    });

    // Click interception (capture phase)
    document.addEventListener('click', clickInterceptor, true);

    // Rich text toolbar
    createRTBar();
    document.addEventListener('selectionchange', positionRTBar);

    // Keyboard shortcuts
    document.addEventListener('keydown', function veKeyHandler(e) {
      if (!editorActive) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey)) ) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveChanges();
      }
    }, true);

    // Close popover on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePopover();
    });

    // Initial history snapshot
    pushHistory();

    showToast('Edit mode — click any text, link, or image to edit');
  }

  // ─── Login ────────────────────────────────────────────────────────
  function showLogin() {
    document.body.appendChild(host);

    const overlay = document.createElement('div');
    overlay.className = 've-overlay';
    overlay.innerHTML = `
      <div class="ve-login">
        <h2>Visual Editor</h2>
        <p>Log in to edit this site</p>
        <input type="password" class="ve-pass" placeholder="Password" autocomplete="current-password">
        <button class="ve-login-btn">Log In</button>
        <div class="ve-login-error"></div>
      </div>
    `;
    editorRoot.appendChild(overlay);

    const passInput = overlay.querySelector('.ve-pass');
    const btn = overlay.querySelector('.ve-login-btn');
    const errEl = overlay.querySelector('.ve-login-error');

    function doLogin() {
      const pass = passInput.value;
      if (!pass) { errEl.textContent = 'Enter password'; return; }
      if (pass === CONFIG.password) {
        session = CONFIG.sessionSecret;
        sessionStorage.setItem(CONFIG.sessionKey, session);
        overlay.remove();
        activateEditor();
      } else {
        errEl.textContent = 'Invalid password';
      }
    }

    btn.addEventListener('click', doLogin);
    passInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    setTimeout(() => passInput.focus(), 100);
  }

  // ─── Init ─────────────────────────────────────────────────────────
  function init() {
    if (session) {
      activateEditor();
    } else {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure page is fully rendered
    setTimeout(init, 200);
  }

  // ─── Public API ───────────────────────────────────────────────────
  window.VisualEditor = {
    activate: activateEditor,
    deactivate: function () {
      editorActive = false;
      document.removeEventListener('click', clickInterceptor, true);
      document.querySelectorAll('[data-ve-id]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('ve-editable', 've-editable-img');
        el.removeAttribute('data-ve-id');
        el.removeAttribute('data-ve-original');
      });
      host.remove();
      pageStyle.remove();
    },
    save: saveChanges,
    getCleanHTML: getCleanHTML,
  };

})();
