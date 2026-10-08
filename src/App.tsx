import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Image as ImageIcon, FolderOpen, Camera, Play, Pause,
  ChevronLeft, HelpCircle, Check, ChevronRight, Volume2, RotateCcw,
  Sparkles, Download, Share2, Tv, CheckCircle, Clock, Film, FileText,
  Smartphone, Cpu, ArrowRight, Monitor, Home, BarChart2, User, Plus,
  LayoutGrid, List, LogOut, Mail, Lock, Eye, EyeOff, Mic2, Music,
  TrendingUp, Zap, Settings, Edit3, Key, MoreVertical, Heart, Link as LinkIcon, PlusCircle,
  Database, Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './supabaseClient';
import RealSpectrogram from './RealSpectrogram';
// @ts-ignore
import waterfallImg from './waterfall.png';

// ─── Types ─────────────────────────────────────────────────────
interface Project {
  id: string;
  title: string;
  date: string;
  duration: string;
  mode: 'auto' | 'custom';
  processingTime: number; // seconds
  status: 'done';
  thumbnail?: string;
  videoUrl?: string;
  jobId?: string;
  segments?: any[];
}

interface UserData {
  name: string;
  email: string;
}

// ─── Helpers ────────────────────────────────────────────────────
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatDuration = (secs: number) => {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

const now = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Sample seed projects ────────────────────────────────────────
const SEED_PROJECTS: Project[] = [];


export default function App() {
  // ── Auth & Session ───────────────────────────────────────────
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'app'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [userData, setUserData] = useState<UserData>({ name: 'Alex', email: 'alex@example.com' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Splash screen animation timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // ── Check Supabase session & fetch projects ─────────────────────
  const fetchProjects = async (userId: string) => {
    if (!supabaseReady) return;
    const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data && !error) {
      setProjects(data.map((p: any) => ({
        id: p.id, title: p.title, date: p.date, duration: p.duration,
        mode: p.mode, processingTime: p.processing_time, status: p.status,
        videoUrl: p.video_url, jobId: p.job_id, segments: p.segments
      })));
      setFavoriteIds(data.filter((p: any) => p.is_favorite).map((p: any) => p.id));
    }
  };

  useEffect(() => {
    const initSupabase = async () => {
      try {
        if (!supabase.auth) throw new Error("Supabase auth not initialized");
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseReady(true);
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
          setUserData({ name, email: session.user.email || '' });
          setProfileName(name);
          setProfileEmail(session.user.email || '');
          setAuthScreen('app');
          fetchProjects(session.user.id);
        }
      } catch {
        setSupabaseReady(false);
      }
    };
    initSupabase();

    if (!supabase.auth) return;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';
        setUserData({ name, email: session.user.email || '' });
        setProfileName(name);
        setProfileEmail(session.user.email || '');
        setAuthScreen('app');
        fetchProjects(session.user.id);
      } else if (_event === 'SIGNED_OUT') {
        setAuthScreen('login');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [supabaseReady]);

  // ── Modals & Viewers ────────────────────────────────────────
  const [fullVideoModal, setFullVideoModal] = useState<Project | null>(null);
  const [modalBlobUrl, setModalBlobUrl] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (fullVideoModal?.videoUrl) {
      const url = fullVideoModal.videoUrl;
      if (url.startsWith('blob:') || url.startsWith('http')) {
        setModalBlobUrl(url);
      } else {
        setIsModalLoading(true);
        fetch(`${apiBaseUrl}${url}`, { headers: { 'ngrok-skip-browser-warning': '69420' } })
          .then(res => res.blob())
          .then(blob => {
            setModalBlobUrl(URL.createObjectURL(blob));
            setIsModalLoading(false);
          })
          .catch(() => {
            triggerToast('Failed to load video for playback');
            setIsModalLoading(false);
          });
      }
    } else {
      setModalBlobUrl(null);
    }
  }, [fullVideoModal]);

  const [showEditModal, setShowEditModal] = useState<Project | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // ── App shell ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'create' | 'favorites' | 'profile'>('home');
  const [appMode, setAppMode] = useState<'landing' | 'mobile' | 'desktop'>('landing');

  // ── Projects & Favorites ─────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [projectsView, setProjectsView] = useState<'list' | 'cards'>('list');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(['p1']);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const toggleFavorite = async (id: string) => {
    const isFav = favoriteIds.includes(id);
    const newIsFav = !isFav;
    setFavoriteIds(prev => newIsFav ? [...prev, id] : prev.filter(item => item !== id));
    triggerToast(newIsFav ? 'Added to Favorites' : 'Removed from Favorites');
    if (supabaseReady) {
      await supabase.from('projects').update({ is_favorite: newIsFav }).eq('id', id);
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setFavoriteIds(prev => prev.filter(itemId => itemId !== id));
    triggerToast('Project deleted');
    setActiveMenuId(null);
    if (supabaseReady) {
      await supabase.from('projects').delete().eq('id', id);
    }
  };

  // ── Karaoke creation flow ─────────────────────────────────────
  const [activeScreen, setActiveScreen] = useState<1 | 2 | 3 | 4>(1);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [lastProcessingTime, setLastProcessingTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<'Original' | 'HD'>('Original');
  const [videoDuration, setVideoDuration] = useState(0);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'auto' | 'custom'>('auto');
  const [customLyrics, setCustomLyrics] = useState('');
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [subtitleStyle, setSubtitleStyle] = useState({ fontSize: 24, alignment: 'bottom' });
  const [isExporting, setIsExporting] = useState(false);

  // ── Profile edit ──────────────────────────────────────────────
  const [profileName, setProfileName] = useState(userData.name);
  const [profileEmail, setProfileEmail] = useState(userData.email);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [changePassMode, setChangePassMode] = useState(false);
  const [newPass, setNewPass] = useState('');
  
  // ── Link Downloader ───────────────────────────────────────────
  const [linkInput, setLinkInput] = useState('');
  const [isDownloadingLink, setIsDownloadingLink] = useState(false);
  const [downloadedLinkVideo, setDownloadedLinkVideo] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://defiance-trustable-washstand.ngrok-free.dev";
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  }, [isPlaying, activeScreen]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) videoContainerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  // ── File Select (no auto-process) ────────────────────────────
  const handleFileSelect = (fileName: string, fileUrl?: string, file?: File) => {
    setSelectedFile(fileName);
    if (fileUrl) setUploadedVideoUrl(fileUrl);
    if (file) setUploadedVideoFile(file);
    triggerToast(`Selected: ${fileName}`);
  };

  // ── Process ──────────────────────────────────────────────────
  const handleStartProcess = async () => {
    if (!uploadedVideoFile && !selectedFile) {
      triggerToast("Please select a video file first!");
      return;
    }
    if (uploadMode === 'custom' && customLyrics.trim() === '') {
      triggerToast("Please enter or paste your lyrics first!");
      return;
    }

    const startTs = Date.now();
    setProcessingStartTime(startTs);
    setActiveScreen(2);
    setProcessingProgress(5);

    const fakeProgress = setInterval(() => {
      setProcessingProgress(p => p < 90 ? p + 2 : p);
    }, 3000);

    if (uploadedVideoFile) {
      try {
        const formData = new FormData();
        formData.append("video", uploadedVideoFile);
        formData.append("romanize", "true");
        if (uploadMode === 'custom' && customLyrics.trim() !== '') {
          formData.append("custom_lyrics", customLyrics.trim());
        }
        const response = await fetch(`${apiBaseUrl}/generate`, {
          method: "POST",
          headers: { "ngrok-skip-browser-warning": "69420" },
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          setJobId(data.job_id);
          setSegments(data.segments);
          let genTitle = '';
          if (data.segments?.length > 0) {
            let words: string[] = [];
            for (const seg of data.segments) {
              if (seg.words) words.push(...seg.words.map((w: any) => w.word));
              else if (seg.text) words.push(...seg.text.split(' '));
              if (words.length >= 3) break;
            }
            if (words.length > 0) {
              genTitle = words.slice(0, 3).join(' ');
              setVideoTitle(genTitle);
            }
          }
          const videoResp = await fetch(apiBaseUrl + data.video_url, { headers: { "ngrok-skip-browser-warning": "69420" } });
          const videoBlob = await videoResp.blob();
          setUploadedVideoUrl(URL.createObjectURL(videoBlob));
          clearInterval(fakeProgress);
          setProcessingProgress(100);
          const elapsed = Math.round((Date.now() - startTs) / 1000);
          setLastProcessingTime(elapsed);
          finishProject(elapsed, genTitle, data.video_url, data.job_id, data.segments);
          setTimeout(() => setActiveScreen(3), 800);
        } else {
          clearInterval(fakeProgress);
          triggerToast("Processing failed. Please check backend logs.");
        }
      } catch (err) {
        clearInterval(fakeProgress);
        triggerToast("Network Error connecting to backend.");
      }
    } else {
      setProcessingProgress(10);
      const mock = setInterval(() => {
        setProcessingProgress(p => {
          if (p >= 90) {
            clearInterval(mock);
            setProcessingProgress(100);
            const elapsed = Math.round((Date.now() - startTs) / 1000);
            setLastProcessingTime(elapsed);
            finishProject(elapsed);
            setTimeout(() => setActiveScreen(3), 600);
            return 100;
          }
          return p + 20;
        });
      }, 500);
    }
  };

  const finishProject = (elapsed: number, forcedTitle?: string, forcedVideoUrl?: string, forcedJobId?: string, forcedSegments?: any[]) => {
    const projId = crypto.randomUUID ? crypto.randomUUID() : `p${Date.now()}`;
    const finalTitle = forcedTitle || videoTitle || selectedFile?.replace(/\.[^.]+$/, '') || 'Untitled';
    const finalJobId = forcedJobId || jobId;
    const finalVideoUrl = forcedVideoUrl || uploadedVideoUrl || undefined;
    const finalSegments = forcedSegments || segments || [];

    const proj: Project = {
      id: projId,
      title: finalTitle,
      date: now(),
      duration: videoDuration > 0 ? formatTime(videoDuration) : '--:--',
      mode: uploadMode,
      processingTime: elapsed,
      status: 'done',
      videoUrl: finalVideoUrl,
      jobId: finalJobId,
      segments: finalSegments,
    };
    setProjects(prev => [proj, ...prev]);

    if (supabaseReady) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('projects').insert({
            id: projId,
            user_id: user.id,
            title: proj.title,
            date: proj.date,
            duration: proj.duration,
            mode: proj.mode,
            processing_time: proj.processingTime,
            status: proj.status,
            video_url: proj.videoUrl,
            job_id: proj.jobId,
            segments: proj.segments
          }).then();
        }
      });
    }
  };

  const openProject = (proj: Project) => {
    setVideoTitle(proj.title);
    if (proj.videoUrl) {
      setUploadedVideoUrl(proj.videoUrl);
    }
    if (proj.jobId) {
      setJobId(proj.jobId);
    }
    if (proj.segments) {
      setSegments(proj.segments);
    }
    setActiveTab('create');
    setActiveScreen(3);
    triggerToast(`Opened: ${proj.title}`);
  };

  const handleExport = async () => {
    if (!jobId) return;
    setIsExporting(true);
    setActiveScreen(4);
    triggerToast("Burning final subtitles... Please wait!");
    try {
      const response = await fetch(`${apiBaseUrl}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          segments,
          font_size: subtitleStyle.fontSize,
          alignment: subtitleStyle.alignment === 'top' ? 8 : subtitleStyle.alignment === 'middle' ? 5 : 2
        })
      });
      if (response.ok) {
        const data = await response.json();
        const vResp = await fetch(apiBaseUrl + data.video_url, { headers: { "ngrok-skip-browser-warning": "69420" } });
        const vBlob = await vResp.blob();
        const blobUrl = URL.createObjectURL(vBlob);
        setExportedBlobUrl(blobUrl);
        setUploadedVideoUrl(blobUrl);
        
        // Update project with the burned video url
        setProjects(prev => prev.map(p => p.jobId === jobId ? { ...p, videoUrl: data.video_url } : p));
        if (supabaseReady) {
          supabase.from('projects').update({ video_url: data.video_url }).eq('job_id', jobId).then();
        }

        triggerToast("Export successful! Ready to share.");
        setIsExporting(false);
      } else {
        triggerToast("Export failed on server!");
        setIsExporting(false);
      }
    } catch (e) {
      triggerToast("Network error during export.");
      setIsExporting(false);
    }
  };

  const getFileSize = () => (selectedQuality === 'HD' ? 58.4 : 42.8).toFixed(1);
  const activeSegment = segments.find(s => playbackTime >= s.start && playbackTime <= s.end);

  // ── Analytics stats ──────────────────────────────────────────
  const totalProjects = projects.length;
  const avgTime = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + p.processingTime, 0) / totalProjects) : 0;
  const fastestTime = totalProjects > 0 ? Math.min(...projects.map(p => p.processingTime)) : 0;
  const autoCount = projects.filter(p => p.mode === 'auto').length;
  const customCount = projects.filter(p => p.mode === 'custom').length;

  // ─────────────────────────────────────────────────────────────
  // Auth Screens
  // ─────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!loginEmail || !loginPass) { triggerToast('Please fill in all fields'); return; }
    setAuthLoading(true);
    try {
      if (supabaseReady) {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
        if (error) { triggerToast(error.message); setAuthLoading(false); return; }
        // onAuthStateChange will update userData & screen
      } else {
        // Local fallback (no Supabase credentials yet)
        setUserData({ name: loginEmail.split('@')[0], email: loginEmail });
        setProfileName(loginEmail.split('@')[0]);
        setProfileEmail(loginEmail);
        setAuthScreen('app');
      }
    } catch {
      triggerToast('Connection error. Check your internet.');
    }
    setAuthLoading(false);
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail || !signupPass) { triggerToast('Please fill in all fields'); return; }
    setAuthLoading(true);
    try {
      if (supabaseReady) {
        const { error } = await supabase.auth.signUp({
          email: signupEmail,
          password: signupPass,
          options: { data: { full_name: signupName } }
        });
        if (error) { triggerToast(error.message); setAuthLoading(false); return; }
        triggerToast('Account created! Check your email to confirm.');
        // Auto-login after signup (Supabase may auto-confirm)
      } else {
        setUserData({ name: signupName, email: signupEmail });
        setProfileName(signupName);
        setProfileEmail(signupEmail);
        setAuthScreen('app');
      }
    } catch {
      triggerToast('Connection error. Check your internet.');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (supabaseReady) {
      await supabase.auth.signOut();
    } else {
      setAuthScreen('login');
    }
    setProjects(SEED_PROJECTS);
    setFavoriteIds(['p1']);
    setShowLogoutConfirm(false);
  };

  // ── Splash Screen ─────────────────────────────────────────────
  const renderSplash = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex-grow bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 flex flex-col items-center justify-center p-6 relative overflow-hidden text-white"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.1, 1], opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl mb-6 relative"
      >
        <div className="absolute inset-0 bg-violet-500/30 rounded-3xl animate-ping opacity-30" />
        <Mic2 size={48} className="text-white drop-shadow-md" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-black tracking-tight">Karaoke<span className="text-violet-300">AI</span></h1>
        <p className="text-xs text-violet-200 font-medium tracking-wide">AI-Powered Vocal & Subtitle Generator</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-10 flex items-center gap-2 text-[10px] font-bold text-violet-300/80 uppercase tracking-widest"
      >
        <div className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
        <span>Loading Experience...</span>
      </motion.div>
    </motion.div>
  );

  // ─────────────────────────────────────────────────────────────
  // Phone canvas inner content
  // ─────────────────────────────────────────────────────────────
  const renderPhoneContent = () => {
    if (showSplash) return renderSplash();
    if (authScreen === 'login') return renderLogin();
    if (authScreen === 'signup') return renderSignup();
    return renderAppShell();
  };

  // ── Login ────────────────────────────────────────────────────
  const renderLogin = () => (
    <div className="flex-grow bg-[#FAF9FF] flex flex-col justify-between px-5 pb-6 pt-8">
      <div className="space-y-2 text-center pb-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-300">
          <Mic2 size={24} className="text-white" />
        </div>
        <h1 className="text-lg font-black text-slate-800">Welcome to KaraokeAI</h1>
        <p className="text-[11px] text-slate-400">Sign in to access your karaoke projects</p>
      </div>

      <div className="space-y-3 flex-grow">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-8 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-700 placeholder-slate-300"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-8 pr-8 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-700 placeholder-slate-300"
            />
            <button onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={authLoading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-violet-300 transition-all cursor-pointer mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
        </button>

        <div className="text-center pt-2">
          <span className="text-[11px] text-slate-400">Don't have an account? </span>
          <button onClick={() => setAuthScreen('signup')} className="text-[11px] font-bold text-violet-600 cursor-pointer">Sign Up</button>
        </div>
      </div>
    </div>
  );

  // ── Signup ───────────────────────────────────────────────────
  const renderSignup = () => (
    <div className="flex-grow bg-[#FAF9FF] flex flex-col justify-between px-5 pb-6 pt-6">
      <div className="space-y-1 text-center pb-3">
        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-300">
          <Mic2 size={24} className="text-white" />
        </div>
        <h1 className="text-lg font-black text-slate-800">Create Account</h1>
        <p className="text-[11px] text-slate-400">Start creating AI karaoke videos</p>
      </div>
      <div className="space-y-3 flex-grow">
        {[
          { label: 'Name', icon: User, val: signupName, set: setSignupName, type: 'text', ph: 'Your name' },
          { label: 'Email', icon: Mail, val: signupEmail, set: setSignupEmail, type: 'email', ph: 'you@example.com' },
          { label: 'Password', icon: Lock, val: signupPass, set: setSignupPass, type: 'password', ph: '••••••••' },
        ].map(({ label, icon: Icon, val, set, type, ph }) => (
          <div key={label}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">{label}</label>
            <div className="relative">
              <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={type}
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={ph}
                className="w-full pl-8 pr-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-700 placeholder-slate-300"
              />
            </div>
          </div>
        ))}
        <button
          onClick={handleSignup}
          disabled={authLoading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md shadow-violet-300 cursor-pointer mt-1 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Account'}
        </button>
        <div className="text-center pt-1">
          <span className="text-[11px] text-slate-400">Already have an account? </span>
          <button onClick={() => setAuthScreen('login')} className="text-[11px] font-bold text-violet-600 cursor-pointer">Sign In</button>
        </div>
      </div>
    </div>
  );

  // ── App Shell (post-auth) ────────────────────────────────────
  const renderAppShell = () => (
    <div className="flex-grow bg-[#FAF9FF] relative overflow-hidden flex flex-col text-slate-900">
      {/* Status Bar */}
      <div className="h-10 bg-[#FAF9FF] text-slate-800 px-5 pt-3 flex justify-between items-center text-[10px] font-bold z-30 select-none shrink-0">
        <span>09:41</span>
        <div className="flex items-center gap-1.5">
          <span className="tracking-widest">LTE</span>
          <div className="w-5 h-2.5 border border-slate-800 rounded-sm p-0.5 flex items-center">
            <div className="h-full w-4/5 bg-slate-800 rounded-full" />
          </div>
        </div>
      </div>

      {/* Inner content — conditional on tab */}
      <div className="flex-grow overflow-y-auto relative">
        {/* Karaoke Creation Flow */}
        {activeTab === 'create' ? (
          renderKaraokeFlow()
        ) : activeTab === 'home' ? renderHome()
          : activeTab === 'projects' ? renderProjects()
          : activeTab === 'favorites' ? renderFavorites()
          : renderProfile()}
      </div>

      {/* Bottom Tab Bar */}
      {!(activeTab === 'create' && activeScreen > 1) && (
        <footer className="h-16 bg-white border-t border-slate-100 px-2 flex justify-around items-center shrink-0 select-none pb-1">
          {([
            { key: 'home', icon: Home, label: 'Home' },
            { key: 'projects', icon: Film, label: 'Projects' },
            { key: 'create', icon: PlusCircle, label: 'Create', isCenter: true },
            { key: 'favorites', icon: Heart, label: 'Favorites' },
            { key: 'profile', icon: User, label: 'Profile' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'create') {
                  setActiveScreen(1); setSelectedFile(null); setUploadedVideoFile(null); setUploadedVideoUrl(null); setCustomLyrics('');
                }
              }}
              className="flex flex-col items-center justify-center gap-0.5 w-14 cursor-pointer"
            >
              {tab.isCenter ? (
                <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-300">
                  <Plus size={22} />
                </div>
              ) : (
                <>
                  <tab.icon
                    size={18}
                    className={activeTab === tab.key ? 'text-violet-600' : 'text-slate-400'}
                    strokeWidth={activeTab === tab.key ? 2.5 : 2}
                  />
                  <span className={`text-[9px] font-bold ${activeTab === tab.key ? 'text-violet-600' : 'text-slate-400'}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          ))}
        </footer>
      )}
    </div>
  );

  // ── HOME TAB ─────────────────────────────────────────────────
  const renderHome = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning 🌅' : hour < 17 ? 'Good afternoon ☀️' : 'Good evening 🌙';
    return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pt-4 pb-4 space-y-4">
      {/* Greeting */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-[11px] text-slate-400 font-medium">{greeting}</p>
          <h2 className="text-sm font-black text-slate-800">{userData.name}</h2>
        </div>
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
          {userData.name[0].toUpperCase()}
        </div>
      </div>

      {/* Quick Create Banner */}
      <div
        onClick={() => { setActiveTab('create'); setActiveScreen(1); }}
        className="w-full rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 flex items-center justify-between cursor-pointer shadow-lg shadow-violet-300/40"
      >
        <div>
          <p className="text-white font-black text-sm">Create Karaoke Video</p>
          <p className="text-violet-200 text-[10px] mt-0.5">Upload video → AI generates lyrics</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Plus size={20} className="text-white" />
        </div>
      </div>

      {/* Video Downloader */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon size={16} className="text-violet-600" />
          <h3 className="text-xs font-bold text-slate-800">Convert Link to Video</h3>
        </div>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste YouTube / Instagram link..." 
            className="flex-grow text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-slate-400" 
          />
          <button 
            onClick={async () => {
              if (!linkInput) return;
              setIsDownloadingLink(true);
              try {
                const res = await fetch(`${apiBaseUrl}/download_link`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '69420'
                  },
                  body: JSON.stringify({ url: linkInput })
                });
                
                if (res.ok) {
                  const data = await res.json();
                  if (data.error) {
                     triggerToast(`Error: ${data.error}`);
                     setIsDownloadingLink(false);
                     return;
                  }
                  // Fetch as blob so the <video> tag can play it (ngrok blocks direct video requests)
                  triggerToast('Download complete! Loading video...');
                  const videoRes = await fetch(apiBaseUrl + data.video_url, {
                    headers: { 'ngrok-skip-browser-warning': '69420' }
                  });
                  const blob = await videoRes.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  setDownloadedLinkVideo(blobUrl);
                  triggerToast('Video ready!');
                } else {
                  triggerToast('Failed to download video.');
                }
              } catch (e) {
                triggerToast('Network error connecting to backend.');
              }
              setIsDownloadingLink(false);
            }} 
            disabled={isDownloadingLink || !linkInput}
            className="bg-violet-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm cursor-pointer hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center min-w-[40px]"
          >
            {isDownloadingLink ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
          </button>
        </div>
        
        {downloadedLinkVideo ? (
          <div className="mt-3 space-y-2">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black">
              <video src={downloadedLinkVideo} controls className="w-full rounded-xl" style={{maxHeight: '180px'}} />
              <button 
                onClick={() => { setDownloadedLinkVideo(null); setLinkInput(''); }} 
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full text-white flex items-center justify-center hover:bg-black/90 cursor-pointer text-xs z-10"
              >&times;</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('create');
                  setActiveScreen(1);
                  handleFileSelect("Downloaded_Video.mp4", downloadedLinkVideo);
                }}
                className="flex-grow bg-violet-600 text-white text-xs font-bold py-2 rounded-xl shadow cursor-pointer hover:bg-violet-700 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} /> Use in Karaoke
              </button>
              <a
                href={downloadedLinkVideo}
                download="downloaded_video.mp4"
                className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 flex items-center gap-1.5"
              >
                <Download size={13} /> Save
              </a>
            </div>
          </div>
        ) : (
          <p className="text-[9px] text-slate-400 leading-snug">Download videos directly from social links (YouTube, Instagram) to use in karaoke.</p>
        )}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Recent Projects</span>
          <button onClick={() => setActiveTab('projects')} className="text-[10px] font-bold text-violet-600 cursor-pointer">View all</button>
        </div>
        {projects.slice(0, 2).map(p => (
          <div
            key={p.id}
            onClick={() => setFullVideoModal(p)}
            className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 mb-2 shadow-sm cursor-pointer hover:border-violet-200 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-600 transition-colors overflow-hidden relative">
              {p.videoUrl ? <video src={p.videoUrl.startsWith('http') ? `${p.videoUrl}#t=0.1` : `${apiBaseUrl}${p.videoUrl}#t=0.1`} preload="metadata" className="w-full h-full object-cover absolute inset-0" /> : <Music size={16} className="text-violet-600 group-hover:text-white transition-colors z-10" />}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{p.title}</p>
              <p className="text-[10px] text-slate-400">{p.date} · {p.duration}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.mode === 'auto' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {p.mode === 'auto' ? 'Auto' : 'Custom'}
            </span>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Film size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No projects yet. Create your first one!</p>
          </div>
        )}
      </div>
    </motion.div>
    );
  };

  // ── PROJECTS TAB ─────────────────────────────────────────────
  const renderProjects = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-black text-slate-800">Projects</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setProjectsView(v => v === 'list' ? 'cards' : 'list')} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 cursor-pointer">
              {projectsView === 'list' ? <LayoutGrid size={15} /> : <List size={15} />}
            </button>
            <button
              onClick={() => { setActiveTab('create'); setActiveScreen(1); setSelectedFile(null); setUploadedVideoFile(null); setUploadedVideoUrl(null); setCustomLyrics(''); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-violet-700 shadow-sm"
            >
              <Plus size={12} /> New
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <Film size={36} className="opacity-30" />
            <p className="text-xs text-center">No projects yet.<br />Create your first karaoke!</p>
            <button
              onClick={() => { setActiveTab('create'); setActiveScreen(1); }}
              className="mt-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              + Create Now
            </button>
          </div>
        ) : projectsView === 'list' ? (
          <div className="space-y-2 pt-2">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => setFullVideoModal(p)}
                className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-violet-200 transition-all cursor-pointer group relative"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-600 transition-colors">
                  <Play size={18} className="text-violet-600 group-hover:text-white transition-colors" fill="currentColor" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.title}</p>
                  <p className="text-[10px] text-slate-400">{p.date} · {p.duration} · {formatDuration(p.processingTime)}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }} 
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
                {activeMenuId === p.id && (
                  <div className="absolute top-10 right-3 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-36 z-20" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditTitleInput(p.title); setShowEditModal(p); setActiveMenuId(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 size={13} /> Edit Title
                    </button>
                    <button
                      onClick={() => { toggleFavorite(p.id); setActiveMenuId(null); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                    >
                      <Heart size={13} className={favoriteIds.includes(p.id) ? 'fill-red-500 text-red-500' : ''} />
                      {favoriteIds.includes(p.id) ? 'Unfavorite' : 'Favorite'}
                    </button>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-slate-50 mt-0.5 pt-1.5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-2">
            {projects.map(p => (
              <div 
                key={p.id} 
                onClick={() => setFullVideoModal(p)}
                className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 shadow-sm relative hover:border-violet-200 transition-all cursor-pointer group"
              >
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }}
                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer z-10"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenuId === p.id && (
                    <div className="absolute top-7 right-1 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-36 z-20" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditTitleInput(p.title); setShowEditModal(p); setActiveMenuId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit Title
                      </button>
                      <button
                        onClick={() => { toggleFavorite(p.id); setActiveMenuId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Heart size={13} className={favoriteIds.includes(p.id) ? 'fill-red-500 text-red-500' : ''} />
                        {favoriteIds.includes(p.id) ? 'Unfavorite' : 'Favorite'}
                      </button>
                      <button
                        onClick={() => deleteProject(p.id)}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-slate-50 mt-0.5 pt-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <div className="w-full h-16 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center group-hover:from-violet-600 group-hover:to-indigo-600 transition-all overflow-hidden relative">
                    {p.videoUrl ? <video src={p.videoUrl.startsWith('http') ? `${p.videoUrl}#t=0.1` : `${apiBaseUrl}${p.videoUrl}#t=0.1`} preload="metadata" className="w-full h-full object-cover absolute inset-0 opacity-50 mix-blend-luminosity" /> : null}
                    <Play size={22} className="text-violet-500 group-hover:text-white transition-colors z-10" fill="currentColor" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 truncate pr-6">{p.title}</p>
                  <p className="text-[9px] text-slate-400">{p.date} &middot; {p.duration}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${p.mode === 'auto' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {p.mode === 'auto' ? '⚡ Auto' : '📝 Custom'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  // ── FAVORITES TAB ────────────────────────────────────────────
  const renderFavorites = () => {
    const favProjects = projects.filter(p => favoriteIds.includes(p.id));

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pt-4 pb-4 space-y-4">
        <h2 className="text-sm font-black text-slate-800">Favorite Videos</h2>
        
        {favProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
            <Heart size={36} className="opacity-30" />
            <p className="text-xs text-center">No favorites yet.<br />Like a project to see it here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-2">
            {favProjects.map(p => (
              <div 
                key={p.id} 
                onClick={() => setFullVideoModal(p)}
                className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 shadow-sm relative hover:border-violet-200 transition-all cursor-pointer group"
              >
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === p.id ? null : p.id); }}
                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer z-10"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenuId === p.id && (
                    <div className="absolute top-7 right-1 bg-white border border-slate-100 rounded-xl shadow-lg py-1 w-36 z-20" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditTitleInput(p.title); setShowEditModal(p); setActiveMenuId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit3 size={13} /> Edit Title
                      </button>
                      <button
                        onClick={() => { toggleFavorite(p.id); setActiveMenuId(null); }}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Heart size={13} className="fill-red-500 text-red-500" />
                        Unfavorite
                      </button>
                      <button
                        onClick={() => deleteProject(p.id)}
                        className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-slate-50 mt-0.5 pt-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  <div className="w-full h-16 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center group-hover:from-violet-600 group-hover:to-indigo-600 transition-all overflow-hidden relative">
                    {p.videoUrl ? <video src={p.videoUrl.startsWith('http') ? `${p.videoUrl}#t=0.1` : `${apiBaseUrl}${p.videoUrl}#t=0.1`} preload="metadata" className="w-full h-full object-cover absolute inset-0 opacity-50 mix-blend-luminosity" /> : null}
                    <Play size={22} className="text-violet-500 group-hover:text-white transition-colors z-10" fill="currentColor" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 truncate pr-6">{p.title}</p>
                  <p className="text-[9px] text-slate-400">{p.date} &middot; {p.duration}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${p.mode === 'auto' ? 'bg-violet-50 text-violet-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {p.mode === 'auto' ? '⚡ Auto' : '📝 Custom'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  // ── PROFILE TAB ──────────────────────────────────────────────
  const renderProfile = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pt-4 pb-4 space-y-4">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-violet-300/50">
          {userData.name[0].toUpperCase()}
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-800">{userData.name}</p>
          <p className="text-[11px] text-slate-400">{userData.email}</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Account Info</p>
        {profileEditMode ? (
          <div className="px-4 pb-3 space-y-2">
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Name"
            />
            <input
              value={profileEmail}
              onChange={e => setProfileEmail(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Email"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setUserData({ name: profileName, email: profileEmail }); setProfileEditMode(false); triggerToast('Profile saved!'); }}
                className="flex-1 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >Save</button>
              <button onClick={() => setProfileEditMode(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {[{ label: 'Name', value: userData.name }, { label: 'Email', value: userData.email }].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-slate-50 last:border-none">
                <span className="text-[11px] text-slate-500">{label}</span>
                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[60%] text-right">{value}</span>
              </div>
            ))}
            <div className="px-4 pb-3 pt-2">
              <button onClick={() => setProfileEditMode(true)} className="w-full py-2 text-[11px] font-bold text-violet-600 border border-violet-200 rounded-lg flex items-center justify-center gap-1 cursor-pointer hover:bg-violet-50">
                <Edit3 size={12} /> Edit Profile
              </button>
            </div>
          </>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-4 pt-3 pb-1">Security</p>
        {changePassMode ? (
          <div className="px-4 pb-3 space-y-2">
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="New password"
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setNewPass(''); setChangePassMode(false); triggerToast('Password changed!'); }}
                className="flex-1 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg cursor-pointer"
              >Update</button>
              <button onClick={() => setChangePassMode(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setChangePassMode(true)} className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50">
            <div className="flex items-center gap-2">
              <Key size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">Change Password</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Your Stats</p>
        <div className="grid grid-cols-2 gap-2 text-center max-w-[200px]">
          <div><p className="text-sm font-black text-slate-800">{totalProjects}</p><p className="text-[9px] text-slate-400">Videos</p></div>
          <div><p className="text-sm font-black text-slate-800">{autoCount}</p><p className="text-[9px] text-slate-400">Auto</p></div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => setShowLogoutConfirm(true)}
        className="w-full py-3 border border-red-200 text-red-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-red-50"
      >
        <LogOut size={14} /> Log Out
      </button>
    </motion.div>
  );

  // ── KARAOKE CREATION FLOW ────────────────────────────────────
  const renderKaraokeFlow = () => (
    <div className="flex-grow bg-[#FAF9FF] flex flex-col h-full">
      {/* Mini header with back */}
      <header className="h-12 px-4 flex items-center gap-2 bg-[#FAF9FF] shrink-0 border-b border-slate-100">
        {activeScreen > 1 ? (
          <button onClick={() => setActiveScreen(s => Math.max(1, s - 1) as any)} className="p-1 rounded-full hover:bg-slate-100">
            <ChevronLeft size={18} className="text-slate-700" />
          </button>
        ) : (
          <button onClick={() => setProjectsTab('all')} className="p-1 rounded-full hover:bg-slate-100">
            <ChevronLeft size={18} className="text-slate-700" />
          </button>
        )}
        <span className="font-extrabold text-[#7C3AED] text-base tracking-tight">KaraokeAI</span>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {/* SCREEN 1: UPLOAD */}
        {activeScreen === 1 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col min-h-full py-2" style={{ minHeight: 'calc(100% - 0px)' }}>
            <div className="space-y-4 flex-grow">
              <div className="text-center space-y-1 py-2">
                <h2 className="text-sm font-bold text-slate-700">Create New Karaoke</h2>
                <p className="text-[11px] text-slate-400 leading-snug px-6">
                  {uploadMode === 'custom' ? 'Upload a video and paste lyrics to sync them using AI.' : 'Upload a video to isolate vocals and generate lyrics using AI.'}
                </p>
              </div>

              {/* Custom lyrics tab hidden for fast deployment */}
              {/* uploadMode is kept as 'auto' */}

              <input
                type="file" id="real-file-input" accept="video/*,audio/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) { const f = e.target.files[0]; handleFileSelect(f.name, URL.createObjectURL(f), f); } }}
              />

              {selectedFile ? (
                <div className="w-full border border-violet-200 bg-violet-50/50 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                      <Film size={20} />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-800 block truncate">{selectedFile}</span>
                      <span className="text-[10px] text-violet-600 font-medium flex items-center gap-1"><Check size={12} /> Video Selected</span>
                    </div>
                  </div>
                  <button onClick={() => document.getElementById('real-file-input')?.click()} className="px-3 py-1.5 text-[11px] font-bold text-violet-600 hover:bg-violet-100 rounded-lg shrink-0 cursor-pointer">Change</button>
                </div>
              ) : (
                <button
                  onClick={() => document.getElementById('real-file-input')?.click()}
                  className="w-full border-2 border-dashed border-violet-200 bg-white hover:border-violet-400 rounded-2xl py-7 px-6 flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-500 group-hover:scale-105 transition-transform">
                    <Upload size={20} />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[12px] font-bold text-violet-600 block">Upload Video</span>
                    <span className="text-[10px] text-slate-400 block">Tap to browse files</span>
                  </div>
                </button>
              )}

              {uploadMode === 'auto' && (
                <div className="grid grid-cols-3 gap-2">
                  {[{ name: 'Gallery', icon: ImageIcon, file: 'gallery_shot_03.mp4' }, { name: 'Files', icon: FolderOpen, file: 'mysong2.mp4' }, { name: 'Camera', icon: Camera, file: 'camera_capture.mp4' }].map(src => (
                    <button key={src.name} onClick={() => handleFileSelect(src.file)} className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col items-center gap-1 hover:bg-slate-50 shadow-sm cursor-pointer">
                      <src.icon size={16} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-600">{src.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto">
              <button onClick={handleStartProcess} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-violet-300/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                <Sparkles size={18} />
                <span className="text-xs tracking-wide">Process</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* SCREEN 2: PROCESSING */}
        {activeScreen === 2 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-grow flex flex-col py-2 space-y-5">
            <div className="flex flex-col items-center py-2 space-y-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                  <circle cx="50" cy="50" r="42" stroke="#7C3AED" strokeWidth="8" fill="transparent" strokeDasharray={263.89} strokeDashoffset={263.89 - (263.89 * processingProgress) / 100} strokeLinecap="round" className="transition-all duration-150 ease-out" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800">{processingProgress}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Processing</span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-700 flex items-center justify-center gap-1"><Clock size={12} className="text-violet-500" /> {Math.ceil((100 - processingProgress) * 0.45)}s remaining</span>
                <span className="text-[10px] text-slate-400 block">Your AI vocals are being refined</span>
              </div>
            </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>Live Spectrogram</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    Active
                  </span>
                </div>
                <RealSpectrogram audioUrl={uploadedVideoUrl} isActive={activeScreen === 2} />
              </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-3 space-y-2.5">
              <span className="text-[9px] font-extrabold text-violet-500 uppercase tracking-widest block">Workflow Steps</span>
              <div className="space-y-2 text-xs">
                {[{ label: 'Extracting Audio', status: processingProgress > 30 ? 'Done' : 'Active' }, { label: 'Speech Recognition', status: processingProgress > 60 ? 'Done' : processingProgress > 30 ? 'Active' : 'Pending' }, { label: 'Word-Level Timing', status: processingProgress > 85 ? 'Done' : processingProgress > 60 ? 'Active' : 'Pending' }, { label: 'Subtitle Generation', status: processingProgress === 100 ? 'Done' : processingProgress > 85 ? 'Active' : 'Pending' }].map((step, idx) => (
                  <div key={idx} className="flex justify-between items-center p-1.5 rounded-lg">
                    <div className="flex items-center gap-2">
                      {step.status === 'Done' ? <CheckCircle size={14} className="text-violet-600 fill-violet-50" /> : step.status === 'Active' ? <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />}
                      <span className={`font-semibold ${step.status === 'Pending' ? 'text-slate-300' : 'text-slate-700'}`}>{step.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${step.status === 'Done' ? 'text-violet-600' : step.status === 'Pending' ? 'text-slate-300' : 'text-violet-500'}`}>{step.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => { setActiveScreen(1); setProcessingProgress(0); }} className="w-full py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer">Cancel ×</button>
          </motion.div>
        )}

        {/* SCREEN 3: PREVIEW */}
        {activeScreen === 3 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-grow flex flex-col py-2 space-y-4">
            <div ref={videoContainerRef} className="relative w-full min-h-[40vh] max-h-[55vh] rounded-3xl overflow-hidden shadow-md border-2 border-slate-800 bg-black flex items-center justify-center p-2 pb-6" style={{ isolation: 'isolate' }}>
              <style>{`:fullscreen .subtitle-overlay { display: flex !important; } :-webkit-full-screen .subtitle-overlay { display: flex !important; } :fullscreen video { width: 100%; height: 100%; object-fit: contain; } video::-webkit-media-controls-fullscreen-button { display: none !important; }`}</style>
              {uploadedVideoUrl ? (
                <video ref={videoRef} src={uploadedVideoUrl} className="w-full h-full object-contain rounded-xl" autoPlay loop playsInline controls controlsList="nofullscreen" onTimeUpdate={() => setPlaybackTime(videoRef.current?.currentTime || 0)} onLoadedMetadata={() => setVideoDuration(videoRef.current?.duration || 0)} />
              ) : (
                <img src={waterfallImg} alt="preview" className="w-full h-full object-contain opacity-60 rounded-xl" />
              )}
              <div className="absolute top-6 left-0 right-0 px-6 text-center z-10">
                {isEditingTitle ? (
                  <input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} className="bg-black/60 text-white text-xs font-bold text-center py-1 px-3 rounded-full border border-violet-500 focus:outline-none w-4/5" autoFocus />
                ) : (
                  <span onClick={() => setIsEditingTitle(true)} className="bg-black/50 text-white text-[11px] font-semibold py-1.5 px-3 rounded-full inline-flex items-center gap-1.5 cursor-pointer hover:bg-black/70 border border-white/10">{videoTitle} <span className="text-[9px] bg-violet-600/80 px-1.5 py-0.5 rounded text-white font-mono uppercase">Edit</span></span>
                )}
              </div>
              {activeSegment && (
                <div className={`subtitle-overlay absolute left-0 right-0 px-6 text-center z-10 pointer-events-none ${subtitleStyle.alignment === 'top' ? 'top-10' : subtitleStyle.alignment === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-12'}`}>
                  <p className="text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight" style={{ fontSize: `${subtitleStyle.fontSize}px` }}>
                    {activeSegment.words ? activeSegment.words.map((w: any, i: number) => (
                      <span key={i} className={playbackTime >= w.start ? 'text-violet-400 drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]' : 'text-white'}>{w.word} </span>
                    )) : activeSegment.text}
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Subtitle Styling</span>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>Font Size</span><span className="text-violet-600">{subtitleStyle.fontSize}px</span></div>
              <input type="range" min="12" max="64" value={subtitleStyle.fontSize} className="w-full accent-violet-600" onChange={e => setSubtitleStyle({ ...subtitleStyle, fontSize: parseInt(e.target.value) })} />
              <div className="grid grid-cols-3 gap-2 mt-2">
                {['bottom', 'middle', 'top'].map(align => (
                  <button key={align} onClick={() => setSubtitleStyle({ ...subtitleStyle, alignment: align })} className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${subtitleStyle.alignment === align ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{align}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => triggerToast('Opened Subtitle Editor')} className="py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer">Edit</button>
              <button onClick={() => { setProcessingProgress(0); setActiveScreen(2); }} className="py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm cursor-pointer">Redo</button>
              <button onClick={handleExport} disabled={isExporting} className={`py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer ${isExporting ? 'bg-slate-400' : 'bg-violet-600 hover:bg-violet-700'}`}>{isExporting ? '...' : 'Export'}</button>
            </div>
          </motion.div>
        )}

        {/* SCREEN 4: EXPORT */}
        {activeScreen === 4 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-grow flex flex-col py-2 space-y-4">
            <div className="space-y-4">
              <div className="text-center py-2 space-y-1.5">
                {isExporting ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center mx-auto"><div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
                    <h2 className="text-sm font-bold text-slate-800">Burning Final Subtitles...</h2>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><Check size={20} strokeWidth={3} /></div>
                    <h2 className="text-sm font-bold text-slate-800">Ready to Share!</h2>
                    <p className="text-[10px] text-slate-400 px-6">Your AI-enhanced karaoke is ready.</p>
                  </>
                )}
              </div>
              {!isExporting && (
                <>
                  <div className="bg-white border border-slate-100 p-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
                    {uploadedVideoUrl ? <video src={`${uploadedVideoUrl}#t=0.1`} preload="metadata" className="w-12 h-12 object-cover rounded-lg bg-black" /> : <img src={waterfallImg} alt="thumb" className="w-12 h-12 object-cover rounded-lg" />}
                    <div className="flex-grow text-left">
                      <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1">{videoTitle || selectedFile?.replace(/\.[^.]+$/, '') || 'Untitled'}</h4>
                      <span className="text-[9px] text-slate-400 font-mono">{videoDuration > 0 ? formatTime(videoDuration) : '--:--'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Share Directly To</span>
                    <div className="grid grid-cols-3 gap-3">
                      <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Check out my karaoke video! 🎤')}`, '_blank')} className="flex flex-col items-center justify-center gap-1 py-3 bg-[#25D366] rounded-2xl hover:opacity-90 cursor-pointer">
                        <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span className="text-[9px] font-bold text-white">WhatsApp</span>
                      </button>
                      <button onClick={() => navigator.share ? navigator.share({ title: 'My Karaoke 🎤', text: 'Check this out!' }).catch(() => {}) : triggerToast('Share from gallery!')} className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl hover:opacity-90 cursor-pointer" style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                        <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        <span className="text-[9px] font-bold text-white">Instagram</span>
                      </button>
                      <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('My karaoke 🎤')}`, '_blank')} className="flex flex-col items-center justify-center gap-1 py-3 bg-[#229ED9] rounded-2xl hover:opacity-90 cursor-pointer">
                        <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                        <span className="text-[9px] font-bold text-white">Telegram</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {!isExporting && (
              <div className="mt-auto space-y-2 pt-2">
                <button
                  onClick={async () => {
                    const url = exportedBlobUrl;
                    if (!url) { triggerToast('No exported video ready! Export might have failed.'); return; }
                    triggerToast('Downloading...');
                    if (url.startsWith('blob:')) {
                      const a = document.createElement('a'); a.href = url; a.download = `${(selectedFile || videoTitle).replace(/[^a-z0-9]/gi, '_')}_karaoke.mp4`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    } else {
                      const resp = await fetch(url, { headers: { 'ngrok-skip-browser-warning': '69420' } }); const blob = await resp.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = blobUrl; a.download = `karaoke.mp4`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl);
                    }
                  }}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Download size={16} /> Save to Device
                </button>
                <button onClick={() => { setActiveTab('projects'); setProjectsTab('all'); setActiveScreen(1); }} className="w-full py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-50">
                  ← Back to Projects
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-between selection:bg-violet-600 selection:text-white">
      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 20 }} exit={{ opacity: 0, y: -50 }} className="fixed top-4 z-[200] bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg font-medium border border-violet-400 flex items-center gap-2">
            <Check size={18} /><span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Video Modal */}
      <AnimatePresence>
        {fullVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-between p-4 backdrop-blur-lg"
          >
            <div className="w-full flex justify-between items-center py-2 px-2 z-10">
              <span className="text-white font-bold text-sm truncate max-w-[70%]">{fullVideoModal.title}</span>
              <button
                onClick={() => setFullVideoModal(null)}
                className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 cursor-pointer text-lg font-bold"
              >
                &times;
              </button>
            </div>
            <div className="w-full max-w-2xl flex-grow flex items-center justify-center my-auto overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-2 pb-4 relative">
              {isModalLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold text-violet-400 animate-pulse">Loading video...</p>
                </div>
              )}
              {modalBlobUrl ? (
                <video
                  src={modalBlobUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <Film size={48} className="mx-auto text-violet-400 opacity-60" />
                  <p className="text-sm font-bold text-slate-300">{fullVideoModal.title}</p>
                  <p className="text-xs text-slate-500">Video output ready for playback</p>
                </div>
              )}
            </div>
            <div className="w-full max-w-2xl py-3 flex gap-3">
              <button
                onClick={() => {
                  const target = fullVideoModal;
                  setFullVideoModal(null);
                  openProject(target);
                }}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-2"
              >
                <Edit3 size={14} /> Open in Subtitle Editor
              </button>
              <button
                onClick={() => setFullVideoModal(null)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-800 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <LogOut size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Confirm Logout</h3>
                <p className="text-xs text-slate-500 mt-1">Are you sure you want to log out of KaraokeAI?</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Title Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full text-slate-800 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Edit Project Title</h3>
                  <p className="text-[10px] text-slate-400">Update video display name</p>
                </div>
              </div>
              <input
                type="text"
                value={editTitleInput}
                onChange={e => setEditTitleInput(e.target.value)}
                placeholder="Enter title..."
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800"
                autoFocus
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editTitleInput.trim() !== '') {
                      const newTitle = editTitleInput.trim();
                      setProjects(prev => prev.map(p => p.id === showEditModal.id ? { ...p, title: newTitle } : p));
                      triggerToast('Project title updated!');
                      if (supabaseReady) {
                        supabase.from('projects').update({ title: newTitle }).eq('id', showEditModal.id).then();
                      }
                    }
                    setShowEditModal(null);
                  }}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Save Title
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landing */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-grow">
        {/* Left panel */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 rounded-full text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="animate-pulse" /> Production-Level AI Video Suite
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">Karaoke<span className="text-violet-500">AI</span> Mobile</h1>
          <p className="text-slate-400 text-base leading-relaxed">Transform any video into a synchronized karaoke track using advanced AI vocal separation and word-level speech transcription.</p>
          <div className="pt-4 flex flex-wrap gap-4">
            <button onClick={() => setAppMode('mobile')} className="px-6 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl flex items-center gap-3 shadow-lg shadow-violet-600/30 transition-all cursor-pointer">
              <Smartphone size={22} /> Open Mobile App
            </button>
            <a
              href="#"
              download="KaraokeAI.apk"
              onClick={(e) => { e.preventDefault(); triggerToast('APK coming soon — stay tuned!'); }}
              className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer border border-emerald-500/30"
            >
              <Download size={22} /> Download Android APK
            </a>
          </div>
          {/* Supabase DB status badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            supabaseReady
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-700/30 border-slate-700 text-slate-500'
          }`}>
            <Database size={12} />
            {supabaseReady ? 'Supabase Connected' : 'Database: Add credentials in .env'}
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2"><Smartphone size={16} className="text-violet-500" /> Simulator Controller</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[{ step: 1, name: '1. Login / Signup' }, { step: 'projects-create', name: '2. Create Karaoke' }, { step: 'analytics', name: '3. Analytics' }, { step: 'profile', name: '4. Profile' }].map((btn: any) => (
                <button key={btn.step} onClick={() => {
                  if (btn.step === 'projects-create') { if (authScreen !== 'app') setAuthScreen('app'); setActiveTab('projects'); setProjectsTab('create'); setActiveScreen(1); }
                  else if (btn.step === 'analytics') { if (authScreen !== 'app') setAuthScreen('app'); setActiveTab('analytics'); }
                  else if (btn.step === 'profile') { if (authScreen !== 'app') setAuthScreen('app'); setActiveTab('profile'); }
                  else { setAuthScreen('login'); }
                  if (appMode === 'landing') setAppMode('mobile');
                }} className="px-3 py-2.5 text-xs font-bold rounded-xl text-left border transition-all bg-slate-950/40 text-slate-400 border-slate-800 hover:border-violet-600 hover:text-slate-200">
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

        {/* Phone frame */}
        <div id="app-simulator" className={appMode !== 'landing' ? "fixed inset-0 z-[100] bg-[#0c0f1e] flex flex-col items-center justify-center overflow-auto p-4" : "lg:col-span-7 flex justify-center py-4"}>
          {appMode !== 'landing' && (
            <div className="absolute top-6 left-6 z-50">
              <button onClick={() => setAppMode('landing')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-sm backdrop-blur-md transition-all cursor-pointer">
                <ChevronLeft size={18} /> Back to Landing
              </button>
            </div>
          )}
          <div className={`relative ${appMode === 'desktop' ? 'w-full max-w-[1024px] h-[720px] rounded-3xl' : 'w-[360px] h-[740px] rounded-[50px] shrink-0'} bg-slate-950 border-[10px] border-slate-900 shadow-[0_0_80px_rgba(124,58,237,0.15)] overflow-hidden flex flex-col transition-all duration-500`}>
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-slate-900 rounded-b-2xl z-40 flex justify-center items-center">
              <div className="w-16 h-1 bg-slate-950 rounded-full" />
              <div className="absolute right-4 w-2 h-2 bg-slate-950 rounded-full" />
            </div>
            {renderPhoneContent()}
          </div>
        </div>
      </div>

      {/* Footer */}
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
