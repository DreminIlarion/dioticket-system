// pages/ProjectDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FolderOpen, 
  Building2, 
  Users, 
  Calendar,
  User,
  Mail,
  Phone,
  Loader2,
  Archive,
  Plus,
  Ticket,
  Crown,
  Hash,
  Clock,
  CheckCircle2,
  UserPlus,
  Settings,
  ChevronRight,
  AtSign
} from 'lucide-react';
import { projectsApi, ticketsApi, counterpartiesApi, usersApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ui/use-toast';
import type { Project, Counterparty, TicketListItem, CounterpartyCustomer } from '../types';

type TabType = 'info' | 'members' | 'tickets';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [projectTickets, setProjectTickets] = useState<TicketListItem[]>([]);

  const canEdit = user?.role === 'admin' || 
                  user?.role === 'support_manager' ||
                  project?.owner_id === user?.user_id;

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'tickets' && project) {
      loadProjectTickets();
    }
  }, [activeTab, project]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.getById(id!);
      setProject(data);
      
      if (data.counterparty_id) {
        await Promise.all([
          loadCounterpartyInfo(data.counterparty_id),
          loadProjectMembers(data.counterparty_id, data.memberships)
        ]);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить проект', variant: 'destructive' });
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const loadCounterpartyInfo = async (counterpartyId: string) => {
    try {
      const data = await counterpartiesApi.getById(counterpartyId);
      setCounterparty(data);
    } catch (error) {
      console.error('Failed to load counterparty:', error);
    }
  };


  

  const loadProjectMembers = async (counterpartyId: string, memberships: any[]) => {
    setLoadingMembers(true);
    try {
      const response = await usersApi.getCustomers(counterpartyId, 1, 100);
      const allMembers = response.items;
      
      const enrichedMembers = memberships.map(membership => {
        const userData = allMembers.find(m => m.id === membership.user_id);
        return {
          ...membership,
          user: userData || null
        };
      });
      
      setMembers(enrichedMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadProjectTickets = async () => {
    setLoadingTickets(true);
    try {
      // Получаем все заявки через API с фильтром по project_id
      const response = await ticketsApi.getAllWithFilters(1, 100, {
        project_id: project!.id
      });
      setProjectTickets(response.items);
      setTickets(response.items);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      setProjectTickets([]);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Архивировать проект? Он станет недоступен для создания новых задач.')) return;
    
    try {
      await projectsApi.archive(id!);
      toast({ title: 'Успешно', description: 'Проект архивирован' });
      loadProject();
    } catch (error) {
      console.error('Failed to archive project:', error);
      toast({ title: 'Ошибка', description: 'Не удалось архивировать проект', variant: 'destructive' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      owner: 'Владелец',
      manager: 'Менеджер',
      member: 'Участник',
      viewer: 'Наблюдатель',
      customer: 'Клиент',
      customer_admin: 'Администратор клиента',
    };
    return roles[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-red-500/20 text-red-400 border-red-500/30',
      manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      member: 'bg-green-500/20 text-green-400 border-green-500/30',
      viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      customer: 'bg-white-500/20 text-white-400 border-white-500/30',
      customer_admin: 'bg-white-500/20 text-white-400 border-white-500/30',
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Новый': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Открыт': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'В работе': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Ожидает ответа': 'bg-white-500/20 text-white-400 border-white-500/30',
      'Решён': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Закрыт': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
      'Переоткрыт': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Низкий': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Средний': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Высокий': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Критический': 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getOwnerInfo = () => {
    const owner = members.find(m => m.project_role === 'owner');
    if (owner?.user) {
      return {
        name: owner.user.full_name || owner.user.username,
        email: owner.user.email,
        avatar: owner.user.avatar_url
      };
    }
    return null;
  };

  const ownerInfo = getOwnerInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-white-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="glass-card p-16 text-center">
        <FolderOpen className="w-24 h-24 text-white/20 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-4">Проект не найден</h2>
        <p className="text-white/50 text-lg mb-8">Возможно, он был удалён или у вас нет доступа</p>
        <Link to="/projects" className="btn-primary py-3 px-8 text-lg">
          Вернуться к проектам
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <button
            onClick={() => navigate('/projects')}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mt-1"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white-700 to-white-900 flex items-center justify-center">
                <FolderOpen className="w-10 h-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-4xl font-bold text-white">{project.name}</h1>
                  <span className={`px-4 py-1.5 rounded-xl text-xl font-medium border ${
                    project.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                  }`}>
                    {project.status === 'active' ? 'Активен' : 'Архивирован'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Hash className="w-5 h-5 text-white-400" />
                  <span className="text-white-400 font-mono text-xl">{project.key}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {canEdit && project.status === 'active' && (
          <div className="flex gap-3">
            <button
              onClick={handleArchive}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-colors text-xl"
            >
              <Archive className="w-5 h-5" />
              Архивировать
            </button>
            <Link
              to={`/tickets/new?project_id=${project.id}`}
              className="btn-primary flex items-center gap-2 py-3 px-6 text-xl"
            >
              <Plus className="w-5 h-5" />
              Создать заявку
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {[
          { id: 'info', label: 'Информация', icon: FolderOpen },
          { id: 'members', label: 'Участники', icon: Users, count: project.memberships?.length || 0 },
          { id: 'tickets', label: 'Заявки', icon: Ticket, count: projectTickets.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-3 px-6 py-3 rounded-t-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white-800/50 text-white border-b-2 border-white-500'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-lg font-medium">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 text-xl px-2 py-0.5 rounded-full bg-white/20">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-white-400" />
                  Информация о проекте
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {project.description && (
                  <div className="bg-white/5 rounded-xl p-5">
                    <p className="text-white leading-relaxed text-xl">
                      {project.description}
                    </p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Левая колонка */}
                  <div className="space-y-5">
                    <div className="bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-white/50 text-xl mb-2">
                        <Building2 className="w-4 h-4" />
                        <span>Организация</span>
                      </div>
                      {counterparty ? (
                        <div>
                          <p className="text-white/90 font-semibold text-xl">{counterparty.name}</p>
                          <p className="text-white/90 text-xl mt-1">{counterparty.legal_name}</p>
                          {counterparty.inn && (
                            <p className="text-white/90 text-xl mt-2">ИНН: {counterparty.inn}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-white/90 text-xl">ID: {project.counterparty_id}</p>
                      )}
                    </div>

                    <div className="bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-white/50 text-xl mb-2">
                        <Crown className="w-4 h-4 text-red-400" />
                        <span>Владелец проекта</span>
                      </div>
                      {ownerInfo ? (
                        <div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-700 to-red-800 flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-lg">{ownerInfo.name}</p>
                              <p className="text-white/50 text-xl">{ownerInfo.email}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white text-xl">( Вы ) </p>
                      )}
                    </div>
                  </div>

                  {/* Правая колонка */}
                  <div className="space-y-5">
                    <div className="bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-white/50 text-xl mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Дата создания</span>
                      </div>
                      <p className="text-white text-lg">{formatDateTime(project.created_at)}</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-5">
                      <div className="flex items-center gap-2 text-white/50 text-xl mb-2">
                        <User className="w-4 h-4" />
                        <span>Создатель</span>
                      </div>
                      <p className="text-white text-lg">
                        {project.created_by === user?.user_id 
                          ? `${user?.full_name || user?.username || '( Вы )'} `
                          : `ID: ${project.created_by.slice(0, 8)}...`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-3 gap-5 pt-4 border-t border-white/10">
                  <div className="text-center p-5 bg-white/5 rounded-xl">
                    <Users className="w-8 h-8 text-white-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-white">{project.memberships?.length || 0}</p>
                    <p className="text-white/50 text-xl mt-1">Участников</p>
                  </div>
                  <div className="text-center p-5 bg-white/5 rounded-xl">
                    <Ticket className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-white">{projectTickets.length}</p>
                    <p className="text-white/50 text-xl mt-1">Заявок</p>
                  </div>
                  <div className="text-center p-5 bg-white/5 rounded-xl">
                    <Clock className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <p className="text-3xl font-bold text-white">
                      {projectTickets.filter(t => t.status !== 'Закрыт' && t.status !== 'Решён').length}
                    </p>
                    <p className="text-white/50 text-xl mt-1">Активных</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-white-400" />
                    Участники проекта
                  </h2>
                  {canEdit && (
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors text-xl">
                      <UserPlus className="w-5 h-5" />
                      Добавить
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                {loadingMembers ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-20 h-20 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50 text-xl">Нет участников</p>
                    <p className="text-white/30 text-xl mt-2">Добавьте первых участников в проект</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member: any) => {
                      const isCurrentUser = member.user_id === user?.user_id;
                      const roleInfo = getRoleColor(member.project_role);
                      const userData = member.user;
                      
                      return (
                        <div 
                          key={member.user_id}
                          className={`flex items-center gap-5 p-4 rounded-xl transition-all ${
                            isCurrentUser 
                              ? 'bg-gradient-to-r from-white-500/10 to-white-600/5 border border-white-500/30' 
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {/* Аватар */}
                          {userData?.avatar_url ? (
                            <img 
                              src={userData.avatar_url} 
                              alt=""
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white-700 to-white-800 flex items-center justify-center">
                              <User className="w-7 h-7 text-white" />
                            </div>
                          )}
                          
                          {/* Информация */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="text-white font-semibold text-xl">
                                {userData?.full_name || userData?.username || 'Пользователь'}
                              </p>
                              {isCurrentUser && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                  Вы
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <a href={`mailto:${userData?.email}`} className="text-white/50 text-xl hover:text-white transition-colors flex items-center gap-1">
                                <AtSign className="w-3.5 h-3.5" />
                                {userData?.email}
                              </a>
                              {userData?.phone && (
                                <a href={`tel:${userData.phone}`} className="text-white/50 text-xl hover:text-white transition-colors flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5" />
                                  {userData.phone}
                                </a>
                              )}
                            </div>
                          </div>
                          
                          {/* Роль */}
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xl font-medium border ${roleInfo}`}>
                            {member.project_role === 'owner' && <Crown className="w-4 h-4" />}
                            {getRoleLabel(member.project_role)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Ticket className="w-6 h-6 text-white-400" />
                    Заявки проекта
                  </h2>
                  <Link
                    to={`/tickets/new?project_id=${project.id}`}
                    className="btn-primary py-2.5 px-5 text-xl flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Создать заявку
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {loadingTickets ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-white/30" />
                  </div>
                ) : projectTickets.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="w-20 h-20 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50 text-xl mb-2">Нет заявок</p>
                    <p className="text-white/30 text-xl">В этом проекте пока нет заявок</p>
                    <Link
                      to={`/tickets/new?project_id=${project.id}`}
                      className="inline-block mt-4 text-white-400 hover:text-white-300 transition-colors text-xl"
                    >
                      Создать первую заявку →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        to={`/tickets/${ticket.number}`}
                        className="block p-5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="text-white-400 font-mono text-xl bg-white-500/10  px-2 py-0.5 rounded">
                                #{ticket.number}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xl font-medium border ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xl font-medium border ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <h4 className="text-white font-semibold text-xl group-hover:text-white-400 transition-colors">
                              {ticket.title}
                            </h4>
                            <p className="text-white/40 text-xl mt-2 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(ticket.created_at)}
                            </p>
                          </div>
                          <ChevronRight className="w-6 h-6 text-white/30 group-hover:text-white-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Краткая информация */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <Settings className="w-5 h-5 text-white/60" />
              Краткая информация
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-xl">Ключ проекта</span>
                <span className="text-white-400 font-mono text-xl">{project.key}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-xl">Статус</span>
                <span className={`px-2 py-0.5 rounded-lg text-xl font-medium border ${
                  project.status === 'active' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'
                }`}>
                  {project.status === 'active' ? 'Активен' : 'Архивирован'}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/50 text-xl">Участников</span>
                <span className="text-white font-bold text-2xl">{project.memberships?.length || 0}</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-white/50 text-xl">Заявок</span>
                <span className="text-white font-bold text-2xl">{projectTickets.length}</span>
              </div>
            </div>
          </div>

          {/* Организация */}
          {counterparty && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white/60" />
                Организация
              </h3>
              
              <div className="space-y-3">
                <p className="text-white/80 font-semibold text-xl">{counterparty.name}</p>
                <p className="text-white/80 text-xl">{counterparty.legal_name}</p>
                {counterparty.inn && (
                  <p className="text-white/80 text-xl mt-2">ИНН: {counterparty.inn}</p>
                )}
                {counterparty.phone && (
                  <a href={`tel:${counterparty.phone}`} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xl mt-3">
                    <Phone className="w-4 h-4" />
                    {counterparty.phone}
                  </a>
                )}
                {counterparty.email && (
                  <a href={`mailto:${counterparty.email}`} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xl break-all">
                    <Mail className="w-4 h-4" />
                    {counterparty.email}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}