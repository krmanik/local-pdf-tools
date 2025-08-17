export async function _GSPS2PDF(dataStruct, responseCallback, progressCallback, statusUpdateCallback) {
  const worker = new Worker(
    new URL('./background-worker.js', import.meta.url),
    {type: 'module'}
  );
  
  worker.postMessage({ target: 'wasm', ...dataStruct });
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Processing timeout after 1 hour'));
    }, 3600000); // 1 hour timeout
    
    const listener = (e) => {
      // Handle progress updates
      if (e.data.type === 'progress' && progressCallback) {
        progressCallback(e.data.data);
        return; // Don't resolve yet, continue listening
      }
      
      // Handle final result (with type: 'result' or without type for backwards compatibility)
      if (e.data.type === 'result' || !e.data.type) {
        clearTimeout(timeout);
        const result = e.data.type === 'result' ? e.data.data : e.data;
        resolve(result);
        worker.removeEventListener('message', listener);
        worker.removeEventListener('error', errorListener);
        setTimeout(() => worker.terminate(), 0);
      }
    };
    
    const errorListener = (error) => {
      clearTimeout(timeout);
      reject(error);
      worker.removeEventListener('message', listener);
      worker.removeEventListener('error', errorListener);
      setTimeout(() => worker.terminate(), 0);
    };
    
    worker.addEventListener('message', listener);
    worker.addEventListener('error', errorListener);
  });
}



