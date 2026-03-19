import React from 'react'
// components
import Header from '../../components/Header'
import DashboardCard from '../../components/DashboardCard'
// icons
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'
import { IoDocumentTextOutline } from 'react-icons/io5'


export default function PlatformAnalytics() {
  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Report</h1>
            <p className="text-gray-500"></p>
          </div>
        </div>
      </section>
    </div>
  )
}
