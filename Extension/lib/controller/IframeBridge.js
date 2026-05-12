// lib/controller/IframeBridge.js — 跨 frame 通訊

export class IframeBridge {
  broadcastToFrames(action) {
    const frames = document.querySelectorAll('iframe')
    frames.forEach((frame, index) => {
      try {
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
          frame.contentWindow.postMessage({ type: action }, '*')
        } else {
          setTimeout(() => {
            try {
              frame.contentWindow.postMessage({ type: action }, '*')
            } catch (e) {
              console.debug(`無法向 iframe ${index} 發送消息:`, e)
            }
          }, 200 * (index + 1))
        }
      } catch (error) {
        console.debug(`無法向 iframe ${index} 發送消息:`, error)
      }
    })
  }
}
