import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";
import { useNavigate } from "react-router-dom";


interface Props {
  video: any;
  subscribersCount: number;
  onSubscriptionChange: () => void;
}

export default function VideoInfo({
  video,
  subscribersCount,
  onSubscriptionChange
}: Props) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const navigate = useNavigate();
  const channelId = video.author_id;

  useEffect(() => {
    if (!user || !channelId) return;

    const checkSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("subscriber_id", user.id)
        .eq("channel_id", channelId)
        .maybeSingle();

      setIsSubscribed(!!data);
    };

    checkSubscription();
  }, [user, channelId]);

  const toggleSubscription = async () => {
    if (!user) return;

    if (isSubscribed) {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("channel_id", channelId);

      if (!error) {
        setIsSubscribed(false);
        onSubscriptionChange(); // 🔥 обновляем число
      }
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        subscriber_id: user.id,
        channel_id: channelId
      });

      if (!error) {
        setIsSubscribed(true);
        onSubscriptionChange(); // 🔥 обновляем число
      }
    }
  };

  return (
    <div style={{ marginTop: 15 }}>
      <h2>{video.title}</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer"
          }}
          onClick={() => navigate(`/channel/${channelId}`)}
        >
          <img
            src={video.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${video.profiles?.username}`}
            alt="avatar"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover"
            }}
          />

          <div>
            <div style={{ fontWeight: 600 }}>
              {video.profiles?.username}
            </div>

            <div style={{ fontSize: 14, color: "#aaa" }}>
              {subscribersCount} подписчиков
            </div>
          </div>
        </div>

        {user && user.id !== channelId && (
          <button
            onClick={toggleSubscription}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              backgroundColor: isSubscribed ? "#444" : "#ff0000",
              color: "white",
              fontWeight: 600
            }}
          >
            {isSubscribed ? "Вы подписаны" : "Подписаться"}
          </button>
        )}
      </div>
    </div>
  );
}