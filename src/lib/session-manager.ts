import tokenManager from './token-manager.ts';
import logger from '@/lib/logger.ts';

interface SessionData {
    token: string;
    lastAccess: number;
}

class SessionManager {
    private sessions: Map<string, SessionData> = new Map();
    private tokens: string[] = [];
    private currentTokenIndex: number = 0;
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    constructor() {
        this.updateTokens();
    }

    updateTokens() {
        this.tokens = tokenManager.getAllTokens().split(',');
    }

    getToken(sessionId: string): string {
        let session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            const tokenIndex = this.tokens.indexOf(session.token);
            logger.info(`Using existing token for session ${sessionId}: ${this.maskToken(session.token)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
            return session.token;
        }
        // 如果session不存在，创建一个新的
        const newToken = this.getNextToken();
        this.sessions.set(sessionId, { token: newToken, lastAccess: Date.now() });
        const tokenIndex = this.tokens.indexOf(newToken);
        logger.info(`Created new session ${sessionId} with token: ${this.maskToken(newToken)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
        return newToken;
    }

    private getNextToken(): string {
        if (this.tokens.length === 0) {
            throw new Error("No tokens available");
        }
        const token = this.tokens[this.currentTokenIndex];
        this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
        return token;
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
        this.updateTokens();
        for (const [sessionId, session] of this.sessions.entries()) {
            session.token = this.getNextToken();
            const tokenIndex = this.tokens.indexOf(session.token);
            logger.info(`Updated token for session ${sessionId}: ${this.maskToken(session.token)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
        }
    }

    private maskToken(token: string): string {
        return token.slice(0, 4) + '****' + token.slice(-4);
    }
}

export default new SessionManager();
