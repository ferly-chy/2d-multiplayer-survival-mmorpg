/**
 * Selector hook for equipment-derived movement modifiers (water speed, land speed).
 */
import { useMemo } from 'react';
import { useEngineSnapshot } from '../useEngineSnapshot';

const EMPTY_MAP = new Map();

export function useEquipmentMovementModifiers(identityHex: string | null): {
  waterSpeedBonus: number;
  movementSpeedModifier: number;
} {
  const activeEquipments = useEngineSnapshot(
    (s) => (s.world.tables['activeEquipments'] as Map<string, unknown> | undefined) ?? EMPTY_MAP
  );
  const inventoryItems = useEngineSnapshot(
    (s) => (s.world.tables['inventoryItems'] as Map<string, unknown> | undefined) ?? EMPTY_MAP
  );
  const itemDefinitions = useEngineSnapshot(
    (s) => (s.world.tables['itemDefinitions'] as Map<string, unknown> | undefined) ?? EMPTY_MAP
  );

  return useMemo(() => {
    let waterBonus = 0;
    let landModifier = 0;
    if (!identityHex) return { waterSpeedBonus: 0, movementSpeedModifier: 0 };

    const activeEquip = activeEquipments.get(identityHex) as {
      headItemInstanceId?: bigint;
      chestItemInstanceId?: bigint;
      legsItemInstanceId?: bigint;
      feetItemInstanceId?: bigint;
      handsItemInstanceId?: bigint;
      backItemInstanceId?: bigint;
    } | undefined;
    if (!activeEquip) return { waterSpeedBonus: 0, movementSpeedModifier: 0 };

    const armorSlotInstanceIds = [
      activeEquip.headItemInstanceId,
      activeEquip.chestItemInstanceId,
      activeEquip.legsItemInstanceId,
      activeEquip.feetItemInstanceId,
      activeEquip.handsItemInstanceId,
      activeEquip.backItemInstanceId,
    ].filter((id): id is bigint => id !== undefined);

    for (const instanceId of armorSlotInstanceIds) {
      const inventoryItem = Array.from(inventoryItems.values()).find(
        (item: { instanceId?: bigint }) => item.instanceId === instanceId
      );
      if (!inventoryItem) continue;

      const itemDef = Array.from(itemDefinitions.values()).find(
        (def: { id?: bigint }) => def.id === (inventoryItem as { itemDefId?: bigint }).itemDefId
      );
      if (!itemDef) continue;

      const wBonus = (itemDef as { waterSpeedBonus?: number }).waterSpeedBonus;
      if (typeof wBonus === 'number') waterBonus += wBonus;

      const mMod = (itemDef as { movementSpeedModifier?: number }).movementSpeedModifier;
      if (typeof mMod === 'number') landModifier += mMod;
    }
    return { waterSpeedBonus: waterBonus, movementSpeedModifier: landModifier };
  }, [identityHex, activeEquipments, inventoryItems, itemDefinitions]);
}
