// 🔥 翻译工具类
class Translator {
  constructor() {
    this.apiEndpoint = 'https://api.mymemory.translated.net/get';
  }

  /**
   * 翻译单行文本
   * @param {string} text - 要翻译的文本
   * @param {string} sourceLang - 源语言代码
   * @param {string} targetLang - 目标语言代码
   * @returns {Promise<string>} 翻译结果
   */
  async translate(text, sourceLang, targetLang) {
    if (!text || !text.trim()) {
      return '';
    }

    // 处理自动检测语言
    const langPair = sourceLang === 'auto'
      ? `${sourceLang}|${targetLang}`
      : `${sourceLang}|${targetLang}`;

    try {
      const url = `${this.apiEndpoint}?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.responseStatus === 200) {
        return data.responseData.translatedText;
      } else {
        console.error('翻译失败:', data);
        throw new Error(data.responseDetails || '翻译失败');
      }
    } catch (error) {
      console.error('翻译API调用失败:', error);
      throw error;
    }
  }

  /**
   * 逐行翻译多行文本
   * @param {string[]} lines - 文本行数组
   * @param {string} sourceLang - 源语言代码
   * @param {string} targetLang - 目标语言代码
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<string[]>} 翻译结果数组
   */
  async translateLines(lines, sourceLang, targetLang, onProgress) {
    const results = [];
    const total = lines.length;

    for (let i = 0; i < total; i++) {
      const line = lines[i];

      // 跳过空行
      if (!line || !line.trim()) {
        results.push('');
        continue;
      }

      try {
        const translated = await this.translate(line, sourceLang, targetLang);
        results.push(translated);

        // 调用进度回调
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            percent: Math.round(((i + 1) / total) * 100)
          });
        }

        // 添加延迟，避免API请求过快
        if (i < total - 1) {
          await this.delay(300);
        }
      } catch (error) {
        console.error(`翻译第 ${i + 1} 行失败:`, error);
        results.push(`[翻译失败: ${line}]`);
      }
    }

    return results;
  }

  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检测文本语言（简化版，基于字符检测）
   * @param {string} text - 要检测的文本
   * @returns {string} 语言代码
   */
  detectLanguage(text) {
    // 简单的字符检测
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanRegex = /[\uac00-\ud7af]/;
    const russianRegex = /[\u0400-\u04FF]/;
    const germanRegex = /[äöüßÄÖÜ]/;
    const frenchRegex = /[àâäéèêëïîôùûüÿñçÀÂÄÉÈÊËÏÎÔÙÛÜŸÑÇ]/;

    if (chineseRegex.test(text)) return 'zh';
    if (japaneseRegex.test(text)) return 'ja';
    if (koreanRegex.test(text)) return 'ko';
    if (russianRegex.test(text)) return 'ru';
    if (germanRegex.test(text)) return 'de';
    if (frenchRegex.test(text)) return 'fr';

    // 默认为英语
    return 'en';
  }
}

// 导出到全局
window.Translator = Translator;
