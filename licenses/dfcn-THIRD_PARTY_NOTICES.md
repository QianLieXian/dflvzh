# 项目许可与第三方声明

## 项目许可

DFCN 的原创内容采用知识共享署名—非商业性使用—相同方式共享 4.0 国际许可（CC BY-NC-SA 4.0）。完整条款见根目录 `LICENSE`，官方文本：https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode 。

第三方代码、译文及其他上游资源保留各自许可与署名；本项目许可不替代这些资源的原有许可。下文及各资源随附文件中的许可声明继续适用。

## 第三方翻译数据

`data/runtime/translations.tsv` 除 `data/runtime/local-overrides.tsv` 中的本地修订外，由
`tools/build_translations.py` 从以下社区汉化数据生成：

1. **DFI18n 简体中文数据**
   - 项目：https://github.com/DFI18n/dfi18n-data-zh-hans
   - 导入版本：`2ed0ac42a43375ce1d3d3fcd1403f825be58b3e6`
   - 本地原始文件：`data/upstream/simple.zh-Hans.csv`
   - 许可：知识共享署名-非商业性使用 4.0 国际（CC BY-NC 4.0）
   - 著作权：矮人要塞中文维基翻译组翻译人员

2. **Dwarf Fortress 国际化项目简体中文 objects 数据**
   - 项目：https://github.com/dfint/translations-backup
   - 翻译平台：https://app.transifex.com/dwarf-fortress-translation/dwarf-fortress-steam/
   - 导入版本：`9e5456218e60639157e9735e6590b7a47eb86edb`
   - 本地原始文件：`data/upstream/objects.zh-Hans.po`
   - 用途：本体生物 `[DESCRIPTION:]` 简介、名称与形状，以及动植物
     `[PREFSTRING:]` 偏好特征；偏好专用词义编入 `src/preference_vocabulary.inc`
   - 译者署名：完整保留在 PO 文件头部；上游备份仓库未附加独立许可文件

3. **dfzh / Dwarf Fortress 中文汉化插件数据**
   - 项目：https://github.com/wodzys/dwarf-fortress-chinese
   - 导入版本：`8843701150bc3762df40e1584fe30e33608b976b`
   - 本地上游输入：`data/upstream/dfzh_dict_exact.csv`、`data/upstream/dfzh_dict_word.csv`
   - 项目实际使用的规则集：`data/runtime/rulesets/zh-Hans/`，包含本地修订和生成规则
   - `data/runtime/rulesets/zh-Hans/color.toml` 同时用于生成偏好正文的颜色专用词义
   - 规则集翻译数据许可：CC BY-NC 4.0
   - 著作权：矮人要塞中文维基翻译组翻译人员

4. **dfzh C++ 递归规则翻译引擎**
   - 项目：https://github.com/wodzys/dwarf-fortress-chinese
   - 导入版本：`8843701150bc3762df40e1584fe30e33608b976b`
   - 本地文件：`src/rulesets_manager.cpp`、`src/rulesets_manager.h`
   - 许可：MIT；许可文本见 `third_party/dfzh-rules-engine.LICENSE`

5. **toml++ 3.4.0**
   - 项目：https://github.com/marzer/tomlplusplus
   - 导入版本：`30172438cee64926dc41fdd9c11fb3ba5b2ba9de`
   - 用途：加载社区 TOML 递归规则集
   - 许可：MIT；许可文本见 `third_party/tomlplusplus/LICENSE`

6. **ECDICT 英汉词典**
   - 项目：https://github.com/skywind3000/ECDICT
   - 导入版本：`bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b`
   - 用途：离线生成 `data/runtime/procedural-terms.tsv`，并为人工复核后的
     `data/runtime/procedural-word-senses.tsv` 提供初始英汉义项
   - 许可：MIT；许可文本见 `data/upstream/licenses/ECDICT.LICENSE`
   - 著作权：Copyright (c) 2025 Linwei

