// pages/ProjectsPage.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, Search, Loader2, Building2, Users } from 'lucide-react';
import { projectsApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Project } from '../types';

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Роль фильтр для "Мои проекты"
  const [projectRole, setProjectRole] = useState<'all' | 'owner' | 'member'>('all');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isCustomerAdmin = user?.role === 'customer_admin';
  const isSupport = user?.role === 'support_agent' || user?.role === 'support_manager';
  const isAdmin = user?.role === 'admin';
  
  const canCreateProject = isSupport || isAdmin;

  useEffect(() => {
    loadProjects();
  }, [page, projectRole]);

const loadProjects = async () => {
  setLoading(true);
  try {
    let response;
    
    // Customer: использует getMyProjects
    if (isCustomer) {
      response = await projectsApi.getMyProjects(projectRole, page, 20);
    } 
    // Customer Admin: использует getAll (или другой API для проектов контрагента)
    else if (isCustomerAdmin) {
      response = await projectsApi.getAll(page, 20);
    }
    // Для остальных ролей - все проекты
    else {
      response = await projectsApi.getAll(page, 20);
    }
    
    setProjects(response.items || []);
    setTotalPages(response.total_pages || 1);
    setTotalItems(response.total_items || 0);
  } catch (error) {
    console.error('Failed to load projects:', error);
    setProjects([]);
  } finally {
    setLoading(false);
  }
};

  const filteredProjects = (projects || []).filter(project =>
    project?.name?.toLowerCase().includes(search.toLowerCase()) ||
    project?.key?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Получение количества участников (из memberships)
  const getParticipantsCount = (project: Project) => {
    if (!project.memberships) return 0;
    if (Array.isArray(project.memberships)) return project.memberships.length;
    return 0;
  };

  // Подсчёт общего количества участников по всем проектам
  const getTotalParticipants = () => {
    return projects.reduce((sum, project) => {
      return sum + getParticipantsCount(project);
    }, 0);
  };

  // Подсчёт активных проектов
  const getActiveProjectsCount = () => {
    return projects.filter(p => p?.status === 'active').length;
  };

  // Получение роли пользователя в проекте (для отображения)
  const getUserRoleInProject = (project: Project) => {
    if (!user?.user_id) return null;
    const membership = project.memberships?.find(m => m.user_id === user.user_id);
    return membership?.project_role || null;
  };

  const getRoleLabel = () => {
    switch (projectRole) {
      case 'owner': return 'Где я владелец';
      case 'member': return 'Где я участник';
      default: return 'Все мои проекты';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">
            {isCustomer ? 'Мои проекты' : 'Проекты'}
          </h1>
          <p className="text-white/60 mt-1">
            {isCustomer ? 'Проекты, в которых вы участвуете' : 'Управление проектами контрагента'}
          </p>
        </div>
        
        {canCreateProject && (
          <Link to="/projects/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Создать проект
          </Link>
        )}
      </div>

        {/* Search and Role Filter */}
      <div className=" mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или ключу проекта..."
              className="input-field pl-12 py-4 text-lg w-full"
            />
          </div>
          
          {/* Фильтр по роли - только для customer */}
          {isCustomer && (
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-lg transition-colors min-w-[200px] justify-between"
              >
                <span>{getRoleLabel()}</span>
                <svg className={`w-5 h-5 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showRoleDropdown && (
                <div className="absolute z-50 mt-2 w-full bg-[#1c1c1c] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                  <button
                    onClick={() => {
                      setProjectRole('all');
                      setShowRoleDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-5 py-3 hover:bg-white/10 transition-colors ${
                      projectRole === 'all' ? 'bg-red-500/20 text-red-400' : 'text-white'
                    }`}
                  >
                    Все мои проекты
                  </button>
                  <button
                    onClick={() => {
                      setProjectRole('owner');
                      setShowRoleDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-5 py-3 hover:bg-white/10 transition-colors ${
                      projectRole === 'owner' ? 'bg-red-500/20 text-red-400' : 'text-white'
                    }`}
                  >
                    Где я владелец
                  </button>
                  <button
                    onClick={() => {
                      setProjectRole('member');
                      setShowRoleDropdown(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-5 py-3 hover:bg-white/10 transition-colors ${
                      projectRole === 'member' ? 'bg-red-500/20 text-red-400' : 'text-white'
                    }`}
                  >
                    Где я участник
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
              <p className="text-white/50 text-l">Всего проектов</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{getActiveProjectsCount()}</p>
              <p className="text-white/50 text-l">Активных проектов</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{getTotalParticipants()}</p>
              <p className="text-white/50 text-l">Участников</p>
            </div>
          </div>
        </div>
      </div>

      

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-[18px] font-semibold text-white mb-2">Нет проектов</h3>
          <p className="text-white/50">
            {search ? 'Попробуйте изменить поисковый запрос' : 
             isCustomer ? 'Вы пока не участвуете ни в одном проекте' : 'Создайте первый проект'}
          </p>
          {canCreateProject && !search && (
            <Link to="/projects/new" className="btn-primary inline-flex items-center gap-2 mt-6">
              <Plus className="w-5 h-5" />
              Создать проект
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const userRole = getUserRoleInProject(project);
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="glass-card p-6 hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-white-400" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-semibold text-white group-hover:text-white-400 transition-colors">
                          {project.name || 'Без названия'}
                        </h3>
                        <p className="text-l text-white-400 font-mono">{project.key || '—'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-l font-medium ${
                      project.status === 'active' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {project.status === 'active' ? 'Активен' : 'Архивирован'}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-white/60 text-l mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Роль пользователя в проекте */}
                  {userRole && (
                    <div className="mb-3">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        userRole === 'owner' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {userRole === 'owner' ? 'Владелец' : 'Участник'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-l text-white/40 pt-4 border-t border-white/10">
                    <span>Создан: {formatDate(project.created_at)}</span>
                    <span>Участников: {getParticipantsCount(project)}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Назад
              </button>
              <span className="px-4 py-2 text-white/60">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}