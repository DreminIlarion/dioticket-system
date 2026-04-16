import { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  FileText,
  Calendar,
  User,
  MessageSquare,
  Loader2,
  AlertCircle,
  ExternalLink,
  Crown,
  GitBranch
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { counterpartiesApi } from '@/api/client';
import type { Counterparty, CounterpartyCustomer } from '@/types';

type TabType = 'info' | 'contacts' | 'branches' | 'employees';

export default function MyCompanyPage() {
  const { user } = useAuthStore();
  const [company, setCompany] = useState<Counterparty | null>(null);
  const [branches, setBranches] = useState<Counterparty[]>([]);
  const [employees, setEmployees] = useState<CounterpartyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Проверяем, может ли пользователь видеть сотрудников (только администратор компании)
  const canViewEmployees = user?.role === 'customer_admin' || user?.role === 'admin';

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.counterparty_id) {
        setError('Вы не привязаны к компании');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 1. Загружаем головную компанию по ID из профиля пользователя
        const companyData = await counterpartiesApi.getById(user.counterparty_id);
        setCompany(companyData);
        
        // 2. Загружаем подразделения (если есть)
        // Для этого нужен отдельный эндпоинт или можно получить через getAll с фильтром по parent_id
        try {
          // Вариант 1: если есть эндпоинт для получения подразделений
          // const branchesData = await counterpartiesApi.getBranches(companyData.id);
          // setBranches(branchesData);
          
          // Вариант 2: временно — подразделения не загружаем, пока нет API
          setBranches([]);
        } catch (err) {
          console.error('Failed to load branches:', err);
          setBranches([]);
        }
        
        // 3. Если пользователь может видеть сотрудников — загружаем их
        if (canViewEmployees) {
          try {
            // TODO: заменить на реальный API для получения сотрудников компании
            // const employeesData = await usersApi.getCustomers(companyData.id, 1, 100);
            // setEmployees(employeesData.items);
            setEmployees([]);
          } catch (err) {
            console.error('Failed to load employees:', err);
            setEmployees([]);
          }
        }
      } catch (err) {
        console.error('Failed to load company:', err);
        setError('Не удалось загрузить данные компании');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [user?.counterparty_id, canViewEmployees]);

  const hasBranches = branches.length > 0;

  // Вкладки для разных ролей
  const getTabs = (): { id: TabType; label: string; icon: typeof Building2 }[] => {
    const tabs = [
      { id: 'info' as TabType, label: 'Информация', icon: Building2 },
      { id: 'contacts' as TabType, label: 'Контактное лицо', icon: User },
    ];
    
    if (hasBranches) {
      tabs.push({ id: 'branches' as TabType, label: 'Подразделения', icon: GitBranch });
    }
    
    if (canViewEmployees) {
      tabs.push({ id: 'employees' as TabType, label: 'Сотрудники', icon: Users });
    }
    
    return tabs;
  };

  const tabs = getTabs();

  // Функция для получения роли сотрудника
  const getEmployeeRoleInfo = (role: string) => {
    const roles: Record<string, { label: string; icon: JSX.Element; color: string }> = {
      customer_admin: {
        label: 'Администратор',
        icon: <Crown className="w-3.5 h-3.5" />,
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      },
      customer: {
        label: 'Сотрудник',
        icon: <User className="w-3.5 h-3.5" />,
        color: 'bg-red-500/20 text-red-400 border-red-500/30'
      },
    };
    return roles[role] || {
      label: 'Пользователь',
      icon: <User className="w-3.5 h-3.5" />,
      color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-xl text-neutral-400">Загрузка данных компании...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Компания не найдена</h2>
          <p className="text-lg text-neutral-400">{error || 'Вы не привязаны ни к одной компании'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" p-6 lg:p-8">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Моя компания</h1>
        <p className="text-lg text-neutral-400">Информация о вашей организации</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Боковая карточка */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 sticky top-6">
            {/* Логотип и название */}
            <div className="text-center mb-6">
              {company.avatar_url ? (
                <img 
                  src={company.avatar_url} 
                  alt={company.name}
                  className="w-24 h-24 rounded-2xl mx-auto mb-4 object-cover ring-4 ring-white/10"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mx-auto mb-4 ring-4 ring-white/10">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-white mb-1">{company.name}</h2>
              <p className="text-lg text-neutral-400">{company.legal_name}</p>
            </div>

            {/* Бейджи */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${company.is_active ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                {company.is_active ? 'Активен' : 'Неактивен'}
              </span>
              <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/20 text-red-400">
                {company.counterparty_type}
              </span>
              {hasBranches && (
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400">
                  Головная компания
                </span>
              )}
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <GitBranch className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{branches.length}</p>
                <p className="text-sm text-neutral-400">Подразделений</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <FileText className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">—</p>
                <p className="text-sm text-neutral-400">Заявок</p>
              </div>
            </div>

            {/* Контакты */}
            <div className="space-y-3">
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <Phone className="w-5 h-5 text-neutral-400 group-hover:text-green-400" />
                  <span className="text-lg text-neutral-300 group-hover:text-white">{company.phone}</span>
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <Mail className="w-5 h-5 text-neutral-400 group-hover:text-red-400" />
                  <span className="text-lg text-neutral-300 group-hover:text-white">{company.email}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-2">
          {/* Вкладки */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Контент вкладок */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            {/* Информация */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Реквизиты компании</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-xl p-5">
                    <p className="text-sm text-neutral-500 mb-1">ИНН</p>
                    <p className="text-xl font-semibold text-white">{company.inn || '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5">
                    <p className="text-sm text-neutral-500 mb-1">КПП</p>
                    <p className="text-xl font-semibold text-white">{company.kpp || '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5">
                    <p className="text-sm text-neutral-500 mb-1">ОКПО</p>
                    <p className="text-xl font-semibold text-white">{company.okpo || '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-5">
                    <p className="text-sm text-neutral-500 mb-1">Тип</p>
                    <p className="text-xl font-semibold text-white">{company.counterparty_type}</p>
                  </div>
                </div>

                {company.address && (
                  <div className="bg-white/5 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-neutral-400 mt-1" />
                      <div>
                        <p className="text-sm text-neutral-500 mb-1">Адрес</p>
                        <p className="text-xl text-white">{company.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-neutral-400 mt-1" />
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Дата регистрации в системе</p>
                      <p className="text-xl text-white">
                        {new Date(company.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Контактное лицо */}
            {activeTab === 'contacts' && (
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Контактное лицо</h3>
                
                {company.contact_person ? (
                  <div className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white">{company.contact_person.full_name}</h4>
                        <p className="text-lg text-neutral-400">Контактное лицо</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {company.contact_person.phone && (
                        <a href={`tel:${company.contact_person.phone}`} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                          <Phone className="w-5 h-5 text-green-400" />
                          <span className="text-lg text-white">{company.contact_person.phone}</span>
                        </a>
                      )}
                      {company.contact_person.email && (
                        <a href={`mailto:${company.contact_person.email}`} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                          <Mail className="w-5 h-5 text-red-400" />
                          <span className="text-lg text-white">{company.contact_person.email}</span>
                        </a>
                      )}
                      {company.contact_person.messengers?.telegram && (
                        <a 
                          href={`https://t.me/${company.contact_person.messengers.telegram}`}
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <MessageSquare className="w-5 h-5 text-sky-400" />
                          <span className="text-lg text-white">@{company.contact_person.messengers.telegram}</span>
                          <ExternalLink className="w-4 h-4 text-neutral-500 ml-auto" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                    <p className="text-xl text-neutral-400">Контактное лицо не указано</p>
                  </div>
                )}
              </div>
            )}

            {/* Подразделения */}
            {activeTab === 'branches' && hasBranches && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <GitBranch className="w-6 h-6 text-amber-400" />
                    Обособленные подразделения
                  </h3>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-sm">
                    Всего: {branches.length}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {branches.map((branch) => (
                    <div 
                      key={branch.id}
                      className="bg-white/5 rounded-xl p-5 hover:bg-white/10 transition-all border border-white/10"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600/30 to-amber-700/30 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="w-4 h-4 text-amber-400/70" />
                            <span className="text-sm text-amber-400/70">Обособленное подразделение</span>
                          </div>
                          <h4 className="text-xl font-bold text-white mb-1">{branch.name}</h4>
                          <p className="text-base text-neutral-400">{branch.legal_name}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm">
                            <span className="text-neutral-500">ИНН: <span className="text-white">{branch.inn}</span></span>
                            {branch.kpp && <span className="text-neutral-500">КПП: <span className="text-white">{branch.kpp}</span></span>}
                            {branch.phone && <span className="text-neutral-500">📞 {branch.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Сотрудники (только для администратора компании) */}
            {activeTab === 'employees' && canViewEmployees && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">
                    Сотрудники компании
                  </h3>
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-sm">
                    Всего: {employees.length}
                  </span>
                </div>
                
                {employees.length > 0 ? (
                  <div className="space-y-3">
                    {employees.map((employee) => {
                      const roleInfo = getEmployeeRoleInfo(employee.role);
                      const isCurrentUser = employee.id === user?.user_id;
                      
                      return (
                        <div 
                          key={employee.id} 
                          className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/30' 
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {/* Аватар */}
                          {employee.avatar_url ? (
                            <img 
                              src={employee.avatar_url} 
                              alt={employee.full_name || employee.username}
                              className="w-14 h-14 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center">
                              <User className="w-7 h-7 text-neutral-400" />
                            </div>
                          )}
                          
                          {/* Информация */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-lg font-semibold text-white truncate">
                                {employee.full_name || employee.username}
                              </p>
                              {isCurrentUser && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                  Вы
                                </span>
                              )}
                            </div>
                            <p className="text-base text-neutral-400 truncate">{employee.email}</p>
                          </div>
                          
                          {/* Роль */}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${roleInfo.color}`}>
                            {roleInfo.icon}
                            <span>{roleInfo.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                    <p className="text-xl text-neutral-400">Пока нет других сотрудников</p>
                    <p className="text-sm text-neutral-500 mt-2">
                      Вы можете пригласить коллег через раздел "Приглашения"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}