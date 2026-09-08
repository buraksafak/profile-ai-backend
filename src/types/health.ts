export interface HealthStatus {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadyStatus {
  status: 'ready' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
}

export interface FullHealthStatus {
  status: 'ok' | 'degraded';
  server: {
    status: 'up';
    uptime: number;
    timestamp: string;
  };
  database: {
    status: 'up' | 'down';
  };
}
