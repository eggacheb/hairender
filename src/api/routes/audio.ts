import _ from 'lodash';
import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import audio from '@/api/controllers/audio.ts';
import modelMap from "../consts/model-map.ts";
import environment from "@/lib/environment.ts";
import config from '@/lib/config.ts';
import sessionManager from '@/lib/session-manager.ts';
import logger from "@/lib/logger.ts";

// ... (保持其他常量不变)

export default {
  prefix: "/v1/audio",

  post: {
    "/speech": async (request: Request) => {
      request
        .validate("body.input", _.isString)
        .validate("body.voice", _.isString)
        .validate("body.conversation_id", v => _.isUndefined(v) || _.isString(v))
        .validate("headers.authorization", _.isString);

      // 验证API密钥
      const apiKey = request.headers.authorization.replace('Bearer ', '');
      if (apiKey !== config.apiKey) {
        throw new Error('Invalid API key');
      }

      let { model, input, voice, conversation_id } = request.body;

      // 使用 conversation_id 获取对应的token
      let sessionId = conversation_id || `temp_${Date.now()}`;
      let token = sessionManager.getToken(sessionId);

      logger.info(`Speech request for session ${sessionId}`);

      if (voice in VOICE_TO_MODEL_INDEX) {
        voice =
          REPLACE_AUDIO_MODEL[VOICE_TO_MODEL_INDEX[voice]] || "male-botong";
        logger.info(`使用voice映射为: ${voice}`);
      }
      const stream = await audio.createSpeech(model, input, voice, token);
      return new Response(stream, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    },

    "/transcriptions": async (request: Request) => {
      request
        .validate("body.model", _.isString)
        .validate("body.response_format", v => _.isUndefined(v) || _.isString(v))
        .validate("body.conversation_id", v => _.isUndefined(v) || _.isString(v))
        .validate("headers.authorization", _.isString);
      
      // 验证API密钥
      const apiKey = request.headers.authorization.replace('Bearer ', '');
      if (apiKey !== config.apiKey) {
        throw new Error('Invalid API key');
      }

      const { model, response_format: responseFormat = 'json', conversation_id } = request.body;

      // 使用 conversation_id 获取对应的token
      let sessionId = conversation_id || `temp_${Date.now()}`;
      let token = sessionManager.getToken(sessionId);

      logger.info(`Transcription request for session ${sessionId}`);

      if(!request.files['file'] && !request.body["file"])
        throw new Error('File field is not set');
      let tmpFilePath;
      if(request.files['file']) {
        const file = request.files['file'];
        if(!['audio/mp3', 'audio/mpeg', 'audio/x-wav', 'audio/wave', 'audio/mp4a-latm', 'audio/flac', 'audio/ogg', 'audio/webm'].includes(file.mimetype))
          throw new Error(`File MIME type ${file.mimetype} is unsupported`);
        tmpFilePath = file.filepath;
      }
      else
        throw new Error('File field is not set');
      
      const text = await audio.createTranscriptions(model, tmpFilePath, token);
      return new Response(responseFormat == 'json' ? { text } : text);
    },
  },
};
