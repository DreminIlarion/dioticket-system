import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Filter,
  Loader2,
  Users,
  User,
  Briefcase,
  GitBranch,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { counterpartiesApi } from '../api/client';
import type { Counterparty } from '../types';

export default function CounterpartiesPage() {
  const navigate = useNavigate();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCounterparties();
  }, [page]);

  const loadCounterparties = async () => {
    setLoading(true);
    try {
      const response = await counterpartiesApi.getAll(page, 50);
      setCounterparties(response.items);
      setTotalPages(response.total_pages);
      setTotalItems(response.total_items);
    } catch (error) {
      console.error('Failed to load counterparties:', error);
    } finally {
      setLoading(false);
    }
  };

  // Группировка: головные компании и их подразделения
  const headCompanies = counterparties.filter(cp => !cp.parent_id && !cp.is_branch);
  const branchesByParent = new Map<string, Counterparty[]>();
  
  counterparties.forEach(cp => {
    if (cp.parent_id && cp.is_branch) {
      const parentId = cp.parent_id;
      if (!branchesByParent.has(parentId)) {
        branchesByParent.set(parentId, []);
      }
      branchesByParent.get(parentId)!.push(cp);
    }
  });

  const toggleCompany = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  const filteredCounterparties = headCompanies.filter(cp => {
    const matchesSearch = !search || 
      cp.name.toLowerCase().includes(search.toLowerCase()) ||
      cp.inn.includes(search) ||
      cp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || cp.counterparty_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string, isBranch: boolean = false) => {
    const size = isBranch ? "w-6 h-6" : "w-10 h-10";
    switch (type) {
      case 'Юридическое лицо': return <Building2 className={`${size} text-red-400`} />;
      case 'Физическое лицо': return <User className={`${size} text-blue-400`} />;
      case 'ИП': return <Briefcase className={`${size} text-amber-400`} />;
      default: return <Building2 className={`${size} text-red-400`} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading && counterparties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className=" space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Контрагенты</h1>
          <p className="text-xl text-white/60">
            Управление контрагентом и клиентами • {totalItems} {totalItems === 1 ? 'запись' : 'записей'}
          </p>
        </div>
        <button
          onClick={() => navigate('/counterparties/new')}
          className="btn-primary py-4 px-8 text-lg font-semibold"
        >
          <Plus className="w-6 h-6" />
          Добавить контрагента
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
            <input
              type="text"
              placeholder="Поиск по названию, ИНН или email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-14 py-4 text-lg"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="select-field pl-12 py-4 pr-12 text-lg min-w-[220px]"
            >
              <option value="">Все типы</option>
              <option value="Юридическое лицо">Юридическое лицо</option>
              <option value="Физическое лицо">Физическое лицо</option>
              <option value="ИП">ИП</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {filteredCounterparties.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Building2 className="w-24 h-24 text-white/20 mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-3">Нет контрагентов</h3>
          <p className="text-xl text-white/50 mb-8">
            {search || typeFilter ? 'Попробуйте изменить параметры поиска' : 'Добавьте первого контрагента'}
          </p>
          {!search && !typeFilter && (
            <button
              onClick={() => navigate('/counterparties/new')}
              className="btn-primary py-4 px-8 text-lg"
            >
              <Plus className="w-6 h-6" />
              Добавить контрагента
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCounterparties.map(company => {
            const branches = branchesByParent.get(company.id) || [];
            const hasBranches = branches.length > 0;
            const isExpanded = expandedCompanies.has(company.id);

            return (
              <div key={company.id} className="glass-card overflow-hidden">
                {/* Головная компания - кликабельная область */}
                <div 
                  className="p-6 cursor-pointer hover:bg-white/[0.05] transition-colors"
                  onClick={() => navigate(`/counterparties/${company.id}`)}
                >
                  <div className="flex items-start gap-5">
                    {/* Иконка */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700/30 to-red-900/30 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(company.counterparty_type)}
                    </div>
                    
                    {/* Основная информация */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1 group-hover:text-red-400 transition-colors">
                            {company.name}
                          </h2>
                          <p className="text-base text-white/50">{company.legal_name}</p>
                        </div>
                        
                        {/* Индикатор наличия подразделений */}
                        {hasBranches && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompany(company.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-5 h-5" />
                                <span className="text-base">Скрыть подразделения</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-5 h-5" />
                                <GitBranch className="w-5 h-5" />
                                <span className="text-base font-medium">{branches.length} подразделения</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Бейджи */}
                      <div className="flex flex-wrap gap-3 mt-4">
                        <span className="px-4 py-1.5 rounded-xl text-base font-medium bg-white/10 text-white/80">
                          {company.counterparty_type}
                        </span>
                        <span className={`px-4 py-1.5 rounded-xl text-base font-medium ${
                          company.is_active ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'
                        }`}>
                          {company.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-7 h-7 text-white/30 group-hover:text-red-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>

                  {/* Детальная информация */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-medium text-white/40 min-w-[50px]">ИНН:</span>
                      <span className="text-base text-white font-mono">{company.inn}</span>
                    </div>
                    {company.kpp && (
                      <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-white/40 min-w-[50px]">КПП:</span>
                        <span className="text-base text-white font-mono">{company.kpp}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-white/40" />
                        <span className="text-base text-white">{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-white/40" />
                        <span className="text-base text-white truncate">{company.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-base text-white/40">Создан:</span>
                      <span className="text-base text-white/60">{formatDate(company.created_at)}</span>
                    </div>
                  </div>

                  {/* Контактное лицо */}
                  {company.contact_person && (
                    <div className="mt-5 pt-5 border-t border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-white">{company.contact_person.full_name}</p>
                          <p className="text-sm text-white/50">Контактное лицо</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Подразделения (если есть и развёрнуты) */}
                {hasBranches && isExpanded && (
                  <div className="border-t border-white/10 bg-white/[0.03] p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1 h-6 rounded-full bg-red-500" />
                      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <GitBranch className="w-5 h-5" />
                        Обособленные подразделения
                      </h3>
                      <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                        {branches.length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {branches.map((branch) => (
                        <div
                          key={branch.id}
                          onClick={() => navigate(`/counterparties/${branch.id}`)}
                          className="bg-white/[0.05] rounded-xl p-5 cursor-pointer hover:bg-white/[0.1] hover:border-red-500/30 transition-all group border border-white/10"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-700/30 to-red-900/30 flex items-center justify-center flex-shrink-0">
                              {getTypeIcon(branch.counterparty_type, true)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <GitBranch className="w-4 h-4 text-white/40" />
                                <span className="text-sm text-red-400/70">Обособленное подразделение</span>
                              </div>
                              <h4 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-red-400 transition-colors">
                                {branch.name}
                              </h4>
                              <p className="text-sm text-white/50 truncate mb-2">{branch.legal_name}</p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="text-white/60">ИНН: <span className="text-white font-mono">{branch.inn}</span></span>
                                {branch.kpp && <span className="text-white/60">КПП: <span className="text-white font-mono">{branch.kpp}</span></span>}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-red-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg transition-colors"
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
                  className={`w-12 h-12 rounded-xl text-lg font-medium transition-colors ${
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg transition-colors"
          >
            Вперёд
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}