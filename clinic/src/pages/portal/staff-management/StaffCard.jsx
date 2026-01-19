import DashboardCard from '../../../components/DashboardCard';
import { LuUsers, LuUserCheck, LuStethoscope, LuScissors, LuClock } from "react-icons/lu";
import { HiOutlineUserGroup } from "react-icons/hi";

export default function StaffCard({ data }) {
const staffData = [
    {
      title: "Total Staff",
      data: data?.total || "0",
      icon: HiOutlineUserGroup,
      iconColor: "text-gray-900"
    },
    {
      title: "Active Members", 
      data: data?.active || "0",
      icon: LuUserCheck,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "On Duty Today", 
      data: data?.onDuty || "0",
      icon: LuClock,
      iconColor: "text-blue-500"
    },
    {
      title: "Veterinarians",
      data: data?.vets || "0",
      icon: LuStethoscope,
      iconColor: "text-blue-500"
    },
    {
      title: "Groomers",
      data: data?.groomers || "0",
      icon: LuScissors,
      iconColor: "text-gray-900"
    },
    {
      title: "Support Staff",
      data: data?.staff || "0",
      icon: LuUsers,
      iconColor: "text-gray-900"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {staffData.map((stat, index) => (
        <DashboardCard
          key={index}
          {...stat}
        />
      ))}
    </div>
  );
}