import { useState, useMemo, useEffect } from 'react';
import {  HiSearch, HiPencilAlt, HiPlus, HiArchive,  HiRefresh } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function StaffTable({ data = [], onEdit, onToggleStatus, onCreate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10); 

  const filtered = useMemo(() => {
    let result = data
      .filter(s => {
        if(activeTab === "all") return true;
        const status = Number(s.status);
        return activeTab === "active" ? status === 1 : status === 0;
      })
      .filter(s => 
        !search || 
        s.fname?.toLowerCase().includes(search.toLowerCase()) || 
        s.lname?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.role_name?.toLowerCase().includes(search.toLowerCase())
      );
    return result; 
  }, [data, activeTab, search]);

  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filtered.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage]);

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 shadow-sm rounded-xl">
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 lg:flex-row">
        
        {/* tabs */}
        <div className="flex justify-center p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[
            {id:"all", label:"All"}, 
            {id:"active", label:"Active"}, 
            {id:"inactive", label:"Inactive"}
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-6 py-2 text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${
                activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer">
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search staff..." className="w-64 py-2 pl-10 pr-4 text-sm transition-all border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring focus:ring-(--clr-primary)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <button onClick={onCreate} className="px-6 py-2 bg-(--clr-primary) text-(--clr-text-secondary) text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all cursor-pointer">
            <HiPlus/> Add Staff
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          {/* table head */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th className="w-[20%] px-6 py-4 border-r border-gray-300">Staff Name</th>
              <th className="w-[15%] px-6 py-4 border-r border-gray-300">Role</th>
              <th className="w-[27%] px-6 py-4 border-r border-gray-300">Permissions</th>
              <th className="w-[18%] px-6 py-4 border-r border-gray-300">Email</th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[10%] px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          {/* table body */}
          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(staff => (
              <tr key={staff.user_id} className="hover:bg-gray-200/50 even:bg-gray-200/50">
                {/* staff name */}
                <td className="px-6 py-4 font-bold text-gray-800 capitalize border-r border-gray-300">
                  {staff.fname} {staff.lname}
                </td>
                
                {/* staff role */}
                <td className="px-6 py-4 border-r border-gray-300">
                 <span className={`px-2 py-1 text-[9px] font-black rounded uppercase border ${
                    staff.role_name?.toLowerCase() === 'branch_admin' 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                      : staff.role_name?.toLowerCase() === 'veterinarian'
                      ?  'bg-blue-50 text-blue-600 border-blue-100'
                      : staff.role_name?.toLowerCase() === 'groomer'
                      ? 'bg-green-50 text-(--clr-primary) border-green-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {
                      staff.role_name === 'branch_admin' 
                      ? 'Branch Manager'
                      : staff.role_name === 'support_staff' 
                      ? 'Support Staff'
                      : (staff.role_name || 'error')
                    } 
                  </span>
                </td>

                {/* permission */}
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex flex-wrap gap-1">
                    {staff.permissions && staff.permissions.length > 0 ? (
                      staff.permissions.map((perm, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-[8px] font-bold text-gray-500 rounded uppercase">
                          {perm.replace('_', ' ')}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] italic text-gray-400">No permissions</span>
                    )}
                  </div>
                </td>

                {/* email */}
                <td className="px-6 py-4 text-sm text-gray-500 truncate border-r border-gray-300">
                  {staff.email}
                </td>
                <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                  <span className={`px-2 py-1 rounded border ${Number(staff.status) === 1 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {Number(staff.status) === 1 ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* action */}
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(staff)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-black"><HiPencilAlt size={16}/></button>
                    <button onClick={() => onToggleStatus(staff)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-red-600">
                      {Number(staff.status) === 1 ? <HiArchive size={16}/> : <HiRefresh size={16}/>}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="py-24 text-xs font-bold text-center text-gray-400 uppercase">No staff members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* table footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filtered.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}