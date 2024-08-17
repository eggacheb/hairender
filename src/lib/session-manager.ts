import tokenManager from './token-manager';
import logger from './logger';

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

    async updateTokens() {
        const allTokens = await tokenManager.getAllTokens();
        this.tokens = allTokens.split(',');
    }

    async getToken(sessionId: string): Promise<string> {
        let session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccess = Date.now();
            const tokenIndex = this.tokens.indexOf(session.token);
            logger.info(`Using existing token for session ${sessionId}: ${this.maskToken(session.token)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
            return session.token;
        }
        // 如果session不存在，创建一个新的
        const newToken = await this.getNextToken();
        this.sessions.set(sessionId, { token: newToken, lastAccess: Date.now() });
        const tokenIndex = this.tokens.indexOf(newToken);
        logger.info(`Created new session ${sessionId} with token: ${this.maskToken(newToken)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
        return newToken;
    }

    private async getNextToken(): Promise<string> {
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

    async updateSessionTokens() {
        await this.updateTokens();
        for (const [sessionId, session] of this.sessions.entries()) {
            session.token = await this.getNextToken();
            const tokenIndex = this.tokens.indexOf(session.token);
            logger.info(`Updated token for session ${sessionId}: ${this.maskToken(session.token)} (Token ${tokenIndex + 1}/${this.tokens.length})`);
        }
    }

    private maskToken(token: string): string {
        return token.slice(0, 4) + '****' + token.slice(-4);
    }
}

export default new SessionManager();
