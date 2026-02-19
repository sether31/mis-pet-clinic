// components
import DashboardCard from '../../../../components/DashboardCard';
// icons
import { LuWallet, LuStethoscope } from "react-icons/lu";
import { RiMoneyDollarCircleLine } from "react-icons/ri";
import { PiWarning } from "react-icons/pi";
import { FiShoppingCart } from "react-icons/fi";

export default function TransactionCard({ summary }) {
  const stats = [
    {
      title: "Total Billings",
      data: `₱${summary?.total_billings?.toLocaleString() || "0"}`,
      icon: LuWallet,
      iconColor: "text-(--clr-text-primary)"
    },
    {
      title: "Paid",
      data: `₱${summary?.amount_collected?.toLocaleString() || "0"}`,
      icon: RiMoneyDollarCircleLine ,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Unpaid",
      data: `₱${summary?.amount_uncollected?.toLocaleString() || "0"}`,
      icon: PiWarning, 
      iconColor: "text-amber-500" 
    },
    {
      title: "Services", 
      data: summary?.total_appointments || "0",
      icon: LuStethoscope,
      iconColor: "text-blue-500"
    },
    {
      title: "Products", 
      data: summary?.total_retail || "0",
      icon: FiShoppingCart,
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