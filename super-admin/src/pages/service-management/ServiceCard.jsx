// components
import DashboardCard from '../../components/DashboardCard';
// icons
import { LuPackage } from 'react-icons/lu';
import { HiOutlineBadgeCheck } from 'react-icons/hi';
import { HiOutlineArchiveBoxXMark } from 'react-icons/hi2';

export default function ServiceCard({ data }) {
  const serviceStats = [
    {
      title: "Total Service",
      data: data?.total || "0",
      icon: LuPackage,
      iconColor: "text-gray-700"
    },
    {
      title: "Active Service", 
      data: data?.active || "0",
      icon: HiOutlineBadgeCheck,
      iconColor: "text-green-600"
    },
    {
      title: "Inactive Service", 
      data: data?.inactive || "0",
      icon: HiOutlineArchiveBoxXMark,
      iconColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {serviceStats.map((stat, index) => (
        <DashboardCard key={index} {...stat} />
      ))}
    </div>
  );
}