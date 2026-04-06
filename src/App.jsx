import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  Settings,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  SunMedium,
  Moon,
} from "lucide-react";

const THEME_STORAGE_KEY = "gac-theme";

const THEMES = {
  black: {
    app: "bg-neutral-950 text-neutral-100",
    title: "text-white",
    subtitle: "text-neutral-300",
    toggleShell: "border border-neutral-700 bg-neutral-900 shadow-lg shadow-black/30",
    toggleButton: "text-neutral-300 hover:text-white",
    toggleButtonActive: "bg-white text-black shadow-sm",
    uploadBox:
      "bg-neutral-900 border-neutral-500 hover:border-cyan-300 text-center relative group shadow-xl shadow-black/25",
    uploadIcon: "text-neutral-300 group-hover:text-cyan-300",
    uploadTitle: "text-neutral-50",
    uploadText: "text-neutral-300",
    panel: "bg-neutral-900 border border-neutral-700 shadow-2xl shadow-black/35",
    panelTitle: "text-white",
    panelIcon: "text-cyan-300",
    label: "text-neutral-200",
    value: "text-neutral-300",
    helper: "text-neutral-400",
    range: "bg-neutral-600 accent-cyan-400",
    input:
      "bg-neutral-950 border border-neutral-600 text-neutral-100 focus:ring-cyan-400 focus:border-cyan-400",
    button:
      "bg-cyan-400 hover:bg-cyan-300 disabled:bg-neutral-800 disabled:text-neutral-400 text-black shadow-lg shadow-cyan-950/35",
    previewCard: "bg-neutral-900 border border-neutral-700 shadow-2xl shadow-black/30",
    previewTitle: "text-neutral-100",
    previewBadge: "bg-neutral-800 text-neutral-200 border border-neutral-700",
    previewBadgeSuccess: "bg-emerald-500/15 text-emerald-300",
    previewBadgeWarning: "bg-rose-500/15 text-rose-300",
    previewStage: "bg-neutral-950 border border-neutral-700",
    empty: "text-neutral-400",
    processing: "text-neutral-300",
    successCallout:
      "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30",
    warningCallout:
      "text-amber-300 bg-amber-500/10 border border-amber-500/30",
    errorCallout:
      "text-rose-300 bg-rose-500/10 border border-rose-500/30",
    downloadButton:
      "bg-emerald-400 hover:bg-emerald-300 text-black shadow-lg shadow-emerald-950/35",
  },
  white: {
    app: "bg-neutral-50 text-neutral-900",
    title: "text-neutral-950",
    subtitle: "text-neutral-600",
    toggleShell: "border border-neutral-300 bg-white/90 shadow-sm",
    toggleButton: "text-neutral-500 hover:text-neutral-950",
    toggleButtonActive: "bg-neutral-950 text-white shadow-sm",
    uploadBox:
      "bg-white border-neutral-300 hover:border-neutral-950 text-center relative group shadow-sm",
    uploadIcon: "text-neutral-500 group-hover:text-neutral-950",
    uploadTitle: "text-neutral-900",
    uploadText: "text-neutral-600",
    panel: "bg-white border border-neutral-200 shadow-xl shadow-neutral-200/80",
    panelTitle: "text-neutral-950",
    panelIcon: "text-neutral-950",
    label: "text-neutral-800",
    value: "text-neutral-600",
    helper: "text-neutral-500",
    range: "bg-neutral-200 accent-neutral-950",
    input:
      "bg-white border border-neutral-300 text-neutral-900 focus:ring-neutral-950 focus:border-neutral-950",
    button:
      "bg-neutral-950 hover:bg-black disabled:bg-neutral-200 disabled:text-neutral-500 text-white shadow-lg shadow-neutral-300/80",
    previewCard: "bg-white border border-neutral-200 shadow-xl shadow-neutral-200/70",
    previewTitle: "text-neutral-800",
    previewBadge: "bg-neutral-100 text-neutral-700",
    previewBadgeSuccess: "bg-emerald-100 text-emerald-700",
    previewBadgeWarning: "bg-rose-100 text-rose-700",
    previewStage: "bg-neutral-50 border border-neutral-200",
    empty: "text-neutral-400",
    processing: "text-neutral-600",
    successCallout:
      "text-emerald-700 bg-emerald-50 border border-emerald-200",
    warningCallout:
      "text-amber-700 bg-amber-50 border border-amber-200",
    errorCallout: "text-rose-700 bg-rose-50 border border-rose-200",
    downloadButton:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200",
  },
};

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "black";
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "white" || savedTheme === "black") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "black"
    : "white";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [libError, setLibError] = useState(null);

  const styles = THEMES[theme];

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "black" ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
    <div className={`min-h-screen p-6 font-sans transition-colors ${styles.app}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1
              className={`text-3xl font-bold flex items-center justify-center gap-3 sm:justify-start ${styles.title}`}
            >
              <img
                src="/favicon.svg"
                alt="GAC logo"
                className="h-11 w-11 rounded-2xl shadow-lg shadow-cyan-950/40 ring-1 ring-white/10"
              />
              GAC - GIF Animation Compressor v1.0.0
            </h1>
            <p className={`mt-2 ${styles.subtitle}`}>
              Reduce your GIF animation file size directly in your browser.
            </p>
          </div>

          <div className="flex justify-center sm:justify-end">
            <div className={`inline-flex rounded-full p-1 ${styles.toggleShell}`}>
              <button
                type="button"
                onClick={() => setTheme("white")}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${theme === "white" ? styles.toggleButtonActive : styles.toggleButton}`}
                aria-pressed={theme === "white"}
              >
                <SunMedium className="h-4 w-4" />
                White
              </button>
              <button
                type="button"
                onClick={() => setTheme("black")}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${theme === "black" ? styles.toggleButtonActive : styles.toggleButton}`}
                aria-pressed={theme === "black"}
              >
                <Moon className="h-4 w-4" />
                Black
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Box */}
            <div
              className={`p-6 rounded-xl border-2 border-dashed transition-colors ${styles.uploadBox}`}
            >
              <input
                type="file"
                accept="image/gif"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${styles.uploadIcon}`} />
              <h3 className={`font-semibold ${styles.uploadTitle}`}>Upload GIF</h3>
              <p className={`text-sm mt-1 ${styles.uploadText}`}>
                Drag & drop or click to select
              </p>
            </div>

            {/* Settings Panel */}
            <div className={`p-6 rounded-xl ${styles.panel}`}>
              <h3 className={`font-semibold flex items-center gap-2 mb-4 ${styles.panelTitle}`}>
                <Settings className={`w-5 h-5 ${styles.panelIcon}`} />
                Compression Settings
              </h3>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className={`text-sm font-medium ${styles.label}`}>
                      Resolution Scale
                    </label>
                    <span className={`text-sm ${styles.value}`}>
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
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${styles.range}`}
                  />
                  <p className={`text-xs mt-1 ${styles.helper}`}>
                    Shrinking dimensions saves the most space.
                  </p>
                </div>

                <div>
                  <label className={`text-sm font-medium block mb-2 ${styles.label}`}>
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
                    className={`w-full text-sm rounded-lg p-2.5 block ${styles.input}`}
                  >
                    <option value={1}>Keep all frames (Smoothest)</option>
                    <option value={2}>Keep half (Drop every other)</option>
                    <option value={3}>Keep third (Drop 2 out of 3)</option>
                    <option value={4}>Keep quarter (Choppy, smallest)</option>
                  </select>
                </div>

                <div>
                  <label className={`text-sm font-medium block mb-2 ${styles.label}`}>
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
                    className={`w-full text-sm rounded-lg p-2.5 block ${styles.input}`}
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
                <div className={`mt-4 flex items-start gap-2 text-sm p-3 rounded ${styles.errorCallout}`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{libError}</p>
                </div>
              )}

              <button
                onClick={compressGIF}
                disabled={!file || isProcessing || !scriptsLoaded || !!libError}
                className={`w-full mt-6 disabled:cursor-not-allowed font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${styles.button}`}
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
              <div className={`p-4 rounded-xl flex flex-col h-full min-h-[300px] ${styles.previewCard}`}>
                <h3 className={`font-semibold mb-2 flex justify-between items-center ${styles.previewTitle}`}>
                  Original
                  {originalSize > 0 && (
                    <span className={`text-xs px-2 py-1 rounded ${styles.previewBadge}`}>
                      {formatBytes(originalSize)}
                    </span>
                  )}
                </h3>
                <div
                  className={`flex-1 rounded-lg flex items-center justify-center overflow-hidden p-2 ${styles.previewStage}`}
                >
                  {originalUrl ? (
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="max-w-full max-h-[350px] object-contain"
                    />
                  ) : (
                    <p className={`text-sm ${styles.empty}`}>No image uploaded</p>
                  )}
                </div>
              </div>

              {/* Compressed Preview */}
              <div className={`p-4 rounded-xl flex flex-col h-full min-h-[300px] ${styles.previewCard}`}>
                <h3 className={`font-semibold mb-2 flex justify-between items-center ${styles.previewTitle}`}>
                  Compressed Result
                  {compressedSize > 0 && (
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${compressedSize <= 256000 ? styles.previewBadgeSuccess : styles.previewBadgeWarning}`}
                    >
                      {formatBytes(compressedSize)}
                    </span>
                  )}
                </h3>
                <div
                  className={`flex-1 rounded-lg flex items-center justify-center overflow-hidden p-2 relative ${styles.previewStage}`}
                >
                  {compressedUrl ? (
                    <img
                      src={compressedUrl}
                      alt="Compressed"
                      className="max-w-full max-h-[350px] object-contain"
                    />
                  ) : isProcessing ? (
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                      <p className={`text-sm ${styles.processing}`}>
                        Working magic...
                      </p>
                    </div>
                  ) : (
                    <p className={`text-sm ${styles.empty}`}>
                      Waiting to compress...
                    </p>
                  )}
                </div>

                {/* Result Feedback & Download */}
                {compressedSize > 0 && (
                  <div className="mt-4 space-y-3">
                    {compressedSize <= 256000 ? (
                      <div className={`flex items-center gap-2 text-sm p-2 rounded ${styles.successCallout}`}>
                        <CheckCircle className="w-4 h-4" /> Success! It's under
                        256 KB.
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 text-sm p-2 rounded ${styles.warningCallout}`}>
                        <AlertCircle className="w-4 h-4" /> Still over 256 KB.
                        Try lower resolution or dropping more frames.
                      </div>
                    )}

                    <a
                      href={compressedUrl}
                      download="compressed_animation.gif"
                      className={`w-full block text-center font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${styles.downloadButton}`}
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
