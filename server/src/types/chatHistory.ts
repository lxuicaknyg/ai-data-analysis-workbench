export interface ChatHistory {
  id: number;
  user_id: string;
  session_id: string;
  user_input: string;
  report_type?: string;
  period?: string;
  optimized_prompt?: string;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateChatHistoryRequest {
  user_id: string;
  session_id: string;
  user_input: string;
  report_type?: string;
  period?: string;
  optimized_prompt?: string;
  status?: 'pending' | 'completed' | 'failed';
  error_message?: string;
}

export interface UpdateChatHistoryRequest {
  report_type?: string;
  period?: string;
  optimized_prompt?: string;
  status?: 'pending' | 'completed' | 'failed';
  error_message?: string;
}
