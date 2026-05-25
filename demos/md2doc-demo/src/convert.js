const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class Md2DocConverter {
  constructor() {
    this.outputDir = path.join(__dirname, '../output');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 使用Pandoc转换MD到DOCX
   * @param {string} mdContent - Markdown内容
   * @param {string} outputFileName - 输出文件名
   * @returns {Promise<string>} - 输出文件路径
   */
  async convertWithPandoc(mdContent, outputFileName) {
    return new Promise((resolve, reject) => {
      const tempMdPath = path.join(this.outputDir, `temp_${Date.now()}.md`);
      const outputPath = path.join(this.outputDir, `${outputFileName}.docx`);

      // 确保使用UTF-8编码写入临时文件
      fs.writeFileSync(tempMdPath, mdContent, { encoding: 'utf8' });

      // Pandoc命令：Pandoc默认使用UTF-8编码
      const command = `pandoc "${tempMdPath}" -o "${outputPath}" --from=markdown --to=docx --standalone`;

      exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        // 清理临时文件
        fs.unlinkSync(tempMdPath);

        if (error) {
          console.error('Pandoc转换错误:', error.message);
          reject(error);
        } else {
          console.log(`Pandoc转换成功: ${outputPath}`);
          resolve(outputPath);
        }
      });
    });
  }

  /**
   * 使用html-docx-js转换（备选方案）
   * @param {string} mdContent - Markdown内容
   * @param {string} outputFileName - 输出文件名
   * @returns {Promise<string>} - 输出文件路径
   */
  async convertWithHtmlDocx(mdContent, outputFileName) {
    const htmlDocx = require('html-docx-js');
    return new Promise(async (resolve, reject) => {
      try {
        // 将MD转换为HTML（简单实现）
        const html = this.mdToHtml(mdContent);
        
        // 生成DOCX（返回Blob对象）
        const docxBlob = htmlDocx.asBlob(html);
        
        // 将Blob转换为Buffer
        const arrayBuffer = await docxBlob.arrayBuffer();
        const docxBuffer = Buffer.from(arrayBuffer);
        
        const outputPath = path.join(this.outputDir, `${outputFileName}_html.docx`);
        fs.writeFileSync(outputPath, docxBuffer);
        
        console.log(`html-docx-js转换成功: ${outputPath}`);
        resolve(outputPath);
      } catch (error) {
        console.error('html-docx-js转换错误:', error.message);
        reject(error);
      }
    });
  }

  /**
   * 简单的MD转HTML
   */
  mdToHtml(mdContent) {
    let html = mdContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Microsoft YaHei', 'SimHei', sans-serif; font-size: 12pt; }
          h1 { font-size: 18pt; font-weight: bold; text-align: center; }
          h2 { font-size: 16pt; font-weight: bold; color: #1a365d; }
          h3 { font-size: 14pt; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          ul, ol { margin-left: 20px; }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `;
  }

  /**
   * 检查Pandoc是否安装
   */
  async checkPandocInstalled() {
    return new Promise((resolve) => {
      exec('pandoc --version', (error, stdout) => {
        if (error) {
          resolve(false);
        } else {
          const versionMatch = stdout.match(/pandoc (\d+\.\d+\.\d+)/);
          resolve({ installed: true, version: versionMatch ? versionMatch[1] : 'unknown' });
        }
      });
    });
  }
}

module.exports = Md2DocConverter;
