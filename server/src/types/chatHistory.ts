export interface ChatHistory {
  id: number;
  user_id: string;
  username: string;
  session_id: string;
  user_input: string;
  optimized_prompt?: string;
  execution_prompt?: string;
  generated_report?: string;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateChatHistoryRequest {
  user_id: string;
  username: string;
  session_id: string;
  user_input: string;
  optimized_prompt?: string;
  execution_prompt?: string;
  generated_report?: string;
  status?: 'pending' | 'completed' | 'failed';
  error_message?: string;
}

export interface UpdateChatHistoryRequest {
  optimized_prompt?: string;
  execution_prompt?: string;
  generated_report?: string;
  status?: 'pending' | 'completed' | 'failed';
  error_message?: string;
}
