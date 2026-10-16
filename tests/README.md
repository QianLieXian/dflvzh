XML 解析器回归使用纯 JavaScript 和浏览器 API，不需要 Node 或构建步骤。

```sh
js140 tests/parser-shell.js
js140 tests/parser-stress.js 128
js140 tests/parser-stress.js 3994
```

`parser-shell.js` 检查原始字段、重复字段合并、256 KiB 边界、CDATA、属性、CP437、格式错误、取消和批次上限。SpiderMonkey 下为 ASCII 测试输入提供轻量 TextDecoder 替身；浏览器原生字符解码另外在 `parser-browser.html` 检查。

`parser-stress.js` 按需生成 File.slice 内容，每次只构造当前切片，避免测试夹具本身占满内存。数值参数是 MiB，3994 对应约 3.9 GiB、398 万条独立 ID 的事件。消费端仅校验记录顺序和数量，不保存世界或数据库，因此该测试衡量解析器本身，完整应用的 IndexedDB 写入耗时需另行测试。

双击 `parser-browser.html`，选择上游的小型 Legends 测试 XML 后运行，可验证原始完整解析与流式合并一致、`file://` Blob Worker、浏览器原生 UTF-8 / CP437、取消及图片 data URL。完整输出对照限制夹具总量为 16 MiB。

双击 `local-store-regression.html` 可验证本地数据库的原始记录、重复 ID 合并、未知分组、时代边界、纪事分页、取消查询、存储隔离和摘要预算。默认使用生成的小夹具；可选同一世界的主 XML 与 Plus XML，对照两种读取路径的原始记录。

完整导入、IndexedDB 和应用重载回归使用 Python 标准库、Chromium 与匹配版本的 ChromeDriver：

```sh
python tests/browser-import.py
python tests/browser-import.py --large
python tests/browser-import.py --xml /path/world-legends.xml --expected-events 3981000 --skip-cancel
```

默认生成小型 XML；`--large` 生成约 158 MB、160,000 条事件的临时文件，验证超过 128 MiB 后自动使用文件位置索引。`--xml` 可重复指定主文件与 plus 文件；`--profile /tmp/legends-test-profile` 保留测试数据库供检查。默认会在 60% 进度取消一次导入，先记录取消立即返回的耗时，再等待后台清理完成并确认原文件/索引块（或旧版记录）命名空间无残留，再完成导入、分页、保存、刷新数据库、主应用末页和再次刷新。`--skip-cancel` 适合只执行一次的巨大文件测试。`--expected-events` 比较 XML 原始事件数；输出另列 `rawEventCount` 与 `syntheticEventCount`，分页和刷新检查使用二者合计。取消清理通过 `LegendsFastStore.database()` 查询本次活动索引数据库，不固定旧库名称，并检查 sources、blocks、derived 三表。

脚本只通过 `file://` 加载应用和测试页面，不启动应用 HTTP 服务、不使用 Node，也不添加放宽文件访问权限的浏览器参数。ChromeDriver 的本地控制端口只用于浏览器自动化。结果包含主页面 JavaScript heap、4 ms 心跳最大间隔、导入耗时与 Linux 进程树合计 RSS；RSS 会重复计入进程间共享页。合成文件用于验证大小、分块与存储路径，不能代表每个实际世界的 XML 内容和硬盘速度。

翻译和原版界面词汇回归（也可直接打开 `translation-regression.html`）：

```sh
python tests/browser-translation.py
python tests/browser-translation.py --samples /path/event-samples.json
python tests/browser-creature-raw.py
```

1,816 项检查覆盖 34 分类、212 列、141 技能、21 等级边界、136 个 XML 事件及派生 `battle fought`、原 HTML 转义、类型化链接、集合标题和摘要字段未知语义，以及原生生物 ID 的大小写/下划线别名与未知模组边界。生物页面回归另以 31 项检查验证人物列表、详情、旅途宠物、匿名杀手事件 DOM 与原始筛选值；`--screenshots /tmp/creature-events` 可保存实际显示。生物词条包含 DFCN 子规则集和全部 200 个原生灭绝生物 ID，死亡、驯服、变换种族和吞食事件共用同一入口。`--samples` 是本地实际事件与已加载引用的 JSON；不附带用户世界数据。来源与验证边界见 `../TRANSLATION_COVERAGE.md`。

