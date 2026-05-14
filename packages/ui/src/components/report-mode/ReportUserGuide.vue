<template>
  <div class="report-user-guide">
    <section class="guide-hero">
      <div>
        <p class="guide-kicker">智能报告模块</p>
        <h2>使用手册</h2>
        <p class="guide-summary">
          面向数据分析师、报表人员和业务分析人员，说明从填写报告需求到生成报告初稿的核心流程。
        </p>
      </div>
    </section>

    <nav class="guide-toc" aria-label="用户手册目录">
      <a href="#guide-access">访问地址</a>
      <a href="#guide-flow">使用流程</a>
      <a href="#guide-requirement">填写需求</a>
      <a href="#guide-prompt">Prompt 与指标</a>
      <a href="#guide-datasource">数据源</a>
      <a href="#guide-sql">指标 SQL</a>
      <a href="#guide-generate">生成报告</a>
      <a href="#guide-review">复核要求</a>
    </nav>

    <section id="guide-access" class="guide-section">
      <h3>1. 访问地址</h3>
      <table>
        <tbody>
          <tr>
            <th>试用地址</th>
            <td>请填写实际部署地址</td>
          </tr>
          <tr>
            <th>本地开发地址</th>
            <td><code>http://localhost:18181</code> 或以实际启动端口为准</td>
          </tr>
        </tbody>
      </table>
      <p>进入系统后，在顶部功能模式中选择“智能报告”。</p>
    </section>

    <section id="guide-flow" class="guide-section">
      <h3>2. 核心流程</h3>
      <div class="flow-list">
        <span>填写报告需求</span>
        <span>生成 Prompt 和指标清单</span>
        <span>配置数据源和 SQL</span>
        <span>生成报告正文</span>
        <span>人工复核修改</span>
      </div>
    </section>

    <section id="guide-requirement" class="guide-section">
      <h3>3. 填写报告需求</h3>
      <p>在左侧“报告需求”输入框中填写需要生成的报告内容。</p>
      <pre>生成一份 2025 年第四季度 XX 支行经营分析报告。</pre>
      <table>
        <tbody>
          <tr>
            <th>报告类型</th>
            <td>支行经营分析、零售月报、对公季报等。</td>
          </tr>
          <tr>
            <th>时间范围</th>
            <td>如 2025 年第四季度、2026 年 3 月。</td>
          </tr>
          <tr>
            <th>分析对象</th>
            <td>如 XX 支行、XX 分行、某业务条线。</td>
          </tr>
          <tr>
            <th>分析重点</th>
            <td>如存款、贷款、资产质量、零售业务等。</td>
          </tr>
        </tbody>
      </table>
      <p>如果系统认为信息不足，会显示追问。根据提示补充信息后继续提交。</p>
    </section>

    <section id="guide-prompt" class="guide-section">
      <h3>4. 查看 Prompt 和指标清单</h3>
      <p>系统生成后，左侧会显示报告 Prompt，右侧会显示指标清单。Prompt 中可能包含变量，例如：</p>
      <pre>{{ variableExample }}</pre>
      <table>
        <tbody>
          <tr>
            <th>报告类型是否正确</th>
            <td>确认是否符合本次需求。</td>
          </tr>
          <tr>
            <th>章节结构是否合理</th>
            <td>确认是否覆盖主要分析内容。</td>
          </tr>
          <tr>
            <th>指标是否完整</th>
            <td>确认是否包含核心业务指标。</td>
          </tr>
          <tr>
            <th>Prompt 是否需要调整</th>
            <td>如有必要，可在左侧直接编辑。</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="guide-datasource" class="guide-section">
      <h3>5. 配置数据源</h3>
      <p>点击顶部“数据源管理”，填写数据库连接信息。</p>
      <table>
        <tbody>
          <tr>
            <th>数据库类型</th>
            <td>MySQL、PostgreSQL 等。</td>
          </tr>
          <tr>
            <th>Host / 端口</th>
            <td>数据库地址和端口。</td>
          </tr>
          <tr>
            <th>数据库名</th>
            <td>目标数据库名称。</td>
          </tr>
          <tr>
            <th>用户名 / 密码</th>
            <td>数据库账号信息。</td>
          </tr>
        </tbody>
      </table>
      <p>填写后点击“测试连接”，连接成功后点击保存。建议使用只读账号进行查询。</p>
    </section>

    <section id="guide-sql" class="guide-section">
      <h3>6. 配置并试运行指标 SQL</h3>
      <p>在右侧“指标 SQL 配置”区域中，为必填指标、可选指标或自定义指标填写 SQL。</p>
      <pre>SELECT SUM(loan_balance)
FROM loan_summary
WHERE org_name = 'XX支行'
  AND stat_date = '2025-12-31';</pre>
      <p>点击“试运行”后，系统会返回查询结果。试运行成功后，该结果会自动替换 Prompt 中对应的变量。</p>
      <pre>贷款余额为 {{ loanBalanceVariable }}
