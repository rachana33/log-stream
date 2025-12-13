'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Activity, Terminal, Zap, RefreshCw, Filter, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface Log {
    id: number;
    source: string;
    message: string;
    severity: string;
    metadata: any;
    createdAt: string;
}

interface SeverityStat {
    severity: string;
    count: number;
    [key: string]: any;
}

const COLORS: Record<string, string> = {
    error: '#ef4444', // Red-500
    warn: '#f59e0b',  // Amber-500
    info: '#3b82f6',  // Blue-500
    debug: '#10b981', // Emerald-500
};

export default function Dashboard() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [stats, setStats] = useState<SeverityStat[]>([]);
    const [insights, setInsights] = useState<string | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [connected, setConnected] = useState(false);

    // UI States
    const [filterSeverity, setFilterSeverity] = useState<string>('all'); // 'all' | 'error' | 'warn' | 'info'
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchInitialData = async () => {
        try {
            const logsRes = await fetch(`${API_URL}/logs/recent`);
            const statsRes = await fetch(`${API_URL}/logs/severity-breakdown`);

            if (logsRes.ok) setLogs(await logsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
            console.error('Failed to fetch initial data', err);
        }
    };

    useEffect(() => {
        fetchInitialData();

        // SignalR Connection
        const connectSignalR = async () => {
            try {
                const negRes = await fetch(`${API_URL}/realtime/negotiate`, { method: 'POST' });
                if (!negRes.ok) {
                    console.warn("SignalR negotiation failed, using polling fallback or offline mode");
                    return;
                }
                const { url, accessToken } = await negRes.json();

                const connection = new HubConnectionBuilder()
                    .withUrl(url, { accessTokenFactory: () => accessToken })
                    .withAutomaticReconnect()
                    .build();

                connection.on('newLog', (log: Log) => {
                    setLogs((prev) => [log, ...prev].slice(0, 200)); // Keep last 200 in memory

                    // Update stats locally for immediate feedback
                    setStats((prev) => {
                        const existing = prev.find(s => s.severity === log.severity);
                        if (existing) {
                            return prev.map(s => s.severity === log.severity ? { ...s, count: s.count + 1 } : s);
                        }
                        return [...prev, { severity: log.severity, count: 1 }];
                    });
                });

                await connection.start();
                setConnected(true);
                console.log('SignalR Connected');
            } catch (err) {
                console.error('SignalR Connection Failed:', err);
            }
        };

        connectSignalR();
    }, []);

    const generateInsights = async () => {
        setLoadingInsights(true);
        try {
            // Send only recent logs to avoid payload limits
            const payload = { logs: logs.slice(0, 50) };

            const res = await fetch(`${API_URL}/ai/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            setInsights(data.insights || data.message || 'No insights returned');
        } catch (err) {
            setInsights('Failed to generate insights. Backend may be unreachable.');
            console.error(err);
        } finally {
            setLoadingInsights(false);
        }
    };

    const filteredLogs = useMemo(() => {
        if (filterSeverity === 'all') return logs;
        return logs.filter(l => l.severity === filterSeverity);
    }, [logs, filterSeverity]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Activity className="text-cyan-400 w-8 h-8" /> LogStream AI
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 ml-11">Real-time Anomaly Detection & Insights</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${connected ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        {connected ? 'LIVE STREAM' : 'OFFLINE'}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* 1. Enhanced Visuals (Donut Chart) */}
                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 text-slate-200 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-400" />
                        Log Severity
                    </h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats}
                                    dataKey="count"
                                    nameKey="severity"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.severity] || '#94a3b8'} className="stroke-transparent outline-none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. AI Insights Panel */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="flex-1 bg-gradient-to-br from-slate-900 to-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Zap size={150} />
                        </div>

                        <div className="flex justify-between items-start mb-6 z-10 relative">
                            <h3 className="text-xl font-semibold text-indigo-200 flex items-center gap-2">
                                <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                                AI Anomaly Analysis
                            </h3>
                            <button
                                onClick={generateInsights}
                                disabled={loadingInsights}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl text-sm font-semibold text-white transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {loadingInsights ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Scan Logs'}
                            </button>
                        </div>

                        <div className="prose prose-invert prose-sm max-w-none relative z-10">
                            {insights ? (
                                <div className="bg-black/20 backdrop-blur-sm p-5 rounded-xl border border-indigo-500/20 whitespace-pre-line text-slate-200 leading-relaxed shadow-inner">
                                    {insights}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 bg-slate-900/30">
                                    <Zap className="w-8 h-8 mb-2 opacity-50" />
                                    <p>Tap "Scan Logs" to detect pattern anomalies via Azure OpenAI.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Filterable Log Stream */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[700px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-emerald-400" /> Live Stream
                    </h3>

                    {/* Filter Controls */}
                    <div className="flex bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                        {(['all', 'error', 'warn', 'info'] as const).map((sev) => {
                            const isActive = filterSeverity === sev;
                            let activeClass = 'bg-slate-700 text-slate-200';
                            if (isActive && sev === 'error') activeClass = 'bg-red-500/20 text-red-400 border border-red-500/20 text-red-100';
                            if (isActive && sev === 'warn') activeClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/20 text-amber-100';
                            if (isActive && sev === 'info') activeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/20 text-blue-100';
                            if (isActive && sev === 'all') activeClass = 'bg-slate-700 text-white';

                            return (
                                <button
                                    key={sev}
                                    onClick={() => setFilterSeverity(sev)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${isActive ? activeClass : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {sev}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar border border-slate-800 rounded-xl bg-slate-950/30">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 shadow-sm">
                            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                                <th className="p-4 w-32">Time</th>
                                <th className="p-4 w-24">Severity</th>
                                <th className="p-4 w-48">Source</th>
                                <th className="p-4">Message</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-mono divide-y divide-slate-800/50">
                            {filteredLogs.map((log, i) => (
                                <tr key={log.id || i} className="hover:bg-slate-800/20 transition-colors group">
                                    <td className="p-4 text-slate-400 whitespace-nowrap text-xs">
                                        {new Date(log.createdAt || Date.now()).toLocaleTimeString()}
                                    </td>
                                    <td className="p-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${log.severity === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                log.severity === 'warn' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {log.severity === 'error' && <AlertTriangle className="w-3 h-3" />}
                                            {log.severity === 'warn' && <AlertTriangle className="w-3 h-3" />}
                                            {log.severity === 'info' && <Info className="w-3 h-3" />}
                                            {log.severity.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-cyan-200/80">{log.source}</td>
                                    <td className="p-4 text-slate-300 group-hover:text-white transition-colors">{log.message}</td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                        <Filter className="w-8 h-8 mb-2 opacity-20" />
                                        {logs.length === 0 ? 'Waiting for logs...' : 'No logs match this filter.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div ref={logsEndRef} />
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1e293b;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #475569;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #64748b;
                }
            `}</style>
        </div>
    );
}
