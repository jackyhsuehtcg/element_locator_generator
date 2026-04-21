// content.js - 處理網頁上的元素點擊和數據收集

class ElementLocatorGenerator {
  constructor() {
    this.isActive = false;
    this.overlayElement = null;
    this.currentHighlightedElement = null;
    this.isMainFrame = (window === window.top);
    this.init();
  }

  init() {
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
        this.startElementSelection();
      } else if (event.data.type === 'ELEMENT_LOCATOR_STOP') {
        this.stopElementSelection();
      } else if (event.data.type === 'ELEMENT_LOCATOR_STOP_REQUEST' && this.isMainFrame) {
        // 處理來自 iframe 的停止請求
        this.stopElementSelection();
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
      } else if (event.data.type === 'ELEMENT_SELECTED' && this.isMainFrame) {
        // 處理來自 iframe 的元素選擇
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
        this.stopElementSelection();
        
        // 為來自 iframe 的數據添加標記
        const iframeData = { ...event.data.data, fromIframe: true };
        this.sendToGemini(iframeData);
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
    // 遍歷所有 iframe 並發送消息
    const frames = document.querySelectorAll('iframe');
    frames.forEach((frame, index) => {
      try {
        // 等待 iframe 載入完成
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
          frame.contentWindow.postMessage({
            type: action
          }, '*');
        } else {
          // 如果未載入完成，等待後重試
          setTimeout(() => {
            try {
              frame.contentWindow.postMessage({
                type: action
              }, '*');
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
    const target = event.target;
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

    const target = event.target;
    if (target === this.overlayElement || this.overlayElement?.contains(target)) return;
    if (target.id?.startsWith('locator-')) return;

    const elementData = this.extractElementData(target);
    this.stopElementSelection();
    this.sendToGemini(elementData);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.stopElementSelection();
      if (this.isMainFrame) {
        this.broadcastToFrames('ELEMENT_LOCATOR_STOP');
      }
    }
  }

  highlightElement(element) {
    this.clearHighlight();
    this.currentHighlightedElement = element;
    element.style.outline = '3px solid #e8926c';
    element.style.outlineOffset = '2px';
    element.style.backgroundColor = 'rgba(232, 146, 108, 0.1)';
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
      className: element.className || null,
      name: element.name || null,
      
      // 文本內容
      text: element.textContent?.trim().substring(0, 100) || null,
      innerText: element.innerText?.trim().substring(0, 100) || null,
      placeholder: element.placeholder || null,
      value: element.value || null,
      
      // 屬性
      attributes: this.getRelevantAttributes(element),
      
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
        className: element.parentElement?.className || null,
        id: element.parentElement?.id || null
      },
      
      // 兄弟元素
      siblings: this.getSiblingsInfo(element),
      
      // 子元素
      children: element.children.length,
      
      // XPath 和 CSS Selector
      xpath: this.generateXPath(element),
      cssSelector: this.generateCSSSelector(element),
      
      // 頁面信息
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    };
  }

  getRelevantAttributes(element) {
    const relevantAttrs = [
      'type', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
      'data-testid', 'data-test', 'data-cy', 'data-automation',
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

  generateXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    let path = '';
    let currentElement = element;
    
    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      let selector = currentElement.nodeName.toLowerCase();
      
      if (currentElement.id) {
        selector += `[@id="${currentElement.id}"]`;
        path = '//' + selector + path;
        break;
      } else {
        const siblings = Array.from(currentElement.parentNode?.children || []);
        const sameTagSiblings = siblings.filter(el => el.nodeName === currentElement.nodeName);
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(currentElement) + 1;
          selector += `[${index}]`;
        }
        
        path = '/' + selector + path;
      }
      
      currentElement = currentElement.parentNode;
    }
    
    return path;
  }

  generateCSSSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    let path = [];
    let currentElement = element;
    
    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
      let selector = currentElement.nodeName.toLowerCase();
      
      if (currentElement.id) {
        selector += `#${currentElement.id}`;
        path.unshift(selector);
        break;
      } else if (currentElement.className) {
        selector += '.' + currentElement.className.trim().split(/\s+/).join('.');
      }
      
      const parent = currentElement.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children);
        const sameTagSiblings = siblings.filter(el => el.nodeName === currentElement.nodeName);
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(currentElement) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      currentElement = parent;
      
      if (path.length > 5) break; // 限制深度
    }
    
