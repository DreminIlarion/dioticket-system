import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  Users,
  FileText,
  Clock,
  Edit,
  Trash2,
  Plus,
  User,
  MessageSquare,
  Loader2,
  ExternalLink,
  Calendar,
  Hash,
  CheckCircle2,
  XCircle,
  Briefcase,
  CreditCard,
  MapPinned,
  AtSign,
  PhoneCall,
  UserPlus,
  Ticket,
  History,
  Info,
  UserCheck
} from 'lucide-react';
import { counterpartiesApi, ticketsApi } from '../api/client';
import type { Counterparty, CounterpartyCustomer, TicketListItem } from '../types';

type TabType = 'info' | 'contact' | 'customers' | 'tickets' | 'history';

export default function CounterpartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [customers, setCustomers] = useState<CounterpartyCustomer[]>([]);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const cp = await counterpartiesApi.getById(id!);
      setCounterparty(cp);

      try {
        const customersResponse = await counterpartiesApi.getCustomers(id!);
        setCustomers(Array.isArray(customersResponse?.items) ? customersResponse.items : []);
      } catch (e) {
        setCustomers([]);
      }

      try {
        const ticketsData = await ticketsApi.getMy(1, 100);
        setTickets(Array.isArray(ticketsData?.items) ? ticketsData.items : []);
      } catch (e) {
        setTickets([]);
      }
    } catch (error) {
      console.error('Failed to load counterparty:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить контрагента? Это действие нельзя отменить.')) return;
    
    setDeleting(true);
    try {
      await counterpartiesApi.delete(id!);
      navigate('/counterparties');
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Новый': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Открыт': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'В работе': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Ожидает ответа': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Решён': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Закрыт': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
      'Переоткрыт': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[status] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Низкий': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Средний': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Высокий': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Критический': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[priority] || 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const tabs = [
    { id: 'info', label: 'Информация', icon: Info },
    { id: 'contact', label: 'Контактное лицо', icon: UserCheck },
    { id: 'customers', label: 'Сотрудники', icon: Users, count: customers.length },
    { id: 'tickets', label: 'Заявки', icon: Ticket, count: tickets.length },
    { id: 'history', label: 'История', icon: History },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!counterparty) {
    return (
      <div className="glass-card p-16 text-center">
        <Building2 className="w-24 h-24 text-white/20 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">Контрагент не найден</h2>
        <p className="text-white/50 text-lg mb-8">Возможно, он был удалён или у вас нет доступа</p>
        <button 
          onClick={() => navigate('/counterparties')} 
          className="btn-primary py-3 px-8 text-lg"
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <button
            onClick={() => navigate('/counterparties')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mt-1"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">{counterparty.name}</h1>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                  counterparty.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                }`}>
                  {counterparty.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <p className="text-white/60 text-lg">{counterparty.legal_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-white/70">
                  {counterparty.counterparty_type}
                </span>
                <span className="text-white/40 text-sm">ИНН: {counterparty.inn}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors text-base">
            <Edit className="w-5 h-5" />
            Редактировать
          </button>
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors text-base disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            Удалить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-red-800/50 text-white border-b-2 border-red-500'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-base font-medium">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Информация */}
          {activeTab === 'info' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-white/60" />
                  Реквизиты организации
                </h2>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Левая колонка */}
                  <div className="space-y-5">
                    <div className="bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                        <Hash className="w-4 h-4" />
                        <span>ИНН</span>
                      </div>
                      <p className="text-white text-xl font-mono">{counterparty.inn || '—'}</p>
                    </div>
                    {counterparty.kpp && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <CreditCard className="w-4 h-4" />
                          <span>КПП</span>
                        </div>
                        <p className="text-white text-xl font-mono">{counterparty.kpp}</p>
                      </div>
                    )}
                    {counterparty.okpo && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <Briefcase className="w-4 h-4" />
                          <span>ОКПО</span>
                        </div>
                        <p className="text-white text-xl font-mono">{counterparty.okpo}</p>
                      </div>
                    )}
                  </div>

                  {/* Правая колонка */}
                  <div className="space-y-5">
                    {counterparty.phone && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <PhoneCall className="w-4 h-4" />
                          <span>Телефон</span>
                        </div>
                        <a href={`tel:${counterparty.phone}`} className="text-white text-xl hover:text-red-400 transition-colors flex items-center gap-2">
                          {counterparty.phone}
                        </a>
                      </div>
                    )}
                    {counterparty.email && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <AtSign className="w-4 h-4" />
                          <span>Email</span>
                        </div>
                        <a href={`mailto:${counterparty.email}`} className="text-white text-xl hover:text-red-400 transition-colors flex items-center gap-2 break-all">
                          {counterparty.email}
                        </a>
                      </div>
                    )}
                    {counterparty.address && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <MapPinned className="w-4 h-4" />
                          <span>Адрес</span>
                        </div>
                        <p className="text-white text-xl leading-relaxed">{counterparty.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Дата создания */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Дата регистрации в системе</span>
                  </div>
                  <p className="text-white text-base">{formatDate(counterparty.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Контактное лицо */}
          {activeTab === 'contact' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-white/60" />
                  Контактное лицо
                </h2>
              </div>
              <div className="p-6">
                {counterparty.contact_person ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{counterparty.contact_person.full_name}</h3>
                        <p className="text-white/60 text-base">Контактное лицо</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      {counterparty.contact_person.phone && (
                        <div className="bg-white/5 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                            <Phone className="w-4 h-4" />
                            <span>Телефон</span>
                          </div>
                          <a href={`tel:${counterparty.contact_person.phone}`} className="text-white text-lg hover:text-red-400 transition-colors">
                            {counterparty.contact_person.phone}
                          </a>
                        </div>
                      )}
                      {counterparty.contact_person.email && (
                        <div className="bg-white/5 rounded-xl p-5">
                          <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                          </div>
                          <a href={`mailto:${counterparty.contact_person.email}`} className="text-white text-lg hover:text-red-400 transition-colors break-all">
                            {counterparty.contact_person.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {counterparty.contact_person.messengers?.telegram && (
                      <div className="bg-white/5 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Telegram</span>
                        </div>
                        <a 
                          href={`https://t.me/${counterparty.contact_person.messengers.telegram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-lg hover:text-red-400 transition-colors flex items-center gap-2"
                        >
                          @{counterparty.contact_person.messengers.telegram}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-20 h-20 text-white/20 mx-auto mb-5" />
                    <p className="text-white/50 text-xl mb-6">Контактное лицо не указано</p>
                    <button className="btn-primary py-3 px-6">
                      <Plus className="w-5 h-5" />
                      Добавить контактное лицо
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Сотрудники */}
          {activeTab === 'customers' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-white/60" />
                    Сотрудники
                  </h2>
                  <button className="btn-primary py-2.5 px-5 text-base">
                    <UserPlus className="w-5 h-5" />
                    Пригласить
                  </button>
                </div>
              </div>
              <div className="p-6">
                {customers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-20 h-20 text-white/20 mx-auto mb-5" />
                    <p className="text-white/50 text-xl mb-2">Нет сотрудников</p>
                    <p className="text-white/30 text-base">Пригласите первых сотрудников в организацию</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customers.map((customer) => (
                      <div key={customer.id} className="flex items-center gap-5 p-5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
                        {customer.avatar_url ? (
                          <img src={customer.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                            <User className="w-7 h-7 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white">
                            {customer.full_name || customer.username || 'Без имени'}
                          </h4>
                          <p className="text-base text-white/60">{customer.email}</p>
                          <p className="text-sm text-white/40 mt-1">
                            {customer.role === 'customer_admin' ? 'Администратор' : 'Сотрудник'}
                          </p>
                        </div>
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          customer.is_active ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'
                        }`}>
                          {customer.is_active ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Заявки */}
          {activeTab === 'tickets' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-white/60" />
                    Заявки
                  </h2>
                  <Link to="/tickets/new" className="btn-primary py-2.5 px-5 text-base">
                    <Plus className="w-5 h-5" />
                    Создать заявку
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-20 h-20 text-white/20 mx-auto mb-5" />
                    <p className="text-white/50 text-xl mb-2">Нет заявок</p>
                    <p className="text-white/30 text-base">От этой организации пока нет заявок</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <Link
                        key={ticket.id}
                        to={`/tickets/${ticket.number}`}
                        className="block p-5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                #{ticket.number}
                              </span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">
                              {ticket.title}
                            </h4>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <time className="text-sm text-white/40">
                              {formatDateShort(ticket.created_at)}
                            </time>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* История */}
          {activeTab === 'history' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
                  <History className="w-6 h-6 text-white/60" />
                  История изменений
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-lg">Контрагент создан</p>
                      <p className="text-white/50 text-base mt-1">
                        {formatDate(counterparty.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {counterparty.updated_at !== counterparty.created_at && (
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-lg">Данные обновлены</p>
                        <p className="text-white/50 text-base mt-1">
                          {formatDate(counterparty.updated_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Статистика */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-white/60" />
              Статистика
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-white/60 text-base">Сотрудников</span>
                </div>
                <span className="text-white font-bold text-2xl">{customers.length}</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-white/60 text-base">Всего заявок</span>
                </div>
                <span className="text-white font-bold text-2xl">{tickets.length}</span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white/60 text-base">Активных заявок</span>
                </div>
                <span className="text-white font-bold text-2xl">
                  {tickets.filter(t => t.status !== 'Закрыт' && t.status !== 'Решён').length}
                </span>
              </div>
            </div>
          </div>

          {/* Информация о подразделениях */}
          
        </div>
      </div>
    </div>
  );
}