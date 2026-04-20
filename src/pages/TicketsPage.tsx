// pages/TicketsPage.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  XCircle,
  Hash,
  Building2,
  FolderOpen,
  User,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { ticketsApi, counterpartiesApi, projectsApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { TicketListItem, TicketStatus, TicketPriority, Counterparty, Project, CounterpartyCustomer } from '../types';

// Debounce хук для поиска
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Константы для статусов и приоритетов
const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'Новый', label: 'Новый' },
  { value: 'Открыт', label: 'Открыт' },
  { value: 'В работе', label: 'В работе' },
  { value: 'Ожидает ответа', label: 'Ожидает ответа' },
  { value: 'Решён', label: 'Решён' },
  { value: 'Закрыт', label: 'Закрыт' },
  { value: 'Переоткрыт', label: 'Переоткрыт' },
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'Низкий', label: 'Низкий' },
  { value: 'Средний', label: 'Средний' },
  { value: 'Высокий', label: 'Высокий' },
  { value: 'Критический', label: 'Критический' },
];

export default function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Состояние фильтров
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [counterpartyFilter, setCounterpartyFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [reporterFilter, setReporterFilter] = useState<string>('');
  
  // UI состояние
  const [showFilters, setShowFilters] = useState(false);
  
  // Данные для фильтров
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CounterpartyCustomer[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(search, 500);

  // Определяем роли
  const isCustomer = user?.role === 'customer';
  const isCustomerAdmin = user?.role === 'customer_admin';
  const isSupport = user?.role === 'support_agent' || user?.role === 'support_manager';
  const isAdmin = user?.role === 'admin';

  // Загрузка фильтров
  useEffect(() => {
    loadFilters();
  }, []);

  // Загрузка сотрудников компании для customer_admin, support, admin
  useEffect(() => {
    if ((isCustomerAdmin || isSupport || isAdmin) && user?.counterparty_id) {
      loadCompanyUsers();
    }
  }, [isCustomerAdmin, isSupport, isAdmin, user?.counterparty_id]);

  // Загрузка тикетов при изменении фильтров
  useEffect(() => {
    loadTickets();
  }, [page, statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter, debouncedSearch]);

  const loadFilters = async () => {
    setLoadingFilters(true);
    try {
      // Загружаем контрагентов (только для admin/support)
      if (isAdmin || isSupport) {
        const counterpartiesRes = await counterpartiesApi.getAll(1, 100);
        setCounterparties(counterpartiesRes.items);
      }
      
      // Загружаем проекты
      // Для customer используем projectsApi.getMyProjects()
      if (isCustomer) {
        const projectsRes = await projectsApi.getMyProjects('all', 1, 100);
        setProjects(projectsRes.items);
      } else {
        const projectsRes = await projectsApi.getAll(1, 100);
        setProjects(projectsRes.items);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadCompanyUsers = async () => {
    if (!user?.counterparty_id) return;
    try {
      const users = await ticketsApi.getCompanyUsers(user.counterparty_id);
      setCompanyUsers(users);
    } catch (error) {
      console.error('Failed to load company users:', error);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      let response;
      
      // Для customer — используем getAllWithFilters с автоматической подстановкой counterparty_id
      if (isCustomer && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          counterparty_id: user.counterparty_id,  // автоматически подставляем ID компании пользователя
          project_id: projectFilter || undefined,
          reporter_id: reporterFilter || undefined,
          search: debouncedSearch || undefined,
        });
      } 
      // Для customer_admin — заявки компании с фильтрацией по сотрудникам
      else if (isCustomerAdmin && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          counterparty_id: user.counterparty_id,
          project_id: projectFilter || undefined,
          reporter_id: reporterFilter || undefined,
          search: debouncedSearch || undefined,
        });
      }
      // Для support и admin — все заявки с полными фильтрами
      else if (isSupport || isAdmin) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          counterparty_id: counterpartyFilter || undefined,
          project_id: projectFilter || undefined,
          reporter_id: reporterFilter || undefined,
          search: debouncedSearch || undefined,
        });
      }
      else {
        // Fallback
        response = await ticketsApi.getAll(page, 10);
      }
      
      setTickets(response.items);
      setTotalPages(response.total_pages);
      setTotalItems(response.total_items);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCounterpartyFilter('');
    setProjectFilter('');
    setReporterFilter('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || priorityFilter || counterpartyFilter || projectFilter || reporterFilter || search;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Новый': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Открыт': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'В работе': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Ожидает ответа': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Решён': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Закрыт': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
      'Переоткрыт': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[status] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Критический': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Высокий': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Средний': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Низкий': 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return colors[priority] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const isClosed = (status: string) => {
    return status === 'Закрыт' || status === 'Решён';
  };

  const activeFiltersCount = [statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter].filter(Boolean).length;

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {isCustomer ? 'Мои заявки' : 'Заявки'}
          </h1>
          <p className="text-xl text-white/60">
            Управление обращениями • {totalItems} {totalItems === 1 ? 'заявка' : 'заявок'}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="btn-primary py-4 px-8 text-xl font-semibold"
        >
          <Plus className="w-6 h-6" />
          Создать заявку
        </button>
      </div>

      {/* Поиск и кнопка фильтров */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
          <input
            type="text"
            placeholder="Поиск по теме, номеру или описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-14 py-4 text-xl w-full"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-6 py-4 rounded-xl transition-all text-xl ${
            showFilters || hasActiveFilters
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          Фильтры
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-xl">Фильтры</h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-l text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Сбросить все
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Статус - для всех */}
            <div>
              <label className="block text-white/60 text-l mb-2">Статус</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as TicketStatus | ''); setPage(1); }}
                className="select-field w-full py-3"
              >
                <option value="">Все статусы</option>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            
            {/* Приоритет - для всех */}
            <div>
              <label className="block text-white/60 text-l mb-2">Приоритет</label>
              <select
                value={priorityFilter}
                onChange={e => { setPriorityFilter(e.target.value as TicketPriority | ''); setPage(1); }}
                className="select-field w-full py-3"
              >
                <option value="">Все приоритеты</option>
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            
            {/* Контрагент - ТОЛЬКО ДЛЯ ADMIN/SUPPORT */}
            {(isAdmin || isSupport) && (
              <div>
                <label className="block text-white/60 text-l mb-2">
                  <Building2 className="inline w-4 h-4 mr-1" />
                  Контрагент
                </label>
                <select
                  value={counterpartyFilter}
                  onChange={e => { setCounterpartyFilter(e.target.value); setPage(1); }}
                  className="select-field w-full py-3"
                >
                  <option value="">Все контрагенты</option>
                  {counterparties.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.name || cp.legal_name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Проект - для всех, но для customer только из его проектов */}
            <div>
              <label className="block text-white/60 text-l mb-2">
                <FolderOpen className="inline w-4 h-4 mr-1" />
                Проект
              </label>
              <select
                value={projectFilter}
                onChange={e => { setProjectFilter(e.target.value); setPage(1); }}
                className="select-field w-full py-3"
              >
                <option value="">Все проекты</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {/* Инициатор - для всех, кроме обычного customer */}
            {!isCustomer && (
              <div>
                <label className="block text-white/60 text-l mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Инициатор
                </label>
                <select
                  value={reporterFilter}
                  onChange={e => { setReporterFilter(e.target.value); setPage(1); }}
                  className="select-field w-full py-3"
                >
                  <option value="">Все инициаторы</option>
                  {companyUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username || u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Активные фильтры (теги) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-l">
                  Статус: {statusFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-blue-300" onClick={() => setStatusFilter('')} />
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-l">
                  Приоритет: {priorityFilter}
                  <X className="w-3 h-3 cursor-pointer hover:text-orange-300" onClick={() => setPriorityFilter('')} />
                </span>
              )}
              {counterpartyFilter && (isAdmin || isSupport) && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-l">
                  Контрагент: {counterparties.find(c => c.id === counterpartyFilter)?.name}
                  <X className="w-3 h-3 cursor-pointer hover:text-purple-300" onClick={() => setCounterpartyFilter('')} />
                </span>
              )}
              {projectFilter && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-l">
                  Проект: {projects.find(p => p.id === projectFilter)?.name}
                  <X className="w-3 h-3 cursor-pointer hover:text-green-300" onClick={() => setProjectFilter('')} />
                </span>
              )}
              {reporterFilter && !isCustomer && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-l">
                  Инициатор: {companyUsers.find(u => u.id === reporterFilter)?.full_name || 'Выбран'}
                  <X className="w-3 h-3 cursor-pointer hover:text-cyan-300" onClick={() => setReporterFilter('')} />
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-white/70 text-l">
                  Поиск: {search}
                  <X className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => setSearch('')} />
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalItems}</p>
              <p className="text-base text-white/60">Всего</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{tickets.filter(t => t.status === 'Новый').length}</p>
              <p className="text-base text-white/60">Новых</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{tickets.filter(t => t.status === 'В работе' || t.status === 'Открыт').length}</p>
              <p className="text-base text-white/60">В работе</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{tickets.filter(t => t.priority === 'Критический').length}</p>
              <p className="text-base text-white/60">Критических</p>
            </div>
          </div>
        </div>
      </div>

      {/* Список заявок */}
      {tickets.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText className="w-20 h-20 text-white/20 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-3">Нет заявок</h3>
          <p className="text-xl text-white/50 mb-8">
            {hasActiveFilters ? 'Попробуйте изменить параметры поиска' : 'Создайте первую заявку'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => navigate('/tickets/new')}
              className="btn-primary py-4 px-8 text-xl"
            >
              <Plus className="w-6 h-6" />
              Создать заявку
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tickets.map(ticket => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.number}`}
                className="glass-card p-6 block hover:bg-white/[0.08] hover:border-red-500/30 transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="w-4 h-4 text-red-400" />
                      <span className="text-l font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        {ticket.number}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-red-400 transition-colors line-clamp-2">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-l font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-3 py-1.5 rounded-lg text-l font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 text-l text-white/50">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(ticket.created_at)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    
                    {isClosed(ticket.status) && ticket.closed_at && (
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <XCircle className="w-3 h-3" />
                        <span>Закрыта {formatDate(ticket.closed_at)}</span>
                      </div>
                    )}
                    
                    {!isClosed(ticket.status) && (
                      <div className="flex items-center gap-1 text-xs text-yellow-500/60">
                        <Clock className="w-3 h-3" />
                        <span>Активна</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-12 h-12 rounded-xl text-xl font-medium transition-colors ${
                        pageNum === page
                          ? 'bg-red-800 text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl transition-colors"
              >
                Вперёд
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}