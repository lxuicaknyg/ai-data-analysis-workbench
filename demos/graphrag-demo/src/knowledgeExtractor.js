const _ = require('lodash');

class KnowledgeExtractor {
  constructor() {
    // 实体提取规则
    this.entityPatterns = {
      business_metric: [
        /([\u4e00-\u9fa5]+贷款余额)/g,
        /([\u4e00-\u9fa5]+客户数)/g,
        /([\u4e00-\u9fa5]+增长率)/g,
        /([\u4e00-\u9fa5]+不良率)/g,
        /([\u4e00-\u9fa5]+占比)/g
      ],
      customer_type: [
        /(对公客户|个人客户|小微企业|制造业客户|普惠客户)/g,
        /(大型企业|中型企业|小型企业|微型企业)/g
      ],
      region: [
        /(长三角|珠三角|京津冀|环渤海|中西部|东北)/g,
        /(北京|上海|广州|深圳|杭州|南京|成都|武汉)/g
      ],
      risk_type: [
        /(信用风险|市场风险|操作风险|流动性风险)/g
      ],
      business_type: [
        /(普惠金融|对公业务|零售业务|同业业务|投资银行)/g
      ]
    };

    // 关系提取规则
    this.relationPatterns = [
      // ============ 业务类型与业务指标 ============
      { pattern: /(普惠金融|对公业务|零售业务)[\s\S]*?(贷款余额)/g, relation: 'has_metric' },
      { pattern: /(普惠金融|对公业务)[\s\S]*?(客户数)/g, relation: 'has_metric' },
      { pattern: /(贷款余额|客户数)[\s\S]*?同比[\s\S]*?增长/g, relation: 'year_on_year_growth' },
      { pattern: /(贷款余额|客户数)[\s\S]*?环比[\s\S]*?增长/g, relation: 'month_on_month_growth' },
      
      // ============ 业务类型与客户类型 ============
      { pattern: /(普惠金融)[\s\S]*?(小微企业|个体工商户)/g, relation: 'serve' },
      { pattern: /(对公业务)[\s\S]*?(大型企业|中型企业|制造业客户)/g, relation: 'serve' },
      { pattern: /(小微企业|制造业客户)[\s\S]*?属于[\s\S]*?(普惠金融|对公业务)/g, relation: 'belong_to' },
      
      // ============ 业务指标与区域 ============
      { pattern: /(贷款余额|客户数)[\s\S]*?(长三角|珠三角|中西部|京津冀)/g, relation: 'distribute_in' },
      { pattern: /(长三角|珠三角)[\s\S]*?占比[\s\S]*?([\d.%]+)/g, relation: 'proportion' },
      
      // ============ 业务类型与风险类型 ============
      { pattern: /(普惠金融|对公业务)[\s\S]*?(信用风险|市场风险|操作风险)/g, relation: 'has_risk' },
      { pattern: /(信用风险)[\s\S]*?控制在[\s\S]*?([\d.%]+)/g, relation: 'risk_level' },
      { pattern: /(不良贷款率)[\s\S]*?低于[\s\S]*?(行业平均)/g, relation: 'better_than' },
      
      // ============ 业务类型与业务类型 ============
      { pattern: /(普惠金融)[\s\S]*?属于[\s\S]*?(对公业务)/g, relation: 'sub_business' },
      
      // ============ 区域与业务表现 ============
      { pattern: /(长三角|珠三角)[\s\S]*?表现[\s\S]*?(突出|良好)/g, relation: 'performance' },
      { pattern: /(中西部)[\s\S]*?快速[\s\S]*?(增长|追赶)/g, relation: 'growing_fast' },
      
      // ============ 数字化转型 ============
      { pattern: /(数字化转型)[\s\S]*?(普惠金融|对公业务)/g, relation: 'transform' },
      { pattern: /(线上审批|效率提升)[\s\S]*?(30%|50%|60%|75%)/g, relation: 'improvement' },
      
      // ============ 行业分布 ============
      { pattern: /(制造业|批发零售)[\s\S]*?(贷款余额|占比)/g, relation: 'industry_distribution' },
      
      // ============ 时间周期 ============
      { pattern: /(2024年|月度|季度)[\s\S]*?(普惠金融|对公业务)/g, relation: 'time_period' }
    ];
  }

  /**
   * 从文本中提取实体
   */
  extractEntities(text) {
    const entities = [];
    
    Object.entries(this.entityPatterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          entities.push({
            type,
            name: match[1].trim(),
            match: match[0],
            position: match.index
          });
        }
      });
    });
    
    // 去重
    return _.uniqBy(entities, e => e.name);
  }

  /**
   * 从文本中提取关系
   */
  extractRelations(text) {
    const relations = [];
    
    this.relationPatterns.forEach(({ pattern, relation }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        relations.push({
          type: relation,
          source: match[1].trim(),
          target: match[2] ? match[2].trim() : null,
          match: match[0],
          position: match.index
        });
      }
    });
    
    return relations;
  }

  /**
   * 提取数值信息
   */
  extractNumbers(text) {
    const numberPattern = /([\d,]+(?:\.\d+)?)\s*(亿元|万元|%|户)/g;
    const numbers = [];
    let match;
    
    while ((match = numberPattern.exec(text)) !== null) {
      numbers.push({
        value: match[1].replace(/,/g, ''),
        unit: match[2],
        match: match[0],
        position: match.index
      });
    }
    
    return numbers;
  }

  /**
   * 完整提取流程
   */
  extract(text) {
    return {
      entities: this.extractEntities(text),
      relations: this.extractRelations(text),
      numbers: this.extractNumbers(text)
    };
  }
}

module.exports = KnowledgeExtractor;
