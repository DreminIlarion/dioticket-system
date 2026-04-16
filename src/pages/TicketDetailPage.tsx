import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Send, Clock, User, MessageSquare, FileText, History,
  Loader2, Paperclip, Download, Image, File, ChevronDown, ChevronUp,
  Hash, Calendar, UserPlus, UserCheck, UserX, CheckCircle2, X,
  Users, Search, Settings, AlertCircle, RefreshCw, Tag,
  Paperclip as PaperclipIcon, MessageCircle
} from 'lucide-react';
import { ticketsApi, usersApi } from '../api/client';
import { attachmentsApi } from '../api/attachments';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ui/use-toast';
import type { Ticket, CounterpartyCustomer } from '../types';

// Матрица переходов статусов
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'Новый': ['Открыт'],
  'Открыт': ['В работе', 'Ожидает ответа'],
  'В работе': ['Ожидает ответа', 'Решён'],
  'Ожидает ответа': ['В работе'],
  'Решён': ['Закрыт', 'Переоткрыт'],
  'Закрыт': ['Переоткрыт'],
  'Переоткрыт': ['Открыт', 'В работе'],
};

// Кто может изменять статусы
const STATUS_PERMISSIONS: Record<string, string[]> = {
  'Новый': ['support_agent', 'support_manager', 'admin'],
  'Открыт': ['support_agent', 'support_manager', 'admin'],
  'В работе': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Ожидает ответа': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Решён': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Закрыт': ['support_agent', 'support_manager', 'admin'],
  'Переоткрыт': ['support_agent', 'support_manager', 'admin'],
};

// Описание статусов
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'Новый': 'Заявка только создана, ожидает рассмотрения',
  'Открыт': 'Заявка принята в работу',
  'В работе': 'Активная работа над заявкой',
  'Ожидает ответа': 'Ожидание ответа от клиента или другой стороны',
  'Решён': 'Работа выполнена, ожидает подтверждения',
  'Закрыт': 'Заявка закрыта',
  'Переоткрыт': 'Заявка переоткрыта после закрытия',
};

// Кэш для маппинга номера → ID (глобальный)
let ticketNumberToIdCache: Map<string, string> | null = null;
let cacheLoadingPromise: Promise<void> | null = null;

