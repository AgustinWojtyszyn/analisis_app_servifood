import { getArgentinaTodayDateParts, parseDateInputToParts, toUtcDayNumber } from '../utils/argentinaDateUtils.js';

export function getCertificationNotificationTrigger(expirationDate, now = new Date()) {
  const expirationParts = parseDateInputToParts(expirationDate);
  if (!expirationParts) {
    return {
      status: 'active',
      shouldNotify: false,
      triggerType: null,
      daysUntilExpiration: Number.NaN
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
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration === 1) {
    return {
      status: 'expires_tomorrow',
      shouldNotify: true,
      triggerType: 'one_day_before',
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration === 7) {
    return {
      status: 'expires_in_7_days',
      shouldNotify: true,
      triggerType: 'seven_days_before',
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration >= 2 && daysUntilExpiration <= 7) {
    return {
      status: 'near_expiration',
      shouldNotify: false,
      triggerType: null,
      daysUntilExpiration
    };
  }

  return {
    status: 'active',
    shouldNotify: false,
    triggerType: null,
    daysUntilExpiration
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
    notificationMessage: notification.shouldNotify
      ? 'Trigger detectado, envío desactivado en período de prueba'
      : null
  };
}
