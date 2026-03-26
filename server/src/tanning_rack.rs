/******************************************************************************
 * Tanning rack: converts Animal Hide + bark (Pine or Birch) into Animal      *
 * Leather over time. Same container pattern as compost (wooden_storage_box). *
 ******************************************************************************/

use spacetimedb::{ReducerContext, Table, Timestamp};
use spacetimedb::spacetimedb_lib::{ScheduleAt, TimeDuration};
use std::time::Duration;

use crate::wooden_storage_box::{
    WoodenStorageBox, BOX_TYPE_TANNING_RACK, validate_box_interaction,
    wooden_storage_box as WoodenStorageBoxTableTrait,
};
use crate::items::{InventoryItem, ItemDefinition};
use crate::items::{inventory_item as InventoryItemTableTrait, item_definition as ItemDefinitionTableTrait};
use crate::dropped_item::create_dropped_item_entity;
use crate::inventory_management::ItemContainer;
use crate::models::{ItemLocation, ContainerType, ContainerLocationData};
use serde_json;
use std::collections::HashMap;

pub const NUM_TANNING_RACK_SLOTS: usize = 20;
pub const TANNING_RACK_INITIAL_HEALTH: f32 = 500.0;
pub const TANNING_RACK_MAX_HEALTH: f32 = 500.0;

pub const TANNING_PROCESS_INTERVAL_SECS: u64 = 60;
pub const TANNING_CONVERSION_TIME_SECS: u64 = 300;

const TANNING_TS_KEY: &str = "tanning_placed_at";

#[spacetimedb::table(accessor = tanning_process_schedule, scheduled(process_tanning_conversion))]
#[derive(Clone)]
pub struct TanningProcessSchedule {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub scheduled_at: ScheduleAt,
}

pub fn init_tanning_rack_system(ctx: &ReducerContext) -> Result<(), String> {
    let schedule_table = ctx.db.tanning_process_schedule();
    if schedule_table.iter().count() == 0 {
        log::info!(
            "Starting tanning rack processing schedule (every {}s).",
            TANNING_PROCESS_INTERVAL_SECS
        );
        let interval = Duration::from_secs(TANNING_PROCESS_INTERVAL_SECS);
        crate::try_insert_schedule!(
            schedule_table,
            TanningProcessSchedule {
                id: 0,
                scheduled_at: ScheduleAt::Interval(TimeDuration::from(interval)),
            },
            "Tanning rack processing"
        );
    } else {
        log::debug!("Tanning rack processing schedule already exists.");
    }
    Ok(())
}

pub(crate) fn set_tanning_timestamp(item: &mut InventoryItem, timestamp: Timestamp) {
    let mut data_map: HashMap<String, serde_json::Value> = if let Some(ref data_str) = item.item_data {
        serde_json::from_str(data_str).unwrap_or_default()
    } else {
        HashMap::new()
    };
    data_map.insert(
        TANNING_TS_KEY.to_string(),
        serde_json::json!(timestamp.to_micros_since_unix_epoch()),
    );
    item.item_data = Some(serde_json::to_string(&data_map).unwrap_or_default());
}

fn get_tanning_timestamp(item: &InventoryItem) -> Option<Timestamp> {
    if let Some(ref data_str) = item.item_data {
        if let Ok(data_map) = serde_json::from_str::<HashMap<String, serde_json::Value>>(data_str) {
            if let Some(ts_value) = data_map.get(TANNING_TS_KEY) {
                if let Some(ts_micros) = ts_value.as_i64() {
                    return Some(Timestamp::from_micros_since_unix_epoch(ts_micros));
                }
            }
        }
    }
    None
}

/// Allowed in the tanning rack: raw hide, tanning agent (bark), and finished leather for storage.
pub fn is_item_allowed_in_tanning_rack(item_def: &ItemDefinition) -> bool {
    matches!(
        item_def.name.as_str(),
        "Animal Hide" | "Pine Bark" | "Birch Bark" | "Animal Leather"
    )
}

