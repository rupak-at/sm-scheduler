export function redisConnectionOptions(connectionUrl: string) {
  const url = new URL(connectionUrl);
  const database = url.pathname.slice(1);
  if (!/^\d*$/.test(database)) throw new Error('Redis database must be a non-negative integer');

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    db: database ? Number(database) : 0,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
