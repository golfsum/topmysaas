export function removalBarrierAllowsIntent(
  tombstoneExists: boolean,
  tombstoneRemovalId: unknown,
  acceptedRemovalId: string | undefined,
): boolean {
  if (!tombstoneExists) return true;

  return (
    typeof tombstoneRemovalId === "string" &&
    tombstoneRemovalId.length > 0 &&
    acceptedRemovalId === tombstoneRemovalId
  );
}
