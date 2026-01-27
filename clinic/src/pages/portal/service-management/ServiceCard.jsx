// components
import DashboardCard from '../../../components/DashboardCard';
// icons
import { 
  LuPackage, 
  LuStethoscope, 
  LuScissors, 
  LuUserCheck,
  LuUser
} from "react-icons/lu";

export default function ServiceCard({ data }) {
  const serviceStats = [
    {
      title: "Total Services",
      data: data?.total || "0",
      icon: LuPackage,
      iconColor: "text-gray-700"
    },
    {
      title: "Active Services", 
      data: data?.active || "0",
      icon: LuUserCheck,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Veterinary", 
      data: data?.vets || "0",
      icon: LuStethoscope,
      iconColor: "text-blue-600"
    },
    {
      title: "Grooming",
      data: data?.groomers || "0",
      icon: LuScissors,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Support Staff",
      data: data?.staff || "0",
      icon: LuUser,
      iconColor: "text-gray-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {serviceStats.map((stat, index) => (
        <DashboardCard key={index} {...stat} />
      ))}
    </div>
  );
}