import { useState, useRef } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { extractStoragePath } from "../../shared/lib/storage";

const MAX_AVATAR_SIZE_MB = 5;

interface AvatarUploadProps {
  currentAvatar: string | null;
  username?: string;
  onAvatarChange?: (url: string) => void;
}

export default function AvatarUpload({ currentAvatar, username, onAvatarChange }: AvatarUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(currentAvatar);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    const file = e.target.files[0];
    e.target.value = ""; // чтобы можно было выбрать тот же файл повторно
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      alert(`Файл слишком большой. Максимум — ${MAX_AVATAR_SIZE_MB} МБ`);
      return;
    }

    const fileExt = file.name.split(".").pop();
    // Политика Storage разрешает загрузку только в папку со своим id
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    const previousPath = extractStoragePath(avatar, "avatar");

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatar")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatar").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatar(publicUrl);
      if (onAvatarChange) onAvatarChange(publicUrl);

      // Старый аватар больше не нужен — не копим мусор в бакете
      if (previousPath) {
        const { error: removeError } = await supabase.storage.from("avatar").remove([previousPath]);
        if (removeError) console.error("Не удалось удалить старый аватар:", removeError);
      }
    } catch (error: any) {
      alert(error.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload-wrapper">
      <label htmlFor="avatar-input" className="avatar-label">
        <div className={`avatar-image-container ${uploading ? "loading" : ""}`}>
          <img
            src={avatar || `https://ui-avatars.com/api/?name=${username || "User"}`}
            alt="avatar"
            className="avatar-img-preview"
          />
          
          <div className="avatar-overlay">
            <span>{uploading ? "..." : "Изменить"}</span>
          </div>
        </div>
      </label>

      <input
        id="avatar-input"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        style={{ display: "none" }}
      />
    </div>
  );
}