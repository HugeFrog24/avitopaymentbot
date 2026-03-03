import Avatar from "boring-avatars"

// Muted but varied palette — matches the zinc-based design in both light/dark mode.
const PALETTE = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706"]

/**
 * Deterministic avatar generated from a user ID.
 * Uses boring-avatars "beam" variant (face-like) for easy recognition.
 * Same userId always produces the same avatar.
 */
export function UserAvatar({ userId, size = 32 }: Readonly<{ userId: string; size?: number }>) {
  return <Avatar name={userId} size={size} variant="beam" colors={PALETTE} />
}
