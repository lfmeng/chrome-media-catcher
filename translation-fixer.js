// 🔥 浏览器翻译框修复工具
class TranslationFixer {
  constructor() {
    this.fixTranslationUI();
    this.observeTranslationChanges();
  }

  // 🔥 修复翻译框的显示问题
  fixTranslationUI() {
    // 等待翻译元素加载
    setTimeout(() => {
      this.repositionTranslationTooltip();
      this.makeTranslationDraggable();
    }, 500);

    // 定期检查（因为翻译是异步加载的）
    setInterval(() => {
      this.repositionTranslationTooltip();
    }, 2000);
  }

  // 🔥 重新定位翻译提示框到屏幕中心
  repositionTranslationTooltip() {
    // Google 翻译提示框
    const balloons = document.querySelectorAll('.goog-te-balloon-frame, .goog-te-gadget');
    balloons.forEach(balloon => {
      if (balloon.style.position !== 'fixed') {
        balloon.style.position = 'fixed !important';
        balloon.style.top = '50% !important';
        balloon.style.left = '50% !important';
        balloon.style.transform = 'translate(-50%, -50%) !important';
        balloon.style.zIndex = '999999 !important';
        balloon.style.maxWidth = '90vw';
        balloon.style.maxHeight = '90vh';
        balloon.style.overflow = 'auto';
      }
    });

    // 翻译结果 tooltip
    const tooltips = document.querySelectorAll('.goog-tooltip');
    tooltips.forEach(tooltip => {
      tooltip.style.position = 'fixed !important';
      tooltip.style.top = '50% !important';
      tooltip.style.left = '50% !important';
      tooltip.style.transform = 'translate(-50%, -50%) !important';
      tooltip.style.zIndex = '999999 !important';
    });
  }

  // 🔥 使翻译框可拖拽
  makeTranslationDraggable() {
    const balloons = document.querySelectorAll('.goog-te-balloon-frame');

    balloons.forEach(balloon => {
      // 添加拖拽功能
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;

      balloon.addEventListener('mousedown', dragStart);
      document.addEventListener('mouseup', dragEnd);
      document.addEventListener('mousemove', drag);

      function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === balloon || balloon.contains(e.target)) {
          isDragging = true;
        }
      }

      function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
      }

      function drag(e) {
        if (isDragging) {
          e.preventDefault();
          currentX = e.clientX - initialX;
          currentY = e.clientY - initialY;

          xOffset = currentX;
          yOffset = currentY;

          setTranslate(currentX, currentY, balloon);
        }
      }

      function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(calc(-50% + ${xPos}px), calc(-50% + ${yPos}px))`;
      }
    });
  }

  // 🔥 监听 DOM 变化，自动修复新出现的翻译元素
  observeTranslationChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // 检查是否是翻译相关的元素
            if (node.classList.contains('goog-te-balloon-frame') ||
                node.classList.contains('goog-te-gadget') ||
                node.classList.contains('goog-tooltip')) {
              this.repositionTranslationTooltip();
              this.makeTranslationDraggable();
            }

            // 检查子元素
            const translateElements = node.querySelectorAll('.goog-te-balloon-frame, .goog-te-gadget, .goog-tooltip');
            if (translateElements.length > 0) {
              this.repositionTranslationTooltip();
              this.makeTranslationDraggable();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 🔥 修复翻译结果显示位置
  fixTranslationDisplay() {
    // 这个功能需要配合 content script 使用
    // 因为翻译结果通常会显示在原文字下方
    // 但在 popup 中，我们将其居中显示
    console.log('🌐 翻译框修复已启用');
  }
}

// 导出到全局
window.TranslationFixer = TranslationFixer;
