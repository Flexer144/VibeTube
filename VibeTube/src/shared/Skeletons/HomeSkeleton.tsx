import React from "react"
import ContentLoader from "react-content-loader"

const HomeSkeleton = (props: any) => (
  <ContentLoader 
    speed={2}
    width="100%" 
    height="auto"
    viewBox="0 0 540 437"
    backgroundColor="#474747"
    foregroundColor="#9e9e9e" 
    {...props}
  >
    <rect x="5" y="4" rx="18" ry="18" width="533" height="303" /> 
    <circle cx="28" cy="336" r="21" /> 
    <rect x="58" y="318" rx="9" ry="9" width="412" height="18" /> 
    <rect x="277" y="329" rx="0" ry="0" width="14" height="0" /> 
    <rect x="59" y="347" rx="6" ry="6" width="97" height="10" /> 
    <rect x="60" y="368" rx="6" ry="6" width="97" height="10" /> 
    <circle cx="164" cy="373" r="3" /> 
    <rect x="174" y="368" rx="6" ry="6" width="97" height="10" /> 
    <rect x="59" y="388" rx="5" ry="5" width="67" height="22" /> 
    <rect x="132" y="388" rx="5" ry="5" width="119" height="22" />
  </ContentLoader>
)

export default HomeSkeleton