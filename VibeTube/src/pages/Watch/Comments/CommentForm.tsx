import { useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function CommentForm({
  videoId,
  parentId,
}: {
  videoId: string;
  parentId?: string | null;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const sendComment = async () => {
    if (!text.trim()) return;
    if (!user) return;

    setLoading(true);

    await supabase.from("comments").insert({
      user_id: user.id,
      video_id: videoId,
      parent_id: parentId ?? null,
      text,
    });

    setText("");
    setLoading(false);
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Написать комментарий..."
      />

      <button onClick={sendComment} disabled={loading}>
        Отправить
      </button>
    </div>
  );
}
