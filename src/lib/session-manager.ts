import tokenManager from './token-manager.ts';
import logger from './logger.ts';

interface SessionData {
    token: string;
    tokenIndex: number;
    lastAccess: number;
}

class SessionManager {
    private sessions: Map<string, SessionData> = new Map();
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    getToken(sessionId: string): { token: string; tokenIndex: number } {
        let session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            logger.info(`Using existing token for session ${sessionId}: ${this.maskToken(session.token)} (Token ${session.tokenIndex + 1}/${tokenManager.getTokenCount()})`);
            return { token: session.token, tokenIndex: session.tokenIndex };
        }
        // 如果session不存在，创建一个新的
        const { token, index } = tokenManager.getNextToken();
        this.sessions.set(sessionId, { token, tokenIndex: index, lastAccess: Date.now() });
        logger.info(`Created new session ${sessionId} with token: ${this.maskToken(token)} (Token ${index + 1}/${tokenManager.getTokenCount()})`);
        return { token, tokenIndex: index };
    }

    cleanupSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccess > this.SESSION_TIMEOUT) {
                this.sessions.delete(sessionId);
                logger.info(`Cleaned up session ${sessionId}`);
            }
        }
    }

    updateSessionTokens() {
        for (const [sessionId, session] of this.sessions.entries()) {
            const { token, index } = tokenManager.getNextToken();
            session.token = token;
            session.tokenIndex = index;
            logger.info(`Updated token for session ${sessionId}: ${this.maskToken(token)} (Token ${index + 1}/${tokenManager.getTokenCount()})`);
        }
    }

    private maskToken(token: string): string {
        return token.slice(0, 4) + '****' + token.slice(-4);
    }
}

export default new SessionManager();
