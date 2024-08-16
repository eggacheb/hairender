import _ from 'lodash';
import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import chat from '@/api/controllers/chat.ts';
import logger from '@/lib/logger.ts';
import config from '@/lib/config.ts';
import tokenManager from '@/lib/token-manager.ts';
import sessionManager from '@/lib/session-manager.ts';

export default {
    prefix: '/v1/chat',
    post: {
        '/completions': async (request: Request) => {
            request
                .validate('body.conversation_id', v => _.isUndefined(v) || _.isString(v))
                .validate('body.messages', _.isArray)
                .validate('headers.authorization', _.isString)
            
            // 验证API密钥
            const apiKey = request.headers.authorization.replace('Bearer ', '');
            if (apiKey !== config.apiKey) {
                throw new Error('Invalid API key');
            }

            const { model, conversation_id: convId, messages, stream } = request.body;

            // 使用 conversation_id 作为 sessionId
            let sessionId = convId || `temp_${Date.now()}`;
            let token = sessionManager.getToken(sessionId);

            if (!token) {
                // 如果session中没有token，则随机选择一个
                const allTokens = tokenManager.getAllTokens().split(',');
                token = allTokens[Math.floor(Math.random() * allTokens.length)];
                sessionManager.setToken(sessionId, token);
            }

            // 如果convId不存在，使用新生成的sessionId
            const finalConvId = convId || sessionId;

            if (stream) {
                const stream = await chat.createCompletionStream(model, messages, token, finalConvId);
                return new Response(stream, {
                    type: "text/event-stream"
                });
            }
            else
                return await chat.createCompletion(model, messages, token, finalConvId);
        }
    }
}
