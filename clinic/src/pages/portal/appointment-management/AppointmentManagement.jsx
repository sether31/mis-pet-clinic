import React from 'react'
import Header from '../../../components/Header'

export default function AppointmentManagement() {
  return (
    <div className='bg-(--clr-bg-page) min-h-screen'>
      <Header />
      <section className='my-6 container-xl'>
        <h1 className='mt-5 text-5xl italic font-bold text-center text-blue-500'>Appointment Management</h1>
      </section>
    </div>
  )
}