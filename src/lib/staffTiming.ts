export const STAFF_ORDER_ALERT_MINUTES = 10;
export const SUPPORT_SLA_MINUTES = 30;
export const elapsedMinutes = (at: string, now = Date.now()) => Math.max(0, Math.floor((now - new Date(at).getTime()) / 60000));
export const isStaffOrderOverdue = (at: string, now = Date.now()) => elapsedMinutes(at, now) > STAFF_ORDER_ALERT_MINUTES;