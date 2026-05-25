const Md2DocConverter = require('./src/convert');
const { bankReportTemplate, specialCharsTest, complexTableTest } = require('./src/test-cases');

async function runDemo() {
  console.log('========================================');
  console.log('    MD转DOC文档转换Demo');
  console.log('========================================\n');

  const converter = new Md2DocConverter();

  // 检查Pandoc安装情况
  const pandocStatus = await converter.checkPandocInstalled();
  if (pandocStatus.installed) {
    console.log(`✅ Pandoc已安装，版本: ${pandocStatus.version}`);
  } else {
    console.log('❌ Pandoc未安装，请先安装Pandoc');
    console.log('   Windows下载地址: https://github.com/jgm/pandoc/releases');
    console.log('   或使用备选方案（html-docx-js）');
  }

  console.log('\n--- 开始测试转换 ---');

  try {
    // 测试1：银行报告模板
    console.log('\n1. 银行报告模板转换...');
    if (pandocStatus.installed) {
      await converter.convertWithPandoc(bankReportTemplate, 'bank_report');
    }
    await converter.convertWithHtmlDocx(bankReportTemplate, 'bank_report');

    // 测试2：中文特殊字符
    console.log('\n2. 中文特殊字符转换...');
    if (pandocStatus.installed) {
      await converter.convertWithPandoc(specialCharsTest, 'special_chars');
    }
    await converter.convertWithHtmlDocx(specialCharsTest, 'special_chars');

    // 测试3：复杂表格
    console.log('\n3. 复杂表格转换...');
    if (pandocStatus.installed) {
      await converter.convertWithPandoc(complexTableTest, 'complex_table');
    }
    await converter.convertWithHtmlDocx(complexTableTest, 'complex_table');

    console.log('\n========================================');
    console.log('    转换完成！输出目录: demos/md2doc-demo/output');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ 转换过程出错:', error.message);
    process.exit(1);
  }
}

runDemo();
