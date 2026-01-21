import { useState } from 'react';
// components
import Header from '../../../components/Header'
// icons
import { RiGlobalLine, RiShieldKeyholeLine } from 'react-icons/ri';
// sub components
import GeneralSettings from './GeneralSettings';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const tabs = [
    { id: 'general', label: 'General', icon: <RiGlobalLine color='text-(--clr-primary)' size={20} /> },
    { id: 'security', label: 'Security', icon: <RiShieldKeyholeLine color='text-(--clr-primary)' size={20} /> },
  ]

  return (
    <div className='bg-(--clr-bg-page) min-[200vh]'>
      <Header />
      
      <section className='my-6 container-xl'>
        {/* header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-gray-500">Manage platform configurations.</p>
        </div>

         {/* tabs */}
        <div className="flex p-1 mb-8 border border-gray-300 rounded-2xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-(--clr-primary) text-(--clr-text-secondary)'
                  : 'text-gray-500 hover:text-(--clr-text-primary)'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden border border-gray-300 rounded-lg">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'security' && 'idk'}
        </div>
      </section>
    </div>
  )
}