/**
 * Widget Types
 */
export enum WidgetType {
  CHART = 'CHART',
  METRIC = 'METRIC',
  TABLE = 'TABLE',
  LIST = 'LIST',
  PROGRESS = 'PROGRESS',
  GAUGE = 'GAUGE',
  MAP = 'MAP',
  CALENDAR = 'CALENDAR',
  TIMELINE = 'TIMELINE',
  CUSTOM = 'CUSTOM',
  TRANSACTION_SUMMARY = 'transaction_summary',
  DOCUMENT_STATS = 'document_stats',
  SECURITY_ALERTS = 'security_alerts',
  PERFORMANCE_METRICS = 'performance_metrics',
  RECENT_ACTIVITY = 'recent_activity',
  SYSTEM_HEALTH = 'system_health',
}

/**
 * Chart Types for chart widgets
 */
export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  DOUGHNUT = 'DOUGHNUT',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  RADAR = 'RADAR',
  POLAR = 'POLAR',
}

/**
 * Widget Size
 */
export enum WidgetSize {
  SMALL = 'SMALL', // 1x1
  MEDIUM = 'MEDIUM', // 2x1
  LARGE = 'LARGE', // 2x2
  WIDE = 'WIDE', // 3x1
  TALL = 'TALL', // 1x2
  EXTRA_LARGE = 'EXTRA_LARGE', // 3x2
}
