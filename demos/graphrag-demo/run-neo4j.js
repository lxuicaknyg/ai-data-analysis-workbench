/**
 * Neo4j图数据库完整测试脚本
 * 使用环境变量配置连接：
 *   NEO4J_HOST - Neo4j主机（默认localhost）
 *   NEO4J_PORT - Neo4j端口（默认7687）
 *   NEO4J_USER - 用户名（默认neo4j）
 *   NEO4J_PASSWORD - 密码（默认password）
 */

const Neo4jGraph = require('./src/neo4jAdapter');
const DataFusion = require('./src/dataFusion');
const { sampleReport1, sampleReport2, sampleReport3, testQueries } = require('./src/testData');

async function runNeo4jDemo() {
  console.log('========================================');
  console.log('    GraphRAG知识检索Demo - Neo4j模式');
  console.log('========================================\n');

  // 获取环境变量配置
  const config = {
    host: process.env.NEO4J_HOST || 'localhost',
    port: parseInt(process.env.NEO4J_PORT || '7687'),
    username: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
    database: process.env.NEO4J_DB || 'neo4j'
  };

  console.log(`连接配置:`);
  console.log(`  主机: ${config.host}:${config.port}`);
  console.log(`  数据库: ${config.database}`);
  console.log(`  用户名: ${config.username}\n`);

  let graph;

  try {
    // 初始化Neo4j图谱
    graph = new Neo4jGraph(config);
    await graph.init();

    // 清空数据库（演示用）
    console.log('清空现有数据...');
    await graph.clear();
    console.log('✅ 数据清空完成\n');

    const fusion = new DataFusion(graph);

    // 阶段一：知识提取与图谱构建
    console.log('=== 阶段一：知识提取与图谱构建 ===');
    
    await fusion.fuseReport(sampleReport1, {
      title: '普惠金融月度报告',
      period: '2024年12月'
    });

    await fusion.fuseReport(sampleReport2, {
      title: '对公业务季度报告',
      period: '2024年Q4'
    });

    await fusion.fuseReport(sampleReport3, {
      title: '数字化转型报告',
      period: '2024年度'
    });

    // 打印图谱统计
    const stats = await graph.getStats();
    console.log('=== 图谱统计 ===');
    console.log(`总节点数: ${stats.totalNodes}`);
    console.log(`总边数: ${stats.totalEdges}`);
    console.log('节点类型分布:', stats.nodesByType);
    console.log('关系类型分布:', stats.edgesByType);

    // 阶段二：路径检索测试
    console.log('\n=== 阶段二：路径检索测试 ===');
    
    await fusion.analyzePath('普惠金融', '信用风险');
    await fusion.analyzePath('对公业务', '市场风险');

    // 阶段三：知识检索测试
    console.log('\n=== 阶段三：知识检索测试 ===');
    
    for (const query of testQueries) {
      console.log(`\n查询: ${query}`);
      const results = await fusion.searchRelatedKnowledge(query);
      if (results.length > 0) {
        for (const r of results) {
          console.log(`  中心实体: [${r.centerNode.type}] ${r.centerNode.name}`);
          console.log(`  关联实体数: ${r.subgraph.nodes.length - 1}`);
        }
      }
    }

    // 打印完整图谱
    console.log('\n=== 完整图谱结构 ===');
    await graph.printGraph();

    console.log('\n========================================');
    console.log('    Neo4j模式 Demo 完成！');
    console.log('========================================');
    console.log('\n💡 提示：可访问 http://localhost:7474 查看图谱可视化');

  } catch (error) {
    console.error('\n❌ Demo执行失败:', error.message);
    console.log('\n📋 Neo4j安装与启动指南:');
    console.log('1. 下载Neo4j: https://neo4j.com/download/');
    console.log('2. 启动服务: neo4j start');
    console.log('3. 默认配置:');
    console.log('   - 主机: localhost:7687');
    console.log('   - 用户名: neo4j');
    console.log('   - 密码: password (首次登录需修改)');
    console.log('4. 访问管理界面: http://localhost:7474');
  } finally {
    if (graph) {
      await graph.close();
    }
  }
}

runNeo4jDemo();
