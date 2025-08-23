import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Header
      "title": "Local PDF Tools",
      "subtitle": "Compress, merge, and split PDF files locally in your browser using {{link}}. No uploads required - everything stays on your device.",
      "ghostscriptLink": "Ghostscript WebAssembly",
      
      // Tabs
      "compress": "Compress",
      "merge": "Merge", 
      "split": "Split",
      
      // Tab descriptions
      "compressDesc": "Reduce PDF file size while maintaining quality.",
      "mergeDesc": "Combine multiple PDF files into a single document.",
      "splitDesc": "Extract specific page ranges from a PDF document.",
      
      // File input
      "chooseFiles": "Choose PDF file{{count}} to {{operation}}",
      "filesSelected": "{{count}} file{{count}} selected",
      "clearAll": "Clear All",
      "addMoreFiles": "Add more files",
      "removeFile": "Remove file",
      
      // Settings
      "pdfQualitySetting": "PDF Quality Setting:",
      "pageRange": "Page Range:",
      "startPage": "Start page",
      "endPage": "End page",
      "to": "to",
      "showTerminalOutput": "Show terminal output",
      "showProgressBar": "Show progress bar", 
      "useAdvancedSettings": "Use advanced settings",
      "useCustomCommand": "Use custom Ghostscript command",
      "customCommand": "Custom Command:",
      "customCommandPlaceholder": "e.g., -sDEVICE=pdfwrite -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf",
      "customCommandHelp": "Enter full Ghostscript command arguments. Required: -sDEVICE= and -sOutputFile=",
      
      // PDF Settings
      "screenOptimized": "Screen-optimized (smallest)",
      "ebook": "eBook (small)",
      "printer": "Printer (balanced)", 
      "prepress": "Prepress (high quality)",
      "default": "Default (original quality)",
      
      // Advanced Settings
      "advancedPdfSettings": "Advanced PDF Settings",
      "essentialSettings": "Essential Settings",
      "pdfCompatibilityLevel": "PDF Compatibility Level:",
      "downsampleImages": "Downsample color images",
      "colorImageResolution": "Color Image Resolution (DPI):",
      
      // Buttons
      "compressPdf": "Compress PDF",
      "mergePdfs": "Merge PDFs", 
      "splitPdf": "Split PDF",
      "processAgain": "Process Again",
      "chooseNewFiles": "Choose New Files",
      "tryAgain": "Try Again",
      "download": "Download {{filename}}",
      
      // Processing states
      "processing": "Processing your PDF{{count}}...",
      "processingProgress": "Processing Progress",
      "terminalOutput": "Terminal Output",
      "liveOutput": "Live Output", 
      "initializing": "Initializing...",
      "processingPage": "Processing page {{page}}...",
      "pageOf": "Page {{current}} of {{total}}",
      "percentComplete": "{{percent}}% Complete",
      "pagesProgress": "{{current}}/{{total}} pages",
      
      // Error messages
      "errorOccurred": "An error occurred while processing your PDF:",
      "selectAtLeastTwoFiles": "Please select at least 2 PDF files to merge.",
      "specifyPageRange": "Please specify page range for splitting.",
      "validPageNumbers": "Please enter valid page numbers. End page must be greater than or equal to start page.",
      "enterCustomCommand": "Please enter a custom command or disable custom command mode.",
      "customCommandRequired": "Custom command must include -sDEVICE= and -sOutputFile= parameters.",
      
      // Features section
      "features": "Features",
      "compressFeature": "Reduce file size with quality presets or custom settings",
      "mergeFeature": "Combine multiple PDFs into one document", 
      "splitFeature": "Extract specific page ranges from a PDF",
      "customCommandsFeature": "Use advanced Ghostscript commands for power users",
      "terminalOutputFeature": "View real-time Ghostscript console output during processing",
      "progressBarFeature": "Visual progress tracking with page-by-page processing status",
      
      // Privacy section
      "privacySecurity": "Privacy & Security:",
      "privacyText": "All processing happens locally in your browser. No files are uploaded to any server.",
      "viewSourceCode": "View source code on GitHub",
      
      // Footer
      "copyright": "© {{year}} Local PDF Tools. Code licensed under AGPLv3.",
      "sponsor": "Sponsor",
      
      // Language
      "language": "Language",
      "english": "English", 
      "chinese": "简体中文"
    }
  },
  zh: {
    translation: {
      // Header
      "title": "本地 PDF 工具",
      "subtitle": "使用 {{link}} 在浏览器中本地压缩、合并和拆分 PDF 文件。无需上传 - 一切都保留在您的设备上。",
      "ghostscriptLink": "Ghostscript WebAssembly",
      
      // Tabs
      "compress": "压缩",
      "merge": "合并",
      "split": "拆分",
      
      // Tab descriptions  
      "compressDesc": "在保持质量的同时减小 PDF 文件大小。",
      "mergeDesc": "将多个 PDF 文件合并为单个文档。",
      "splitDesc": "从 PDF 文档中提取特定页面范围。",
      
      // File input
      "chooseFiles": "选择要{{operation}}的 PDF 文件{{count}}",
      "filesSelected": "已选择 {{count}} 个文件{{count}}",
      "clearAll": "清除全部",
      "addMoreFiles": "添加更多文件",
      "removeFile": "移除文件",
      
      // Settings
      "pdfQualitySetting": "PDF 质量设置：",
      "pageRange": "页面范围：",
      "startPage": "起始页",
      "endPage": "结束页", 
      "to": "到",
      "showTerminalOutput": "显示终端输出",
      "showProgressBar": "显示进度条",
      "useAdvancedSettings": "使用高级设置",
      "useCustomCommand": "使用自定义 Ghostscript 命令",
      "customCommand": "自定义命令：",
      "customCommandPlaceholder": "例如：-sDEVICE=pdfwrite -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf",
      "customCommandHelp": "输入完整的 Ghostscript 命令参数。必需：-sDEVICE= 和 -sOutputFile=",
      
      // PDF Settings
      "screenOptimized": "屏幕优化（最小）",
      "ebook": "电子书（小）",
      "printer": "打印机（平衡）",
      "prepress": "印前（高质量）", 
      "default": "默认（原始质量）",
      
      // Advanced Settings
      "advancedPdfSettings": "高级 PDF 设置",
      "essentialSettings": "基本设置",
      "pdfCompatibilityLevel": "PDF 兼容性级别：",
      "downsampleImages": "降采样彩色图像",
      "colorImageResolution": "彩色图像分辨率（DPI）：",
      
      // Buttons
      "compressPdf": "压缩 PDF",
      "mergePdfs": "合并 PDFs",
      "splitPdf": "拆分 PDF", 
      "processAgain": "重新处理",
      "chooseNewFiles": "选择新文件",
      "tryAgain": "重试",
      "download": "下载 {{filename}}",
      
      // Processing states
      "processing": "正在处理您的 PDF{{count}}...",
      "processingProgress": "处理进度",
      "terminalOutput": "终端输出",
      "liveOutput": "实时输出",
      "initializing": "正在初始化...",
      "processingPage": "正在处理第 {{page}} 页...",
      "pageOf": "第 {{current}} 页，共 {{total}} 页",
      "percentComplete": "{{percent}}% 完成",
      "pagesProgress": "{{current}}/{{total}} 页",
      
      // Error messages
      "errorOccurred": "处理您的 PDF 时发生错误：",
      "selectAtLeastTwoFiles": "请至少选择 2 个 PDF 文件进行合并。",
      "specifyPageRange": "请指定拆分的页面范围。",
      "validPageNumbers": "请输入有效的页码。结束页必须大于或等于起始页。",
      "enterCustomCommand": "请输入自定义命令或禁用自定义命令模式。",
      "customCommandRequired": "自定义命令必须包含 -sDEVICE= 和 -sOutputFile= 参数。",
      
      // Features section
      "features": "功能",
      "compressFeature": "使用质量预设或自定义设置减小文件大小",
      "mergeFeature": "将多个 PDF 合并为一个文档",
      "splitFeature": "从 PDF 中提取特定页面范围", 
      "customCommandsFeature": "为高级用户提供高级 Ghostscript 命令",
      "terminalOutputFeature": "在处理过程中查看实时 Ghostscript 控制台输出",
      "progressBarFeature": "带有逐页处理状态的可视化进度跟踪",
      
      // Privacy section
      "privacySecurity": "隐私与安全：",
      "privacyText": "所有处理都在您的浏览器中本地进行。不会将任何文件上传到任何服务器。",
      "viewSourceCode": "在 GitHub 上查看源代码",
      
      // Footer
      "copyright": "© {{year}} 本地 PDF 工具。代码采用 AGPLv3 许可。",
      "sponsor": "赞助",
      
      // Language
      "language": "语言",
      "english": "English",
      "chinese": "简体中文"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;