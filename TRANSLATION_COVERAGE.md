# 翻译、列与筛选的来源核对

本清单对应本地只读参考源码 `Kromtec/LegendsViewer-Next` 与 `~/workspace/dfcn`。运行时仍是普通 `file://` HTML；Python 仅用于维护导入脚本和浏览器自动化。

## 来源与职责

- `js/translate.js`、`translation-data.js`、`translation-phonetics.js`：既有 DFCN 姓名、译名、中心词、后缀、复合词和音译算法移植，详见 `TRANSLATION.md` 的 179 个原 C++ 对照及 XML 元数据边界。此轮没有更换姓名算法。
- `tools/import-dfcn-ui.py` 只读 DFCN 已编译的 `data/runtime/translations.tsv`、`skills.toml`、`creatures/name.toml` 及其 `raw_names.toml` 子规则集、已抽取的原生生物名称来源表，以及原版 `SkillDictionary.cs`、`Skill.cs`、`XMLParser.cs` 与事件类，生成 `js/translation-ui-data.js`。不会运行或改动 DFCN 的生成器、构建或游戏部署。
- 该数据包含原 DFCN 历史文本模板 **48,936** 条、历史术语 **42,007** 项；原版技能 **141** 项、等级阈值 **21** 个；XML 注册事件 **136** 类，加原版根据战役派生的 `BattleFought` 一类。
- `js/translation-ui.js` 使用上述 DFCN 模板、同一姓名引擎和词典处理叙述。原版 Viewer 的 `Print()` 与游戏原生 Legends 的用语不同之处，另有 **139 条 Viewer 界面句式**，按同类 typed capture 规则扩展为 **1,428** 条。它们是本项目对原版界面的中文本地化，**不是声称原 DFCN 已有的翻译数据**。
- 人物、地点、组织、书名、事件集等引用在匹配时是带类别的不可分割项；链接 HTML 不进入姓名或句式解析器。原始 XML 文本不会作为 HTML 执行。
- `js/upstream-ui.js` 保存原版导航、分类、表头、详情卡顺序、英文原标注和源视图名；`js/filters.js` 对应原版九种 `components/filter/*.vue`，比较值仍使用原版枚举。

## 领域与类别词

`DFTranslate.sphere(value)` 与 `DFTranslate.term(value, {domain: 'sphere'})` 使用 DFCN 独立的 `r` 神域词表：130 个原版领域、`no sphere` 以及三种拼写别名，共 134 项。列表按 `Overlay::translate_deity_spheres` 处理冠词、逗号和 `and`，分别连接为“、”与“和”；XML 数组也可直接传入。领域中的 `mountains` 为“山峦”、`muck` 为“污泥”，不会误用构成人名的其他词义，也不会对未知领域音译。

`term(value, {domain: 'terrain'})` 对应原版 `RegionType` 的 14 种类型，复用 DFCN 的 `Book title subject:`、`Region name:` 和已有字面词条，包括草原、湿地、丘陵和沙漠。`domain: 'entityType'` 优先使用 DFCN 组织类型词条，如 `civilization` 为“政权”；`domain: 'creature'`（或 `race`）用于种族词，如 `kobold` 为“狗头人”。旧式 `term(value, 'sphere')` 调用仍可使用。调用处须传递领域类别；专名继续使用既有 `name()`，原始枚举与名称仍用于检索。

## 生物 raw ID 与显示词

`domain: 'creature'`（以及 `race`、`species` 别名）使用 DFCN `data/runtime/rulesets/zh-Hans/creatures/name.toml` 及其优先委托的 `name/raw_names.toml` 子规则集，合计 **3,525** 个审定单复数字面词。`tools/import-dfcn-ui.py` 同时只读 DFCN `data/extracted/adventure-smell/odor-raw-creature-name-sources.tsv` 和 `data/extracted/symbol-picker-descriptions/artifact-shared-source-catalog.tsv`，按原生 `CREATURE` 的 `NAME[0]` 建立 **967** 个 raw ID 对应，包含全部 **200** 个灭绝生物 ID；其中 **419** 个 raw ID 与显示名称不同，合并后有 **3,944** 个界面词条。原有 1,706 个界面值全部保持不变。

