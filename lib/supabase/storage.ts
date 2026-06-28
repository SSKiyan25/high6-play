/**
 * Supabase Storage helper for high6-play.
 *
 * All topic images are stored in the public `high6-play` bucket.
 * The `image_url` column on `mole_topics` stores only the storage
 * path (e.g. `mole-topics/<uuid>.jpg`), not a full URL.
 *
 * This helper constructs the full public URL from a stored path.
 * It also handles legacy full-URL values gracefully (pass-through).
 */
const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`

export function getTopicImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null

  // Legacy: if it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  return `${STORAGE_URL}/high6-play/${imagePath}`
}