贷款余额为 128.36 亿元</pre>
    </section>

    <section class="guide-section">
      <h3>7. 新增自定义指标</h3>
      <p>如果系统生成的指标不够，可以新增自定义指标。</p>
      <table>
        <tbody>
          <tr>
            <th>指标名称</th>
            <td>如“不良贷款率”。</td>
          </tr>
          <tr>
            <th>变量名</th>
            <td>如 <code>npl_ratio</code>。</td>
          </tr>
          <tr>
            <th>单位</th>
            <td>如 <code>%</code>、亿元、户。</td>
          </tr>
          <tr>
            <th>指标说明</th>
            <td>可选，用于说明指标含义。</td>
          </tr>
        </tbody>
      </table>
      <p>变量名建议使用英文小写和下划线，例如 <code>loan_balance</code>、<code>npl_ratio</code>。</p>
    </section>

    <section id="guide-generate" class="guide-section">
      <h3>8. 生成报告正文</h3>
      <p>当 Prompt 和主要指标准备完成后，在右侧报告生成区域选择模型，点击执行按钮。</p>
      <table>
        <tbody>
          <tr>
            <th>查看</th>
            <td>检查报告内容。</td>
          </tr>
          <tr>
            <th>复制</th>
            <td>复制到正式文档中。</td>
          </tr>
          <tr>
            <th>编辑</th>
            <td>根据业务情况调整。</td>
          </tr>
          <tr>
            <th>复核</th>
            <td>校验数据和表述是否准确。</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="guide-review" class="guide-section">
      <h3>9. 复核要求</h3>
      <table>
        <tbody>
          <tr>
            <th>数据结果</th>
            <td>是否与 SQL 查询结果一致。</td>
          </tr>
          <tr>
            <th>指标口径</th>
            <td>是否符合实际业务口径。</td>
          </tr>
          <tr>
            <th>时间范围</th>
            <td>是否与报告需求一致。</td>
          </tr>
          <tr>
            <th>分析结论</th>
            <td>是否符合业务实际。</td>
          </tr>
          <tr>
            <th>表述内容</th>
            <td>是否存在不准确或过度推断。</td>
          </tr>
        </tbody>
      </table>
      <p class="guide-note">生成报告应作为报告初稿使用，不建议未经复核直接作为正式报告发布。</p>
    </section>

    <section class="guide-section">
      <h3>10. 常见问题</h3>
      <table>
        <tbody>
          <tr>
            <th>系统持续追问</th>
            <td>补充报告类型、时间范围、分析对象等信息。</td>
          </tr>
          <tr>
            <th>没有指标清单</th>
            <td>检查报告需求是否明确，必要时重新生成。</td>
          </tr>
          <tr>
            <th>数据源连接失败</th>
            <td>检查地址、端口、账号、密码和网络权限。</td>
          </tr>
          <tr>
            <th>SQL 试运行失败</th>
            <td>检查 SQL 语法、表名、字段名和查询条件。</td>
          </tr>
          <tr>
            <th>变量没有替换</th>
            <td>确认对应指标 SQL 是否试运行成功。</td>
          </tr>
          <tr>
            <th>报告结果不理想</th>
            <td>调整 Prompt、补充指标或修改报告需求。</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
const variableExample = '{{loan_balance}}\n{{deposit_balance}}\n{{npl_ratio}}'
const loanBalanceVariable = '{{loan_balance}}'
</script>

<style scoped>
.report-user-guide {
  color: var(--text-color-1);
  line-height: 1.7;
}

.guide-hero {
  padding-bottom: 18px;
  border-bottom: 4px solid #6b168a;
}

.guide-kicker {
  margin: 0 0 8px;
  color: #6b168a;
  font-size: 13px;
  font-weight: 700;
}

.guide-hero h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}

.guide-summary {
  margin: 12px 0 0;
  color: var(--text-color-2);
}

.guide-toc {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 18px 0 24px;
  padding: 14px;
  background: var(--card-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.guide-toc a {
  color: #6b168a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.guide-section {
  margin-top: 28px;
}

.guide-section h3 {
  margin: 0 0 12px;
  font-size: 18px;
  line-height: 1.35;
}

.guide-section p {
  margin: 0 0 12px;
  color: var(--text-color-2);
}

table {
  width: 100%;
  margin: 10px 0 16px;
  border-collapse: collapse;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  vertical-align: top;
}

th {
  width: 30%;
  background: color-mix(in srgb, #6b168a 7%, transparent);
  color: var(--text-color-1);
  font-weight: 700;
}

tr:last-child th,
tr:last-child td {
  border-bottom: 0;
}

pre {
  margin: 10px 0 16px;
  padding: 12px 14px;
  overflow-x: auto;
  white-space: pre-wrap;
  background: color-mix(in srgb, #6b168a 6%, transparent);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-color-1);
  font-size: 13px;
  line-height: 1.55;
}

code {
  font-family: Consolas, Menlo, monospace;
}

.flow-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.flow-list span {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-color);
  color: var(--text-color-1);
  font-weight: 600;
}

.guide-note {
  padding: 12px 14px;
  border-left: 4px solid #f39a18;
  background: color-mix(in srgb, #f39a18 10%, transparent);
  border-radius: 6px;
}

@media (max-width: 720px) {
  .guide-toc {
    grid-template-columns: 1fr;
  }
}
</style>
