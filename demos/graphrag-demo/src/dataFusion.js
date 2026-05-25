const KnowledgeExtractor = require('./knowledgeExtractor');

class DataFusion {
  constructor(graph) {
    this.graph = graph;
    this.extractor = new KnowledgeExtractor();
  }

  /**
   * 将报告融合到知识图谱
   */
  async fuseReport(reportContent, reportMetadata = {}) {
    console.log('开始融合报告...');
    
    // 1. 提取知识
    const extractionResult = this.extractor.extract(reportContent);
    
    console.log(`  提取到 ${extractionResult.entities.length} 个实体`);
    console.log(`  提取到 ${extractionResult.relations.length} 个关系`);
    console.log(`  提取到 ${extractionResult.numbers.length} 个数值`);

    // 2. 添加实体到图谱
    const entityMap = {};
    for (const entity of extractionResult.entities) {
      const existingNode = await this.graph.findNode(entity.type, entity.name);
      if (existingNode) {
        entityMap[entity.name] = existingNode.id;
        console.log(`    实体已存在: ${entity.name}`);
      } else {
        const nodeId = await this.graph.addNode(entity.type, entity.name, {
          source: reportMetadata.title || '未知报告',
          ...reportMetadata
        });
        entityMap[entity.name] = nodeId;
        console.log(`    添加实体: [${entity.type}] ${entity.name}`);
      }
    }

    // 3. 添加关系到图谱
    for (const relation of extractionResult.relations) {
      if (relation.target) {
        const added = await this.graph.addEdge(
          relation.source, 
          this._guessType(relation.source),
          relation.target, 
          this._guessType(relation.target),
          relation.type
        );
        if (added) {
          console.log(`    添加关系: ${relation.source} --[${relation.type}]--> ${relation.target}`);
        }
      }
    }

    // 4. 添加数值属性
    extractionResult.numbers.forEach(num => {
      console.log(`    数值: ${num.value} ${num.unit}`);
    });

    console.log('报告融合完成\n');
    
    return {
      entitiesAdded: extractionResult.entities.length,
      relationsAdded: extractionResult.relations.length,
      entityMap
    };
  }

  _guessType(name) {
    const typeKeywords = {
      business_metric: ['余额', '客户数', '增长率', '不良率', '占比'],
      customer_type: ['客户', '企业', '小微'],
      region: ['长三角', '珠三角', '京津冀', '中西部', '东北', '北京', '上海', '广州', '深圳'],
      risk_type: ['风险'],
      business_type: ['金融', '业务', '零售', '同业', '投资银行']
    };
    
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(kw => name.includes(kw))) {
        return type;
      }
    }
    return 'business_metric';
  }

  /**
   * 增量更新图谱
   */
  async incrementalUpdate(newReport, existingGraphVersion = 1) {
    console.log(`增量更新图谱 (版本: ${existingGraphVersion})`);
    
    const result = await this.fuseReport(newReport);
    
    const newVersion = existingGraphVersion + 1;
    console.log(`图谱版本升级: ${existingGraphVersion} -> ${newVersion}`);
    
    return {
      ...result,
      version: newVersion
    };
  }

  /**
   * 检索相关知识
   */
  async searchRelatedKnowledge(query) {
    console.log(`检索相关知识: ${query}`);
    
    const queryEntities = this.extractor.extract(query).entities;
    
    if (queryEntities.length === 0) {
      console.log('  未找到查询实体');
      return [];
    }
    
    const results = [];
    for (const queryEntity of queryEntities) {
      const node = await this.graph.findNode(queryEntity.type, queryEntity.name);
      if (node) {
        console.log(`  找到实体: [${node.type}] ${node.name}`);
        
        const subgraph = await this.graph.getSubgraph(node.id, 2);
        results.push({
          centerNode: node,
          subgraph
        });
      }
    }
    
    return results;
  }

  /**
   * 路径分析
   */
  async analyzePath(startEntityName, endEntityName) {
    console.log(`路径分析: ${startEntityName} -> ${endEntityName}`);
    
    const startNode = await this._findEntityByName(startEntityName);
    const endNode = await this._findEntityByName(endEntityName);
    
    if (!startNode || !endNode) {
      console.log('  实体不存在');
      return null;
    }
    
    const path = await this.graph.findPath(
      startNode.name, 
      startNode.type, 
      endNode.name, 
      endNode.type, 
      4
    );
    
    if (path) {
      console.log('  找到路径:');
      path.nodes.forEach((node, index) => {
        const arrow = index < path.nodes.length - 1 ? ' -> ' : '';
        process.stdout.write(`    ${node.name}${arrow}`);
      });
      console.log();
    } else {
      console.log('  未找到路径');
    }
    
    return path;
  }

  async _findEntityByName(name) {
    const types = ['business_type', 'business_metric', 'customer_type', 'region', 'risk_type'];
    for (const type of types) {
      const node = await this.graph.findNode(type, name);
      if (node) return node;
    }
    return null;
  }
}

module.exports = DataFusion;