fn validate_tanning_rack_and_item(
    ctx: &ReducerContext,
    box_id: u32,
    item_instance_id: u64,
) -> Result<(WoodenStorageBox, ItemDefinition), String> {
    let (_player, storage_box) = validate_box_interaction(ctx, box_id)?;
    if storage_box.box_type != BOX_TYPE_TANNING_RACK {
        return Err("This reducer is only for tanning racks.".to_string());
    }
    let inventory_items = ctx.db.inventory_item();
    let item_defs = ctx.db.item_definition();
    let item = inventory_items
        .instance_id()
        .find(item_instance_id)
        .ok_or_else(|| format!("Item {} not found", item_instance_id))?;
    let item_def = item_defs
        .id()
        .find(item.item_def_id)
        .ok_or_else(|| format!("Item definition {} not found", item.item_def_id))?;
    if !is_item_allowed_in_tanning_rack(&item_def) {
        return Err(format!(
            "Cannot store '{}' in the tanning rack. Only animal hide, bark, and leather belong here.",
            item_def.name
        ));
    }
    Ok((storage_box, item_def))
}

#[spacetimedb::reducer]
pub fn move_item_to_tanning_rack(
    ctx: &ReducerContext,
    box_id: u32,
    target_slot_index: u8,
    item_instance_id: u64,
) -> Result<(), String> {
    let mut boxes = ctx.db.wooden_storage_box();
    let (mut storage_box, _item_def) = validate_tanning_rack_and_item(ctx, box_id, item_instance_id)?;
    let mut inventory_items = ctx.db.inventory_item();
    if let Some(mut item) = inventory_items.instance_id().find(&item_instance_id) {
        if let Some(def) = ctx.db.item_definition().id().find(&item.item_def_id) {
            if def.name == "Animal Hide" {
                set_tanning_timestamp(&mut item, ctx.timestamp);
                inventory_items.instance_id().update(item);
            }
        }
    }
    crate::inventory_management::handle_move_to_container_slot(
        ctx,
        &mut storage_box,
        target_slot_index,
        item_instance_id,
    )?;
    boxes.id().update(storage_box);
    Ok(())
}

#[spacetimedb::reducer]
pub fn split_stack_into_tanning_rack(
    ctx: &ReducerContext,
    box_id: u32,
    target_slot_index: u8,
    source_item_instance_id: u64,
    quantity_to_split: u32,
) -> Result<(), String> {
    let mut boxes = ctx.db.wooden_storage_box();
    let (_storage_box, _item_def) =
        validate_tanning_rack_and_item(ctx, box_id, source_item_instance_id)?;
    let (_player, mut storage_box) = validate_box_interaction(ctx, box_id)?;
    crate::inventory_management::handle_split_into_container(
        ctx,
        &mut storage_box,
        target_slot_index,
        source_item_instance_id,
        quantity_to_split,
    )?;
    let mut inventory_items = ctx.db.inventory_item();
    if let Some(new_item_id) = storage_box.get_slot_instance_id(target_slot_index) {
        if let Some(mut new_item) = inventory_items.instance_id().find(&new_item_id) {
            if let Some(def) = ctx.db.item_definition().id().find(&new_item.item_def_id) {
                if def.name == "Animal Hide" {
                    set_tanning_timestamp(&mut new_item, ctx.timestamp);
                    inventory_items.instance_id().update(new_item);
                }
            }
        }
    }
    boxes.id().update(storage_box);
    Ok(())
}

#[spacetimedb::reducer]
pub fn quick_move_to_tanning_rack(
    ctx: &ReducerContext,
    box_id: u32,
    item_instance_id: u64,
) -> Result<(), String> {
    let mut boxes = ctx.db.wooden_storage_box();
    let (mut storage_box, _item_def) = validate_tanning_rack_and_item(ctx, box_id, item_instance_id)?;
    let mut inventory_items = ctx.db.inventory_item();
    if let Some(mut item) = inventory_items.instance_id().find(&item_instance_id) {
        if let Some(def) = ctx.db.item_definition().id().find(&item.item_def_id) {
            if def.name == "Animal Hide" {
                set_tanning_timestamp(&mut item, ctx.timestamp);
                inventory_items.instance_id().update(item);
            }
        }
    }
    crate::inventory_management::handle_quick_move_to_container(ctx, &mut storage_box, item_instance_id)?;
    boxes.id().update(storage_box);
    Ok(())
}

