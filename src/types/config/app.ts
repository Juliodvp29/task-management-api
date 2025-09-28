export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  app_name: string;
  app_version: string;
  base_url: string;
  cors_origins: string[];
  rate_limit: {
    window_ms: number;
    max_requests: number;
  };
  upload: {
    max_file_size: number;
    allowed_types: string[];
    destination: string;
  };
}