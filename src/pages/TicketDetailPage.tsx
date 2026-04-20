import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Send, Clock, User, MessageSquare, FileText, History,
  Loader2, Paperclip, Download, Image, File, ChevronDown, ChevronUp,
  Hash, Calendar, UserPlus, UserCheck, UserX, CheckCircle2, X,
  Users, Search, Settings, AlertCircle, RefreshCw, Tag, ThumbsUp, Reply,
  Paperclip as PaperclipIcon, MessageCircle
} from 'lucide-react';
import { ticketsApi, usersApi } from '../api/client';
import { attachmentsApi } from '../api/attachments';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ui/use-toast';
import type { Ticket, CounterpartyCustomer, Comment, SimpleUser } from '../types';

// Матрица переходов статусов
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'Новый': ['На согласовании', 'Открыт'],
  'На согласовании': ['Открыт', 'Отклонён'],
  'Открыт': ['В работе', 'Ожидает ответа'],
  'В работе': ['Ожидает ответа', 'Решён'],
  'Ожидает ответа': ['В работе'],
  'Решён': ['Закрыт'],
  'Закрыт': ['Переоткрыт'],
  'Переоткрыт': ['Открыт', 'В работе'],
  'Отклонён': ['Закрыт'],
};

// Кто может изменять статусы
const STATUS_PERMISSIONS: Record<string, string[]> = {
  'Новый': ['support_agent', 'support_manager', 'admin'],
  'На согласовании': ['support_agent', 'support_manager', 'admin'], 
  'Открыт': ['support_agent', 'support_manager', 'executor', 'admin'],
  'В работе': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Ожидает ответа': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Решён': ['support_agent', 'support_manager', 'executor', 'admin'],
  'Закрыт': ['support_agent', 'support_manager', 'admin'],
  'Переоткрыт': ['support_agent', 'support_manager', 'admin'],
};

// Описание статусов
const STATUS_DESCRIPTIONS: Record<string, string> = {
  'Новый': 'Тикет только создан, ожидает обработки',
  'На согласовании': 'Тикет создан, но ещё не согласован заказчиком',
  'Открыт': 'Тикет согласован и готов к работе',
  'В работе': 'Над тикетом активно работают',
  'Ожидает ответа': 'Ждём ответа от клиента или другой стороны',
  'Решён': 'Работа выполнена, ждём подтверждения закрытия',
  'Закрыт': 'Тикет закрыт',
  'Переоткрыт': 'Тикет переоткрыт (проблема вернулась)',
  'Отклонён': 'Тикет отклонён (неактуален, дубликат и т.д.)',
};

// Кэш для маппинга номера → ID
let ticketNumberToIdCache: Map<string, string> | null = null;
let cacheLoadingPromise: Promise<void> | null = null;

