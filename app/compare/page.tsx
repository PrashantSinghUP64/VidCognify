"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitCompare, Loader2, Trophy, Youtube, AlertCircle, CheckCircle, RefreshCcw, Swords } from "lucide-react";

function extractVideoId(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const alternatingColors = [
  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/60",
  "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/60",
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/60"
];

export default function ComparePage() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    commonTopics: string[];
    video1Better: string;
    video2Better: string;
    winner: string;
    reason?: string;
  } | null>(null);

  const handleCompare = async () => {
    if (!url1 || !url2) {
      setError("Please enter both YouTube URLs.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const encodedUrl1 = Buffer.from(url1).toString('base64');
      const encodedUrl2 = Buffer.from(url2).toString('base64');

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl1: encodedUrl1, videoUrl2: encodedUrl2 }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to compare videos.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setUrl1("");
    setUrl2("");
    setError(null);
  }

  const v1Winner = result?.winner?.toLowerCase().includes("1") || false;
  const v2Winner = result?.winner?.toLowerCase().includes("2") || false;
  
  const id1 = extractVideoId(url1);
  const id2 = extractVideoId(url2);

  const winnerTitle = v1Winner ? "🏆 Video 1 Wins!" : v2Winner ? "🏆 Video 2 Wins!" : "🤝 It's a Tie!";

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
      {!result ? (
        <div className="space-y-10 w-full animate-in fade-in duration-500">
          <div className="text-center space-y-4 pt-10">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-4">
              <Swords className="w-10 h-10 text-indigo-500" />
              Ultimate Video Battle
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
              Line up two videos and let AI declare the conceptual winner.
            </p>
          </div>

          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-4 py-8">
            <div className="w-full flex-1 space-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden flex items-center p-2">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mr-3 shrink-0">
                    <span className="font-bold text-blue-700 dark:text-blue-300">V1</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Paste Video 1 URL..."
                    value={url1}
                    onChange={(e) => setUrl1(e.target.value)}
                    className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-700 dark:text-white p-2 font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl border-4 border-white dark:border-slate-950 z-10">
              <span className="text-xl font-black italic">VS</span>
            </div>

            <div className="w-full flex-1 space-y-2">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden flex items-center p-2">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center mr-3 shrink-0">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">V2</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Paste Video 2 URL..."
                    value={url2}
                    onChange={(e) => setUrl2(e.target.value)}
                    className="flex-1 bg-transparent border-0 focus:ring-0 text-slate-700 dark:text-white p-2 font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleCompare} 
              disabled={loading || !url1 || !url2}
              className="rounded-xl px-12 py-8 text-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all shadow-xl hover:scale-105 hover:-translate-y-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Judging...
                </>
              ) : (
                <>
                  <GitCompare className="w-6 h-6 mr-3" />
                  Compare Now
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-start gap-3 border border-red-100 dark:border-red-900/30 max-w-xl mx-auto mt-8">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="font-bold">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10 pb-20 animate-in fade-in duration-500">
          
          {/* WINNER BANNER */}
          <div className="w-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 rounded-3xl p-1 shadow-2xl relative">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[22px] p-8 md:p-12 flex flex-col items-center justify-center text-center">
              <div className="max-w-3xl mx-auto flex flex-col items-center">
                <Trophy className="w-20 h-20 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-br from-yellow-500 to-amber-600 bg-clip-text text-transparent mb-4 tracking-tight drop-shadow-sm">
                  {winnerTitle}
                </h2>
                {result.reason && (
                  <p className="text-slate-600 dark:text-slate-300 text-xl font-medium italic mt-2 leading-relaxed">
                    "{result.reason}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* VS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CARD 1 */}
            <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border-4 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${v1Winner ? "border-blue-500 scale-[1.02]" : "border-slate-200 dark:border-slate-800 opacity-60 scale-95"}`}>
              {v1Winner && (
                <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-black px-4 py-1.5 rounded-full shadow-lg border border-yellow-300 text-sm tracking-wider">
                  WINNER
                </div>
              )}
              {id1 && (
                <div className="w-full h-48 sm:h-56 relative bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img 
                    src={`https://img.youtube.com/vi/${id1}/mqdefault.jpg`} 
                    alt="Video 1 thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 font-black text-white text-3xl drop-shadow-md">Video 1</div>
                </div>
              )}
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
                  <CheckCircle className="w-6 h-6" />
                  <h3 className="font-bold uppercase tracking-widest text-sm">Better At</h3>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-lg font-semibold leading-relaxed">
                  {result.video1Better}
                </p>
              </div>
            </div>

            {/* CARD 2 */}
            <div className={`relative bg-white dark:bg-slate-900 rounded-3xl border-4 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${v2Winner ? "border-emerald-500 scale-[1.02]" : "border-slate-200 dark:border-slate-800 opacity-60 scale-95"}`}>
              {v2Winner && (
                <div className="absolute top-4 right-4 z-20 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-black px-4 py-1.5 rounded-full shadow-lg border border-yellow-300 text-sm tracking-wider">
                  WINNER
                </div>
              )}
              {id2 && (
                <div className="w-full h-48 sm:h-56 relative bg-slate-100 dark:bg-slate-800 shrink-0">
                  <img 
                    src={`https://img.youtube.com/vi/${id2}/mqdefault.jpg`} 
                    alt="Video 2 thumbnail" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 font-black text-white text-3xl drop-shadow-md">Video 2</div>
                </div>
              )}
              <div className="p-8 flex-1 flex flex-col items-center justify-center text-center bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                  <h3 className="font-bold uppercase tracking-widest text-sm">Better At</h3>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-lg font-semibold leading-relaxed">
                  {result.video2Better}
                </p>
              </div>
            </div>
          </div>

          {/* COMMON TOPICS */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 text-center">
            <h3 className="text-slate-900 dark:text-white font-black text-2xl mb-8 flex items-center justify-center gap-3">
              Topics Both Videos Cover
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {(result.commonTopics || []).map((topic, i) => (
                <span 
                  key={i} 
                  className={`px-6 py-3 rounded-full text-sm font-bold border shadow-sm ${alternatingColors[i % alternatingColors.length]}`}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <Button 
              onClick={handleReset} 
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 text-lg border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
            >
              <RefreshCcw className="w-5 h-5 mr-3" />
              Compare New Videos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
