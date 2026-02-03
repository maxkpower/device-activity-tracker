import React, { useState, useEffect } from 'react';
import { Clock, Activity, TrendingUp, BarChart2 } from 'lucide-react';
import { getActivityStats, ActivityStats as Stats, formatDuration, formatHour } from '../services/api';
import clsx from 'clsx';

interface ActivityStatsProps {
    jid: string;
}

type Period = 'day' | 'week' | 'month';

export function ActivityStats({ jid }: ActivityStatsProps) {
    const [period, setPeriod] = useState<Period>('day');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        getActivityStats(jid, period)
            .then(setStats)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [jid, period]);

    const totalTime = stats
        ? stats.totalOnlineTime + stats.totalStandbyTime + stats.totalOfflineTime
        : 0;

    const onlinePercent = totalTime > 0 ? (stats!.totalOnlineTime / totalTime) * 100 : 0;
    const standbyPercent = totalTime > 0 ? (stats!.totalStandbyTime / totalTime) * 100 : 0;
    const offlinePercent = totalTime > 0 ? (stats!.totalOfflineTime / totalTime) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Period selector */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <BarChart2 size={16} />
                        Activity Statistics
                    </h5>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        {(['day', 'week', 'month'] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={clsx(
                                    "px-3 py-1 text-sm rounded-md transition-colors capitalize",
                                    period === p
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
                    Loading statistics...
                </div>
            )}

            {error && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-red-500">
                    {error}
                </div>
            )}

            {!loading && !error && stats && (
                <>
                    {/* Time distribution */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h6 className="text-sm font-medium text-gray-700 mb-4">Time Distribution</h6>

                        {/* Stacked bar */}
                        <div className="h-8 rounded-lg overflow-hidden flex mb-4">
                            <div
                                className="bg-green-500 transition-all"
                                style={{ width: `${onlinePercent}%` }}
                                title={`Online: ${onlinePercent.toFixed(1)}%`}
                            />
                            <div
                                className="bg-yellow-500 transition-all"
                                style={{ width: `${standbyPercent}%` }}
                                title={`Standby: ${standbyPercent.toFixed(1)}%`}
                            />
                            <div
                                className="bg-red-500 transition-all"
                                style={{ width: `${offlinePercent}%` }}
                                title={`Offline: ${offlinePercent.toFixed(1)}%`}
                            />
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                    {formatDuration(stats.totalOnlineTime)}
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                    {onlinePercent.toFixed(1)}% Online
                                </div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {formatDuration(stats.totalStandbyTime)}
                                </div>
                                <div className="text-xs text-yellow-600 mt-1">
                                    {standbyPercent.toFixed(1)}% Standby
                                </div>
                            </div>
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">
                                    {formatDuration(stats.totalOfflineTime)}
                                </div>
                                <div className="text-xs text-red-600 mt-1">
                                    {offlinePercent.toFixed(1)}% Offline
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Session stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                <Activity size={16} />
                                Sessions
                            </div>
                            <div className="text-3xl font-bold text-gray-900">
                                {stats.sessionCount}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                times went online
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                                <Clock size={16} />
                                Avg Session
                            </div>
                            <div className="text-3xl font-bold text-gray-900">
                                {stats.avgSessionDuration > 0
                                    ? formatDuration(stats.avgSessionDuration)
                                    : '-'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                average duration
                            </div>
                        </div>
                    </div>

                    {/* Most active hours */}
                    {stats.mostActiveHours.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                <TrendingUp size={16} />
                                Most Active Hours
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {stats.mostActiveHours.map((hour, idx) => (
                                    <div
                                        key={hour}
                                        className={clsx(
                                            "px-4 py-2 rounded-lg font-medium",
                                            idx === 0
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                        )}
                                    >
                                        {formatHour(hour)}
                                        {idx === 0 && (
                                            <span className="text-xs ml-1 opacity-70">(most active)</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No data message */}
                    {totalTime === 0 && (
                        <div className="bg-gray-50 p-8 rounded-xl text-center text-gray-500">
                            No activity data for this period yet.
                            <br />
                            <span className="text-sm">State changes will be recorded as tracking continues.</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
