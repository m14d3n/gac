import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Download,
  Settings,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [libError, setLibError] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    scale: 0.5, // Scale down resolution (0.5 = 50% width/height)
    frameSkip: 2, // 1 = keep all, 2 = keep half, 3 = keep third
    colors: 256, // 256 (full), 64, or 8 colors
    background: "#000000", // Fill background to avoid transparent pixel artifacts
  });

  // Dynamically load gifuct-js (decoder) and gif.js (encoder)
  useEffect(() => {
    const initLibs = async () => {
      setLibError(null);

      try {
        // Attempt 1: Native ESM Imports (Bypasses most strict iframe sandbox rules)
        const gifuctModule = await import("https://esm.sh/gifuct-js@2.1.2");
        if (gifuctModule.parseGIF) window.parseGIF = gifuctModule.parseGIF;
        if (gifuctModule.decompressFrames)
          window.decompressFrames = gifuctModule.decompressFrames;

        const gifModule = await import("https://esm.sh/gif.js@0.2.0");
        if (gifModule.default) window.GIF = gifModule.default;
        else if (gifModule.GIF) window.GIF = gifModule.GIF;

        if (window.parseGIF && window.GIF) {
          setScriptsLoaded(true);
          return; // Success!
        }
      } catch (e) {
        console.warn("ESM load failed, falling back to fetch-and-inject...", e);
      }

      // Attempt 2: Fetch raw text and inject (Bypasses script src CSP rules)
      const loadScriptText = async (urls) => {
        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const text = await response.text();
              const script = document.createElement("script");
              script.text = text; // Inject as inline script
              document.head.appendChild(script);
              return true;
            }
          } catch (e) {
            console.warn(`Failed to fetch ${url}`);
          }
        }
        return false;
      };

      const decoderLoaded = await loadScriptText([
        "https://unpkg.com/gifuct-js@2.1.2/dist/gifuct-js.min.js",
        "https://cdn.jsdelivr.net/npm/gifuct-js@2.1.2/dist/gifuct-js.min.js",
      ]);

      const encoderLoaded = await loadScriptText([
        "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js",
        "https://unpkg.com/gif.js@0.2.0/dist/gif.js",
      ]);

      if (decoderLoaded && encoderLoaded) {
        // Give the browser a tiny delay to evaluate the injected script tags
        setTimeout(() => {
          if (window.parseGIF && window.GIF) {
            setScriptsLoaded(true);
          } else {
            setLibError(
              "Libraries downloaded but failed to initialize variables.",
            );
          }
        }, 100);
      } else {
        setLibError(
          "Failed to download libraries. An ad-blocker or strict firewall might be preventing the connection.",
        );
      }
    };

    initLibs();
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === "image/gif") {
      setFile(selected);
      setOriginalSize(selected.size);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setOriginalUrl(URL.createObjectURL(selected));
      setCompressedUrl(null);
      setCompressedSize(0);
    } else {
      alert("Please select a valid GIF file.");
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const compressGIF = async () => {
    if (!file || !scriptsLoaded) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // 1. Fetch Worker Script for GIF.js (required to avoid CORS issues in some contexts)
      let workerStr;
      try {
        workerStr = await fetch(
          "https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js",
        ).then((r) => r.text());
      } catch (e) {
        workerStr = await fetch(
          "https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js",
        ).then((r) => r.text());
      }
      const workerBlob = new Blob([workerStr], {
        type: "application/javascript",
      });
      const workerUrl = URL.createObjectURL(workerBlob);

      // 2. Decode original GIF using gifuct-js
      const buffer = await file.arrayBuffer();
      const parsed = window.parseGIF(buffer);
      const frames = window.decompressFrames(parsed, true);

      const gifWidth = parsed.lsd.width;
      const gifHeight = parsed.lsd.height;
      const newWidth = Math.floor(gifWidth * settings.scale);
      const newHeight = Math.floor(gifHeight * settings.scale);

      // 3. Setup Canvases for Compositing
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = gifWidth;
      tempCanvas.height = gifHeight;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });

      const patchCanvas = document.createElement("canvas");
      const patchCtx = patchCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      const backupCanvas = document.createElement("canvas");
      backupCanvas.width = gifWidth;
      backupCanvas.height = gifHeight;
      const backupCtx = backupCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      // Initial Background Fill
      tempCtx.fillStyle = settings.background;
      tempCtx.fillRect(0, 0, gifWidth, gifHeight);

      // 4. Initialize Encoder
      const gifEncoder = new window.GIF({
        workers: 2,
        quality: 10, // Default quality for optimal processing speed
        width: newWidth,
        height: newHeight,
        workerScript: workerUrl,
      });

      // 5. Process and Composite Frames
      for (let i = 0; i < frames.length; i++) {
        let frame = frames[i];
        let disposal = frame.disposalType;

        // Restore backup if previous frame required it
        if (disposal === 3) {
          backupCtx.clearRect(0, 0, gifWidth, gifHeight);
          backupCtx.drawImage(tempCanvas, 0, 0);
        }

        // Draw current frame patch
        patchCanvas.width = frame.dims.width;
        patchCanvas.height = frame.dims.height;
        let imgData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height,
        );
        patchCtx.putImageData(imgData, 0, 0);
        tempCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

        // Add to new GIF if it matches our frame skip interval
        if (i % settings.frameSkip === 0) {
          let scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = newWidth;
          scaledCanvas.height = newHeight;
          let scaledCtx = scaledCanvas.getContext("2d");

          scaledCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

          // Apply Color Reduction (Posterization) if requested
          if (settings.colors < 256) {
            const imgData = scaledCtx.getImageData(0, 0, newWidth, newHeight);
            const data = imgData.data;

            // Map the dropdown selection to specific RGB channel levels
            let rLevels, gLevels, bLevels;
            if (settings.colors === 128) {
              rLevels = 5;
              gLevels = 5;
              bLevels = 5;
            } // 125 colors
            else if (settings.colors === 64) {
              rLevels = 4;
              gLevels = 4;
              bLevels = 4;
            } // 64 colors
            else if (settings.colors === 32) {
              rLevels = 3;
              gLevels = 4;
              bLevels = 3;
            } // 36 colors (closest to 32)
            else if (settings.colors === 16) {
              rLevels = 2;
              gLevels = 4;
              bLevels = 2;
            } // 16 colors
            else {
              rLevels = 2;
              gLevels = 2;
              bLevels = 2;
            } // 8 colors

            const rFactor = 255 / (rLevels - 1);
            const gFactor = 255 / (gLevels - 1);
            const bFactor = 255 / (bLevels - 1);

            for (let j = 0; j < data.length; j += 4) {
              data[j] = Math.round(data[j] / rFactor) * rFactor; // Red
              data[j + 1] = Math.round(data[j + 1] / gFactor) * gFactor; // Green
              data[j + 2] = Math.round(data[j + 2] / bFactor) * bFactor; // Blue
            }
            scaledCtx.putImageData(imgData, 0, 0);
          }

          // Accumulate delay for skipped frames so animation speed remains accurate
          let finalDelay = frame.delay;
          if (settings.frameSkip > 1) {
            for (let j = 1; j < settings.frameSkip; j++) {
              if (frames[i + j]) finalDelay += frames[i + j].delay;
            }
          }

          gifEncoder.addFrame(scaledCanvas, {
            delay: Math.max(finalDelay, 20),
            copy: true,
          });
        }

        // Handle disposal for the next frame
        if (disposal === 2) {
          // Restore to background
          tempCtx.fillStyle = settings.background;
          tempCtx.fillRect(
            frame.dims.left,
            frame.dims.top,
            frame.dims.width,
            frame.dims.height,
          );
        } else if (disposal === 3) {
          // Restore to previous
          tempCtx.clearRect(0, 0, gifWidth, gifHeight);
          tempCtx.drawImage(backupCanvas, 0, 0);
        }
      }

      // 6. Render and Output
      gifEncoder.on("progress", (p) => setProgress(Math.round(p * 100)));
      gifEncoder.on("finished", (blob) => {
        if (compressedUrl) URL.revokeObjectURL(compressedUrl);
        setCompressedUrl(URL.createObjectURL(blob));
        setCompressedSize(blob.size);
        setIsProcessing(false);
      });

      gifEncoder.render();
    } catch (e) {
      console.error(e);
      alert("Error processing GIF: " + e.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
            <RefreshCw className="w-8 h-8 text-blue-400" />
            GIF Animation Compressor - GAC v 1.0.0.
          </h1>
          <p className="text-slate-400 mt-2">
            Reduce your GIF animation file size directly in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Box */}
            <div className="bg-slate-800 p-6 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-400 transition-colors text-center relative group">
              <input
                type="file"
                accept="image/gif"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-400 mb-3" />
              <h3 className="font-semibold text-slate-200">Upload GIF</h3>
              <p className="text-sm text-slate-400 mt-1">
                Drag & drop or click to select
              </p>
            </div>

            {/* Settings Panel */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-blue-400" />
                Compression Settings
              </h3>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm font-medium text-slate-300">
                      Resolution Scale
                    </label>
                    <span className="text-sm text-slate-400">
                      {Math.round(settings.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.scale}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        scale: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Shrinking dimensions saves the most space.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Frame Drop
                  </label>
                  <select
                    value={settings.frameSkip}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        frameSkip: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-600 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 block"
                  >
                    <option value={1}>Keep all frames (Smoothest)</option>
                    <option value={2}>Keep half (Drop every other)</option>
                    <option value={3}>Keep third (Drop 2 out of 3)</option>
                    <option value={4}>Keep quarter (Choppy, smallest)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Color Palette
                  </label>
                  <select
                    value={settings.colors}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        colors: parseInt(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-600 text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 block"
                  >
                    <option value={256}>256 Colors (Standard)</option>
                    <option value={128}>128 Colors</option>
                    <option value={64}>64 Colors</option>
                    <option value={32}>32 Colors (Great for logos)</option>
                    <option value={16}>16 Colors</option>
                    <option value={8}>8 Colors (Tiny file size)</option>
                  </select>
                </div>
              </div>

              {libError && (
                <div className="mt-4 flex items-start gap-2 text-sm text-rose-400 bg-rose-900/20 p-3 rounded border border-rose-800/50">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{libError}</p>
                </div>
              )}

              <button
                onClick={compressGIF}
                disabled={!file || isProcessing || !scriptsLoaded || !!libError}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Processing ({progress}%)
                  </>
                ) : libError ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Initialization Failed
                  </>
                ) : !scriptsLoaded ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading Libraries...
                  </>
                ) : !file ? (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload a GIF First
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Compress GIF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Previews */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Original Preview */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col h-full min-h-[300px]">
                <h3 className="font-semibold text-slate-300 mb-2 flex justify-between items-center">
                  Original
                  {originalSize > 0 && (
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                      {formatBytes(originalSize)}
                    </span>
                  )}
                </h3>
                <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                  {originalUrl ? (
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="max-w-full max-h-[350px] object-contain"
                    />
                  ) : (
                    <p className="text-slate-600 text-sm">No image uploaded</p>
                  )}
                </div>
              </div>

              {/* Compressed Preview */}
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col h-full min-h-[300px]">
                <h3 className="font-semibold text-slate-300 mb-2 flex justify-between items-center">
                  Compressed Result
                  {compressedSize > 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${compressedSize <= 256000 ? "bg-emerald-900/50 text-emerald-400" : "bg-rose-900/50 text-rose-400"}`}
                    >
                      {formatBytes(compressedSize)}
                    </span>
                  )}
                </h3>
                <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden p-2 relative">
                  {compressedUrl ? (
                    <img
                      src={compressedUrl}
                      alt="Compressed"
                      className="max-w-full max-h-[350px] object-contain"
                    />
                  ) : isProcessing ? (
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Working magic...</p>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-sm">
                      Waiting to compress...
                    </p>
                  )}
                </div>

                {/* Result Feedback & Download */}
                {compressedSize > 0 && (
                  <div className="mt-4 space-y-3">
                    {compressedSize <= 256000 ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 p-2 rounded border border-emerald-800/50">
                        <CheckCircle className="w-4 h-4" /> Success! It's under
                        256 KB.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-800/50">
                        <AlertCircle className="w-4 h-4" /> Still over 256 KB.
                        Try lower resolution or dropping more frames.
                      </div>
                    )}

                    <a
                      href={compressedUrl}
                      download="compressed_animation.gif"
                      className="w-full block text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <Download className="w-4 h-4" />
                      Download Final GIF
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
