import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const REPO_OWNER = '3433372905faz-ship-it';
const REPO_NAME = 'ShinyColors-zh';
const PAGES_BASE = `https://${REPO_OWNER}.github.io/${REPO_NAME}`;
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '偶像大师闪耀色彩 (ShinyColors) 汉化',
        namespace: REPO_URL,
        version: pkg.version,
        description:
          '偶像大师闪耀色彩网页版汉化脚本（PC Firefox + Violentmonkey）。录剧情视频到公开网站请先取得译者同意。',
        icon: 'https://shinycolors.enza.fun/icon_192x192.png',
        author: REPO_OWNER,
        match: ['https://shinycolors.enza.fun/*'],
        'run-at': 'document-start',
        'inject-into': 'page',
        grant: ['GM_registerMenuCommand', 'GM_xmlhttpRequest'],
        connect: [`${REPO_OWNER}.github.io`, 'cdn.jsdelivr.net'],
        updateURL: `${PAGES_BASE}/ShinyColors-zh.user.js`,
        downloadURL: `${PAGES_BASE}/ShinyColors-zh.user.js`,
        supportURL: `${REPO_URL}/issues`,
      },
      build: {
        fileName: 'ShinyColors-zh.user.js',
        autoGrant: false,
      },
    }),
  ],
});
