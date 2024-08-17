import serviceConfig from "./configs/service-config.ts";
import systemConfig from "./configs/system-config.ts";

class Config {
    
    /** 服务配置 */
    service = serviceConfig;
    
    /** 系统配置 */
    system = systemConfig;

    /** API密钥 */
    apiKey = process.env.API_KEY || "sk-hailuofreeapi";

    /** token刷新间隔（毫秒） */
    tokenRefreshInterval = parseInt(process.env.TOKEN_REFRESH_INTERVAL || '604800000');

    /** Redis配置 */
    redis = {
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
    };

    constructor() {
        if (!this.apiKey) {
            console.warn("Warning: API_KEY is not set in environment variables. Using default value.");
        }
        if (!this.redis.url || !this.redis.token) {
            console.error("Error: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set in environment variables.");
        }
    }
}

export default new Config();
