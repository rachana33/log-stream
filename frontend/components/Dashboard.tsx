'use client';

import React, { useEffect, useState } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Activity, AlertCircle, Terminal, Zap, RefreshCw } from 'lucide-react';

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
    error: '#ef4444',
    warn: '#f59e0b',
    info: '#3b82f6',
    debug: '#10b981',
};

export default function Dashboard() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [stats, setStats] = useState<SeverityStat[]>([]);
    const [insights, setInsights] = useState<string | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [connected, setConnected] = useState(false);

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
                    setLogs((prev) => [log, ...prev].slice(0, 50));
                    // Optimistically update stats? easier to refetch or just ignore for MVP
                    // For MVP, live logs are enough.
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
            const res = await fetch(`${API_URL}/ai/insights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logs),
            });
            const data = await res.json();
            setInsights(data.insights || data.message || 'No insights returned');
        } catch (err) {
            setInsights('Failed to generate insights.');
        } finally {
            setLoadingInsights(false);
        }
    };

    // Prepare chart data (simple example: count by severity)
    // For trend line, we'd need time buckets. MVP: just severity pie.

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Activity className="text-cyan-400" /> LogStream AI
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time Anomaly Detection & Insights</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${connected ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        {connected ? 'LIVE' : 'DISCONNECTED'}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Severity Breakdown */}
                <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
                    <h3 className="text-lg font-semibold mb-4 text-slate-200">Severity Distribution</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats}
                                    dataKey="count"
                                    nameKey="severity"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.severity] || '#94a3b8'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                        {stats.map(s => (
                            <div key={s.severity} className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[s.severity] || '#94a3b8' }}></div>
                                <span className="capitalize">{s.severity}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Insights */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900 border border-indigo-500/20 rounded-xl p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={100} />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-indigo-300 flex items-center gap-2">
                            <Zap className="w-5 h-5" /> AI Analysis
                        </h3>
                        <button
                            onClick={generateInsights}
                            disabled={loadingInsights}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50">
                            {loadingInsights ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Scan Logs'}
                        </button>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                        {insights ? (
                            <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-500/30 whitespace-pre-line text-slate-200 leading-relaxed">
                                {insights}
                            </div>
                        ) : (
                            <div className="text-slate-500 italic py-8 text-center border border-dashed border-slate-800 rounded-lg">
                                Click 'Scan Logs' to analyze recent anomalies using Azure OpenAI.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Logs Table */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" /> Live Stream
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
                                <th className="p-3">Time</th>
                                <th className="p-3">Severity</th>
                                <th className="p-3">Source</th>
                                <th className="p-3 w-1/2">Message</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-mono">
                            {logs.map((log, i) => (
                                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                                    <td className="p-3 text-slate-400 whitespace-nowrap">
                                        {new Date(log.createdAt || Date.now()).toLocaleTimeString()}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${log.severity === 'error' ? 'bg-red-500/20 text-red-400' :
                                            log.severity === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {log.severity?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-3 text-cyan-300">{log.source}</td>
                                    <td className="p-3 text-slate-300 ">{log.message}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">Waiting for logs...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
