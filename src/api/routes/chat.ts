import _ from 'lodash';
import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import chat from '@/api/controllers/chat.ts';
import logger from '@/lib/logger.ts';
import config from '@/lib/config.ts';
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

            // 使用 conversation_id 或创建一个新的
            let sessionId = convId || `temp_${Date.now()}`;
            let token = await sessionManager.getToken(sessionId);

            logger.info(`Chat completion request for session ${sessionId}`);

            if (stream) {
                const stream = await chat.createCompletionStream(model, messages, token, sessionId);
                return new Response(stream, {
                    type: "text/event-stream"
                });
            }
            else
                return await chat.createCompletion(model, messages, token, sessionId);
        }
    }
}
