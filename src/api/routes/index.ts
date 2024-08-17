import fs from 'fs-extra';
import Response from '@/lib/response/Response.ts';
import chat from "./chat.ts";
import audio from './audio.ts';
import ping from "./ping.ts";
import token from './token.js';
import models from './models.ts';
import refreshStatus from './refresh-status.ts';
import tokenManager from '@/lib/token-manager.ts';

export default [
    {
        get: {
            '/': async () => {
                const content = await fs.readFile('public/welcome.html');
                return new Response(content, {
                    type: 'html',
                    headers: {
                        Expires: '-1'
                    }
                });
            },
            '/next-refresh': async () => {
                const nextRefresh = tokenManager.getNextRefreshTime();
                return { nextRefresh };
            }
        }
    },
    chat,
    audio,
    ping,
    token,
    models,
    refreshStatus
];