`python tests/browser-artifact-items.py` 使用原 XML 的物品描述形状与两本书籍记录，以及专名和未知物品对照，在实际应用检查列表、详情、事件链接、英文及中文搜索、原字段和品质符号。内存、旧保存形状刷新、文件索引及索引刷新四阶段共 466 项通过；截图来自小型测试世界。`--audit /path/actual-artifacts-0-9.json` 可选择外部十条原始记录，`--report`、`--screenshots` 可保存输出；默认夹具不包含用户世界的专名。独立实例冷翻译十条约 3.4 ms，热缓存在本次计时精度内为 0 ms，不作为其他设备的耗时保证。此脚本不启动应用 HTTP 服务、不使用 Node。

旧英文世界纪录缓存的显示翻译回归：

```sh
python tests/browser-record-translation.py
python tests/browser-record-translation.py --screenshots /tmp/records-translated
```

六个标签页、21 张卡片均从保留英文副标题的旧统计缓存显示，121 项检查覆盖领域、任期对应的组织、作者姓名、组织/种族/地形与悬浮标题，并确认排名、数值、链接和原缓存不变。该测试页面不加载 XML 解析器或索引器；不会为显示翻译重新扫描世界。截图采用现有 CSS 与本地字体。

首次导入与后台原文件保存隔离回归：

```sh
python tests/browser-nonblocking-import.py
```

此脚本生成约 160 MB、2,000 条带填充文本的临时 File，在两个全新 profile 分别让主线程 `persistSourceFiles` 永久等待和立即拒绝。通过真正的文件选择器导入，并让 `requestAnimationFrame` 永不调用回调，直到后台保存已启动；确认 Worker 索引先开始、世界/末页/人物详情可浏览、导入控制已释放，再选择第二个文件并确认原世界仍读取第一文件的原始字段。两个场景都保留一个不关闭的旧 `legends-file-index` v1 连接，确认新索引命名空间不受阻。记录主页面心跳和浏览器错误。该夹具用于故障路径验证，不能作为真实 3.9 GB 世界的吞吐基准。

最近一次真实 4,164,648,495 字节世界验证记录：123.6 ms 首次读取，早取消后重试 89.544 秒可浏览，自动后台 File 保存 2.628 秒；末页、人物 96、刷新及取消隔离通过，console 无错误。原始事件 1,376,956，派生 `battle fought` 3,613,890，总计 4,990,846。此前一轮并行测试占用临时空间导致后台保存 `IOError`，释放空间后同一 File 重试保存通过；这属于测试环境记录，不作为自动保存成功的那一轮数据。

同一真实世界另验证旧索引字段版本 2 → 3 与派生统计版本 4 的一次升级：94.662 秒完成索引、统计、元数据保存和人物 96 详情；随后刷新 5.965 秒恢复同一升级索引及原文件来源，索引 Worker 创建数为 0、字段扫描数为 0。条件式关系检查确认人物 426 的 2,497 条相关事件包含原始事件 3609（`written content composed`）。该检查验证升级后的条件式关系与缓存恢复，不将派生事件数量误作原始 XML 事件数。

`python tests/browser-upgrade.py` 使用小型原生 File 检查主应用自动保存升级后的字段索引 3、统计版本 5，复用唯一的原文件；再次刷新保留同一索引且没有新的索引任务。分析回归另检查统计版本 4 → 5 不重新扫描 XML、无名野生群体不属于主文明，以及原版庆典和盗窃所确立的无名文明。

地图底图追加与替换回归：

```sh
python tests/browser-map-image.py
python tests/browser-map-image.py --screenshots /tmp/map-images
```

30 项检查通过原生文件输入追加 PNG、替换 BMP、保存与刷新恢复，验证无效图片保留旧图，未解析 XML、重建索引、重算统计或重存源 File，sources/blocks/derived 和原始 disk 元数据不变。只使用小型本地夹具。

