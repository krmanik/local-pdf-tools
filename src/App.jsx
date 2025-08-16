import { useState, useRef, useEffect } from "react";
import { _GSPS2PDF } from "./lib/worker-init.js";
import RightButtonBar from './components/RightButtonBar.jsx';

// PDF Settings presets
const PDF_SETTINGS = {
  '/screen': 'Screen-optimized (smallest)',
  '/ebook': 'eBook (small)',
  '/printer': 'Printer (balanced)',
  '/prepress': 'Prepress (high quality)',
  '/default': 'Default (original quality)'
};

function loadPDFData(response, filename) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", response);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
      window.URL.revokeObjectURL(response);
      const blob = new Blob([xhr.response], { type: "application/pdf" });
      const pdfURL = window.URL.createObjectURL(blob);
      const size = xhr.response.byteLength;
      resolve({ pdfURL, size });
    };
    xhr.onerror = reject;
    xhr.send();
  });
}

function App() {
  const [activeTab, setActiveTab] = useState("compress");
  const [state, setState] = useState("init");
  const [files, setFiles] = useState([]);
  const [downloadLinks, setDownloadLinks] = useState([]);
  const [pdfSetting, setPdfSetting] = useState("/ebook");
  const [customCommand, setCustomCommand] = useState("");
  const [useCustomCommand, setUseCustomCommand] = useState(false);
  const [splitRange, setSplitRange] = useState({ startPage: "", endPage: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [showTerminalOutput, setShowTerminalOutput] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [terminalData, setTerminalData] = useState("");
  const [progressInfo, setProgressInfo] = useState({ current: 0, total: 0, currentPage: 0 });
  const terminalRef = useRef(null);

  // Simplified advanced PDF settings
  const [advancedSettings, setAdvancedSettings] = useState({
    compatibilityLevel: "1.4",
    colorImageSettings: {
      downsample: true,
      resolution: 300
    }
  });
  const [useAdvancedSettings, setUseAdvancedSettings] = useState(false);

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalData]);

  // Function to extract progress information from terminal output
  const parseProgressFromOutput = (output) => {
    // Extract total pages from "Processing pages X through Y"
    const totalPagesMatch = output.match(/Processing pages \d+ through (\d+)/);
    if (totalPagesMatch) {
      const totalPages = parseInt(totalPagesMatch[1]);
      setProgressInfo(prev => ({ ...prev, total: totalPages }));
    }

    // Extract current page from "Page X" 
    const currentPageMatch = output.match(/^Page (\d+)$/);
    if (currentPageMatch) {
      const currentPage = parseInt(currentPageMatch[1]);
      setProgressInfo(prev => ({
        ...prev,
        currentPage: currentPage,
        current: currentPage // Update current to match the page being processed
      }));
    }
  };

  async function processPDF(operation, inputFiles, filename) {
    setState("loading");
    setTerminalData(""); // Clear previous terminal data
    setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress

    try {
      let dataObject = {
        operation,
        pdfSetting: useCustomCommand ? null : pdfSetting,
        customCommand: useCustomCommand ? customCommand : null,
        advancedSettings: useAdvancedSettings ? advancedSettings : null,
        showTerminalOutput: showTerminalOutput, // Pass terminal output setting to worker
        showProgressBar: showProgressBar // Pass progress bar setting to worker
      };

      if (operation === 'merge') {
        dataObject.files = inputFiles.map(file => file.url);
      } else if (operation === 'split') {
        dataObject.psDataURL = inputFiles[0].url;
        dataObject.splitRange = splitRange;
      } else {
        // compress
        dataObject.psDataURL = inputFiles[0].url;
      }

      const result = await _GSPS2PDF(
        dataObject,
        null, // responseCallback (not used in promise version)
        (showTerminalOutput || showProgressBar) ? (outputText) => {
          // Update terminal output if enabled
          if (showTerminalOutput) {
            setTerminalData(prev => prev + outputText + '\n');
          }
          // Parse progress information if progress bar is enabled
          if (showProgressBar) {
            parseProgressFromOutput(outputText);
          }
        } : null // outputCallback
      );

      // Check for errors in the result
      if (result.error) {
        console.error("Processing failed:", result.error);
        setState("error");
        setErrorMessage(result.error);
        setTerminalData(""); // Clear terminal output on error
        setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress on error
        return;
      }

      const { pdfURL, size: newSize } = await loadPDFData(result.pdfDataURL, filename);

      setDownloadLinks([{
        url: pdfURL,
        filename: getOutputFilename(filename, operation),
        operation
      }]);
      setState("toBeDownloaded");
      setTerminalData(""); // Clear terminal output when done
      setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress when done

    } catch (error) {
      console.error("Processing failed:", error);
      setState("error");
      setErrorMessage(error.message || "An unexpected error occurred during processing");
      setTerminalData(""); // Clear terminal output on error
      setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress on error
    }
  }

  function getOutputFilename(originalName, operation) {
    const baseName = originalName.replace('.pdf', '');
    switch (operation) {
      case 'compress':
        return `${baseName}-compressed.pdf`;
      case 'merge':
        return `merged-${Date.now()}.pdf`;
      case 'split':
        return `${baseName}-split-${splitRange.startPage}-${splitRange.endPage}.pdf`;
      default:
        return `${baseName}-processed.pdf`;
    }
  }

  const changeHandler = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const fileObjects = selectedFiles.map(file => ({
      filename: file.name,
      url: window.URL.createObjectURL(file),
      file: file
    }));

    // For compress and split operations, replace existing files (single file only)
    // For merge, allow multiple files
    if (activeTab === 'merge') {
      setFiles(prevFiles => [...prevFiles, ...fileObjects]);
    } else {
      // Clean up previous files for compress/split
      files.forEach(file => {
        window.URL.revokeObjectURL(file.url);
      });
      setFiles(fileObjects.slice(0, 1)); // Only take the first file for compress/split
    }
    setState("selected");
  };

  const removeFile = (indexToRemove) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter((_, index) => index !== indexToRemove);
      // Clean up blob URL
      window.URL.revokeObjectURL(prevFiles[indexToRemove].url);
      return newFiles;
    });

    // Update state if no files left
    if (files.length === 1) {
      setState("init");
    }
  };

  const clearAllFiles = () => {
    // Clean up blob URLs
    files.forEach(file => {
      window.URL.revokeObjectURL(file.url);
    });
    setFiles([]);
    setState("init");
  };

  const addMoreFiles = () => {
    document.getElementById('files').click();
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (files.length === 0) return false;

    // Validation
    if (activeTab === 'merge' && files.length < 2) {
      alert('Please select at least 2 PDF files to merge.');
      return false;
    }

    if (activeTab === 'split' && (!splitRange.startPage || !splitRange.endPage)) {
      alert('Please specify page range for splitting.');
      return false;
    }

    if (activeTab === 'split') {
      const startPage = parseInt(splitRange.startPage);
      const endPage = parseInt(splitRange.endPage);
      if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
        alert('Please enter valid page numbers. End page must be greater than or equal to start page.');
        return false;
      }
    }

    if (useCustomCommand && !customCommand.trim()) {
      alert('Please enter a custom command or disable custom command mode.');
      return false;
    }

    if (useCustomCommand) {
      const cmd = customCommand.trim();
      if (!cmd.includes('-sDEVICE=') || !cmd.includes('-sOutputFile=')) {
        alert('Custom command must include -sDEVICE= and -sOutputFile= parameters.');
        return false;
      }
    }

    const primaryFilename = files[0]?.filename || 'output.pdf';
    processPDF(activeTab, files, primaryFilename);
    return false;
  };

  const resetForm = () => {
    // Clean up blob URLs
    files.forEach(file => {
      window.URL.revokeObjectURL(file.url);
    });
    downloadLinks.forEach(link => {
      window.URL.revokeObjectURL(link.url);
    });

    setFiles([]);
    setDownloadLinks([]);
    setState("init");
    setSplitRange({ startPage: "", endPage: "" });
    setErrorMessage("");
    setTerminalData(""); // Clear terminal output
    setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress
    setUseAdvancedSettings(false);
    setAdvancedSettings({
      compatibilityLevel: "1.4",
      colorImageSettings: {
        downsample: true,
        resolution: 300
      }
    });
  };

  const processAgain = () => {
    // Keep the files but reset to selected state
    downloadLinks.forEach(link => {
      window.URL.revokeObjectURL(link.url);
    });
    setDownloadLinks([]);
    setState("selected");
    setErrorMessage("");
    setTerminalData(""); // Clear terminal output
    setProgressInfo({ current: 0, total: 0, currentPage: 0 }); // Reset progress
  };

  const renderFileInput = () => {
    const accept = "application/pdf";
    const multiple = activeTab === 'merge';

    return (
      <div className="space-y-6">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          name="files"
          onChange={changeHandler}
          id="files"
          className="hidden"
        />
        <div className="text-center">
          <label
            htmlFor="files"
            className="btn-primary cursor-pointer text-lg px-8 py-4 rounded-xl"
          >
            {files.length === 0
              ? `Choose PDF file${multiple ? 's' : ''} to ${activeTab}`
              : `${files.length} file${files.length > 1 ? 's' : ''} selected`
            }
          </label>
        </div>

        {files.length > 0 && (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
              <span className="text-sm font-medium text-muted-600 dark:text-muted-400">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                className="btn-danger text-sm px-4 py-2 rounded-xl"
                onClick={clearAllFiles}
                title="Clear all files"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted-50 dark:bg-gray-700 border border-muted-200 dark:border-gray-600 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.filename}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-4 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 hover:scale-110"
                    onClick={() => removeFile(index)}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}

              {activeTab === 'merge' && (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-300 dark:border-gray-600 rounded-xl text-muted-600 dark:text-muted-400 hover:border-muted-400 dark:hover:border-gray-500 hover:text-muted-700 dark:hover:text-muted-300 transition-colors"
                  onClick={addMoreFiles}
                >
                  <span className="text-xl font-bold">+</span>
                  Add more files
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="card space-y-6">
        {useCustomCommand ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900 dark:text-white">
              Custom Command:
            </label>
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="e.g., -sDEVICE=pdfwrite -dPDFSETTINGS=/screen -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf"
              className="input font-mono text-sm"
            />
            <p className="text-xs text-muted-600 dark:text-muted-400">
              Enter full Ghostscript command arguments. Required: -sDEVICE= and -sOutputFile=
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(activeTab === 'compress' || activeTab === 'merge') && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  PDF Quality Setting:
                </label>
                <select
                  value={pdfSetting}
                  onChange={(e) => setPdfSetting(e.target.value)}
                  className="input"
                >
                  {Object.entries(PDF_SETTINGS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'split' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                  Page Range:
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    placeholder="Start page"
                    value={splitRange.startPage}
                    onChange={(e) => setSplitRange(prev => ({ ...prev, startPage: e.target.value }))}
                    min="1"
                    className="input flex-1"
                  />
                  <span className="text-muted-600 dark:text-muted-400 font-medium">to</span>
                  <input
                    type="number"
                    placeholder="End page"
                    value={splitRange.endPage}
                    onChange={(e) => setSplitRange(prev => ({ ...prev, endPage: e.target.value }))}
                    min="1"
                    className="input flex-1"
                  />
                </div>
              </div>
            )}

            {/* Show Terminal Output Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showTerminalOutput"
                checked={showTerminalOutput}
                onChange={(e) => setShowTerminalOutput(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="showTerminalOutput" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Show terminal output
              </label>
            </div>

            {/* Show Progress Bar Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showProgressBar"
                checked={showProgressBar}
                onChange={(e) => setShowProgressBar(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="showProgressBar" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Show progress bar
              </label>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="useAdvancedSettings"
                checked={useAdvancedSettings}
                onChange={(e) => setUseAdvancedSettings(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
              />
              <label htmlFor="useAdvancedSettings" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                Use advanced settings
              </label>
            </div>

            {/* Advanced Settings Panel */}
            {useAdvancedSettings && (
              <div className="bg-muted-50 dark:bg-gray-700 border border-muted-200 dark:border-gray-600 rounded-xl p-6 space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-muted-200 dark:border-gray-600 pb-3">
                  Advanced PDF Settings
                </h4>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-muted-200 dark:border-gray-600">
                    <h5 className="text-base font-medium text-gray-900 dark:text-white mb-4 border-b border-muted-200 dark:border-gray-600 pb-2">
                      Essential Settings
                    </h5>

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          PDF Compatibility Level:
                        </label>
                        <select
                          value={advancedSettings.compatibilityLevel}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            compatibilityLevel: e.target.value
                          }))}
                          className="input sm:w-48"
                        >
                          <option value="1.3">PDF 1.3 (Acrobat 4)</option>
                          <option value="1.4">PDF 1.4 (Acrobat 5)</option>
                          <option value="1.5">PDF 1.5 (Acrobat 6)</option>
                          <option value="1.6">PDF 1.6 (Acrobat 7)</option>
                          <option value="1.7">PDF 1.7 (Acrobat 8)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="downsampleImages"
                          checked={advancedSettings.colorImageSettings.downsample}
                          onChange={(e) => setAdvancedSettings(prev => ({
                            ...prev,
                            colorImageSettings: {
                              ...prev.colorImageSettings,
                              downsample: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                        />
                        <label htmlFor="downsampleImages" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                          Downsample color images
                        </label>
                      </div>

                      {advancedSettings.colorImageSettings.downsample && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            Color Image Resolution (DPI):
                          </label>
                          <input
                            type="number"
                            value={advancedSettings.colorImageSettings.resolution}
                            onChange={(e) => setAdvancedSettings(prev => ({
                              ...prev,
                              colorImageSettings: {
                                ...prev.colorImageSettings,
                                resolution: parseInt(e.target.value) || 300
                              }
                            }))}
                            min="72"
                            max="1200"
                            className="input sm:w-32"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="useCustomCommand"
            checked={useCustomCommand}
            onChange={(e) => setUseCustomCommand(e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
          />
          <label htmlFor="useCustomCommand" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
            Use custom Ghostscript command
          </label>
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted-50 to-muted-100 dark:from-gray-900 dark:to-gray-800">
      {/* Responsive Navbar Header */}
      <header className="w-full bg-white dark:bg-gray-900 shadow-soft border-b border-muted-200 dark:border-gray-800">
        <nav className="container mx-auto max-w-4xl px-4 py-4 flex flex-row items-center justify-between">
          {/* Left: Page Title */}
          <div className="flex items-center h-full">
            <img
              src="/local-pdf-tools/pdf-file.svg"
              alt="PDF Icon"
              className="w-8 h-8 md:w-10 md:h-10 mr-3"
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white whitespace-nowrap inline-block align-middle">
              Local PDF Tools
            </h1>
          </div>
          {/* Right: Buttons */}
          <div className="flex items-center h-full">
            <RightButtonBar />
            {/* Add more right-side buttons here if needed */}
          </div>
        </nav>
      </header>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Info below navbar */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-600 dark:text-muted-300 max-w-2xl mx-auto">
            Compress, merge, and split PDF files locally in your browser using{' '}
            <a
              target="_blank"
              href="https://ghostscript.com/"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium underline decoration-2 underline-offset-2"
            >
              Ghostscript WebAssembly
            </a>
            . No uploads required - everything stays on your device.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted-100 dark:bg-gray-800 p-1 rounded-2xl shadow-soft border border-muted-200 dark:border-gray-700">
            <button
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'compress'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-soft'
                : 'text-muted-600 dark:text-muted-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              onClick={() => {
                if (activeTab !== 'compress') {
                  setActiveTab('compress');
                  resetForm();
                }
              }}
            >
              Compress
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'merge'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-soft'
                : 'text-muted-600 dark:text-muted-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              onClick={() => {
                if (activeTab !== 'merge') {
                  setActiveTab('merge');
                  resetForm();
                }
              }}
            >
              Merge
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'split'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-soft'
                : 'text-muted-600 dark:text-muted-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              onClick={() => {
                if (activeTab !== 'split') {
                  setActiveTab('split');
                  resetForm();
                }
              }}
            >
              Split
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="card mb-8">
          {activeTab === 'compress' && (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Compress PDF</h3>
              <p className="text-muted-600 dark:text-muted-300">Reduce PDF file size while maintaining quality.</p>
            </div>
          )}
          {activeTab === 'merge' && (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Merge PDFs</h3>
              <p className="text-muted-600 dark:text-muted-300">Combine multiple PDF files into a single document.</p>
            </div>
          )}
          {activeTab === 'split' && (
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Split PDF</h3>
              <p className="text-muted-600 dark:text-muted-300">Extract specific page ranges from a PDF document.</p>
            </div>
          )}
        </div>

        {state !== "loading" && state !== "toBeDownloaded" && state !== "error" && (
          <form onSubmit={onSubmit} className="space-y-8">
            {renderFileInput()}
            {renderSettings()}

            {state === "selected" && (
              <div className="text-center">
                <button
                  type="submit"
                  className="btn-primary text-lg px-8 py-4 rounded-xl"
                >
                  {`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} PDF${activeTab === 'merge' ? 's' : ''}`}
                </button>
              </div>
            )}
          </form>
        )}

        {state === "loading" && (
          <div className="card text-center space-y-4">
            <div className="text-2xl mb-4 animate-spin-slow">⏳</div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Processing your PDF{activeTab === 'merge' ? 's' : ''}...
            </p>

            {/* Progress Bar */}
            {showProgressBar && (progressInfo.total > 0 || progressInfo.currentPage > 0) && (
              <div className="bg-muted-50 dark:bg-gray-700 border border-muted-200 dark:border-gray-600 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Processing Progress
                  </h4>
                  <span className="text-sm text-muted-600 dark:text-muted-400">
                    {progressInfo.total > 0
                      ? `Page ${progressInfo.currentPage} of ${progressInfo.total}`
                      : `Page ${progressInfo.currentPage}`
                    }
                  </span>
                </div>
                {progressInfo.total > 0 ? (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mb-2">
                      <div
                        className="bg-primary-600 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-600 dark:text-muted-400">
                      <span>{Math.round((progressInfo.current / progressInfo.total) * 100)}% Complete</span>
                      <span>{progressInfo.current}/{progressInfo.total} pages</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-pulse text-sm text-muted-600 dark:text-muted-400">
                      Processing page {progressInfo.currentPage}...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal Output Display */}
            {showTerminalOutput && (
              <div className="bg-muted-50 dark:bg-gray-700 border border-muted-200 dark:border-gray-600 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Terminal Output
                  </h4>
                  <span className="text-xs text-muted-600 dark:text-muted-400">
                    Live Output
                  </span>
                </div>
                <div ref={terminalRef} className="bg-black dark:bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                    {terminalData || 'Initializing...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {state === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <p className="text-lg font-semibold mb-2">An error occurred while processing your PDF:</p>
              <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-xl p-4 text-left">
                <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words font-mono">
                  {errorMessage}
                </pre>
              </div>
            </div>
            <button onClick={resetForm} className="btn-danger">
              Try Again
            </button>
          </div>
        )}

        {state === "toBeDownloaded" && (
          <div className="space-y-6">
            {downloadLinks.map((link, index) => (
              <div key={index} className="text-center">
                <a
                  href={link.url}
                  download={link.filename}
                  className="btn-success text-lg px-8 py-4 inline-block rounded-xl"
                >
                  Download {link.filename}
                </a>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={processAgain} className="btn-secondary text-lg px-8 py-4 rounded-xl">
                Process Again
              </button>
              <button onClick={resetForm} className="btn-primary text-lg px-8 py-4 rounded-xl">
                Choose New Files
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="card mt-12">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Features</h4>
          <ul className="space-y-2 text-muted-600 dark:text-muted-300 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Compress:</strong> Reduce file size with quality presets or custom settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Merge:</strong> Combine multiple PDFs into one document</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Split:</strong> Extract specific page ranges from a PDF</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Custom Commands:</strong> Use advanced Ghostscript commands for power users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Terminal Output:</strong> View real-time Ghostscript console output during processing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 dark:text-primary-400 font-bold">•</span>
              <span><strong className="text-gray-900 dark:text-white">Progress Bar:</strong> Visual progress tracking with page-by-page processing status</span>
            </li>
          </ul>

          <div className="border-t border-muted-200 dark:border-gray-700 pt-6">
            <p className="text-muted-600 dark:text-muted-300 mb-4">
              <strong className="text-gray-900 dark:text-white">Privacy & Security:</strong><br />
              All processing happens locally in your browser. No files are uploaded to any server.
            </p>

            <a
              href="https://github.com/krmanik/local-pdf-tools"
              target="_blank"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium underline decoration-2 underline-offset-2"
            >
              View source code on GitHub
            </a>
          </div>
        </div>

        <div className="card mt-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Sponsor Button */}
            <a
              id="sponsor-profile-button"
              href="https://github.com/sponsors/krmanik"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center px-6 py-2 rounded-lg font-medium border border-pink-400 text-pink-600 bg-white shadow-soft"
              title="Sponsor @krmanik on GitHub"
            >
              <svg aria-hidden="true" height="20" viewBox="0 0 16 16" width="20" className="mr-2 v-align-middle text-pink-500" fill="currentColor">
                <path d="m8 14.25.345.666a.75.75 0 0 1-.69 0l-.008-.004-.018-.01a7.152 7.152 0 0 1-.31-.17 22.055 22.055 0 0 1-3.434-2.414C2.045 10.731 0 8.35 0 5.5 0 2.836 2.086 1 4.25 1 5.797 1 7.153 1.802 8 3.02 8.847 1.802 10.203 1 11.75 1 13.914 1 16 2.836 16 5.5c0 2.85-2.045 5.231-3.885 6.818a22.066 22.066 0 0 1-3.744 2.584l-.018.01-.006.003h-.002ZM4.25 2.5c-1.336 0-2.75 1.164-2.75 3 0 2.15 1.58 4.144 3.365 5.682A20.58 20.58 0 0 0 8 13.393a20.58 20.58 0 0 0 3.135-2.211C12.92 9.644 14.5 7.65 14.5 5.5c0-1.836-1.414-3-2.75-3-1.373 0-2.609.986-3.029 2.456a.749.749 0 0 1-1.442 0C6.859 3.486 5.623 2.5 4.25 2.5Z"></path>
              </svg>
              <span className="v-align-middle font-semibold">Sponsor</span>
            </a>
            {/* Buy Me A Coffee Button */}
            <a href="https://www.buymeacoffee.com/krmani" target="_blank" rel="noopener noreferrer">
              <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style={{ height: '40px', width: '145px' }} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-muted-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center">
            <p className="text-muted-600 dark:text-muted-300">
              &copy; {new Date().getFullYear()} Local PDF Tools. Code licensed under AGPLv3.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
