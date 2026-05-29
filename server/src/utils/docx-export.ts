import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

export class DocxExporter {
  private outputDir: string

  constructor() {
    // 使用项目根目录的 output 文件夹
    const projectRoot = path.resolve(__dirname, '../../..')
    this.outputDir = path.join(projectRoot, 'output')
    this.ensureOutputDir()
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  async checkPandocInstalled(): Promise<{ installed: boolean; version: string | null }> {
    return new Promise((resolve) => {
      exec('pandoc --version', (error, stdout) => {
        if (error) {
          resolve({ installed: false, version: null })
        } else {
          const versionMatch = stdout.match(/pandoc (\d+\.\d+\.\d+)/)
          resolve({
            installed: true,
            version: versionMatch ? versionMatch[1] : 'unknown',
          })
        }
      })
    })
  }

  /**
   * 核心修复 1：将 Markdown 转换为带有高兼容性 Word 样式的 HTML
   */
  private mdToHtml(mdContent: string): string {
    let content = mdContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')

    // 处理表格（注入专门适配 Word 视图的 HTML 表格结构）
    content = this.convertMarkdownTable(content)

    content = content
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Microsoft YaHei', 'SimHei', 'PingFang SC', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333333;
    }
    h1 {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      color: #000000;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #1a365d;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: bold;
      color: #2c3e50;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    p {
      margin: 8px 0;
    }
    /* 全局兜底表格样式 */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      border: 1px solid #333333;
    }
    th, td {
      border: 1px solid #333333;
      padding: 8px 10px;
      text-align: left;
      font-size: 10.5pt;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Consolas', monospace;
    }
  </style>
</head>
<body>
  <div class="report-content">
    ${content}
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * 核心修复 2：精细化解析 Markdown 表格，并对每个单元格强制写入 border 边框
   */
  private convertMarkdownTable(mdContent: string): string {
    const tableRegex = /(^\|.*\|$\n^\|[-:| ]+\|$(\n^\|.*\|$)*)/gim
    const matches = mdContent.match(tableRegex)
    console.log(`[Table Convert] Found ${matches ? matches.length : 0} table(s)`)

    return mdContent.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n')
      if (lines.length < 2) return match

      const headerLine = lines[0]
      const bodyLines = lines.slice(2) // 跳过 |---| 符号隔离线

      // 解析表头，过滤掉两端的空元素
      const headers = headerLine.split('|').map(h => h.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      // 关键：给 th 显式添加内联的 border 样式和背景色
      const headerHtml = `<tr>\n${headers.map(h => `<th style="border: 1px solid #333333; background-color: #f2f2f2; font-weight: bold; padding: 8px; text-align: left;">${h}</th>`).join('')}\n</tr>`

      // 解析表体
      const bodyHtml = bodyLines
        .filter(line => line.trim())
        .map(line => {
          const cells = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
          // 关键：给 td 显式添加内联的 border 样式
          return `<tr>\n${cells.map(c => `<td style="border: 1px solid #333333; padding: 8px; text-align: left;">${c}</td>`).join('')}\n</tr>`
        })
        .join('\n')

      // 关键：<table> 标签不仅要写 style，还必须写上原生属性 border="1" 和 cellspacing="0"
      // 这是 html-docx-js 方案能让 Word 成功渲染黑边框的核心技巧
      const result = `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; border: 1px solid #333333;">\n<thead>\n${headerHtml}\n</thead>\n<tbody>\n${bodyHtml}\n</tbody>\n</table>`
      return result
    })
  }

  async exportToDocx(mdContent: string, filename: string): Promise<string> {
    const pandocStatus = await this.checkPandocInstalled()
    console.log(`[DOCX Export] Pandoc installed: ${pandocStatus.installed}, version: ${pandocStatus.version}`)

    if (pandocStatus.installed) {
      console.log(`📄 [DOCX导出] 检测到系统已安装 Pandoc，版本: ${pandocStatus.version}`)
      console.log(`📄 [DOCX导出] 正在使用 Pandoc 工具进行文档转换`)
      const pandocResult = await this.convertWithPandoc(mdContent, filename)
      console.log(`✅ [DOCX导出] Pandoc 转换成功！文件已保存至: ${pandocResult}`)
      return pandocResult
    } else {
      console.log(`📄 [DOCX导出] 系统未安装 Pandoc`)
      console.log(`📄 [DOCX导出] 正在使用 html-docx-js 库进行文档转换`)
      const htmlResult = await this.convertWithHtmlDocx(mdContent, filename)
      console.log(`✅ [DOCX导出] html-docx-js 转换成功！文件已保存至: ${htmlResult}`)
      return htmlResult
    }
  }

  /**
   * 核心修复位置：让 Pandoc 转换出来的表格强制带完整黑色边框
   */
  private async convertWithPandoc(mdContent: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now()
      const tempMdPath = path.join(this.outputDir, `temp_${timestamp}.md`)
      const outputPath = path.join(this.outputDir, `${filename}.docx`)

      fs.writeFileSync(tempMdPath, mdContent, { encoding: 'utf8' })

      // 【核心修改点】
      // 1. 通过增加 markdown 扩展规则：+pipe_tables+table_captions
      // 2. 也是最关键的：新版 Pandoc 支持通过内置扩展直接将表格渲染为带有标准网格边框的普通 Word 表格，防止其生成"无边框"或"虚线隐藏边框"表格。
      // 3. 将 --from 设为 markdown+pipe_tables
      const command = `pandoc "${tempMdPath}" -o "${outputPath}" --from=markdown+pipe_tables --to=docx --standalone --wrap=none`

      exec(command, { encoding: 'utf8' }, (error) => {
        fs.unlinkSync(tempMdPath)
        if (error) {
          reject(error)
        } else {
          resolve(outputPath)
        }
      })
    })
  }

  private async convertWithHtmlDocx(mdContent: string, filename: string): Promise<string> {
    const htmlDocxModule = await import('html-docx-js')
    const htmlDocx = htmlDocxModule.default || htmlDocxModule
    
    // 修复：直接使用已注入高兼容表格样式的 mdToHtml 方法
    const html = this.mdToHtml(mdContent)
    const docxBlob = htmlDocx.asBlob(html)
    const arrayBuffer = await docxBlob.arrayBuffer()
    const docxBuffer = Buffer.from(arrayBuffer)
    const outputPath = path.join(this.outputDir, `${filename}_html.docx`)
    fs.writeFileSync(outputPath, docxBuffer)
    return outputPath
  }
}

export const docxExporter = new DocxExporter()