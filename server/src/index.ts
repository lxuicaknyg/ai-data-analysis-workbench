import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { testConnection } from './config/database';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import chatHistoryRoutes from './routes/chatHistory';
import { docxExporter } from './utils/docx-export';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:18181', 'http://localhost:18182', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat-history', chatHistoryRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.post('/api/export-docx', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    const filename = `report_${Date.now()}`;
    const outputPath = await docxExporter.exportToDocx(content, filename);
    
    res.json({ success: true, filename: path.basename(outputPath), path: outputPath });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ success: false, message: '导出失败: ' + (error instanceof Error ? error.message : '未知错误') });
  }
});

app.get('/api/download', (req, res) => {
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ success: false, message: '文件路径不能为空' });
  }

  try {
    const resolvedPath = path.resolve(filePath);
    const outputDir = path.join(__dirname, '../../output');
    
    if (!resolvedPath.startsWith(outputDir)) {
      return res.status(403).json({ success: false, message: '访问被拒绝' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }

    const filename = path.basename(resolvedPath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('文件下载失败:', error);
    res.status(500).json({ success: false, message: '文件下载失败' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

async function startServer() {
  await testConnection();
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 API文档: http://localhost:${PORT}/api/health`);
  });
}

startServer();
