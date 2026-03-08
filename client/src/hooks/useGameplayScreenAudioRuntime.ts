import { useEntrainmentSovaSounds } from './useEntrainmentSovaSounds';
import { useInsanitySovaSounds } from './useInsanitySovaSounds';
import type { SovaMessageAdder } from './useGameScreenSessionUi';

interface UseGameplayScreenAudioRuntimeOptions {
  localPlayer: any;
  activeConsumableEffects: Map<string, any>;
  localPlayerId?: string;
  showSovaSoundBox?: (audio: HTMLAudioElement, label: string) => void;
  sovaMessageAdder: SovaMessageAdder | null;
}

export function useGameplayScreenAudioRuntime({
  localPlayer,
  activeConsumableEffects,
  localPlayerId,
  showSovaSoundBox,
  sovaMessageAdder,
}: UseGameplayScreenAudioRuntimeOptions) {
  useInsanitySovaSounds({
    localPlayer,
    onSoundPlay: showSovaSoundBox,
    onAddMessage: sovaMessageAdder || undefined,
  });

  useEntrainmentSovaSounds({
    activeConsumableEffects,
    localPlayerId,
    onSoundPlay: showSovaSoundBox,
    onAddMessage: sovaMessageAdder || undefined,
  });
}