`python tests/browser-geography.py --main /path/world-legends.xml --plus /path/world-legends_plus.xml` 从外部小型主文件与 Plus 建立独立 XML 对照，验证三类地理记录的实际列表 ID、类型、分页、详情坐标、原始字段、内存及文件索引导入和刷新。默认使用本地只读上游测试文件；本轮 90 项通过，配对文件有 2 个陆块、50 条河流和 2 座山峰，主文件单独没有这三组。陆块使用 `coord_1`、`coord_2`，不将包围端点扩成虚构的面积。类型按原版 `Landmass.cs`、`River.cs`、`MountainPeak.cs` 派生；XML 原字段不变。

`python tests/analytics-browser.py` 包含文明种族补全与旧缓存迁移：仅在任职位、首个有效人物、排除成员/前任/恶魔与非文明组织，明确种族和人口种族保持优先；版本 5 缓存从人物 header 补齐，不调用 File.slice，也不改变原索引 ID、统计与排名。旧索引已丢弃的额外通用职位关系无法在无原文读取的前提下恢复；保留未知。

书籍排行回归同时覆盖直接计算、内存统计、文件索引和旧缓存修正：20 条持有/存放事件不产生复制数，3 次明确复制加 2 部其他作品的引用计为 5；重复引用、自引、同名 ID 的其他引用类型、合集中的重复作品和主/Plus 中的同一复制事件均不会重复计数。缓存修正禁止读取原 XML，并核对索引、事件数量和其他排行保持不变。`python tests/browser-upgrade.py` 另在主应用验证修正后的排行写入世界元数据，以及刷新后卡片继续显示正确总数与明细。

`python tests/browser-pages.py` 还检查地图图层的彩色文明徽章、中文链接、全选/全不选、中文弹窗，以及连续快速离开地图时不触发已销毁地图的缩放回调。

全站页面查询与完整内容回归：

```sh
python tests/browser-related-index.py
python tests/browser-source-roles.py
python tests/browser-art-query.py
python tests/details-browser.py
python tests/browser-detail-loading.py
python tests/browser-page-completeness.py
python tests/browser-description-performance.py
```

关联索引测试对照原版对象角色规则，检查缓存持久化、取消后继续访问、原字段及统计保留、列表别名、事件与纪事的排序和分页。详情测试检查原始字段、完整关系卡、共享逆向查询和取消隔离。首屏测试故意暂停关联与亲属读取，确认标题及原版人物概览先显示，随后完整卡片与家族树出现；预览不计为详情完成。

页面完整性测试使用 885 条人物关系、独立的事件与纪事页码和页大小、部分保留的地理摘要、山峰排名与长描述，验证全部关系仍可查看、分页重新查询有效页、概览恢复完整数据以及原版描述格式。艺术查询另验证缺少名称时从描述提取名称、英文及中文搜索、名称排序、原始字段保留和后续零原文读取。描述性能测试使用本地实际艺术形式描述，比较缓存前后逐字结果，确认名称算法、规则预算和内容长度不变。

本轮原生回归为关联 164 项、原版角色 89 项、详情字段与逆索引 52 项、首屏与取消 19 项、页面完整性 21 项、艺术查询 33 项、描述等价与性能 14 项。块预读始终按 manifest 顺序消费，最多 4 块在途；取消或提前结束不会产生未处理拒绝。角色原文补齐将邻近记录合并为最多 1 MiB 的窗口，最多 4 个并发，主 XML 与 Plus 的合并仍走同一解析路径。

实际 4,164,648,495 字节世界的全站验证包括 34 类、86 个列表页、44 次详情；另从原 XML 独立解析 157,410 条纪事、98,393 个人物及 1,376,956 条原始事件，核对 12 人物与 3 时代全部纪事 ID，49 项检查无缺失或多项。三个艺术分类的原生输入搜索及双向排序另有 12 项实际 UI 检查通过。最终首次辅助缓存构建连同页面还原为 11.276 秒，正常刷新列表为 1.402 秒、原 XML 读取 0 字节；首次补齐仍有明显成本，不宣称秒开。主统计/manifest 哈希、920 块、facts3、analytics5 与原索引 ID 未变，无浏览器错误。证据保留于 `/tmp/dfcs-v2-all-pages-regression/`、`/tmp/dfcs-final-all-pages-regression/original-xml-role-oracle.json`、`/tmp/dfcs-arts-query-regression/` 及 `/tmp/dfcs-v4-startup/`，没有修改游戏 XML 或用户浏览器。

