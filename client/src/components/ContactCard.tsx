import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Square, Activity, Wifi, Smartphone, Monitor, MessageCircle, Clock, BarChart2 } from 'lucide-react';
import clsx from 'clsx';
import { ActivityTimeline } from './ActivityTimeline';
import { ActivityStats } from './ActivityStats';

type ViewMode = 'live' | 'history' | 'stats';

type Platform = 'whatsapp' | 'signal';

interface TrackerData {
    rtt: number;
    avg: number;
    median: number;
    threshold: number;
    state: string;
    timestamp: number;
}

interface DeviceInfo {
    jid: string;
    state: string;
    rtt: number;
    avg: number;
}

interface ContactCardProps {
    jid: string;
    displayNumber: string;
    data: TrackerData[];
    devices: DeviceInfo[];
    deviceCount: number;
    presence: string | null;
    profilePic: string | null;
    onRemove: () => void;
    privacyMode?: boolean;
    platform?: Platform;
}

export function ContactCard({
    jid,
    displayNumber,
    data,
    devices,
    deviceCount,
    presence,
    profilePic,
    onRemove,
    privacyMode = false,
    platform = 'whatsapp'
}: ContactCardProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('live');
    const lastData = data[data.length - 1];
    const currentStatus = devices.length > 0
        ? (devices.find(d => d.state === 'OFFLINE')?.state ||
            devices.find(d => d.state.includes('Online'))?.state ||
            devices[0].state)
        : 'Unknown';

    // Blur phone number in privacy mode
    const blurredNumber = privacyMode ? displayNumber.replace(/\d/g, '•') : displayNumber;

    return (
        <div className="bg-dark-900 rounded-lg shadow-dark border border-dark-700 overflow-hidden">
            {/* Header with Stop Button */}
            <div className="bg-dark-800 border-b border-dark-700 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className={clsx(
                        "px-2 py-1 rounded text-xs flex items-center gap-1",
                        platform === 'whatsapp'
                            ? "bg-accent-green/20 text-accent-green"
                            : "bg-accent-blue/20 text-accent-blue"
                    )}>
                        <MessageCircle size={12} />
                        {platform === 'whatsapp' ? 'WhatsApp' : 'Signal'}
                    </span>
                    <h3 className="text-base font-semibold text-gray-100">{blurredNumber}</h3>
                </div>
                <button
                    onClick={onRemove}
                    className="px-4 py-2 bg-accent-red text-white rounded hover:bg-red-600 flex items-center gap-2 transition-colors text-sm"
                >
                    <Square size={16} /> Stop
                </button>
            </div>

            {/* View Mode Tabs */}
            <div className="px-6 pt-4">
                <div className="flex gap-1 bg-dark-950 p-1 rounded-lg border border-gray-300/20 inline-flex">
                    <button
                        onClick={() => setViewMode('live')}
                        className={clsx(
                            "px-4 py-2 text-xs rounded-md transition-all   flex items-center gap-2",
                            viewMode === 'live'
                                ? "bg-gray-300/20 text-gray-300 border border-gray-300/40 /30"
                                : "text-gray-300/50 hover:text-gray-300 hover:bg-dark-900"
                        )}
                    >
                        <Activity size={14} /> Live
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={clsx(
                            "px-4 py-2 text-xs rounded-md transition-all   flex items-center gap-2",
                            viewMode === 'history'
                                ? "bg-gray-300/20 text-gray-300 border border-gray-300/40 /30"
                                : "text-gray-300/50 hover:text-gray-300 hover:bg-dark-900"
                        )}
                    >
                        <Clock size={14} /> History
                    </button>
                    <button
                        onClick={() => setViewMode('stats')}
                        className={clsx(
                            "px-4 py-2 text-xs rounded-md transition-all   flex items-center gap-2",
                            viewMode === 'stats'
                                ? "bg-gray-300/20 text-gray-300 border border-gray-300/40 /30"
                                : "text-gray-300/50 hover:text-gray-300 hover:bg-dark-900"
                        )}
                    >
                        <BarChart2 size={14} /> Stats
                    </button>
                </div>
            </div>

            <div className="p-6 relative">
                {/* Live View */}
                {viewMode === 'live' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status Card */}
                    <div className="bg-dark-950 p-6 rounded-xl  border border-gray-300/20 flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-900 border-4 border-gray-300/50 ">
                                {profilePic ? (
                                    <img
                                        src={profilePic}
                                        alt="Profile"
                                        className={clsx(
                                            "w-full h-full object-cover transition-all duration-200",
                                            privacyMode && "blur-xl scale-110"
                                        )}
                                        style={privacyMode ? {
                                            filter: 'blur(16px) contrast(0.8)',
                                        } : {}}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300/30  text-xs">
                                        NO IMAGE
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "absolute bottom-2 right-2 w-6 h-6 rounded-full border-2 border-dark-950",
                                currentStatus === 'OFFLINE' ? "bg-accent-red " :
                                    currentStatus.includes('Online') ? "bg-accent-green  " :
                                        "bg-accent-yellow  "
                            )} />
                        </div>

                        <h4 className="text-xl font-bold  tracking-wider text-gray-300 mb-1">{blurredNumber}</h4>

                        <div className="flex items-center gap-2 mb-4">
                            <span className={clsx(
                                "px-3 py-1 rounded-full text-xs   border",
                                currentStatus === 'OFFLINE' ? "bg-accent-red/20 text-accent-red border-accent-red/40 /30" :
                                    currentStatus.includes('Online') ? "bg-accent-green/20 text-accent-green border-accent-green/40 /30" :
                                        currentStatus === 'Standby' ? "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/40 /30" :
                                            "bg-gray-300/20 text-gray-300 border-gray-300/40"
                            )}>
                                {currentStatus}
                            </span>
                        </div>

                        <div className="w-full pt-4 border-t border-gray-300/10 space-y-2">
                            <div className="flex justify-between items-center text-xs text-gray-300/60  ">
                                <span className="flex items-center gap-1"><Wifi size={16} className="text-gray-300/40" /> Official Status</span>
                                <span className="font-bold text-gray-300">{presence || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-300/60  ">
                                <span className="flex items-center gap-1"><Smartphone size={16} className="text-gray-300/40" /> Devices</span>
                                <span className="font-bold text-gray-300">{deviceCount || 0}</span>
                            </div>
                        </div>

                        {/* Device List */}
                        {devices.length > 0 && (
                            <div className="w-full pt-4 border-t border-gray-300/10 mt-4">
                                <h5 className="text-xs  font-bold text-gray-300/50  mb-2">Device States</h5>
                                <div className="space-y-1">
                                    {devices.map((device, idx) => (
                                        <div key={device.jid} className="flex items-center justify-between text-sm py-1 hover:bg-dark-900/50 rounded px-2 -mx-2 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Monitor size={14} className="text-gray-300/40" />
                                                <span className="text-gray-300/70  text-xs">Device {idx + 1}</span>
                                            </div>
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-xs  uppercase border",
                                                device.state === 'OFFLINE' ? "bg-accent-red/20 text-accent-red border-accent-red/40" :
                                                    device.state.includes('Online') ? "bg-accent-green/20 text-accent-green border-accent-green/40" :
                                                        device.state === 'Standby' ? "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/40" :
                                                            "bg-gray-300/20 text-gray-300 border-gray-300/40"
                                            )}>
                                                {device.state}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metrics & Chart */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-dark-950 p-4 rounded-xl  border border-gray-300/20">
                                <div className="text-xs text-gray-300/60 mb-1 flex items-center gap-1  "><Activity size={16} className="text-gray-300/40" /> Current Avg RTT</div>
                                <div className="text-3xl font-bold  tabular-nums text-gray-300">{lastData?.avg.toFixed(0) || '-'} <span className="text-lg">ms</span></div>
                            </div>
                            <div className="bg-dark-950 p-4 rounded-xl  border border-gray-300/20">
                                <div className="text-xs text-gray-300/60 mb-1  ">Median (50)</div>
                                <div className="text-3xl font-bold  tabular-nums text-gray-300">{lastData?.median.toFixed(0) || '-'} <span className="text-lg">ms</span></div>
                            </div>
                            <div className="bg-dark-950 p-4 rounded-xl  border border-accent-red/20">
                                <div className="text-xs text-gray-300/60 mb-1  ">Threshold</div>
                                <div className="text-3xl font-bold  tabular-nums text-accent-red">{lastData?.threshold.toFixed(0) || '-'} <span className="text-lg">ms</span></div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-dark-950 p-6 rounded-xl  border border-gray-300/20 h-[300px] relative">
                            <h5 className="text-xs  font-bold text-gray-300/70  mb-4">RTT HISTORY & THRESHOLD</h5>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00e5ff10" />
                                    <XAxis
                                        dataKey="timestamp"
                                        hide
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        stroke="#00e5ff60"
                                        tick={{ fill: '#00e5ff', fontFamily: 'monospace', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        labelFormatter={(t: any) => typeof t === 'number' ? new Date(t).toLocaleTimeString() : ''}
                                        contentStyle={{
                                            background: '#0a0a0a',
                                            border: '1px solid rgba(0, 229, 255, 0.4)',
                                            borderRadius: '8px',
                                            color: '#00e5ff',
                                            fontFamily: 'monospace',
                                            boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)'
                                        }}
                                        labelStyle={{ color: '#00e5ff' }}
                                        itemStyle={{ color: '#00e5ff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg"
                                        stroke="#00e5ff"
                                        strokeWidth={3}
                                        dot={{ fill: "#00e5ff", r: 4, strokeWidth: 2, stroke: "#00e5ff80" }}
                                        name="Avg RTT"
                                        isAnimationActive={false}
                                    />
                                    <Line
                                        type="step"
                                        dataKey="threshold"
                                        stroke="#ff0055"
                                        strokeWidth={2}
                                        strokeDasharray="10 5"
                                        dot={false}
                                        name="Threshold"
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                )}

                {/* History View */}
                {viewMode === 'history' && (
                    <ActivityTimeline jid={jid} />
                )}

                {/* Stats View */}
                {viewMode === 'stats' && (
                    <ActivityStats jid={jid} />
                )}
            </div>
        </div>
    );
}
