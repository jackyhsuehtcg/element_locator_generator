// content.js - 處理網頁上的元素點擊和數據收集

class ElementLocatorGenerator {
  constructor() {
    this.isActive = false;
    this.overlayElement = null;
    this.currentHighlightedElement = null;
    this.isMainFrame = (window === window.top);
    // session token：主 frame 生成，廣播給 iframe 用於驗證訊息來源
    this._sessionToken = null;
    this.init();
  }

  init() {
    // 載入設定（供敏感資料過濾等功能使用）
    this._settings = {}
    chrome.storage.sync.get(null, (result) => {
      this._settings = result || {}
    })
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        Object.keys(changes).forEach(key => {
          this._settings[key] = changes[key].newValue
        })
      }
    })

    // 監聽來自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleElementSelection') {
        this.toggleElementSelection();
        sendResponse({ success: true });
      } else if (message.action === 'stopElementSelection') {
        this.stopElementSelection();
        sendResponse({ success: true });
      }
    });

    // 監聽來自其他 frame 的消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'ELEMENT_LOCATOR_START') {
        // 儲存 session token（來自主 frame）
        if (event.data.token) this._sessionToken = event.data.token;
        this.startElementSelection();
      } else if (event.data.type === 'ELEMENT_LOCATOR_STOP') {
        this.stopElementSelection();
      } else if (event.data.type === 'ELEMENT_LOCATOR_STOP_REQUEST' && this.isMainFrame) {
        // 處理來自 iframe 的停止請求
        this.stopElementSelection();
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
      } else if (event.data.type === 'ELEMENT_SELECTED' && this.isMainFrame) {
        // 驗證 session token（防止惡意 frame 注入）
        if (this._sessionToken && event.data.token !== this._sessionToken) {
          console.debug('[ElementLocator] 拒絕無效 token 的 ELEMENT_SELECTED 訊息');
          return;
        }
        // 處理來自 iframe 的元素選擇（已由中間層完成 framePath 組裝）
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
        this.stopElementSelection();
        
        // 為來自 iframe 的數據添加標記
        const iframeData = { ...event.data.data, fromIframe: true };
        this.sendToLLM(iframeData);
      } else if (event.data.type === 'ELEMENT_SELECTED' && !this.isMainFrame) {
        // 中間 frame：prepend 自身 iframe info 到 framePath，繼續向上傳
        const selfInfo = this.getIframeInfo();
        const existingPath = event.data.data.framePath || [];
        const updatedData = {
          ...event.data.data,
          framePath: selfInfo ? [selfInfo, ...existingPath] : existingPath
        };
        window.parent.postMessage({ type: 'ELEMENT_SELECTED', data: updatedData }, '*');
      }
    });
  }

  toggleElementSelection() {
    if (this.isActive) {
      this.stopElementSelection();
    } else {
      this.startElementSelection();
    }

    // 如果是主框架，同時啟動所有 iframe
    if (this.isMainFrame) {
      this.broadcastToFrames(this.isActive ? 'ELEMENT_LOCATOR_STOP' : 'ELEMENT_LOCATOR_START');
    }
  }

  forceStop() {
    this.isActive = false;
    document.body.style.cursor = 'default';
    
    // 移除覆蓋層
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    
    // 清除高亮
    this.clearHighlight();
    
    // 移除事件監聽器
    if (this.boundMouseOver) {
      document.removeEventListener('mouseover', this.boundMouseOver, true);
      document.removeEventListener('mouseout', this.boundMouseOut, true);
      document.removeEventListener('click', this.boundClick, true);
      document.removeEventListener('keydown', this.boundKeyDown, true);
      
      this.boundMouseOver = null;
      this.boundMouseOut = null;
      this.boundClick = null;
      this.boundKeyDown = null;
    }
  }


  broadcastToFrames(action) {
    // 遍歷所有 iframe 並發送消息（含 session token 供 iframe 驗證）
    const frames = document.querySelectorAll('iframe');
    const msg = { type: action, token: this._sessionToken };
    frames.forEach((frame, index) => {
      try {
        // 等待 iframe 載入完成
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
          frame.contentWindow.postMessage(msg, '*');
        } else {
          // 如果未載入完成，等待後重試
          setTimeout(() => {
            try {
              frame.contentWindow.postMessage(msg, '*');
            } catch (retryError) {
              console.debug(`無法向 iframe ${index} 發送消息:`, retryError);
            }
          }, 200 * (index + 1)); // 錯開時間避免同時執行
        }
      } catch (error) {
        // 忽略跨域錯誤
        console.debug(`無法向 iframe ${index} 發送消息:`, error);
      }
    });
  }

  async startElementSelection() {
    if (this.isActive) return; // 避免重複執行

    // 主 frame 啟動時產生 session token
    if (this.isMainFrame) {
      this._sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    this.isActive = true;
    document.body.style.cursor = 'crosshair';
    
    // 創建覆蓋層提示
    await this.createOverlay();
    
    // 綁定事件處理器（保存引用以便移除）
    this.boundMouseOver = this.handleMouseOver.bind(this);
    this.boundMouseOut = this.handleMouseOut.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    
    // 添加事件監聽器（使用 capture 模式確保優先處理）
    document.addEventListener('mouseover', this.boundMouseOver, true);
    document.addEventListener('mouseout', this.boundMouseOut, true);
    document.addEventListener('click', this.boundClick, true);
    document.addEventListener('keydown', this.boundKeyDown, true);
    
    console.debug('Element selection started in', this.isMainFrame ? 'main frame' : 'iframe');
  }

  stopElementSelection() {
    if (!this.isActive) return; // 避免重複執行

    this.isActive = false;
    document.body.style.cursor = 'default';
    
    // 移除覆蓋層
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    
    // 清除高亮
    this.clearHighlight();
    
    // 移除事件監聽器
    if (this.boundMouseOver) {
      document.removeEventListener('mouseover', this.boundMouseOver, true);
      document.removeEventListener('mouseout', this.boundMouseOut, true);
      document.removeEventListener('click', this.boundClick, true);
      document.removeEventListener('keydown', this.boundKeyDown, true);
      
      // 清空引用
      this.boundMouseOver = null;
      this.boundMouseOut = null;
      this.boundClick = null;
      this.boundKeyDown = null;
    }
    
    console.debug('Element selection stopped in', this.isMainFrame ? 'main frame' : 'iframe');
  }

  async createOverlay() {
    if (!this.isMainFrame) return;

    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'element-locator-overlay';
    this.overlayElement.innerHTML = `
      <div class="overlay-content">
        <span>Element Locator Generator</span>
        <span>點擊元素生成 locator，按 ESC 取消</span>
      </div>
    `;
    document.body.appendChild(this.overlayElement);
  }

  handleMouseOver(event) {
    event.stopPropagation();
    // composedPath()[0] 取得 shadow DOM 內的真正目標元素
    const target = (event.composedPath && event.composedPath()[0]) || event.target;
    if (target === this.overlayElement || this.overlayElement?.contains(target)) return;
    if (target.id?.startsWith('locator-')) return;
    this.highlightElement(target);
  }

  handleMouseOut(event) {
    event.stopPropagation();
    this.clearHighlight();
  }

  handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    // composedPath()[0] 取得 shadow DOM 內的真正目標元素
    const target = (event.composedPath && event.composedPath()[0]) || event.target;
    if (target === this.overlayElement || this.overlayElement?.contains(target)) return;
    if (target.id?.startsWith('locator-')) return;

    this._lastTargetElement = target;
    const elementData = this.extractElementData(target);
    this.stopElementSelection();

    // Shadow DOM 深度超過限制時顯示警告（不阻止繼續）
    if (elementData.shadowDepth > 3) {
      console.warn(`[ElementLocator] Shadow DOM 深度 ${elementData.shadowDepth} 超過建議上限 3，生成的 selector 可能不穩定`);
      elementData.shadowDepthWarning = `Shadow DOM 深度 ${elementData.shadowDepth} 超過限制，selector 可能僅適用於 Playwright`;
    }

    this.sendToLLM(elementData);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.stopElementSelection();
      if (this.isMainFrame) {
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
      }
      return;
    }

    // 鍵盤導航：Arrow keys 在 DOM 元素間移動
    if (!this.currentHighlightedElement) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const current = this.currentHighlightedElement;
    let next = null;

    switch (event.key) {
      case 'ArrowUp':
        next = this._prevVisibleSibling(current);
        break;
      case 'ArrowDown':
        next = this._nextVisibleSibling(current);
        break;
      case 'ArrowLeft':
        next = current.parentElement || null;
        break;
      case 'ArrowRight':
        next = current.firstElementChild || null;
        break;
      case 'Enter':
        // 以鍵盤確認選取當前 hover 元素
        this._lastTargetElement = current;
        const elementData = this.extractElementData(current);
        if (elementData.shadowDepth > 3) {
          elementData.shadowDepthWarning = `Shadow DOM 深度 ${elementData.shadowDepth} 超過限制`;
        }
        this.stopElementSelection();
        this.sendToLLM(elementData);
        return;
    }

    if (next && !this._isLocatorUI(next) &&
        next !== document.body && next !== document.documentElement) {
      this.highlightElement(next, 'keyboard');
    }
  }

  _prevVisibleSibling(el) {
    let sib = el.previousElementSibling;
    while (sib && this._isLocatorUI(sib)) sib = sib.previousElementSibling;
    return sib;
  }

  _nextVisibleSibling(el) {
    let sib = el.nextElementSibling;
    while (sib && this._isLocatorUI(sib)) sib = sib.nextElementSibling;
    return sib;
  }

  _isLocatorUI(el) {
    return el.id?.startsWith('locator-') || el.id === 'locator-loading';
  }

  highlightElement(element, mode = 'hover') {
    this.clearHighlight();
    this.currentHighlightedElement = element;
    // hover: 橘色，keyboard focus: 藍色
    const color = mode === 'keyboard' ? '#6ca0b8' : '#e8926c';
    const bg = mode === 'keyboard' ? 'rgba(108, 160, 184, 0.15)' : 'rgba(232, 146, 108, 0.1)';
    element.style.outline = `3px solid ${color}`;
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = bg;
  }

  clearHighlight() {
    if (this.currentHighlightedElement) {
      this.currentHighlightedElement.style.outline = '';
      this.currentHighlightedElement.style.outlineOffset = '';
      this.currentHighlightedElement.style.backgroundColor = '';
      this.currentHighlightedElement = null;
    }
  }

  extractElementData(element) {
    const rect = element.getBoundingClientRect();
    
    return {
      // 保存原始元素引用（用於驗證）
      originalElement: element,

      // 基本屬性
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: this._getClassName(element),
      name: element.getAttribute('name') || null,

      // 文本內容（優先使用 innerText 取可見文字）
      text: element.innerText?.trim().substring(0, 100) || element.textContent?.trim().substring(0, 100) || null,
      textContentRaw: element.textContent?.trim().substring(0, 200) || null,
      innerText: element.innerText?.trim().substring(0, 100) || null,
      placeholder: element.placeholder || null,
      value: element.value || null,

      // 屬性（分離一般屬性與 ARIA 屬性）
      attributes: this.getRelevantAttributes(element),
      ariaAttributes: this._getAriaAttributes(element),

      // 關聯 label 文字（協助 getByLabel 生成）
      labels: this._getAssociatedLabels(element),

      // 位置信息
      position: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },

      // DOM 結構
      parent: {
        tagName: element.parentElement?.tagName.toLowerCase() || null,
        className: this._getClassName(element.parentElement),
        id: element.parentElement?.id || null
      },

      // 兄弟元素
      siblings: this.getSiblingsInfo(element),

      // 同 tag 鄰近元素摘要（協助 LLM 判斷唯一性）
      neighborContext: this._getNeighborContext(element),

      // 子元素
      children: element.children.length,

      // XPath 和 CSS Selector
      xpath: this.generateXPath(element),
      cssSelector: this.generateCSSSelector(element),

      // Shadow DOM 資訊
      shadowDepth: this._getShadowDepth(element),

      // 框架偵測（協助 LLM 過濾動態 class）
      framework: this._detectFramework(),

      // 頁面信息
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };
  }

  // 計算元素所在的 shadow root 層數（0 = 一般 DOM）
  _getShadowDepth(element) {
    let depth = 0;
    let node = element.parentNode;
    while (node) {
      if (node instanceof ShadowRoot) depth++;
      node = node.parentNode;
    }
    return depth;
  }

  // 偵測頁面前端框架（React/Vue/Angular/Svelte/Stencil/LWC/unknown）
  _detectFramework() {
    if (
      typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' ||
      typeof window.React !== 'undefined' ||
      document.querySelector('[data-reactroot]') != null
    ) return 'react';

    if (
      typeof window.__VUE__ !== 'undefined' ||
      typeof window.Vue !== 'undefined' ||
      document.querySelector('[data-v-app]') != null
    ) return 'vue';

    if (
      document.querySelector('[ng-version]') != null ||
      typeof window.getAllAngularRootElements === 'function'
    ) return 'angular';

    if (
      typeof window.__svelte !== 'undefined' ||
      document.querySelector('[class*="svelte-"]') != null
    ) return 'svelte';

    if (
      document.querySelector('[data-lwc-host-mutated]') != null ||
      typeof window.$A !== 'undefined'
    ) return 'lwc';

    return 'unknown';
  }

  // SVGAnimatedString 安全轉字串
  _getClassName(element) {
    if (!element) return null;
    if (typeof element.className === 'string') return element.className || null;
    return element.className?.baseVal || null;
  }

  // 擷取完整 aria-* 屬性
  _getAriaAttributes(element) {
    const aria = {};
    for (const attr of element.attributes) {
      if (attr.name.startsWith('aria-') || attr.name === 'role') {
        aria[attr.name] = attr.value;
      }
    }
    return aria;
  }

  // 反查關聯 <label for="id"> 或包裹 <label>
  _getAssociatedLabels(element) {
    const labels = [];
    if (element.id) {
      document.querySelectorAll(`label[for="${CSS.escape(element.id)}"]`).forEach(label => {
        const text = (label.innerText || label.textContent)?.trim();
        if (text) labels.push(text);
      });
    }
    let ancestor = element.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'LABEL') {
        const text = (ancestor.innerText || ancestor.textContent)?.trim();
        if (text) labels.push(text);
        break;
      }
      ancestor = ancestor.parentElement;
    }
    return labels;
  }

  // 同 tag 鄰近元素摘要
  _getNeighborContext(element) {
    const siblings = Array.from(element.parentElement?.children || []);
    const sameTag = siblings.filter(el => el.nodeName === element.nodeName);
    const targetIndex = sameTag.indexOf(element);
    const start = Math.max(0, targetIndex - 2);
    const end = Math.min(sameTag.length, targetIndex + 3);
    return {
      sameTagCount: sameTag.length,
      targetIndexAmongSameTag: targetIndex,
      neighbors: sameTag.slice(start, end).map((el, offset) => ({
        index: start + offset,
        isSelf: el === element,
        text: (el.innerText || el.textContent)?.trim().substring(0, 30) || null,
        distinguishingAttrs: this._getDistinguishingAttrs(el)
      }))
    };
  }

  _getDistinguishingAttrs(element) {
    const attrs = {};
    ['id', 'data-testid', 'aria-label', 'name', 'type', 'href'].forEach(k => {
      const v = element.getAttribute(k) || (k === 'id' ? element.id : null);
      if (v) attrs[k] = v;
    });
    return attrs;
  }

  getRelevantAttributes(element) {
    const relevantAttrs = [
      'type', 'role', 'data-testid', 'data-test', 'data-cy', 'data-automation',
      'href', 'src', 'alt', 'title', 'for'
    ];
    
    const attributes = {};
    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });
    
    return attributes;
  }

  getSiblingsInfo(element) {
    const siblings = Array.from(element.parentElement?.children || []);
    const index = siblings.indexOf(element);
    
    return {
      total: siblings.length,
      index: index,
      sameTagSiblings: siblings.filter(el => el.tagName === element.tagName).length
    };
  }

  _getStableAttrEntries(element) {
    const stableAttrs = [
      'data-testid', 'data-test', 'data-cy', 'data-automation',
      'name', 'aria-label', 'placeholder', 'title', 'alt', 'type', 'role', 'href'
    ];
    return stableAttrs
      .map(attr => ({ attr, value: element.getAttribute(attr) }))
      .filter(({ value }) => value && String(value).length <= 200);
  }

  _quoteCssValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  _quoteXPathValue(value) {
    const str = String(value);
    if (!str.includes('"')) return `"${str}"`;
    if (!str.includes("'")) return `'${str}'`;
    return `concat(${str.split('"').map((part, index, arr) => {
      const quoted = `"${part}"`;
      return index < arr.length - 1 ? `${quoted}, '"', ` : quoted;
    }).join('')})`;
  }

  _getStaticClasses(element) {
    const rawClass = typeof element.className === 'string'
      ? element.className
      : element.className?.baseVal || '';
    return rawClass.trim().split(/\s+/)
      .filter(cls => cls && !this._isDynamicClass(cls))
      .slice(0, 3);
  }

  _getElementText(element) {
    return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 80);
  }

  _isUniqueCssMatch(selector, targetElement) {
    try {
      const matches = Array.from(document.querySelectorAll(selector));
      return matches.length === 1 && matches[0] === targetElement;
    } catch (_) {
      return false;
    }
  }

  _isUniqueXPathMatch(xpath, targetElement) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength === 1 && result.snapshotItem(0) === targetElement;
    } catch (_) {
      return false;
    }
  }

  _isUniqueDirectChildCssMatch(parent, selector, targetElement) {
    try {
      const matches = Array.from(parent.children).filter(child => child.matches(selector));
      return matches.length === 1 && matches[0] === targetElement;
    } catch (_) {
      return false;
    }
  }

  _isUniqueDirectChildByPredicate(parent, targetElement, predicate) {
    const matches = Array.from(parent.children).filter(predicate);
    return matches.length === 1 && matches[0] === targetElement;
  }

  _getDirectCssCandidates(element) {
    const tag = element.nodeName.toLowerCase();
    const candidates = [];
    const attrEntries = this._getStableAttrEntries(element);

    attrEntries.forEach(({ attr, value }) => {
      candidates.push(`${tag}[${attr}="${this._quoteCssValue(value)}"]`);
    });

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i];
        const second = attrEntries[j];
        candidates.push(`${tag}[${first.attr}="${this._quoteCssValue(first.value)}"][${second.attr}="${this._quoteCssValue(second.value)}"]`);
      }
    }

    const staticClasses = this._getStaticClasses(element);
    staticClasses.forEach(cls => {
      candidates.push(`${tag}.${CSS.escape(cls)}`);
    });

    for (let i = 0; i < staticClasses.length; i++) {
      for (let j = i + 1; j < staticClasses.length; j++) {
        candidates.push(`${tag}.${CSS.escape(staticClasses[i])}.${CSS.escape(staticClasses[j])}`);
      }
    }

    return [...new Set(candidates)];
  }

  _getDirectXPathCandidates(element) {
    const tag = element.nodeName.toLowerCase();
    const candidates = [];
    const attrEntries = this._getStableAttrEntries(element);

    attrEntries.forEach(({ attr, value }) => {
      candidates.push(`//${tag}[@${attr}=${this._quoteXPathValue(value)}]`);
    });

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i];
        const second = attrEntries[j];
        candidates.push(`//${tag}[@${first.attr}=${this._quoteXPathValue(first.value)} and @${second.attr}=${this._quoteXPathValue(second.value)}]`);
      }
    }

    const text = this._getElementText(element);
    if (text && element.children.length === 0) {
      candidates.push(`//${tag}[normalize-space(.)=${this._quoteXPathValue(text)}]`);
      attrEntries.forEach(({ attr, value }) => {
        candidates.push(`//${tag}[@${attr}=${this._quoteXPathValue(value)} and normalize-space(.)=${this._quoteXPathValue(text)}]`);
      });
    }

    return [...new Set(candidates)];
  }

  _getBestAnchorCssSelector(element) {
    if (element.id) {
      const byId = `#${CSS.escape(element.id)}`;
      if (this._isUniqueCssMatch(byId, element)) return byId;
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueCssMatch(candidate, element)) return candidate;
    }

    return null;
  }

  _getBestAnchorXPath(element) {
    if (element.id) {
      const byId = `//*[@id=${this._quoteXPathValue(element.id)}]`;
      if (this._isUniqueXPathMatch(byId, element)) return byId;
    }

    for (const candidate of this._getDirectXPathCandidates(element)) {
      if (this._isUniqueXPathMatch(candidate, element)) return candidate;
    }

    return null;
  }

  _buildScopedCssSegment(element, parent) {
    const tag = element.nodeName.toLowerCase();

    if (element.id) {
      const idSelector = `${tag}#${CSS.escape(element.id)}`;
      if (this._isUniqueDirectChildCssMatch(parent, idSelector, element)) return idSelector;
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueDirectChildCssMatch(parent, candidate, element)) return candidate;
    }

    const sameTag = Array.from(parent.children).filter(el => el.nodeName === element.nodeName);
    if (sameTag.length === 1) return tag;
    return `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})`;
  }

  _buildScopedXPathSegment(element, parent) {
    const tag = element.nodeName.toLowerCase();
    const attrEntries = this._getStableAttrEntries(element);

    if (element.id && this._isUniqueDirectChildByPredicate(parent, element, child => child.id === element.id)) {
      return `${tag}[@id=${this._quoteXPathValue(element.id)}]`;
    }

    for (const { attr, value } of attrEntries) {
      if (this._isUniqueDirectChildByPredicate(parent, element, child => child.nodeName === element.nodeName && child.getAttribute(attr) === value)) {
        return `${tag}[@${attr}=${this._quoteXPathValue(value)}]`;
      }
    }

    for (let i = 0; i < attrEntries.length; i++) {
      for (let j = i + 1; j < attrEntries.length; j++) {
        const first = attrEntries[i];
        const second = attrEntries[j];
        if (this._isUniqueDirectChildByPredicate(parent, element, child => child.nodeName === element.nodeName && child.getAttribute(first.attr) === first.value && child.getAttribute(second.attr) === second.value)) {
          return `${tag}[@${first.attr}=${this._quoteXPathValue(first.value)} and @${second.attr}=${this._quoteXPathValue(second.value)}]`;
        }
      }
    }

    const text = this._getElementText(element);
    if (text && element.children.length === 0) {
      if (this._isUniqueDirectChildByPredicate(parent, element, child => child.nodeName === element.nodeName && this._getElementText(child) === text)) {
        return `${tag}[normalize-space(.)=${this._quoteXPathValue(text)}]`;
      }
    }

    const sameTag = Array.from(parent.children).filter(el => el.nodeName === element.nodeName);
    if (sameTag.length === 1) return tag;
    return `${tag}[${sameTag.indexOf(element) + 1}]`;
  }

  _buildRelativeCssPath(anchor, element) {
    const segments = [];
    let current = element;

    while (current && current !== anchor) {
      const parent = current.parentElement;
      if (!parent) break;
      segments.unshift(this._buildScopedCssSegment(current, parent));
      current = parent;
    }

    return segments.join(' > ');
  }

  _buildRelativeXPath(anchorXPath, anchor, element) {
    const segments = [];
    let current = element;

    while (current && current !== anchor) {
      const parent = current.parentElement;
      if (!parent) break;
      segments.unshift(this._buildScopedXPathSegment(current, parent));
      current = parent;
    }

    return segments.length > 0 ? `${anchorXPath}/${segments.join('/')}` : anchorXPath;
  }

  _buildAbsoluteCssPath(element) {
    const segments = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;
      segments.unshift(this._buildScopedCssSegment(current, parent));
      current = parent;
    }

    return document.body?.contains(element) ? ['body', ...segments].join(' > ') : segments.join(' > ');
  }

  _buildAbsoluteXPath(element) {
    const segments = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;
      segments.unshift(this._buildScopedXPathSegment(current, parent));
      current = parent;
    }

    const prefix = document.body?.contains(element) ? '//body' : '';
    return `${prefix}/${segments.join('/')}`;
  }

  generateXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

    if (element.id) {
      const byId = `//*[@id=${this._quoteXPathValue(element.id)}]`;
      if (this._isUniqueXPathMatch(byId, element)) return byId;
    }

    for (const candidate of this._getDirectXPathCandidates(element)) {
      if (this._isUniqueXPathMatch(candidate, element)) return candidate;
    }

    let ancestor = element.parentElement;
    while (ancestor) {
      const anchor = this._getBestAnchorXPath(ancestor);
      if (anchor) {
        const relative = this._buildRelativeXPath(anchor, ancestor, element);
        if (relative && this._isUniqueXPathMatch(relative, element)) return relative;
      }
      ancestor = ancestor.parentElement;
    }

    return this._buildAbsoluteXPath(element);
  }

  generateCSSSelector(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

    if (element.id) {
      const byId = `#${CSS.escape(element.id)}`;
      if (this._isUniqueCssMatch(byId, element)) return byId;
    }

    for (const candidate of this._getDirectCssCandidates(element)) {
      if (this._isUniqueCssMatch(candidate, element)) return candidate;
    }

    let ancestor = element.parentElement;
    while (ancestor) {
      const anchor = this._getBestAnchorCssSelector(ancestor);
      if (anchor) {
        const relative = this._buildRelativeCssPath(ancestor, element);
        const combined = relative ? `${anchor} > ${relative}` : anchor;
        if (this._isUniqueCssMatch(combined, element)) return combined;
      }
      ancestor = ancestor.parentElement;
    }

    return this._buildAbsoluteCssPath(element);
  }

  // 偵測動態生成的 class 名稱（不適合作 locator）
  _isDynamicClass(cls) {
    return (
      /^sc-[a-zA-Z0-9]+$/.test(cls) ||      // styled-components / Stencil host
      /^css-[a-zA-Z0-9]+$/.test(cls) ||     // Emotion
      /^_ngcontent-/.test(cls) ||            // Angular content
      /^_nghost-/.test(cls) ||               // Angular host
      /^ng-/.test(cls) ||                    // Angular directive classes
      /^svelte-[a-z0-9]+$/.test(cls) ||     // Svelte scoped
      /^data-v-[a-f0-9]+/.test(cls) ||      // Vue 2 scoped
      /^__vue/.test(cls) ||                  // Vue 3 internal
      /^[a-zA-Z]+-[a-f0-9]{6,}$/.test(cls) // generic hash
    )
  }

  // 過濾 elementData 中的敏感資訊，避免送出機密欄位值
  _filterSensitiveData(elementData) {
    if (!this._settings || !this._settings.enableSensitiveFilter) return elementData

    const DEFAULT_FIELD_BLACKLIST = [
      /password/i, /secret/i, /token/i, /api[_-]?key/i,
      /credit[_-]?card/i, /ssn/i, /cvv/i, /pin/i
    ]
    const VALUE_PATTERNS = [
      { name: 'email', rx: /^[\w.+-]+@[\w-]+\.[\w.-]+$/ },
      { name: 'jwt', rx: /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/ },
      { name: 'uuid', rx: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
      { name: 'bearer', rx: /^Bearer\s+/i },
      { name: 'credit-card', test: (v) => /^\d{13,19}$/.test(v.replace(/\s|-/g, '')) && luhn(v.replace(/\s|-/g, '')) }
    ]
    function luhn(num) {
      let sum = 0, even = false
      for (let i = num.length - 1; i >= 0; i--) {
        let d = parseInt(num[i])
        if (even) { d *= 2; if (d > 9) d -= 9 }
        sum += d; even = !even
      }
      return sum % 10 === 0
    }

    const customBlacklist = (this._settings.customBlacklist || []).map(p => new RegExp(p, 'i'))
    const allBlacklist = [...DEFAULT_FIELD_BLACKLIST, ...customBlacklist]

    const isBlacklisted = (name) => name && allBlacklist.some(rx => rx.test(name))
    const filterValue = (val) => {
      if (!val) return val
      for (const { name, rx, test } of VALUE_PATTERNS) {
        if ((rx && rx.test(val)) || (test && test(val))) return `[REDACTED:${name}]`
      }
      return val
    }

    const filtered = { ...elementData }
    const fieldName = filtered.name || filtered.id || filtered.attributes?.name || ''
    const fieldType = filtered.attributes?.type || ''

    if (isBlacklisted(fieldName) || fieldType === 'password') {
      if (filtered.value) filtered.value = '[REDACTED:blacklist]'
      if (filtered.text) filtered.text = '[REDACTED:blacklist]'
    } else {
      if (filtered.value) filtered.value = filterValue(filtered.value)
      if (filtered.text) filtered.text = filterValue(filtered.text)
    }

    if (filtered.value && filtered.value.length > 200) {
      filtered.value = filtered.value.substring(0, 200) + '...[truncated]'
    }
    if (filtered.textContentRaw && filtered.textContentRaw.length > 200) {
      filtered.textContentRaw = filtered.textContentRaw.substring(0, 200) + '...[truncated]'
    }

    return filtered
  }

  async sendToLLM(elementData) {
    // 過濾敏感資料
    elementData = this._filterSensitiveData(elementData)

    // 儲存最後的 elementData 供離線 Retry 使用
    this._lastElementData = elementData;

    // 如果在 iframe 中，將數據傳送到父框架處理（遞迴向上，每層 prepend 自己的 iframe info）
    if (!this.isMainFrame) {
      // 移除無法序列化的 originalElement 引用
      const serializableData = { ...elementData };
      delete serializableData.originalElement;
      
      // 初始化 framePath（最深層從空陣列開始，中間層在 message handler 中 prepend）
      if (!serializableData.framePath) serializableData.framePath = [];
      
      // 保留舊版 iframeInfo 相容（單層場景）
      serializableData.iframeInfo = this.getIframeInfo();
      
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        data: serializableData,
        token: this._sessionToken
      }, '*');
      return;
    }

    // 顯示等待動畫
    this.showLoading();
    
    // 若啟用送出前預覽，等用戶確認後再繼續
    if (this._settings.showPreviewModal) {
      const confirmed = await this._showPreviewModal(elementData)
      if (!confirmed) {
        this.hideLoading()
        return
      }
    }
    
    try {
      // 發送到 background script 處理 API 調用
      const response = await chrome.runtime.sendMessage({
        action: 'generateLocators',
        data: elementData
      });
      
      // 隱藏等待動畫
      this.hideLoading();
      
      if (response.success) {
        // 驗證和優化 locators
        let validatedLocators = response.locators;
        const showOptions = { fromCache: response.fromCache || false };
        if (elementData.originalElement) {
          // 主框架元素：完整驗證
          validatedLocators = this.validateAndOptimizeLocators(response.locators, elementData);
        } else if (elementData.fromIframe) {
          // iframe 元素：基礎驗證
          const iframeResult = this.validateIframeLocators(response.locators, elementData);
          this.showResult(iframeResult.locators, { ...iframeResult, ...showOptions });
          this._saveToHistory(elementData, iframeResult.locators);
          return;
        }
        this.showResult(validatedLocators, showOptions);
        this._saveToHistory(elementData, validatedLocators);
      } else {
        // API 失敗 → 離線 fallback（本地生成）
        if (elementData.originalElement) {
          const offlineLocators = this._generateOfflineFallback(elementData);
          this.showResult(offlineLocators, { offlineMode: true, offlineReason: response.error });
        } else {
          this.showError(response.error);
        }
      }
    } catch (error) {
      console.error('Error sending to Gemini:', error);
      this.hideLoading();
      // 網路錯誤也嘗試離線 fallback
      if (elementData && elementData.originalElement) {
        const offlineLocators = this._generateOfflineFallback(elementData);
        this.showResult(offlineLocators, { offlineMode: true, offlineReason: '網路連線失敗' });
      } else {
        this.showError('發送數據時發生錯誤');
      }
    }
  }

  // 離線模式：僅使用本地規則生成 locator
  _generateOfflineFallback(elementData) {
    const el = elementData.originalElement;
    const css = el ? this.generateCSSSelector(el) : elementData.cssSelector || '';
    const xpath = el ? this.generateXPath(el) : elementData.xpath || '';
    return `Playwright: ${css ? `page.locator('${css}')` : '// 無法生成'}\nCSS: ${css || '// 無法生成'}\nXPath: ${xpath || '// 無法生成'}\nSelenium: ${css ? `driver.find_element(By.CSS_SELECTOR, "${css}")` : '// 無法生成'}`;
  }

  validateAndOptimizeLocators(locators, elementData) {
    const lines = locators.split('\n');
    const result = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('Playwright:')) {
        const pw = trimmed.replace('Playwright:', '').trim();
        const validated = this.validatePlaywright(pw, elementData.originalElement);
        result.push(`Playwright: ${validated}`);
      } else if (trimmed.startsWith('CSS:')) {
        const cssSelector = trimmed.replace('CSS:', '').trim();
        const validatedCSS = this.validateCSS(cssSelector, elementData.originalElement);
        result.push(`CSS: ${validatedCSS}`);
      } else if (trimmed.startsWith('XPath:')) {
        const xpath = trimmed.replace('XPath:', '').trim();
        const validatedXPath = this.validateXPath(xpath, elementData.originalElement);
        result.push(`XPath: ${validatedXPath}`);
      } else if (trimmed.startsWith('Selenium:')) {
        const sel = trimmed.replace('Selenium:', '').trim();
        const validatedSel = this.validateSelenium(sel, elementData.originalElement);
        result.push(`Selenium: ${validatedSel}`);
      } else if (trimmed.startsWith('Cypress:')) {
        // cy.get('selector') 中的 CSS 部分可驗證
        const cyRaw = trimmed.replace('Cypress:', '').trim();
        const cyMatch = cyRaw.match(/cy\.get\(['"](.*?)['"]\)/);
        if (cyMatch) {
          const validated = this.validateCSS(cyMatch[1], elementData.originalElement);
          // 重組 cy.get() 形式（保留驗證後的 selector）
          const newCss = validated.split(' ')[0]; // 去掉驗證 badge 以外的部分
          result.push(`Cypress: ${cyRaw} ${validated.includes('❌') || validated.includes('⚠️') || validated.includes('✅') ? validated.replace(cyMatch[1], '') : ''}`);
        } else {
          result.push(trimmed);
        }
      } else if (trimmed.startsWith('WebdriverIO:')) {
        // $('selector') 中的 CSS 部分可驗證
        const wdioRaw = trimmed.replace('WebdriverIO:', '').trim();
        const wdioMatch = wdioRaw.match(/\$\(['"](.*?)['"]\)/);
        if (wdioMatch) {
          const validated = this.validateCSS(wdioMatch[1], elementData.originalElement);
          result.push(`WebdriverIO: ${wdioRaw} ${validated.includes('❌') || validated.includes('⚠️') || validated.includes('✅') ? validated.replace(wdioMatch[1], '') : ''}`);
        } else {
          result.push(trimmed);
        }
      } else if (trimmed.length > 0) {
        // 其他類型，保留原樣
        result.push(trimmed);
      }
    });
    
    return result.join('\n');
  }

  // 解析 Playwright getByXxx() 並查 DOM 驗證
  validatePlaywright(locator, targetElement) {
    try {
      // getByRole(role, { name })
      const roleMatch = locator.match(/getByRole\(['"](\w+)['"]\s*(?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?\)/);
      if (roleMatch) {
        const [, role, name] = roleMatch;
        const elements = Array.from(document.querySelectorAll(`[role="${role}"]`));
        // 加入語義化對應（button、a、input 等有隱式 role）
        const semanticMap = {
          button: 'button', link: 'a', textbox: 'input[type="text"],input:not([type]),textarea',
          checkbox: 'input[type="checkbox"]', radio: 'input[type="radio"]'
        };
        if (semanticMap[role]) {
          elements.push(...Array.from(document.querySelectorAll(semanticMap[role])));
        }
        const filtered = name
          ? elements.filter(el => (el.innerText || el.textContent || el.getAttribute('aria-label') || '').includes(name))
          : elements;
        if (filtered.length === 0) return `${locator} ❌ (無匹配元素)`;
        if (filtered.length === 1) return `${locator} ✅ (唯一匹配)`;
        if (filtered.includes(targetElement)) {
          return `page.locator('${this.generateCSSSelector(targetElement).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}') ⚠️ (${filtered.length}個匹配，已替換為精準本地生成)`;
        }
        return `${locator} ⚠️ (${filtered.length}個匹配)`;
      }
      // getByText / getByLabel / getByPlaceholder
      const textMatch = locator.match(/getBy(Text|Label|Placeholder)\(['"]([^'"]+)['"]\)/);
      if (textMatch) {
        const [, method, value] = textMatch;
        let elements = [];
        if (method === 'Text') {
          elements = Array.from(document.querySelectorAll('*'))
            .filter(el => el.children.length === 0 && (el.innerText || el.textContent)?.includes(value));
        } else if (method === 'Label') {
          const labels = Array.from(document.querySelectorAll('label'))
            .filter(el => (el.innerText || el.textContent)?.includes(value));
          elements = labels.flatMap(label => {
            const forId = label.getAttribute('for');
            if (forId) {
              const control = document.getElementById(forId);
              return control ? [control] : [];
            }
            return Array.from(label.querySelectorAll('input,textarea,select,button'));
          });
        } else if (method === 'Placeholder') {
          elements = Array.from(document.querySelectorAll(`[placeholder]`))
            .filter(el => el.getAttribute('placeholder')?.includes(value));
        }
        if (elements.length === 0) return `${locator} ❌ (無匹配元素)`;
        if (elements.length === 1 && elements[0] === targetElement) return `${locator} ✅ (唯一匹配)`;
        if (elements.includes(targetElement)) {
          return `page.locator('${this.generateCSSSelector(targetElement).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}') ⚠️ (${elements.length}個匹配，已替換為精準本地生成)`;
        }
        return `${locator} ⚠️ (${elements.length}個匹配)`;
      }
      // getByTestId
      const testIdMatch = locator.match(/getByTestId\(['"]([^'"]+)['"]\)/);
      if (testIdMatch) {
        const elements = document.querySelectorAll(`[data-testid="${testIdMatch[1]}"]`);
        if (elements.length === 0) return `${locator} ❌ (無匹配元素)`;
        if (elements.length === 1) return `${locator} ✅ (唯一匹配)`;
        if (Array.from(elements).includes(targetElement)) {
          return `page.locator('${this.generateCSSSelector(targetElement).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}') ⚠️ (${elements.length}個匹配，已替換為精準本地生成)`;
        }
        return `${locator} ⚠️ (${elements.length}個匹配)`;
      }
      // 無法解析，直接回傳
      return locator;
    } catch (_) {
      return locator;
    }
  }

  // 解析 Selenium By.xxx 並驗證
  validateSelenium(locator, targetElement) {
    try {
      const byId = locator.match(/By\.(?:ID|id)\(['"]([^'"]+)['"]\)|By\.Id\("([^"]+)"\)/);
      if (byId) {
        const id = byId[1] || byId[2];
        const el = document.getElementById(id);
        return el ? `${locator} ✅ (唯一匹配)` : `${locator} ❌ (無匹配元素)`;
      }
      const byCss = locator.match(/By\.CSS_SELECTOR\(['"]([^'"]+)['"]\)|By\.cssSelector\("([^"]+)"\)/);
      if (byCss) {
        const sel = byCss[1] || byCss[2];
        const els = document.querySelectorAll(sel);
        if (els.length === 0) return `${locator} ❌ (無匹配元素)`;
        if (els.length === 1) return `${locator} ✅ (唯一匹配)`;
        return `${locator} ⚠️ (${els.length}個匹配)`;
      }
      const byXpath = locator.match(/By\.XPATH\(['"]([^'"]+)['"]\)|By\.xpath\("([^"]+)"\)/);
      if (byXpath) {
        const xp = byXpath[1] || byXpath[2];
        const validated = this.validateXPath(xp, targetElement);
        return `${locator.split('(')[0]}("${validated}")`;
      }
      return locator;
    } catch (_) {
      return locator;
    }
  }

  validateCSS(selector, targetElement) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      
      if (elements.length === 0) {
        // 嘗試本地 fallback
        const fallback = this.generateCSSSelector(targetElement);
        return `${selector} ❌ (無匹配元素) → 建議: ${fallback}`;
      }
      
      if (elements.length === 1) {
        if (elements[0] === targetElement) {
          return `${selector} ✅ (唯一匹配)`;
        }
        return `${selector} ❌ (匹配到非目標元素)`;
      }
      
      // 多個匹配 — 先偵測是否已有索引，避免無效 append
      const hasExistingIndex = /:nth-(?:child|of-type|last-child|last-of-type)\(|\[[\d]+\]$/.test(selector);
      
      if (hasExistingIndex) {
        // LLM 已加索引但仍多個匹配，改用本地 fallback
        const fallback = this.generateCSSSelector(targetElement);
        return `${fallback} ⚠️ (LLM 索引無效，已替換為本地生成)`;
      }
      
      const targetIndex = elements.indexOf(targetElement);
      if (targetIndex >= 0) {
        const fallback = this.generateCSSSelector(targetElement);
        return `${fallback} ⚠️ (${elements.length}個匹配，已替換為精準本地生成)`;
      }
      
      return `${selector} ❌ (匹配${elements.length}個元素但不包含目標)`;
    } catch (error) {
      return `${selector} ❌ (無效選擇器: ${error.message})`;
    }
  }

  validateXPath(xpath, targetElement) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        elements.push(result.snapshotItem(i));
      }
      
      if (elements.length === 0) {
        const fallback = this.generateXPath(targetElement);
        return `${xpath} ❌ (無匹配元素) → 建議: ${fallback}`;
      }
      
      if (elements.length === 1) {
        if (elements[0] === targetElement) {
          return `${xpath} ✅ (唯一匹配)`;
        }
        return `${xpath} ❌ (匹配到非目標元素)`;
      }
      
      // 多個匹配 — 偵測是否已有 [N] 索引
      const hasExistingIndex = /\[\d+\]$/.test(xpath.trim());
      
      if (hasExistingIndex) {
        const fallback = this.generateXPath(targetElement);
        return `${fallback} ⚠️ (LLM 索引無效，已替換為本地生成)`;
      }
      
      const targetIndex = elements.indexOf(targetElement);
      if (targetIndex >= 0) {
        const fallback = this.generateXPath(targetElement);
        return `${fallback} ⚠️ (${elements.length}個匹配，已替換為精準本地生成)`;
      }
      
      return `${xpath} ❌ (匹配${elements.length}個元素但不包含目標)`;
    } catch (error) {
      return `${xpath} ❌ (無效XPath: ${error.message})`;
    }
  }

  getIframeInfo() {
    // 獲取當前 iframe 的相關信息
    try {
      const iframe = window.frameElement;
      if (!iframe) return null;
      
      return {
        id: iframe.id || null,
        name: iframe.name || null,
        src: iframe.src || null,
        className: iframe.className || null,
        title: iframe.title || null
      };
    } catch (error) {
      return null;
    }
  }

  validateIframeLocators(locators, elementData) {
    // 對於來自 iframe 的 locator，保持原始格式用於複製
    const lines = locators.split('\n');
    const result = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('Playwright:') || trimmed.startsWith('CSS:') || 
          trimmed.startsWith('XPath:') || trimmed.startsWith('Selenium:')) {
        result.push(trimmed); // 保持原始格式，不添加標記
      }
    });
    
    return {
      locators: result.join('\n'),
      isFromIframe: true,
      iframeInfo: elementData.iframeInfo || null,
      framePath: elementData.framePath || []
    };
  }

  // 透過 background 將歷史紀錄寫入 chrome.storage.local
  _saveToHistory(elementData, locators) {
    try {
      chrome.runtime.sendMessage({
        action: 'saveHistory',
        entry: {
          url: elementData.url || window.location.href,
          tagName: elementData.tagName,
          locators: typeof locators === 'string' ? locators : JSON.stringify(locators),
          timestamp: Date.now()
        }
      });
    } catch (_) { /* 靜默失敗（例如擴充已停用） */ }
  }

  // 送出前預覽 modal，顯示即將送出的 elementData，讓用戶確認
  _showPreviewModal(elementData) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'locator-preview-overlay'

      const modal = document.createElement('div')
      modal.className = 'locator-preview-modal'

      // 僅顯示可讀欄位
      const displayData = {
        tag: elementData.tagName,
        id: elementData.id || undefined,
        name: elementData.name || undefined,
        type: elementData.attributes?.type || undefined,
        text: elementData.text || undefined,
        value: elementData.value || undefined,
        classes: elementData.classes || undefined,
        ariaLabel: elementData.attributes?.['aria-label'] || undefined,
        framework: elementData.framework || undefined,
      }
      // 移除 undefined 欄位
      Object.keys(displayData).forEach(k => displayData[k] === undefined && delete displayData[k])

      modal.innerHTML = `
        <div class="locator-preview-header">
          <span class="locator-preview-title">即將送出的元素資料</span>
          <span class="locator-preview-subtitle">確認後才送往 AI 分析</span>
        </div>
        <pre class="locator-preview-data">${JSON.stringify(displayData, null, 2)}</pre>
        <div class="locator-preview-actions">
          <button class="locator-preview-cancel">取消</button>
          <button class="locator-preview-confirm">確認送出</button>
        </div>
      `

      overlay.appendChild(modal)
      document.body.appendChild(overlay)

      modal.querySelector('.locator-preview-confirm').addEventListener('click', () => {
        overlay.remove()
        resolve(true)
      })
      modal.querySelector('.locator-preview-cancel').addEventListener('click', () => {
        overlay.remove()
        resolve(false)
      })
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false) }
      })
    })
  }

  showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'locator-loading';
    loadingDiv.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p>正在生成 Locators...</p>
      </div>
    `;
    document.body.appendChild(loadingDiv);
  }

  hideLoading() {
    const loadingDiv = document.getElementById('locator-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  showResult(locators, options = {}) {
    // 解析回應為四種 locator 類型
    const parsedLocators = this.parseLocators(locators);
    this.currentLocators = parsedLocators; // 儲存以供複製使用
    
    // 生成標題
    let title = '🎯 生成的 Locators';
    let extraInfo = '';
    
    if (options.isFromIframe) {
      title = '📄 來自 iframe 的 Locators';
      if (options.iframeInfo) {
        extraInfo = this.generateIframeInfo(options.iframeInfo);
      }
    }

    // framePath breadcrumb（多層 iframe 路徑）
    const framePath = options.framePath || [];
    const breadcrumb = framePath.length > 0
      ? this._generateFramePathBreadcrumb(framePath)
      : '';

    // from cache 標示
    const cacheBadge = options.fromCache
      ? `<span class="cache-badge" title="結果來自本地快取">⚡ from cache</span>`
      : '';

    // 離線模式 banner
    const offlineBanner = options.offlineMode
      ? `<div class="offline-banner">⚠️ 離線模式：API 不可用（${options.offlineReason || '未知原因'}）。以下為本地生成結果，準確度較低。<button class="retry-btn">重試</button></div>`
      : '';
    
    // 創建結果顯示界面
    const resultDiv = document.createElement('div');
    resultDiv.id = 'locator-result';
    resultDiv.innerHTML = `
      <div class="result-content">
        <div class="result-header">
          <h3>${title}</h3>
          <div class="result-header-right">
            ${cacheBadge}
            <button class="close-btn">✖</button>
          </div>
        </div>
        ${breadcrumb}
        ${offlineBanner}
        ${extraInfo}
        <div class="result-body">
          ${this.generateLocatorItems(parsedLocators)}
        </div>
      </div>
    `;
    
    // 綁定關閉按鈕事件
    const closeBtn = resultDiv.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => resultDiv.remove());
    }

    // 離線模式 Retry 按鈕
    const retryBtn = resultDiv.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        resultDiv.remove();
        if (this._lastElementData) {
          this.showLoading();
          this.sendToLLM(this._lastElementData);
        }
      });
    }

    // 綁定複製按鈕事件
    this.bindCopyButtons(resultDiv);

    // Hover 回高亮：懸停 locator item 時高亮頁面匹配元素
    this.bindHoverHighlight(resultDiv);

    // In-place 編輯：點擊 code 塊進入編輯模式
    this.bindInPlaceEdit(resultDiv);

    // 綁定 iframe locator 複製事件
    if (options.isFromIframe) {
      this.bindIframeCopyButtons(resultDiv);
    }

    document.body.appendChild(resultDiv);
  }

  generateIframeInfo(iframeInfo) {
    if (!iframeInfo) return '';
    
    const iframeLocators = [];
    
    // 生成 iframe 的 locator
    if (iframeInfo.id) {
      iframeLocators.push(`iframe#${iframeInfo.id}`);
    } else if (iframeInfo.name) {
      iframeLocators.push(`iframe[name="${iframeInfo.name}"]`);
    } else if (iframeInfo.src) {
      const srcUrl = new URL(iframeInfo.src).pathname.split('/').pop();
      iframeLocators.push(`iframe[src*="${srcUrl}"]`);
    } else if (iframeInfo.className) {
      iframeLocators.push(`iframe.${iframeInfo.className.split(' ').join('.')}`);
    } else {
      iframeLocators.push('iframe (需手動定位)');
    }
    
    return `
      <div class="iframe-info">
        <div class="iframe-header">📋 iframe 定位器</div>
        <div class="iframe-locators">
          ${iframeLocators.map(locator => `<code class="iframe-locator">${locator}</code>`).join('')}
        </div>
        <div class="iframe-note">💡 先定位 iframe，再定位元素</div>
      </div>
    `;
  }

  // 生成多層 iframe framePath breadcrumb HTML
  _generateFramePathBreadcrumb(framePath) {
    if (!framePath || framePath.length === 0) return '';
    const crumbs = framePath.map((info, i) => {
      let label = 'iframe';
      if (info.id) label = `iframe#${info.id}`;
      else if (info.name) label = `iframe[name="${info.name}"]`;
      else if (info.src) {
        try { label = `iframe[src*="${new URL(info.src).pathname.split('/').pop()}"]`; } catch (_) {}
      }
      return `<span class="frame-crumb">${label}</span>${i < framePath.length - 1 ? '<span class="frame-crumb-sep">›</span>' : ''}`
    }).join('');
    return `<div class="frame-path-breadcrumb">🗂 Frame 路徑: ${crumbs} <span class="frame-crumb-target">› 目標元素</span></div>`;
  }

  // 穩定性評分（精簡版，與 StabilityScorer.js 邏輯一致）
  scoreLocator(locator) {
    if (!locator || locator === '未生成') return { stars: 1, label: 'Very fragile' };
    let score = 0;
    if (/#[a-zA-Z][\w-]*/.test(locator) || /\[@id=/.test(locator) || /By\.ID/.test(locator)) score += 100;
    if (/data-testid|data-test(?![a-z])/i.test(locator)) score += 95;
    if (/data-cy|data-automation/i.test(locator)) score += 90;
    if (/aria-label/i.test(locator)) score += 80;
    if (/getByRole|getByLabel/.test(locator)) score += 70;
    else if (/\[role=/.test(locator)) score += 75;
    if (/placeholder|getByPlaceholder/.test(locator)) score += 55;
    if (/getByText|getByTitle|getByAltText/.test(locator)) score += 45;
    const nthCount = (locator.match(/:nth-(?:child|of-type)\(/g) || []).length + (locator.match(/\[\d+\]/g) || []).length;
    score += nthCount * -20;
    const depth = (locator.match(/\s*>\s*/g) || locator.match(/\//g) || []).length;
    if (depth > 3) score += (depth - 3) * -10;
    const tiers = [
      { min: 80, stars: 5, label: 'Excellent' },
      { min: 60, stars: 4, label: 'Stable' },
      { min: 40, stars: 3, label: 'Moderate' },
      { min: 20, stars: 2, label: 'Fragile' },
      { min: -Infinity, stars: 1, label: 'Very fragile' }
    ];
    const tier = tiers.find(t => score >= t.min);
    return { stars: tier.stars, label: tier.label };
  }

  separateStatus(text) {
    if (!text) return { value: text, status: null, statusType: null };
    const patterns = [
      { regex: /\s*✅\s*\((.+)\)\s*$/, type: 'success' },
      { regex: /\s*⚠️\s*\((.+)\)\s*$/, type: 'warning' },
      { regex: /\s*❌\s*\((.+)\)\s*$/, type: 'error' },
    ];
    for (const { regex, type } of patterns) {
      const match = text.match(regex);
      if (match) {
        return { value: text.replace(regex, '').trim(), status: match[1], statusType: type };
      }
    }
    return { value: text, status: null, statusType: null };
  }

  parseLocators(locators) {
    const lines = locators.split('\n');
    const result = {};
    // 支援的 label → key 對應（順序決定優先匹配）
    const LABEL_MAP = [
      { prefix: 'Playwright:', key: 'playwright' },
      { prefix: 'CSS:', key: 'css' },
      { prefix: 'XPath:', key: 'xpath' },
      { prefix: 'Selenium:', key: 'selenium' },
      { prefix: 'Cypress:', key: 'cypress' },
      { prefix: 'TestingLibrary:', key: 'testing_library' },
      { prefix: 'WebdriverIO:', key: 'webdriverio' },
    ];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      for (const { prefix, key } of LABEL_MAP) {
        if (trimmed.startsWith(prefix)) {
          const raw = trimmed.slice(prefix.length).trim();
          if (raw) result[key] = this.separateStatus(raw);
          break;
        }
      }
    });
    
    return result;
  }

  generateLocatorItems(locators) {
    // 完整類型定義（依優先順序）
    const ALL_ITEMS = [
      { type: 'Playwright', icon: '🎭', key: 'playwright' },
      { type: 'CSS', icon: '🎨', key: 'css' },
      { type: 'XPath', icon: '🗂️', key: 'xpath' },
      { type: 'Selenium', icon: '🤖', key: 'selenium' },
      { type: 'Cypress', icon: '🌲', key: 'cypress' },
      { type: 'TestingLibrary', icon: '📚', key: 'testing_library' },
      { type: 'WebdriverIO', icon: '🚀', key: 'webdriverio' },
    ];
    // 僅顯示有資料的類型
    const items = ALL_ITEMS.filter(item => locators[item.key]);

    return items.map((item, index) => {
      const data = locators[item.key];
      const value = data?.value || '未生成';
      const status = data?.status;
      const statusType = data?.statusType;
      const isShadow = value.includes(' >> ');
      const stability = this.scoreLocator(value);
      const stars = '⭐'.repeat(stability.stars) + '☆'.repeat(5 - stability.stars);
      const statusBadge = status
        ? `<span class="locator-status status-${statusType}">${status}</span>`
        : '';
      const shadowBadge = isShadow
        ? `<span class="locator-shadow-badge" title="Shadow DOM — 僅適用於 Playwright">Shadow DOM</span>`
        : '';
      return `
        <div class="locator-item" tabindex="0">
          <div class="locator-header">
            <span class="locator-type">${item.icon} ${item.type}</span>
            <div class="locator-actions">
              <span class="locator-stars" title="${stability.label} (${stability.stars}/5)">${stars}</span>
              <span class="match-count-badge"></span>
              ${shadowBadge}
              ${statusBadge}
              <button class="copy-single-btn" data-index="${index}">
                📋 複製
              </button>
            </div>
          </div>
          <div class="locator-code" data-locator="${index}">
            <code contenteditable="false">${value}</code>
          </div>
        </div>
      `;
    }).join('');
  }

  bindIframeCopyButtons(resultDiv) {
    const iframeLocators = resultDiv.querySelectorAll('.iframe-locator');
    iframeLocators.forEach(locator => {
      locator.addEventListener('click', async () => {
        const value = locator.textContent;
        
        try {
          // 嘗試使用 Clipboard API
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
          } else {
            // 備用方法：創建臨時 textarea
            const textArea = document.createElement('textarea');
            textArea.value = value;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
          
          const originalText = locator.textContent;
          const originalBg = locator.style.backgroundColor;
          
          locator.textContent = '✅ 已複製';
          locator.style.backgroundColor = '#4CAF50';
          locator.style.color = 'white';
          
          setTimeout(() => {
            locator.textContent = originalText;
            locator.style.backgroundColor = originalBg;
            locator.style.color = '';
          }, 2000);
          
        } catch (error) {
          console.error('複製失敗:', error);
          alert(`複製失敗，請手動複製：\n\n${value}`);
        }
      });
    });
  }

  bindCopyButtons(resultDiv) {
    const copyButtons = resultDiv.querySelectorAll('.copy-single-btn');
    const locatorItems = [
      { value: this.currentLocators?.playwright?.value },
      { value: this.currentLocators?.css?.value },
      { value: this.currentLocators?.xpath?.value },
      { value: this.currentLocators?.selenium?.value }
    ];
    
    copyButtons.forEach((button, index) => {
      button.addEventListener('click', async () => {
        const value = locatorItems[index]?.value || '未生成';
        
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
          } else {
            const textArea = document.createElement('textarea');
            textArea.value = value;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
          
          const originalText = button.textContent;
          button.textContent = '✅ 已複製';
          button.style.background = 'var(--cl-success, #7fb88a)';
          button.style.color = 'var(--cl-bg-base, #1e1e22)';
          button.style.borderColor = 'var(--cl-success, #7fb88a)';
          
          setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.style.color = '';
            button.style.borderColor = '';
          }, 2000);
          
        } catch (error) {
          console.error('複製失敗:', error);
          alert(`複製失敗，請手動複製：\n\n${value}`);
        }
      });
    });
  }

  // Hover 回高亮：懸停 locator item 時在頁面高亮所有匹配元素
  bindHoverHighlight(resultDiv) {
    const items = resultDiv.querySelectorAll('.locator-item');
    const allKeys = ['playwright', 'css', 'xpath', 'selenium'];

    items.forEach((item, index) => {
      const key = allKeys[index];
      const locatorValue = this.currentLocators?.[key]?.value;
      if (!locatorValue || locatorValue === '未生成') return;

      let matchHighlights = [];

      item.addEventListener('mouseenter', () => {
        try {
          let matches = [];
          if (key === 'css') {
            matches = Array.from(document.querySelectorAll(locatorValue));
          } else if (key === 'xpath') {
            const result = document.evaluate(locatorValue, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < result.snapshotLength; i++) matches.push(result.snapshotItem(i));
          }
          matches.forEach(el => {
            if (el && el !== this.overlayElement && !resultDiv.contains(el)) {
              matchHighlights.push({ el, outline: el.style.outline, bg: el.style.backgroundColor });
              el.style.outline = '2px dashed #6ca0b8';
              el.style.backgroundColor = 'rgba(108, 160, 184, 0.12)';
            }
          });
          // 顯示匹配數 badge
          const badge = item.querySelector('.match-count-badge');
          if (badge && matches.length > 0) {
            badge.textContent = `${matches.length} match${matches.length > 1 ? 'es' : ''}`;
            badge.style.display = 'inline';
          }
        } catch (_) { /* 無效選擇器 */ }
      });

      item.addEventListener('mouseleave', () => {
        matchHighlights.forEach(({ el, outline, bg }) => {
          el.style.outline = outline;
          el.style.backgroundColor = bg;
        });
        matchHighlights = [];
        const badge = item.querySelector('.match-count-badge');
        if (badge) badge.style.display = 'none';
      });
    });
  }

  // In-place 編輯：點擊 code 進入編輯模式，blur/Enter 重新驗證
  bindInPlaceEdit(resultDiv) {
    const allKeys = ['playwright', 'css', 'xpath', 'selenium'];
    const codeBlocks = resultDiv.querySelectorAll('.locator-code code');

    codeBlocks.forEach((code, index) => {
      const key = allKeys[index];
      code.title = '點擊以編輯';
      code.style.cursor = 'text';

      code.addEventListener('click', () => {
        code.contentEditable = 'true';
        code.focus();
        // 全選
        const range = document.createRange();
        range.selectNodeContents(code);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      });

      const commit = () => {
        code.contentEditable = 'false';
        const newValue = code.textContent.trim();
        if (!this.currentLocators[key]) return;
        this.currentLocators[key].value = newValue;

        // 重新驗證
        let validated = newValue;
        const targetElement = this._lastTargetElement;
        if (targetElement) {
          if (key === 'css') validated = this.validateCSS(newValue, targetElement);
          else if (key === 'xpath') validated = this.validateXPath(newValue, targetElement);
        }
        const separated = this.separateStatus(validated);
        this.currentLocators[key] = separated;
        code.textContent = separated.value;

        // 更新 status badge
        const item = code.closest('.locator-item');
        const badge = item?.querySelector('.locator-status');
        if (badge) {
          badge.textContent = separated.status || '';
          badge.className = `locator-status status-${separated.statusType || ''}`;
        }

        // 更新穩定性星等
        const stars = item?.querySelector('.locator-stars');
        if (stars) {
          const stability = this.scoreLocator(separated.value);
          stars.textContent = '⭐'.repeat(stability.stars) + '☆'.repeat(5 - stability.stars);
          stars.title = `${stability.label} (${stability.stars}/5)`;
        }
      };

      code.addEventListener('blur', commit);
      code.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { code.contentEditable = 'false'; }
      });
    });
  }

  showError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'locator-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <div class="error-header">
          <h3>❌ 錯誤</h3>
          <button class="close-btn">✖</button>
        </div>
        <div class="error-body">
          <p>${error}</p>
        </div>
      </div>
    `;
    
    const closeBtn = errorDiv.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => errorDiv.remove());
    }

    document.body.appendChild(errorDiv);
  }
}

// 初始化並暴露到全域
const elementLocatorGenerator = new ElementLocatorGenerator();
window.elementLocatorGenerator = elementLocatorGenerator;
