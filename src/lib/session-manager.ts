class SessionManager {
    private sessions: Map<string, { token: string, lastAccess: number }> = new Map();
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    getToken(sessionId: string): string | null {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            return session.token;
        }
        return null;
    }

    setToken(sessionId: string, token: string) {
        this.sessions.set(sessionId, { token, lastAccess: Date.now() });
    }

    cleanupSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccess > this.SESSION_TIMEOUT) {
                this.sessions.delete(sessionId);
            }
        }
    }
}

export default new SessionManager();
