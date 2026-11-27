export {
  installEzgCapture,
  type EzgCaptureHandle,
  type EzgCaptureMethod,
  type EzgCaptureOptions,
  type EzgCaptureResult,
} from './capture-ezg';
export {
  detectAppBundle,
  installRequireCapture,
  isWebpackChunkArray,
  isWebpackRequireFn,
  scanWebpackChunkVars,
  WEBPACK_REQUIRE_REGEX,
  type RequireCaptureHandle,
  type RequireCaptureMethod,
  type RequireCaptureOptions,
  type RequireCaptureResult,
  type WebpackModuleCacheEntry,
  type WebpackModuleFactory,
  type WebpackRequire,
} from './capture-require';
