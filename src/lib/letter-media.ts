import type { SupabaseClient } from "@supabase/supabase-js";

interface LetterWithMedia {
  audio_url: string | null;
  video_url: string | null;
  letter_images?: { id: string; image_url: string; caption: string; display_order: number }[];
}

export async function signLetterMedia(service: SupabaseClient, letter: LetterWithMedia) {
  let audioUrl: string | null = null;
  if (letter.audio_url) {
    const { data } = await service.storage
      .from("letter-audio")
      .createSignedUrl(letter.audio_url, 3600);
    audioUrl = data?.signedUrl ?? null;
  }

  // Longer expiry so a paused video still plays when they come back to it.
  let videoUrl: string | null = null;
  if (letter.video_url) {
    const { data } = await service.storage
      .from("letter-video")
      .createSignedUrl(letter.video_url, 6 * 3600);
    videoUrl = data?.signedUrl ?? null;
  }

  const images = await Promise.all(
    [...(letter.letter_images ?? [])]
      .sort((a, b) => a.display_order - b.display_order)
      .map(async (img) => {
        const { data } = await service.storage
          .from("letter-images")
          .createSignedUrl(img.image_url, 3600);
        return { id: img.id, signedUrl: data?.signedUrl ?? null, caption: img.caption };
      }),
  );

  return { audioUrl, videoUrl, images };
}
