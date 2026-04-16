// components/AssignExecutorModal.tsx
import { useState, useEffect } from 'react';
import { X, Search, Loader2, User, CheckCircle2, Users } from 'lucide-react';
import { usersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Employee } from '../types';

interface AssignExecutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string) => Promise<void>;
  currentAssigneeId?: string | null;
  ticketId: string;
}

export default function AssignExecutorModal({
  isOpen,
  onClose,
  onAssign,
  currentAssigneeId,
  ticketId,
}: AssignExecutorModalProps) {
  const { user } = useAuthStore();
  const [executors, setExecutors] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentAssigneeId || null);

  // Загрузка списка исполнителей (пользователи с ролью executor и support_agent)
  useEffect(() => {
    if (isOpen) {
      loadExecutors();
    }
  }, [isOpen]);

  const loadExecutors = async () => {
    setLoading(true);
    try {
      // TODO: заменить на реальный API для получения списка исполнителей
      // const response = await usersApi.getExecutors();
      // setExecutors(response.items);
      
      // Временная заглушка
      setExecutors([]);
    } catch (error) {
      console.error('Failed to load executors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) return;
    
    setAssigning(true);
    try {
      await onAssign(selectedUserId);
      onClose();
    } catch (error) {
      console.error('Failed to assign:', error);
    } finally {
      setAssigning(false);
    }
  };

  const filteredExecutors = executors.filter(exec => 
    exec.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    exec.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0c0c0c] rounded-2xl border border-white/20 w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Назначить исполнителя</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Поиск */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="input-field pl-12 py-3 w-full"
            />
          </div>

          {/* Список исполнителей */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
            </div>
          ) : filteredExecutors.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет доступных исполнителей</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {/* Кнопка "Снять назначение" */}
              {currentAssigneeId && (
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors border border-red-500/30 mb-3"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-red-400 font-medium">Снять назначение</p>
                    <p className="text-white/40 text-sm">Убрать текущего исполнителя</p>
                  </div>
                  {selectedUserId === null && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </button>
              )}
              
              {filteredExecutors.map((executor) => {
                const isSelected = selectedUserId === executor.user_id;
                return (
                  <button
                    key={executor.user_id}
                    onClick={() => setSelectedUserId(executor.user_id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{executor.full_name}</p>
                      <p className="text-white/40 text-sm">{executor.email}</p>
                      <p className="text-white/30 text-xs mt-1">
                        {executor.role === 'executor' ? 'Исполнитель' : 'Агент поддержки'}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
          >
            Отмена
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            className="flex-1 btn-primary"
          >
            {assigning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Назначить'}
          </button>
        </div>
      </div>
    </div>
  );
}