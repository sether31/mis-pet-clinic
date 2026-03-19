// components
import DashboardCard from '../../../../components/DashboardCard';
// icons
import { BsBoxSeam } from "react-icons/bs";

export default function ServiceCard({ data }) {
  const serviceStats = [
    {
      title: "Total Service",
      data: data?.total || "0",
      icon: BsBoxSeam,
      iconColor: "text-gray-700"
    },
    {
      title: "Active Service", 
      data: data?.active || "0",
      icon: BsBoxSeam,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Inactive Service", 
      data: data?.inactive || "0",
      icon: BsBoxSeam,
      iconColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      {serviceStats.map((stat, index) => (
        <DashboardCard key={index} {...stat} />
      ))}
    </div>
  );
}