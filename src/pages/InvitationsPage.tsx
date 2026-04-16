import { useState, useEffect } from 'react';
import { 
  Mail, 
  Send,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2,
  Users,
  Shield,
  UserPlus
} from 'lucide-react';
import { invitationsApi, counterpartiesApi } from '../api/client';
import type { Counterparty, Invitation, UserRole } from '../types';

const INVITABLE_ROLES: { value: UserRole; label: string; desc: string; needsCounterparty: boolean }[] = [
  { value: 'customer', label: 'Клиент', desc: 'Может создавать заявки', needsCounterparty: true },
  { value: 'customer_admin', label: 'Админ клиента', desc: 'Управляет заявками организации', needsCounterparty: true },
  { value: 'support_agent', label: 'Агент поддержки', desc: 'Обрабатывает заявки', needsCounterparty: false },
  { value: 'support_manager', label: 'Менеджер', desc: 'Управляет командой', needsCounterparty: false },
  { value: 'executor', label: 'Исполнитель', desc: 'Выполняет задачи', needsCounterparty: false },
];

export default function InvitationsPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const selectedRole = INVITABLE_ROLES.find(r => r.value === role);
  const needsCounterparty = selectedRole?.needsCounterparty || false;

  useEffect(() => {
    loadCounterparties();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadInvitations();
    }
  }, [activeTab, page]);

  const loadCounterparties = async () => {
    try {
      const response = await counterpartiesApi.getAll(1, 100);
      setCounterparties(response.items);
    } catch (e) {
      console.error('Failed to load counterparties:', e);
    }
  };

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const response = await invitationsApi.getAll(page, 10);
      setInvitations(response.items);
      setTotalPages(response.total_pages);
    } catch (e) {
      console.error('Failed to load invitations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!email || !role) return;
    if (needsCounterparty && !counterpartyId) return;

    setSending(true);
    setError('');
    setSuccess(false);

    try {
      await invitationsApi.send({
        email,
        assigned_role: role as UserRole,
        counterparty_id: needsCounterparty ? counterpartyId : undefined,
      });
      setSuccess(true);
      setEmail('');
      setRole('');
      setCounterpartyId('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка отправки приглашения');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Отозвать приглашение?')) return;
    try {
      await invitationsApi.delete(id);
      loadInvitations();
    } catch (e) {
      console.error('Failed to revoke:', e);
    }
  };

  const getRoleLabel = (role: string) => {
    return INVITABLE_ROLES.find(r => r.value === role)?.label || role;
  };

  const getInvitationStatus = (inv: Invitation) => {
    if (inv.is_used) return { label: 'Принято', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 };
    if (new Date(inv.expires_at) < new Date()) return { label: 'Истекло', color: 'bg-red-500/20 text-red-400', icon: XCircle };
    return { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock };
  };

  return (
    <div className=" space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Приглашения</h1>
        <p className="text-xl text-white/60">Пригласите новых пользователей в систему</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-3 px-6 py-4 rounded-xl text-xl font-medium transition-colors ${
            activeTab === 'send'
              ? 'bg-red-800 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <Send className="w-5 h-5" />
          Отправить
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-3 px-6 py-4 rounded-xl text-xl font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-red-800 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <History className="w-5 h-5" />
          История
        </button>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2">
          {activeTab === 'send' && (
            <div className="glass-card p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-red-800/30 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Новое приглашение</h2>
                  <p className="text-base text-white/60">Заполните данные для отправки</p>
                </div>
              </div>

              {success && (
                <div className="mb-6 p-5 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <p className="text-xl text-green-400">Приглашение успешно отправлено!</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <p className="text-xl text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Email */}
                <div>
                  <label className="block text-xl font-medium text-white mb-3">
                    Email адрес <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="example@company.ru"
                      className="input-field pl-14 py-5 text-xl"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xl font-medium text-white mb-4">
                    Роль пользователя <span className="text-red-400">*</span>
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {INVITABLE_ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => {
                          setRole(r.value);
                          if (!r.needsCounterparty) setCounterpartyId('');
                        }}
                        className={`p-5 rounded-xl border-2 text-left transition-all ${
                          role === r.value
                            ? 'bg-red-800/20 border-red-700 text-white'
                            : 'bg-white/5 border-transparent hover:bg-white/10 text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {r.needsCounterparty ? (
                            <Building2 className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Shield className="w-5 h-5 text-purple-400" />
                          )}
                          <span className="text-xl font-semibold">{r.label}</span>
                        </div>
                        <p className="text-base text-white/50">{r.desc}</p>
                        {r.needsCounterparty && (
                          <p className="text-sm text-blue-400 mt-2">Требуется контрагент</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Counterparty */}
                {needsCounterparty && (
                  <div>
                    <label className="block text-xl font-medium text-white mb-3">
                      Контрагент <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
                      <select
                        value={counterpartyId}
                        onChange={e => setCounterpartyId(e.target.value)}
                        className="select-field pl-14 py-5 text-xl"
                      >
                        <option value="">Выберите контрагента</option>
                        {counterparties.map(cp => (
                          <option key={cp.id} value={cp.id}>
                            {cp.name} — {cp.inn}
                          </option>
                        ))}
                      </select>
                    </div>
                    {counterparties.length === 0 && (
                      <p className="mt-3 text-base text-yellow-400">
                        Нет доступных контрагентов. Сначала создайте контрагента.
                      </p>
                    )}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSend}
                  disabled={sending || !email || !role || (needsCounterparty && !counterpartyId)}
                  className="w-full btn-primary py-5 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Отправить приглашение
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">История приглашений</h2>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-xl text-white/60">Нет приглашений</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {invitations.map(inv => {
                    const status = getInvitationStatus(inv);
                    return (
                      <div key={inv.id} className="p-6 hover:bg-white/5 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-xl font-medium text-white mb-2">{inv.email}</p>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="px-3 py-1.5 rounded-lg text-base font-medium bg-white/10 text-white/70">
                                {getRoleLabel(inv.assigned_role)}
                              </span>
                              <span className={`px-3 py-1.5 rounded-lg text-base font-medium ${status.color}`}>
                                <status.icon className="inline w-4 h-4 mr-1" />
                                {status.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-base text-white/50">
                                {new Date(inv.created_at).toLocaleDateString('ru-RU')}
                              </p>
                              <p className="text-sm text-white/30">
                                Истекает: {new Date(inv.expires_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                            {!inv.is_used && new Date(inv.expires_at) > new Date() && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                className="p-3 bg-red-900/50 rounded-xl hover:bg-red-600/30 text-white/50 hover:text-red-400 transition-colors"
                                title="Отозвать"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-white/10 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-xl text-white/70">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Как это работает?</h3>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-800/30 flex items-center justify-center text-xl font-bold text-red-400 flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-base font-medium text-white">Отправьте приглашение</p>
                  <p className="text-base text-white/50">Укажите email и роль пользователя</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-800/30 flex items-center justify-center text-xl font-bold text-red-400 flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-base font-medium text-white">Получатель получит письмо</p>
                  <p className="text-base text-white/50">Со ссылкой для регистрации</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-800/30 flex items-center justify-center text-xl font-bold text-red-400 flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-base font-medium text-white">Регистрация</p>
                  <p className="text-base text-white/50">Пользователь создаёт аккаунт</p>
                </div>
              </div>
            </div>
          </div>

          {/* Roles Info */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">О ролях</h3>
            </div>
            <div className="space-y-4 text-base">
              <div>
                <p className="font-medium text-blue-400">Клиенты</p>
                <p className="text-white/50">Создают и отслеживают заявки от имени своей организации</p>
              </div>
              <div>
                <p className="font-medium text-purple-400">Поддержка</p>
                <p className="text-white/50">Обрабатывают заявки, общаются с клиентами</p>
              </div>
              <div>
                <p className="font-medium text-orange-400">Исполнители</p>
                <p className="text-white/50">Выполняют технические задачи по заявкам</p>
              </div>
            </div>
          </div>

          {/* Important */}
          <div className="glass-card p-6 border-yellow-500/30">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Важно!</h3>
            </div>
            <p className="text-base text-white/60">
              Приглашение действительно <span className="text-white font-medium">7 дней</span>. 
              После истечения срока необходимо отправить новое приглашение.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
