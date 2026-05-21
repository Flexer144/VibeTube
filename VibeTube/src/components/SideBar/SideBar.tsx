import { Home, Compass, PlaySquare, ThumbsUp, History, ListVideo, Upload, LogOut, User as UserIcon } from "lucide-react";
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
    const [profile, setProfile] = useState<any>(null); // Для мобильного меню

    const isActive = (path: string) => location.pathname === path ? "active" : "";
    const isWatchPage = location.pathname.startsWith('/video');
    
    useEffect(() => {
        if (isWatchPage && isExpanded) {
            setExpanded(false);
        } else if(!isWatchPage && !isExpanded && window.innerWidth > 500){
            // Не открываем меню автоматически на мобилках
            setExpanded(true)
        }
    }, [isWatchPage]); 

    useEffect(() => {
        if (user) {
            // Подгружаем подписки
            if (isExpanded) {
                const fetchSubs = async () => {
                    const { data, error } = await supabase
                        .from('subscriptions')
                        .select('channel_id, profiles:channel_id(username, avatar_url)')
                        .eq('subscriber_id', user.id);
                    if (!error && data) setSubscriptions(data);
                };
                fetchSubs();
            }
            // Подгружаем профиль для мобильной версии меню
            supabase.from("profiles").select("*").eq("id", user.id).single()
                .then(({ data }) => setProfile(data));
        }
    }, [user, isExpanded]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <aside className={`side-bar 
            ${isExpanded ? 'expanded' : 'collapsed'} 
            ${isWatchPage ? 'overlay-mode' : 'standard-mode'}` 
        }>
            
            {/* Блок профиля для мобильных устройств (скрыт на ПК через CSS) */}
            {isExpanded && (
                <div className="mobile-profile-section">
                    <div className="mobile-profile-header" onClick={() => navigate(`/channel/${user?.id}`)}>
                        <img 
                            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}`} 
                            className="mobile-avatar" 
                            alt="avatar" 
                        />
                        <span className="mobile-username">{profile?.username || 'Профиль'}</span>
                    </div>
                    <nav className="sidebar-nav">
                        <div className="nav-item" onClick={() => navigate("/upload")}>
                            <Upload size={22} />
                            <span>Загрузить видео</span>
                        </div>
                        <div className="nav-item" onClick={() => navigate(`/channel/${user?.id}`)}>
                            <UserIcon size={22} />
                            <span>Мой канал</span>
                        </div>
                        <div className="nav-item logout-mobile" onClick={handleLogout}>
                            <LogOut size={22} />
                            <span>Выйти</span>
                        </div>
                    </nav>
                    <div className="sidebar-divider" />
                </div>
            )}

            <nav className="sidebar-nav">
                <div className={`nav-item ${isActive("/")}`} onClick={() => navigate("/")}>
                    <Home size={22} />
                    <span>Главная</span>
                </div>
                <div className={`nav-item ${isActive("/shorts")}`} onClick={() => navigate(`/channel/${user?.id}`)}>
                    <Compass size={22} />
                    <span>Vibes</span>
                </div>
                <div className={`nav-item ${isActive(`/subscriptions`)}`} onClick={() => navigate(`/channel/${user?.id}`)}>
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
                        <div className={`nav-item ${isActive(`/liked`)}`} onClick={() => navigate(`/channel/${user?.id}`)}>
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