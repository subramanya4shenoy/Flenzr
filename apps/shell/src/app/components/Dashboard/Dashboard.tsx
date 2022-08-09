import React from 'react'
import { FeatureProfileBillboard } from '@flenzr/feature/profile-billboard'
import { SharedUiMenuBar } from '@flenzr/shared/ui-menu-bar'

const Dashboard = () => {
  return (
    <>
      {/* Profile banner - cover and picture*/}
      <FeatureProfileBillboard />

      {/* common menu bar */}
      <SharedUiMenuBar />
      
      {/* lazy loaded views */}
        {/* Feeds */}
        {/* About */}
        {/* comunity */}
        {/* Brands */}
        {/* connection */}
    </>
  )
}

export default Dashboard