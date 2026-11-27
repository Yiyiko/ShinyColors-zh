import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const REPO_OWNER = 'Yiyiko';
const REPO_NAME = 'ShinyColors-zh';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

export default defineConfig({
  build: {
    emptyOutDir: false,
  },
  plugins: [
    monkey({
      entry: 'src/dev/recon-entry.ts',
      userscript: {
        name: '[DEV 侦察] 偶像大师闪耀色彩 (ShinyColors) Recon',
        namespace: `${REPO_URL}/recon`,
        version: `${pkg.version}-recon`,
        description:
          'P1 运行时侦察专用脚本：只读采集模块结构、剧情路径与脱敏样本并回传至本地 dev-server（请勿与正式汉化脚本同时启用）。',
        icon: 'https://shinycolors.enza.fun/icon_192x192.png',
        author: REPO_OWNER,
        match: ['https://shinycolors.enza.fun/*'],
        'run-at': 'document-start',
        'inject-into': 'page',
        grant: ['GM_registerMenuCommand', 'GM_xmlhttpRequest'],
        connect: ['127.0.0.1', 'localhost'],
      },
      build: {
        fileName: 'ShinyColors-zh-recon.user.js',
        autoGrant: false,
      },
    }),
  ],
});
