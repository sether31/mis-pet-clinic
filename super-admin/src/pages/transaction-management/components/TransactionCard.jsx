// components
import DashboardCard from '../../../components/DashboardCard';
// icons
import { LuWallet } from "react-icons/lu";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { FiMinusCircle } from "react-icons/fi";
import { TbAlertTriangle } from "react-icons/tb";

export default function TransactionCard({ summary, data = [] }) {
  const active = summary?.totalActive || 0;
  const expired = summary?.totalExpired || 0;
  const totalBranches = data.length || 0;
  const unsubscribed = totalBranches - (active + expired);

  const stats = [
    {
      title: "Total Billings",
      data: `₱${summary?.totalRevenue?.toLocaleString() || "0"}`,
      icon: LuWallet,
      iconColor: "text-(--clr-text-primary)"
    },
    {
      title: "Active",
      data: active,
      icon: RiMoneyDollarCircleLine, 
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Expired",
      data: expired,
      icon: TbAlertTriangle, 
      iconColor: "text-amber-500" 
    },
    {
      title: "Unsubscribed", 
      data: unsubscribed,
      icon: FiMinusCircle, 
      iconColor: "text-gray-400"
    },
    {
      title: "Total Branches", 
      data: totalBranches,
      icon: HiOutlineBuildingOffice2,
      iconColor: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => (
        <DashboardCard
          key={index}
          title={stat.title}
          data={stat.data}
          icon={stat.icon}
          iconColor={stat.iconColor}
        />
      ))}
    </div>
  );
}