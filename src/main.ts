import { APP_NAME, APP_VERSION } from './meta';

function bootstrap(): void {
  const readyState = typeof document !== 'undefined' ? document.readyState : 'unknown';
  const href = typeof location !== 'undefined' ? location.href : 'unknown';

  console.info(
    `[${APP_NAME}] v${APP_VERSION} loaded (readyState=${readyState}, url=${href})`,
  );

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(`${APP_NAME} v${APP_VERSION} 状态`, () => {
      console.info(`[${APP_NAME}] v${APP_VERSION} active on ${location.href}`);
      alert(`${APP_NAME} v${APP_VERSION} 已加载（P0 骨架验证版）`);
    });
  }
}

bootstrap();
