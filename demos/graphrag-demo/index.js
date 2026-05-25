const MemoryGraph = require('./src/knowledgeGraph');
const Neo4jGraph = require('./src/neo4jAdapter');
const DataFusion = require('./src/dataFusion');
const { sampleReport1, sampleReport2, sampleReport3, testQueries } = require('./src/testData');

// 配置：选择使用内存图谱还是Neo4j
const USE_NEO4J = process.env.USE_NEO4J === 'true';

async function runDemo() {
  console.log('========================================');
  console.log('    GraphRAG知识检索Demo');
  console.log(`    模式: ${USE_NEO4J ? 'Neo4j图数据库' : '内存图谱'}`);
  console.log('========================================\n');

  let graph;
  
  try {
    // 初始化知识图谱
    if (USE_NEO4J) {
      graph = new Neo4jGraph({
        host: process.env.NEO4J_HOST || 'localhost',
        port: parseInt(process.env.NEO4J_PORT || '7687'),
        username: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'password',
        database: process.env.NEO4J_DB || 'neo4j'
      });
      await graph.init();
      // 清空数据库（演示用）
      await graph.clear();
    } else {
      graph = new MemoryGraph();
    }

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
    await fusion.analyzePath('长三角地区', '数字化转型');
    await fusion.analyzePath('对公业务', '制造业');

    // 阶段三：知识检索测试
    console.log('\n=== 阶段三：知识检索测试 ===');
    
    for (const query of testQueries) {
      console.log(`\n查询: ${query}`);
      const results = await fusion.searchRelatedKnowledge(query);
      if (results.length > 0) {
        for (const r of results) {
          console.log(`  中心实体: [${r.centerNode.type}] ${r.centerNode.name}`);
          console.log(`  关联实体数: ${r.subgraph.nodes ? r.subgraph.nodes.length - 1 : 0}`);
        }
      }
    }

    // 打印完整图谱
    console.log('\n=== 完整图谱结构 ===');
    await graph.printGraph();

    console.log('\n========================================');
    console.log('    GraphRAG Demo 完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ Demo执行失败:', error.message);
    if (USE_NEO4J) {
      console.log('\n💡 提示：请确保Neo4j数据库已启动');
      console.log('   启动命令: neo4j start');
      console.log('   或使用内存模式: USE_NEO4J=false npm start');
    }
  } finally {
    // 关闭连接
    if (graph && typeof graph.close === 'function') {
      await graph.close();
    }
  }
}

runDemo();
