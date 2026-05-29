import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Scissors,
  Download,
  ImageIcon,
  ZoomIn,
  Circle,
  X,
  CheckCircle2,
  Loader2,
  Grid3X3,
  ChevronRight,
} from "lucide-react";
import { processImage, type ProcessResult } from "@/lib/imageProcessor";
import { downloadAsZip, downloadSingle } from "@/lib/zipDownload";
import { toast } from "sonner";

/* ─── Reusable Ice-Blue Tech UI Primitives ───────────────────────────── */

function NeonDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent blur-sm" />
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-blue-500" />
      <span className="text-xs font-orbitron tracking-[0.2em] uppercase text-blue-500/80">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-blue-400/30 to-transparent" />
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
  cyan = false,
}: {
  children: React.ReactNode;
  className?: string;
  cyan?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-lg overflow-hidden
        bg-white/80 backdrop-blur-xl
        border transition-all duration-300
        ${cyan
          ? "border-cyan-400/40 shadow-[0_0_20px_oklch(0.6_0.18_195/0.12),0_4px_20px_oklch(0.52_0.22_240/0.06),inset_0_1px_0_oklch(1_0_0/0.9)]"
          : "border-blue-300/40 shadow-[0_0_20px_oklch(0.52_0.22_240/0.08),0_4px_20px_oklch(0.52_0.22_240/0.05),inset_0_1px_0_oklch(1_0_0/0.9)]"
        }
        ${className}
      `}
    >
      {/* Top edge glow */}
      <div
        className={`absolute top-0 left-0 right-0 h-px ${cyan
          ? "bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
          : "bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
        }`}
      />
      {children}
    </div>
  );
}

function NeonButton({
  onClick,
  disabled,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "cyan" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition-all duration-200 overflow-hidden rounded select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-sm" };
  const variants = {
    primary: disabled
      ? "bg-blue-100 text-blue-300 border border-blue-200 cursor-not-allowed"
      : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400/50 shadow-[0_0_16px_oklch(0.52_0.22_240/0.35)] hover:shadow-[0_0_24px_oklch(0.52_0.22_240/0.5)] hover:from-blue-400 hover:to-blue-500 active:scale-[0.98] cursor-pointer",
    cyan: disabled
      ? "bg-cyan-50 text-cyan-300 border border-cyan-200 cursor-not-allowed"
      : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border border-cyan-400/50 shadow-[0_0_16px_oklch(0.6_0.18_195/0.35)] hover:shadow-[0_0_24px_oklch(0.6_0.18_195/0.5)] hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] cursor-pointer",
    ghost: disabled
      ? "text-blue-300 border border-blue-200 cursor-not-allowed"
      : "text-blue-600 border border-blue-300/50 hover:border-blue-400/70 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98] cursor-pointer",
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {!disabled && variant !== "ghost" && (
        <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20 pointer-events-none" />
      )}
      {children}
    </button>
  );
}

function ToggleRow({
  id,
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 p-1 rounded ${checked ? "bg-blue-100 text-blue-500" : "bg-slate-100 text-slate-400"} transition-colors`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer leading-tight">
            {label}
          </Label>
          <p className="text-xs text-slate-400 mt-0.5 leading-tight">{desc}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-blue-500 shrink-0 mt-0.5"
      />
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */

export default function Home() {
  const [, setLocation] = useLocation();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(3);

  // Custom grid line positions as fractions (0-1). Length = cols-1 / rows-1.
  const [customColPos, setCustomColPos] = useState<number[]>(() =>
    Array.from({ length: 3 }, (_, i) => (i + 1) / 4)
  );
  const [customRowPos, setCustomRowPos] = useState<number[]>(() =>
    Array.from({ length: 2 }, (_, i) => (i + 1) / 3)
  );
  const [draggingLine, setDraggingLine] = useState<{ axis: 'col' | 'row'; index: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [removeHoles, setRemoveHoles] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(30);
  const [borderWidth, setBorderWidth] = useState(5);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [results, setResults] = useState<ProcessResult[]>([]);

  // Recalculate img rendered rect whenever cols/rows change or image loads
  const updateImgRect = useCallback(() => {
    const img = previewImgRef.current;
    if (!img) return;
    const container = img.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const imgRenderedRect = img.getBoundingClientRect();
    setImgRect({
      top: imgRenderedRect.top - containerRect.top,
      left: imgRenderedRect.left - containerRect.left,
      width: imgRenderedRect.width,
      height: imgRenderedRect.height,
    });
  }, []);

  useEffect(() => {
    if (!previewUrl) { setImgRect(null); return; }
    // Recalculate on window resize
    window.addEventListener('resize', updateImgRect);
    return () => window.removeEventListener('resize', updateImgRect);
  }, [previewUrl, updateImgRect]);

  // Reset custom positions when cols/rows change
  useEffect(() => {
    setCustomColPos(Array.from({ length: cols - 1 }, (_, i) => (i + 1) / cols));
  }, [cols]);
  useEffect(() => {
    setCustomRowPos(Array.from({ length: rows - 1 }, (_, i) => (i + 1) / rows));
  }, [rows]);

  // Also recalculate when cols/rows change
  useEffect(() => {
    if (previewUrl) updateImgRect();
  }, [cols, rows, previewUrl, updateImgRect]);

  // Drag handlers for grid lines
  const handleLineDragStart = (axis: 'col' | 'row', index: number) => {
    setDraggingLine({ axis, index });
  };

  // Shared move logic (used by both mouse and touch)
  const applyDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!draggingLine || !imgRect) return;
    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (draggingLine.axis === 'col') {
      const relX = clientX - rect.left - imgRect.left;
      const frac = Math.min(Math.max(relX / imgRect.width, 0.02), 0.98);
      setCustomColPos(prev => {
        const next = [...prev];
        const lo = draggingLine.index > 0 ? prev[draggingLine.index - 1] + 0.01 : 0.01;
        const hi = draggingLine.index < prev.length - 1 ? prev[draggingLine.index + 1] - 0.01 : 0.99;
        next[draggingLine.index] = Math.min(Math.max(frac, lo), hi);
        return next;
      });
    } else {
      const relY = clientY - rect.top - imgRect.top;
      const frac = Math.min(Math.max(relY / imgRect.height, 0.02), 0.98);
      setCustomRowPos(prev => {
        const next = [...prev];
        const lo = draggingLine.index > 0 ? prev[draggingLine.index - 1] + 0.01 : 0.01;
        const hi = draggingLine.index < prev.length - 1 ? prev[draggingLine.index + 1] - 0.01 : 0.99;
        next[draggingLine.index] = Math.min(Math.max(frac, lo), hi);
        return next;
      });
    }
  }, [draggingLine, imgRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    applyDragPosition(e.clientX, e.clientY);
  }, [applyDragPosition]);

  const handleMouseUp = useCallback(() => {
    setDraggingLine(null);
  }, []);

  // Touch handlers
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingLine) return;
    e.preventDefault(); // prevent page scroll while dragging
    const touch = e.touches[0];
    if (touch) applyDragPosition(touch.clientX, touch.clientY);
  }, [draggingLine, applyDragPosition]);

  const handleTouchEnd = useCallback(() => {
    setDraggingLine(null);
  }, []);

  const resetGridLines = () => {
    setCustomColPos(Array.from({ length: cols - 1 }, (_, i) => (i + 1) / cols));
    setCustomRowPos(Array.from({ length: rows - 1 }, (_, i) => (i + 1) / rows));
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error("僅支援 JPG 和 PNG 格式");
      return;
    }
    setUploadedFile(file);
    setResults([]);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleProcess = async () => {
    if (!uploadedFile) { toast.error("請先上傳圖片"); return; }
    if (cols < 1 || rows < 1) { toast.error("行列數必須大於 0"); return; }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const processed = await processImage(
        uploadedFile,
        { cols, rows, autoCenter, forceSquare: true, removeHoles, bgTolerance, borderWidth,
          customColPositions: customColPos,
          customRowPositions: customRowPos,
        },
        (current, total) => {
          setProgress(Math.round((current / total) * 100));
          setProgressText(`${current} / ${total}`);
        }
      );
      setResults(processed);
      toast.success(`成功裁切 ${processed.length} 張貼圖！`);
    } catch (err) {
      console.error(err);
      toast.error("處理失敗，請確認圖片格式");
    } finally {
    // Note: no setSelectedResult needed
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleDownloadAll = async () => {
    if (!results.length) return;
    toast.info("正在打包 ZIP…");
    try {
      await downloadAsZip(
        results.map((r) => ({
          dataUrl: r.dataUrl,
          filename: `sticker_${String(r.index + 1).padStart(2, "0")}.png`,
        })),
        "line_stickers.zip"
      );
      toast.success("ZIP 下載完成！");
    } catch { toast.error("下載失敗，請重試"); }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    setResults([]);
    setImgRect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen wakanda-bg text-foreground">

      {/* ── Header ── */}
      <header className="relative border-b border-blue-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-20">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        <div className="container py-3 flex items-center gap-4">
          {/* Logo mark */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="262 Academy" className="h-10 w-auto" />
          </div>

          <div className="h-6 w-px bg-blue-200" />

          <h1 className="font-orbitron text-base font-bold tracking-wider text-slate-700">
            LINE 貼圖裁切去背神器
          </h1>

          {/* Right decorative elements */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setLocation("/analytics")}
              className="hidden sm:flex items-center gap-1.5 text-xs text-blue-400/70 font-mono hover:text-blue-500 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM ONLINE
            </button>
            <div className="hidden sm:flex gap-1 items-end">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 bg-blue-300/60 rounded-full" style={{ height: `${8 + i * 4}px` }} />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="border-b border-blue-100 bg-blue-50/50">
        <div className="container py-2 flex items-center gap-2 text-xs text-blue-400/60 font-mono">
          <ChevronRight className="w-3 h-3" />
          <span>上傳圖片</span>
          <ChevronRight className="w-3 h-3" />
          <span>設定參數</span>
          <ChevronRight className="w-3 h-3" />
          <span className={results.length > 0 ? "text-cyan-500/80" : ""}>裁切去背</span>
          <ChevronRight className="w-3 h-3" />
          <span className={results.length > 0 ? "text-emerald-500/80" : ""}>下載貼圖</span>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">

          {/* ── Left Panel ── */}
          <div className="flex flex-col gap-4">

            {/* Upload */}
            <GlassPanel>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel icon={Upload} label="圖片上傳" />
                  {uploadedFile && (
                    <button
                      onClick={clearUpload}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors font-mono"
                    >
                      <X className="w-3 h-3" /> 清除
                    </button>
                  )}
                </div>

                {/* Drop zone — always visible */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-all duration-300 overflow-hidden select-none
                    ${isDragging
                      ? "border-blue-400/80 bg-blue-50/80"
                      : uploadedFile
                        ? "border-blue-300/60 bg-blue-50/30 hover:border-blue-400/60"
                        : "border-blue-200/70 hover:border-blue-300/80 hover:bg-blue-50/40"
                    }
                  `}
                >
                  {isDragging && <div className="scan-line" />}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400/50" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400/50" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400/50" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400/50" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-blue-500" />
                    </div>
                    {uploadedFile ? (
                      <>
                        <p className="font-semibold text-blue-600 text-xs font-mono truncate max-w-[200px] mx-auto">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">點擊重新上傳</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-600 text-sm">上傳圖片</p>
                        <p className="text-xs text-blue-400/80 mt-0.5 font-mono">JPG / PNG</p>
                        <p className="text-xs text-slate-400">點擊或拖拽上傳</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Preview with draggable grid overlay — shown after upload */}
                {previewUrl && (
                  <div
                    ref={previewContainerRef}
                    className="mt-3 relative rounded-lg overflow-hidden border border-blue-200/60 select-none"
                    style={{ cursor: draggingLine ? (draggingLine.axis === 'col' ? 'col-resize' : 'row-resize') : 'default' }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <img
                      ref={previewImgRef}
                      src={previewUrl}
                      alt="預覽"
                      className="w-full object-contain block"
                      onLoad={updateImgRect}
                      draggable={false}
                    />
                    {imgRect && (
                      <div
                        className="absolute pointer-events-none"
                        style={{ top: imgRect.top, left: imgRect.left, width: imgRect.width, height: imgRect.height }}
                      >
                        {/* Draggable vertical lines */}
                        {customColPos.map((frac, i) => (
                          <div
                            key={`v${i}`}
                            className="absolute top-0 bottom-0 pointer-events-auto group"
                            style={{ left: `${frac * 100}%`, width: '20px', transform: 'translateX(-10px)', cursor: 'col-resize', touchAction: 'none' }}
                            onMouseDown={(e) => { e.preventDefault(); handleLineDragStart('col', i); }}
                            onTouchStart={(e) => { e.stopPropagation(); handleLineDragStart('col', i); }}
                          >
                            <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${
                              draggingLine?.axis === 'col' && draggingLine.index === i
                                ? 'bg-cyan-400 shadow-[0_0_6px_oklch(0.6_0.18_195/0.8)]'
                                : 'bg-blue-500/60 group-hover:bg-cyan-400/80'
                            }`} />
                            {/* Position tooltip on drag */}
                            {draggingLine?.axis === 'col' && draggingLine.index === i && (
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap z-10">
                                {Math.round(frac * 100)}%
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Draggable horizontal lines */}
                        {customRowPos.map((frac, i) => (
                          <div
                            key={`h${i}`}
                            className="absolute left-0 right-0 pointer-events-auto group"
                            style={{ top: `${frac * 100}%`, height: '20px', transform: 'translateY(-10px)', cursor: 'row-resize', touchAction: 'none' }}
                            onMouseDown={(e) => { e.preventDefault(); handleLineDragStart('row', i); }}
                            onTouchStart={(e) => { e.stopPropagation(); handleLineDragStart('row', i); }}
                          >
                            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 transition-colors ${
                              draggingLine?.axis === 'row' && draggingLine.index === i
                                ? 'bg-cyan-400 shadow-[0_0_6px_oklch(0.6_0.18_195/0.8)]'
                                : 'bg-blue-500/60 group-hover:bg-cyan-400/80'
                            }`} />
                            {draggingLine?.axis === 'row' && draggingLine.index === i && (
                              <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap z-10">
                                {Math.round(frac * 100)}%
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="absolute inset-0 border border-blue-400/40 pointer-events-none" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                      <button
                        onClick={resetGridLines}
                        className="bg-white/80 text-blue-500 text-[9px] font-mono px-1.5 py-0.5 rounded border border-blue-200/60 backdrop-blur-sm hover:bg-blue-50 transition-colors"
                        title="重置格線為等分"
                      >
                        重置
                      </button>
                      <div className="bg-white/80 text-blue-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-200/60 backdrop-blur-sm">
                        {cols}×{rows} = {cols * rows}
                      </div>
                    </div>
                    {/* Drag hint */}
                    {!draggingLine && imgRect && (
                      <div className="absolute bottom-1.5 left-1.5 bg-white/70 text-slate-400 text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm">
                        拖拽格線可調整裁切位置
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
              </div>
            </GlassPanel>

            {/* Parameters */}
            <GlassPanel>
              <div className="p-4">
                <SectionLabel icon={Grid3X3} label="參數設定" />

                {/* Grid layout */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs text-slate-500 font-mono">排列方式</span>
                    <span className="text-xs font-mono text-blue-400/80 ml-auto">
                      {cols} × {rows} = <span className="text-cyan-500 font-bold">{cols * rows}</span> 張
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-blue-400/70 font-mono uppercase tracking-wider block mb-1">
                        Cols
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        value={cols}
                        onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="text-center font-mono bg-blue-50/60 border-blue-200 text-slate-700 focus:border-blue-400 h-9"
                      />
                    </div>
                    <span className="text-blue-300 font-bold mb-2 text-sm">×</span>
                    <div>
                      <label className="text-[10px] text-blue-400/70 font-mono uppercase tracking-wider block mb-1">
                        Rows
                      </label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        className="text-center font-mono bg-blue-50/60 border-blue-200 text-slate-700 focus:border-blue-400 h-9"
                      />
                    </div>
                  </div>
                </div>

                <NeonDivider className="mb-4" />

                {/* Toggles */}
                <div className="flex flex-col divide-y divide-blue-100">
                  <ToggleRow
                    id="autoCenter"
                    icon={ZoomIn}
                    label="自動置中"
                    desc="去除多餘空白，將貼圖移至中央"
                    checked={autoCenter}
                    onChange={setAutoCenter}
                  />
                  <ToggleRow
                    id="removeHoles"
                    icon={Circle}
                    label="去除內部孔洞"
                    desc="若眼睛/牙齒被誤刪請關閉"
                    checked={removeHoles}
                    onChange={setRemoveHoles}
                  />
                </div>

                <NeonDivider className="my-4" />

                {/* Sliders */}
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">去背容許值</span>
                      <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {bgTolerance}
                      </span>
                    </div>
                    <Slider
                      min={0} max={100} step={1}
                      value={[bgTolerance]}
                      onValueChange={([v]) => setBgTolerance(v)}
                      className="[&_[data-slot=slider-track]]:bg-blue-100 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-blue-400 [&_[data-slot=slider-range]]:to-blue-500 [&_[data-slot=slider-thumb]]:border-blue-400 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_oklch(0.52_0.22_240/0.4)]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>PRECISE</span><span>LOOSE</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600">白邊寬度</span>
                      <span className="font-mono text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {borderWidth}px
                      </span>
                    </div>
                    <Slider
                      min={0} max={40} step={1}
                      value={[borderWidth]}
                      onValueChange={([v]) => setBorderWidth(v)}
                      className="[&_[data-slot=slider-track]]:bg-cyan-100 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-cyan-400 [&_[data-slot=slider-range]]:to-blue-400 [&_[data-slot=slider-thumb]]:border-cyan-400 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-[0_0_8px_oklch(0.6_0.18_195/0.4)]"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>0px</span><span>40px</span>
                    </div>
                  </div>
                </div>

                <NeonDivider className="my-4" />

                {/* Action button */}
                <NeonButton
                  onClick={handleProcess}
                  disabled={!uploadedFile || isProcessing}
                  variant="primary"
                  size="lg"
                  className="w-full font-orbitron tracking-widest"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>處理中 {progressText}</span>
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4" />
                      <span>開始製作</span>
                    </>
                  )}
                </NeonButton>

                {isProcessing && (
                  <div className="mt-3">
                    <Progress
                      value={progress}
                      className="h-1.5 bg-blue-100 [&>div]:bg-gradient-to-r [&>div]:from-blue-400 [&>div]:to-cyan-400 [&>div]:shadow-[0_0_8px_oklch(0.52_0.22_240/0.4)]"
                    />
                    <p className="text-center text-[10px] text-blue-400/60 font-mono mt-1">
                      PROCESSING... {progress}%
                    </p>
                  </div>
                )}
              </div>
            </GlassPanel>
          </div>

          {/* ── Right Panel ── */}
          <div className="flex flex-col gap-4">
            <GlassPanel className="flex-1">
              <div className="p-5">
                {results.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <div className="relative w-20 h-20 mx-auto mb-5">
                      <div className="absolute inset-0 hex-clip bg-blue-100/80" />
                      <div className="absolute inset-2 hex-clip bg-blue-50/60" />
                      <ImageIcon className="absolute inset-0 m-auto w-9 h-9 text-blue-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-mono tracking-wider">AWAITING PROCESS</p>
                    <p className="text-xs text-blue-300 mt-1">
                      {previewUrl ? "設定參數後點擊「開始製作」" : "請先在左側上傳圖片"}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Result header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-semibold text-slate-700 text-base">處理結果</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 ml-6">已生成 {results.length} 張貼圖</p>
                      </div>
                      <NeonButton onClick={handleDownloadAll} variant="cyan" size="sm">
                        <Download className="w-3.5 h-3.5" />
                        全部下載 ZIP
                      </NeonButton>
                    </div>

                    {/* Sticker grid — each card with download button */}
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${Math.min(cols, 6)}, minmax(0, 1fr))` }}
                    >
                      {results.map((r) => (
                        <div
                          key={r.index}
                          className="group flex flex-col rounded-lg overflow-hidden border border-blue-100 hover:border-blue-300/60 transition-all duration-200 hover:shadow-[0_0_12px_oklch(0.52_0.22_240/0.12)] bg-white/60"
                        >
                          {/* Sticker image */}
                          <div className="checkerboard flex items-center justify-center p-2 aspect-square">
                            <img
                              src={r.dataUrl}
                              alt={`貼圖 ${r.index + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {/* Download button */}
                          <button
                            onClick={() => downloadSingle(r.dataUrl, `sticker_${String(r.index + 1).padStart(2, "0")}.png`)}
                            className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-mono text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors border-t border-blue-100"
                          >
                            <Download className="w-2.5 h-2.5" />
                            #{String(r.index + 1).padStart(2, "0")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-blue-100 mt-4">
        <div className="container py-3 flex items-center justify-between text-[10px] font-mono text-blue-300/60">
          <span>STICKER MAGIC // ICE BLUE TECH EDITION</span>
          <span>ALL PROCESSING DONE CLIENT-SIDE</span>
        </div>
      </footer>
    </div>
  );
}
