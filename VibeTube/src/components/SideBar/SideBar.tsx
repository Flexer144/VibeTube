import { Home, Compass, PlaySquare, ThumbsUp, History, ListVideo } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import './SideBarStyle.css';

export default function SideBar({ 
    isExpanded, 
    setExpanded 
}: { 
    isExpanded: boolean, 
    setExpanded: (val: boolean) => void 
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    const isActive = (path: string) => location.pathname === path ? "active" : "";
    
    const isWatchPage = location.pathname.startsWith('/video');
    useEffect(() => {
        if (isWatchPage && isExpanded) {
            setExpanded(false);
        } else if(!isWatchPage && !isExpanded){
            setExpanded(true)
        }
    }, [isWatchPage]); 

    useEffect(() => {
        if (user && isExpanded) {
            const fetchSubs = async () => {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('channel_id, profiles:channel_id(username, avatar_url)')
                    .eq('subscriber_id', user.id);
                
                if (!error && data) {
                    setSubscriptions(data);
                }
            };
            fetchSubs();
        }
    }, [user, isExpanded]);

    return (
        <aside className={`side-bar 
            ${isExpanded ? 'expanded' : 'collapsed'} 
            ${isWatchPage ? 'overlay-mode' : 'standard-mode'}` 
        }>
            
            <nav className="sidebar-nav">
                <div className={`nav-item ${isActive("/")}`} onClick={() => navigate("/")}>
                    <Home size={22} />
                    <span>Главная</span>
                </div>
                <div className={`nav-item ${isActive("/shorts")}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                    <Compass size={22} />
                    <span>Vibes</span>
                </div>
                <div className={`nav-item ${isActive(`/channel`)}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                    <PlaySquare size={22} />
                    <span>Подписки</span>
                </div>
            </nav>

            {isExpanded && (
                <>
                    <div className="sidebar-divider" />
                    
                    <nav className="sidebar-nav">
                        <div className="section-title">Вы &gt;</div>
                        <div className={`nav-item ${isActive("/history")}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                            <History size={22} />
                            <span>История</span>
                        </div>
                        <div className={`nav-item ${isActive("/playlists")}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                            <ListVideo size={22} />
                            <span>Плейлисты</span>
                        </div>
                        <div className={`nav-item ${isActive(`/channel`)}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                            <ThumbsUp size={22} />
                            <span>Понравившиеся</span>
                        </div>
                    </nav>

                    <div className="sidebar-divider" />

                    <nav className="sidebar-nav subs-list">
                        <div className="section-title">Подписки</div>
                        {subscriptions.map((sub: any) => (
                            <div 
                                key={sub.channel_id} 
                                className={`nav-item ${isActive(`/channel/${sub.channel_id}`)}`} 
                                onClick={() => navigate(`/channel/${sub.channel_id}`)}
                            >
                                <img 
                                    src={sub.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${sub.profiles?.username}`} 
                                    className="sub-avatar" 
                                    alt="avatar"
                                />
                                <span className="sub-name">{sub.profiles?.username}</span>
                            </div>
                        ))}
                    </nav>
                </>
            )}
        </aside>
    );
}