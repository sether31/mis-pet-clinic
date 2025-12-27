import React from 'react'
// components
import Header from '../../components/Header'
import DashboardCard from '../../components/DashboardCard'
// icons
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'
import { IoDocumentTextOutline } from 'react-icons/io5'


export default function PlatformAnalytics() {
  return (
    <div className='bg-(--clr-bg-page) min-h-screen'>
      <Header />
      
      <section className='my-6 container-xl'>
        {/* platform analytics cards */}
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          <DashboardCard
            title='Total Applications'
            data='124'
            icon={HiOutlineBuildingOffice2}
            className='border-2 border-gray-300'
          />
          
          <DashboardCard
            title='Pending Review'
            data='21'
            icon={IoDocumentTextOutline}
            iconColor='text-[var(--clr-accent)]'
          />

          <DashboardCard
            title='Approved'
            data='229'
            icon={IoDocumentTextOutline}
            iconColor='text-green-700'
          />

          <DashboardCard
            title='Rejected'
            data='548'
            icon={IoDocumentTextOutline}
            iconColor='text-red-500'
          />
        </div>

        <div className='pb-50'>
        </div>
      </section>
    </div>
  )
}
