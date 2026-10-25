import { useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { extractStoragePath } from "../../shared/lib/storage";
import { useToast } from "../../shared/ui/Toast/ToastProvider";
import Avatar from "../../shared/ui/Avatar/Avatar";

const MAX_AVATAR_SIZE_MB = 5;

interface AvatarUploadProps {
  currentAvatar: string | null;
  username?: string | null;
  onAvatarChange?: (url: string) => void;
}

export default function AvatarUpload({ currentAvatar, username, onAvatarChange }: AvatarUploadProps) {
  const { user, updateProfile } = useAuth();
  const showToast = useToast();
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(currentAvatar);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    const file = e.target.files[0];
    e.target.value = ""; // чтобы можно было выбрать тот же файл повторно
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      showToast("error", `Файл слишком большой. Максимум — ${MAX_AVATAR_SIZE_MB} МБ`);
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
      onAvatarChange?.(publicUrl);
      // Шапка и меню берут аватар из контекста — обновятся без перезагрузки
      updateProfile({ avatar_url: publicUrl });
      showToast("success", "Аватар обновлён");

      // Старый аватар больше не нужен — не копим мусор в бакете
      if (previousPath) {
        const { error: removeError } = await supabase.storage.from("avatar").remove([previousPath]);
        if (removeError) console.error("Не удалось удалить старый аватар:", removeError);
      }
    } catch (error) {
      console.error("Ошибка загрузки аватара:", error);
      showToast("error", "Не удалось загрузить аватар. Попробуйте ещё раз");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="avatar-upload-wrapper">
      <label htmlFor="avatar-input" className="avatar-label" title="Изменить аватар">
        <div className={`avatar-image-container ${uploading ? "loading" : ""}`}>
          <Avatar src={avatar} name={username} className="avatar-img-preview" />

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
