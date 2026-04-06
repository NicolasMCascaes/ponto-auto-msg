export type HealthStatus = {
  status: 'ok';
  service: 'backend';
};

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    service: 'backend'
  };
}
