import type { HookContext, HookInstallResult } from './types';

interface ResourceInstance {
  name?: string;
  url?: string;
  crossOrigin?: string | boolean;
}

interface ResourceProto {
  _loadElement?: (this: ResourceInstance, type: string) => unknown;
}

interface EzgLoaderLike {
  loaders?: { Resource?: { prototype?: ResourceProto } };
}

interface WebpModuleLike {
  isSupportedWebP?: () => boolean;
  toWebPUrl?: (path: string) => string;
}

export async function installResourceHook(ctx: HookContext): Promise<HookInstallResult> {
  const ezg = ctx.modules.AOBA?.value as EzgLoaderLike | null;
  const proto = ezg?.loaders?.Resource?.prototype;
  if (!proto || typeof proto._loadElement !== 'function') {
    ctx.diag.setHook('resource', 'notFound', 'Resource.prototype._loadElement unavailable');
    return {
      name: 'resource',
      status: 'notFound',
      detail: 'Resource.prototype._loadElement unavailable',
    };
  }

  try {
    const [{ manifest }, imageMap, pictureMap] = await Promise.all([
      ctx.repo.getManifest(),
      ctx.repo.getImageMap(),
      ctx.repo.getPictureMap(),
    ]);
    const webp = ctx.modules.WEBP?.value as WebpModuleLike | null;
    const origLoadElement = proto._loadElement;

    proto._loadElement = function (this: ResourceInstance, type: string) {
      try {
        if (type === 'image' && typeof this.name === 'string' && typeof this.url === 'string') {
          const rule = imageMap.get(this.name);
          if (rule && this.url.endsWith(`v=${rule.version}`)) {
            let relPath = `data/image/${rule.url}`;
            if (webp?.isSupportedWebP?.() && !rule.url.startsWith('tips/') && webp.toWebPUrl) {
              const webpPath = webp.toWebPUrl(relPath);
              if (manifest.files[webpPath]) {
                relPath = webpPath;
              }
            }
            const nextUrl = ctx.repo.buildAssetUrl(relPath, manifest);
            if (nextUrl) {
              this.url = nextUrl;
              this.crossOrigin = 'anonymous';
            }
          } else if (this.name.startsWith('images/')) {
            const picRel = this.name.slice('images/'.length);
            if (pictureMap.has(picRel)) {
              const nextUrl = ctx.repo.buildAssetUrl(`data/picture/${picRel}`, manifest);
              if (nextUrl) {
                this.url = nextUrl;
                this.crossOrigin = 'anonymous';
              }
            }
          }
        }
      } catch (err) {
        ctx.diag.recordError('resource', err);
      }
      return origLoadElement.call(this, type);
    };

    const detail = `images=${imageMap.size}, pictures=${pictureMap.size}`;
    ctx.diag.setHook('resource', 'ok', detail);
    return { name: 'resource', status: 'ok', detail };
  } catch (err) {
    ctx.diag.recordError('resource', err);
    ctx.diag.setHook('resource', 'failed', err instanceof Error ? err.message : String(err));
    return { name: 'resource', status: 'failed', detail: String(err) };
  }
}
