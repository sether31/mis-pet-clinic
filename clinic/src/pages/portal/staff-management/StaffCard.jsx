// components
import DashboardCard from '../../../components/DashboardCard';
// icons
import { LuUsers, LuUserCheck, LuStethoscope, LuScissors } from "react-icons/lu";
import { HiOutlineUserGroup } from "react-icons/hi";
import { GrUserAdmin } from "react-icons/gr";

export default function StaffCard({ data }) {
const staffData = [
    {
      title: "Total Staff",
      data: data?.total || "0",
      icon: HiOutlineUserGroup,
      iconColor: "text-gray-700"
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
      icon: LuUserCheck,
      iconColor: "text-blue-500"
    },
    {
      title: "Branch manager", 
      data: data?.branch_admin || "0",
      icon: GrUserAdmin,
      iconColor: "text-indigo-700"
    },
    {
      title: "Veterinarians",
      data: data?.vets || "0",
      icon: LuStethoscope,
      iconColor: "text-blue-600"
    },
    {
      title: "Groomers",
      data: data?.groomers || "0",
      icon: LuScissors,
      iconColor: "text-(--clr-text-header)"
    },
    {
      title: "Support Staff",
      data: data?.staff || "0",
      icon: LuUsers,
      iconColor: "text-gray-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {staffData.map((stat, index) => (
        <DashboardCard
          key={index}
          {...stat}
        />
      ))}
    </div>
  );
}