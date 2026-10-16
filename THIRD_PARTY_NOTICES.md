# 来源与许可

本项目由 **Byayoi同人社区** 制作，包含从 DFCN 移植的名称翻译逻辑、词典与规则。DFCN 原创内容采用 **CC BY-NC-SA 4.0（署名—非商业性使用—相同方式共享）**，本项目相应内容及新增原创代码沿用该许可，完整文本见 `LICENSE`。第三方原有许可保持有效。

## LegendsViewer-Next

页面结构、导航分组、标题、表格列、详情卡片顺序、默认主题与地图交互依据 [Kromtec / LegendsViewer-Next](https://github.com/Kromtec/LegendsViewer-Next/) 的 `App.vue`、`WorldOverview.vue`、`World.vue`、`WorldObjectsPage.vue`、`WorldObjectPage.vue`、`Map.vue`、`WorldRecords.vue` 等源文件移植；`assets/ceretelina.png` 直接复制自其 public 目录。原项目采用 MIT 许可，完整版权及许可文本保存在 `licenses/LegendsViewer-Next.LICENSE`。本版本不运行其 Node.js、Vue 构建过程或 .NET 后端。

## 浏览器资源

- Leaflet 1.9.4：原版同版本，BSD-2-Clause；`licenses/leaflet-LICENSE`。
- Chart.js 4.4.8：原版同版本，MIT；`licenses/chartjs-LICENSE.md`。
- Cytoscape 3.31.0、Dagre 0.8.5、cytoscape-dagre 2.5.0：原版同版本，MIT；分别见 `licenses/cytoscape-LICENSE.txt`、`licenses/dagre-LICENSE.txt`、`licenses/cytoscape-dagre-LICENSE.txt`。Dagre 包含的 graphlib 和 lodash 许可也保留在对应许可文件中。
- cytoscape-cola 2.5.1、WebCola 3.4.0：原版战争图布局，MIT；`licenses/cytoscape-cola-LICENSE`、`licenses/webcola-LICENSE`。
- Tippy.js 6.3.7、@popperjs/core 2.11.8：原版图形提示，MIT；`licenses/tippy.js-LICENSE`、`licenses/core-LICENSE`。
- Material Design Icons 7.4.47：Pictogrammers Free License，字体与图标适用 Apache 2.0，其他代码 MIT；完整条款见 `licenses/materialdesignicons-LICENSE.txt`。
- Roboto（@fontsource 5.3.0）：SIL Open Font License 1.1；`licenses/Roboto-LICENSE.txt`。

上述资源均本地分发，不依赖 CDN。

## 翻译数据

名称词典、构词与音译规则的来源、版本和覆盖范围见 `TRANSLATION.md`。DFCN 自带的第三方说明原文在 `licenses/dfcn-THIRD_PARTY_NOTICES.md`，仅其中实际复用的资源适用于本项目。词典、发音模型的随附许可保存在 `licenses/`，包括 DFI18n、dfzh、ECDICT、pinyin-data、Britfone 和 MFA 的许可文本。

Dwarf Fortress 由 Bay 12 Games 开发，相关名称与游戏内容属于其各自权利人。
