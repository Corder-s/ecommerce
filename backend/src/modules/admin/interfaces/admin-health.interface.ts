export interface AdminSystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  environment: string;
  timestamp: string;
}

export interface AdminDatabaseHealth {
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  connected: boolean;
  timestamp: string;
}

export interface AdminQueuesHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  pendingEventsCount: number;
  processingEventsCount: number;
  deadLetterEventsCount: number;
  recentFailuresCount: number;
  timestamp: string;
}
