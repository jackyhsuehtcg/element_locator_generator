// popup.js - 處理 popup 界面的邏輯

class PopupController {
  constructor() {
    this.enableBtn = document.getElementById('enablePersistentMode');
    this.disableBtn = document.getElementById('disablePersistentMode');
    this.actionStatus = document.getElementById('actionStatus');
    
    this.isPersistentMode = false;
    this.init();
  }

  async init() {
    // 綁定事件
    this.enableBtn.addEventListener('click', () => this.enablePersistentMode());
    this.disableBtn.addEventListener('click', () => this.disablePersistentMode());

    // 檢查持續模式狀態
    await this.checkPersistentModeStatus();
  }

  async checkPersistentModeStatus() {
    try {
      const result = await chrome.storage.sync.get(['persistentModeEnabled']);
      this.isPersistentMode = result.persistentModeEnabled || false;
      this.updateUI();
    } catch (error) {
      console.error('檢查持續模式狀態失敗:', error);
    }
  }

  async enablePersistentMode() {
    try {
      await chrome.storage.sync.set({ persistentModeEnabled: true });
      
      // 通知 background script 啟動持續模式
      const response = await chrome.runtime.sendMessage({
        action: 'enablePersistentMode'
      });

      if (response && response.success) {
        this.isPersistentMode = true;
        this.updateUI();
        this.showActionStatus('持續模式已啟動', 'success');
        
        // 2秒後關閉 popup
        setTimeout(() => window.close(), 2000);
      } else {
        this.showActionStatus('啟動失敗', 'error');
      }
    } catch (error) {
      console.error('啟動持續模式失敗:', error);
      this.showActionStatus('啟動失敗', 'error');
    }
  }

  async disablePersistentMode() {
    try {
      await chrome.storage.sync.set({ persistentModeEnabled: false });
      
      // 通知 background script 停用持續模式
      const response = await chrome.runtime.sendMessage({
        action: 'disablePersistentMode'
      });

      if (response && response.success) {
        this.isPersistentMode = false;
        this.updateUI();
        this.showActionStatus('持續模式已停用', 'warning');
      } else {
        this.showActionStatus('停用失敗', 'error');
      }
    } catch (error) {
      console.error('停用持續模式失敗:', error);
      this.showActionStatus('停用失敗', 'error');
    }
  }

  updateUI() {
    if (this.isPersistentMode) {
      this.enableBtn.classList.add('hide');
      this.disableBtn.classList.remove('hide');
    } else {
      this.enableBtn.classList.remove('hide');
      this.disableBtn.classList.add('hide');
    }
  }

  showActionStatus(message, type) {
    this.actionStatus.className = `status status-${type}`;
    this.actionStatus.textContent = message;
    this.actionStatus.classList.remove('hide');

    setTimeout(() => {
      this.actionStatus.classList.add('hide');
    }, 5000);
  }
}

// 當 DOM 載入完成時初始化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});