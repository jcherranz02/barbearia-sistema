export interface Barber {
  id: string;
  name: string;
  active: boolean; // whether accepting new clients
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  type: 'adult' | 'kids';
}

export interface ChatMessage {
  id: string;
  sender: 'client' | 'barber';
  text: string;
  timestamp: string;
}

export interface QueueTicket {
  id: string;
  number: string; // e.g. "#001"
  name: string;
  adultsCount: number;
  kidsCount: number;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  estimatedTime: number; // duration in minutes
  price: number;
  status: 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CHAMADO' | 'FINALIZADO' | 'CANCELADO' | 'NAO_COMPARECEU';
  createdAt: string; // ISO string
  calledAt?: string; // when status changed to EM_ATENDIMENTO
  completedAt?: string; // when status changed to FINALIZADO
  messages?: ChatMessage[];
  stripeSessionId?: string;
  prepaidAmount?: number;
  accepted_terms?: boolean;
  checkedIn?: boolean;
  latitude?: number;
  longitude?: number;
  distanceToSalon?: number; // in meters (if < 1000m) or miles (or yards)
  checkedInAt?: string;
}

export interface BarbershopSettings {
  name: string;
  address: string;
  instagram: string;
  facebook: string;
  logoUrl: string;
  thankYouMessage: string;
  announcementDuration?: number;
  systemTestEnabled?: boolean;
  systemTestStartDate?: string;
  systemTestDurationDays?: number;
  systemTestPassword?: string;
  colorPalette?: string;
  backgroundTheme?: string;
  sendInstagram?: boolean;
  sendFacebook?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  servicePrice?: number;
  salonLatitude?: number;
  salonLongitude?: number;
  isOnline?: boolean;
}

export interface MasterCredentials {
  username: string;
  email?: string;
  passwordHash?: string;
  isFirstAccessDone: boolean;
  resetToken?: string;
  resetTokenExpires?: number;
}

export interface AppState {
  settings: BarbershopSettings;
  barbers: Barber[];
  services: Service[];
  tickets: QueueTicket[];
  masterCredentials?: MasterCredentials;
}

export interface Translation {
  liveQueue: string;
  filterByBarber: string;
  waiting: string;
  avgTime: string;
  getTicket: string;
  fullName: string;
  enterName: string;
  adults: string;
  kids: string;
  preferredBarber: string;
  estimatedTotal: string;
  save: string;
  cancel: string;
  inLine: string;
  trackPosition: string;
  yourTicket: string;
  barber: string;
  service: string;
  value: string;
  cancelTicket: string;
  ticketsAhead: string;
  appointmentTime: string;
  minutes: string;
  back: string;
  selectedBarber: string;
  loading: string;
  confirmCancel: string;
}

export const translations: Record<'pt-BR' | 'en-GB', Translation> = {
  'pt-BR': {
    liveQueue: 'FILA AO VIVO',
    filterByBarber: 'FILTRAR POR BARBEIRO',
    waiting: 'AGUARDANDO',
    avgTime: 'TEMPO MÉDIO',
    getTicket: 'PEGAR MINHA SENHA',
    fullName: 'SEU NOME',
    enterName: 'DIGITE SEU NOME',
    adults: 'ADULTOS',
    kids: 'CRIANÇAS',
    preferredBarber: 'BARBEIRO DE PREFERÊNCIA',
    estimatedTotal: 'TOTAL ESTIMADO',
    save: 'SALVAR',
    cancel: 'CANCELAR',
    inLine: 'VOCÊ ESTÁ NA FILA',
    trackPosition: 'acompanhe sua vez pelo painel',
    yourTicket: 'SUA SENHA',
    barber: 'BARBEIRO',
    service: 'SERVIÇO',
    value: 'VALOR',
    cancelTicket: 'CANCELAR MINHA SENHA',
    ticketsAhead: 'Pessoas na frente',
    appointmentTime: 'Horário previsto de atendimento',
    minutes: 'MINUTOS',
    back: 'VOLTAR',
    selectedBarber: 'Barbeiro Escolhido',
    loading: 'Carregando...',
    confirmCancel: 'Tem certeza que deseja cancelar sua senha?',
  },
  'en-GB': {
    liveQueue: 'LIVE QUEUE',
    filterByBarber: 'FILTER BY BARBER',
    waiting: 'WAITING',
    avgTime: 'AVG TIME',
    getTicket: 'GET MY TICKET',
    fullName: 'YOUR NAME',
    enterName: 'ENTER YOUR NAME',
    adults: 'ADULTS',
    kids: 'CHILDREN',
    preferredBarber: 'PREFERRED BARBER',
    estimatedTotal: 'ESTIMATED TOTAL',
    save: 'SAVE',
    cancel: 'CANCEL',
    inLine: "YOU'RE IN THE QUEUE",
    trackPosition: 'track your turn on the panel',
    yourTicket: 'YOUR TICKET',
    barber: 'BARBER',
    service: 'SERVICE',
    value: 'VALUE',
    cancelTicket: 'CANCEL MY TICKET',
    ticketsAhead: 'People in front of you',
    appointmentTime: 'Estimated service time',
    minutes: 'MINUTES',
    back: 'BACK',
    selectedBarber: 'Selected Barber',
    loading: 'Loading...',
    confirmCancel: 'Are you sure you want to cancel your ticket?',
  },
};
