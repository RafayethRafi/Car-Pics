import { useState, useRef, useEffect } from "react";
import StyleCarousel from "./components/StyleCarousel";

const API_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/generate`;
const MAX_MB = 7;

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [styleKey, setStyleKey] = useState("none");

  // Google API key at TOP (optional)
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [respText, setRespText] = useState("");
  const [respImages, setRespImages] = useState([]); // backend returns an array; we'll use [0]
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Persist style + key
  useEffect(() => {
    const savedStyle = localStorage.getItem("styleKey");
    const savedKey = localStorage.getItem("googleApiKey");
    if (savedStyle) setStyleKey(savedStyle);
    if (savedKey) setApiKey(savedKey);
  }, []);
  useEffect(() => localStorage.setItem("styleKey", styleKey), [styleKey]);
  useEffect(() => {
    if (apiKey) localStorage.setItem("googleApiKey", apiKey);
    else localStorage.removeItem("googleApiKey");
  }, [apiKey]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onFileChange = (e) => {
    setError("");
    const f = e.target.files?.[0];
    if (!f) { setFile(null); setPreview(null); return; }
    if (!f.type.startsWith("image/")) { setError("Please select a valid image."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`Image must be ≤ ${MAX_MB}MB.`); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please drop a valid image."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`Image must be ≤ ${MAX_MB}MB.`); return; }
    setError(""); setFile(f); setPreview(URL.createObjectURL(f));
  };
  const onDragOver = (e) => e.preventDefault();

  const clearImage = () => {
    setFile(null); setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setPrompt(""); clearImage();
    setRespText(""); setRespImages([]); setError("");
  };

  const submit = async () => {
    setError("");
    if (!prompt.trim()) { setError("Please enter a prompt."); return; }
    setLoading(true); setRespText(""); setRespImages([]);

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("style", styleKey);
    if (apiKey.trim()) form.append("api_key", apiKey.trim());
    if (file) form.append("image", file);

    try {
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRespText(data.text || "");
      setRespImages(Array.isArray(data.images) ? data.images : []);
      setTimeout(() => {
        document.getElementById("output-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // --- DOWNLOAD MAIN IMAGE (always the first one) ---
  const mainImage = respImages?.[0] || null;
  const downloadMainImage = async () => {
    if (!mainImage?.data_url) return;
    const res = await fetch(mainImage.data_url);
    const blob = await res.blob();
    const ext = (mainImage.mime_type?.split("/")?.[1] || "png").replace("+xml", "");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    a.href = url;
    a.download = `car-pics-${styleKey}-${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-zinc-950 to-black text-white relative">
      {/* soft background glow */}
      <div className="absolute inset-x-0 -top-24 h-72 pointer-events-none blur-3xl"
           style={{ background: "radial-gradient(600px 180px at 20% 20%, rgba(99,102,241,.35), transparent 60%), radial-gradient(600px 180px at 80% 0%, rgba(250,204,21,.28), transparent 60%)" }} />

      {/* Top bar with logo + API key */}
      <div className="sticky top-0 z-30 border-b border-white/5 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/car-pics-logo.png"
              alt="Car Pics"
              className="w-8 h-8 md:w-9 md:h-9"
            />
            <div className="font-extrabold tracking-tight text-lg md:text-xl">
              Car Pics
              <span className="ml-2 text-xs font-semibold text-yellow-300/90 bg-yellow-300/10 px-2 py-0.5 rounded-full border border-yellow-300/20">
                Image Studio
              </span>
            </div>
          </div>

{/* API Key input on top */}
<div className="flex flex-col gap-1.5 w-full md:w-auto">
  <div className="flex flex-wrap md:flex-nowrap items-stretch gap-2">
    <input
      type={showKey ? "text" : "password"}
      autoComplete="off"
      spellCheck={false}
      placeholder="Google API Key"
      className="flex-1 min-w-[220px] md:w-[420px] px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      aria-label="Google API Key"
    />

    {/* Link to get an API key */}
    <a
      href="https://aistudio.google.com/apikey"
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-sm flex items-center gap-1"
      title="Open Google AI Studio in a new tab"
    >
      Get a key
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3.5 h-3.5 opacity-80"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z" />
        <path d="M5 5h6v2H7v10h10v-4h2v6H5V5z" />
      </svg>
    </a>

    <button
      onClick={() => setShowKey(v => !v)}
      className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-sm"
      aria-label="Toggle key visibility"
    >
      {showKey ? "Hide" : "Show"}
    </button>
  </div>

  {/* Helper text under the input row */}
  <p className="text-[11px] md:text-xs text-zinc-400">
    You can get your Google API key from{" "}
    <a
      href="https://aistudio.google.com/apikey"
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
    >
      Google AI Studio
    </a>{" "}
    and paste it in the box above.
  </p>
</div>

        </div>
      </div>

      {/* Main */}
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Create. Edit. Stylize.
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base">
            Text is required, image optional. Pick a photography mode below and generate crisp results.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* INPUT CARD */}
          <section className="relative overflow-hidden bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Prompt */}
            <label className="block text-xs sm:text-sm mb-2 text-zinc-300">
              Prompt <span className="text-zinc-500">(required)</span>
            </label>
            <textarea
              className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
              placeholder="Describe what to create or how to edit the image…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            {/* Style Carousel */}
            <div className="mt-4 sm:mt-5">
              <StyleCarousel value={styleKey} onChange={setStyleKey} title="Photography modes" />
            </div>

            {/* Image Picker */}
            <div className="mt-4 sm:mt-6">
              <label className="block text-xs sm:text-sm mb-2 text-zinc-300">Optional reference image</label>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                className="rounded-2xl border-2 border-dashed border-zinc-700 hover:border-indigo-500 transition-colors p-4 sm:p-6 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label="Upload image"
              >
                {preview ? (
                  <figure className="space-y-2">
                    <img
                      src={preview}
                      alt="Selected"
                      className="mx-auto rounded-xl object-contain max-h-56 sm:max-h-72 w-full"
                    />
                    <figcaption className="text-xs sm:text-sm text-zinc-400 truncate">{file?.name}</figcaption>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-center">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); clearImage(); }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
                      >
                        Remove image
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold"
                      >
                        Replace
                      </button>
                    </div>
                  </figure>
                ) : (
                  <div className="text-zinc-400">
                    <div className="text-sm sm:text-base">Tap to upload (or drag & drop)</div>
                    <div className="text-xs mt-1">PNG / JPG / WEBP up to ~{MAX_MB}MB</div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              {/* Actions */}
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 font-semibold shadow text-sm sm:text-base"
                >
                  {loading ? "Generating…" : "Generate"}
                </button>
                <button
                  onClick={reset}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-60 text-sm sm:text-base"
                >
                  Reset
                </button>
              </div>

              {error && (
                <div className="mt-3 text-red-300 bg-red-950/40 border border-red-900 px-3 py-2 rounded-lg text-sm" role="alert">
                  {error}
                </div>
              )}
            </div>
          </section>

          {/* OUTPUT CARD */}
          <section id="output-panel" className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-semibold">Output</h2>
              <button
                onClick={downloadMainImage}
                disabled={!mainImage || loading}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-semibold text-sm shadow"
                title="Download generated image"
              >
                Download
              </button>
            </div>

            {loading && (
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />
                <div className="h-24 rounded-xl bg-zinc-800 animate-pulse" />
                <div className="h-40 rounded-xl bg-zinc-800 animate-pulse" />
              </div>
            )}

            {!loading && (!respText && !mainImage) && (
              <div className="text-zinc-500 text-sm sm:text-base">Your results will appear here.</div>
            )}

            {/* Text */}
            {respText && (
              <div className="prose prose-invert max-w-none">
                <h3 className="text-sm sm:text-base font-semibold mt-2 mb-1">Text</h3>
                <p className="whitespace-pre-wrap bg-zinc-800/60 border border-zinc-700 p-3 sm:p-4 rounded-xl text-sm sm:text-base" aria-live="polite">
                  {respText}
                </p>
              </div>
            )}

            {/* Single image viewer + download button (always first image) */}
            {mainImage && (
              <div className="mt-4">
                <div className="rounded-xl overflow-hidden border border-zinc-700 bg-black">
                  <img
                    src={mainImage.data_url}
                    alt="generated"
                    className="w-full h-auto object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 p-2">
                    <span>{mainImage.mime_type}</span>
                    <button
                      onClick={downloadMainImage}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium text-white"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-8 sm:mt-10 text-[11px] sm:text-xs text-zinc-500">
          <span className="opacity-70">© {new Date().getFullYear()} Car Pics • FastAPI + Vite + Tailwind</span>
        </footer>
      </div>
    </div>
  );
}
