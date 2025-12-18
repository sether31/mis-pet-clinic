import React from 'react'
// hooks
import { useUser } from '../../hooks/useUser'

export default function Dashboard() {
  const { user } = useUser();

  return (
    <div>
      <h1>Dashboard HOME</h1>
      <h1 className="text-2xl font-bold">Welcome, {user?.fname} {user?.lname}</h1>
      <p>Your role: {user?.role}</p>
    </div>
  )
}
