import React from 'react'
// hooks
import { useUser } from '../../hooks/useUser'

export default function Dashboard() {
  const { user } = useUser();

  return (
    <div className='bg-[var(--clr-bg-page)] container-xl min-h-screen'>
      <h1>Dashboard</h1>
      <h1 className="text-2xl font-bold">Welcome, {user?.fname} {user?.lname}</h1>
      <p>Role: {user?.role}</p>
    </div>
  )
}