7. **DFHack 53.16-r2 帮助文档、命令输出及脚本文字**
   - 项目：https://github.com/DFHack/dfhack
   - 来源：本机安装的工具帮助、快速入门、标签说明、脚本内嵌帮助、本地命令输出及 Stonesense 界面文字
   - 本地文件：`data/runtime/dfhack-help-translations.tsv`、`dfhack-help-overrides.tsv`、`dfhack-help-command-overrides.tsv`、`dfhack-output-core.tsv`、`dfhack-output-translations.tsv`、`dfhack-output-stonesense.tsv`
   - 处理：保留英文来源与命令语法；主体机器翻译并统一术语，常用帮助及输出另有人工译文修订。这些译文是 DFCN 的修改版本，并非 DFHack 官方中文文档或输出。
   - 许可：Zlib；许可文本见 `third_party/dfhack-help.LICENSE`
   - 著作权：DFHack 作者及贡献者；DFHack 原始声明为 (c) 2009-2012, Petr Mrázek

8. **Lua 5.3.6 运行诊断文字**
   - 来源：https://www.lua.org/source/5.3/
   - 本地文件：`data/runtime/dfhack-output-core.tsv` 中的 Lua 运行诊断译文
   - 处理：中文诊断条目是 DFCN 修改的 Lua 运行消息，保留命令标识、参数及路径原文。
   - 许可：MIT；许可文本见 `third_party/lua-output.LICENSE`
   - 著作权：Copyright (C) 1994-2020 Lua.org, PUC-Rio.

9. **pinyin-data 0.15.0 汉字读音数据**
   - 项目：https://github.com/mozillazg/pinyin-data
   - 导入版本：`9193766130af24d2ac54230be979b2e98ac66223`
   - 本地文件：`third_party/pinyin-data/pinyin_data.inc`
   - 用途：所有原生搜索入口共用的汉字全拼和首字母匹配；去除声调、将 ü 归为 v，保留每字所有读音。
   - 许可：MIT；许可文本见 `third_party/pinyin-data/LICENSE`，随运行文件部署及打包。
   - 著作权：Copyright (c) 2016 mozillazg

10. **phrase-pinyin-data 中文短语读音数据**
    - 项目：https://github.com/mozillazg/phrase-pinyin-data
    - 本地文件：`data/runtime/phrase-pinyin-data/large_pinyin.txt`
    - 用途：中文名称的短语读音选择；保留上游原始数据、来源和许可文件。
    - 许可：MIT；许可文本见 `data/runtime/phrase-pinyin-data/LICENSE`。

11. **Britfone 3.0.1 与 Montreal Forced Aligner 英国英语读音资源**
    - Britfone 项目：https://github.com/JoseLlarena/Britfone
    - Britfone 作者：Jose Llarena；许可：MIT，见 `data/runtime/english-pronunciation/britfone.LICENSE`。
    - MFA 项目：https://github.com/MontrealCorpusTools/mfa-models
    - MFA 英国英语词典 v3.1.0 与 G2P 模型 v3.0.0，作者：Michael McAuliffe、Morgan Sonderegger；许可：CC BY 4.0，见 `data/runtime/english-pronunciation/MFA-LICENSE.txt`。
    - 用途：英文名称的传统英式 RP 读音及音译回退。词典、模型、符号表和元数据保留原始内容；DFCN 的读音归一化与中文转写属于本项目实现。
    - 本地资源、来源及版本说明：`data/runtime/english-pronunciation/`，其中 `SOURCE` 保留各资源的详细出处，Britfone 原始 README 同时随包提供。

完整许可文本分别保存在 `data/upstream/licenses/dfi18n-data.LICENSE.md` 和
`data/upstream/licenses/dfzh-data.LICENSE.md`。DFCN 对数据做了格式转换、冲突过滤、数字模板转换、
RAW 空白归一化和 CP437 屏幕编码转换；本地 dfzh 词表另按项目约定将居民管理
功能 Burrows 统一为“活动区”，并将 Zones 弹窗标题修订为“区域”。
未改变这些翻译数据的许可条件。
