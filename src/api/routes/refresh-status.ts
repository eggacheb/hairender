import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import tokenManager from '@/lib/token-manager.ts';
import config from '@/lib/config.ts';

export default {
    prefix: '/v1',
    get: {
        '/refresh-status': async (request: Request) => {
            // 验证API密钥
            const apiKey = request.headers.authorization?.replace('Bearer ', '');
            if (apiKey !== config.apiKey) {
                throw new Error('Invalid API key');
            }

            const status = tokenManager.getRefreshStatus();
            if (!status) {
                return new Response({ message: 'No refresh has been performed yet.' });
            }
            return new Response(status);
        }
    }
};
