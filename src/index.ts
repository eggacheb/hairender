import environment from "@/lib/environment.ts";
import config from "@/lib/config.ts";
import "@/lib/initialize.ts";
import server from "@/lib/server.ts";
import routes from "@/api/routes/index.ts";
import logger from "@/lib/logger.ts";
import tokenManager from "@/lib/token-manager.ts";
import sessionManager from "@/lib/session-manager.ts";

const startupTime = performance.now();

(async () => {
  logger.header();

  logger.info("<<<< hailuo free server >>>>");
  logger.info("Version:", environment.package.version);
  logger.info("Process id:", process.pid);
  logger.info("Environment:", environment.env);
  logger.info("Service name:", config.service.name);

  // 初始化TokenManager并立即执行一次刷新
  await tokenManager.refreshTokens();

  // 设置定期清理session的任务
  setInterval(() => {
    sessionManager.cleanupSessions();
  }, 5 * 60 * 1000); // 每5分钟清理一次

  server.attachRoutes(routes);
  await server.listen();

  config.service.bindAddress &&
    logger.success("Service bind address:", config.service.bindAddress);
})()
  .then(() =>
    logger.success(
      `Service startup completed (${Math.floor(performance.now() - startupTime)}ms)`
    )
  )
  .catch((err) => console.error(err));
