import fs from 'fs/promises';
import config from './config.ts';
import { refreshToken } from '../api/controllers/token-utils.ts';
import logger from './logger.ts';

interface RefreshStatus {
    timestamp: string;
    successCount: number;
    failCount: number;
}

class TokenManager {
    private tokens: string[] = [];
    private lastRefreshTime: number = 0;
    private lastRefreshStatus: RefreshStatus | null = null;

    constructor() {
        this.loadTokens();
        this.scheduleRefresh();
    }

    async loadTokens() {
        try {
            const data = await fs.readFile(config.tokenSavePath, 'utf-8');
            this.tokens = JSON.parse(data);
        } catch (error) {
            logger.warn("Failed to load saved tokens, using default tokens");
            this.tokens = [...config.tokens];
        }
    }

    async saveTokens() {
        try {
            await fs.writeFile(config.tokenSavePath, JSON.stringify(this.tokens));
            logger.info("Tokens saved successfully");
        } catch (error) {
            logger.error("Failed to save tokens:", error);
        }
    }

    getAllTokens(): string {
        return this.tokens.join(',');
    }

    getRefreshStatus(): RefreshStatus | null {
        return this.lastRefreshStatus;
    }

    async refreshTokens() {
        logger.info("Refreshing tokens...");
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
                    logger.warn(`Token ${i + 1} refresh returned no new token`);
                    failCount++;
                }
            } catch (error) {
                logger.error(`Failed to refresh token ${i + 1}:`, error);
                failCount++;
            }
        }

        if (newTokens.length > 0) {
            this.tokens = newTokens;
            await this.saveTokens();
        } else {
            logger.warn("All token refreshes failed. Keeping old tokens.");
        }

        this.lastRefreshTime = Date.now();
        this.lastRefreshStatus = {
            timestamp: new Date().toISOString(),
            successCount,
            failCount
        };

        logger.info(`Token refresh completed. Success: ${successCount}, Failed: ${failCount}`);
    }

    private scheduleRefresh() {
        setInterval(() => {
            this.refreshTokens();
        }, config.tokenRefreshInterval);
    }
}

export default new TokenManager();