export default function TicketDetailPage() {
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [commentsTotalItems, setCommentsTotalItems] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

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
  const [searchUser, setSearchUser] = useState('');

  const userRole = user?.role || '';
  const canChangeStatus = STATUS_PERMISSIONS[ticket?.status || '']?.includes(userRole) || false;

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [messageType, setMessageType] = useState<'public' | 'internal'>('public');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [supportUsers, setSupportUsers] = useState<SimpleUser[]>([]);
  const [loadingSupports, setLoadingSupports] = useState(false);
  
  // Состояния для комментариев
  const [commentSortOrder, setCommentSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const canAssign = ['support_agent', 'support_manager', 'admin'].includes(userRole) 
    && ['Открыт', 'В работе', 'Ожидает ответа', 'Решён'].includes(ticket?.status || '');

  // Загрузка пользователей поддержки
  const loadSupportUsers = async () => {
    setLoadingSupports(true);
    try {
      const response = await usersApi.getSupports(1, 100);
      setSupportUsers(response.items);
    } catch (error) {
      console.error('Failed to load support users:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось загрузить список исполнителей', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingSupports(false);
    }
  };

  useEffect(() => {
    if (canAssign) {
      loadSupportUsers();
    }
  }, [canAssign]);

  const getAssigneeName = () => {
    if (!ticket?.assigned_to) return null;
    const assignee = supportUsers.find(u => u.id === ticket.assigned_to);
    return assignee?.full_name || assignee?.username || assignee?.email;
  };

  const filteredUsers = supportUsers.filter(u => 
    !searchUser || 
    u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUser.toLowerCase())
  );

  const canWriteInternal = userRole === 'admin' || userRole === 'support_agent' || userRole === 'support_manager';
  
  // Форматирование относительного времени
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };
  
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'support_agent':
      case 'support_manager':
        return 'from-red-800 to-red-700';
      case 'customer_admin':
        return 'text-white/60';
      case 'executor':
        return 'from-green-600 to-green-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };
  
  const getAuthorName = (comment: Comment) => {
    switch (comment.author_role) {
      case 'admin': return 'Поддержка';
      case 'support_agent': return 'Агент поддержки';
      case 'support_manager': return 'Менеджер';
      case 'customer_admin': return 'Администратор контрагента';
      case 'executor': return 'Исполнитель';
      default: return 'Клиент';
    }
  };

  const isCurrentUser = (comment: Comment) => comment.author_id === user?.user_id;

  // Инициализация кэша
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

  // Загрузка комментариев с пагинацией
  const loadComments = async (ticketId: string, page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMoreComments(true);
    } else {
      setLoadingComments(true);
    }
    
    try {
      const response = await ticketsApi.getComments(ticketId, {
        include_internal: userRole === 'admin' || userRole === 'support_agent' || userRole === 'support_manager',
        page: page,
        size: 15
      });
      
      if (append) {
        setComments(prev => [...prev, ...response.items]);
      } else {
        setComments(response.items);
      }
      
      setCommentsTotalPages(response.total_pages);
      setCommentsTotalItems(response.total_items);
      setCommentsPage(response.page);
      setHasMoreComments(response.page < response.total_pages);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить комментарии', variant: 'destructive' });
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  // Загрузка следующих комментариев
  const loadMoreComments = useCallback(async () => {
    if (!ticket?.id) return;
    if (loadingMoreComments || !hasMoreComments) return;
    
    const nextPage = commentsPage + 1;
    await loadComments(ticket.id, nextPage, true);
  }, [ticket?.id, commentsPage, hasMoreComments, loadingMoreComments]);

  // Обработчик скролла для бесконечной загрузки
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // При скролле вверх (для старых комментариев)
    if (commentSortOrder === 'oldest' && scrollTop < 100 && hasMoreComments && !loadingMoreComments) {
      loadMoreComments();
    }
    
    // При скролле вниз (для новых комментариев)
    if (commentSortOrder === 'newest' && scrollTop + clientHeight >= scrollHeight - 100 && hasMoreComments && !loadingMoreComments) {
      loadMoreComments();
    }
  }, [commentSortOrder, hasMoreComments, loadingMoreComments, loadMoreComments]);

  // Загрузка тикета
  const loadTicketByNumber = async (number: string) => {
    setLoading(true);
    try {
      await initCache();
      const ticketId = ticketNumberToIdCache?.get(number);
      
      if (ticketId) {
        const data = await ticketsApi.getById(ticketId);
        setTicket(data);
        await loadComments(ticketId, 1, false);
      } else {
        try {
          const searchResponse = await ticketsApi.getAll(1, 100);
          const found = searchResponse.items.find(t => t.number === number);
          
          if (found) {
            const data = await ticketsApi.getById(found.id);
            setTicket(data);
            ticketNumberToIdCache?.set(number, found.id);
            await loadComments(found.id, 1, false);
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

  // Отправка комментария
  const handleSendMessage = async () => {
    if (!message.trim() || !ticket?.id || sending) return;
    setSending(true);
    
    try {
      await ticketsApi.addComment(ticket.id, message.trim(), messageType);
      setMessage('');
      await loadComments(ticket.id, 1, false);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({ 
        title: 'Ошибка', 
        description: 'Не удалось отправить сообщение', 
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };

  // Отправка ответа
  const handleSendReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !ticket?.id) return;
    
    try {
      await ticketsApi.addComment(ticket.id, replyText.trim(), messageType, parentCommentId);
      setReplyText('');
      setReplyingTo(null);
      await loadComments(ticket.id, 1, false);
      toast({ title: 'Успешно', description: 'Ответ добавлен' });
    } catch (error) {
      toast({ title: 'Ошибка', description: 'Не удалось добавить ответ', variant: 'destructive' });
    }
  };

  // Лайк (фронтенд)
  const handleLike = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Ответ на комментарий
  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyText('');
  };

  // Обработчик клавиш
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (replyingTo) {
        handleSendReply(replyingTo);
      } else {
        handleSendMessage();
      }
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

  // Загрузка превью изображений
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

  useEffect(() => {
    initCache();
  }, []);

  useEffect(() => {
    if (ticketNumber) {
      loadTicketByNumber(ticketNumber);
    }
  }, [ticketNumber]);

  const openPreview = (file: any) => setPreviewFile(file);
  const closePreview = () => setPreviewFile(null);

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
      'На согласовании': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Открыт': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'В работе': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Ожидает ответа': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Решён': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Закрыт': 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
      'Переоткрыт': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Отклонён': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
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

  const availableStatuses = STATUS_TRANSITIONS[ticket?.status || ''] || [];

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
        {/* Левая колонка */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            {[
              { id: 'details', label: 'Детали', icon: FileText },
              { id: 'chat', label: 'Обсуждение', icon: MessageCircle, count: commentsTotalItems },
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
            {/* Комментарии */}
            {activeTab === 'chat' && (
              <div className="flex flex-col">
                {/* Заголовок с сортировкой */}
                <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-5 h-5 text-white/60" />
                      <span className="text-white font-medium">
                        {commentsTotalItems} {commentsTotalItems === 1 ? 'комментарий' : commentsTotalItems < 5 ? 'комментария' : 'комментариев'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                        <button
                          onClick={() => setCommentSortOrder('newest')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            commentSortOrder === 'newest' 
                              ? 'bg-red-800/50 text-white' 
                              : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          Сначала новые
                        </button>
                        <button
                          onClick={() => setCommentSortOrder('oldest')}
                          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                            commentSortOrder === 'oldest' 
                              ? 'bg-red-800/50 text-white' 
                              : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          Сначала старые
                        </button>
                      </div>
                      
                      {canWriteInternal && (
                        <span className="text-xs text-white/40">🔒 Внутренние видны только сотрудникам</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Форма добавления комментария (вверху) */}
                <div className="p-5 border-b border-white/10 bg-white/3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-800 to-red-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Написать комментарий..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all text-sm resize-none"
                        rows={2}
                      />
                      
                      <div className="flex justify-end items-center gap-3 mt-2">
                        {canWriteInternal && (
                          <button
                            type="button"
                            onClick={() => setMessageType(messageType === 'public' ? 'internal' : 'public')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              messageType === 'internal'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {messageType === 'internal' ? '🔒 Внутренний' : '🌍 Публичный'}
                          </button>
                        )}
                        
                        <button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || sending}
                          className="px-5 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Отправить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Список комментариев с бесконечной прокруткой */}
                <div 
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[500px]"
                >
                  {loadingComments && comments.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
                    </div>
                  ) : comments.length > 0 ? (
                    <>
                      {commentSortOrder === 'newest' && loadingMoreComments && commentsPage > 1 && (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                        </div>
                      )}
                      
                      {[...comments]
                        .sort((a, b) => {
                          if (commentSortOrder === 'newest') {
                            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                          } else {
                            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                          }
                        })
                        .map((comment) => {
                          const isInternal = comment.type === 'internal';
                          const isLiked = likedComments.has(comment.id);
                          const isReplying = replyingTo === comment.id;
                          
                          return (
                            <div key={comment.id} className="group">
                              <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(comment.author_role)} flex items-center justify-center`}>
                                    <User className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-white">
                                      {getAuthorName(comment)}
                                    </span>
                                    <span className="text-xs text-white/40">
                                      {formatRelativeTime(comment.created_at)}
                                    </span>
                                    {comment.edited_at && (
                                      <span className="text-xs text-white/30">(изменён)</span>
                                    )}
                                    {isInternal && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                        Внутренний
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="text-white/90 text-sm mt-1.5 whitespace-pre-wrap break-words leading-relaxed">
                                    {comment.text}
                                  </p>
                                  
                                  <div className="flex items-center gap-5 mt-2">
                                    <button
                                      onClick={() => handleLike(comment.id)}
                                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                                        isLiked ? 'text-red-400' : 'text-white/40 hover:text-white/60'
                                      }`}
                                    >
                                      <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                      <span>{(comment.likes_count || 0) + (isLiked ? 1 : 0)}</span>
                                    </button>
                                    
                                    <button
                                      onClick={() => handleReply(comment.id)}
                                      className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
                                    >
                                      <Reply className="w-4 h-4" />
                                      <span>Ответить</span>
                                    </button>
                                  </div>
                                  
                                  {isReplying && (
                                    <div className="mt-3 flex gap-2">
                                      <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={`Ответить ${getAuthorName(comment)}...`}
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-red-500/50 text-sm resize-none"
                                        rows={2}
                                        autoFocus
                                      />
                                      <div className="flex flex-col gap-2">
                                        <button
                                          onClick={() => handleSendReply(comment.id)}
                                          disabled={!replyText.trim()}
                                          className="px-4 py-1.5 bg-red-800 hover:bg-red-700 rounded-lg text-white text-sm disabled:opacity-50"
                                        >
                                          Ответить
                                        </button>
                                        <button
                                          onClick={() => setReplyingTo(null)}
                                          className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm"
                                        >
                                          Отмена
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {comment.attachments && comment.attachments.length > 0 && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                      {comment.attachments.map((att) => (
                                        <button
                                          key={att.id}
                                          onClick={() => handleDownload(att.id)}
                                          className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          {att.original_filename}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      
                      {commentSortOrder === 'oldest' && loadingMoreComments && commentsPage > 1 && (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                        </div>
                      )}
                      
                      {!hasMoreComments && comments.length > 0 && (
                        <div className="text-center py-4 text-xs text-white/30">
                          {commentSortOrder === 'newest' ? 'Вы просмотрели все новые комментарии' : 'Вы просмотрели все комментарии'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-white/20" />
                      <p className="text-white/50 text-lg">Нет комментариев</p>
                      <p className="text-sm text-white/30 mt-1">Будьте первым, кто оставит комментарий</p>
                    </div>
                  )}
                </div>
              </div>
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
                            onClick={() => openPreview(file)}
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
                          
                          {loadingSupports ? (
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