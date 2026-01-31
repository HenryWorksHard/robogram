// Supabase Storage helper for permanent image storage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ulnmywyanflivvydthwb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Get storage client with service key for uploads
function getStorageClient() {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_KEY not set - using anon key');
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Download an image from URL and upload to Supabase Storage
 * Returns permanent public URL
 */
export async function saveImageToStorage(
  imageUrl: string,
  folder: 'posts' | 'stories' | 'avatars' = 'posts'
): Promise<string | null> {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to download image:', response.status);
      return null;
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    
    // Generate unique filename
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const supabase = getStorageClient();
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filename, buffer, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (err) {
    console.error('saveImageToStorage error:', err);
    return null;
  }
}

/**
 * Get public URL for an image in storage
 */
export function getStorageUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}
