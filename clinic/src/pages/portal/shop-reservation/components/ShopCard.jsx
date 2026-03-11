// components
import DashboardCard from '../../../../components/DashboardCard';
// icons
import { HiOutlineClock } from "react-icons/hi2";
import { TbShoppingBagCheck, TbShoppingCart, TbShoppingCartCancel, TbShoppingCartCopy, TbShoppingCartDollar, TbShoppingCartOff } from 'react-icons/tb';

export default function ShopCard({ data }) {
  const shopData = [
    {
      title: "New Requests",
      data: data?.pending || "0",
      icon: HiOutlineClock,
      iconColor: "text-amber-500"
    },
    {
      title: "Ready for Pickup", 
      data: data?.confirmed || "0",
      icon: TbShoppingCartDollar,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "Completed Orders", 
      data: data?.completed || "0",
      icon: TbShoppingBagCheck,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: "User Cancelled", 
      data: data?.cancelled || "0",
      icon: TbShoppingCartOff, 
      iconColor: "text-blue-600"
    },
    {
      title: "Clinic Rejected", 
      data: data?.rejected || "0",
      icon: TbShoppingCartCancel, 
      iconColor: "text-red-600"
    },
    {
      title: "Total Orders",
      data: data?.total || "0",
      icon: TbShoppingCart,
      iconColor: "text-gray-700"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {shopData.map((stat, index) => (
        <DashboardCard
          key={index}
          {...stat}
        />
      ))}
    </div>
  );
}