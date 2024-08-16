import fs from 'fs/promises';
import config from './config.ts';
import { refreshToken } from '../api/controllers/token-utils.ts';
import logger from './logger.ts';
import sessionManager from './session-manager.ts';

interface RefreshStatus {
    timestamp: string;
    successCount: number;
    failCount: number;
}

class TokenManager {
    private tokens: string[] = [];
    private lastRefreshStatus: RefreshStatus | null = null;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        await this.loadTokens();
        await this.checkAndRefreshTokens();
        this.scheduleRefresh();
    }

    private async loadTokens() {
        try {
            const data = await fs.readFile(config.tokenSavePath, 'utf-8');
            const loadedTokens = JSON.parse(data);
            if (Array.isArray(loadedTokens) && loadedTokens.length > 0) {
                this.tokens = loadedTokens;
                logger.info(`Tokens loaded successfully from file. Total tokens: ${this.tokens.length}`);
            } else {
                logger.warn('tokens.json is empty or invalid. Using default tokens.');
                this.tokens = [...config.tokens];
                await this.saveTokens();
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn(`tokens.json not found. Creating new file with default tokens.`);
                this.tokens = [...config.tokens];
                await this.saveTokens();
            } else {
                logger.error(`Failed to load saved tokens: ${error.message}. Using existing tokens or default tokens.`);
                if (this.tokens.length === 0) {
                    this.tokens = [...config.tokens];
                    await this.saveTokens();
                }
            }
        }
        logger.info(`Total tokens after loading: ${this.tokens.length}`);
    }

    private async checkAndRefreshTokens() {
        const now = Date.now();
        const lastRefreshTime = this.lastRefreshStatus ? new Date(this.lastRefreshStatus.timestamp).getTime() : 0;
        if (now - lastRefreshTime >= config.tokenRefreshInterval) {
            await this.refreshTokens();
        } else {
            logger.info(`Skipping token refresh. Next refresh in ${Math.round((config.tokenRefreshInterval - (now - lastRefreshTime)) / 1000)} seconds.`);
        }
    }

    private async saveTokens() {
        try {
            await fs.writeFile(config.tokenSavePath, JSON.stringify(this.tokens, null, 2));
            logger.info(`Tokens saved successfully. Total tokens: ${this.tokens.length}`);
        } catch (error) {
            logger.error(`Failed to save tokens: ${error.message}`);
        }
    }

    getAllTokens(): string {
        return this.tokens.join(',');
    }

    getRefreshStatus(): RefreshStatus | null {
        return this.lastRefreshStatus;
    }

    async refreshTokens() {
        logger.info(`Starting token refresh. Total tokens to refresh: ${this.tokens.length}`);
        let successCount = 0;
        let failCount = 0;

        const newTokens = [];

        for (let i = 0; i < this.tokens.length; i++) {
            try {
                const newToken = await refreshToken(this.tokens[i]);
                if (newToken) {
                    newTokens.push(newToken);
                    logger.info(`Token ${i + 1} refreshed successfully`);
                    successCount++;
                } else {
                    logger.warn(`Token ${i + 1} refresh failed, keeping old token`);
                    newTokens.push(this.tokens[i]);
                    failCount++;
                }
            } catch (error) {
                logger.error(`Failed to refresh token ${i + 1}: ${error.message}`);
                newTokens.push(this.tokens[i]);
                failCount++;
            }
        }

        this.tokens = newTokens;
        await this.saveTokens();
        sessionManager.updateSessionTokens();

        this.lastRefreshStatus = {
            timestamp: new Date().toISOString(),
            successCount,
            failCount
        };

        logger.info(`Token refresh completed. Success: ${successCount}, Failed: ${failCount}, Total tokens: ${this.tokens.length}`);
    }

    async addToken(newToken: string) {
        if (!this.tokens.includes(newToken)) {
            this.tokens.push(newToken);
            await this.saveTokens();
            sessionManager.updateSessionTokens();
            logger.info(`New token added. Total tokens: ${this.tokens.length}`);
        } else {
            logger.warn(`Token already exists, not adding duplicate`);
        }
    }

    async updateToken(oldToken: string, newToken: string) {
        const index = this.tokens.indexOf(oldToken);
        if (index !== -1) {
            this.tokens[index] = newToken;
            await this.saveTokens();
            sessionManager.updateSessionTokens();
            logger.info(`Token updated successfully`);
        } else {
            logger.warn(`Old token not found, adding new token instead`);
            await this.addToken(newToken);
        }
    }

    getRandomToken(): string {
        if (this.tokens.length === 0) {
            throw new Error("No tokens available");
        }
        return this.tokens[Math.floor(Math.random() * this.tokens.length)];
    }

    getTokenCount(): number {
        return this.tokens.length;
    }

    private scheduleRefresh() {
        setInterval(() => {
            this.refreshTokens();
        }, config.tokenRefreshInterval);
    }
}

export default new TokenManager();
