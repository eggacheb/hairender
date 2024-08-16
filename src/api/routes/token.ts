import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import tokenManager from '@/lib/token-manager.ts';
import { refreshToken } from '@/api/controllers/token-utils.ts';
import config from '@/lib/config.ts';
import logger from '@/lib/logger.ts';
import APIException from '@/lib/exceptions/APIException.ts';
import EX from '@/api/consts/exceptions.ts';

export default {
    prefix: '/v1',
    post: {
        '/token': async (request: Request) => {
            try {
                // 验证API密钥
                const apiKey = request.get('authorization')?.replace('Bearer ', '');
                if (apiKey !== config.apiKey) {
                    throw new APIException(EX.API_UNAUTHORIZED, 'Invalid API key');
                }

                let token = request.get('token');

                if (!token) {
                    const body = await request.json();
                    token = body.token;
                }

                if (!token || typeof token !== 'string') {
                    throw new APIException(EX.API_REQUEST_PARAMS_INVALID, 'Token is required and must be a string');
                }

                // 尝试刷新token
                let newToken: string | null = null;
                try {
                    newToken = await refreshToken(token);
                } catch (error) {
                    logger.error(`Failed to refresh token: ${error.message}`);
                    throw new APIException(EX.API_THIRD_PARTY_ERROR, 'Failed to refresh token. The provided token may be invalid or expired.');
                }

                if (newToken) {
                    // 如果刷新成功，更新token
                    await tokenManager.updateToken(token, newToken);
                    return new Response({
                        message: 'Token更新成功',
                        tokenCount: tokenManager.getTokenCount(),
                        newToken: newToken
                    });
                } else {
                    // 如果刷新失败，抛出异常
                    throw new APIException(EX.API_THIRD_PARTY_ERROR, 'Failed to refresh token. The provided token may be invalid or expired.');
                }
            } catch (error) {
                if (error instanceof APIException) {
                    throw error;
                }
                logger.error(`Error in /token route: ${error.message}`);
                throw new APIException(EX.API_UNKNOWN_ERROR, 'An unexpected error occurred');
            }
        }
    },
    get: {
        '/token/refresh': async (request: Request) => {
            try {
                // 验证API密钥
                const apiKey = request.get('authorization')?.replace('Bearer ', '');
                if (apiKey !== config.apiKey) {
                    throw new APIException(EX.API_UNAUTHORIZED, 'Invalid API key');
                }

                await tokenManager.refreshTokens();
                const status = tokenManager.getRefreshStatus();

                return new Response({
                    message: '刷新成功',
                    tokenCount: tokenManager.getTokenCount(),
                    status
                });
            } catch (error) {
                if (error instanceof APIException) {
                    throw error;
                }
                logger.error(`Error in /token/refresh route: ${error.message}`);
                throw new APIException(EX.API_UNKNOWN_ERROR, 'An unexpected error occurred');
            }
        }
    }
};
