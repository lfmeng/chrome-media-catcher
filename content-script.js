// 🔥 页面翻译助手 - 支持多行逐行翻译

(function() {
  'use strict';

  console.log('🌐 翻译助手已加载');

  let translateButton = null;
  let isTranslating = false;

  // 🔥 翻译API配置
  const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

  // 🔥 本地翻译配置（不调用API）
  const USE_LOCAL_TRANSLATION = true; // 默认使用本地翻译

  /**
   * 等待DOM加载完成
   */
  function init() {
    console.log('🚀 开始初始化，当前页面:', window.location.href);

    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createTranslateButton);
    } else {
      createTranslateButton();
    }

    // 监听选中文本变化
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);
  }

  /**
   * 创建翻译按钮
   */
  function createTranslateButton() {
    // 防止重复创建
    if (translateButton) {
      console.log('⚠️ 翻译按钮已存在');
      return;
    }

    console.log('🎨 开始创建翻译按钮');

    translateButton = document.createElement('div');
    translateButton.id = 'chrome-translator-button';
    translateButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
        <path d="M4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2z"/>
      </svg>
      翻译
    `;

    // 设置样式
    Object.assign(translateButton.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      zIndex: '2147483647',
      background: '#667eea',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      display: 'none',
      alignItems: 'center',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
      transition: 'all 0.2s',
      userSelect: 'none'
    });

    // 悬停效果
    translateButton.addEventListener('mouseenter', () => {
      translateButton.style.background = '#5568d3';
      translateButton.style.transform = 'translateY(-2px)';
    });

    translateButton.addEventListener('mouseleave', () => {
      translateButton.style.background = '#667eea';
      translateButton.style.transform = 'translateY(0)';
    });

    // 点击事件
    translateButton.addEventListener('click', handleTranslateClick);

    document.body.appendChild(translateButton);

    console.log('✅ 固定翻译按钮已创建');
  }

  /**
   * 处理文本选择
   */
  function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      translateButton.style.display = 'none';
      console.log('🚫 没有选中文本，隐藏按钮');
      return;
    }

    console.log('📝 选中文本:', selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : ''));
    console.log('📍 翻译状态:', isTranslating ? '翻译中' : '空闲');

    // 如果正在翻译，不显示按钮
    if (isTranslating) {
      console.log('⚠️ 正在翻译中，不显示按钮');
      return;
    }

    // 显示按钮在选中文本附近
    showButtonNearSelection(selection);
  }

  /**
   * 在选中文本附近显示按钮
   */
  function showButtonNearSelection(selection) {
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    console.log('🎯 选中文本位置:', {
      top: rect.top,
      right: rect.right,
      width: rect.width,
      height: rect.height
    });

    // 计算按钮位置（选中文本的右侧）
    let buttonTop = rect.top + window.scrollY - 50;
    let buttonRight = window.innerWidth - rect.right - 20;

    // 确保按钮在视口内
    if (buttonTop < 10) buttonTop = 10;
    if (buttonRight < 10) buttonRight = 10;
    if (buttonTop > window.innerHeight - 50) buttonTop = window.innerHeight - 50;

    console.log('📍 按钮位置:', { top: buttonTop, right: buttonRight });

    translateButton.style.top = buttonTop + 'px';
    translateButton.style.right = buttonRight + 'px';
    translateButton.style.display = 'flex';

    console.log('✅ 翻译按钮已显示');
  }

  /**
   * 处理翻译按钮点击
   */
  async function handleTranslateClick() {
    if (isTranslating) {
      console.log('⚠️ 正在翻译中，请稍候');
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      console.log('⚠️ 没有选中文本');
      return;
    }

    console.log('🌍 开始翻译...');
    console.log('📝 选中文本:', selectedText);

    isTranslating = true;
    translateButton.innerHTML = '翻译中...';

    try {
      // 🔥 检查是否为多行文本
      const lines = selectedText.split('\n').filter(line => line.trim());
      const isMultiLine = lines.length > 1;

      console.log('📊 检测到' + lines.length + '行文本');
      console.log('📊 是否多行:', isMultiLine);

      if (isMultiLine) {
        // 多行翻译：逐行翻译并在每行后插入
        await translateMultipleLines(lines, selection);
      } else {
        // 单行翻译：原有的翻译逻辑
        await translateSingleLine(selectedText, selection);
      }

      console.log('✨ 翻译完成');

      // 🔥 翻译完成后清除选择，让用户可以重新选中文本
      try {
        selection.removeAllRanges();
        console.log('✅ 选择已清除');
      } catch (e) {
        console.warn('清除选择失败（可能已被修改）:', e);
      }

      // 🔥 隐藏翻译按钮
      translateButton.style.display = 'none';
      console.log('✅ 翻译按钮已隐藏');

    } catch (error) {
      console.error('❌ 翻译失败:', error);
      alert('翻译失败: ' + error.message);

      // 🔥 失败时也清除选择
      try {
        selection.removeAllRanges();
      } catch (e) {
        console.warn('清除选择失败:', e);
      }
    } finally {
      // 🔥 延迟重置状态，确保DOM操作完成
      setTimeout(() => {
        isTranslating = false;
        translateButton.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
            <path d="M4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5v-7A2.5 2.5 0 0 1 4.5 2z"/>
          </svg>
          翻译
        `;
        console.log('✅ 翻译状态已重置');
      }, 100);
    }
  }

  /**
   * 🔥 多行翻译：在每一行后插入对应的翻译
   */
  async function translateMultipleLines(lines, selection) {
    console.log('🎯 开始多行逐行翻译，共', lines.length, '行');

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;

    // 保存原始选择范围
    const originalRange = range.cloneRange();

    // 🔥 获取选中文本的所有文本节点
    const textNodes = getTextNodesInRange(range);

    console.log('🔍 找到', textNodes.length, '个文本节点');

    if (textNodes.length === 0) {
      console.warn('⚠️ 未找到文本节点，使用单行翻译');
      await translateSingleLine(lines.join('\n'), selection);
      return;
    }

    // 🔥 为每一行翻译并插入
    let translatedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        console.log(`📝 翻译第 ${i + 1}/${lines.length} 行:`, line.substring(0, 30));

        // 调用翻译API
        const translated = await callTranslateAPI(line, 'auto', 'zh');

        // 🔥 找到对应行的文本节点并插入翻译
        if (textNodes[i]) {
          insertTranslationAfterNode(textNodes[i], translated);
          translatedCount++;
        }

        // 🔥 延迟设置（只在API翻译时需要）
        // 本地翻译速度快，不需要延迟
        // 如果使用API，可以添加延迟避免限流
        const NEED_DELAY = !USE_LOCAL_TRANSLATION; // 本地翻译不需要延迟
        const DELAY_MS = NEED_DELAY ? 100 : 0; // 本地翻译为0延迟

        // 延迟，避免API请求过快（仅API翻译需要）
        if (NEED_DELAY && i < lines.length - 1) {
          await sleep(DELAY_MS);
        }

      } catch (error) {
        console.error(`❌ 第 ${i + 1} 行翻译失败:`, error);
      }
    }

    console.log('✅ 多行翻译完成，成功翻译', translatedCount, '行');
  }

  /**
   * 获取选择范围内的所有文本节点
   */
  function getTextNodesInRange(range) {
    const nodes = [];
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // 如果选择的是文本节点
    if (startContainer.nodeType === Node.TEXT_NODE) {
      nodes.push(startContainer);
    }

    // 遍历选择范围内的所有节点
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 检查节点是否在选择范围内
          if (range.intersectsNode(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      if (node !== startContainer && !nodes.includes(node)) {
        nodes.push(node);
      }
    }

    console.log('🔍 找到的文本节点:', nodes.map(n => n.textContent.substring(0, 20)));

    return nodes;
  }

  /**
   * 在节点后插入翻译结果
   */
  function insertTranslationAfterNode(textNode, translation) {
    // 🔥 创建块级元素，确保翻译换行显示
    const translationDiv = document.createElement('div');
    translationDiv.className = 'chrome-translator-result';
    translationDiv.textContent = translation;

    // 🔥 设置为块级元素，独占一行
    translationDiv.style.cssText = `
      display: block;
      color: #667eea;
      font-weight: 500;
      background: #f0f4ff;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 0.95em;
      line-height: 1.6;
      border-left: 3px solid #667eea;
    `;

    console.log('📍 插入位置节点类型:', textNode.nodeType);
    console.log('📍 插入位置:', textNode.textContent.substring(0, 50));

    // 插入翻译
    if (textNode.nextSibling) {
      textNode.parentNode.insertBefore(translationDiv, textNode.nextSibling);
    } else {
      textNode.parentNode.appendChild(translationDiv);
    }

    console.log('✅ 翻译已插入');
    console.log('📍 翻译元素位置:', translationDiv.getBoundingClientRect());
    console.log('🔍 验证：翻译元素是否在DOM中:', document.body.contains(translationDiv));
    console.log('🔍 翻译元素样式:', getComputedStyle(translationDiv).cssText);
  }

  /**
   * 单行翻译（原有逻辑）
   */
  async function translateSingleLine(text, selection) {
    console.log('📝 单行翻译');

    const translated = await callTranslateAPI(text, 'auto', 'zh');
    console.log('✨ 翻译结果:', translated);

    // 在选择后插入翻译
    insertTranslationAfterSelection(selection, translated);
  }

  /**
   * 在选择后插入翻译
   */
  function insertTranslationAfterSelection(selection, translation) {
    const range = selection.getRangeAt(0);

    // 🔥 创建块级元素，确保翻译换行显示
    const translationDiv = document.createElement('div');
    translationDiv.className = 'chrome-translator-result';
    translationDiv.textContent = translation;

    translationDiv.style.cssText = `
      display: block;
      color: #667eea;
      font-weight: 500;
      background: #f0f4ff;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 0.95em;
      line-height: 1.6;
      border-left: 3px solid #667eea;
    `;

    range.collapse(false);
    range.insertNode(translationDiv);

    console.log('✅ 翻译已插入页面');
    console.log('📍 翻译元素位置:', translationDiv.getBoundingClientRect());
  }

  /**
   * 调用翻译API
   * @param {string} text - 要翻译的文本
   * @param {string} sourceLang - 源语言
   * @param {string} targetLang - 目标语言
   */
  async function callTranslateAPI(text, sourceLang, targetLang) {
    // 🔥 优先使用本地翻译（更快，无需API）
    if (USE_LOCAL_TRANSLATION) {
      try {
        console.log('🌐 使用本地翻译...');
        return await translateLocally(text, sourceLang, targetLang);
      } catch (error) {
        console.warn('⚠️ 本地翻译失败，降级到API:', error);
        // 降级到API翻译
      }
    }

    // 使用在线API
    const langPair = sourceLang === 'auto'
      ? `autodetect|${targetLang}`
      : `${sourceLang}|${targetLang}`;

    const url = `${TRANSLATE_API}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error(data.responseDetails || '翻译失败');
    }
  }

  /**
   * 🔥 本地翻译（不调用API）
   * 使用Google翻译的免费接口，无需API key
   */
  async function translateLocally(text, sourceLang, targetLang) {
    // 使用Google翻译的免费接口
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('本地翻译请求失败');
    }

    const data = await response.json();

    // Google翻译返回的格式：[[["译文","原文",...,...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }

    throw new Error('翻译结果解析失败');
  }

  /**
   * 延迟函数
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 启动
  init();

})();
