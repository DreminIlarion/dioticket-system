import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Plus,
  ArrowRight,
  Building2,
  TrendingUp,
  Users,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { ticketsApi, counterpartiesApi } from '../api/client';
import type { TicketListItem, Counterparty } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  
  const isCustomer = user?.role === 'customer' || user?.role === 'customer_admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await ticketsApi.getMy(1, 100);
      setTickets(response.items);
      
      if (isCustomer && user?.counterparty_id) {
        const cp = await counterpartiesApi.getById(user.counterparty_id);
        setCounterparty(cp);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: tickets.length,
    new: tickets.filter(t => t.status === 'Новый').length,
    inProgress: tickets.filter(t => t.status === 'В работе' || t.status === 'Открыт').length,
    critical: tickets.filter(t => t.priority === 'Критический').length,
    resolved: tickets.filter(t => t.status === 'Решён' || t.status === 'Закрыт').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Новый': return 'bg-blue-500/20 text-blue-400';
      case 'Открыт': return 'bg-yellow-500/20 text-yellow-400';
      case 'В работе': return 'bg-purple-500/20 text-purple-400';
      case 'Ожидает ответа': return 'bg-orange-500/20 text-orange-400';
      case 'Решён': return 'bg-green-500/20 text-green-400';
      case 'Закрыт': return 'bg-neutral-500/20 text-neutral-400';
      default: return 'bg-neutral-500/20 text-neutral-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Критический': return 'bg-red-500/20 text-red-400';
      case 'Высокий': return 'bg-orange-500/20 text-orange-400';
      case 'Средний': return 'bg-yellow-500/20 text-yellow-400';
      case 'Низкий': return 'bg-green-500/20 text-green-400';
      default: return 'bg-neutral-500/20 text-neutral-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {user?.full_name || user?.username || 'Панель управления'}
          </h1>
          <p className="text-lg text-white/60">
            {isCustomer ? 'Ваши заявки и статистика' : 'Обзор системы поддержки'}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="btn-primary py-4 px-8 text-lg font-semibold"
        >
          <Plus className="w-6 h-6" />
          Создать заявку
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 md:p-8 group hover:border-red-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-red-400" />
            </div>
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stats.total}</p>
          <p className="text-lg text-white/60">Всего заявок</p>
        </div>

        <div className="glass-card p-6 md:p-8 group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-7 h-7 text-blue-400" />
            </div>
            <span className="text-lg font-medium text-blue-400">+{stats.new}</span>
          </div>
          <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stats.inProgress}</p>
          <p className="text-lg text-white/60">В работе</p>
        </div>

        <div className="glass-card p-6 md:p-8 group hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-orange-400" />
            </div>
          </div>
          <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stats.critical}</p>
          <p className="text-lg text-white/60">Критических</p>
        </div>

        <div className="glass-card p-6 md:p-8 group hover:border-green-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
          </div>
          <p className="text-4xl md:text-5xl font-bold text-white mb-2">{stats.resolved}</p>
          <p className="text-lg text-white/60">Решено</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
        {/* Recent Tickets */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Последние заявки</h2>
              <Link to="/tickets" className="text-red-400 hover:text-red-300 flex items-center gap-2 text-lg font-medium">
                Все заявки
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            
            {tickets.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-xl text-white/60 mb-2">Нет заявок</p>
                <p className="text-white/40 mb-6">Создайте первую заявку для начала работы</p>
                <button
                  onClick={() => navigate('/tickets/new')}
                  className="btn-primary py-3 px-6"
                >
                  <Plus className="w-5 h-5" />
                  Создать заявку
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tickets.slice(0, 5).map(ticket => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.number}`}
                    className="block p-6 md:p-8 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-3 truncate">
                          {ticket.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-base font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          <span className={`px-3 py-1.5 rounded-lg text-base font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <time className="text-base text-white/40">
                        {new Date(ticket.created_at).toLocaleDateString('ru-RU')}
                      </time>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Company Card for Customers */}
          {isCustomer && counterparty && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{counterparty.name}</h3>
                  <p className="text-base text-white/50">{counterparty.counterparty_type}</p>
                </div>
              </div>
              <div className="space-y-3 text-base">
                <div className="flex justify-between">
                  <span className="text-white/50">ИНН</span>
                  <span className="text-white font-medium">{counterparty.inn}</span>
                </div>
                {counterparty.contact_person && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Контакт</span>
                    <span className="text-white font-medium">{counterparty.contact_person.full_name}</span>
                  </div>
                )}
              </div>
              <Link
                to="/my-company"
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-base font-medium"
              >
                Подробнее
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6">Быстрые действия</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/tickets/new')}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-800/20 hover:bg-red-800/30 text-white transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-red-800/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-semibold">Новая заявка</p>
                  <p className="text-base text-white/50">Создать обращение</p>
                </div>
              </button>
              
              <Link
                to="/tickets"
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white/70" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-semibold">Мои заявки</p>
                  <p className="text-base text-white/50">Просмотреть все</p>
                </div>
              </Link>

              {!isCustomer && (
                <Link
                  to="/counterparties"
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-semibold">Контрагенты</p>
                    <p className="text-base text-white/50">Управление</p>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Status Overview */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6">По статусам</h3>
            <div className="space-y-4">
              {[
                { label: 'Новые', value: stats.new, color: 'bg-blue-500' },
                { label: 'В работе', value: stats.inProgress, color: 'bg-purple-500' },
                { label: 'Решённые', value: stats.resolved, color: 'bg-green-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-2">
                    <span className="text-base text-white/70">{item.label}</span>
                    <span className="text-base font-semibold text-white">{item.value}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${stats.total ? (item.value / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