#[spacetimedb::reducer]
pub fn process_tanning_conversion(ctx: &ReducerContext, _args: TanningProcessSchedule) -> Result<(), String> {
    if ctx.sender() != ctx.identity() {
        return Err("Tanning rack processing can only be run by scheduler".to_string());
    }
    let has_racks = ctx
        .db
        .wooden_storage_box()
        .iter()
        .any(|b| b.box_type == BOX_TYPE_TANNING_RACK);
    if !has_racks {
        return Ok(());
    }
    let current_time = ctx.timestamp;

    let (leather_def_id, leather_max_stack) = {
        let item_defs = ctx.db.item_definition();
        let mut found: Option<(u64, u32)> = None;
        for def in item_defs.iter() {
            if def.name == "Animal Leather" {
                let max_stack = if def.is_stackable { def.stack_size } else { 1 };
                found = Some((def.id, max_stack));
                break;
            }
        }
        match found {
            Some(v) => v,
            None => return Err("Animal Leather item definition not found".to_string()),
        }
    };

    let mut rack_ids: Vec<u32> = Vec::new();
    for b in ctx.db.wooden_storage_box().iter() {
        if b.box_type == BOX_TYPE_TANNING_RACK {
            rack_ids.push(b.id);
        }
    }
    for box_id in rack_ids {
        let _ = process_single_tanning_rack_box(
            ctx,
            box_id,
            current_time,
            leather_def_id,
            leather_max_stack,
        );
    }
    Ok(())
}

fn is_bark_name(name: &str) -> bool {
    matches!(name, "Pine Bark" | "Birch Bark")
}

