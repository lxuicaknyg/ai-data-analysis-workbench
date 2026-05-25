const Md2DocConverter = require('./src/convert');

async function runTests() {
  console.log('========================================');
  console.log('    MD转DOC转换测试');
  console.log('========================================\n');

  const converter = new Md2DocConverter();

  // 测试1：检查Pandoc安装
  console.log('测试1：检查Pandoc安装');
  const status = await converter.checkPandocInstalled();
  console.log(`  结果: ${status.installed ? '已安装' : '未安装'}`);
  if (status.version) {
    console.log(`  版本: ${status.version}`);
  }

  // 测试2：UTF-8编码测试
  console.log('\n测试2：UTF-8编码测试');
  const testContent = '# 中文测试\n\n这是一段中文内容测试，包含特殊字符：¥$€£\n\n## 表格\n\n| 列1 | 列2 |\n|-----|-----|\n| 中文 | English |';
  
  try {
    // 测试HTML转换方式
    await converter.convertWithHtmlDocx(testContent, 'utf8_test');
    console.log('  ✅ HTML转换成功');
  } catch (error) {
    console.log(`  ❌ HTML转换失败: ${error.message}`);
  }

  // 测试3：Pandoc转换测试
  console.log('\n测试3：Pandoc转换测试');
  if (status.installed) {
    try {
      await converter.convertWithPandoc(testContent, 'pandoc_test');
      console.log('  ✅ Pandoc转换成功');
    } catch (error) {
      console.log(`  ❌ Pandoc转换失败: ${error.message}`);
    }
  } else {
    console.log('  ⏭️ 跳过（Pandoc未安装）');
  }

  console.log('\n========================================');
  console.log('    测试完成');
  console.log('========================================');
}

runTests();
