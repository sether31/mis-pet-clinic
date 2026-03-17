// components
import DashboardCard from '../../../../components/DashboardCard';
// icons
import { BsCalendarPlus, BsCalendarEvent } from "react-icons/bs";
import { TbAlertTriangle, TbStethoscopeOff } from "react-icons/tb"; 
import { LuClipboard, LuStethoscope } from 'react-icons/lu';

export default function MedicalRecordCard({ data }) {
  const recordStats = [
    {
      title: "Total Records",
      data: data?.total || "0",
      icon: LuClipboard,
      iconColor: "text-(--clr-text-primary)"
    },
    {
      title: "Unrecorded", 
      data: data?.unrecorded || "0",
      icon: TbAlertTriangle,
      iconColor: "text-amber-600" 
    },
    {
      title: "Medical Records", 
      data: data?.medical || "0",
      icon: LuStethoscope,
      iconColor: "text-blue-600"
    },
    {
      title: "Non-Medical Records", 
      data: data?.nonMedical || "0",
      icon: TbStethoscopeOff,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Added This Month", 
      data: data?.thisMonth || "0",
      icon: BsCalendarPlus,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Added Today", 
      data: data?.addedToday || "0",
      icon: BsCalendarEvent,
      iconColor: "text-amber-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      {recordStats.map((stat, index) => (
        <DashboardCard
          key={index}
          {...stat}
        />
      ))}
    </div>
  );
}