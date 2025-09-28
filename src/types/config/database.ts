export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  timezone: string;
  pool: {
    min: number;
    max: number;
    acquire: number;
    idle: number;
  };
}