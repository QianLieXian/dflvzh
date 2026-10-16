# DFCN 翻译算法与离线数据

本项目把 DFCN 的名称翻译逻辑移植为浏览器 JavaScript，读取的是 2026-10-16 工作区版本。原项目只作为只读来源，未修改、编译或部署 DFCN。应用运行时不访问其目录，不调用 Node.js、Python、网络服务或本机进程。

## 复用的算法

- `src/english_character_names.h`：完整词义选择、双词根切分、姓氏组合、头词/修饰词、`the` / `of` 分组、连字符、昵称保留和整名覆盖。覆盖表中的个人全名仍按原代码重新计算姓氏；不能把旧覆盖表的中文文本视为最终结果。
- `src/character_surname_context.inc`：语义类别继承、论元许可、语境意象选择、七类候选形态、正反词序、保义分、词汇自然度和确定性择优。
- `src/mandarin_name_readings.h` / `src/mandarin_name_prosody.h`：词语和单字读音、多音字不确定性、单字从完整词义借读、音步动态规划、主次突出、连读两种假设、一/不变调、三声变调及同音/押韵评分。
- `src/history_names.inc`：原语 CV 音节、连辅音和韵尾的完整音译表；提供 WORD/POS 时使用对应槽位的构词、中心词、所有关系及隐藏 slot 4 规则。
- `src/english_name_transliteration.h` / `src/english_hanzi_transcription.h`：英式词典优先、词性同形异音、复数/所有格/过去式/进行式、真实 WORD 词根边界、英式 IPA → RP 音素 → 汉字的完整音组表。Hampton / field / Campbell / Panorama / Snow Hill 仍有原版惯用音译优先级。
- `src/english_uk_g2p.h`：同一 English UK Phonetisaurus OpenFST 模型、字素/音素簇、支持负 backoff 权重的无 beam 最短路径，以及同成本时的确定性选择。模型 gzip 只是无损存储；解压、解析、预测均在当前浏览器内完成。
- `src/site_names.inc`：真实地点类型后缀。不会仅因译名已出现“塔”“堡”就删去原算法要求的属性后缀。
- `src/civilization_name_terms.inc` / `src/site_government_name_terms.inc`：文明专用 HEAD/ADJ/OF 和 `OF:HEAD`，NATION 的单复数“国/诸国”，地方政府自己的中心意象、真实母文明中心词对应的逐项后缀、独立后缀匹配的原权重。无法确认治理上下文时使用原版中性“治所”。
- `src/dfcn.cpp` 的生成名语法：世界、地区、神器的普通 WORD 词义与词性、后置动作/形容词倒装、名词连字符头、`of The` 嵌套关系、地区专用中心词；固定时代名和原版时代序数格式。

## 已打包的数据

`js/translation-data.js` 包含完整相关表，重复字符串和意象分支只做无损去重：

| 数据 | 条目数 |
| --- | ---: |
| 人名词义 | 7,606 |
| 姓氏词义与语义元数据 | 7,606 |
| 姓氏语境意象 | 117,582 |
| 类别 / 构式 | 288 / 142 |
| WORD/POS 普通词义 | 3,301 |
| 普通生成名词汇 | 5,972 |
| 文明 HEAD/ADJ/OF | 452 |
| 地方政府专用词 | 56 |
| 母文明后缀 / 独立后缀 | 447 / 69 |
| 原语词形（四种原版语言） | 8,433 |
| 全部字面 UI/词汇译文 | 87,752 |

英文字形及原语词形来自本机原版 `vanilla_languages/objects/language_words.txt` 与 DWARF/ELF/GOBLIN/HUMAN RAW，保留 WORD、POS 与单复数对应。已审原语译名只导入 DFCN 允许的原语词形命名空间，不把普通英文 UI 译文当人名音译。

中文读音表只删除名称算法不可能访问的内容：保留所有已登记中文形式及完整词义所能命中的字、长度不超过六字的词片段和全部异读。评分按各个已登记词形分别读音，生成后的词形不会反过来认证词汇，因此该裁剪不改变候选读音或评分。

`js/translation-phonetics.js` 含完整 Britfone 与 English UK MFA 词典，以及与 DFCN 相同的 gzip 模型。`await DFTranslate.ready` 完成模型解压、索引与词典初始化；后续名称 API 为同步调用。Chromium 中以 `file://` 实测初次初始化约 0.65 秒；实际速度取决于浏览器和设备。打包文件约 29 MB，用于完全离线运行。

## 浏览器 API

```js
await DFTranslate.ready;
DFTranslate.name('Urist Copperhammer', { kind: 'figure', givenName: 'Urist' });
DFTranslate.name('The Golden Anvils', { kind: 'entity', entityType: 'civilization' });
DFTranslate.name('The Silver Council', {
  kind: 'entity', entityType: 'sitegovernment', parentHead: 'ANVIL'
});
DFTranslate.name('Copperhearth', { kind: 'site', type: 'mountain halls' });
DFTranslate.term('dwarf');
DFTranslate.explain('Copperhearth', { kind: 'site', type: 'mountain halls' });
```

`kind` 支持 `figure`、`site`、`entity`、`artifact`、`region`、`world`、`era`。也可把 kind 字符串直接作为第二参数。`explain` 返回原文、译文、处理路径和上下文。

