import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  FolderOpen, 
  Camera, 
  Play, 
  Pause,
  ChevronLeft, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  Volume2, 
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  Tv,
  CheckCircle,
  Clock,
  Film,
  FileText,
  Smartphone,
  Cpu,
  ArrowRight,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import waterfallImg from './waterfall.png';
// @ts-ignore
const outputVideo = '';


// Subtitle segments to show lyrics overlaying waterfall video
const sampleSubtitles = [
  "Standing on the edge of the world...",
  "Watching the water crash down below...",
  "We are the dreamers of the night...",
  "Midnight Serenade, singing under starlight..."
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<1 | 2 | 3 | 4>(1);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(102); // 102 seconds = 1:42
  const [selectedQuality, setSelectedQuality] = useState<'Original' | 'HD'>('Original');
  const [selectedFormat, setSelectedFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [videoDuration, setVideoDuration] = useState(0);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('Midnight Serenade');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<'landing' | 'mobile' | 'desktop'>('landing');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [subtitleStyle, setSubtitleStyle] = useState({ fontSize: 24, alignment: 'bottom' });
  const [isExporting, setIsExporting] = useState(false);
  const apiBaseUrl = "https://defiance-trustable-washstand.ngrok-free.dev";

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const videoContainerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen changes
  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Sync play/pause with state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeScreen]);

  // Auto-simulation trigger
  const [isSimulating, setIsSimulating] = useState(false);

  // Time formatting helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Video playback simulation (keep for Screen 3)
  useEffect(() => {
    let playbackInterval: any;
    if (activeScreen === 3 && isPlaying) {
      playbackInterval = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= 195) { 
            if (videoRef.current) videoRef.current.currentTime = 0;
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(playbackInterval);
  }, [activeScreen, isPlaying]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);

  const handleUploadClick = async (fileName: string, fileUrl?: string, file?: File) => {
    setSelectedFile(fileName);
    if (fileUrl) setUploadedVideoUrl(fileUrl);
    if (file) setUploadedVideoFile(file);
    setActiveScreen(2);

    if (file) {
      // Fake progress bar while waiting for real API
      setProcessingProgress(5);
      const fakeProgress = setInterval(() => {
        setProcessingProgress(p => p < 90 ? p + 2 : p);
      }, 3000);

      try {
        const formData = new FormData();
        formData.append("video", file);
        formData.append("romanize", "true");

        // Send to real Python backend!
        const response = await fetch(`${apiBaseUrl}/generate`, {
          method: "POST",
          headers: {
            "ngrok-skip-browser-warning": "69420"
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setJobId(data.job_id);
          setSegments(data.segments);

          // Fetch video as blob with ngrok header (video tag can't send custom headers)
          const videoResp = await fetch(apiBaseUrl + data.video_url, {
            headers: { "ngrok-skip-browser-warning": "69420" }
          });
          const videoBlob = await videoResp.blob();
          const localVideoUrl = URL.createObjectURL(videoBlob);
          setUploadedVideoUrl(localVideoUrl);
          
          clearInterval(fakeProgress);
          setProcessingProgress(100);
          
          setTimeout(() => setActiveScreen(3), 800);
        } else {
          console.error("Backend error");
          clearInterval(fakeProgress);
          triggerToast("Processing failed. Please check backend logs.");
        }
      } catch (err) {
        console.error(err);
        clearInterval(fakeProgress);
        triggerToast("Network Error connecting to backend.");
      }
    }
  };

  const getFileSize = () => {
    // Rough estimate: Original ~same as input, HD adds ~40% for re-encoding
    const base = selectedQuality === 'HD' ? 58.4 : 42.8;
    if (selectedFormat === 'MOV') return (base * 1.35).toFixed(1);
    return base.toFixed(1);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    if (!jobId) return;
    setIsExporting(true);
    setActiveScreen(4); // Jump to export screen immediately
    triggerToast("Burning final subtitles... Please wait!");
    
    try {
      const response = await fetch(`${apiBaseUrl}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          segments: segments,
          font_size: subtitleStyle.fontSize,
          alignment: subtitleStyle.alignment === 'top' ? 8 : subtitleStyle.alignment === 'middle' ? 5 : 2
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Fetch exported video as blob (ngrok header needed)
        const vResp = await fetch(apiBaseUrl + data.video_url, {
          headers: { "ngrok-skip-browser-warning": "69420" }
        });
        const vBlob = await vResp.blob();
        const blobUrl = URL.createObjectURL(vBlob);
        setExportedBlobUrl(blobUrl);
        setUploadedVideoUrl(blobUrl);
        triggerToast("Export successful! Ready to share.");
        setIsExporting(false);
      } else {
        triggerToast("Export failed on server!");
        setIsExporting(false);
      }
    } catch(e) {
      triggerToast("Network error during export.");
      setIsExporting(false);
    }
  };

  const activeSegment = segments.find(s => playbackTime >= s.start && playbackTime <= s.end);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-between selection:bg-violet-600 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 z-50 bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg font-medium border border-violet-400 flex items-center gap-2"
          >
            <Check size={18} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-grow">
        
        {/* Left Side: Mockup App Presentation */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="animate-pulse" /> Production-Level AI Video suite
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Karaoke<span className="text-violet-500">AI</span> Mobile
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Transform any video into a synchronized karaoke track using advanced AI vocal separation and centisecond-level speech transcription.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <button onClick={() => setAppMode('mobile')} className="px-6 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl flex items-center gap-3 shadow-lg shadow-violet-600/30 transition-all cursor-pointer">
              <Smartphone size={22} /> Mobile App Browser
            </button>
            <button onClick={() => setAppMode('desktop')} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl flex items-center gap-3 border border-slate-700 shadow-lg transition-all cursor-pointer">
              <Monitor size={22} /> Desktop Mode
            </button>
          </div>

          {/* Interactive Screen Selector Control Panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <Smartphone size={16} className="text-violet-500" /> Simulator Controller
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { step: 1, name: "1. Upload File" },
                { step: 2, name: "2. AI Processing" },
                { step: 3, name: "3. Subtitle Edit" },
                { step: 4, name: "4. Export & Share" }
              ].map((btn) => (
                <button
                  key={btn.step}
                  onClick={() => {
                    setActiveScreen(btn.step as any);
                    if (btn.step !== 2) setProcessingProgress(0);
                  }}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl text-left border transition-all ${
                    activeScreen === btn.step 
                    ? 'bg-violet-600/20 text-violet-400 border-violet-500/60 shadow-inner' 
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {btn.name}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Whisper Beam Size: <strong className="text-violet-400">10</strong></span>
              <span>Model: <strong className="text-violet-400">Large-v3</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Premium Phone/Desktop frame wrapper */}
        <div id="app-simulator" className={appMode !== 'landing' ? "fixed inset-0 z-[100] bg-[#0c0f1e] flex flex-col items-center justify-center overflow-auto p-4" : "lg:col-span-7 flex justify-center py-4"}>
          {appMode !== 'landing' && (
            <div className="absolute top-6 left-6 z-50">
              <button onClick={() => setAppMode('landing')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm backdrop-blur-md transition-all cursor-pointer">
                <ChevronLeft size={18} /> Back to Landing
              </button>
            </div>
          )}
          <div className={`relative ${appMode === 'desktop' ? 'w-full max-w-[1024px] h-[720px] rounded-3xl' : 'w-[360px] h-[740px] rounded-[50px] shrink-0'} bg-slate-950 border-[10px] border-slate-900 shadow-[0_0_80px_rgba(124,58,237,0.15)] overflow-hidden flex flex-col justify-between transition-all duration-500`}>
            {/* Phone Notch/Speaker */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-900 rounded-b-2xl z-40 flex justify-center items-center">
              <div className="w-16 h-1 bg-slate-950 rounded-full" />
              <div className="absolute right-4 w-2 h-2 bg-slate-950 rounded-full" />
            </div>

            {/* Simulated Status Bar */}
            <div className="h-10 bg-[#FAF9FF] text-slate-800 px-6 pt-3 flex justify-between items-center text-[10px] font-bold z-30 select-none">
              <span>09:41</span>
              <div className="flex items-center gap-1.5">
                <span className="tracking-widest">LTE</span>
                <div className="w-5 h-2.5 border border-slate-800 rounded-sm p-0.5 flex items-center">
                  <div className="h-full w-4/5 bg-slate-800 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Inner Content Area */}
            <div className="flex-grow bg-[#FAF9FF] relative overflow-hidden flex flex-col justify-between text-slate-900">
              
              {/* Header (Top navigation inside app) */}
              <header className="h-14 px-4 flex justify-between items-center bg-[#FAF9FF] shrink-0">
                <div className="flex items-center gap-2">
                  {activeScreen > 1 && (
                    <button 
                      onClick={() => setActiveScreen((activeScreen - 1) as any)} 
                      className="p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft size={18} className="text-slate-700" />
                    </button>
                  )}
                  <span className="font-extrabold text-[#7C3AED] text-lg tracking-tight font-sans">KaraokeAI</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-slate-500 hover:text-slate-800">
                    <HelpCircle size={18} />
                  </button>
                  <img 
                    src={waterfallImg} 
                    alt="Profile Avatar" 
                    className="w-6.5 h-6.5 rounded-full object-cover border border-violet-500/20 shadow-sm"
                  />
                </div>
              </header>

              {/* Screens content with animate-presence transition */}
              <div className="flex-grow px-4 pb-4 overflow-y-auto relative flex flex-col justify-start">
                
                {/* SCREEN 1: UPLOAD SCREEN */}
                {activeScreen === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }}
                    className="flex-grow flex flex-col justify-between py-2"
                  >
                    <div className="space-y-4">
                      <div className="text-center space-y-1 py-2">
                        <h2 className="text-sm font-bold text-slate-700">Create New Karaoke</h2>
                        <p className="text-[11px] text-slate-400 leading-snug px-6">
                          Upload a video to isolate vocals and generate lyrics using AI.
                        </p>
                      </div>

                      {/* Drag and Drop Card */}
                      <input 
                        type="file" 
                        id="real-file-input" 
                        accept="video/*,audio/*" 
                        className="hidden" 
                        onChange={(e) => { 
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const url = URL.createObjectURL(file);
                            handleUploadClick(file.name, url, file);
                          }
                        }} 
                      />
                      <button 
                        onClick={() => {
                          const inputEl = document.getElementById('real-file-input');
                          if (inputEl) inputEl.click();
                          else handleUploadClick('custom_video.mp4');
                        }}
                        className="w-full border-2 border-dashed border-violet-200 bg-white hover:border-violet-400 rounded-2xl py-12 px-6 flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-105 transition-transform">
                          <Upload size={20} />
                        </div>
                        <div className="text-center space-y-1">
                          <span className="text-[12px] font-bold text-violet-600 block">Upload Video</span>
                          <span className="text-[10px] text-slate-400 block">Drag and drop or click to browse</span>
                        </div>
                      </button>

                      {/* Source Choices */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: "Gallery", icon: ImageIcon, file: "gallery_shot_03.mp4" },
                          { name: "Files", icon: FolderOpen, file: "mysong2.mp4" },
                          { name: "Camera", icon: Camera, file: "camera_capture.mp4" }
                        ].map((src) => (
                          <button
                            key={src.name}
                            onClick={() => handleUploadClick(src.file)}
                            className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors shadow-2xs"
                          >
                            <src.icon size={16} className="text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-600">{src.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* SCREEN 2: PROGRESS / WORKFLOW */}
                {activeScreen === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex-grow flex flex-col justify-between py-2 space-y-5"
                  >
                    {/* Circle Loader */}
                    <div className="flex flex-col items-center py-2 space-y-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Track */}
                          <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                          {/* Active Indicator */}
                          <circle 
                            cx="50" cy="50" r="42" stroke="#7C3AED" strokeWidth="8" fill="transparent" 
                            strokeDasharray={263.89}
                            strokeDashoffset={263.89 - (263.89 * processingProgress) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-150 ease-out"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-slate-800">{processingProgress}%</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Processing</span>
                        </div>
                      </div>

                      {/* Countdown Text */}
                      <div className="text-center">
                        <span className="text-xs font-bold text-slate-700 block flex items-center justify-center gap-1">
                          <Clock size={12} className="text-violet-500" /> 
                          {Math.ceil((100 - processingProgress) * 0.45)}s remaining
                        </span>
                        <span className="text-[10px] text-slate-400 block">Your AI vocals are being refined</span>
                      </div>
                    </div>

                    {/* Spectrogram Graphic */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                        <span>Live Spectrogram</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" /> Active</span>
                      </div>
                      {/* Audio waves */}
                      <div className="h-12 flex items-end justify-between gap-0.5 px-2">
                        {Array.from({ length: 26 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: activeScreen === 2 ? [8, Math.random() * 40 + 8, 8] : 8
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.8 + Math.random() * 0.5,
                              ease: "easeInOut"
                            }}
                            className="w-1 bg-gradient-to-t from-violet-400 to-violet-600 rounded-full"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Steps Status */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-3 space-y-2.5">
                      <span className="text-[9px] font-extrabold text-violet-500 uppercase tracking-widest block">Workflow Steps</span>
                      
                      <div className="space-y-2 text-xs">
                        {[
                          { label: "Extracting Audio", status: processingProgress > 30 ? "Done" : "Active" },
                          { label: "Speech Recognition", status: processingProgress > 60 ? "Done" : processingProgress > 30 ? "Active" : "Pending" },
                          { label: "Word-Level Timing", status: processingProgress > 85 ? "Done" : processingProgress > 60 ? "65%" : "Pending" },
                          { label: "Subtitle Generation", status: processingProgress === 100 ? "Done" : processingProgress > 85 ? "Active" : "Pending" }
                        ].map((step, idx) => (
                          <div key={idx} className="flex justify-between items-center p-1.5 rounded-lg">
                            <div className="flex items-center gap-2">
                              {step.status === "Done" ? (
                                <CheckCircle size={14} className="text-violet-600 fill-violet-50" />
                              ) : step.status === "Active" || step.status === "65%" ? (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                              )}
                              <span className={`font-semibold ${step.status === "Pending" ? "text-slate-300" : "text-slate-700"}`}>{step.label}</span>
                            </div>
                            <span className={`text-[10px] font-bold ${step.status === "Done" ? "text-violet-600" : step.status === "Pending" ? "text-slate-300" : "text-violet-500"}`}>
                              {step.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cancel generation action button */}
                    <button 
                      onClick={() => setActiveScreen(1)}
                      className="w-full py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-center text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Cancel Generation &times;
                    </button>
                  </motion.div>
                )}

                {/* SCREEN 3: PREVIEW WITH SUBTITLE OVERLAY */}
                {activeScreen === 3 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex-grow flex flex-col justify-between py-2 space-y-4"
                  >
                    {/* Video Player Display Container */}
                    <div 
                      ref={videoContainerRef}
                      className="relative w-full min-h-[40vh] max-h-[60vh] rounded-3xl overflow-hidden shadow-md border-2 border-slate-800 bg-black flex items-center justify-center"
                      style={{ isolation: 'isolate' }}
                    >
                      {/* Fullscreen CSS: subtitle overlay stays visible in fullscreen */}
                      <style>{`
                        :fullscreen .subtitle-overlay { display: flex !important; }
                        :-webkit-full-screen .subtitle-overlay { display: flex !important; }
                        :fullscreen video { width: 100%; height: 100%; object-fit: contain; }
                      `}</style>
                      {uploadedVideoUrl ? (
                        <video 
                          ref={videoRef}
                          src={uploadedVideoUrl} 
                          className="w-full h-full object-contain" 
                          autoPlay 
                          loop 
                          playsInline
                          controls
                          controlsList="nofullscreen"
                          onTimeUpdate={() => setPlaybackTime(videoRef.current?.currentTime || 0)}
                          onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)}
                        />
                      ) : (
                        <img 
                          src={waterfallImg}
                          alt="video preview" 
                          className="w-full h-full object-contain opacity-60" 
                        />
                      )}
                      
                      {/* Subtitle Overlay Text Box */}
                      <div className="absolute top-6 left-0 right-0 px-6 text-center z-10">
                        {isEditingTitle ? (
                          <input
                            type="text"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            className="bg-black/60 text-white text-xs font-bold text-center py-1 px-3 rounded-full border border-violet-500 focus:outline-none w-4/5"
                            autoFocus
                          />
                        ) : (
                          <span 
                            onClick={() => setIsEditingTitle(true)}
                            className="bg-black/50 backdrop-blur-xs text-white text-[11px] font-semibold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5 cursor-pointer hover:bg-black/70 transition-colors border border-white/10"
                          >
                            {videoTitle} <span className="text-[9px] bg-violet-600/80 px-1.5 py-0.5 rounded text-white font-mono uppercase">Edit</span>
                          </span>
                        )}
                      </div>

                      {/* Custom Fullscreen Button (top-right corner) */}
                      <button
                        onClick={toggleFullscreen}
                        className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/80 text-white rounded-lg p-1.5 transition-all backdrop-blur-sm border border-white/10"
                        title="Toggle Fullscreen"
                      >
                        {isFullscreen ? (
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                        ) : (
                          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                        )}
                      </button>

                      {/* Dynamic Real-Time Subtitle Overlay */}
                      {activeSegment && (
                        <div className={`subtitle-overlay absolute left-0 right-0 px-6 text-center z-10 pointer-events-none transition-all duration-75 ${
                          subtitleStyle.alignment === 'top' ? 'top-10' : 
                          subtitleStyle.alignment === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-12'
                        }`}>
                          <p 
                            className="text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight" 
                            style={{ fontSize: `${subtitleStyle.fontSize}px` }}
                          >
                            {activeSegment.words ? activeSegment.words.map((w: any, i: number) => (
                              <span key={i} className={playbackTime >= w.start ? "text-violet-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]" : "text-white"}>
                                {w.word}
                              </span>
                            )) : activeSegment.text}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Subtitle Appearance Editor (Real-Time) */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Subtitle Styling</span>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>Font Size</span>
                          <span className="text-violet-600">{subtitleStyle.fontSize}px</span>
                        </div>
                        <input 
                          type="range" min="12" max="64" value={subtitleStyle.fontSize}
                          className="w-full accent-violet-600" 
                          onChange={(e) => setSubtitleStyle({...subtitleStyle, fontSize: parseInt(e.target.value)})}
                        />
                        
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 mt-2">
                          <span>Alignment</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['bottom', 'middle', 'top'].map(align => (
                            <button 
                              key={align}
                              onClick={() => setSubtitleStyle({...subtitleStyle, alignment: align})} 
                              className={`py-1.5 rounded-lg text-xs font-bold shadow-sm capitalize transition-colors ${subtitleStyle.alignment === align ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                            >
                              {align}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Core Bottom Navigation Options */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => triggerToast("Opened Subtitle Editor")}
                        className="py-2.5 bg-white border border-slate-100 rounded-xl text-center text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => {
                          setProcessingProgress(0);
                          setActiveScreen(2);
                        }}
                        className="py-2.5 bg-white border border-slate-100 rounded-xl text-center text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-2xs"
                      >
                        Regenerate
                      </button>
                      <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`py-2.5 text-white rounded-xl text-center text-xs font-bold shadow-md transition-all cursor-pointer ${isExporting ? 'bg-slate-400' : 'bg-violet-600 hover:bg-violet-700 shadow-violet-200'}`}
                      >
                        {isExporting ? 'Processing...' : 'Export'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* SCREEN 4: EXPORT & READY TO SHARE */}
                {activeScreen === 4 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex-grow flex flex-col justify-between py-2 space-y-4"
                  >
                    <div className="space-y-4">
                      {/* Checkmark Banner */}
                      <div className="text-center py-2 space-y-1.5">
                        {isExporting ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mx-auto shadow-2xs">
                              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">Burning Final Subtitles...</h2>
                            <p className="text-[10px] text-slate-400 leading-snug px-6">
                              The backend is permanently burning your customized lyrics into the video pixels.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                              <Check size={20} strokeWidth={3} />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">Ready to Share!</h2>
                            <p className="text-[10px] text-slate-400 leading-snug px-6">
                              Your AI-enhanced masterpiece is processed and ready for the world.
                            </p>
                          </>
                        )}
                      </div>

                      {/* Mini Song card */}
                      <div className="bg-white border border-slate-100 p-2.5 rounded-2xl flex items-center gap-3 shadow-2xs">
                        {uploadedVideoUrl ? (
                          <video src={uploadedVideoUrl} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <img 
                            src={waterfallImg} 
                            alt="Thumbnail" 
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-grow text-left">
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">
                            {selectedFile ? selectedFile.replace(/\.[^.]+$/, '') : videoTitle}
                          </h4>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            {videoDuration > 0 ? formatTime(videoDuration) : '--:--'}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 px-2">
                          <div className="w-1 h-3.5 bg-violet-500 rounded-full" />
                          <div className="w-1 h-5 bg-violet-500 rounded-full" />
                          <div className="w-1 h-2 bg-violet-500 rounded-full" />
                        </div>
                      </div>

                      {/* Video configuration options */}
                      <div className="bg-white border border-slate-100 p-3.5 rounded-2xl space-y-3 shadow-2xs text-left">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Video Quality</span>
                          <div className="grid grid-cols-2 gap-2">
                            {(['Original', 'HD'] as const).map((q) => (
                              <button
                                key={q}
                                onClick={() => setSelectedQuality(q)}
                                className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                                  selectedQuality === q 
                                  ? 'bg-violet-600 text-white' 
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {q === 'HD' ? '🎬 HD (1080p)' : '📁 Original'}
                              </button>
                            ))}
                          </div>
                          {selectedQuality === 'HD' && (
                            <p className="text-[9px] text-violet-500 font-semibold">⚡ Re-encodes video to 1080p on the server</p>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-3 pt-1 items-center">
                          <div className="col-span-7 space-y-1.5">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Format</span>
                            <div className="flex gap-1.5">
                              {(['MP4', 'MOV'] as const).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setSelectedFormat(f)}
                                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                    selectedFormat === f 
                                    ? 'bg-violet-600 text-white' 
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* File size output */}
                          <div className="col-span-5 bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                            <span className="text-[12px] font-black text-slate-800 block leading-tight">{getFileSize()} MB</span>
                            <span className="text-[8px] text-slate-400 block font-semibold uppercase">Est. Size</span>
                          </div>
                        </div>
                      </div>

                      {/* Share Directly To */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Share Directly To</span>
                        <div className="grid grid-cols-3 gap-3">
                          {/* WhatsApp */}
                          <button
                            onClick={() => {
                              const text = encodeURIComponent(`Check out my karaoke video! 🎤`);
                              window.open(`https://wa.me/?text=${text}`, '_blank');
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-3 bg-[#25D366] rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
                          >
                            <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            <span className="text-[9px] font-bold text-white">WhatsApp</span>
                          </button>

                          {/* Instagram */}
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({ title: 'My Karaoke Video 🎤', text: 'Check out this karaoke I made with AI!' })
                                  .catch(() => {});
                              } else {
                                triggerToast('Open Instagram and share from your gallery!');
                              }
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
                            style={{background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'}}
                          >
                            <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            <span className="text-[9px] font-bold text-white">Instagram</span>
                          </button>

                          {/* Telegram */}
                          <button
                            onClick={() => {
                              const text = encodeURIComponent('Check out my karaoke video! 🎤');
                              window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
                            }}
                            className="flex flex-col items-center justify-center gap-1 py-3 bg-[#229ED9] rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
                          >
                            <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            <span className="text-[9px] font-bold text-white">Telegram</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2 pt-4">
                      {/* Save to Device */}
                      <button 
                        onClick={async () => {
                          const url = exportedBlobUrl || uploadedVideoUrl;
                          if (!url) { triggerToast('No video ready to download!'); return; }
                          triggerToast('Downloading...');
                          // If it's already a blob URL, download directly
                          if (url.startsWith('blob:')) {
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${(selectedFile || videoTitle).replace(/[^a-z0-9]/gi,'_')}_karaoke.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          } else {
                            // Fetch from ngrok with header
                            const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': '69420' } });
                            const blob = await resp.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `${(selectedFile || videoTitle).replace(/[^a-z0-9]/gi,'_')}_karaoke.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                          }
                        }}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-violet-200 transition-colors cursor-pointer"
                      >
                        <Download size={16} /> Save to Device
                      </button>
                      <span className="text-[9px] text-slate-400 block text-center">
                        Export will take approximately 15 seconds.
                      </span>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Bottom Tab Bar (Only visible inside phone canvas) */}
              <footer className="h-14 bg-white border-t border-slate-100 px-3 flex justify-between items-center shrink-0 select-none">
                {[
                  { name: "Home", icon: Tv, screen: 1 },
                  { name: "Projects", icon: Film, screen: 3 },
                  { name: "Create", icon: Clock, screen: 1, active: true },
                  { name: "Analytics", icon: Volume2, screen: 2 },
                  { name: "Profile", icon: Share2, screen: 4 }
                ].map((tab, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (tab.screen) {
                        setActiveScreen(tab.screen as any);
                        if (tab.screen !== 2) setProcessingProgress(0);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-0.5 w-12 cursor-pointer"
                  >
                    <tab.icon 
                      size={16} 
                      className={tab.active || (tab.name === "Create" && activeScreen === 1) ? "text-violet-600" : "text-slate-400 hover:text-slate-600"} 
                      strokeWidth={tab.active ? 2.5 : 2}
                    />
                    <span className={`text-[8px] font-bold ${
                      tab.active || (tab.name === "Create" && activeScreen === 1) ? "text-violet-600" : "text-slate-400"
                    }`}>
                      {tab.name}
                    </span>
                  </button>
                ))}
              </footer>

            </div>
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <span>Developed with React, Vite &amp; Tailwind CSS</span>
        <div className="flex gap-4">
          <span>Whisper Transcription: Centisecond-level accuracy</span>
          <span>•</span>
          <span>ASS sub-burn compiler ready</span>
        </div>
      </div>
    </div>
  );
}
