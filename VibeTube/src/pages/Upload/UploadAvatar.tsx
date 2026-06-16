import { useState, useRef } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";

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
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

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