import fs from 'fs';
import path from 'path';
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
    private refreshInterval: NodeJS.Timeout | null = null;
    private lastRefreshTime: number = Date.now();

    constructor() {
        logger.info('TokenManager: Initializing...');
        this.initialize();
    }

    private initialize() {
        logger.info('TokenManager: Starting initialization...');
        if (this.loadTokens()) {
            logger.info('TokenManager: Tokens loaded successfully, scheduling refresh...');
            this.scheduleRefresh();
        } else {
            logger.error('TokenManager: Failed to initialize due to token loading failure');
        }
        logger.info('TokenManager: Initialization completed');
    }

    private loadTokens(): boolean {
        try {
            logger.info(`TokenManager: Attempting to load tokens from ${config.tokenSavePath}`);
            const data = fs.readFileSync(config.tokenSavePath, 'utf-8');
            this.tokens = JSON.parse(data);
            if (this.tokens.length === 0) {
                throw new Error('tokens.json is empty');
            }
            logger.info(`TokenManager: Tokens loaded successfully. Total tokens: ${this.tokens.length}`);
            return true;
        } catch (error) {
            logger.error(`TokenManager: Failed to load tokens from ${config.tokenSavePath}: ${error.message}`);
            return false;
        }
    }

    private saveTokens(): boolean {
        try {
            fs.writeFileSync(config.tokenSavePath, JSON.stringify(this.tokens, null, 2));
            logger.info(`TokenManager: Tokens saved successfully. Total tokens: ${this.tokens.length}`);
            return true;
        } catch (error) {
            logger.error(`TokenManager: Failed to save tokens: ${error.message}`);
            return false;
        }
    }

    getAllTokens(): string {
        return this.tokens.join(',');
    }

    getRefreshStatus(): RefreshStatus | null {
        return this.lastRefreshStatus;
    }

    getNextRefreshTime(): number {
        return this.lastRefreshTime + config.tokenRefreshInterval;
    }

    async refreshTokens() {
        if (this.tokens.length === 0) {
            logger.warn('TokenManager: No tokens available for refresh');
            return;
        }

        logger.info(`TokenManager: Starting token refresh. Total tokens to refresh: ${this.tokens.length}`);
        let successCount = 0;
        let failCount = 0;

        const newTokens = [];

        for (let i = 0; i < this.tokens.length; i++) {
            try {
                const newToken = await refreshToken(this.tokens[i]);
                if (newToken) {
                    newTokens.push(newToken);
                    logger.info(`TokenManager: Token ${i + 1} refreshed successfully`);
                    successCount++;
                } else {
                    logger.warn(`TokenManager: Token ${i + 1} refresh failed, keeping old token`);
                    newTokens.push(this.tokens[i]);
                    failCount++;
                }
            } catch (error) {
                logger.error(`TokenManager: Failed to refresh token ${i + 1}: ${error.message}`);
                newTokens.push(this.tokens[i]);
                failCount++;
            }
        }

        this.tokens = newTokens;
        if (this.saveTokens()) {
            sessionManager.updateSessionTokens();
        }

        this.lastRefreshStatus = {
            timestamp: new Date().toISOString(),
            successCount,
            failCount
        };

        this.lastRefreshTime = Date.now();

        logger.info(`TokenManager: Token refresh completed. Success: ${successCount}, Failed: ${failCount}, Total tokens: ${this.tokens.length}`);
    }

    async addToken(newToken: string) {
        if (!this.tokens.includes(newToken)) {
            this.tokens.push(newToken);
            await this.saveTokens();
            sessionManager.updateSessionTokens();
            logger.info(`New token added and tokens reloaded`);
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
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        const intervalInSeconds = config.tokenRefreshInterval / 1000;
        this.refreshInterval = setInterval(() => {
            this.refreshTokens();
        }, config.tokenRefreshInterval);
        logger.info(`TokenManager: Token refresh scheduled every ${intervalInSeconds} seconds`);
    }
}

export default new TokenManager();