例如 `BIRD_ROC` → `roc` → “大鹏鸟”，`COLOSSUS_BRONZE` → `bronze colossus` → “青铜巨像”，`JURASSIC_AFROVENATOR` → `afrovenator` → “强颈猎龙”，`CENOZOIC_ENTELODON` → `entelodon` → “完齿兽”。完整 catalog 的 967 个 ID 及全部 NAME 字段与本机 DFCN 标准 RAW 来源一致。只统一大小写、下划线和空格，不去掉时代前缀猜词，不逐词拼译未知模组 ID。数据只进入界面域，不修改姓名、译名、中心词、后缀或音译数据与算法。

列表的历史人物“类型”列、人物详情种族标题、旅途宠物和事件种族字段共用此入口；包括死亡事件的匿名杀手、变换种族、驯服宠物及吞食事件的受害种族。吞食事件兼容原版 `race` 和 `victim_race`，已有关联人物时优先显示人物链接。筛选比较继续使用原 raw 值。上游 `HistoricalFigures.vue` 表头明确为 `Type`、`Caste`，所以保留当前“类型”“种姓”的列结构。`python3 tests/browser-creature-raw.py` 通过真实 XML 记录解析后检查列表、详情、宠物、筛选和匿名杀手事件的实际 DOM；未知模组 ID 仍保留原文。

## 神器的专名与物品描述

原 XML 有神器 `name` 或 `translated_name` 时继续使用既有译名算法。没有专名、只有 `item.name_string` 时，按原版 `Artifact.cs` 采用该物品描述作为显示名称，并通过 `LegendsItemTranslate` 解析；旧缓存已把物品描述写入顶层显示名称时，仍依据保留的 `raw` 来源区分。这不改写原字段，也不复用旧的专名翻译缓存。

`tools/import-dfcn-items.py` 只读 DFCN 的 `translations.tsv`、物品及材质 TOML 命名空间、`item_designation.h` 和原生物品词表，生成 `translation-item-data.js`。`item-translate.js` 对应 `translate_legends_item` 及其物品、书籍、材质和品质符号处理；材质名词与成品修饰形态分别来自同一 MagicalMaterial 表。例如 `primordial wood` 单独为“原初木头”，组合 `primordial wood crossbow` 为“原初木十字弩”。原 CP437 `0x11` / `0x10` 对应显示 `◄` / `►`，不再丢掉品质标记。

数据含 529 个命名空间、9,563 条 TOML 规则、45,339 个精确字面词、1,001 对材质词形和 8 条书籍规则。皮纸等物品涉及的生成生物按 `creature_descriptors.inc` 使用 10,466 个原有类别词与 8,433 个原生语言词的语言位掩码；只有通过原版语言或构词证明的明确所有者位置才可使用既有姓名算法。范围为 Legends 物品名称；依赖运行中世界身份、动态乐器定义等专用解析器的输入，缺少可用来源时保留原文。

列表、详情和事件中的神器链接共用该入口；专名神器的“原名”物品摘要也使用同一物品解析器，摘要与名称相同时按上游隐藏重复项。历史句式中的 `{i}` 使用该入口，其他类别仍保留原有语义。无法完整匹配的物品描述保留整条原文；不对未知材质或普通物品词做姓名音译。所有输出仍经过 HTML 转义。

本次只读定位实际 XML 的约 14.3 MB 神器段：48,624 件中 47,988 件有专名，636 件回退至物品描述，共 311 种文本。311 种全部匹配，无预算超限或浏览器错误；11 个独立来源预期逐字一致，5 类未知输入保留原文。实际应用的列表、详情、事件链接、双语搜索、旧保存形状及两种存储路径刷新另通过 466 项检查；原始 XML 和字段未变。此覆盖结论限定于这份实际世界的物品描述，不等于穷尽任意模组。

