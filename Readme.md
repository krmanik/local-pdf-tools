# Local PDF Tools

This web app is a PDF processing tool that runs entirely in your browser using Ghostscript WebAssembly. It provides three main features:
- **Compress**: Reduce PDF file size while maintaining quality
- **Merge**: Combine multiple PDF files into a single document  
- **Split**: Extract specific page ranges from a PDF document

## Context

This project is a demo of another usage of the `gs.wasm` that [@ochachacha](https://github.com/ochachacha) compiled and [ghostscript-pdf-compress.wasm](https://github.com/laurentmmeyer/ghostscript-pdf-compress.wasm). It takes any PDF and compress it via ghostscript.

The applied command is:

```
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dDownsampleColorImages=true -dColorImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf
```

## WebWorker

The compression is now processed in a webworker so that the main thread doesn't become unresponsive and now there is virtually no limit to the size of the PDF that you can compress :tada:  

## Run the project

To run the project, simply do the following steps

```bash
git clone https://github.com/krmanik/local-pdf-tools.git
cd local-pdf-tools
npm install
npm run dev
```

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Features

### Compress PDF
- Multiple quality presets (Screen, eBook, Printer, Prepress, Default)
- Advanced PDF settings (compatibility level, image downsampling)
- Custom Ghostscript commands for power users

### Merge PDFs
- Combine multiple PDF files into one
- Drag-and-drop interface for file selection
- Quality settings for output optimization

### Split PDF
- Extract specific page ranges
- Simple start/end page specification
- Maintains original quality

### Dark Mode
- Toggle between light and dark themes
- Persistent theme preference
- Respects system preference on first visit

## Privacy & Security

All processing happens locally in your browser. No files are uploaded to any server. Your documents never leave your device.

## Demo

[https://krmanik.github.io/local-pdf-tools/](https://krmanik.github.io/local-pdf-tools/)

## License

2025 krmanik. Code licensed under AGPLv3.

This project is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) – see the [LICENSE](LICENSE) file for details.

Ghostscript is released by Artifex under AGPLv3 and can be found [here](https://www.ghostscript.com/).
