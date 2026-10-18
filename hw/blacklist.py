from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath

from .project import Project, relative

ALARM = "alarm"
HINT = "hint"

GROUP_ADVICE = {
    "A": "删掉免责尾巴，把真正的条件写在结论前",
    "B": "删掉自证标注，把结果写进正文",
    "C": "用能读懂的名称代替编号或哈希",
    "D": "改成直接陈述事实",
    "E": "换成更普通的说法",
}


@dataclass(frozen=True)
class Rule:
    code: str
    group: str
    pattern: str
    level: str = HINT
    advice: str = ""


def rule(code: str, pattern: str, level: str = HINT, advice: str = "") -> Rule:
    return Rule(code, code[0], pattern, level, advice)


RULES: tuple[Rule, ...] = (
    rule("A1", r"不能声称[^。！？]{0,40}", ALARM),
    rule("A2", r"(?:不能保证[^。！？]{0,40}|无法保证)", ALARM),
    rule("A3", r"不代表[^。！？]{0,40}", ALARM),
    rule("A4", r"不替代[^。！？]{0,40}", ALARM),
    rule("A5", r"仅作为[^。！？]{0,30}"),
    rule("A6", r"，(?:尚未|暂未)[^。！？]{0,30}[。！？]"),
    rule("A7", r"不构成[^。！？]{0,40}"),
    rule("A8", r"(?:以(?:实际|官方)[^。！？]{0,10}为准|具体以[^。！？]{0,20}为准)"),
    rule("A9", r"如有(?:疑问|需要|问题|异议)[^。！？]{0,30}"),
    rule("A10", r"等待[^。！？]{0,20}(?:校准|确认|核实|补充)"),
    rule("A11", r"(?:未(?:新)?跑[^。！？]{0,20}|未做[^。！？]{0,15}(?:验证|校准))"),
    rule("A12", r"这(?:只)?验证[^。！？]{0,30}不替代", ALARM),
    rule("A13", r"不等同于[^。！？]{0,20}(?:批准|验收|结论)", ALARM),
    rule("A14", r"(?:按用户授权|经[^。！？]{0,10}终审)"),
    rule("A15", r"仍保留[^。！？]{0,20}(?:身份|责任)"),
    rule("A16", r"(?:边界要说清|别理解成|不要误读)", ALARM),
    rule("A17", r"防御性(?:标记|免责|声明)"),
    rule("A18", r"独立复测"),
    rule("A19", r"(?:以防万一|兜底默认值)"),
    rule("A20", r"免责声明", ALARM),
    rule("B1", r"已核验", ALARM),
    rule("B2", r"未核验", ALARM),
    rule("B3", r"待核实", ALARM),
    rule("B4", r"待确认"),
    rule("B5", r"核验状态", ALARM),
    rule("B6", r"(?:已审核|已审阅)", ALARM),
    rule("B7", r"视觉通过", ALARM),
    rule("B8", r"文件身份校验", ALARM),
    rule("B9", r"(?:区间校验|模拟计算的区间校验)", ALARM),
    rule("B10", r"(?:内容指纹|sha256 校验)"),
    rule("B11", r"全部事实均来自", ALARM),
    rule("B12", r"无内部话术", ALARM),
    rule("B13", r"无虚构细节", ALARM),
    rule("B14", r"全文约\d+\s*字", ALARM),
    rule("B15", r"估算未验证"),
    rule("B16", r"(?:本文|本报告)"),
    rule("B17", r"(?:^|\n)\s*摘要\s*[:：]?"),
    rule("B18", r"本次抓取", ALARM),
    rule("B19", r"材料中"),
    rule("B20", r"(?:已读官方原文|已读原文)", ALARM),
    rule("B21", r"(?:自查|自报完美)"),
    rule("B22", r"Hypo-Info 摘要", ALARM),
    rule("B23", r"未验证"),
    rule("B24", r"已确认"),
    rule("B25", r"未经(?:核实|证实)"),
    rule("C1", r"\bM\d+[a-z]?\b"),
    rule("C2", r"\bC\d{2,3}\b"),
    rule("C3", r"\bStage\s*\d+(?:[.-]\d+)?\b", ALARM),
    rule("C4", r"\bP[0-3]\b"),
    rule("C5", r"\b(?=[a-f0-9]*[0-9])[a-f0-9]{7,64}\b"),
    rule("C6", r"\bsha256:[0-9a-f]{16,}\b", ALARM),
    rule("C7", r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", ALARM),
    rule("C8", r"\b\d{8}T\d{6}\b", ALARM),
    rule("C9", r"\b\d{4}-\d{2}-\d{2}[_-]\d{6}\b", ALARM),
    rule("C10", r"\bwd_\d{4}-\d{2}-\d{2}_[0-9a-f]{8,}\b", ALARM),
    rule("C11", r"\bfact-[0-9a-f]{16,}\.(?:png|jpe?g)\b", ALARM),
    rule("C12", r"-(?:v2|v3|fixed|final-\d+|r2)\b", ALARM),
    rule("C13", r"\bsession-\d+\b"),
    rule("C14", r"\b(?:manifest|receipt|ledger|registry)\.(?:json|ya?ml)\b", ALARM),
    rule("C15", r"\b\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*/"),
    rule("C16", r"\b(?=[a-f0-9]*[0-9])[a-f0-9]{8}\b"),
    rule("C17", r"\bI\d{1,3}\b"),
    rule("D1", r"不是[^。！？]{1,30}(?:，|,)?(?:而是|是)[^。！？]{1,40}"),
    rule("D2", r"并非[^。！？]{1,30}而是"),
    rule("D3", r"不在于[^。！？]{1,30}而在于"),
    rule("D4", r"与其说[^。！？]{1,30}不如说"),
    rule("D5", r"(?:表面(?:上)?[^。！？]{1,30}(?:实际|实则)|看似[^。！？]{1,30}实则)"),
    rule("D6", r"你以为[^。！？]{1,30}其实"),
    rule("D7", r"不仅[^。！？]{1,30}(?:而且|更|还)"),
    rule("D8", r"首先[，,].{0,80}其次[，,].{0,80}(?:最后|最终)"),
    rule("D9", r"随着[^。！？]{1,30}(?:的发展|的进步|的普及|的兴起)"),
    rule("D10", r"在[^。！？]{1,30}(?:的背景|大背景|时代背景)下"),
    rule("D11", r"(?:值得一提的是|值得注意的是|不可否认)"),
    rule("D12", r"(?:综上所述|总而言之|由此可见|可以看出|不难看出|毋庸置疑|无疑)"),
    rule("D13", r"这(?:说明|意味着|表明|显示出|反映出)"),
    rule("D14", r"(?:标志着|有望|值得关注|更稳妥的判断|对开发者来说意味着|整体指向)"),
    rule("D15", r"(?:让我们|接下来我们|下面我们)"),
    rule("D16", r"(?:说白了|换句话说|说到底|事实上|实际上)"),
    rule("D17", r"(?:真正的[^。！？]{1,20}(?:是|在于)|答案是|问题的关键)"),
    rule("D18", r"(?:这就是[^。！？]{1,20}|这才是[^。！？]{1,20})"),
    rule("D19", r"(?:没有[^。！？]{1,20}没有[^。！？]{1,20}只有|不[^。！？]{1,10}不[^。！？]{1,10}只是)"),
    rule("D20", r"——"),
    rule("D21", r"、[^、。！？]{1,15}、[^、。！？]{1,15}、"),
    rule("D22", r"：\s*$"),
    rule("D23", r"(?:记忆|时间|焦虑|情绪|历史)[^。！？]{0,6}(?:仓库|抽屉|温度|钥匙|形状|重量)"),
    rule("D24", r"(?:赋能|助力|打造|闭环|抓手|颗粒度|底层逻辑|范式|护城河)"),
    rule("D25", r"(?:落盘|臂)"),
    rule("D26", r"(?:对齐|拉通|打通|组合拳|生态位)"),
    rule("D27", r"(?:某种意义上|某种程度上|从某种意义上)"),
    rule("D28", r"(?:我们不禁要问|那么问题来了|让我们设想)"),
    rule("D29", r"这不仅是[^。！？]{1,20}更是"),
    rule("D30", r"(?:归根结底|说到底)"),
    rule("E1", r"\b(?:delve|delves|delving|delved)\b"),
    rule("E2", r"\b(?:intricate|intricacies)\b"),
    rule("E3", r"\b(?:underscore|underscores|underscored|underscoring)\b"),
    rule("E4", r"\btestament\b"),
    rule("E5", r"\btapestry\b"),
    rule("E6", r"\blandscape\b"),
    rule("E7", r"\b(?:pivotal|crucial|vital)\b"),
    rule("E8", r"\brobust\b"),
    rule("E9", r"\bseamless(?:ly)?\b"),
    rule("E10", r"\bleverage\b"),
    rule("E11", r"\bfoster(?:ing|s)?\b"),
    rule("E12", r"\bgarner(?:ing|s|ed)?\b"),
    rule("E13", r"\bshowcas(?:e|es|ing|ed)\b"),
    rule("E14", r"\balign(?:s|ed|ing)? with\b"),
    rule("E15", r"\bboasts?\b"),
    rule("E16", r"\bbolster(?:s|ed|ing)?\b"),
    rule("E17", r"\bmeticulous(?:ly)?\b"),
    rule("E18", r"\bnuanced?\b"),
    rule("E19", r"\binterplay\b"),
    rule("E20", r"\b(?:myriad|plethora)\b"),
    rule("E21", r"\bparadigm\b"),
    rule("E22", r"\bholistic\b"),
    rule("E23", r"\bsynerg(?:y|ies|istic)\b"),
    rule("E24", r"\b(?:groundbreaking|cutting-edge|game-changer|game-changing)\b"),
    rule("E25", r"\b(?:not just|not only|not merely)\b[^.!?]{1,60}\b(?:but|it'?s)\b"),
    rule("E26", r"(?:\b(?:it'?s|it is) worth noting\b|\bimportant to note\b)"),
    rule("E27", r"(?:\bin today'?s (?:fast-paced|ever-changing) world\b|\bin an era of\b)"),
    rule("E28", r"\blet'?s (?:dive|unpack|explore)\b"),
    rule("E29", r"(?:\bat the end of the day\b|\bwhen all is said and done\b)"),
    rule("E30", r"(?:\bit remains to be seen\b|\bonly time will tell\b)"),
    rule("E31", r"\b(?:serves?|stands?) as\b"),
    rule("E32", r"\b(?:in conclusion|to sum up|overall,)\b"),
    rule("E33", r"\b\w+, \w+,? and \w+\b"),
    rule(
        "E34",
        r"(?:\bbased on (?:the )?available information\b|\bnot widely (?:documented|available)\b|"
        r"\bshould be treated as\b|\bdoes not by itself establish\b)",
        ALARM,
    ),
    rule("E35", r"\b(?:experts|studies|many)\b[^.!?]{0,20}\b(?:believe|show|argue|suggest)\b"),
    rule("E36", r"(?<!—)—(?!—)"),
    rule(
        "E37",
        r"(?:\bin the realm of\b|\bnavigate the complexities of\b|\bunlock the potential\b|"
        r"\bpave the way\b|\bshed light on\b)",
    ),
    rule("E38", r"\b(?:ever-evolving|multifaceted)\b"),
    rule("E39", r"\b(?:furthermore|moreover)\b"),
)

COMPILED = tuple((item, re.compile(item.pattern)) for item in RULES)
FENCE = re.compile(r"^\s*(?:```|~~~)")
INLINE_CODE = re.compile(r"`[^`]*`")
CONTEXT = re.compile(r"Milestone|Cycle|阶段")
LEAK = re.compile(r"(?:本文|材料中|本次抓取)")


@dataclass
class Finding:
    level: str
    location: str
    message: str

    def to_dict(self) -> dict:
        return {"level": self.level, "category": "黑词", "location": self.location, "message": self.message}


def mask_code(text: str) -> list[str]:
    lines = text.splitlines()
    result: list[str] = []
    fenced = False
    for line in lines:
        if FENCE.match(line):
            fenced = not fenced
            result.append("")
            continue
        result.append("" if fenced else INLINE_CODE.sub("", line))
    return result


def scan_text(
    name: str,
    text: str,
    show_lines: bool = True,
    skip_codes: set[str] | None = None,
    restrict_codes: set[str] | None = None,
) -> list[Finding]:
    skip = set(skip_codes or ())
    restrict = set(restrict_codes or ())
    lines = mask_code(text)
    matches: list[tuple[Rule, int, int, str]] = []
    paragraph_lines: dict[int, list[str]] = {}
    paragraph = 0
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            paragraph += 1
            continue
        paragraph_lines.setdefault(paragraph, []).append(line)
        for item, pattern in COMPILED:
            if item.code in skip:
                continue
            found = pattern.search(line)
            if not found:
                continue
            if item.code in restrict and not line.lstrip().startswith("#"):
                continue
            matches.append((item, number, paragraph, found.group(0)))

    findings: list[Finding] = []
    if matches:
        paragraphs: dict[int, list[Rule]] = {}
        for item, _, index, _ in matches:
            paragraphs.setdefault(index, []).append(item)

        seen: set[tuple[int, str]] = set()
        d_count = sum(1 for item, *_ in matches if item.group == "D")
        for item, number, index, matched in matches:
            if (number, item.code) in seen:
                continue
            if item.group == "D" and d_count >= 5:
                continue
            seen.add((number, item.code))
            level = item.level
            siblings = paragraphs[index]
            context = " ".join(paragraph_lines.get(index, []))
            if item.group == "A" and len({sibling.code for sibling in siblings if sibling.group == "A"}) >= 2:
                level = ALARM
            if item.group == "B" and any(sibling.group == "B" for sibling in siblings) and LEAK.search(context):
                level = ALARM
            if item.code in ("C1", "C2") and CONTEXT.search(context):
                level = ALARM
            if item.group == "E" and len({sibling.code for sibling in siblings if sibling.group == "E"}) >= 3:
                level = ALARM
            location = f"{name}:{number}" if show_lines else name
            advice = item.advice or GROUP_ADVICE[item.group]
            excerpt = matched if len(matched) <= 32 else matched[:31] + "…"
            findings.append(
                Finding(level, location, f"{item.code} 命中「{excerpt}」；{advice}")
            )

        if d_count >= 5:
            findings.append(Finding(HINT, name, f"D 组句式共 {d_count} 处，建议整段重写"))

    filename = PurePosixPath(name).name
    for item, pattern in COMPILED:
        if item.code not in restrict or item.code in skip:
            continue
        found = pattern.search(filename)
        if found:
            advice = item.advice or GROUP_ADVICE[item.group]
            findings.append(
                Finding(item.level, name, f"{item.code} 命中「{found.group(0)}」；{advice}")
            )
    return findings


def document_texts(project: Project) -> list[tuple[str, str]]:
    return [
        (relative(project.root, path), path.read_text(encoding="utf-8"))
        for path in project.document_markdown(include_literal=False, include_root_agents=False)
    ]


def scan_documents(project: Project) -> list[Finding]:
    findings: list[Finding] = []
    for name, text in document_texts(project):
        findings.extend(scan_text(name, text, restrict_codes={"C5", "C16"}))
    return findings


def scan_commit(short: str, message: str) -> list[Finding]:
    lines = [
        line
        for line in message.splitlines()
        if not re.match(r"^(?:Feature|Code|Docs|Verified)\s*:", line)
    ]
    return scan_text(
        f"提交 {short}",
        "\n".join(lines),
        show_lines=False,
        skip_codes={"C5", "C16"},
    )
