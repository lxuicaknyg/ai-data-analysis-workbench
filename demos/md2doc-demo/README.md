# MD转DOC文档转换Demo

## 功能说明
测试Markdown文档转换为DOC格式，解决中文UTF-8编码和乱码问题。

## 技术方案
1. 使用Pandoc进行文档转换（推荐）
2. 使用html-docx-js作为备选方案

## 测试用例
- 中文标题和内容
- 表格
- 列表
- 特殊字符

## 运行方式
```bash
npm install
npm start
```

## 输出
生成的DOC文件保存在output目录下