## 验证范围

普通 `file://` Chromium、无放宽文件访问参数：`python tests/browser-translation.py` 共 **1,816 项检查**通过，包括全部下列表头、分类、141 项技能及 21 个阈值边界、137 个事件入口、类型约束、安全转义、集合序号标题和筛选的摘要/完整记录区分。生物页面另有 **31 项**原生检查，覆盖人物列表、详情、真实 XML 解析后的匿名杀手事件、未知模组 ID 和原始枚举不改写。

另从用户 4,164,648,495 字节 XML 定点读取年 454 的两条实际死亡事件（1557986、1559351）及其引用，使用独立临时 Chromium profile 在实际应用事件表显示“强颈猎龙”和“完齿兽”。人物、地点链接正确，事件原始字段逐项保留；数据库写入为零，原 XML 大小与修改时间不变。此次没有重新导入世界、创建索引或重算统计。

另从用户真实世界已保存的小型 header 索引抽取每种真实事件的首条完整记录及引用，**100 种 / 100 条**全部生成完整中文叙述；验证包含原应用的 `span` 包裹对象链接。未为这次抽样重读或修改原 3.9 GB XML。可用 `python tests/browser-translation.py --samples /path/samples.json` 重现；文件是 `{ "samples": [{ "record": ..., "refs": [{"kind": ..., "id": ..., "record": ...}] }] }`。用户世界样本保存在临时目录，不打包进项目。

这验证了每个入口和上述实际样本，**不等于穷尽每个事件全部可选字段、模组和枚举组合**。未知或无法完整匹配的输入保留原文/实际角色字段，`eventInfo()` 的 `translated` 可检查是否命中完整句式；不会凭引用顺序猜测事件角色。游戏内额外身份、七槽 WORD/POS、完整 RAW 等 XML 未导出的信息仍无法恢复。

## 世界纪录缓存的显示翻译

纪录缓存保留源名称与枚举；`records.js` 在绘制六个标签页、21 张卡片时按字段翻译领域、职位、派系名、作者名、种族与地形，悬浮提示使用对应中文标题。领域摘要兼容旧缓存中的顿号、中文逗号、空数组及已中文文本；不会改写缓存或提升索引/统计版本。已有世界刷新后可直接使用，无需重新读取 XML。作者只有 `authorNames` 缓存时仍通过人物姓名算法；领袖所属派系按原任期和组织关联选择。

`python tests/browser-record-translation.py` 在不加载解析器、索引器和统计器的页面中回放旧英文缓存，121 项检查覆盖六页、21 张卡、姓名/类型/领域、链接/排名/数值不变以及缓存不变。`--screenshots /path` 可保存各页截图；夹具数据用于验证显示路径，不代表用户真实世界。

## 分类与列表列

共 34 类、212 个列表列。英文列名/键保留在 `LegendsUI.categories[kind].tableHeaders` 的 `originalEnglish` / `key` 中。

