import tokenManager from './token-manager.ts';

interface SessionData {
    token: string;
    lastAccess: number;
}

class SessionManager {
    private sessions: Map<string, SessionData> = new Map();
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    getToken(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            return session.token;
        }
        // 如果session不存在，创建一个新的
        const newToken = tokenManager.getRandomToken();
        this.sessions.set(sessionId, { token: newToken, lastAccess: Date.now() });
        return newToken;
    }

    cleanupSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccess > this.SESSION_TIMEOUT) {
                this.sessions.delete(sessionId);
            }
        }
    }

    updateSessionTokens() {
        for (const [sessionId, session] of this.sessions.entries()) {
            session.token = tokenManager.getRandomToken();
        }
    }
}

export default new SessionManager();
