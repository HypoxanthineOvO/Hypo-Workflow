# 项目规则：给本项目的 Agent 和用户看

## 项目一句话

Hypo-Workflow 3.0：给 Agent 用的项目文档规范，以及查询和检查工具 hw。

## 构建与测试

```bash
python3 -m unittest discover -s tests -v
```

## 文档地图

| 放什么 | 在哪 | 怎么写 |
| --- | --- | --- |
| 给用户看的说明 | README.md | 是什么、怎么装、怎么用 |
| 设计依据 | docs/设计.md | 只写现在，推翻就改写 |
| 安装到项目的模板 | templates/ | 通用 AGENTS.md、RULES.md、STATUS.md、BOARD.md、需求文件、三种起步地图 |
| 宿主技能 | skills/ | init 等，装进 Agent 宿主 |
| 状态与进度 | STATUS.md | 只写现在 |

hw 的代码在 `hw/`，测试在 `tests/`；代码改动的说明写在提交信息里，3.0 暂不为 hw 自己建需求文件。

## 分工

| 谁 | 负责什么 | 不碰什么 |
| --- | --- | --- |
| （填） | （填） | （填） |

## 汇报格式

先说结论，在对话里讲清楚，不只给文件路径。

## 禁区

（填）

## 不需要描述

hw/、templates/、skills/
