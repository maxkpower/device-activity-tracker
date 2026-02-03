import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getDailyTimeline, TimelineSegment, formatDuration } from '../services/api';
import clsx from 'clsx';

interface ActivityTimelineProps {
    jid: string;
}

const STATE_COLORS: Record<string, string> = {
    'Online': 'bg-green-500',
    'Standby': 'bg-yellow-500',
    'OFFLINE': 'bg-red-500',
    'Calibrating...': 'bg-gray-400',
    'Unknown': 'bg-gray-300'
};

const STATE_TEXT_COLORS: Record<string, string> = {
    'Online': 'text-green-700',
    'Standby': 'text-yellow-700',
    'OFFLINE': 'text-red-700',
    'Calibrating...': 'text-gray-600',
    'Unknown': 'text-gray-500'
};

export function ActivityTimeline({ jid }: ActivityTimelineProps) {
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [segments, setSegments] = useState<TimelineSegment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredSegment, setHoveredSegment] = useState<TimelineSegment | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setLoading(true);
        setError(null);

        getDailyTimeline(jid, date)
            .then(setSegments)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [jid, date]);

    const changeDate = (days: number) => {
        const currentDate = new Date(date);
        currentDate.setDate(currentDate.getDate() + days);
        setDate(currentDate.toISOString().split('T')[0]);
    };

    const goToToday = () => {
        setDate(new Date().toISOString().split('T')[0]);
    };

    const isToday = date === new Date().toISOString().split('T')[0];

    // Calculate timeline start and end for the day
    const [year, month, day] = date.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    const dayDuration = dayEnd - dayStart;

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleSegmentHover = (segment: TimelineSegment | null, e?: React.MouseEvent) => {
        setHoveredSegment(segment);
        if (e && segment) {
            setTooltipPosition({ x: e.clientX, y: e.clientY });
        }
    };

    // Generate hour markers
    const hourMarkers = Array.from({ length: 25 }, (_, i) => i);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {/* Header with date controls */}
            <div className="flex items-center justify-between mb-6">
                <h5 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Calendar size={16} />
                    Activity Timeline
                </h5>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Previous day"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={goToToday}
                        className={clsx(
                            "px-3 py-1 text-sm rounded transition-colors",
                            isToday ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                        )}
                    >
                        {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </button>
                    <button
                        onClick={() => changeDate(1)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        disabled={isToday}
                        title="Next day"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {loading && (
                <div className="h-16 flex items-center justify-center text-gray-500">
                    Loading timeline...
                </div>
            )}

            {error && (
                <div className="h-16 flex items-center justify-center text-red-500">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Timeline bar */}
                    <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                        {segments.map((segment, idx) => {
                            const startPercent = ((segment.startTime - dayStart) / dayDuration) * 100;
                            const widthPercent = (segment.duration / dayDuration) * 100;

                            return (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "absolute top-0 h-full cursor-pointer transition-opacity",
                                        STATE_COLORS[segment.state] || 'bg-gray-400',
                                        hoveredSegment === segment ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                                    )}
                                    style={{
                                        left: `${Math.max(0, startPercent)}%`,
                                        width: `${Math.min(widthPercent, 100 - startPercent)}%`
                                    }}
                                    onMouseEnter={(e) => handleSegmentHover(segment, e)}
                                    onMouseMove={(e) => handleSegmentHover(segment, e)}
                                    onMouseLeave={() => handleSegmentHover(null)}
                                />
                            );
                        })}

                        {/* Hour grid lines */}
                        {hourMarkers.slice(0, 24).map(hour => (
                            <div
                                key={hour}
                                className="absolute top-0 h-full w-px bg-gray-300 opacity-30"
                                style={{ left: `${(hour / 24) * 100}%` }}
                            />
                        ))}
                    </div>

                    {/* Hour labels */}
                    <div className="relative h-6 mt-1">
                        {[0, 6, 12, 18, 24].map(hour => (
                            <div
                                key={hour}
                                className="absolute text-xs text-gray-500"
                                style={{
                                    left: `${(hour / 24) * 100}%`,
                                    transform: hour === 24 ? 'translateX(-100%)' : hour === 0 ? 'none' : 'translateX(-50%)'
                                }}
                            >
                                {hour === 0 ? '12AM' : hour === 6 ? '6AM' : hour === 12 ? '12PM' : hour === 18 ? '6PM' : '12AM'}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 text-xs">
                        {Object.entries(STATE_COLORS).filter(([state]) => state !== 'Unknown').map(([state, color]) => (
                            <div key={state} className="flex items-center gap-1">
                                <div className={clsx("w-3 h-3 rounded", color)} />
                                <span className="text-gray-600">{state}</span>
                            </div>
                        ))}
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                        {['Online', 'Standby', 'OFFLINE'].map(state => {
                            const totalDuration = segments
                                .filter(s => s.state === state)
                                .reduce((sum, s) => sum + s.duration, 0);
                            return (
                                <div key={state} className="text-center">
                                    <div className={clsx("text-lg font-semibold", STATE_TEXT_COLORS[state])}>
                                        {formatDuration(totalDuration)}
                                    </div>
                                    <div className="text-xs text-gray-500">{state}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Tooltip */}
            {hoveredSegment && (
                <div
                    className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg pointer-events-none"
                    style={{
                        left: tooltipPosition.x + 10,
                        top: tooltipPosition.y - 40
                    }}
                >
                    <div className="font-medium">{hoveredSegment.state}</div>
                    <div className="text-gray-300 text-xs">
                        {formatTime(hoveredSegment.startTime)} - {formatTime(hoveredSegment.endTime)}
                    </div>
                    <div className="text-gray-400 text-xs">
                        Duration: {formatDuration(hoveredSegment.duration)}
                    </div>
                </div>
            )}
        </div>
    );
}
