/**
 * Frame assembly: viewport culling and Y-sort.
 * Re-exports useEntityFiltering to establish frame module boundary.
 * GameCanvas should import from here; full frame assembly composition is staged.
 */
export {
  useEntityFiltering,
  type YSortedEntityType,
  type ViewportBounds,
  isInView,
  isNotRespawning,
} from '../../hooks/useEntityFiltering';