    return path.join(' > ');
  }

  async sendToGemini(elementData) {
    // 如果在 iframe 中，將數據傳送到主框架處理
    if (!this.isMainFrame) {
      // 移除無法序列化的 originalElement 引用
      const serializableData = { ...elementData };
      delete serializableData.originalElement;
      
      // 添加 iframe 信息
      serializableData.iframeInfo = this.getIframeInfo();
      
      window.top.postMessage({
        type: 'ELEMENT_SELECTED',
        data: serializableData,
        sourceFrame: 'iframe' // 標記來源
      }, '*');
      return;
    }

    // 顯示等待動畫
    this.showLoading();
    
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
        if (elementData.originalElement) {
          // 主框架元素：完整驗證
          validatedLocators = this.validateAndOptimizeLocators(response.locators, elementData);
        } else if (elementData.fromIframe) {
          // iframe 元素：基礎驗證
          const iframeResult = this.validateIframeLocators(response.locators, elementData);
          this.showResult(iframeResult.locators, iframeResult);
          return;
        }
        this.showResult(validatedLocators);
      } else {
        this.showError(response.error);
      }
    } catch (error) {
      console.error('Error sending to Gemini:', error);
      this.hideLoading();
      this.showError('發送數據時發生錯誤');
    }
  }

  validateAndOptimizeLocators(locators, elementData) {
    const lines = locators.split('\n');
    const result = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('Playwright:')) {
        result.push(trimmed); // Playwright 語法較複雜，先保留原樣
      } else if (trimmed.startsWith('CSS:')) {
        const cssSelector = trimmed.replace('CSS:', '').trim();
        const validatedCSS = this.validateCSS(cssSelector, elementData.originalElement);
        result.push(`CSS: ${validatedCSS}`);
      } else if (trimmed.startsWith('XPath:')) {
        const xpath = trimmed.replace('XPath:', '').trim();
        const validatedXPath = this.validateXPath(xpath, elementData.originalElement);
        result.push(`XPath: ${validatedXPath}`);
      } else if (trimmed.startsWith('Selenium:')) {
        result.push(trimmed); // Selenium 語法較複雜，先保留原樣
      }
    });
    
    return result.join('\n');
  }

  validateCSS(selector, targetElement) {
    try {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        return `${selector} ❌ (無匹配元素)`;
      } else if (elements.length === 1) {
        return `${selector} ✅ (唯一匹配)`;
      } else {
        // 找到目標元素在匹配列表中的索引
        const targetIndex = Array.from(elements).indexOf(targetElement);
        if (targetIndex >= 0) {
          // 使用更精確的索引選擇器
          return `${selector}:nth-of-type(${targetIndex + 1}) ⚠️ (${elements.length}個匹配，已加索引)`;
        } else {
          return `${selector} ❌ (匹配${elements.length}個元素但不包含目標)`;
        }
      }
    } catch (error) {
      return `${selector} ❌ (無效選擇器)`;
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
        return `${xpath} ❌ (無匹配元素)`;
      } else if (elements.length === 1) {
        return `${xpath} ✅ (唯一匹配)`;
      } else {
        // 找到目標元素在匹配列表中的索引
        const targetIndex = elements.indexOf(targetElement);
        if (targetIndex >= 0) {
          return `(${xpath})[${targetIndex + 1}] ⚠️ (${elements.length}個匹配，已加索引)`;
        } else {
          return `${xpath} ❌ (匹配${elements.length}個元素但不包含目標)`;
        }
      }
    } catch (error) {
      return `${xpath} ❌ (無效XPath)`;
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
      iframeInfo: elementData.iframeInfo || null
    };
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
    
    // 創建結果顯示界面
    const resultDiv = document.createElement('div');
    resultDiv.id = 'locator-result';
    resultDiv.innerHTML = `
      <div class="result-content">
        <div class="result-header">
          <h3>${title}</h3>
          <button class="close-btn">✖</button>
        </div>
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

    // 綁定複製按鈕事件
    this.bindCopyButtons(resultDiv);
    
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
    
    lines.forEach(line => {
      const trimmed = line.trim();
      let key = null;
      let raw = null;
      if (trimmed.startsWith('Playwright:')) { key = 'playwright'; raw = trimmed.replace('Playwright:', '').trim(); }
      else if (trimmed.startsWith('CSS:')) { key = 'css'; raw = trimmed.replace('CSS:', '').trim(); }
      else if (trimmed.startsWith('XPath:')) { key = 'xpath'; raw = trimmed.replace('XPath:', '').trim(); }
      else if (trimmed.startsWith('Selenium:')) { key = 'selenium'; raw = trimmed.replace('Selenium:', '').trim(); }
      if (key && raw) {
        result[key] = this.separateStatus(raw);
      }
    });
    
    return result;
  }

  generateLocatorItems(locators) {
    const items = [
      { type: 'Playwright', icon: '🎭', data: locators.playwright },
      { type: 'CSS', icon: '🎨', data: locators.css },
      { type: 'XPath', icon: '🗂️', data: locators.xpath },
      { type: 'Selenium', icon: '🤖', data: locators.selenium }
    ];

    return items.map((item, index) => {
      const value = item.data?.value || '未生成';
      const status = item.data?.status;
      const statusType = item.data?.statusType;
      const statusBadge = status
        ? `<span class="locator-status status-${statusType}">${status}</span>`
        : '';
      return `
        <div class="locator-item">
          <div class="locator-header">
            <span class="locator-type">${item.icon} ${item.type}</span>
            <div class="locator-actions">
              ${statusBadge}
              <button class="copy-single-btn" data-index="${index}">
                📋 複製
              </button>
            </div>
          </div>
          <div class="locator-code">
            <code>${value}</code>
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