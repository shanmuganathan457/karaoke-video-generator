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
  ArrowRight
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
  const [selectedQuality, setSelectedQuality] = useState<'720p' | '1080p' | '2K' | '4K Pro'>('1080p');
  const [selectedFormat, setSelectedFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [videoTitle, setVideoTitle] = useState('Midnight Serenade');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const videoRef = React.useRef<HTMLVideoElement>(null);

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

  // Simulated AI Processing progress loop
  useEffect(() => {
    let interval: any;
    if (activeScreen === 2) {
      setProcessingProgress(0);
      interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Auto advance to subtitle preview screen
            setTimeout(() => setActiveScreen(3), 800);
            return 100;
          }
          return prev + 1;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [activeScreen]);

  // Video playback simulation
  useEffect(() => {
    let playbackInterval: any;
    if (activeScreen === 3 && isPlaying) {
      playbackInterval = setInterval(() => {
        setPlaybackTime(prev => {
          if (prev >= 195) { // 3:15 max
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

  const handleUploadClick = (fileName: string) => {
    setSelectedFile(fileName);
    setActiveScreen(2);
  };

  // Determine estimated file size based on quality & format
  const getFileSize = () => {
    let base = 42.8;
    if (selectedQuality === '720p') base = 18.4;
    if (selectedQuality === '2K') base = 98.2;
    if (selectedQuality === '4K Pro') base = 214.5;
    if (selectedFormat === 'MOV') base = base * 1.35;
    return base.toFixed(1);
  };

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
          <div className="pt-2 flex flex-wrap gap-3">
            <button onClick={() => { const el = document.getElementById('app-simulator'); if (el) el.scrollIntoView( { behavior: 'smooth' }); }} className="px-6 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl flex items-center gap-2.5 shadow-lg shadow-violet-600/30 transition-all cursor-pointer group">
              <Smartphone size={18} /> Open Mobile App Demo
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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

        {/* Center: Premium Phone frame wrapper */}
        <div className="lg:col-span-7 flex justify-center py-4">
          <div className="relative w-[360px] h-[740px] bg-slate-950 border-[10px] border-slate-900 rounded-[50px] shadow-[0_0_80px_rgba(124,58,237,0.15)] overflow-hidden flex flex-col justify-between">
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
                      <button 
                        onClick={() => handleUploadClick('custom_video.mp4')}
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
                    <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-md border border-slate-100 bg-black flex items-center justify-center">
                      <video 
                        ref={videoRef}
                        src={outputVideo} 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        controls={false}
                      />
                      
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

                      {/* Centered highlighted lyrics mockup */}
                      <div className="absolute inset-x-4 bottom-8 bg-black/40 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-center">
                        <p className="text-white text-[13px] font-black tracking-wide leading-tight">
                          {sampleSubtitles[Math.floor(playbackTime / 4) % sampleSubtitles.length]}
                        </p>
                      </div>

                      {/* Play/Pause Overlay indicator */}
                      {!isPlaying && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none">
                          <Play size={40} className="text-white opacity-80" />
                        </div>
                      )}
                    </div>

                    {/* Timeline Controls */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                        <span>{formatTime(playbackTime)}</span>
                        <span>03:15</span>
                      </div>

                      {/* Custom slider progress bar */}
                      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
                        <div 
                          className="absolute h-full bg-violet-600 rounded-full" 
                          style={{ width: `${(playbackTime / 195) * 100}%` }}
                        />
                      </div>

                      {/* Playback Control keys */}
                      <div className="flex items-center justify-center gap-6">
                        <button 
                          onClick={() => setPlaybackTime(Math.max(0, playbackTime - 10))}
                          className="p-2 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button 
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-1" fill="currentColor" />}
                        </button>
                        <button 
                          onClick={() => setPlaybackTime(Math.min(195, playbackTime + 10))}
                          className="p-2 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <ArrowRight size={18} />
                        </button>
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
                        onClick={() => setActiveScreen(4)}
                        className="py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-center text-xs font-bold shadow-md shadow-violet-200 transition-all cursor-pointer"
                      >
                        Export
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
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                          <Check size={20} strokeWidth={3} />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800">Ready to Share!</h2>
                        <p className="text-[10px] text-slate-400 leading-snug px-6">
                          Your AI-enhanced masterpiece is processed and ready for the world.
                        </p>
                      </div>

                      {/* Mini Song card */}
                      <div className="bg-white border border-slate-100 p-2.5 rounded-2xl flex items-center gap-3 shadow-2xs">
                        <img 
                          src={waterfallImg} 
                          alt="Thumbnail" 
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="flex-grow text-left">
                          <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">{videoTitle}</h4>
                          <span className="text-[9px] text-slate-400 block font-mono">03:42</span>
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
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['720p', '1080p', '2K', '4K Pro'] as const).map((q) => (
                              <button
                                key={q}
                                onClick={() => setSelectedQuality(q)}
                                className={`py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                  selectedQuality === q 
                                  ? 'bg-violet-600 text-white' 
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
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

                      {/* Direct target platform sharing */}
                      <div className="space-y-1.5 text-left">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Share Directly To</span>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: "WhatsApp", bg: "bg-emerald-500 text-white" },
                            { name: "Instagram", bg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white" },
                            { name: "Telegram", bg: "bg-sky-500 text-white" }
                          ].map((t) => (
                            <button
                              key={t.name}
                              onClick={() => triggerToast(`Shared to ${t.name}!`)}
                              className={`${t.bg} py-2 rounded-xl text-center text-[10px] font-bold shadow-xs cursor-pointer hover:opacity-95 transition-opacity`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2 pt-4">
                      {/* Big action Save to Device */}
                      <button 
                        onClick={() => triggerToast("Saved to Device Gallery!")}
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
