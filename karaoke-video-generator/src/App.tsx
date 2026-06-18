import React, { useState } from 'react';
import { 
  Music, 
  FileVideo, 
  Settings, 
  Terminal, 
  Layers, 
  FileText,
  Play,
  CheckCircle2,
  Cpu,
  Type
} from 'lucide-react';
import { motion } from 'motion/react';

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

const pythonFiles = [
  { name: 'main.py', desc: 'CLI entry point and workflow coordinator', icon: Terminal },
  { name: 'transcriber.py', desc: 'Faster-Whisper engine for word-level timestamps', icon: Cpu },
  { name: 'subtitle_generator.py', desc: 'ASS logic with karaoke \\k tag implementation', icon: Type },
  { name: 'video_processor.py', desc: 'FFmpeg orchestration for audio & burning', icon: FileVideo },
  { name: 'config.py', desc: 'Global settings for models and subtitle styles', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'files'>('overview');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Music size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Karaoke Creator</h1>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Project Suite v1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'files' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Source Code
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'overview' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Hero Section */}
            <section className="text-center max-w-2xl mx-auto space-y-6">
              <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                Turn any video into a <span className="text-indigo-600">Karaoke masterpiece</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                A professional Python project using Faster-Whisper and FFmpeg to generate perfectly synchronized word-level subtitles.
              </p>
            </section>

            {/* Core Workflow */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Extract', desc: 'Audio isolation via FFmpeg', step: 1 },
                { title: 'Transcribe', desc: 'Whisper Word-Timestamps', step: 2 },
                { title: 'Generate', desc: 'ASS Karaoke Tags (\\k)', step: 3 },
                { title: 'Composite', desc: 'Sub Burn-in & Export', step: 4 }
              ].map((item, i) => (
                <Card key={i} className="flex flex-col items-center text-center p-8 border-dashed border-2 hover:border-indigo-200 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 mb-4">
                    0{item.step}
                  </span>
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 italic">{item.desc}</p>
                </Card>
              ))}
            </section>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12">
              <div className="space-y-8">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Layers className="text-indigo-600" size={24} />
                  Project Highlights
                </h3>
                <ul className="space-y-4">
                  {[
                    "Word-level synchronization (Centisecond precision)",
                    "Advanced SubStation Alpha (ASS) filter injection",
                    "Multilingual auto-detection using Large-v3/Medium",
                    "Optimized for high-quality video preservation",
                    "Modular Object-Oriented architecture"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle2 className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Card className="bg-slate-900 border-none text-slate-300 font-mono text-sm overflow-hidden p-0">
                <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-xs text-slate-500">terminal &mdash; main.py</span>
                </div>
                <div className="p-6 space-y-2">
                  <p className="text-emerald-400">$ python -m karaoke_generator.main input.mp4</p>
                  <p>[INFO] Initializing Whisper model: medium...</p>
                  <p>[INFO] Extracting audio from input.mp4...</p>
                  <p>[INFO] Detected language: en (prob: 0.99)</p>
                  <p>[INFO] Generating ASS subtitles...</p>
                  <p>[INFO] Burning subtitles into video...</p>
                  <p className="text-indigo-400">[SUCCESS] Karaoke video saved to output.mp4</p>
                </div>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Python Project Structure</h2>
                <p className="text-slate-500">Review the modular implementation files</p>
              </div>
              <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                <FileText size={14} /> Documentation
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pythonFiles.map((file, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow group">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-2 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <file.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1">{file.name}</h4>
                      <p className="text-sm text-slate-600 leading-snug">{file.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
              <Card className="bg-indigo-600 text-white border-none flex flex-col justify-between">
                <div>
                  <h4 className="font-bold mb-2">Ready to Install?</h4>
                  <p className="text-sm text-indigo-100 opacity-90">
                    All source files are generated and ready for use in your local environment.
                  </p>
                </div>
                <div className="pt-4 font-mono text-xs p-3 bg-indigo-700/50 rounded">
                  pip install -r requirements.txt
                </div>
              </Card>
            </div>

            {/* Quick Readme Snippet */}
            <div className="mt-8">
              <Card className="bg-white p-8">
                <div className="prose prose-slate max-w-none">
                  <h3 className="text-xl font-bold mb-4">Installation Guide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="space-y-3">
                      <p className="font-bold text-slate-500 uppercase tracking-wide">1. Setup FFmpeg</p>
                      <p>Ensure FFmpeg is installed on your system. It is used for audio isolation and subtitle overlay.</p>
                      <code className="block bg-slate-50 p-2 rounded">brew install ffmpeg</code>
                    </div>
                    <div className="space-y-3">
                      <p className="font-bold text-slate-500 uppercase tracking-wide">2. Virtual Env</p>
                      <p>Create a python 3.11 environment to keep dependencies clean.</p>
                      <code className="block bg-slate-50 p-2 rounded">python -m venv venv</code>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-24 py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            Developed as a Senior Python Multimedia Engineer submission.
          </p>
          <div className="flex items-center justify-center gap-6">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Cpu size={12} /> Faster-Whisper Medium
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Music size={12} /> ASS \k Highlighting
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FileVideo size={12} /> FFmpeg Sub Burn
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
