import { Home, Compass, PlaySquare, ThumbsUp, History, ListVideo, Upload, LogOut, User as UserIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../shared/lib/supabase";
import Avatar from "../../shared/ui/Avatar/Avatar";
import './SideBarStyle.css';

type Subscription = {
    channel_id: string | null;
    profiles: { username: string | null; avatar_url: string | null } | null;
};

function NavItem({ to, active, icon, label, className = "" }: {
    to: string;
    active?: boolean;
    icon: ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <Link
            to={to}
            className={`nav-item ${active ? "active" : ""} ${className}`}
            aria-current={active ? "page" : undefined}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}

export default function SideBar({
    isExpanded,
}: {
    isExpanded: boolean,
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const userId = user?.id;
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

    const isActive = (path: string) => location.pathname === path;
    const isWatchPage = location.pathname.startsWith('/video');
    const myChannel = `/channel/${userId}`;

    // Подписки нужны только в развёрнутом меню — обновляем при каждом раскрытии,
    // чтобы новая подписка сразу появилась в списке
    useEffect(() => {
        if (!userId || !isExpanded) return;
        let isCancelled = false;

        supabase
            .from('subscriptions')
            .select('channel_id, profiles:profiles!subscriptions_channel_id_fkey(username, avatar_url)')
            .eq('subscriber_id', userId)
            .then(({ data, error }) => {
                if (!error && !isCancelled) setSubscriptions(data ?? []);
            });

        return () => {
            isCancelled = true;
        };
    }, [userId, isExpanded]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <aside
            className={`side-bar
            ${isExpanded ? 'expanded' : 'collapsed'}
            ${isWatchPage ? 'overlay-mode' : 'standard-mode'}`}
            aria-label="Основное меню"
        >

            {/* Блок профиля для мобильных устройств (скрыт на ПК через CSS) */}
            {isExpanded && (
                <div className="mobile-profile-section">
                    <Link to={myChannel} className="mobile-profile-header">
                        <Avatar src={profile?.avatar_url} name={profile?.username} className="mobile-avatar" />
                        <span className="mobile-username">{profile?.username || 'Профиль'}</span>
                    </Link>
                    <nav className="sidebar-nav">
                        <NavItem to="/upload" icon={<Upload size={22} />} label="Загрузить видео" />
                        <NavItem to={myChannel} icon={<UserIcon size={22} />} label="Мой канал" />
                        <button type="button" className="nav-item logout-mobile" onClick={handleLogout}>
                            <LogOut size={22} />
                            <span>Выйти</span>
                        </button>
                    </nav>
                    <div className="sidebar-divider" />
                </div>
            )}

            <nav className="sidebar-nav">
                <NavItem to="/" active={isActive("/")} icon={<Home size={22} />} label="Главная" />
                <NavItem to={myChannel} icon={<Compass size={22} />} label="Vibes" />
                <NavItem to={myChannel} icon={<PlaySquare size={22} />} label="Подписки" />
            </nav>

            {isExpanded && (
                <>
                    <div className="sidebar-divider" />

                    <nav className="sidebar-nav">
                        <div className="section-title">Вы &gt;</div>
                        <NavItem to={myChannel} icon={<History size={22} />} label="История" />
                        <NavItem to={myChannel} icon={<ListVideo size={22} />} label="Плейлисты" />
                        <NavItem to={myChannel} icon={<ThumbsUp size={22} />} label="Понравившиеся" />
                    </nav>

                    <div className="sidebar-divider" />

                    <nav className="sidebar-nav subs-list" aria-label="Подписки">
                        <div className="section-title">Подписки</div>
                        {subscriptions.map((sub) => (
                            <Link
                                key={sub.channel_id}
                                to={`/channel/${sub.channel_id}`}
                                className={`nav-item ${isActive(`/channel/${sub.channel_id}`) ? "active" : ""}`}
                            >
                                <Avatar src={sub.profiles?.avatar_url} name={sub.profiles?.username} className="sub-avatar" />
                                <span className="sub-name">{sub.profiles?.username}</span>
                            </Link>
                        ))}
                    </nav>
                </>
            )}
        </aside>
    );
}
