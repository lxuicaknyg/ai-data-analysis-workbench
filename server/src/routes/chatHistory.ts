import express from 'express';
import { chatHistoryService } from '../services/chatHistoryService';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Creating chat history with data:', req.body);
    const history = await chatHistoryService.create(req.body);
    res.status(201).json(history);
  } catch (error) {
    console.error('[ERROR] Failed to create chat history:', error);
    res.status(500).json({ error: 'Failed to create chat history', details: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const history = await chatHistoryService.findByUserId(req.params.userId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const history = await chatHistoryService.findBySessionId(req.params.sessionId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const history = await chatHistoryService.findById(parseInt(req.params.id));
    if (!history) {
      return res.status(404).json({ error: 'Chat history not found' });
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const history = await chatHistoryService.update(parseInt(req.params.id), req.body);
    if (!history) {
      return res.status(404).json({ error: 'Chat history not found' });
    }
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update chat history' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await chatHistoryService.delete(parseInt(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Chat history not found' });
    }
    res.json({ message: 'Chat history deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat history' });
  }
});

export default router;
