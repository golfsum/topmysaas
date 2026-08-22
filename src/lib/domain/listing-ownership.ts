export function listingOwnershipMatches(
  existingOwnerTokenHash: string | undefined,
  requesterOwnerTokenHash: string,
): boolean {
  return (
    existingOwnerTokenHash === undefined ||
    existingOwnerTokenHash === requesterOwnerTokenHash
  );
}
