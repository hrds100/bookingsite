import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "nfs-images";

export function useNfsImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File,
    operatorId: string,
    propertyId: string
  ): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const path = `${operatorId}/${propertyId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file);

      if (uploadError) {
        setError(uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string) => {
    setError(null);
    try {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([path]);

      if (removeError) {
        setError(removeError.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove failed";
      setError(msg);
    }
  };

  return { upload, remove, uploading, error };
}
