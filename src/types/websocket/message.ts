export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  user_id?: number;
}