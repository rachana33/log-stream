import React from 'react';
import { Activity, Terminal, Zap, TrendingUp } from 'lucide-react';

export default function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-8 font-sans">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
                <div>
                    <div className="flex items-center gap-3">
                        <Activity className="text-blue-400 w-8 h-8" />
                        <div className="h-9 w-48 bg-slate-800/50 rounded"></div>
                    </div>
                    <div className="h-4 w-64 bg-slate-800/30 rounded mt-2 md:ml-11"></div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="h-10 w-32 bg-slate-800/50 rounded"></div>
                    <div className="h-10 w-36 bg-slate-800/50 rounded"></div>
                </div>
            </header>

            {/* Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto animate-pulse">
                <div className="h-12 bg-slate-800/50 rounded-xl"></div>
            </div>

            {/* AI Hazard Detection */}
            <div className="mb-8 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <div className="h-5 w-48 bg-slate-800/50 rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 w-32 bg-slate-800/50 rounded animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-5 rounded-xl border border-slate-800 bg-slate-800/20 animate-pulse">
                            <div className="h-6 w-32 bg-slate-700/50 rounded mb-3"></div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-700/30 rounded"></div>
                                <div className="h-3 bg-slate-700/30 rounded w-4/5"></div>
                            </div>
                            <div className="mt-4 h-3 bg-slate-700/50 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Log Stream Skeleton */}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
                    <div className="p-4 border-b border-slate-800/60 bg-slate-900/80">
                        <div className="flex items-center gap-2 mb-4">
                            <Terminal className="w-5 h-5 text-indigo-400" />
                            <div className="h-5 w-32 bg-slate-800/50 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="h-10 w-40 bg-slate-800/50 rounded animate-pulse"></div>
                            <div className="h-10 w-64 bg-slate-800/50 rounded animate-pulse"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden p-4 space-y-3">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="h-8 w-16 bg-slate-800/40 rounded"></div>
                                <div className="h-8 w-20 bg-slate-800/40 rounded"></div>
                                <div className="h-8 flex-1 bg-slate-800/40 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Charts Skeleton */}
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl h-[335px]">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            <div className="h-4 w-32 bg-slate-800/50 rounded animate-pulse"></div>
                        </div>
                        <div className="h-full flex items-end gap-4 pb-8">
                            {[65, 48, 82, 54].map((height, i) => (
                                <div key={i} className="flex-1 bg-slate-800/40 rounded-t animate-pulse" style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}></div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl h-[335px]">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <div className="h-4 w-32 bg-slate-800/50 rounded animate-pulse"></div>
                        </div>
                        <div className="h-full">
                            <div className="h-full w-full bg-slate-800/20 rounded animate-pulse flex items-center justify-center">
                                <div className="space-y-2 w-full px-4">
                                    <div className="h-1 bg-slate-700/50 rounded"></div>
                                    <div className="h-1 bg-slate-700/50 rounded w-5/6"></div>
                                    <div className="h-1 bg-slate-700/50 rounded w-4/6"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pulsing indicator */}
            <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-slate-900/90 backdrop-blur-lg px-4 py-3 rounded-lg border border-indigo-500/30 shadow-2xl">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-indigo-300">Loading demo...</span>
            </div>
        </div>
    );
}
