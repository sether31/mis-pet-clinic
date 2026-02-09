// components
import DashboardCard from '../../../../components/DashboardCard';
// icons
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { MdOutlineTimerOff } from "react-icons/md";
import { TbAlertTriangle } from "react-icons/tb";
import { BsBoxSeam } from "react-icons/bs";
import { LuTrendingDown } from "react-icons/lu";

export default function InventoryCard({ data }) {
  const inventoryStats = [
    {
      title: "Total Inventory",
      data: data?.total_items || "0",
      icon: BsBoxSeam,
      iconColor: "text-(--clr-text-primary)"
    },
    {
      title: "Active Products", 
      data: data?.active_products || "0",
      icon: BsBoxSeam,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Low Stock Alert", 
      data: data?.low_stock || "0",
      icon: LuTrendingDown,
      iconColor: "text-yellow-400"
    },
    {
      title: "Out of Stock", 
      data: data?.out_of_stock || "0",
      icon: TbAlertTriangle,
      iconColor: "text-red-600"
    },
    {
      title: "Expiring Soon",
      data: data?.expiring_soon || "0",
      icon: MdOutlineTimerOff,
      iconColor: "text-blue-600"
    },
    {
      title: "Expired Products",
      data: data?.expired_items || "0",
      icon: BsBoxSeam,
      iconColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {inventoryStats.map((stat, index) => (
        <DashboardCard
          key={index}
          {...stat}
        />
      ))}
    </div>
  );
}