大缓存与 IndexedDB 故障恢复回归：

```sh
python tests/browser-storage-values.py
python tests/browser-index-repair.py
python tests/browser-source-recovery.py
python tests/browser-source-chunks.py
```

`browser-storage-values.py` 的 87 项检查包括 52 MB Float64 统计值、全部 TypedArray、共享缓冲区、多字节文本、刷新、Worker、三次有限重试、永久错误与取消。52 MB 数据编码为 199 个不超过 256 KiB 的显式 Blob，顶层描述为 672 字节。

`browser-index-repair.py` 的 11 项检查验证缺失大索引块的精确重放、命中即停止、旧 manifest、原文件槽位、偏移、取消，以及边界校验失败不改写。7.92 MB 夹具修复首块读取约 3.15 MB，而非整个文件。

`browser-source-recovery.py` 的 45 项检查在刷新后故意注入与截图相同的 UnknownError，验证中文恢复弹窗、错误文件拒绝和同 XML 重新关联；覆盖图片先于 XML 的 fileNo=1、独立来源数据库与 sourceId，以及并发读取合并。人物列表只读查询字段，确认不依赖原 XML；点击详情后再验证原文件故障路径。先暂停后台写入，验证页面已恢复浏览；再模拟目录发布失败，确认原来源回退和本次浏览不受影响；重试成功后移走临时原 XML，刷新仍能读取人物详情和事件。修复只更新分块原文缓存，不改写已有索引和统计，不重新扫描世界。

`browser-source-chunks.py` 的 52 项检查验证 8 MiB 边界上的完整记录、嵌套/负数/无穷切片边界、持久化刷新、临时原文件路径移走后的读取、旧 File 兼容、图片在前的 XML 槽位、独立来源命名空间、缺省库名的旧世界仍保留在 legacy 库，以及最多 4 个并发分块读取。六个不同分块各读取 1 字节，实际 `Blob.arrayBuffer` 载荷合计仅 6 字节；跨块 227 字节记录只读取 80+147 字节。取消、分块写失败及目录发布失败均保留旧缓存并清理本次临时块；同次主文件和 Plus 的目录原子发布。所有场景禁止索引和统计写入。

测试访问已保存世界时使用 `LegendsLocalStore.getWorld()`，访问分块值使用 `LegendsStorageValues.read/unpack()`，不能把轻量存储描述直接当作世界或统计对象。

本轮另对用户实际 4,164,648,495 字节 XML 做隔离 Chromium 验证：完整新索引、统计及保存耗时 86.613 秒；刷新后原事件末页、98,393 人物的列表及人物 96 详情均通过，无浏览器错误。再仅删除测试 profile 的第一人物索引块并刷新，2.077 秒恢复列表；累计读取原 XML 20,522,057 字节，恢复的 1,262 个 header（人物0–1261）与原块 SHA-256 完全相同，保留原索引 ID 与98,393总数。该测试没有修改游戏 XML 或用户浏览器 profile。日志 /tmp/dfcs-storage-real-import.log 与 /tmp/dfcs-real-index-fault.log；隔离测试 profile 用后删除。

采用 8 MiB 原文件分块后，同一实际 XML 的新导入 86.335 秒完成索引与统计，保存后刷新的人物列表、详情及事件末页通过。接着仅删除隔离 profile 的主原文件目录，触发恢复弹窗：原生选择同一 XML 后 290.3 ms 恢复 10 行人物列表（总数 98,393）；后台修复 1,371.8 ms 完成，497 块合计 4,164,648,495 字节。再次刷新无需选择文件，人物 96 正常；原索引 ID、920 个索引块、1 份统计与目录摘要均保持不变，没有扫描、索引或统计写入，没有浏览器错误。21 项真实世界故障检查通过。游戏 XML 未改动，隔离 profile 用后删除，日志 `/tmp/dfcs-source-chunk-real-import.log` 与 `/tmp/dfcs-real-source-repair.log`、截图 `/tmp/dfcs-real-source-repair-figures.png` 保留。耗时仅代表本机此次运行。
