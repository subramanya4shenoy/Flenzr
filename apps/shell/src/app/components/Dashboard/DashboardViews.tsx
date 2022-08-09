import React from 'react'
import { FeatureProfileAbout } from '@flenzr/feature/profile-about'
import { FeatureProfileFeeds } from '@flenzr/feature/profile-feeds'
import { FeatureProfileCommunity } from '@flenzr/feature/profile-community'
import { FeatureProfileBrands } from '@flenzr/feature/profile-brands'
import { FeatureProfileConnections } from '@flenzr/feature/profile-connections'

const DashboardViews = () => {
  return (
    <div>DashboardViews
        {/* Feeds */}
        <FeatureProfileFeeds/>

        {/* About */}
        <FeatureProfileAbout/>

        {/* comunity */}
        <FeatureProfileCommunity/>

        {/* Brands */}
        <FeatureProfileBrands/>

        {/* connection */}
        <FeatureProfileConnections/>

    </div>
    
  )
}

export default DashboardViews