export default function TicketDetailPage() {
  // Превью изображений в карточках
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  // Модальное окно превью
  const [previewFile, setPreviewFile] = useState<any>(null);

  

  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'details' | 'history' | 'manage'>('chat');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState(false);
  
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingAssignee, setUpdatingAssignee] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CounterpartyCustomer[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  const userRole = user?.role || '';
  const canAssign = ['support_agent', 'support_manager', 'admin'].includes(userRole);
  const canChangeStatus = STATUS_PERMISSIONS[ticket?.status || '']?.includes(userRole) || false;

  // Загружаем кэш при монтировании компонента
  useEffect(() => {
    initCache();
  }, []);

  // Загружаем тикет по номеру
  useEffect(() => {
    if (ticketNumber) {
      loadTicketByNumber(ticketNumber);
    }
  }, [ticketNumber]);

  useEffect(() => {
    if (canAssign && ticket?.counterparty_id) loadCompanyUsers();
  }, [canAssign, ticket?.counterparty_id]);

  // Инициализация кэша (загружаем все тикеты один раз)
  const initCache = async () => {
    if (ticketNumberToIdCache) return;
    if (cacheLoadingPromise) return cacheLoadingPromise;
    
    cacheLoadingPromise = (async () => {
      ticketNumberToIdCache = new Map();
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        try {
          const response = await ticketsApi.getAll(page, 100);
          
          response.items.forEach((item: any) => {
            if (item.number && item.id) {
              ticketNumberToIdCache!.set(item.number, item.id);
            }
          });
          
          hasMore = response.items.length === 100;
          page++;
        } catch (error) {
          console.error('Failed to load cache page:', error);
          hasMore = false;
        }
      }
    })();
    
    return cacheLoadingPromise;
  };

  // Загрузка тикета по номеру
  const loadTicketByNumber = async (number: string) => {
    setLoading(true);
    try {
      await initCache();
      
      const ticketId = ticketNumberToIdCache?.get(number);
      
      if (ticketId) {
        const data = await ticketsApi.getById(ticketId);
        setTicket(data);
      } else {
        try {
          const searchResponse = await ticketsApi.getAll(1, 100);
          const found = searchResponse.items.find(t => t.number === number);
          
          if (found) {
            const data = await ticketsApi.getById(found.id);
            setTicket(data);
            ticketNumberToIdCache?.set(number, found.id);
          } else {
            toast({ title: 'Ошибка', description: 'Заявка не найдена', variant: 'destructive' });
            navigate('/tickets');
          }
        } catch {
          toast({ title: 'Ошибка', description: 'Заявка не найдена', variant: 'destructive' });
          navigate('/tickets');
        }
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить заявку', variant: 'destructive' });
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyUsers = async () => {
    if (!ticket?.counterparty_id) return;
    setLoadingUsers(true);
    try {
      const response = await usersApi.getCustomers(ticket.counterparty_id, 1, 100);
      setCompanyUsers(response.items);
    } catch (error) {
      console.error('Failed to load company users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !ticket?.id) return;
    setSending(true);
    try {
      await ticketsApi.addComment(ticket.id, message.trim());
      setMessage('');
      toast({ title: 'Успешно', description: 'Сообщение отправлено' });
      loadTicketByNumber(ticketNumber!);
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (attachmentId: string) => {
    setDownloadingId(attachmentId);
    try {
      await attachmentsApi.downloadAttachment(attachmentId);
      toast({ title: 'Успешно', description: 'Файл скачан' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось скачать файл', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!canChangeStatus || !ticket) {
      toast({ title: 'Ошибка', description: 'У вас нет прав для изменения статуса', variant: 'destructive' });
      return;
    }
    setUpdatingStatus(true);
    try {
      const updatedTicket = await ticketsApi.updateTicketStatus(ticket.id, newStatus as any);
      setTicket(updatedTicket);
      toast({ title: 'Успешно', description: `Статус изменён на "${newStatus}"` });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.response?.status === 403 ? 'Недостаточно прав' : 'Не удалось изменить статус', variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssign = async (assigneeId: string | null) => {
    if (!ticket) return;
    setUpdatingAssignee(true);
    try {
      const updatedTicket = await ticketsApi.assignTicket(ticket.id, assigneeId || '');
      setTicket(updatedTicket);
      setShowAssigneeDropdown(false);
      setSearchUser('');
      toast({ title: 'Успешно', description: assigneeId ? 'Исполнитель назначен' : 'Исполнитель снят' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: 'Не удалось назначить исполнителя', variant: 'destructive' });
    } finally {
      setUpdatingAssignee(false);
    }
  };

  useEffect(() => {
    if (!ticket?.attachments) return;

    ticket.attachments.forEach(async (file) => {
      if (!file.mime_type.startsWith('image/') || imagePreviews[file.id]) return;

      try {
        const { download_url } = await attachmentsApi.getPresignedDownloadUrl(file.id);
        
        let url = download_url;
        if (url.includes('minio:9000') || url.includes('maildev:9000')) {
          url = url.replace(/http:\/\/(minio|maildev):9000/g, 'http://localhost:9900');
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        setImagePreviews(prev => ({ ...prev, [file.id]: objectUrl }));
      } catch (err) {
        console.error(`Failed to load preview for ${file.original_filename}`, err);
      }
    });
  }, [ticket?.attachments]);

  // Новые функции для превью
  const openPreview = (file: any) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
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





  const getAssigneeName = () => {
    if (!ticket?.assigned_to) return null;
    const assignee = companyUsers.find(u => u.id === ticket.assigned_to);
    return assignee?.full_name || assignee?.username || assignee?.email;
  };

  const availableStatuses = STATUS_TRANSITIONS[ticket?.status || ''] || [];
  const filteredUsers = companyUsers.filter(u => 
    !searchUser || 
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 text-xl mb-4">Заявка не найдена</p>
          <Link to="/tickets" className="inline-flex px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-5">
        <button 
          onClick={() => navigate(-1)} 
          className="p-3 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 mt-1"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-white/40" />
              <span className="text-white/60 text-xl font-mono">{ticket.number || 'Номер не указан'}</span>
            </div>
            <span className={`px-4 py-1.5 rounded-xl text-l font-medium border ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`px-4 py-1.5 rounded-xl text-l font-medium border ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">{ticket.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-base text-white/40">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Создана: {formatDate(ticket.created_at)}</span>
            </div>
            {ticket.closed_at && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Закрыта: {formatDate(ticket.closed_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Левая колонка - основной контент */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            {[
              { id: 'details', label: 'Детали', icon: FileText },
              { id: 'chat', label: 'Обсуждение', icon: MessageCircle, count: ticket.comments?.length },
              { id: 'history', label: 'История', icon: History, count: ticket.history?.length },
              { id: 'manage', label: 'Управление', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

          {/* Tab Content */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            {/* Чат */}
            {activeTab === 'chat' && (
              <>
                <div className="h-[500px] overflow-y-auto p-6 space-y-5">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    ticket.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-base font-medium text-white">
                              {comment.author_role === 'admin' ? 'Поддержка' : 
                               comment.author_role === 'customer_admin' ? 'Администратор' : 
                               comment.author_role === 'executor' ? 'Исполнитель' : 'Пользователь'}
                            </span>
                            <span className="text-l text-white/40">
                              {formatDate(comment.created_at)}
                            </span>
                            {comment.type === 'internal' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                Внутренний
                              </span>
                            )}
                          </div>
                          <p className="text-white/80 text-base leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16">
                      <MessageCircle className="w-20 h-20 mx-auto mb-5 text-white/20" />
                      <p className="text-white/50 text-xl">Нет сообщений</p>
                      <p className="text-base text-white/30 mt-2">Будьте первым, кто напишет</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-5 border-t border-white/10 bg-white/5">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="flex-1 px-5 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 transition-colors text-base"
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || sending}
                      className="px-8 py-3 bg-red-800 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors flex items-center gap-2"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      <span>Отправить</span>
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Детали */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-white/60" />
                    Описание
                  </h3>
                  <div className="bg-white/5 rounded-xl p-6">
                    <p className="text-white text-xl leading-relaxed whitespace-pre-wrap">
                      {ticket.description || 'Описание отсутствует'}
                    </p>
                  </div>
                </div>

                {ticket.tags && ticket.tags.length > 0 && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                      <Tag className="w-6 h-6 text-white/60" />
                      Теги
                    </h3>
                    <div className="flex text-xl flex-wrap gap-3">
                      {ticket.tags.map((tag) => (
                        <span
                          key={tag.name}
                          className="px-4 py-2 rounded-xl font-medium"
                          style={{ 
                            backgroundColor: tag.color ? `${tag.color}20` : 'rgba(255,255,255,0.1)',
                            color: tag.color || '#d1d5db'
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Вложения — превью прямо в карточке (правильная версия) */}
<div>
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
      <PaperclipIcon className="w-6 h-6 text-white/60" />
      Вложения ({ticket.attachments?.length || 0})
    </h3>
  </div>

  {!ticket.attachments || ticket.attachments.length === 0 ? (
    <div className="text-center py-12 text-white/40 bg-white/5 rounded-2xl">
      <PaperclipIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
      <p className="text-lg">Нет прикреплённых файлов</p>
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ticket.attachments.map((file) => {
        const isImage = file.mime_type.startsWith('image/');

        return (
          <div
            key={file.id}
            onClick={() => openPreview(file)}           // ← теперь открывает модалку
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-white/30 transition-all cursor-pointer"
          >
            <div className="h-52 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
              {isImage && imagePreviews[file.id] ? (
                <img
                  src={imagePreviews[file.id]}
                  alt={file.original_filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : isImage ? (
                <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
              ) : (
                <div className="text-6xl text-white/30">
                  {getFileIcon(file.mime_type)}
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-white text-sm line-clamp-2 font-medium">
                  {file.original_filename}
                </p>
              </div>
            </div>

            <div className="p-3 flex justify-between items-center">
              <div className="text-xs text-white/40">
                {formatFileSize(file.size_bytes)}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(file.id); }}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
              </div>
            )}

            {/* История */}
            {activeTab === 'history' && (
              <div className="p-6">
                <div className="space-y-5">
                  {(ticket.history || []).slice(0, expandedHistory ? undefined : 5).map((entry, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-xl font-medium">{entry.description}</p>
                        <p className="text-white/50 text-l mt-1">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {(ticket.history?.length || 0) > 5 && (
                    <button
                      onClick={() => setExpandedHistory(!expandedHistory)}
                      className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-l mt-4"
                    >
                      {expandedHistory ? (
                        <>Скрыть <ChevronUp className="w-4 h-4" /></>
                      ) : (
                        <>Показать все ({ticket.history?.length}) <ChevronDown className="w-4 h-4" /></>
                      )}
                    </button>
                  )}

                  {(!ticket.history || ticket.history.length === 0) && (
                    <div className="text-center py-16">
                      <History className="w-20 h-20 mx-auto mb-5 text-white/20" />
                      <p className="text-white/50 text-xl">История изменений пуста</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Управление */}
            {activeTab === 'manage' && (
              <div className="p-6 space-y-8">
                {/* Текущий статус */}
                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      Текущий статус
                    </h3>
                    <span className={`px-4 py-1.5 rounded-xl text-base font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-white/60 text-base">{STATUS_DESCRIPTIONS[ticket.status] || ''}</p>
                </div>

                {/* Изменение статуса */}
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-5 flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-blue-400" />
                    Изменить статус
                  </h3>
                  
                  {!canChangeStatus ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-center gap-4">
                      <AlertCircle className="w-6 h-6 text-yellow-400" />
                      <p className="text-yellow-400/80 text-base">У вас нет прав для изменения статуса этой заявки</p>
                    </div>
                  ) : availableStatuses.length === 0 ? (
                    <div className="bg-white/5 rounded-xl p-8 text-center">
                      <p className="text-white/50 text-lg">Нет доступных статусов для перехода</p>
                      <p className="text-white/30 text-base mt-2">Из текущего статуса "{ticket.status}" нельзя перейти в другой</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-white/60 text-base">Выберите новый статус:</p>
                      <div className="grid grid-cols-2 gap-4">
                        {availableStatuses.map((status) => {
                          let bgClass = 'bg-white/10 hover:bg-white/20';
                          let icon = null;
                          
                          if (status === 'Решён') {
                            bgClass = 'bg-green-500/20 hover:bg-green-500/30 text-green-400';
                            icon = <CheckCircle2 className="w-5 h-5" />;
                          } else if (status === 'Закрыт') {
                            bgClass = 'bg-neutral-500/20 hover:bg-neutral-500/30 text-neutral-400';
                          } else if (status === 'В работе') {
                            bgClass = 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400';
                            icon = <Clock className="w-5 h-5" />;
                          } else if (status === 'Переоткрыт') {
                            bgClass = 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400';
                          }
                          
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(status)}
                              disabled={updatingStatus}
                              className={`flex items-center justify-center gap-3 px-5 py-3 rounded-xl font-medium transition-all ${bgClass} disabled:opacity-50 disabled:cursor-not-allowed text-base`}
                            >
                              {icon}
                              {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Назначение исполнителя */}
                {canAssign && (
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-5 flex items-center gap-3">
                      <UserCheck className="w-6 h-6 text-blue-400" />
                      Назначение исполнителя
                    </h3>
                    
                    <div className="bg-white/5 rounded-xl p-6">
                      {ticket.assigned_to ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-700 to-red-800 flex items-center justify-center">
                              <User className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-semibold text-xl">{getAssigneeName() || 'Исполнитель'}</p>
                              <p className="text-white/40 text-l">Текущий исполнитель</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            className="text-base text-red-400 hover:text-red-300 flex items-center gap-2"
                          >
                            {showAssigneeDropdown ? 'Скрыть' : 'Изменить'}
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <p className="text-white/50 text-lg mb-4">Исполнитель не назначен</p>
                          <button
                            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                            className="px-5 py-2.5 rounded-xl bg-red-800/50 hover:bg-red-700 text-white transition-colors text-base"
                          >
                            <UserPlus className="w-5 h-5 inline mr-2" />
                            Назначить исполнителя
                          </button>
                        </div>
                      )}

                      {showAssigneeDropdown && (
                        <div className="mt-5 pt-5 border-t border-white/10">
                          <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                            <input
                              type="text"
                              value={searchUser}
                              onChange={(e) => setSearchUser(e.target.value)}
                              placeholder="Поиск сотрудника..."
                              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 transition-colors text-base"
                            />
                          </div>
                          
                          {loadingUsers ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                            </div>
                          ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-6 text-white/40 text-base">
                              Нет доступных сотрудников
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              <button
                                onClick={() => handleAssign(null)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left text-red-400"
                              >
                                <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
                                  <X className="w-5 h-5" />
                                </div>
                                <span className="text-base">Снять назначение</span>
                              </button>
                              {filteredUsers.map((employee) => (
                                <button
                                  key={employee.id}
                                  onClick={() => handleAssign(employee.id)}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                                >
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-700 to-red-800 flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium text-base truncate">
                                      {employee.full_name || employee.username}
                                    </p>
                                    <p className="text-white/40 text-l truncate">{employee.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - Информация */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-2xl font-semibold text-white mb-5 flex items-center gap-3">
              <FileText className="w-6 h-6 text-white/60" />
              Информация о заявке
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50 text-xl">Номер</span>
                <span className="text-white font-mono text-xl">{ticket.number || '—'}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50 text-xl">Статус</span>
                <span className={`px-3 py-1 rounded-lg text-l font-medium border ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/50 text-xl">Приоритет</span>
                <span className={`px-3 py-1 rounded-lg text-l font-medium border ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>

              <div className="pt-3">
                <span className="text-white/50 text-xl block mb-2">Создана</span>
                <span className="text-white text-xl">{formatDate(ticket.created_at)}</span>
              </div>

              {ticket.closed_at && (
                <div>
                  <span className="text-white/50 text-xl block mb-2">Закрыта</span>
                  <span className="text-white text-xl">{formatDate(ticket.closed_at)}</span>
                </div>
              )}

              <div>
                <span className="text-white/50 text-xl block mb-2">Обновлена</span>
                <span className="text-white text-xl">{formatDate(ticket.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h3 className="text-2xl font-semibold text-white mb-5 flex items-center gap-3">
              <User className="w-6 h-6 text-white/60" />
              Автор
            </h3>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-800 to-red-700 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-lg">{ticket.reporter?.full_name || ticket.reporter?.username || 'Пользователь'}</p>
                <p className="text-base text-white/40">{ticket.reporter?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Модальное окно превью */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" 
          onClick={closePreview}
        >
          <div 
            className="bg-zinc-900 rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
              <h3 className="text-lg font-medium text-white truncate pr-8">
                {previewFile.original_filename}
              </h3>
              <button 
                onClick={closePreview} 
                className="text-white/70 hover:text-white text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black p-6 overflow-auto">
              {previewFile.mime_type.startsWith('image/') ? (
                <img
                  src={imagePreviews[previewFile.id] || ''}
                  alt={previewFile.original_filename}
                  className="max-h-[80vh] max-w-full object-contain rounded-2xl"
                />
              ) : (
                <div className="text-center">
                  <File className="w-24 h-24 mx-auto mb-6 text-white/30" />
                  <p className="text-2xl text-white mb-3">Предпросмотр недоступен</p>
                  <button 
                    onClick={() => handleDownload(previewFile.id)}
                    className="mt-6 px-10 py-3.5 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-medium"
                  >
                    Скачать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  