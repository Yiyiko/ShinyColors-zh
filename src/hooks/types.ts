import type { DataRepository } from '../data/repository';
import type { StoryEditorStore } from '../dev/story-editor';
import type { LocateResult, ModuleName } from '../locator';
import type { RuntimeTranslator } from '../translate';
import type { DiagnosticsStore, HookStatus } from '../ui/diagnostics-panel';

export interface HookInstallResult {
  name: string;
  status: HookStatus;
  detail?: string;
}

export interface HookContext {
  modules: Record<ModuleName, LocateResult>;
  repo: DataRepository;
  diag: DiagnosticsStore;
  editor: StoryEditorStore;
  translator?: RuntimeTranslator;
  showStoryHints?: boolean;
}
