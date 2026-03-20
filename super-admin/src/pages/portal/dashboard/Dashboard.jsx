import { useEffect, useState } from 'react'; // Added useEffect and useState
// hooks
import { useUser } from '../../../hooks/useUser';
// components
import Header from '../../../components/Header';
import DashboardCard from '../../../components/DashboardCard';
// icons
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { IoDocumentTextOutline } from "react-icons/io5";
import { FiUsers } from "react-icons/fi";
import { BsGraphUpArrow } from "react-icons/bs";
// utils (assuming you have an authFetch or similar)
import { authFetch } from '../../../utils/authFetch'; 

export default function Dashboard() {
  const { user } = useUser();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const runSubscriptionCheck = async () => {
      try {
        setIsChecking(true);
        await authFetch(`${import.meta.env.VITE_API_URL}/api/super-admin/notifications/check-all-expiring-subscriptions.php`);
        console.log("Subscription scan complete.");
      } catch (err) {
        console.error("Failed to run subscription check:", err);
      } finally {
        setIsChecking(false);
      }
    };

    if (user?.role === 'super_admin') {
      runSubscriptionCheck();
    }
  }, [user]);

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />
      
      <section className='my-6 container-xl'>
        {/* greet header */}
        <header className='mb-6'>
          <h1 className='text-2xl font-semibold'>
            Welcome Back, {user?.name}!
          </h1>
          <p className='text-sm capitalize opacity-70'>
            {user?.role?.replace('_', ' ')}
          </p>
        </header>

        {/* dashboard cards */}
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          <DashboardCard
            title='Total Clinics'
            data='124'
            icon={HiOutlineBuildingOffice2}
            className='border-2 border-gray-300'
          />

          <DashboardCard
            title='Pending Applications'
            data='21'
            icon={IoDocumentTextOutline}
            iconColor='text-(--clr-accent)'
          />
      
          <DashboardCard
            title='Total Users'
            data='1,247'
            icon={FiUsers}
            iconColor='text-blue-500'
          />
          
          <DashboardCard
            title='Platform Revenue'
            data='438k'
            icon={BsGraphUpArrow}
            iconColor='text-green-700'
          />
        </div>

        {/* recent activity */}
        <div className='grid grid-cols-1 gap-6 mt-6 lg:grid-cols-2'>
          <div className='border-2 border-gray-300 rounded-xl bg-(--clr-bg-card) p-4'>
            <h1 className='mb-6 text-lg font-medium'>Recent Activity</h1>

            <div>
              <div className='py-2 border-b border-gray-300 indent-2'>
                <h3 className='font-medium'>New clinic application received</h3>
                <p className='text-xs opacity-80'>Psalms Veterinary Clinic - 2 hours ago</p>
              </div>

              <div className='py-2 border-b border-gray-300 indent-2'>
                <h3 className='font-medium'>Clinic approved</h3>
                <p className='text-xs opacity-80'>Arevalos veterinary Clinic - 7 hours ago</p>
              </div>
              
              <div className='py-2 indent-2'>
                <h3 className='font-medium'>New clinic application received</h3>
                <p className='text-xs opacity-80'>Seth Pet Clinic - 1 hour ago</p>
              </div>
            </div>
          </div>

          {/* top performing clinics */}
          <div className='border-2 border-gray-300 rounded-xl bg-(--clr-bg-card) p-4'>
            <h1 className='mb-6 text-lg font-medium'>Top Performing Clinics</h1>

            <div>
              <div className='flex items-center gap-4 py-2 border-b border-gray-300 indent-2 space-between'>
                <div className='flex-1'>
                  <h3 className='font-medium'>Psalms Veterinary Clinic</h3>
                  <p className='text-xs opacity-80'>486 patients</p>
                </div>

                <div className='pr-2'>
                  <h3 className='text-lg font-medium text-green-700'>215k</h3>
                </div>
              </div>
            </div>

            <div>
              <div className='flex items-center gap-4 py-2 border-b border-gray-300 indent-2 space-between'>
                <div className='flex-1'>
                  <h3 className='font-medium'>Seth Pet Clinic</h3>
                  <p className='text-xs opacity-80'>302 patients</p>
                </div>

                <div className='pr-2'>
                  <h3 className='text-lg font-medium text-green-700'>161k</h3>
                </div>
              </div>
            </div>

            <div>
              <div className='flex items-center gap-4 py-2 border-b border-gray-300 indent-2 space-between'>
                <div className='flex-1'>
                  <h3 className='font-medium'>Fidel Veterinary Clinic</h3>
                  <p className='text-xs opacity-80'>100 patients</p>
                </div>

                <div className='pr-2'>
                  <h3 className='text-lg font-medium text-green-700'>100k</h3>
                </div>
              </div>
            </div>

            <div>
              <div className='flex items-center gap-4 py-2 indent-2 space-between'>
                <div className='flex-1'>
                  <h3 className='font-medium'>Arevalos Veterinary Clinic</h3>
                  <p className='text-xs opacity-80'>40 patients</p>
                </div>

                <div className='pr-2'>
                  <h3 className='text-lg font-medium text-green-700'>27k</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
