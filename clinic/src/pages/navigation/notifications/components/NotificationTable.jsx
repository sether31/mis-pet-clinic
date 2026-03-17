// components
import LoaderV2 from '../../../../components/LoaderV2';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiOutlineEye } from 'react-icons/hi';
import { HiChevronUp, HiChevronDown } from 'react-icons/hi2';

export default function NotificationTable({
  isLoading,
  paginated,
  handleSort,
  sortConfig,
  getCategoryBadge,
  handleView,
  activeTab,
  search,
  setSearch
}) {
  
  // Moved the SortIcon logic directly into the table component
  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  return (
    <div className="overflow-x-auto min-h-[400px]">
      {isLoading ? (
        <div className="flex items-center justify-center h-64"><LoaderV2 /></div>
      ) : (
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('title')} className="w-[55%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Notification Details <SortIcon column="title" /></div>
              </th>
              <th onClick={() => handleSort('type')} className="w-[20%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 text-center">
                <div className="flex items-center justify-center gap-2">Category <SortIcon column="type" /></div>
              </th>
              <th onClick={() => handleSort('date')} className="w-[15%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 text-center">
                <div className="flex items-center justify-center gap-2">Date & Time <SortIcon column="date" /></div>
              </th>
              <th className="w-[10%] px-6 py-4 text-center font-bold uppercase tracking-widest text-gray-600">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(item => {
              const isUnread = !item.isRead;

              return (
                <tr key={item.id} className={`transition-colors hover:bg-gray-50/80 ${isUnread ? 'bg-blue-50/10' : ''}`}>
                  
                  {/* Details */}
                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 shrink-0 w-3 flex justify-center">
                        {isUnread && <div className="w-2 h-2 rounded-full bg-(--clr-primary) shadow-sm"></div>}
                      </div>
                      <div>
                        <p className={`text-sm leading-tight ${isUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                          {item.title}
                        </p>
                        <p className={`text-xs mt-1 line-clamp-1 ${isUnread ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                          {item.message}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    {getCategoryBadge(item.type)}
                  </td>

                  {/* Date */}
                  <td className={`px-6 py-4 text-center border-r border-gray-300 text-[11px] ${isUnread ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
                    {item.date}
                  </td>

                  {/* Action Btn */}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleView(item)} 
                      className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-95 text-gray-500"
                      title="View Message"
                    >
                      <HiOutlineEye size={18} />
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="4" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="mt-2 font-bold text-gray-800">
                      No {activeTab === 'all' ? 'notifications' : `${activeTab} notification`} found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search ? `We couldn't find any results for "${search}".` : "Your inbox is currently empty."}
                    </p>
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="mt-4 text-sm font-bold text-(--clr-primary) hover:underline cursor-pointer"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}