/**
 * API Service for Activity History
 *
 * Provides functions to fetch historical activity data from the server.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface StateChange {
    id: number;
    contactId: number;
    timestamp: number;
    previousState: string | null;
    newState: string;
    rtt: number | null;
    avgRtt: number | null;
}

export interface TimelineSegment {
    startTime: number;
    endTime: number;
    state: string;
    duration: number;
}

export interface ActivityStats {
    totalOnlineTime: number;
    totalStandbyTime: number;
    totalOfflineTime: number;
    avgSessionDuration: number;
    sessionCount: number;
    mostActiveHours: number[];
}

export interface Contact {
    id: number;
    jid: string;
    platform: 'whatsapp' | 'signal';
    displayName: string | null;
    createdAt: number;
    isTracking: boolean;
    lastState: string | null;
    profilePicUrl: string | null;
}

export interface RttMeasurement {
    id: number;
    contactId: number;
    timestamp: number;
    rtt: number;
    avgRtt: number | null;
    median: number | null;
    threshold: number | null;
    state: string | null;
}

/**
 * Fetch state change history for a contact
 */
export async function getStateHistory(
    jid: string,
    from?: number,
    to?: number,
    limit?: number
): Promise<StateChange[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from.toString());
    if (to) params.set('to', to.toString());
    if (limit) params.set('limit', limit.toString());

    const url = `${API_BASE}/api/contacts/${encodeURIComponent(jid)}/history?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch daily timeline for a contact
 */
export async function getDailyTimeline(
    jid: string,
    date: string
): Promise<TimelineSegment[]> {
    const params = new URLSearchParams({ date });
    const url = `${API_BASE}/api/contacts/${encodeURIComponent(jid)}/timeline?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch timeline: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch activity statistics for a contact
 */
export async function getActivityStats(
    jid: string,
    period: 'day' | 'week' | 'month'
): Promise<ActivityStats> {
    const params = new URLSearchParams({ period });
    const url = `${API_BASE}/api/contacts/${encodeURIComponent(jid)}/stats?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch all contacts from database
 */
export async function getAllContacts(): Promise<Contact[]> {
    const url = `${API_BASE}/api/contacts`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch RTT history for a contact (chart data)
 */
export async function getRttHistory(
    jid: string,
    limit?: number
): Promise<RttMeasurement[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());

    const url = `${API_BASE}/api/contacts/${encodeURIComponent(jid)}/rtt?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch RTT history: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Format hour (0-23) to readable time
 */
export function formatHour(hour: number): string {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}${suffix}`;
}
