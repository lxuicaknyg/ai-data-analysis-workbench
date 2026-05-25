const _ = require('lodash');
const GraphInterface = require('./graphInterface');

class MemoryGraph extends GraphInterface {
  constructor() {
    super();
    this.nodes = {};  // 实体节点 { nodeId: { type, name, properties } }
    this.edges = [];  // 关系边 { source, target, type, properties }
    this.nodeIdCounter = 0;
  }

  /**
   * 添加实体节点
   */
  async addNode(type, name, properties = {}) {
    const existingNode = this.findNodeByName(name);
    if (existingNode) {
      return existingNode.id;
    }
    
    const nodeId = `node_${++this.nodeIdCounter}`;
    this.nodes[nodeId] = {
      id: nodeId,
      type,
      name,
      properties: { ...properties, createdAt: new Date().toISOString() }
    };
    return nodeId;
  }

  /**
   * 添加关系边
   */
  async addEdge(sourceName, sourceType, targetName, targetType, relationType, properties = {}) {
    const sourceNode = this.findNodeByName(sourceName);
    const targetNode = this.findNodeByName(targetName);
    
    if (!sourceNode || !targetNode) {
      return false;
    }
    
    // 检查是否已存在相同关系
    const exists = this.edges.some(edge => 
      edge.source === sourceNode.id && 
      edge.target === targetNode.id && 
      edge.type === relationType
    );
    
    if (!exists) {
      this.edges.push({
        source: sourceNode.id,
        target: targetNode.id,
        type: relationType,
        properties: { ...properties, createdAt: new Date().toISOString() }
      });
      return true;
    }
    return false;
  }

  /**
   * 根据类型和名称查找节点
   */
  async findNode(type, name) {
    return Object.values(this.nodes).find(node => 
      node.type === type && node.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * 根据名称查找节点（兼容旧接口）
   */
  findNodeByName(name) {
    return Object.values(this.nodes).find(node => 
      node.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * 获取所有节点
   */
  async getAllNodes(type = null) {
    const nodes = Object.values(this.nodes);
    return type ? nodes.filter(node => node.type === type) : nodes;
  }

  /**
   * 根据类型查找节点
   */
  findNodesByType(type) {
    return Object.values(this.nodes).filter(node => node.type === type);
  }

  /**
   * 获取节点的邻居
   */
  async getNeighbors(nodeName, nodeType, maxDepth = 1) {
    const node = this.findNodeByName(nodeName);
    if (!node) return [];

    const visited = new Set([node.id]);
    const queue = [{ nodeId: node.id, currentDepth: 0 }];
    const neighbors = [];

    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift();
      
      if (currentDepth >= maxDepth) continue;

      this.edges.forEach(edge => {
        let neighborNode = null;
        let relation = null;
        
        if (edge.source === nodeId && !visited.has(edge.target)) {
          neighborNode = this.nodes[edge.target];
          relation = edge;
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          neighborNode = this.nodes[edge.source];
          relation = edge;
        }
        
        if (neighborNode) {
          visited.add(neighborNode.id);
          neighbors.push({ node: neighborNode, relation });
          queue.push({ nodeId: neighborNode.id, currentDepth: currentDepth + 1 });
        }
      });
    }

    return neighbors;
  }

  /**
   * 路径检索 - BFS算法
   */
  async findPath(startName, startType, endName, endType, maxDepth = 3) {
    const startNode = this.findNodeByName(startName);
    const endNode = this.findNodeByName(endName);
    
    if (!startNode || !endNode) {
      return null;
    }

    const visited = new Set();
    const queue = [{ nodeId: startNode.id, path: [startNode] }];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();
      
      if (nodeId === endNode.id) {
        return { nodes: path, relations: this._extractRelationsFromPath(path) };
      }
      
      if (path.length > maxDepth) continue;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      
      this.edges.forEach(edge => {
        let nextNode = null;
        if (edge.source === nodeId) {
          nextNode = this.nodes[edge.target];
        } else if (edge.target === nodeId) {
          nextNode = this.nodes[edge.source];
        }
        
        if (nextNode && !visited.has(nextNode.id)) {
          queue.push({ nodeId: nextNode.id, path: [...path, nextNode] });
        }
      });
    }
    
    return null;
  }

  _extractRelationsFromPath(path) {
    const relations = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.edges.find(e => 
        (e.source === path[i].id && e.target === path[i+1].id) ||
        (e.target === path[i].id && e.source === path[i+1].id)
      );
      if (edge) {
        relations.push(edge);
      }
    }
    return relations;
  }

  /**
   * 获取子图
   */
  async getSubgraph(centerNodeId, depth = 2) {
    const visited = new Set([centerNodeId]);
    const queue = [{ nodeId: centerNodeId, currentDepth: 0 }];
    const subgraphNodes = new Set([centerNodeId]);
    const subgraphEdges = [];
    
    while (queue.length > 0) {
      const { nodeId, currentDepth } = queue.shift();
      
      if (currentDepth >= depth) continue;
      
      this.edges.forEach(edge => {
        let neighborNode = null;
        
        if (edge.source === nodeId && !visited.has(edge.target)) {
          neighborNode = this.nodes[edge.target];
          visited.add(edge.target);
          subgraphNodes.add(edge.target);
          subgraphEdges.push(edge);
          queue.push({ nodeId: edge.target, currentDepth: currentDepth + 1 });
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          neighborNode = this.nodes[edge.source];
          visited.add(edge.source);
          subgraphNodes.add(edge.source);
          subgraphEdges.push(edge);
          queue.push({ nodeId: edge.source, currentDepth: currentDepth + 1 });
        }
      });
    }
    
    return {
      nodes: Array.from(subgraphNodes).map(id => this.nodes[id]),
      edges: subgraphEdges
    };
  }

  /**
   * 搜索相关知识
   */
  async searchRelatedKnowledge(query) {
    const results = [];
    const keywords = query.split(/[\s，,。、]/).filter(k => k.length > 1);
    
    keywords.forEach(keyword => {
      const node = this.findNodeByName(keyword);
      if (node) {
        const subgraph = this.getSubgraph(node.id, 2);
        results.push({
          centerNode: node,
          subgraph: subgraph
        });
      }
    });
    
    return results;
  }

  /**
   * 统计信息
   */
  async getStats() {
    const typeCount = _.countBy(Object.values(this.nodes), 'type');
    const edgeTypeCount = _.countBy(this.edges, 'type');
    
    return {
      totalNodes: Object.keys(this.nodes).length,
      totalEdges: this.edges.length,
      nodesByType: typeCount,
      edgesByType: edgeTypeCount
    };
  }

  /**
   * 打印图谱
   */
  printGraph() {
    console.log('\n=== 知识图谱结构 ===');
    console.log(`节点数: ${Object.keys(this.nodes).length}`);
    console.log(`边数: ${this.edges.length}`);
    
    console.log('\n--- 实体节点 ---');
    Object.values(this.nodes).forEach(node => {
      console.log(`  [${node.type}] ${node.name}`);
    });
    
    console.log('\n--- 关系边 ---');
    this.edges.forEach(edge => {
      const source = this.nodes[edge.source];
      const target = this.nodes[edge.target];
      console.log(`  ${source.name} --[${edge.type}]--> ${target.name}`);
    });
  }

  /**
   * 清空图谱
   */
  async clear() {
    this.nodes = {};
    this.edges = [];
    this.nodeIdCounter = 0;
  }
}

module.exports = MemoryGraph;
