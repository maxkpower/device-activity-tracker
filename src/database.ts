/**
 * Activity Database Module
 *
 * SQLite-based persistent storage for online/offline state changes.
 * Stores state transitions to enable historical analysis.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export type Platform = 'whatsapp' | 'signal';

export interface StateChange {
    id: number;
    contactId: number;
    timestamp: number;
    previousState: string | null;
    newState: string;
    rtt: number | null;
    avgRtt: number | null;
}

export interface Contact {
    id: number;
    jid: string;
    platform: Platform;
    displayName: string | null;
    createdAt: number;
    isTracking: boolean;
    lastState: string | null;
    profilePicUrl: string | null;
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

export class ActivityDatabase {
    private db: Database.Database;

    constructor(dbPath?: string) {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const finalPath = dbPath || path.join(dataDir, 'activity.db');
        this.db = new Database(finalPath);
        this.db.pragma('journal_mode = WAL');
        this.initSchema();
    }

    private initSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY,
                jid TEXT UNIQUE NOT NULL,
                platform TEXT NOT NULL,
                display_name TEXT,
                created_at INTEGER NOT NULL,
                is_tracking INTEGER DEFAULT 0,
                last_state TEXT,
                profile_pic_url TEXT
            );

            CREATE TABLE IF NOT EXISTS state_changes (
                id INTEGER PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                previous_state TEXT,
                new_state TEXT NOT NULL,
                rtt INTEGER,
                avg_rtt INTEGER,
                FOREIGN KEY (contact_id) REFERENCES contacts(id)
            );

            CREATE INDEX IF NOT EXISTS idx_state_changes_contact_time
                ON state_changes(contact_id, timestamp);

            CREATE TABLE IF NOT EXISTS rtt_measurements (
                id INTEGER PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                rtt INTEGER NOT NULL,
                avg_rtt INTEGER,
                median INTEGER,
                threshold INTEGER,
                state TEXT,
                FOREIGN KEY (contact_id) REFERENCES contacts(id)
            );

            CREATE INDEX IF NOT EXISTS idx_rtt_measurements_contact_time
                ON rtt_measurements(contact_id, timestamp);
        `);

        // Run migrations for existing databases
        this.runMigrations();
    }

    private runMigrations() {
        // Check if columns exist and add them if not
        const tableInfo = this.db.prepare("PRAGMA table_info(contacts)").all() as any[];
        const columns = tableInfo.map(col => col.name);

        if (!columns.includes('is_tracking')) {
            this.db.exec('ALTER TABLE contacts ADD COLUMN is_tracking INTEGER DEFAULT 0');
        }
        if (!columns.includes('last_state')) {
            this.db.exec('ALTER TABLE contacts ADD COLUMN last_state TEXT');
        }
        if (!columns.includes('profile_pic_url')) {
            this.db.exec('ALTER TABLE contacts ADD COLUMN profile_pic_url TEXT');
        }
    }

    /**
     * Get or create a contact record
     */
    getOrCreateContact(jid: string, platform: Platform, displayName?: string): Contact {
        const existing = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as any | undefined;

        if (existing) {
            if (displayName && displayName !== existing.display_name) {
                this.db.prepare(
                    'UPDATE contacts SET display_name = ? WHERE id = ?'
                ).run(displayName, existing.id);
                existing.display_name = displayName;
            }
            return this.mapContactRow(existing);
        }

        const now = Date.now();
        const result = this.db.prepare(
            'INSERT INTO contacts (jid, platform, display_name, created_at, is_tracking) VALUES (?, ?, ?, ?, 0)'
        ).run(jid, platform, displayName || null, now);

        return {
            id: result.lastInsertRowid as number,
            jid,
            platform,
            displayName: displayName || null,
            createdAt: now,
            isTracking: false,
            lastState: null,
            profilePicUrl: null
        };
    }

    private mapContactRow(row: any): Contact {
        return {
            id: row.id,
            jid: row.jid,
            platform: row.platform as Platform,
            displayName: row.display_name,
            createdAt: row.created_at,
            isTracking: row.is_tracking === 1,
            lastState: row.last_state,
            profilePicUrl: row.profile_pic_url
        };
    }

    /**
     * Log a state change for a contact
     */
    logStateChange(
        jid: string,
        platform: Platform,
        previousState: string | null,
        newState: string,
        rtt?: number,
        avgRtt?: number
    ): void {
        const contact = this.getOrCreateContact(jid, platform);

        this.db.prepare(`
            INSERT INTO state_changes (contact_id, timestamp, previous_state, new_state, rtt, avg_rtt)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            contact.id,
            Date.now(),
            previousState,
            newState,
            rtt ?? null,
            avgRtt ?? null
        );
    }

    /**
     * Get state change history for a contact
     */
    getStateHistory(
        jid: string,
        from?: number,
        to?: number,
        limit: number = 1000
    ): StateChange[] {
        const contact = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as Contact | undefined;

        if (!contact) return [];

        let query = 'SELECT * FROM state_changes WHERE contact_id = ?';
        const params: (number | string)[] = [contact.id];

        if (from) {
            query += ' AND timestamp >= ?';
            params.push(from);
        }
        if (to) {
            query += ' AND timestamp <= ?';
            params.push(to);
        }

        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);

        const rows = this.db.prepare(query).all(...params) as any[];

        return rows.map(row => ({
            id: row.id,
            contactId: row.contact_id,
            timestamp: row.timestamp,
            previousState: row.previous_state,
            newState: row.new_state,
            rtt: row.rtt,
            avgRtt: row.avg_rtt
        }));
    }

    /**
     * Get daily timeline - aggregates state changes into time segments
     */
    getDailyTimeline(jid: string, date: string): TimelineSegment[] {
        const contact = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as Contact | undefined;

        if (!contact) return [];

        // Parse date (YYYY-MM-DD) and get start/end of day
        const [year, month, day] = date.split('-').map(Number);
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

        // Get state changes for the day
        const changes = this.db.prepare(`
            SELECT * FROM state_changes
            WHERE contact_id = ? AND timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
        `).all(contact.id, startOfDay, endOfDay) as any[];

        // Get the last state before this day to know the starting state
        const lastBefore = this.db.prepare(`
            SELECT * FROM state_changes
            WHERE contact_id = ? AND timestamp < ?
            ORDER BY timestamp DESC LIMIT 1
        `).get(contact.id, startOfDay) as any | undefined;

        const segments: TimelineSegment[] = [];
        let currentState = lastBefore?.new_state || 'Unknown';
        let segmentStart = startOfDay;

        for (const change of changes) {
            // Close the previous segment
            if (change.timestamp > segmentStart) {
                segments.push({
                    startTime: segmentStart,
                    endTime: change.timestamp,
                    state: currentState,
                    duration: change.timestamp - segmentStart
                });
            }

            currentState = change.new_state;
            segmentStart = change.timestamp;
        }

        // Add final segment until end of day (or current time if today)
        const now = Date.now();
        const segmentEnd = now < endOfDay ? now : endOfDay;

        if (segmentEnd > segmentStart) {
            segments.push({
                startTime: segmentStart,
                endTime: segmentEnd,
                state: currentState,
                duration: segmentEnd - segmentStart
            });
        }

        return segments;
    }

    /**
     * Get activity statistics for a contact over a period
     */
    getActivityStats(jid: string, period: 'day' | 'week' | 'month'): ActivityStats {
        const contact = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as Contact | undefined;

        if (!contact) {
            return {
                totalOnlineTime: 0,
                totalStandbyTime: 0,
                totalOfflineTime: 0,
                avgSessionDuration: 0,
                sessionCount: 0,
                mostActiveHours: []
            };
        }

        const now = Date.now();
        let from: number;

        switch (period) {
            case 'day':
                from = now - 24 * 60 * 60 * 1000;
                break;
            case 'week':
                from = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                from = now - 30 * 24 * 60 * 60 * 1000;
                break;
        }

        // Get all state changes in the period
        const changes = this.db.prepare(`
            SELECT * FROM state_changes
            WHERE contact_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        `).all(contact.id, from) as any[];

        // Get the last state before the period
        const lastBefore = this.db.prepare(`
            SELECT * FROM state_changes
            WHERE contact_id = ? AND timestamp < ?
            ORDER BY timestamp DESC LIMIT 1
        `).get(contact.id, from) as any | undefined;

        let totalOnlineTime = 0;
        let totalStandbyTime = 0;
        let totalOfflineTime = 0;
        let sessionCount = 0;
        let sessionDurations: number[] = [];
        const hourlyActivity: Map<number, number> = new Map();

        let currentState = lastBefore?.new_state || 'Unknown';
        let segmentStart = from;
        let sessionStart: number | null = null;

        // Track if we started in an online state
        if (currentState === 'Online') {
            sessionStart = from;
        }

        for (const change of changes) {
            const duration = change.timestamp - segmentStart;

            // Accumulate time per state
            if (currentState === 'Online') {
                totalOnlineTime += duration;
                // Track hourly activity
                const startHour = new Date(segmentStart).getHours();
                const endHour = new Date(change.timestamp).getHours();
                for (let h = startHour; h <= endHour; h++) {
                    hourlyActivity.set(h, (hourlyActivity.get(h) || 0) + 1);
                }
            } else if (currentState === 'Standby') {
                totalStandbyTime += duration;
            } else if (currentState === 'OFFLINE') {
                totalOfflineTime += duration;
            }

            // Track sessions (Online periods)
            if (currentState === 'Online' && change.new_state !== 'Online') {
                if (sessionStart !== null) {
                    sessionDurations.push(change.timestamp - sessionStart);
                    sessionStart = null;
                }
            } else if (currentState !== 'Online' && change.new_state === 'Online') {
                sessionStart = change.timestamp;
                sessionCount++;
            }

            currentState = change.new_state;
            segmentStart = change.timestamp;
        }

        // Handle the final segment (from last change to now)
        const finalDuration = now - segmentStart;
        if (currentState === 'Online') {
            totalOnlineTime += finalDuration;
            if (sessionStart !== null) {
                sessionDurations.push(now - sessionStart);
            }
        } else if (currentState === 'Standby') {
            totalStandbyTime += finalDuration;
        } else if (currentState === 'OFFLINE') {
            totalOfflineTime += finalDuration;
        }

        // Calculate most active hours (top 3)
        const sortedHours = Array.from(hourlyActivity.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => hour);

        const avgSessionDuration = sessionDurations.length > 0
            ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
            : 0;

        return {
            totalOnlineTime,
            totalStandbyTime,
            totalOfflineTime,
            avgSessionDuration,
            sessionCount,
            mostActiveHours: sortedHours
        };
    }

    /**
     * Get all contacts
     */
    getAllContacts(): Contact[] {
        const rows = this.db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all() as any[];
        return rows.map(row => this.mapContactRow(row));
    }

    /**
     * Get contacts that should be actively tracked
     */
    getActiveContacts(): Contact[] {
        const rows = this.db.prepare(
            'SELECT * FROM contacts WHERE is_tracking = 1 ORDER BY created_at DESC'
        ).all() as any[];
        return rows.map(row => this.mapContactRow(row));
    }

    /**
     * Set tracking status for a contact
     */
    setTrackingStatus(jid: string, isTracking: boolean): void {
        this.db.prepare(
            'UPDATE contacts SET is_tracking = ? WHERE jid = ?'
        ).run(isTracking ? 1 : 0, jid);
    }

    /**
     * Update contact's last known state
     */
    updateContactState(jid: string, state: string): void {
        this.db.prepare(
            'UPDATE contacts SET last_state = ? WHERE jid = ?'
        ).run(state, jid);
    }

    /**
     * Update contact's profile picture URL
     */
    updateProfilePic(jid: string, url: string | null): void {
        this.db.prepare(
            'UPDATE contacts SET profile_pic_url = ? WHERE jid = ?'
        ).run(url, jid);
    }

    /**
     * Log an RTT measurement
     */
    logRttMeasurement(
        jid: string,
        platform: Platform,
        rtt: number,
        avgRtt?: number,
        median?: number,
        threshold?: number,
        state?: string
    ): void {
        const contact = this.getOrCreateContact(jid, platform);

        this.db.prepare(`
            INSERT INTO rtt_measurements (contact_id, timestamp, rtt, avg_rtt, median, threshold, state)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            contact.id,
            Date.now(),
            rtt,
            avgRtt ?? null,
            median ?? null,
            threshold ?? null,
            state ?? null
        );

        // Update last state on contact
        if (state) {
            this.updateContactState(jid, state);
        }

        // Cleanup old measurements (keep last 24 hours or 10000 records per contact)
        this.db.prepare(`
            DELETE FROM rtt_measurements
            WHERE contact_id = ? AND id NOT IN (
                SELECT id FROM rtt_measurements
                WHERE contact_id = ?
                ORDER BY timestamp DESC
                LIMIT 10000
            )
        `).run(contact.id, contact.id);
    }

    /**
     * Get RTT history for a contact (for chart data)
     */
    getRttHistory(jid: string, limit: number = 500): RttMeasurement[] {
        const contact = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as any | undefined;

        if (!contact) return [];

        const rows = this.db.prepare(`
            SELECT * FROM rtt_measurements
            WHERE contact_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `).all(contact.id, limit) as any[];

        // Return in chronological order (oldest first)
        return rows.reverse().map(row => ({
            id: row.id,
            contactId: row.contact_id,
            timestamp: row.timestamp,
            rtt: row.rtt,
            avgRtt: row.avg_rtt,
            median: row.median,
            threshold: row.threshold,
            state: row.state
        }));
    }

    /**
     * Get a contact by JID
     */
    getContact(jid: string): Contact | null {
        const row = this.db.prepare(
            'SELECT * FROM contacts WHERE jid = ?'
        ).get(jid) as any | undefined;

        return row ? this.mapContactRow(row) : null;
    }

    /**
     * Close database connection
     */
    close(): void {
        this.db.close();
    }
}
