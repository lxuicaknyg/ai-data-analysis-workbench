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

  private mdToHtml(mdContent: string): string {
    let html = mdContent
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>')
      .replace(/\|([^|]+)\|/gim, (match) => {
        const parts = match.split('|').filter((p) => p.trim())
        if (parts.length > 0) {
          return `<tr><td>${parts.join('</td><td>')}</td></tr>`
        }
        return match
      })

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Microsoft YaHei', 'SimHei', 'PingFang SC', sans-serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      color: #1a365d;
      margin-bottom: 20px;
      border-bottom: 2px solid #7b3fb2;
      padding-bottom: 10px;
    }
    h2 {
      font-size: 15pt;
      font-weight: bold;
      color: #1a365d;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-left: 8px;
      border-left: 4px solid #7b3fb2;
    }
    h3 {
      font-size: 13pt;
      font-weight: bold;
      color: #2c3e50;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    p {
      margin: 10px 0;
      text-indent: 2em;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f8f4fc;
      font-weight: bold;
      color: #1a365d;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    ul, ol {
      margin-left: 24px;
      margin-top: 8px;
      margin-bottom: 8px;
    }
    li {
      margin: 6px 0;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11pt;
    }
    strong {
      color: #1a365d;
    }
  </style>
</head>
<body>
  <div class="report-content">
    <p>${html}</p>
  </div>
</body>
</html>
    `.trim()
  }

  async exportToDocx(mdContent: string, filename: string): Promise<string> {
    const pandocStatus = await this.checkPandocInstalled()

    if (pandocStatus.installed) {
      return await this.convertWithPandoc(mdContent, filename)
    } else {
      return await this.convertWithHtmlDocx(mdContent, filename)
    }
  }

  private async convertWithPandoc(mdContent: string, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now()
      const tempMdPath = path.join(this.outputDir, `temp_${timestamp}.md`)
      const outputPath = path.join(this.outputDir, `${filename}.docx`)

      fs.writeFileSync(tempMdPath, mdContent, { encoding: 'utf8' })

      const command = `pandoc "${tempMdPath}" -o "${outputPath}" --from=markdown --to=docx --standalone`

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