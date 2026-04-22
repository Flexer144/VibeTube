import ContentLoader from "react-content-loader"

const ListSkeleton = () => (
  <div className="profile-video-grid">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} style={{ width: '100%' }}>
        <ContentLoader 
          speed={2}
          width="100%" 
          height="auto" 
          viewBox="0 0 340 250" 
          backgroundColor="#404040"
          foregroundColor="#9e9e9e"
        >
          <rect x="0" y="0" rx="12" ry="12" width="340" height="180" /> 
          <circle cx="25" cy="210" r="20" /> 
          <rect x="55" y="200" rx="4" ry="4" width="240" height="12" /> 
          <rect x="55" y="220" rx="4" ry="4" width="160" height="10" /> 
        </ContentLoader>
      </div>
    ))}
  </div>
)

const ProfileSkeleton = () => (
  <div className="profile-container">
    <div className="profile-banner-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0 40px' }}>
        <ContentLoader 
          speed={2}
          width={500}
          height={150}
          viewBox="0 0 500 150"
          backgroundColor="#404040"
          foregroundColor="#9e9e9e"
        >
          <circle cx="64" cy="75" r="64" /> 
          <rect x="145" y="55" rx="5" ry="5" width="250" height="25" /> 
          <rect x="145" y="90" rx="5" ry="5" width="150" height="15" /> 
        </ContentLoader>
    </div>

    <div className="profile-content-body">
      <h2 className="section-title-profile">Загрузка видео...</h2>
      <ListSkeleton />
    </div>
  </div>
)

export default ProfileSkeleton