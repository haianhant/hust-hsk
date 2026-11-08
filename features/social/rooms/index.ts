export {
  createSeatRegistry,
  claimSeat,
  releaseSeatByOccupant,
  getSeatOccupancy,
  getOccupantSeat,
  listOccupanciesForRoom,
  getStudyRoomAvailabilitySummary,
  restoreSeatRegistryFromAttachments,
  type SeatRegistry,
  type ClaimSeatInput,
  type ClaimSeatResult,
  type HibernatedSeatAttachment,
} from './seat-manager';
