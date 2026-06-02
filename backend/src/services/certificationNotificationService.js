import { getArgentinaTodayDateParts, parseDateInputToParts, toUtcDayNumber } from '../utils/argentinaDateUtils.js';

const WEEKLY_WINDOW_START_DAYS = 45;
const WEEKLY_WINDOW_MIN_DAYS = 2;
const WEEKLY_INTERVAL_DAYS = 7;

export function getCertificationNotificationTrigger(expirationDate, now = new Date()) {
  const expirationParts = parseDateInputToParts(expirationDate);
  if (!expirationParts) {
    return {
      status: 'active',
      shouldNotify: false,
      triggerType: null,
      daysUntilExpiration: Number.NaN,
      humanTriggerLabel: 'Sin aviso para hoy'
    };
  }

  const todayParts = getArgentinaTodayDateParts(now);
  const expirationDay = toUtcDayNumber(expirationParts);
  const todayDay = toUtcDayNumber(todayParts);
  const daysUntilExpiration = expirationDay - todayDay;

  if (daysUntilExpiration < 0) {
    return {
      status: 'expired',
      shouldNotify: false,
      triggerType: null,
      daysUntilExpiration,
      humanTriggerLabel: 'Vencida'
    };
  }

  if (daysUntilExpiration === 0) {
    return {
      status: 'expires_today',
      shouldNotify: true,
      triggerType: 'urgent_warning',
      daysUntilExpiration,
      humanTriggerLabel: 'Vence hoy'
    };
  }

  if (daysUntilExpiration === 1) {
    return {
      status: 'expires_tomorrow',
      shouldNotify: true,
      triggerType: 'urgent_warning',
      daysUntilExpiration,
      humanTriggerLabel: 'Vence mañana'
    };
  }

  const isInsideWeeklyWindow = (
    daysUntilExpiration >= WEEKLY_WINDOW_MIN_DAYS
    && daysUntilExpiration <= WEEKLY_WINDOW_START_DAYS
  );

  if (isInsideWeeklyWindow) {
    const weeklySlot = Math.floor((WEEKLY_WINDOW_START_DAYS - daysUntilExpiration) / WEEKLY_INTERVAL_DAYS);
    return {
      status: 'upcoming_expiration',
      shouldNotify: true,
      triggerType: `weekly_window_slot_${weeklySlot}`,
      daysUntilExpiration,
      humanTriggerLabel: `Vence en ${daysUntilExpiration} días`
    };
  }

  return {
    status: 'active',
    shouldNotify: false,
    triggerType: null,
    daysUntilExpiration,
    humanTriggerLabel: 'Sin aviso para hoy'
  };
}

export function enrichCertificationWithNotification(certification = {}, now = new Date()) {
  const notification = getCertificationNotificationTrigger(certification.expiration_date, now);
  return {
    id: certification.id,
    name: certification.name || '',
    type: certification.type || '',
    module: certification.module || '',
    description: certification.description || '',
    url: certification.url || '',
    expirationDate: certification.expiration_date || null,
    responsibleArea: certification.responsible_area || '',
    responsiblePerson: certification.responsible_person || '',
    createdBy: certification.created_by || null,
    createdAt: certification.created_at || null,
    updatedAt: certification.updated_at || null,
    status: notification.status,
    shouldNotify: notification.shouldNotify,
    triggerType: notification.triggerType,
    daysUntilExpiration: notification.daysUntilExpiration,
    humanTriggerLabel: notification.humanTriggerLabel || 'Sin aviso para hoy',
    notificationMessage: notification.humanTriggerLabel || 'Sin aviso para hoy'
  };
}
