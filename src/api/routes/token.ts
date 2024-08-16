import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import tokenManager from '@/lib/token-manager.ts';
import config from '@/lib/config.ts';

export default {
    prefix: '/v1',
    post: {
        '/token': async (request: Request) => {
            // 验证API密钥
            const apiKey = request.headers.authorization?.replace('Bearer ', '');
            if (apiKey !== config.apiKey) {
                throw new Error('Invalid API key');
            }

            let newToken;
            try {
                const body = await request.json();
                newToken = body.token;
            } catch (e) {
                console.log('Error parsing request body:', e);
            }

            if (!newToken) {
                return new Response('New token is required', { status: 400 });
            }

            await tokenManager.addToken(newToken);

            return new Response({
                message: '新Token添加成功并重新加载',
                tokenCount: tokenManager.getTokenCount()
            });
        }
    },
    get: {
        '/token/refresh': async (request: Request) => {
            // 验证API密钥
            const apiKey = request.headers.authorization?.replace('Bearer ', '');
            if (apiKey !== config.apiKey) {
                throw new Error('Invalid API key');
            }

            await tokenManager.refreshTokens();
            const status = tokenManager.getRefreshStatus();

            return new Response({
                message: '刷新成功',
                tokenCount: tokenManager.getTokenCount(),
                status
            });
        }
    }
};
