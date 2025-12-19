import React from 'react'
// hooks
import { useUser } from '../../hooks/useUser'
// components
import Header from '../../components/Header';

export default function Dashboard() {
  const { user } = useUser();

  return (
    <div className='bg-[var(--clr-bg-page)] min-h-screen container-xl'>
      <Header />
      <h1 className="text-2xl font-bold">Welcome, {user?.fname} {user?.lname}</h1>
      <p>Role: {user?.role}</p>
    </div>
  )
}
