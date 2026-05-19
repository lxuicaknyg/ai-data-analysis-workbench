import { pool } from '../config/database';
import { ChatHistory, CreateChatHistoryRequest, UpdateChatHistoryRequest } from '../types/chatHistory';

export class ChatHistoryService {
  async create(chatHistory: CreateChatHistoryRequest): Promise<ChatHistory> {
    const { user_id, session_id, user_input, report_type, period, optimized_prompt, status, error_message } = chatHistory;
    
    const [result] = await pool.execute(
      `INSERT INTO chat_history (user_id, session_id, user_input, report_type, period, optimized_prompt, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, session_id, user_input, report_type || null, period || null, optimized_prompt || null, status || 'pending', error_message || null]
    );
    
    const insertResult = result as { insertId: number };
    const created = await this.findById(insertResult.insertId);
    if (!created) {
      throw new Error('Failed to fetch newly created chat history');
    }
    return created;
  }

  async findById(id: number): Promise<ChatHistory | null> {
    const [rows] = await pool.execute('SELECT * FROM chat_history WHERE id = ?', [id]);
    const history = rows as ChatHistory[];
    return history.length > 0 ? history[0] : null;
  }

  async findByUserId(userId: string): Promise<ChatHistory[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as ChatHistory[];
  }

  async findBySessionId(sessionId: string): Promise<ChatHistory[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM chat_history WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    return rows as ChatHistory[];
  }

  async update(id: number, updates: UpdateChatHistoryRequest): Promise<ChatHistory | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.report_type !== undefined) {
      fields.push('report_type = ?');
      values.push(updates.report_type);
    }
    if (updates.period !== undefined) {
      fields.push('period = ?');
      values.push(updates.period);
    }
    if (updates.optimized_prompt !== undefined) {
      fields.push('optimized_prompt = ?');
      values.push(updates.optimized_prompt);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.execute(`UPDATE chat_history SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute('DELETE FROM chat_history WHERE id = ?', [id]);
    const deleteResult = result as { affectedRows: number };
    return deleteResult.affectedRows > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const [result] = await pool.execute('DELETE FROM chat_history WHERE user_id = ?', [userId]);
    const deleteResult = result as { affectedRows: number };
    return deleteResult.affectedRows;
  }
}

export const chatHistoryService = new ChatHistoryService();
