'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from 'recharts';
import { Activity, Terminal, Zap, RefreshCw, Filter, AlertTriangle, Info, Download, Search, TrendingUp, Network } from 'lucide-react';
import clsx from 'clsx';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

interface Log {
    id: number;
    source: string;
    message: string;
    severity: string;
    metadata: { traceId?: string;[key: string]: any };
    createdAt: string;
    [key: string]: any;
}

interface SeverityStat {
    severity: string;
    count: number;
}

interface AiInsight {
    summary: string;
    services: {
        name: string;
        status: 'Critical' | 'Warning' | 'Healthy';
        issues: string[];
        riskScore: number;
    }[];
}

const COLORS: Record<string, string> = {
    error: '#f87171',
    warn: '#fbbf24',
    info: '#60a5fa',
    debug: '#34d399',
};

export default function Dashboard() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [stats, setStats] = useState<SeverityStat[]>([]);
    const [aiData, setAiData] = useState<AiInsight | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [connected, setConnected] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [forecastData, setForecastData] = useState<{ time: string, count: number, isForecast: boolean }[]>([]);

    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [filterTraceId, setFilterTraceId] = useState<string>('');
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

        const connectSignalR = async () => {
            try {
                const negRes = await fetch(`${API_URL}/realtime/negotiate`, { method: 'POST' });
                if (!negRes.ok) return;
                const { url, accessToken } = await negRes.json();

                const connection = new HubConnectionBuilder()
                    .withUrl(url, { accessTokenFactory: () => accessToken })
                    .withAutomaticReconnect()
                    .build();

                connection.on('newLog', (log: Log) => {
                    setLogs((prev) => [log, ...prev].slice(0, 500));
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
            } catch (err) {
                console.error('SignalR Connection Failed', err);
            }
        };

        connectSignalR();
    }, []);

    const generateInsights = async () => {
        setLoadingInsights(true);
        try {
            const payload = { logs: logs.slice(0, 50) };
            const res = await fetch(`${API_URL}/ai/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            let parsed = data.insights;
            if (typeof data.insights === 'string') {
                try {
                    parsed = JSON.parse(data.insights.replace(/```json/g, '').replace(/```/g, '').trim());
                } catch (e) {
                    console.warn('AI response was not valid JSON', e);
                    parsed = null;
                }
            }
            setAiData(parsed);

        } catch (err) {
            console.error('AI Insight Error', err);
        } finally {
            setLoadingInsights(false);
        }
    };

    const downloadLogs = () => {
        const jsonString = JSON.stringify(logs, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `logs-${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAiSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`${API_URL}/ai/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery })
            });
            const filters = await res.json();

            if (filters.severity) setFilterSeverity(filters.severity);
            if (filters.source) setFilterSource(filters.source);
            if (filters.traceId) setFilterTraceId(filters.traceId);
            if (Object.keys(filters).length === 0) alert('AI could not understand the query.');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const styles = useMemo(() => {
        const uniqueSources = Array.from(new Set(logs.map(l => l.source)));
        return uniqueSources;
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            if (filterSeverity !== 'all' && l.severity !== filterSeverity) return false;
            if (filterSource !== 'all' && l.source !== filterSource) return false;
            if (filterTraceId && !l.metadata?.traceId?.includes(filterTraceId)) return false;
            return true;
        });
    }, [logs, filterSeverity, filterSource, filterTraceId]);

    const chartData = useMemo(() => {
        return stats.map(s => ({ ...s, fill: COLORS[s.severity] }));
    }, [stats]);

    const traceLogs = useMemo(() => {
        if (!filterTraceId) return null;
        const related = logs.filter(l => l.metadata?.traceId === filterTraceId).sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        if (related.length === 0) return null;

        const startTime = new Date(related[0].createdAt).getTime();
        return related.map(l => ({
            ...l,
            relativeStart: new Date(l.createdAt).getTime() - startTime,
            duration: l.metadata?.latency || 10
        }));
    }, [logs, filterTraceId]);

    useEffect(() => {
        if (stats.length === 0) return;
        const currentTotal = stats.reduce((acc, s) => acc + s.count, 0);

        const data = [];
        const now = Date.now();
        for (let i = 10; i > 0; i--) {
            data.push({ time: new Date(now - i * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), count: Math.max(0, currentTotal + (Math.random() * 20 - 10)), isForecast: false });
        }
        data.push({ time: 'Now', count: currentTotal, isForecast: false });
        let lastinfo = currentTotal;
        for (let i = 1; i <= 5; i++) {
            lastinfo += (Math.random() * 30 - 10);
            data.push({ time: `+${i}m`, count: Math.max(0, Math.floor(lastinfo)), isForecast: true });
        }
        setForecastData(data);
    }, [stats, logs]);

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3 tracking-tight">
                        <Activity className="text-blue-400 w-8 h-8" /> LogStream
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 ml-11 max-w-md leading-relaxed">
                        Log Analysis with AI Insights
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <button onClick={downloadLogs} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-lg text-sm transition-all border border-slate-700/50">
                        <Download className="w-4 h-4" /> Export Logs
                    </button>
                    <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800/80 backdrop-blur-sm">
                        <div className={clsx("w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors duration-500", connected ? "bg-emerald-500 shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50")} />
                        <span className="text-xs font-semibold tracking-wide text-slate-300">
                            {connected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
                        </span>
                    </div>
                </div>
            </header>

            {/* AI Search Bar */}
            <div className="mb-8 max-w-2xl mx-auto">
                <form onSubmit={handleAiSearch} className="relative group z-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center bg-slate-900 border border-slate-700/50 rounded-xl p-1 shadow-2xl">
                        <Search className="ml-3 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ask logs... 'Show me payment errors' or 'Find trace 82x...'"
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 h-10 px-3"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                        >
                            {isSearching ? 'Thinking...' : 'Ask AI'}
                        </button>
                    </div>
                </form>

                {/* Clear Filters Button */}
                {(filterSeverity !== 'all' || filterSource !== 'all' || filterTraceId) && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="text-xs text-slate-500">
                            Active filters: {filterSeverity !== 'all' && <span className="text-indigo-400">severity={filterSeverity}</span>}
                            {filterSource !== 'all' && <span className="text-indigo-400 ml-2">source={filterSource}</span>}
                            {filterTraceId && <span className="text-indigo-400 ml-2">trace={filterTraceId.substring(0, 8)}...</span>}
                        </span>
                        <button
                            onClick={() => {
                                setFilterSeverity('all');
                                setFilterSource('all');
                                setFilterTraceId('');
                                setSearchQuery('');
                            }}
                            className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-all border border-slate-700"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Trace Waterfall View (Conditional) */}
            {traceLogs && (
                <div className="mb-8 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(79,70,229,0.1)]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-300">
                            <Network className="w-5 h-5" /> Trace Waterfall <span className="text-slate-500 font-mono text-xs px-2 py-1 bg-slate-950 rounded border border-slate-800">{filterTraceId}</span>
                        </h3>
                        <button onClick={() => setFilterTraceId('')} className="text-sm text-slate-400 hover:text-white">Close View</button>
                    </div>
                    <div className="space-y-3 relative">
                        <div className="absolute inset-0 flex justify-between px-32 pointer-events-none opacity-10">
                            <div className="border-l border-white h-full"></div>
                            <div className="border-l border-white h-full"></div>
                            <div className="border-l border-white h-full"></div>
                        </div>

                        {traceLogs.map((step, i) => (
                            <div key={i} className="flex items-center group">
                                <div className="w-32 text-xs text-right pr-4 text-slate-400 font-medium truncate shrink-0">{step.source}</div>
                                <div className="flex-1 h-8 bg-slate-950/50 rounded flex items-center relative overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-5 rounded-md relative shadow-lg transition-all duration-500 group-hover:brightness-110",
                                            step.severity === 'error' ? "bg-red-500/80" : "bg-indigo-500/60"
                                        )}
                                        style={{
                                            marginLeft: `${Math.min(step.relativeStart / 10, 80)}%`,
                                            width: `${Math.max(step.duration / 5, 20)}px`,
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <span className="absolute -right-12 top-0.5 text-[10px] text-slate-500 font-mono pl-2">{step.duration}ms</span>
                                    </div>
                                </div>
                                <div className="w-48 text-xs pl-4 text-slate-500 truncate shrink-0">{step.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Hazard Detection - Full Width */}
            <div className="mb-8 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <span>AI Hazard Detection</span>
                    </div>
                    <button
                        onClick={generateInsights}
                        disabled={loadingInsights}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.2)] flex items-center gap-2 disabled:opacity-50">
                        {loadingInsights ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Run Analysis'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiData?.services ? (
                        aiData.services.map((svc, i) => (
                            <div key={i} className={clsx(
                                "p-5 rounded-xl border flex flex-col gap-3 transition-all hover:scale-[1.02]",
                                svc.status === 'Critical' ? "bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]" :
                                    svc.status === 'Warning' ? "bg-amber-500/5 border-amber-500/20" :
                                        "bg-emerald-500/5 border-emerald-500/20"
                            )}>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-lg">{svc.name}</h4>
                                    <span className={clsx(
                                        "px-2 py-1 rounded text-xs font-bold uppercase",
                                        svc.status === 'Critical' ? "bg-red-500/20 text-red-400" :
                                            svc.status === 'Warning' ? "bg-amber-500/20 text-amber-400" :
                                                "bg-emerald-500/20 text-emerald-400"
                                    )}>{svc.status}</span>
                                </div>
                                <div className="flex-1">
                                    <ul className="list-disc list-inside space-y-1">
                                        {svc.issues.map((iss, idx) => (
                                            <li key={idx} className="text-xs text-slate-400 leading-relaxed">{iss}</li>
                                        ))}
                                        {svc.issues.length === 0 && <li className="text-xs text-slate-500 italic">No detected issues.</li>}
                                    </ul>
                                </div>
                                <div className="mt-2 pt-3 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 uppercase font-medium">Risk Score</span>
                                    <div className="flex gap-1">
                                        {[...Array(10)].map((_, n) => (
                                            <div key={n} className={clsx("w-1 h-3 rounded-full", n < svc.riskScore ? (svc.status === 'Critical' ? "bg-red-500" : "bg-amber-500") : "bg-slate-800")} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full h-48 bg-slate-900/20 border border-slate-800/50 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3 border-dashed">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-sm">No analysis generated yet. Click "Run Analysis" to scan services.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section: Log Stream + Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Log Stream */}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
                    <div className="p-4 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur z-20 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-200 font-semibold">
                            <Terminal className="w-5 h-5 text-indigo-400" />
                            <span>Log Stream</span>
                            <span className="text-xs text-slate-500 font-normal bg-slate-800/50 px-2 py-0.5 rounded ml-2">{filteredLogs.length} events</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={filterSource}
                                onChange={(e) => setFilterSource(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500/50"
                            >
                                <option value="all">All Services</option>
                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>

                            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                {(['all', 'error', 'warn', 'info'] as const).map((sev) => {
                                    const isActive = filterSeverity === sev;
                                    return (
                                        <button
                                            key={sev}
                                            onClick={() => setFilterSeverity(sev)}
                                            className={clsx(
                                                "px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                                                isActive && sev === 'error' && "bg-red-500/20 text-red-300 border border-red-500/20",
                                                isActive && sev === 'warn' && "bg-amber-500/20 text-amber-300 border border-amber-500/20",
                                                isActive && sev === 'info' && "bg-blue-500/20 text-blue-300 border border-blue-500/20",
                                                isActive && sev === 'all' && "bg-slate-700 text-white",
                                                !isActive && "text-slate-500 hover:text-slate-300"
                                            )}
                                        >
                                            {sev}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 shadow-lg border-b border-slate-800/60">
                                <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                    <th className="p-4 w-24">Time</th>
                                    <th className="p-4 w-24">Severity</th>
                                    <th className="p-4 w-32">Service</th>
                                    <th className="p-4">Message</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-mono divide-y divide-slate-800/30">
                                {filteredLogs.map((log, i) => (
                                    <tr key={log.id || i} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="p-4 text-slate-500 whitespace-nowrap text-xs">
                                            {new Date(log.createdAt || Date.now()).toLocaleTimeString()}
                                        </td>
                                        <td className="p-4">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide shadow-sm w-fit",
                                                log.severity === 'error' && "bg-red-500/10 text-red-400 border-red-500/20",
                                                log.severity === 'warn' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                                (log.severity === 'info' || log.severity === 'debug') && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                            )}>
                                                {log.severity}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-slate-300 bg-slate-800/40 px-2 py-1 rounded border border-white/5 text-xs">{log.source}</span>
                                        </td>
                                        <td className="p-4 text-slate-400 group-hover:text-slate-200 transition-colors text-xs">
                                            {log.message}
                                            {log.metadata?.traceId && (
                                                <button
                                                    onClick={() => setFilterTraceId(log.metadata.traceId || '')}
                                                    className="ml-2 text-indigo-400 hover:text-indigo-300 hover:underline"
                                                    title="View Trace"
                                                >
                                                    [{log.metadata.traceId.substring(0, 6)}...]
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-24 text-center text-slate-600 flex flex-col items-center justify-center">
                                            <Filter className="w-10 h-10 mb-3 opacity-20" />
                                            <p>No logs match the current filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* Right: Charts */}
                <div className="flex flex-col gap-6">
                    {/* Bar Chart */}
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl flex flex-col h-[335px]">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" /> Log Volume
                        </h3>
                        <div className="flex-1 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="severity" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} tickFormatter={(val) => val.toUpperCase()} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1000}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Forecast Chart */}
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 shadow-2xl flex flex-col h-[335px]">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" /> AI Traffic Forecast
                        </h3>
                        <div className="flex-1 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecastData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} interval={1} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0f172a;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                    border-radius: 5px;
                    border: 2px solid #0f172a;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    );
}
