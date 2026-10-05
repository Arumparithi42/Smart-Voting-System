import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import PageHeader from '../../components/ui/PageHeader';

// Admin: appoint / remove Election Officers. Admin accounts can't be
// created or changed here (enforced by the backend too).
export default function AdminUsers() {
  const [loadState, setLoadState] = useState('loading');
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/admin/users');
      setUsers(res.data);
      setLoadState('ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load users');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRole = async (user, role) => {
    try {
      const res = await axiosInstance.put(`/api/admin/users/${user._id}/role`, { role });
      toast.success(res.data.message);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update role');
    }
  };

  const term = search.trim().toLowerCase();
  const visible = users.filter((u) =>
    !term || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(term)
  );

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Officers & Users" subtitle="Election Officers can propose elections and monitor them. Only Admins can create elections and publish results." />

        <input className="px-3 py-2 border rounded mb-4 w-full md:w-80" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />

        {loadState === 'loading' ? <LoadingState /> : loadState === 'error' ? <ErrorState message="Unable to load users." onRetry={load} /> : visible.length === 0 ? <EmptyState title="No users found." /> : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="p-3">{u.firstName} {u.lastName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role === 'officer' ? 'Election Officer' : u.role}</td>
                  <td className="p-3 text-right">
                    {u.role === 'user' && (
                      <button onClick={() => setRole(u, 'officer')} className="text-blue-600 hover:underline">Make Election Officer</button>
                    )}
                    {u.role === 'officer' && (
                      <button onClick={() => setRole(u, 'user')} className="text-red-600 hover:underline">Remove Officer Role</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