| 分类键 | 中文标题 | 原版视图 | 列 |
| --- | --- | --- | --- |
| `figures` | 历史人物 | `src/views/HistoricalFigures.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、种姓 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `entities` | 派系与团体 | `src/views/Entities.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、种族 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `sites` | 地点 | `src/views/Sites.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、区域 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `artifacts` | 神器 | `src/views/Artifacts.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、子类型 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `regions` | 区域 | `src/views/Regions.vue` | 编号 (`id`)、名称 (`html`)、生物群系 (`type`)、邪恶程度 (`subtype`)、面积 (`squareTiles`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `undergroundregions` | 地下区域 | `src/views/UndergroundRegions.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、深度 (`subtype`)、面积 (`squareTiles`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `landmasses` | 陆块 | `src/views/Landmasses.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `rivers` | 河流 | `src/views/Rivers.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `mountainpeaks` | 山峰与火山 | `src/views/MountainPeaks.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、高度 (`heightMeter`)、世界排名 (`worldRank`)、区域 (`regionLink`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `structures` | 建筑 | `src/views/Structures.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `constructions` | 工程 | `src/views/Constructions.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、长度 (`squareTiles`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `danceforms` | 舞蹈形式 | `src/views/DanceForms.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `musicalforms` | 音乐形式 | `src/views/MusicalForms.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `poeticforms` | 诗歌形式 | `src/views/PoeticForms.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `writtencontents` | 书面作品 | `src/views/WrittenContents.vue` | 编号 (`id`)、名称 (`html`)、类型 (`type`)、作者 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `eras` | 时代 | `src/views/Eras.vue` | 编号 (`id`)、时长 (`type`)、起止时间 (`subtype`)、名称 (`html`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `wars` | 战争 | `src/views/Wars.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、进攻方与防守方 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `battles` | 战役 | `src/views/Battles.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、进攻方与防守方 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `duels` | 决斗 | `src/views/Duels.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `raids` | 袭掠 | `src/views/Raids.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、进攻方与防守方 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `siteconquerings` | 地点征服 | `src/views/SiteConquerings.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、结果 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `insurrections` | 起义 | `src/views/Insurrections.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `persecutions` | 迫害 | `src/views/Persecutions.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `purges` | 清洗 | `src/views/Purges.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `coups` | 政变 | `src/views/Coups.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `rampages` | 肆虐 | `src/views/BeastAttacks.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `abductions` | 绑架 | `src/views/Abductions.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `thefts` | 盗窃 | `src/views/Thefts.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、进攻方与防守方 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `processions` | 游行 | `src/views/Processions.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、文明 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `performances` | 演出 | `src/views/Performances.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、文明 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `journeys` | 旅程 | `src/views/Journeys.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `competitions` | 竞赛 | `src/views/Competitions.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、文明 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `ceremonies` | 典礼 | `src/views/Ceremonies.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、文明 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |
| `occasions` | 庆典 | `src/views/Occasions.vue` | 开始 (`startDate`)、结束 (`endDate`)、名称 (`html`)、类型 (`type`)、文明 (`subtype`)、纪事 (`eventCollectionCount`)、事件 (`eventCount`) |

## 筛选数据边界

`LegendsFilters.requirements(kind,rules)` 返回实际依赖字段；`assess(record,kind,rules,context)` 返回 `{matches,possible,unknown,values}`。未知字段不当作数字零或布尔假。磁盘摘要用 `__headerOnly=true` 标记；需要原始字段时应取完整记录，再合并源事件可推导的统计。`completeGroups`/`recordsComplete` 明确标记完整集合，磁盘世界的空数组不能证明没有事件。

| 分类 | 原版筛选属性 |
| --- | --- |
| `figures` | `IsAlive`、`IsDeity`、`IsVampire`、`IsWerebeast`、`IsNecromancer`、`Age`、`BirthYear`、`DeathYear` |
| `entities` | `IsCiv`、`HasCurrentSites`、`WorshipsDeity`、`EntityType`、`CurrentSitesCount`、`WarCount` |
| `sites` | `IsOccupied`、`HasStructures`、`SiteType`、`StructureCount`、`BattleCount` |
| `artifacts` | `IsHeld`、`IsWrittenContent`、`IsLocatedInSite`、`Type`、`PageCount` |
| `regions` | `Biome`、`Evilness`、`HasSites`、`HasForce`、`SquareTiles`、`SiteCount`、`BattleCount` |
| `structures` | `StructureType`、`StructureSubType`、`HasInhabitants`、`HasDeity`、`HasReligion`、`HasEntity`、`HasCopiedArtifacts`、`InhabitantCount`、`CopiedArtifactCount` |
| `wars` | `IsOngoing`、`DeathCount`、`AttackerDeathCount`、`DefenderDeathCount`、`BattleCount`、`SitesLostCount`、`Length` |
| `battles` | `Outcome`、`HasMercenaries`、`HasUndeadSquads`、`HasNotableDefenders`、`TotalDeaths`、`AttackerCount`、`DefenderCount`、`AttackerDeaths`、`DefenderDeaths` |
| `writtencontents` | `WrittenContentType`、`HasStyles`、`HasReferences`、`HasArtifact`、`PageCount` |

原版 XML/Plus 缺字段与模组未知值需要保留为未知；源事件可计算的统计应走存储层的 `metrics()`，不能把尚未加载的全世界数据当成已加载。

## 事件来源清单

每行对应原版的确切类；`BattleFought` 是原版派生事件，非 XML 里的第 137 种类型。完整源文件相对路径和角色 XML 键同时保存在 `DFCN_UI.events[type]`。

| XML 类型 / 派生类型 | 原版类 | 来源 |
| --- | --- | --- |
| `add hf entity link` | `AddHfEntityLink` | `Events/AddHFEntityLink.cs` |
| `add hf hf link` | `AddHfhfLink` | `Events/AddHFHFLink.cs` |
| `attacked site` | `AttackedSite` | `Events/AttackedSite.cs` |
| `body abused` | `BodyAbused` | `Events/BodyAbused.cs` |
| `change hf job` | `ChangeHfJob` | `Events/ChangeHFJob.cs` |
| `change hf state` | `ChangeHfState` | `Events/ChangeHFState.cs` |
| `changed creature type` | `ChangedCreatureType` | `Events/ChangedCreatureType.cs` |
| `create entity position` | `CreateEntityPosition` | `Events/CreateEntityPosition.cs` |
| `created site` | `CreatedSite` | `Events/CreatedSite.cs` |
| `created world construction` | `CreatedWorldConstruction` | `Events/CreatedWorldConstruction.cs` |
| `creature devoured` | `CreatureDevoured` | `Events/CreatureDevoured.cs` |
| `destroyed site` | `DestroyedSite` | `Events/DestroyedSite.cs` |
| `field battle` | `FieldBattle` | `Events/FieldBattle.cs` |
| `hf abducted` | `HfAbducted` | `Events/HFAbducted.cs` |
| `hf died` | `HfDied` | `Events/HFDied.cs` |
| `hf new pet` | `HfNewPet` | `Events/HFNewPet.cs` |
| `hf reunion` | `HfReunion` | `Events/HFReunion.cs` |
| `hf simple battle event` | `HfSimpleBattleEvent` | `Events/HFSimpleBattleEvent.cs` |
| `hf travel` | `HfTravel` | `Events/HFTravel.cs` |
| `hf wounded` | `HfWounded` | `Events/HFWounded.cs` |
| `impersonate hf` | `ImpersonateHf` | `Events/ImpersonateHF.cs` |
| `item stolen` | `ItemStolen` | `Events/ItemStolen.cs` |
| `new site leader` | `NewSiteLeader` | `Events/NewSiteLeader.cs` |
| `peace accepted` | `PeaceAccepted` | `Events/PeaceAccepted.cs` |
| `peace rejected` | `PeaceRejected` | `Events/PeaceRejected.cs` |
| `plundered site` | `PlunderedSite` | `Events/PlunderedSite.cs` |
| `reclaim site` | `ReclaimSite` | `Events/ReclaimSite.cs` |
| `remove hf entity link` | `RemoveHfEntityLink` | `Events/RemoveHFEntityLink.cs` |
| `artifact created` | `ArtifactCreated` | `Events/ArtifactCreated.cs` |
| `diplomat lost` | `DiplomatLost` | `Events/DiplomatLost.cs` |
| `entity created` | `EntityCreated` | `Events/EntityCreated.cs` |
| `hf revived` | `HfRevived` | `Events/HFRevived.cs` |
| `masterpiece arch design` | `MasterpieceArchDesign` | `Events/MasterpieceArchDesign.cs` |
| `masterpiece arch constructed` | `MasterpieceArchConstructed` | `Events/MasterpieceArchConstructed.cs` |
| `masterpiece engraving` | `MasterpieceEngraving` | `Events/MasterpieceEngraving.cs` |
| `masterpiece food` | `MasterpieceFood` | `Events/MasterpieceFood.cs` |
| `masterpiece lost` | `MasterpieceLost` | `Events/MasterpieceLost.cs` |
| `masterpiece item` | `MasterpieceItem` | `Events/MasterpieceItem.cs` |
| `masterpiece item improvement` | `MasterpieceItemImprovement` | `Events/MasterpieceItemImprovement.cs` |
| `merchant` | `Merchant` | `Events/Merchant.cs` |
| `site abandoned` | `SiteAbandoned` | `Events/SiteAbandoned.cs` |
| `site died` | `SiteDied` | `Events/SiteDied.cs` |
| `add hf site link` | `AddHfSiteLink` | `Events/AddHFSiteLink.cs` |
| `created structure` | `CreatedStructure` | `Events/CreatedStructure.cs` |
| `hf razed structure` | `HfRazedStructure` | `Events/HFRazedStructure.cs` |
| `remove hf site link` | `RemoveHfSiteLink` | `Events/RemoveHFSiteLink.cs` |
| `replaced structure` | `ReplacedStructure` | `Events/ReplacedStructure.cs` |
| `site taken over` | `SiteTakenOver` | `Events/SiteTakenOver.cs` |
| `entity relocate` | `EntityRelocate` | `Events/EntityRelocate.cs` |
| `hf gains secret goal` | `HfGainsSecretGoal` | `Events/HFGainsSecretGoal.cs` |
| `hf profaned structure` | `HfProfanedStructure` | `Events/HFProfanedStructure.cs` |
| `hf does interaction` | `HfDoesInteraction` | `Events/HFDoesInteraction.cs` |
| `entity primary criminals` | `EntityPrimaryCriminals` | `Events/EntityPrimaryCriminals.cs` |
| `hf confronted` | `HfConfronted` | `Events/HFConfronted.cs` |
| `assume identity` | `AssumeIdentity` | `Events/AssumeIdentity.cs` |
| `entity law` | `EntityLaw` | `Events/EntityLaw.cs` |
| `change hf body state` | `ChangeHfBodyState` | `Events/ChangeHFBodyState.cs` |
| `razed structure` | `RazedStructure` | `Events/RazedStructure.cs` |
| `hf learns secret` | `HfLearnsSecret` | `Events/HFLearnsSecret.cs` |
| `artifact stored` | `ArtifactStored` | `Events/ArtifactStored.cs` |
| `artifact possessed` | `ArtifactPossessed` | `Events/ArtifactPossessed.cs` |
| `agreement made` | `AgreementMade` | `Events/AgreementMade.cs` |
| `agreement rejected` | `AgreementRejected` | `Events/AgreementRejected.cs` |
| `artifact lost` | `ArtifactLost` | `Events/ArtifactLost.cs` |
| `site dispute` | `SiteDispute` | `Events/SiteDispute.cs` |
| `hf attacked site` | `HfAttackedSite` | `Events/HfAttackedSite.cs` |
| `hf destroyed site` | `HfDestroyedSite` | `Events/HfDestroyedSite.cs` |
| `agreement formed` | `AgreementFormed` | `Events/AgreementFormed.cs` |
| `site tribute forced` | `SiteTributeForced` | `Events/SiteTributeForced.cs` |
| `insurrection started` | `InsurrectionStarted` | `Events/InsurrectionStarted.cs` |
| `procession` | `Procession` | `Events/Procession.cs` |
| `ceremony` | `Ceremony` | `Events/Ceremony.cs` |
| `performance` | `Performance` | `Events/Performance.cs` |
| `competition` | `Competition` | `Events/Competition.cs` |
| `written content composed` | `WrittenContentComposed` | `Events/WrittenContentComposed.cs` |
| `poetic form created` | `PoeticFormCreated` | `Events/PoeticFormCreated.cs` |
| `musical form created` | `MusicalFormCreated` | `Events/MusicalFormCreated.cs` |
| `dance form created` | `DanceFormCreated` | `Events/DanceFormCreated.cs` |
| `knowledge discovered` | `KnowledgeDiscovered` | `Events/KnowledgeDiscovered.cs` |
| `hf relationship denied` | `HfRelationShipDenied` | `Events/HFRelationShipDenied.cs` |
| `regionpop incorporated into entity` | `RegionpopIncorporatedIntoEntity` | `Events/RegionpopIncorporatedIntoEntity.cs` |
| `artifact destroyed` | `ArtifactDestroyed` | `Events/ArtifactDestroyed.cs` |
| `first contact` | `FirstContact` | `Events/FirstContact.cs` |
| `site retired` | `SiteRetired` | `Events/SiteRetired.cs` |
| `agreement concluded` | `AgreementConcluded` | `Events/AgreementConcluded.cs` |
| `hf reach summit` | `HfReachSummit` | `Events/HFReachSummit.cs` |
| `artifact transformed` | `ArtifactTransformed` | `Events/ArtifactTransformed.cs` |
| `masterpiece dye` | `MasterpieceDye` | `Events/MasterpieceDye.cs` |
| `hf disturbed structure` | `HfDisturbedStructure` | `Events/HFDisturbedStructure.cs` |
| `hfs formed reputation relationship` | `HfsFormedReputationRelationship` | `Events/HfsFormedReputationRelationship.cs` |
| `artifact given` | `ArtifactGiven` | `Events/ArtifactGiven.cs` |
| `artifact claim formed` | `ArtifactClaimFormed` | `Events/ArtifactClaimFormed.cs` |
| `hf recruited unit type for entity` | `HfRecruitedUnitTypeForEntity` | `Events/HfRecruitedUnitTypeForEntity.cs` |
| `hf prayed inside structure` | `HfPrayedInsideStructure` | `Events/HfPrayedInsideStructure.cs` |
| `artifact copied` | `ArtifactCopied` | `Events/ArtifactCopied.cs` |
| `artifact recovered` | `ArtifactRecovered` | `Events/ArtifactRecovered.cs` |
| `artifact found` | `ArtifactFound` | `Events/ArtifactFound.cs` |
| `hf viewed artifact` | `HfViewedArtifact` | `Events/HfViewedArtifact.cs` |
| `sneak into site` | `SneakIntoSite` | `Events/SneakIntoSite.cs` |
| `spotted leaving site` | `SpottedLeavingSite` | `Events/SpottedLeavingSite.cs` |
| `entity searched site` | `EntitySearchedSite` | `Events/EntitySearchedSite.cs` |
| `hf freed` | `HfFreed` | `Events/HFFreed.cs` |
| `tactical situation` | `TacticalSituation` | `Events/TacticalSituation.cs` |
| `squad vs squad` | `SquadVsSquad` | `Events/SquadVsSquad.cs` |
| `agreement void` | `AgreementVoid` | `Events/AgreementVoid.cs` |
| `entity rampaged in site` | `EntityRampagedInSite` | `Events/EntityRampagedInSite.cs` |
| `entity fled site` | `EntityFledSite` | `Events/EntityFledSite.cs` |
| `entity expels hf` | `EntityExpelsHf` | `Events/EntityExpelsHF.cs` |
| `site surrendered` | `SiteSurrendered` | `Events/SiteSurrendered.cs` |
| `remove hf hf link` | `RemoveHfHfLink` | `Events/RemoveHfHfLink.cs` |
| `holy city declaration` | `HolyCityDeclaration` | `Events/HolyCityDeclaration.cs` |
| `hf performed horrible experiments` | `HfPerformedHorribleExperiments` | `Events/HfPerformedHorribleExperiments.cs` |
| `entity incorporated` | `EntityIncorporated` | `Events/EntityIncorporated.cs` |
| `gamble` | `Gamble` | `Events/Gamble.cs` |
| `trade` | `Trade` | `Events/Trade.cs` |
| `hf equipment purchase` | `HfEquipmentPurchase` | `Events/HfEquipmentPurchase.cs` |
| `entity overthrown` | `EntityOverthrown` | `Events/EntityOverthrown.cs` |
| `failed frame attempt` | `FailedFrameAttempt` | `Events/FailedFrameAttempt.cs` |
| `hf convicted` | `HfConvicted` | `Events/HfConvicted.cs` |
| `failed intrigue corruption` | `FailedIntrigueCorruption` | `Events/FailedIntrigueCorruption.cs` |
| `hfs formed intrigue relationship` | `HfsFormedIntrigueRelationship` | `Events/HfsFormedIntrigueRelationship.cs` |
| `entity alliance formed` | `EntityAllianceFormed` | `Events/EntityAllianceFormed.cs` |
| `entity dissolved` | `EntityDissolved` | `Events/EntityDissolved.cs` |
| `add hf entity honor` | `AddHfEntityHonor` | `Events/AddHfEntityHonor.cs` |
| `entity breach feature layer` | `EntityBreachFeatureLayer` | `Events/EntityBreachFeatureLayer.cs` |
| `entity equipment purchase` | `EntityEquipmentPurchase` | `Events/EntityEquipmentPurchase.cs` |
| `hf ransomed` | `HfRansomed` | `Events/HfRansomed.cs` |
| `hf preach` | `HfPreach` | `Events/HfPreach.cs` |
| `modified building` | `ModifiedBuilding` | `Events/ModifiedBuilding.cs` |
| `hf interrogated` | `HfInterrogated` | `Events/HfInterrogated.cs` |
| `entity persecuted` | `EntityPersecuted` | `Events/EntityPersecuted.cs` |
| `building profile acquired` | `BuildingProfileAcquired` | `Events/BuildingProfileAcquired.cs` |
| `hf enslaved` | `HfEnslaved` | `Events/HfEnslaved.cs` |
| `hf asked about artifact` | `HfAskedAboutArtifact` | `Events/HfAskedAboutArtifact.cs` |
| `hf carouse` | `HfCarouse` | `Events/HfCarouse.cs` |
| `sabotage` | `Sabotage` | `Events/Sabotage.cs` |
| `battle fought` | `BattleFought` | 派生 `Events/IncidentalEvents/BattleFought.cs` |

## 浏览器接口

```js
DFTranslate.skill({skill: "MINING", total_ip: 18000});
// {name, description, category, token, rank, rankSource, points, subrank, ...}
DFTranslate.description(text); // 纯文本译文，未知原文保留
DFTranslate.event(record, {record: lookup, link: safeLink, name: translatedName}); // 安全 HTML
DFTranslate.eventInfo(record, context); // {html, source, type, translated, complete, roles}
DFTranslate.eventReferences(record); // 原版绑定 + 有明确语义的条件引用
DFTranslate.honorRequirements(honor);
DFTranslate.collectionName(collection, {name: translatedName});
DFTranslate.collection(collection, {record: lookup, link: safeLink, name: translatedName,
  pointOfView: {kind, id}});
```

`record(kind,id)`、`name(record,kind)` 必须同步返回已加载记录/名称；磁盘页面先据 `eventReferences()` 预取。`link()` 返回应用构造并转义名称的安全链接 HTML；传入的 XML 内容不得直接当作该 HTML。事件日期默认显示，`includeDate:false` 可关闭。

## 许可

上述 DFCN 数据与移植继续遵守 `TRANSLATION.md`、项目 `LICENSE` 和 `THIRD_PARTY_NOTICES.md`；原版 Viewer 的技能、类与界面元数据保留原项目许可及来源。新增静态包装不改变任何上游素材的权利人。
