import serviceConfig from "./configs/service-config.ts";
import systemConfig from "./configs/system-config.ts";

class Config {
    
    /** 服务配置 */
    service = serviceConfig;
    
    /** 系统配置 */
    system = systemConfig;

    /** API密钥 */
    apiKey = "sk-hailuofreeapi";

    /** 内置token列表 */
    tokens = [
        "your_token_1",
        "your_token_2",
        "your_token_3"
    ];

    /** token刷新间隔（毫秒） */
    tokenRefreshInterval = 7 * 24 * 60 * 60 * 1000; // 一周

    /** token保存路径 */
    tokenSavePath = "./data/tokens.json";
}

export default new Config();
