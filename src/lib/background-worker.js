// Utility function to parse command arguments properly
function parseCommandArgs(commandStr) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < commandStr.length; i++) {
    const char = commandStr[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        args.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

// Function to build advanced Ghostscript arguments
function buildAdvancedArgs(advancedSettings, baseArgs) {
  let args = [...baseArgs];
  
  if (!advancedSettings) {
    return args;
  }
  
  // Add compatibility level
  const compatIndex = args.findIndex(arg => arg.startsWith('-dCompatibilityLevel='));
  if (compatIndex >= 0) {
    args[compatIndex] = `-dCompatibilityLevel=${advancedSettings.compatibilityLevel}`;
  } else {
    args.splice(2, 0, `-dCompatibilityLevel=${advancedSettings.compatibilityLevel}`);
  }
  
  // Color image settings
  if (advancedSettings.colorImageSettings) {
    const colorSettings = advancedSettings.colorImageSettings;
    
    // Add downsample setting
    if (colorSettings.downsample !== undefined) {
      args.splice(-1, 0, `-dDownsampleColorImages=${colorSettings.downsample}`);
    }
    
    // Add resolution only if downsampling is enabled and resolution is specified
    if (colorSettings.downsample && colorSettings.resolution) {
      args.splice(-1, 0, `-dColorImageResolution=${colorSettings.resolution}`);
    }
  }
  
  return args;
}

// Utility function to validate arguments
function validateArgs(args, operation) {
  if (!args || args.length === 0) {
    throw new Error('No arguments provided');
  }
  
  // Check for required Ghostscript parameters
  const hasDevice = args.some(arg => arg.startsWith('-sDEVICE='));
  const hasOutput = args.some(arg => arg.startsWith('-sOutputFile='));
  
  if (!hasDevice) {
    throw new Error('Missing -sDEVICE parameter in command');
  }
  
  if (!hasOutput) {
    throw new Error('Missing -sOutputFile parameter in command');
  }
  
  return true;
}

function loadScript() {
  import("./gs-worker.js");
}

var Module;

function _GSPS2PDF(
  dataStruct,
  responseCallback,
) {
  try {
    const { operation, customCommand, pdfSetting, files, splitRange, advancedSettings, showTerminalOutput, showProgressBar } = dataStruct;
    
    // Handle multiple files for merge operation
    if (operation === 'merge' && files && files.length > 1) {
      return _GSMergePDF(dataStruct, responseCallback);
    }
    
    // Handle split operation
    if (operation === 'split') {
      return _GSSplitPDF(dataStruct, responseCallback);
    }
    
    // Handle single file operations (compress)
    var xhr = new XMLHttpRequest();
    xhr.open("GET", dataStruct.psDataURL);
    xhr.responseType = "arraybuffer";
    xhr.onerror = function () {
      responseCallback({ error: 'Failed to load input file' });
    };
    xhr.onload = function () {
      try {
        console.log('onload')
        
        // Generate args based on operation and settings
        let args = [];
        
        if (customCommand && customCommand.trim()) {
          // Parse custom command properly
          args = parseCommandArgs(customCommand.trim());
          validateArgs(args, operation);
        } else {
          // Use predefined settings
          args = [
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dNOPAUSE",
            "-dBATCH",
            "-sOutputFile=output.pdf"
          ];
          
          // Add or remove -dQUIET based on terminal output or progress bar settings
          if (!showTerminalOutput && !showProgressBar) {
            args.splice(4, 0, "-dQUIET");
          }
          
          // Add PDF settings based on operation
          if (operation === 'compress' && pdfSetting) {
            args.splice(2, 0, `-dPDFSETTINGS=${pdfSetting}`);
          }
          
          // Apply advanced settings if provided
          if (advancedSettings) {
            args = buildAdvancedArgs(advancedSettings, args);
          }
          
          args.push("input.pdf");
        }
        
        console.log('Ghostscript args:', args);
        
        //set up EMScripten environment
        Module = {
          preRun: [
            function () {
              try {
                self.Module.FS.writeFile("input.pdf", new Uint8Array(xhr.response));
              } catch (e) {
                console.error('Error writing input file:', e);
                responseCallback({ error: 'Failed to write input file: ' + e.message });
              }
            },
          ],
          postRun: [
            function () {
              try {
                var uarray = self.Module.FS.readFile("output.pdf", { encoding: "binary" });
                var blob = new Blob([uarray], { type: "application/octet-stream" });
                var pdfDataURL = self.URL.createObjectURL(blob);
                responseCallback({ pdfDataURL: pdfDataURL, url: dataStruct.url });
                
                // Cleanup filesystem
                try {
                  self.Module.FS.unlink("input.pdf");
                  self.Module.FS.unlink("output.pdf");
                } catch (cleanupError) {
                  console.warn('Cleanup warning:', cleanupError);
                }
              } catch (e) {
                console.error('Error reading output file:', e);
                responseCallback({ error: 'Failed to generate output file: ' + e.message });
              }
            },
          ],
          arguments: args,
          print: function (text) { 
            console.log('GS:', text); 
            // Send terminal output when either terminal output or progress bar is enabled
            if (showTerminalOutput || showProgressBar) {
              self.postMessage({ type: 'progress', data: text });
            }
          },
          printErr: function (text) { 
            console.error('GS Error:', text); 
            if (text.includes('Error') || text.includes('Fatal')) {
              responseCallback({ error: 'Ghostscript error: ' + text });
            }
          },
          totalDependencies: 0,
          noExitRuntime: 1
        };
        
        if (!self.Module) {
          self.Module = Module;
          loadScript();
        } else {
          self.Module["calledRun"] = false;
          self.Module["postRun"] = Module.postRun;
          self.Module["preRun"] = Module.preRun;
          self.Module.callMain();
        }
      } catch (e) {
        console.error('Error in processing:', e);
        responseCallback({ error: 'Processing error: ' + e.message });
      }
    };
    xhr.send();
  } catch (e) {
    console.error('Error in _GSPS2PDF:', e);
    responseCallback({ error: 'Initialization error: ' + e.message });
  }
}

// Handle PDF merging
function _GSMergePDF(dataStruct, responseCallback) {
  try {
    const { files, customCommand, pdfSetting, advancedSettings, showTerminalOutput, showProgressBar } = dataStruct;
    let filesLoaded = 0;
    const fileData = [];
    let hasError = false;
    
    // Load all files
    files.forEach((fileUrl, index) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", fileUrl);
      xhr.responseType = "arraybuffer";
      xhr.onerror = function () {
        if (!hasError) {
          hasError = true;
          responseCallback({ error: `Failed to load file ${index + 1}` });
        }
      };
      xhr.onload = function () {
        if (hasError) return;
        
        try {
          fileData[index] = new Uint8Array(xhr.response);
          filesLoaded++;
          
          if (filesLoaded === files.length) {
            // All files loaded, proceed with merge
            let args = [];
            
            if (customCommand && customCommand.trim()) {
              args = parseCommandArgs(customCommand.trim());
              validateArgs(args, 'merge');
            } else {
              args = [
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dNOPAUSE",
                "-dBATCH",
                "-sOutputFile=output.pdf"
              ];
              
              // Add or remove -dQUIET based on terminal output or progress bar settings
              if (!showTerminalOutput && !showProgressBar) {
                args.splice(4, 0, "-dQUIET");
              }
              
              if (pdfSetting) {
                args.splice(2, 0, `-dPDFSETTINGS=${pdfSetting}`);
              }
              
              // Apply advanced settings if provided
              if (advancedSettings) {
                // Create temp args without input files for advanced settings
                const tempArgs = [...args];
                args = buildAdvancedArgs(advancedSettings, tempArgs);
              }
              
              // Add input files
              for (let i = 0; i < files.length; i++) {
                args.push(`input${i}.pdf`);
              }
            }
            
            console.log('Merge args:', args);
            
            Module = {
              preRun: [
                function () {
                  try {
                    // Write all input files
                    fileData.forEach((data, index) => {
                      self.Module.FS.writeFile(`input${index}.pdf`, data);
                    });
                  } catch (e) {
                    console.error('Error writing input files:', e);
                    responseCallback({ error: 'Failed to write input files: ' + e.message });
                  }
                },
              ],
              postRun: [
                function () {
                  try {
                    var uarray = self.Module.FS.readFile("output.pdf", { encoding: "binary" });
                    var blob = new Blob([uarray], { type: "application/octet-stream" });
                    var pdfDataURL = self.URL.createObjectURL(blob);
                    responseCallback({ pdfDataURL: pdfDataURL, operation: 'merge' });
                    
                    // Cleanup filesystem
                    try {
                      for (let i = 0; i < files.length; i++) {
                        self.Module.FS.unlink(`input${i}.pdf`);
                      }
                      self.Module.FS.unlink("output.pdf");
                    } catch (cleanupError) {
                      console.warn('Merge cleanup warning:', cleanupError);
                    }
                  } catch (e) {
                    console.error('Error reading merge output:', e);
                    responseCallback({ error: 'Failed to generate merged file: ' + e.message });
                  }
                },
              ],
              arguments: args,
              print: function (text) { 
                console.log('GS Merge:', text); 
                // Send terminal output when either terminal output or progress bar is enabled
                if (showTerminalOutput || showProgressBar) {
                  self.postMessage({ type: 'progress', data: text });
                }
              },
              printErr: function (text) { 
                console.error('GS Merge Error:', text);
                if (text.includes('Error') || text.includes('Fatal')) {
                  responseCallback({ error: 'Ghostscript merge error: ' + text });
                }
              },
              totalDependencies: 0,
              noExitRuntime: 1
            };
            
            if (!self.Module) {
              self.Module = Module;
              loadScript();
            } else {
              self.Module["calledRun"] = false;
              self.Module["postRun"] = Module.postRun;
              self.Module["preRun"] = Module.preRun;
              self.Module.callMain();
            }
          }
        } catch (e) {
          if (!hasError) {
            hasError = true;
            console.error('Error processing merge file:', e);
            responseCallback({ error: 'Error processing merge file: ' + e.message });
          }
        }
      };
      xhr.send();
    });
  } catch (e) {
    console.error('Error in _GSMergePDF:', e);
    responseCallback({ error: 'Merge initialization error: ' + e.message });
  }
}

// Handle PDF splitting
function _GSSplitPDF(dataStruct, responseCallback) {
  try {
    const { psDataURL, customCommand, splitRange, advancedSettings, showTerminalOutput, showProgressBar } = dataStruct;
    
    var xhr = new XMLHttpRequest();
    xhr.open("GET", psDataURL);
    xhr.responseType = "arraybuffer";
    xhr.onerror = function () {
      responseCallback({ error: 'Failed to load input file for splitting' });
    };
    xhr.onload = function () {
      try {
        console.log('split onload');
        let args = [];
        
        if (customCommand && customCommand.trim()) {
          args = parseCommandArgs(customCommand.trim());
          validateArgs(args, 'split');
        } else {
          args = [
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            "-dNOPAUSE",
            "-dBATCH"
          ];
          
          // Add or remove -dQUIET based on terminal output or progress bar settings
          if (!showTerminalOutput && !showProgressBar) {
            args.splice(3, 0, "-dQUIET");
          }
          
          if (splitRange && splitRange.startPage && splitRange.endPage) {
            const startPage = parseInt(splitRange.startPage);
            const endPage = parseInt(splitRange.endPage);
            
            if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < startPage) {
              responseCallback({ error: 'Invalid page range specified' });
              return;
            }
            
            args.push(`-dFirstPage=${startPage}`);
            args.push(`-dLastPage=${endPage}`);
          } else {
            responseCallback({ error: 'Page range not specified for split operation' });
            return;
          }
          
          // Apply advanced settings if provided (but keep split-specific args at the end)
          if (advancedSettings) {
            const tempArgs = [...args.slice(0, -2)]; // Remove FirstPage and LastPage temporarily
            const splitArgs = args.slice(-2); // Keep FirstPage and LastPage
            const processedArgs = buildAdvancedArgs(advancedSettings, tempArgs);
            args = [...processedArgs, ...splitArgs];
          }
          
          args.push("-sOutputFile=output.pdf");
          args.push("input.pdf");
        }
        
        console.log('Split args:', args);
        
        Module = {
          preRun: [
            function () {
              try {
                self.Module.FS.writeFile("input.pdf", new Uint8Array(xhr.response));
              } catch (e) {
                console.error('Error writing split input file:', e);
                responseCallback({ error: 'Failed to write input file for splitting: ' + e.message });
              }
            },
          ],
          postRun: [
            function () {
              try {
                var uarray = self.Module.FS.readFile("output.pdf", { encoding: "binary" });
                var blob = new Blob([uarray], { type: "application/octet-stream" });
                var pdfDataURL = self.URL.createObjectURL(blob);
                responseCallback({ pdfDataURL: pdfDataURL, operation: 'split' });
                
                // Cleanup filesystem
                try {
                  self.Module.FS.unlink("input.pdf");
                  self.Module.FS.unlink("output.pdf");
                } catch (cleanupError) {
                  console.warn('Split cleanup warning:', cleanupError);
                }
              } catch (e) {
                console.error('Error reading split output:', e);
                responseCallback({ error: 'Failed to generate split file: ' + e.message });
              }
            },
          ],
          arguments: args,
          print: function (text) { 
            console.log('GS Split:', text); 
            // Send terminal output when either terminal output or progress bar is enabled
            if (showTerminalOutput || showProgressBar) {
              self.postMessage({ type: 'progress', data: text });
            }
          },
          printErr: function (text) { 
            console.error('GS Split Error:', text);
            if (text.includes('Error') || text.includes('Fatal')) {
              responseCallback({ error: 'Ghostscript split error: ' + text });
            }
          },
          totalDependencies: 0,
          noExitRuntime: 1
        };
        
        if (!self.Module) {
          self.Module = Module;
          loadScript();
        } else {
          self.Module["calledRun"] = false;
          self.Module["postRun"] = Module.postRun;
          self.Module["preRun"] = Module.preRun;
          self.Module.callMain();
        }
      } catch (e) {
        console.error('Error in split processing:', e);
        responseCallback({ error: 'Split processing error: ' + e.message });
      }
    };
    xhr.send();
  } catch (e) {
    console.error('Error in _GSSplitPDF:', e);
    responseCallback({ error: 'Split initialization error: ' + e.message });
  }
}


self.addEventListener('message', function({data: e}) {
  console.log("message", e)
  // e contains the message sent to the worker.
  if (e.target !== 'wasm'){
    return;
  }
  console.log('Message received from main script', e);
  
  try {
    _GSPS2PDF(e, (result) => {
      if (result.error) {
        console.error('Worker error:', result.error);
      }
      // Send final result with proper structure for worker-init.js to handle
      self.postMessage({ type: 'result', data: result });
    });
  } catch (error) {
    console.error('Worker exception:', error);
    self.postMessage({ type: 'result', data: { error: 'Worker exception: ' + error.message } });
  }
});

console.log("Worker ready")
