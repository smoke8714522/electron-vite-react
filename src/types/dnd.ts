/**
 * Defines the types of draggable items used in react-dnd.
 */
export const ItemTypes = {
  ASSET_CARD: 'asset_card',
};

/**
 * Defines the structure of the item being dragged.
 */
export interface DndItem {
  id: number; // Asset ID being dragged
  type: string; // Should match one of the ItemTypes
} 