fn process_single_tanning_rack_box(
    ctx: &ReducerContext,
    box_id: u32,
    current_time: Timestamp,
    leather_def_id: u64,
    leather_max_stack: u32,
) -> Result<(), String> {
    let boxes_table = ctx.db.wooden_storage_box();
    let items_table = ctx.db.inventory_item();
    let defs_table = ctx.db.item_definition();

    let rack_original = match boxes_table.id().find(&box_id) {
        Some(b) => b,
        None => return Ok(()),
    };
    let mut rack = rack_original.clone();
    let num_slots: usize = rack.num_slots();
    let mut box_struct_modified = false;

    let current_micros: i64 = current_time.to_micros_since_unix_epoch();

    // Assign timestamps to hides missing one (same idea as compost).
    let mut items_to_timestamp: Vec<u64> = Vec::new();
    for slot_idx in 0..num_slots {
        let slot_u8 = slot_idx as u8;
        if let Some(iid) = rack.get_slot_instance_id(slot_u8) {
            if let Some(item) = items_table.instance_id().find(&iid) {
                if let Some(def) = defs_table.id().find(&item.item_def_id) {
                    if def.name == "Animal Hide" && get_tanning_timestamp(&item).is_none() {
                        items_to_timestamp.push(iid);
                    }
                }
            }
        }
    }
    for item_id in items_to_timestamp {
        if let Some(mut item) = items_table.instance_id().find(&item_id) {
            set_tanning_timestamp(&mut item, current_time);
            items_table.instance_id().update(item);
        }
    }

    let mut leather_to_add: u32 = 0;
    let mut hide_remove: Vec<(u8, u64)> = Vec::new();

    for slot_idx in 0..num_slots {
        let slot_u8 = slot_idx as u8;
        let Some(item_instance_id) = rack.get_slot_instance_id(slot_u8) else {
            continue;
        };
        let Some(mut item) = items_table.instance_id().find(&item_instance_id) else {
            continue;
        };
        let Some(item_def) = defs_table.id().find(&item.item_def_id) else {
            continue;
        };
        if item_def.name != "Animal Hide" {
            continue;
        }
        let Some(placed_at) = get_tanning_timestamp(&item) else {
            continue;
        };
        let elapsed_secs =
            ((current_micros.saturating_sub(placed_at.to_micros_since_unix_epoch())) as u64) / 1_000_000;
        if elapsed_secs < TANNING_CONVERSION_TIME_SECS {
            continue;
        }

        // Need at least one bark unit somewhere in the rack.
        let mut bark_slot: Option<u8> = None;
        let mut bark_id: Option<u64> = None;
        let mut bark_qty: u32 = 0;
        for si in 0..num_slots {
            let su = si as u8;
            if let Some(bid) = rack.get_slot_instance_id(su) {
                if let Some(bitem) = items_table.instance_id().find(&bid) {
                    if let Some(bdef) = defs_table.id().find(&bitem.item_def_id) {
                        if is_bark_name(&bdef.name) && bitem.quantity > 0 {
                            bark_slot = Some(su);
                            bark_id = Some(bid);
                            bark_qty = bitem.quantity;
                            break;
                        }
                    }
                }
            }
        }
        if bark_slot.is_none() {
            continue;
        }

        // Consume one bark
        let bs = bark_slot.unwrap();
        let bid = bark_id.unwrap();
        if bark_qty > 1 {
            if let Some(mut bitem) = items_table.instance_id().find(&bid) {
                bitem.quantity -= 1;
                items_table.instance_id().update(bitem);
            }
        } else {
            rack.set_slot(bs, None, None);
            items_table.instance_id().delete(bid);
            box_struct_modified = true;
        }

        // Consume one hide
        if item.quantity > 1 {
            item.quantity -= 1;
            set_tanning_timestamp(&mut item, current_time);
            items_table.instance_id().update(item);
        } else {
            hide_remove.push((slot_u8, item_instance_id));
        }
        leather_to_add += 1;
    }

    for (slot_u8, iid) in hide_remove {
        rack.set_slot(slot_u8, None, None);
        items_table.instance_id().delete(iid);
        box_struct_modified = true;
    }

    if leather_to_add > 0 {
        let mut slot_i = 0usize;
        while slot_i < num_slots && leather_to_add > 0 {
            let slot_u8 = slot_i as u8;
            if let Some(existing_id) = rack.get_slot_instance_id(slot_u8) {
                if let Some(mut existing) = items_table.instance_id().find(&existing_id) {
                    if existing.item_def_id == leather_def_id {
                        let space = leather_max_stack.saturating_sub(existing.quantity);
                        if space > 0 {
                            let to_add = leather_to_add.min(space);
                            existing.quantity += to_add;
                            items_table.instance_id().update(existing);
                            leather_to_add -= to_add;
                        }
                    }
                }
            }
            slot_i += 1;
        }

        while leather_to_add > 0 {
            let mut placed = false;
            for si in 0..num_slots {
                let su = si as u8;
                if rack.get_slot_instance_id(su).is_none() {
                    let q = leather_to_add.min(leather_max_stack);
                    let new_location = ItemLocation::Container(ContainerLocationData {
                        container_type: ContainerType::WoodenStorageBox,
                        container_id: rack.id as u64,
                        slot_index: su,
                    });
                    let new_item = InventoryItem {
                        instance_id: 0,
                        item_def_id: leather_def_id,
                        quantity: q,
                        location: new_location,
                        item_data: None,
                    };
                    match items_table.try_insert(new_item) {
                        Ok(inserted) => {
                            rack.set_slot(su, Some(inserted.instance_id), Some(leather_def_id));
                            leather_to_add -= q;
                            placed = true;
                            box_struct_modified = true;
                            break;
                        }
                        Err(e) => {
                            log::warn!("[TanningRack] Failed to insert leather: {:?}", e);
                            break;
                        }
                    }
                }
            }
            if !placed {
                if leather_to_add > 0 {
                    let drop_result = create_dropped_item_entity(
                        ctx,
                        leather_def_id,
                        leather_to_add,
                        rack.pos_x,
                        rack.pos_y,
                    );
                    if let Err(e) = drop_result {
                        log::warn!("[TanningRack] Failed to drop leather: {}", e);
                    }
                }
                break;
            }
        }
    }

    if box_struct_modified {
        ctx.db.wooden_storage_box().id().update(rack);
    }
    Ok(())
}
