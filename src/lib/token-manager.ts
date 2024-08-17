import redis from './redis-client';
import logger from './logger';
import sessionManager from './session-manager';
import { refreshToken } from '../api/controllers/token-utils';

const TOKENS_KEY = 'hailuofree:tokens';

interface RefreshStatus {
  timestamp: string;
  successCount: number;
  failCount: number;
}

class TokenManager {
  private lastRefreshStatus: RefreshStatus | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastRefreshTime: number = Date.now();

  constructor() {
    logger.info('TokenManager: Initializing...');
    this.initialize();
  }

  private async initialize() {
    logger.info('TokenManager: Starting initialization...');
    await this.loadTokens();
    this.scheduleRefresh();
    logger.info('TokenManager: Initialization completed');
  }

  private async loadTokens(): Promise<void> {
    try {
      const tokens = await redis.smembers(TOKENS_KEY);
      if (tokens.length === 0) {
        throw new Error('No tokens found in Redis');
      }
      logger.info(`TokenManager: Tokens loaded successfully. Total tokens: ${tokens.length}`);
    } catch (error) {
      logger.error(`TokenManager: Failed to load tokens from Redis: ${error.message}`);
    }
  }

  private async saveTokens(tokens: string[]): Promise<boolean> {
    try {
      await redis.del(TOKENS_KEY);
      if (tokens.length > 0) {
        await redis.sadd(TOKENS_KEY, ...tokens);
      }
      logger.info(`TokenManager: Tokens saved successfully. Total tokens: ${tokens.length}`);
      return true;
    } catch (error) {
      logger.error(`TokenManager: Failed to save tokens: ${error.message}`);
      return false;
    }
  }

  async getAllTokens(): Promise<string> {
    const tokens = await redis.smembers(TOKENS_KEY);
    return tokens.join(',');
  }

  getRefreshStatus(): RefreshStatus | null {
    return this.lastRefreshStatus;
  }

  getNextRefreshTime(): number {
    return this.lastRefreshTime + parseInt(process.env.TOKEN_REFRESH_INTERVAL || '604800000');
  }

  async refreshTokens() {
    const tokens = await redis.smembers(TOKENS_KEY);
    if (tokens.length === 0) {
      logger.warn('TokenManager: No tokens available for refresh');
      return;
    }

    logger.info(`TokenManager: Starting token refresh. Total tokens to refresh: ${tokens.length}`);
    let successCount = 0;
    let failCount = 0;

    const newTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      try {
        const newToken = await refreshToken(tokens[i]);
        if (newToken) {
          newTokens.push(newToken);
          logger.info(`TokenManager: Token ${i + 1} refreshed successfully`);
          successCount++;
        } else {
          logger.warn(`TokenManager: Token ${i + 1} refresh failed, keeping old token`);
          newTokens.push(tokens[i]);
          failCount++;
        }
      } catch (error) {
        logger.error(`TokenManager: Failed to refresh token ${i + 1}: ${error.message}`);
        newTokens.push(tokens[i]);
        failCount++;
      }
    }

    if (await this.saveTokens(newTokens)) {
      await sessionManager.updateSessionTokens();
    }

    this.lastRefreshStatus = {
      timestamp: new Date().toISOString(),
      successCount,
      failCount
    };

    this.lastRefreshTime = Date.now();

    logger.info(`TokenManager: Token refresh completed. Success: ${successCount}, Failed: ${failCount}, Total tokens: ${newTokens.length}`);
  }

  async addToken(newToken: string) {
    const exists = await redis.sismember(TOKENS_KEY, newToken);
    if (!exists) {
      await redis.sadd(TOKENS_KEY, newToken);
      await sessionManager.updateSessionTokens();
      logger.info(`New token added and tokens reloaded`);
    } else {
      logger.warn(`Token already exists, not adding duplicate`);
    }
  }

  async updateToken(oldToken: string, newToken: string) {
    const exists = await redis.sismember(TOKENS_KEY, oldToken);
    if (exists) {
      await redis.srem(TOKENS_KEY, oldToken);
      await redis.sadd(TOKENS_KEY, newToken);
      await sessionManager.updateSessionTokens();
      logger.info(`Token updated successfully`);
    } else {
      logger.warn(`Old token not found, adding new token instead`);
      await this.addToken(newToken);
    }
  }

  async getRandomToken(): Promise<string> {
    const tokens = await redis.smembers(TOKENS_KEY);
    if (tokens.length === 0) {
      throw new Error("No tokens available");
    }
    return tokens[Math.floor(Math.random() * tokens.length)];
  }

  async getTokenCount(): Promise<number> {
    return await redis.scard(TOKENS_KEY);
  }

  private scheduleRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    const intervalInSeconds = parseInt(process.env.TOKEN_REFRESH_INTERVAL || '604800000') / 1000;
    this.refreshInterval = setInterval(() => {
      this.refreshTokens();
    }, intervalInSeconds * 1000);
    logger.info(`TokenManager: Token refresh scheduled every ${intervalInSeconds} seconds`);
  }
}

export default new TokenManager();
