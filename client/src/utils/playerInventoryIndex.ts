import type { Identity } from 'spacetimedb';
import type { InventoryItem, ItemDefinition } from '../generated/types';

export function isPlayerInventoryOrHotbarItem(item: InventoryItem, playerIdentity: Identity): boolean {
  const loc = item.location;
  if (!loc) return false;

  if (loc.tag !== 'Inventory' && loc.tag !== 'Hotbar') return false;

  const ownerId = loc.value?.ownerId;
  return !!ownerId && ownerId.isEqual(playerIdentity);
}

export function buildPlayerInventoryCountsByDefId(
  inventoryItems: Map<string, InventoryItem>,
  playerIdentity: Identity | null
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!playerIdentity) return counts;

  inventoryItems.forEach((item) => {
    if (!isPlayerInventoryOrHotbarItem(item, playerIdentity)) return;

    const itemDefId = item.itemDefId.toString();
    counts.set(itemDefId, (counts.get(itemDefId) ?? 0) + Number(item.quantity));
  });

  return counts;
}

export function buildItemDefinitionsByName(
  itemDefinitions: Map<string, ItemDefinition>
): Map<string, ItemDefinition> {
  const byName = new Map<string, ItemDefinition>();

  itemDefinitions.forEach((definition) => {
    byName.set(definition.name.trim(), definition);
  });

  return byName;
}
