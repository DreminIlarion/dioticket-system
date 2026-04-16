import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Briefcase, ArrowLeft, Save, Phone, Mail, MapPin, FileText, UserCircle, MessageSquare } from 'lucide-react';
import { counterpartiesApi } from '../api/client';
import type { CounterpartyType, CreateCounterpartyInput, ContactPersonInput } from '../types';

const COUNTERPARTY_TYPES: { value: CounterpartyType; label: string; icon: React.ReactNode }[] = [
  { value: 'Юридическое лицо', label: 'Юридическое лицо', icon: <Building2 className="w-8 h-8" /> },
  { value: 'Физическое лицо', label: 'Физическое лицо', icon: <User className="w-8 h-8" /> },
  { value: 'ИП', label: 'Индивидуальный предприниматель', icon: <Briefcase className="w-8 h-8" /> },
];

export default function NewCounterpartyPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState<CreateCounterpartyInput>({
    counterparty_type: 'Юридическое лицо',
    name: '',
    legal_name: '',
    inn: '',
    kpp: '',
    okpo: '',
    phone: '',
    email: '',
    address: '',
  });

  const [contactPerson, setContactPerson] = useState<ContactPersonInput>({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    email: '',
    messengers: {
      telegram: '',
      vk: '',
    },
  });

  const [includeContact, setIncludeContact] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data: CreateCounterpartyInput = {
        ...formData,
        contact_person: includeContact ? contactPerson : undefined,
      };
      await counterpartiesApi.create(data);
      navigate('/counterparties');
    } catch (error) {
      console.error('Ошибка создания контрагента:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isStep1Valid = formData.counterparty_type && formData.name && formData.legal_name && formData.inn;
  const isStep2Valid = true; // Адрес опционален

  return (
    <div className="  space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/counterparties')}
          className="p-3 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Новый контрагент</h1>
          <p className="text-lg text-neutral-400 mt-1">Заполните данные контрагента</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all ${
                step === s
                  ? 'bg-red-600 text-white'
                  : step > s
                  ? 'bg-green-600 text-white'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {s}
            </div>
            <span className={`text-base font-medium ${step >= s ? 'text-white' : 'text-neutral-500'}`}>
              {s === 1 ? 'Основное' : s === 2 ? 'Контакты' : 'Контактное лицо'}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-neutral-800" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-8">
          <div>
            <label className="block text-lg font-medium text-white mb-4">Тип контрагента</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COUNTERPARTY_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, counterparty_type: type.value })}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    formData.counterparty_type === type.value
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600'
                  }`}
                >
                  <div className={`mb-3 ${formData.counterparty_type === type.value ? 'text-red-400' : 'text-neutral-400'}`}>
                    {type.icon}
                  </div>
                  <span className={`text-lg font-medium ${formData.counterparty_type === type.value ? 'text-white' : 'text-neutral-300'}`}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                Краткое название <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ООО Компания"
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                Полное наименование <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                placeholder="Общество с ограниченной ответственностью «Компания»"
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                <FileText className="w-5 h-5 inline mr-2" />
                ИНН <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                placeholder={formData.counterparty_type === 'Юридическое лицо' ? '10 цифр' : '12 цифр'}
                maxLength={formData.counterparty_type === 'Юридическое лицо' ? 10 : 12}
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            {formData.counterparty_type === 'Юридическое лицо' && (
              <div>
                <label className="block text-lg font-medium text-white mb-3">КПП</label>
                <input
                  type="text"
                  value={formData.kpp}
                  onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                  placeholder="9 цифр"
                  maxLength={9}
                  className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-lg font-medium text-white mb-3">ОКПО</label>
              <input
                type="text"
                value={formData.okpo}
                onChange={(e) => setFormData({ ...formData, okpo: e.target.value })}
                placeholder="8 цифр"
                maxLength={8}
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="px-8 py-4 text-lg font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Contacts */}
      {step === 2 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                <Phone className="w-5 h-5 inline mr-2" />
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-lg font-medium text-white mb-3">
                <Mail className="w-5 h-5 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@company.ru"
                className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-medium text-white mb-3">
              <MapPin className="w-5 h-5 inline mr-2" />
              Адрес
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="г. Москва, ул. Примерная, д. 1"
              rows={3}
              className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-8 py-4 text-lg font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all"
            >
              Назад
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!isStep2Valid}
              className="px-8 py-4 text-lg font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Далее
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contact Person */}
      {step === 3 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-8">
          <div className="flex items-center justify-between p-5 bg-neutral-800/30 rounded-xl">
            <div className="flex items-center gap-4">
              <UserCircle className="w-8 h-8 text-neutral-400" />
              <div>
                <p className="text-lg font-medium text-white">Добавить контактное лицо</p>
                <p className="text-base text-neutral-400">Ответственный сотрудник контрагента</p>
              </div>
            </div>
            <button
              onClick={() => setIncludeContact(!includeContact)}
              className={`relative w-14 h-8 rounded-full transition-all ${
                includeContact ? 'bg-red-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                  includeContact ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {includeContact && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-lg font-medium text-white mb-3">Фамилия</label>
                  <input
                    type="text"
                    value={contactPerson.last_name}
                    onChange={(e) => setContactPerson({ ...contactPerson, last_name: e.target.value })}
                    placeholder="Иванов"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">Имя</label>
                  <input
                    type="text"
                    value={contactPerson.first_name}
                    onChange={(e) => setContactPerson({ ...contactPerson, first_name: e.target.value })}
                    placeholder="Иван"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">Отчество</label>
                  <input
                    type="text"
                    value={contactPerson.middle_name}
                    onChange={(e) => setContactPerson({ ...contactPerson, middle_name: e.target.value })}
                    placeholder="Иванович"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    <Phone className="w-5 h-5 inline mr-2" />
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={contactPerson.phone}
                    onChange={(e) => setContactPerson({ ...contactPerson, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    <Mail className="w-5 h-5 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactPerson.email}
                    onChange={(e) => setContactPerson({ ...contactPerson, email: e.target.value })}
                    placeholder="ivanov@company.ru"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-lg font-medium text-white mb-3">
                    <MessageSquare className="w-5 h-5 inline mr-2" />
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={contactPerson.messengers?.telegram || ''}
                    onChange={(e) => setContactPerson({ 
                      ...contactPerson, 
                      messengers: { ...contactPerson.messengers, telegram: e.target.value } 
                    })}
                    placeholder="@username"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-lg font-medium text-white mb-3">VK</label>
                  <input
                    type="text"
                    value={contactPerson.messengers?.vk || ''}
                    onChange={(e) => setContactPerson({ 
                      ...contactPerson, 
                      messengers: { ...contactPerson.messengers, vk: e.target.value } 
                    })}
                    placeholder="vk.com/id"
                    className="w-full px-5 py-4 text-lg bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-8 py-4 text-lg font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all"
            >
              Назад
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-6 h-6" />
              {isLoading ? 'Сохранение...' : 'Создать контрагента'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
