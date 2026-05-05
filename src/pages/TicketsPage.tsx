// pages/TicketsPage.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, FileText, ChevronRight, ChevronLeft, Loader2,
  Clock, AlertTriangle, CheckCircle2, Calendar, XCircle, Hash,
  Building2, FolderOpen, User, X, SlidersHorizontal, ChevronDown, Check,
} from 'lucide-react';
import { ticketsApi, counterpartiesApi, projectsApi, usersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type {
  TicketListItem, TicketStatus, TicketPriority,
  Counterparty, Project, CounterpartyCustomer, SimpleUser,
} from '../types';

// ─── useDebounce ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Константы ────────────────────────────────────────────────────────────────

const STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'Новый',           label: 'Новый',           color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'На согласовании', label: 'На согласовании', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'Открыт',         label: 'Открыт',          color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'В работе',       label: 'В работе',        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'Ожидает ответа', label: 'Ожидает ответа',  color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'Решён',          label: 'Решён',           color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'Закрыт',         label: 'Закрыт',          color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' },
  { value: 'Переоткрыт',     label: 'Переоткрыт',      color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'Низкий',       label: 'Низкий',       color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'Средний',      label: 'Средний',      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'Высокий',      label: 'Высокий',      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'Критический',  label: 'Критический',  color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

// ─── Кастомный Dropdown ──────────────────────────────────────────────────────

interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  color?: string;
  icon?: React.ReactNode;
}

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

function FilterDropdown({
  label,
  icon,
  options,
  value,
  onChange,
  placeholder = 'Все',
  searchable = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, searchable]);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  return (
    <div ref={ref} className="relative">
      <label className="block text-white/50 text-xl font-medium mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
      </label>

      <button
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`
          w-full flex items-center justify-between gap-2
          px-3.5 py-2.5 rounded-xl text-l text-left
          transition-all duration-150
          ${open
            ? 'bg-white/[0.08] border border-red-500/40 ring-2 ring-red-500/10'
            : value
              ? 'bg-white/[0.06] border border-white/[0.12] hover:border-white/[0.2]'
              : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12]'
          }
        `}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0 truncate">
            {selected.color && (
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.color.split(' ')[0].replace('/20', '/60')}`} />
            )}
            <span className="text-white text-l truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="text-white/40 text-l">{placeholder}</span>
        )}

       <div className="flex items-center gap-1 flex-shrink-0">
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }
            }}
            className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-white/30 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#1c1c1c] border border-white/[0.1] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,.45)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {searchable && (
            <div className="p-2 border-b border-white/[0.06]">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Поиск..."
                  className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-l text-white placeholder-white/25 focus:outline-none focus:border-white/[0.15] transition-colors"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10">
            {/* Пункт «Все» */}
            <button
              onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
              className={`
                w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-l
                transition-colors duration-100
                ${!value ? 'bg-white/[0.06] text-white' : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'}
              `}
            >
              {!value && <Check size={14} className="text-red-400 flex-shrink-0" />}
              {value && <span className="w-[14px]" />}
              <span>{placeholder}</span>
            </button>

            {filtered.length === 0 ? (
              <div className="px-3.5 py-6 text-center text-l text-white/25">
                Ничего не найдено
              </div>
            ) : (
              filtered.map(option => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    onClick={() => { onChange(option.value); setOpen(false); setQuery(''); }}
                    className={`
                      w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-l
                      transition-colors duration-100
                      ${isSelected
                        ? 'bg-white/[0.06] text-l text-white'
                        : 'text-white/70 hover:bg-white/[0.04] hover:text-white'}
                    `}
                  >
                    {isSelected
                      ? <Check size={14} className="text-red-400 flex-shrink-0" />
                      : <span className="w-[14px] flex-shrink-0" />
                    }

                    {option.color && (
                      <span className={`px-2 py-0.5 rounded text-[15px] font-medium border ${option.color}`}>
                        {option.label}
                      </span>
                    )}

                    {!option.color && (
                      <div className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.sublabel && (
                          <span className="block text-l text-white/30 truncate">{option.sublabel}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Основной компонент ───────────────────────────────────────────────────────

export default function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tickets, setTickets]       = useState<TicketListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Фильтры
  const [search, setSearch]                       = useState('');
  const [statusFilter, setStatusFilter]           = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter]       = useState<TicketPriority | ''>('');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  const [projectFilter, setProjectFilter]         = useState('');
  const [reporterFilter, setReporterFilter]       = useState('');

  const [showFilters, setShowFilters] = useState(false);

  // Данные для фильтров
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [projects, setProjects]             = useState<Project[]>([]);
  const [allUsers, setAllUsers]             = useState<SimpleUser[]>([]);
  const [companyUsers, setCompanyUsers]     = useState<CounterpartyCustomer[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Debounced search — только это значение участвует в загрузке
  const debouncedSearch = useDebounce(search, 500);

  // FIX: сброс страницы при изменении debounced поиска
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch]);

  // Роли
  const isCustomer      = user?.role === 'customer';
  const isCustomerAdmin = user?.role === 'customer_admin';
  const isSupport       = user?.role === 'support_agent' || user?.role === 'support_manager';
  const isAdmin         = user?.role === 'admin';

  // ── Загрузка фильтров ────────────────────────────────────────────────────
  useEffect(() => { loadFilters(); }, []);

  useEffect(() => {
    if (isAdmin || isSupport) loadAllUsers();
    else if (isCustomerAdmin && user?.counterparty_id) loadCompanyUsers();
  }, [isAdmin, isSupport, isCustomerAdmin, user?.counterparty_id]);

  // ── Загрузка тикетов ─────────────────────────────────────────────────────
  // FIX: search убран из зависимостей, только debouncedSearch
  useEffect(() => {
    loadTickets();
  }, [page, statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter, debouncedSearch]);

  const loadAllUsers = async () => {
    try {
      const response = await usersApi.getAllUsers(1, 100);
      setAllUsers(response.items);
    } catch (error) {
      console.error('Failed to load all users:', error);
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

  const loadFilters = async () => {
    setLoadingFilters(true);
    try {
      if (isAdmin || isSupport) {
        const res = await counterpartiesApi.getAll(1, 100);
        setCounterparties(res.items);
      }
      if (isCustomer || isCustomerAdmin) {
        const res = await projectsApi.getMyProjects('all', 1, 100);
        setProjects(res.items);
      } else {
        const res = await projectsApi.getAll(1, 100);
        setProjects(res.items);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      let response;
      const filters = {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        project_id: projectFilter || undefined,
        reporter_id: reporterFilter || undefined,
        search: debouncedSearch || undefined,
      };

      if (isCustomer && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: user.counterparty_id,
        });
      } else if (isCustomerAdmin && user?.counterparty_id) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: user.counterparty_id,
        });
      } else if (isSupport || isAdmin) {
        response = await ticketsApi.getAllWithFilters(page, 10, {
          ...filters,
          counterparty_id: counterpartyFilter || undefined,
        });
      } else {
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

  const hasActiveFilters = !!(statusFilter || priorityFilter || counterpartyFilter || projectFilter || reporterFilter || search);
  const activeFiltersCount = [statusFilter, priorityFilter, counterpartyFilter, projectFilter, reporterFilter].filter(Boolean).length;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    return STATUSES.find(s => s.value === status)?.color || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority)?.color || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isClosed = (status: string) => status === 'Закрыт' || status === 'Решён';

  const getUserDisplayName = (userId: string): string => {
    if (isAdmin || isSupport) {
      const u = allUsers.find(x => x.id === userId);
      return u?.full_name || u?.username || u?.email || userId;
    }
    if (isCustomerAdmin) {
      const u = companyUsers.find(x => x.id === userId);
      return u?.full_name || u?.username || u?.email || userId;
    }
    return userId;
  };

  // ── Опции для дропдаунов ──────────────────────────────────────────────────

  const statusOptions: DropdownOption[] = STATUSES.map(s => ({
    value: s.value,
    label: s.label,
    color: s.color,
  }));

  const priorityOptions: DropdownOption[] = PRIORITIES.map(p => ({
    value: p.value,
    label: p.label,
    color: p.color,
  }));

  const counterpartyOptions: DropdownOption[] = counterparties.map(c => ({
    value: c.id,
    label: c.name || c.legal_name,
    sublabel: c.inn ? `ИНН: ${c.inn}` : undefined,
  }));

  const projectOptions: DropdownOption[] = projects.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const userOptions: DropdownOption[] = (isAdmin || isSupport)
    ? allUsers.map(u => ({
        value: u.id,
        label: u.full_name || u.username || u.email,
        sublabel: u.email && u.full_name ? u.email : undefined,
      }))
    : companyUsers.map(u => ({
        value: u.id,
        label: u.full_name || u.username || u.email,
        sublabel: u.email && (u.full_name || u.username) ? u.email : undefined,
      }));

  // ── Рендер ────────────────────────────────────────────────────────────────

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
          <p className="text-[16px] text-white/60">
            Управление обращениями • {totalItems} {totalItems === 1 ? 'заявка' : 'заявок'}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="btn-primary py-4 px-8 text-[16px] font-semibold"
        >
          <Plus className="w-6 h-6" />
          Создать заявку
        </button>
      </div>

      {/* Поиск + кнопка фильтров */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Поиск по теме, номеру или описанию..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10 text-l transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`
            flex items-center gap-2 px-5 py-3.5 rounded-xl text-l font-medium
            transition-all duration-150
            ${showFilters || hasActiveFilters
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/20'
              : 'bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.06] hover:text-white/80'
            }
          `}
        >
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFiltersCount > 0 && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-l flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-white/40" />
              Фильтры
            </h3>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-l text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
              >
                <X size={12} />
                Сбросить
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Статус */}
            <FilterDropdown
              label="Статус"
              options={statusOptions}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as TicketStatus | ''); setPage(1); }}
              placeholder="Все статусы"
            />

            {/* Приоритет */}
            <FilterDropdown
              label="Приоритет"
              options={priorityOptions}
              value={priorityFilter}
              onChange={(v) => { setPriorityFilter(v as TicketPriority | ''); setPage(1); }}
              placeholder="Все приоритеты"
            />

            {/* Контрагент — только admin/support */}
            {(isAdmin || isSupport) && (
              <FilterDropdown
                label="Контрагент"
                icon={<Building2 size={18} />}
                options={counterpartyOptions}
                value={counterpartyFilter}
                onChange={(v) => { setCounterpartyFilter(v); setPage(1); }}
                placeholder="Все контрагенты"
                searchable
              />
            )}

            {/* Проект */}
            <FilterDropdown
              label="Проект"
              icon={<FolderOpen size={18} />}
              options={projectOptions}
              value={projectFilter}
              onChange={(v) => { setProjectFilter(v); setPage(1); }}
              placeholder="Все проекты"
              searchable
            />

            {/* Инициатор */}
            {(isAdmin || isSupport || isCustomerAdmin) && (
              <FilterDropdown
                label="Инициатор"
                icon={<User size={18} />}
                options={userOptions}
                value={reporterFilter}
                onChange={(v) => { setReporterFilter(v); setPage(1); }}
                placeholder="Все инициаторы"
                searchable
              />
            )}
          </div>

          {/* Активные фильтры-теги */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/[0.06]">
              {statusFilter && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium border ${getStatusColor(statusFilter)}`}>
                  {statusFilter}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setStatusFilter(''); setPage(1); }} />
                </span>
              )}
              {priorityFilter && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium border ${getPriorityColor(priorityFilter)}`}>
                  {priorityFilter}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setPriorityFilter(''); setPage(1); }} />
                </span>
              )}
              {counterpartyFilter && (isAdmin || isSupport) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  <Building2 size={10} />
                  {counterparties.find(c => c.id === counterpartyFilter)?.name}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setCounterpartyFilter(''); setPage(1); }} />
                </span>
              )}
              {projectFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <FolderOpen size={10} />
                  {projects.find(p => p.id === projectFilter)?.name}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setProjectFilter(''); setPage(1); }} />
                </span>
              )}
              {reporterFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <User size={10} />
                  {getUserDisplayName(reporterFilter)}
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => { setReporterFilter(''); setPage(1); }} />
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-l font-medium bg-white/10 text-white/60 border border-white/[0.08]">
                  <Search size={10} />
                  «{search}»
                  <X size={10} className="cursor-pointer opacity-60 hover:opacity-100" onClick={() => setSearch('')} />
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Всего',       value: totalItems, icon: FileText, color: 'bg-red-500/20 text-white-400' },
          { label: 'Новых',       value: tickets.filter(t => t.status === 'Новый').length, icon: Clock, color: 'bg-blue-500/20 text-blue-400' },
          { label: 'В работе',    value: tickets.filter(t => t.status === 'В работе' || t.status === 'Открыт').length, icon: CheckCircle2, color: 'bg-purple-500/20 text-purple-400' },
          { label: 'Критических', value: tickets.filter(t => t.priority === 'Критический').length, icon: AlertTriangle, color: 'bg-red-500/20 text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-base text-white/60">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Список */}
      {tickets.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText className="w-20 h-20 text-white/20 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-3">Нет заявок</h3>
          <p className="text-[16px] text-white/50 mb-8">
            {hasActiveFilters ? 'Попробуйте изменить параметры поиска' : 'Создайте первую заявку'}
          </p>
          {!hasActiveFilters && (
            <button onClick={() => navigate('/tickets/new')} className="btn-primary py-4 px-8 text-[16px]">
              <Plus className="w-6 h-6" /> Создать заявку
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
              </div>
            )}

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
                      <span className="text-[15px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        {ticket.number}
                      </span>
                    </div>
                    <h3 className="text-[19px] font-semibold text-white mb-3 group-hover:text-red-400 transition-colors line-clamp-2">
                      {ticket.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-[15px] font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-3 py-1.5 rounded-lg text-[15px] font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 text-l text-white/80">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(ticket.created_at)}
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    {isClosed(ticket.status) && ticket.closed_at ? (
                      <div className="flex items-center gap-1 text-[16px] text-white/40">
                        <XCircle className="w-3 h-3" />
                        <span>Закрыта {formatDate(ticket.closed_at)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-l text-yellow-500/60">
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
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[16px] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Назад
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-12 h-12 rounded-xl text-[16px] font-medium transition-colors ${
                        pageNum === page ? 'bg-red-800 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
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
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[16px] transition-colors"
              >
                Вперёд <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}