`polityHead(英文母文明名)` 只在头词对应唯一 WORD 时返回 `{ head, plural }`。应用仅从 XML 明确的唯一 `entity_link` / `PARENT` 关系取真实母实体，再传入 `parentHead` 和 `parentPlural`；缺少或冲突的关系不会被种族、名称拼写或居住地点替代。

高级调用者可提供 `words`，为七个槽位的 `{ id, pos, english }` 数组；`english` 可从已打包原版 WORD/POS 表补全。`entityName(text, slots)`、`compound(text)`、`englishPhonetic(text, slots)` 和 `nativeName(text)` 也公开供透明对照。

## 导出信息的边界

算法相同不代表能从 Legends XML 恢复游戏内存里所有信息。XML 常缺少原始七槽 WORD/POS、昵称显示模式、当前/历史治理状态、唯一母文明、真实文化 RAW、完整居址形态或模组自定义 language_words。应用使用实有 `translated_name` / 英文生成名、原语 first-name 字段和明确实体关系；原文始终保留并参与搜索。同形词缺乏唯一 WORD 时，不能保证与掌握额外元数据的游戏内结果完全一致。

固定时代名可直接使用同一词表；依赖特定历史人物或物种身份的动态时代名，在 XML 缺少那部分原生身份时只能保留或按现有文本词汇处理。导出的英文名不能证明一个昵称是自动生成的，作者昵称按原代码保留。没有真实自治状态就不会推断“自治市”等政治身份。

浏览器不包含游戏注入、进程内存读取、世界实时刷新、CP437 字体渲染、窗口钩子或对游戏的部署逻辑。输入 XML 已由浏览器解码为 Unicode；缺少的游戏内身份不会伪装成已经读取。

## 与原实现的对照

在 `/tmp` 建立独立参考驱动，直接包含只读 DFCN 的原始 `EnglishCharacterNames` 与 `EnglishNameTransliterator` 头文件，并直接读取其运行数据；未运行其构建部署入口，也未改动原仓库。179 个例子（含 150 组固定种子的真实词典词根、人物全名/称号、实体名、词典音译和未登录词 G2P）与真实 `file://` Chromium 的输出逐字一致。参考驱动并非另写一份相似算法作为 oracle。

部分实际一致的结果：

| 输入 | 原 DFCN 类与 JavaScript 的结果 |
| --- | --- |
| Urist Bitechannel | 乌里斯特·引导齿痕 |
| Rovod Mastershield | 罗沃德·保护主人 |
| Ilral Spearcobalt | 伊拉尔·坚钴精矛 |
| Urist the Silent Keeper of Ash | 乌里斯特·灰之静默守护者 |
| The Tower of Dreams（不含地点后缀） | 梦境之高塔 |
| Glimmerstone（英式音译） | 格里默斯顿 |
| Northvale（英式音译） | 诺斯韦勒 |

政治中心词、母文明后缀和地点后缀另按原代码分支与原 TSV 对照；它们属于 `Overlay` 的上下文逻辑，不能用通用 `entity_name` 的输出作为其 expected。普通生成名分支采用当前词义表；原源码内部分较早的 self-test 固定文本与当前词义数据已有差异，未把这些旧文本冒充当前运行结果。

## 更新与许可

维护者可运行 `python3 tools/import-dfcn.py /path/to/dfcn` 重新打包；这是可选的开发工具，用户打开 HTML 不需要 Python。它只读取输入，输出本项目的 JavaScript 与许可副本，不运行 DFCN 生成器。原版 RAW 默认路径在脚本中明确列出，移机维护时可调整。

DFCN 原创代码与数据为 CC BY-NC-SA 4.0；DFI18n / dfzh 翻译数据保留各自 CC BY-NC 等许可和译者署名。完整声明随本项目保存在 `licenses/dfcn-THIRD_PARTY_NOTICES.md`，DFCN 许可为 `licenses/dfcn-LICENSE.txt`。

- Britfone：Jose Llarena，MIT，保留 `licenses/britfone-LICENSE.txt`。
- English UK MFA dictionary / G2P：Michael McAuliffe 与 Morgan Sonderegger，CC BY 4.0，保留 `licenses/MFA-LICENSE.txt` 以及完整来源、固定版本与引用 `licenses/english-pronunciation-SOURCE.txt`。
- pinyin-data / phrase-pinyin-data：mozillazg，MIT，分别保留 `licenses/pinyin-LICENSE.txt` 与 `licenses/phrase-pinyin-LICENSE.txt`。固定版本来源详见 DFCN 的第三方声明；打包时只裁剪不可达读音，不改变所保留读音内容。

这些 JavaScript 为本地 DFCN 原代码的移植及数据格式转换，未改变原资源的权利人或许可。

## 原版界面、技能与历史叙述

新增 `translation-ui-data.js` / `translation-ui.js` 提供原版 141 项技能、21 个等级阈值、137 个事件入口和历史文本处理。它复用 DFCN 原编译 h 语法 48,936 条及历史术语 42,007 项；Viewer 与游戏原生措辞不同之处的界面中文句式单独注明，不冒充 DFCN 原数据。姓名、中心词、后缀、译名与读音算法没有改用另一套规则。完整来源、34 类页面的 212 列清单、九类筛选字段、137 类事件及验证边界见 [TRANSLATION_COVERAGE.md](TRANSLATION_COVERAGE.md)。

可选维护导入：`python3 tools/import-dfcn-ui.py /path/to/dfcn /path/to/LegendsViewer-Next`。只读取参考仓库，生成本项目静态 JavaScript；打开应用不需要该工具、Python 或 Node。
