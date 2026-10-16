/* UI definitions copied from Kromtec/LegendsViewer-Next source; Chinese strings are direct translations. No runtime framework required. */
(function(global){
  "use strict";
  global.LegendsUI = Object.freeze({
  "sourceRepository": "Kromtec/LegendsViewer-Next",
  "sourceFiles": [
    "src/App.vue",
    "src/router/index.ts",
    "src/views/*.vue",
    "src/components/WorldObjectPage.vue",
    "src/components/WorldObjectsPage.vue"
  ],
  "navItems": [
    {
      "id": "explore",
      "title": "探索世界",
      "label": "探索世界",
      "originalEnglish": "Explore Worlds",
      "en": "Explore Worlds",
      "route": "/",
      "icon": "mdi-file-tree-outline"
    },
    {
      "id": "favorites",
      "title": "收藏",
      "label": "收藏",
      "originalEnglish": "Favorites",
      "en": "Favorites",
      "route": null,
      "icon": "mdi-star",
      "conditional": "favorites.length > 0"
    },
    {
      "id": "overview",
      "title": "概览",
      "label": "概览",
      "originalEnglish": "Overview",
      "en": "Overview",
      "route": "/world",
      "icon": "mdi-earth-box"
    },
    {
      "id": "records",
      "title": "世界纪录",
      "label": "世界纪录",
      "originalEnglish": "World Records",
      "en": "World Records",
      "route": "/records",
      "icon": "mdi-trophy-outline"
    },
    {
      "id": "map",
      "title": "地图",
      "label": "地图",
      "originalEnglish": "Map",
      "en": "Map",
      "route": "/map",
      "icon": "mdi-map-search-outline"
    },
    {
      "id": "eras",
      "title": "时代",
      "label": "时代",
      "originalEnglish": "Eras",
      "en": "Eras",
      "route": "/era",
      "icon": "mdi-timelapse"
    },
    {
      "id": "societyItems",
      "title": "社会",
      "label": "社会",
      "originalEnglish": "Society",
      "en": "Society",
      "route": null,
      "icon": "mdi-account-group-outline",
      "children": [
        {
          "id": "entities",
          "title": "派系与团体",
          "label": "派系与团体",
          "originalEnglish": "Factions and Groups",
          "en": "Factions and Groups",
          "route": "/entity",
          "icon": "mdi-account-group"
        },
        {
          "id": "figures",
          "title": "历史人物",
          "label": "历史人物",
          "originalEnglish": "Historical Figures",
          "en": "Historical Figures",
          "route": "/hf",
          "icon": "mdi-account"
        }
      ]
    },
    {
      "id": "geographyItems",
      "title": "地理",
      "label": "地理",
      "originalEnglish": "Geography",
      "en": "Geography",
      "route": null,
      "icon": "mdi-island-variant",
      "children": [
        {
          "id": "regions",
          "title": "区域",
          "label": "区域",
          "originalEnglish": "Regions",
          "en": "Regions",
          "route": "/region",
          "icon": "mdi-map-legend"
        },
        {
          "id": "undergroundregions",
          "title": "地下",
          "label": "地下",
          "originalEnglish": "Underground",
          "en": "Underground",
          "route": "/uregion",
          "icon": "mdi-tunnel"
        },
        {
          "id": "landmasses",
          "title": "陆块",
          "label": "陆块",
          "originalEnglish": "Landmasses",
          "en": "Landmasses",
          "route": "/landmass",
          "icon": "mdi-island-variant"
        },
        {
          "id": "rivers",
          "title": "河流",
          "label": "河流",
          "originalEnglish": "Rivers",
          "en": "Rivers",
          "route": "/river",
          "icon": "mdi-waves"
        },
        {
          "id": "mountainpeaks",
          "title": "山峰",
          "label": "山峰",
          "originalEnglish": "Mountain Peaks",
          "en": "Mountain Peaks",
          "route": "/mountainpeak",
          "icon": "mdi-summit"
        }
      ]
    },
    {
      "id": "infrastructureItems",
      "title": "基础设施",
      "label": "基础设施",
      "originalEnglish": "Infrastructure",
      "en": "Infrastructure",
      "route": null,
      "icon": "mdi-home-modern",
      "children": [
        {
          "id": "sites",
          "title": "地点",
          "label": "地点",
          "originalEnglish": "Sites",
          "en": "Sites",
          "route": "/site",
          "icon": "mdi-home-modern"
        },
        {
          "id": "structures",
          "title": "建筑",
          "label": "建筑",
          "originalEnglish": "Structures",
          "en": "Structures",
          "route": "/structure",
          "icon": "mdi-home-silo"
        },
        {
          "id": "constructions",
          "title": "工程",
          "label": "工程",
          "originalEnglish": "Constructions",
          "en": "Constructions",
          "route": "/construction",
          "icon": "mdi-sign-caution"
        }
      ]
    },
    {
      "id": "artItems",
      "title": "艺术与工艺",
      "label": "艺术与工艺",
      "originalEnglish": "Art and Craft",
      "en": "Art and Craft",
      "route": null,
      "icon": "mdi-diamond-stone",
      "children": [
        {
          "id": "artifacts",
          "title": "神器",
          "label": "神器",
          "originalEnglish": "Artifacts",
          "en": "Artifacts",
          "route": "/artifact",
          "icon": "mdi-diamond-stone"
        },
        {
          "id": "danceforms",
          "title": "舞蹈形式",
          "label": "舞蹈形式",
          "originalEnglish": "Dance Forms",
          "en": "Dance Forms",
          "route": "/danceform",
          "icon": "mdi-dance-ballroom"
        },
        {
          "id": "musicalforms",
          "title": "音乐形式",
          "label": "音乐形式",
          "originalEnglish": "Musical Forms",
          "en": "Musical Forms",
          "route": "/musicalform",
          "icon": "mdi-music-clef-treble"
        },
        {
          "id": "poeticforms",
          "title": "诗歌形式",
          "label": "诗歌形式",
          "originalEnglish": "Poetic Forms",
          "en": "Poetic Forms",
          "route": "/poeticform",
          "icon": "mdi-account-voice"
        },
        {
          "id": "writtencontents",
          "title": "书面作品",
          "label": "书面作品",
          "originalEnglish": "Written Content",
          "en": "Written Content",
          "route": "/writtencontent",
          "icon": "mdi-bookshelf"
        }
      ]
    },
    {
      "id": "warfareItems",
      "title": "战争",
      "label": "战争",
      "originalEnglish": "Warfare",
      "en": "Warfare",
      "route": null,
      "icon": "mdi-sword-cross",
      "children": [
        {
          "id": "wars",
          "title": "战争",
          "label": "战争",
          "originalEnglish": "Wars",
          "en": "Wars",
          "route": "/war",
          "icon": "mdi-sword-cross"
        },
        {
          "id": "battles",
          "title": "战役",
          "label": "战役",
          "originalEnglish": "Battles",
          "en": "Battles",
          "route": "/battle",
          "icon": "mdi-chess-bishop"
        },
        {
          "id": "duels",
          "title": "决斗",
          "label": "决斗",
          "originalEnglish": "Duels",
          "en": "Duels",
          "route": "/duel",
          "icon": "mdi-fencing"
        },
        {
          "id": "raids",
          "title": "袭掠",
          "label": "袭掠",
          "originalEnglish": "Raids",
          "en": "Raids",
          "route": "/raid",
          "icon": "mdi-lightning-bolt"
        },
        {
          "id": "siteconquerings",
          "title": "地点征服",
          "label": "地点征服",
          "originalEnglish": "Site Conquerings",
          "en": "Site Conquerings",
          "route": "/siteconquered",
          "icon": "mdi-flag-variant"
        }
      ]
    },
    {
      "id": "conflictsItems",
      "title": "冲突",
      "label": "冲突",
      "originalEnglish": "Conflicts",
      "en": "Conflicts",
      "route": null,
      "icon": "mdi-shield-alert-outline",
      "children": [
        {
          "id": "insurrections",
          "title": "起义",
          "label": "起义",
          "originalEnglish": "Insurrections",
          "en": "Insurrections",
          "route": "/insurrection",
          "icon": "mdi-map-marker-alert"
        },
        {
          "id": "persecutions",
          "title": "迫害",
          "label": "迫害",
          "originalEnglish": "Persecutions",
          "en": "Persecutions",
          "route": "/persecution",
          "icon": "mdi-gavel"
        },
        {
          "id": "purges",
          "title": "清洗",
          "label": "清洗",
          "originalEnglish": "Purges",
          "en": "Purges",
          "route": "/purge",
          "icon": "mdi-skull-crossbones-outline"
        },
        {
          "id": "coups",
          "title": "政变",
          "label": "政变",
          "originalEnglish": "Coups",
          "en": "Coups",
          "route": "/coup",
          "icon": "mdi-map-marker-alert"
        }
      ]
    },
    {
      "id": "calamitiesItems",
      "title": "灾难",
      "label": "灾难",
      "originalEnglish": "Calamities",
      "en": "Calamities",
      "route": null,
      "icon": "mdi-alert-circle-outline",
      "children": [
        {
          "id": "rampages",
          "title": "肆虐",
          "label": "肆虐",
          "originalEnglish": "Rampages",
          "en": "Rampages",
          "route": "/beastattack",
          "icon": "mdi-weather-hurricane"
        },
        {
          "id": "abductions",
          "title": "绑架",
          "label": "绑架",
          "originalEnglish": "Abductions",
          "en": "Abductions",
          "route": "/abduction",
          "icon": "mdi-map-marker-alert"
        },
        {
          "id": "thefts",
          "title": "盗窃",
          "label": "盗窃",
          "originalEnglish": "Thefts",
          "en": "Thefts",
          "route": "/theft",
          "icon": "mdi-handcuffs"
        }
      ]
    },
    {
      "id": "ritualItems",
      "title": "仪式",
      "label": "仪式",
      "originalEnglish": "Rituals",
      "en": "Rituals",
      "route": null,
      "icon": "mdi-candle",
      "children": [
        {
          "id": "processions",
          "title": "游行",
          "label": "游行",
          "originalEnglish": "Processions",
          "en": "Processions",
          "route": "/procession",
          "icon": "mdi-human-queue"
        },
        {
          "id": "performances",
          "title": "演出",
          "label": "演出",
          "originalEnglish": "Performances",
          "en": "Performances",
          "route": "/performance",
          "icon": "mdi-drama-masks"
        },
        {
          "id": "journeys",
          "title": "旅程",
          "label": "旅程",
          "originalEnglish": "Journeys",
          "en": "Journeys",
          "route": "/journey",
          "icon": "mdi-map-marker-path"
        },
        {
          "id": "competitions",
          "title": "竞赛",
          "label": "竞赛",
          "originalEnglish": "Competitions",
          "en": "Competitions",
          "route": "/competition",
          "icon": "mdi-trophy-outline"
        },
        {
          "id": "ceremonies",
          "title": "典礼",
          "label": "典礼",
          "originalEnglish": "Ceremonies",
          "en": "Ceremonies",
          "route": "/ceremony",
          "icon": "mdi-human-greeting-variant"
        },
        {
          "id": "occasions",
          "title": "庆典",
          "label": "庆典",
          "originalEnglish": "Occasions",
          "en": "Occasions",
          "route": "/occasion",
          "icon": "mdi-calendar-star"
        }
      ]
    }
  ],
  "categories": {
    "figures": {
      "icon": "mdi-account",
      "title": "历史人物",
      "subtitle": "查看改变历史进程的人物生平",
      "overviewSubtitle": "浏览并搜索全部历史人物",
      "overviewTitle": "概览",
      "wikiKeyWord": "Historical_figure",
      "id": "figures",
      "route": "/hf",
      "originalEnglish": {
        "title": "Historical Figures",
        "subtitle": "Delve into the Lives of Those Who Changed the Course of History",
        "overviewSubtitle": "Browse and search all historical figures",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "种姓",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Caste"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/HistoricalFigures.vue",
      "label": "历史人物",
      "en": "Historical Figures",
      "wiki": "Historical_figure",
      "dataGroup": "figures"
    },
    "entities": {
      "icon": "mdi-account-group",
      "title": "派系与团体",
      "subtitle": "探索塑造历史的重要派系与团体",
      "overviewSubtitle": "浏览并搜索全部派系与团体",
      "overviewTitle": "概览",
      "wikiKeyWord": "entity",
      "id": "entities",
      "route": "/entity",
      "originalEnglish": {
        "title": "Factions and Groups",
        "subtitle": "Explore the Influential Factions and Groups Shaping History",
        "overviewSubtitle": "Browse and search all entities",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "种族",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Race"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Entities.vue",
      "label": "派系与团体",
      "en": "Factions and Groups",
      "wiki": "entity",
      "dataGroup": "entities"
    },
    "sites": {
      "icon": "mdi-home-modern",
      "title": "地点",
      "subtitle": "地点是世界各地有人居住的各类场所，包括城镇、要塞及其他聚落。探索其历史、建筑和居民",
      "overviewSubtitle": "浏览并搜索全部地点",
      "overviewTitle": "概览",
      "wikiKeyWord": "Site",
      "id": "sites",
      "route": "/site",
      "originalEnglish": {
        "title": "Sites",
        "subtitle": "Sites are diverse inhabited locations, including towns, fortresses, and other settlements, found throughout the world. Explore their history, structures, and inhabitants",
        "overviewSubtitle": "Browse and search all world sites",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "区域",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Region"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Sites.vue",
      "label": "地点",
      "en": "Sites",
      "wiki": "Site",
      "dataGroup": "sites"
    },
    "artifacts": {
      "icon": "mdi-diamond-stone",
      "title": "神器",
      "subtitle": "历史珍藏的遗物，每件都承载着力量、工艺与传说的故事",
      "overviewSubtitle": "浏览并搜索全部神器",
      "overviewTitle": "概览",
      "wikiKeyWord": "artifact",
      "id": "artifacts",
      "route": "/artifact",
      "originalEnglish": {
        "title": "Artifacts",
        "subtitle": "The treasured relics of history, each holding tales of power, craftsmanship, and legend",
        "overviewSubtitle": "Browse and search all artifacts",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "子类型",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Subtype"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Artifacts.vue",
      "label": "神器",
      "en": "Artifacts",
      "wiki": "artifact",
      "dataGroup": "artifacts"
    },
    "regions": {
      "icon": "mdi-map-legend",
      "title": "区域",
      "subtitle": "探索世界的不同区域，了解各地地形与居民的故事",
      "overviewSubtitle": "浏览并搜索全部区域",
      "overviewTitle": "概览",
      "wikiKeyWord": "Region",
      "id": "regions",
      "route": "/region",
      "originalEnglish": {
        "title": "Regions",
        "subtitle": "Uncover the distinct regions of the world, where every area tells a story through its terrain and inhabitants",
        "overviewSubtitle": "Browse and search all world regions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "生物群系",
          "key": "type",
          "align": "start",
          "originalEnglish": "Biome"
        },
        {
          "title": "邪恶程度",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Evilness"
        },
        {
          "title": "面积",
          "key": "squareTiles",
          "align": "end",
          "originalEnglish": "Size"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Regions.vue",
      "label": "区域",
      "en": "Regions",
      "wiki": "Region",
      "dataGroup": "regions"
    },
    "undergroundregions": {
      "icon": "mdi-tunnel",
      "title": "地下区域",
      "subtitle": "探索地下世界的秘密，那里黑暗中藏着宝藏，古老文明繁衍生息",
      "overviewSubtitle": "浏览并搜索全部地下区域",
      "overviewTitle": "概览",
      "wikiKeyWord": "Region",
      "id": "undergroundregions",
      "route": "/uregion",
      "originalEnglish": {
        "title": "Underground Regions",
        "subtitle": "Discover the secrets of the underground, where darkness holds treasures and ancient civilizations thrive",
        "overviewSubtitle": "Browse and search all underground regions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "深度",
          "key": "subtype",
          "align": "center",
          "originalEnglish": "Depth"
        },
        {
          "title": "面积",
          "key": "squareTiles",
          "align": "end",
          "originalEnglish": "Size"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/UndergroundRegions.vue",
      "label": "地下区域",
      "en": "Underground Regions",
      "wiki": "Region",
      "extraSection": "underground_regions"
    },
    "landmasses": {
      "icon": "mdi-island-variant",
      "title": "陆块",
      "subtitle": "探索塑造世界地理与文化的多样陆地",
      "overviewSubtitle": "浏览并搜索全部陆块",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "landmasses",
      "route": "/landmass",
      "originalEnglish": {
        "title": "Landmasses",
        "subtitle": "Explore the diverse landscapes that shape the world's geography and culture",
        "overviewSubtitle": "Browse and search all landmasses",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Landmasses.vue",
      "label": "陆块",
      "en": "Landmasses",
      "wiki": null,
      "extraSection": "landmasses"
    },
    "rivers": {
      "icon": "mdi-waves",
      "title": "河流",
      "subtitle": "河流穿过大地，塑造文明与生态系统",
      "overviewSubtitle": "浏览并搜索全部河流",
      "overviewTitle": "概览",
      "wikiKeyWord": "River",
      "id": "rivers",
      "route": "/river",
      "originalEnglish": {
        "title": "Rivers",
        "subtitle": "Flowing through the landscape, rivers shape civilizations and ecosystems alike",
        "overviewSubtitle": "Browse and search all rivers",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Rivers.vue",
      "label": "河流",
      "en": "Rivers",
      "wiki": "River",
      "extraSection": "rivers"
    },
    "mountainpeaks": {
      "icon": "mdi-summit",
      "title": "山峰与火山",
      "subtitle": "从巍峨山峰到喷发的火山口，探索自然最雄伟的地貌",
      "overviewSubtitle": "浏览并搜索全部山峰与火山",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "mountainpeaks",
      "route": "/mountainpeak",
      "originalEnglish": {
        "title": "Mountain Peaks and Volcanos",
        "subtitle": "From majestic summits to explosive craters, explore nature's most formidable formations",
        "overviewSubtitle": "Browse and search all mountain peaks and volcanos",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "高度",
          "key": "heightMeter",
          "align": "end",
          "originalEnglish": "Height"
        },
        {
          "title": "世界排名",
          "key": "worldRank",
          "align": "end",
          "originalEnglish": "World Rank"
        },
        {
          "title": "区域",
          "key": "regionLink",
          "align": "start",
          "originalEnglish": "Region"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/MountainPeaks.vue",
      "label": "山峰与火山",
      "en": "Mountain Peaks and Volcanos",
      "wiki": null,
      "extraSection": "mountain_peaks"
    },
    "structures": {
      "icon": "mdi-home-silo",
      "title": "建筑",
      "subtitle": "从宏伟的行会大厅到神秘的地下墓穴，探索每座建筑背后的故事",
      "overviewSubtitle": "浏览并搜索全部建筑",
      "overviewTitle": "概览",
      "wikiKeyWord": "Structure",
      "id": "structures",
      "route": "/structure",
      "originalEnglish": {
        "title": "Structures",
        "subtitle": "From grand guildhalls to mysterious catacombs, uncover the stories behind each structure",
        "overviewSubtitle": "Browse and search all site structures",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Structures.vue",
      "label": "建筑",
      "en": "Structures",
      "wiki": "Structure",
      "extraSection": "structures",
      "nestedSource": {
        "dataGroup": "sites",
        "field": "structures",
        "item": "structure"
      }
    },
    "constructions": {
      "icon": "mdi-sign-caution",
      "title": "工程",
      "subtitle": "探索支持世界各地贸易、旅行与探险的重要基础设施",
      "overviewSubtitle": "浏览并搜索全部工程",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "constructions",
      "route": "/construction",
      "originalEnglish": {
        "title": "Constructions",
        "subtitle": "Explore the vital infrastructure that supports trade, travel, and exploration across the world",
        "overviewSubtitle": "Browse and search all world constructions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "长度",
          "key": "squareTiles",
          "align": "end",
          "originalEnglish": "Length"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Constructions.vue",
      "label": "工程",
      "en": "Constructions",
      "wiki": null,
      "extraSection": "world_constructions"
    },
    "danceforms": {
      "icon": "mdi-dance-ballroom",
      "title": "舞蹈形式",
      "subtitle": "代代相传的优美动作与传统，体现文化与庆祝活动",
      "overviewSubtitle": "浏览并搜索全部舞蹈形式",
      "overviewTitle": "概览",
      "wikiKeyWord": "Dance_form",
      "id": "danceforms",
      "route": "/danceform",
      "originalEnglish": {
        "title": "Dance Forms",
        "subtitle": "Graceful movements and traditions passed through generations, reflecting culture and celebration",
        "overviewSubtitle": "Browse and search all dance forms",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/DanceForms.vue",
      "label": "舞蹈形式",
      "en": "Dance Forms",
      "wiki": "Dance_form",
      "extraSection": "dance_forms"
    },
    "musicalforms": {
      "icon": "mdi-music-clef-treble",
      "title": "音乐形式",
      "subtitle": "跨越时光的节奏与旋律，塑造文化与情感",
      "overviewSubtitle": "浏览并搜索全部音乐形式",
      "overviewTitle": "概览",
      "wikiKeyWord": "Musical_form",
      "id": "musicalforms",
      "route": "/musicalform",
      "originalEnglish": {
        "title": "Musical Forms",
        "subtitle": "The rhythmic and melodic expressions that resonate through time, shaping culture and emotion",
        "overviewSubtitle": "Browse and search all musical forms",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/MusicalForms.vue",
      "label": "音乐形式",
      "en": "Musical Forms",
      "wiki": "Musical_form",
      "extraSection": "musical_forms"
    },
    "poeticforms": {
      "icon": "mdi-account-voice",
      "title": "诗歌形式",
      "subtitle": "用诗歌凝聚情感、故事与传统的文字艺术",
      "overviewSubtitle": "浏览并搜索全部诗歌形式",
      "overviewTitle": "概览",
      "wikiKeyWord": "Musical_form",
      "id": "poeticforms",
      "route": "/poeticform",
      "originalEnglish": {
        "title": "Poetic Forms",
        "subtitle": "The art of words, capturing the essence of emotion, story, and tradition in verse",
        "overviewSubtitle": "Browse and search all poetic forms",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/PoeticForms.vue",
      "label": "诗歌形式",
      "en": "Poetic Forms",
      "wiki": "Musical_form",
      "extraSection": "poetic_forms"
    },
    "writtencontents": {
      "icon": "mdi-bookshelf",
      "title": "书面作品",
      "subtitle": "保存知识、故事与记录，记述过去并影响未来",
      "overviewSubtitle": "浏览并搜索全部书面作品",
      "overviewTitle": "概览",
      "wikiKeyWord": "Book",
      "id": "writtencontents",
      "route": "/writtencontent",
      "originalEnglish": {
        "title": "Written Content",
        "subtitle": "The preserved knowledge, stories, and records that document the past and shape the future",
        "overviewSubtitle": "Browse and search all written content",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "作者",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Author"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/WrittenContents.vue",
      "label": "书面作品",
      "en": "Written Content",
      "wiki": "Book",
      "extraSection": "written_contents"
    },
    "eras": {
      "icon": "mdi-timelapse",
      "title": "时代",
      "subtitle": "塑造历史与文明进程的重要时期",
      "overviewSubtitle": "浏览并搜索全部时代",
      "overviewTitle": "概览",
      "wikiKeyWord": "Ages",
      "id": "eras",
      "route": "/era",
      "originalEnglish": {
        "title": "Eras",
        "subtitle": "The defining periods that shaped the course of history and civilization",
        "overviewSubtitle": "Browse and search all eras",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "编号",
          "key": "id",
          "align": "end",
          "originalEnglish": "Id"
        },
        {
          "title": "时长",
          "key": "type",
          "align": "center",
          "originalEnglish": "Duration"
        },
        {
          "title": "起止时间",
          "key": "subtype",
          "align": "center",
          "originalEnglish": "From - To"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Eras.vue",
      "label": "时代",
      "en": "Eras",
      "wiki": "Ages",
      "dataGroup": "eras"
    },
    "wars": {
      "icon": "mdi-sword-cross",
      "title": "战争",
      "subtitle": "塑造历史进程的大规模冲突",
      "overviewSubtitle": "浏览并搜索全部战争",
      "overviewTitle": "概览",
      "wikiKeyWord": "War",
      "id": "wars",
      "route": "/war",
      "originalEnglish": {
        "title": "Wars",
        "subtitle": "The grand conflicts that shaped the course of history",
        "overviewSubtitle": "Browse and search all wars",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "进攻方与防守方",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Attacker vs. Defender"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Wars.vue",
      "label": "战争",
      "en": "Wars",
      "wiki": "War",
      "collectionTypes": [
        "war"
      ]
    },
    "battles": {
      "icon": "mdi-chess-bishop",
      "title": "战役",
      "subtitle": "决定国家命运的重要军队交锋",
      "overviewSubtitle": "浏览并搜索全部战役",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "battles",
      "route": "/battle",
      "originalEnglish": {
        "title": "Battles",
        "subtitle": "Pivotal clashes between armies that decided the fate of nations",
        "overviewSubtitle": "Browse and search all battles",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "进攻方与防守方",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Attacker vs. Defender"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": true,
      "sourceView": "src/views/Battles.vue",
      "label": "战役",
      "en": "Battles",
      "wiki": null,
      "collectionTypes": [
        "battle"
      ]
    },
    "duels": {
      "icon": "mdi-fencing",
      "title": "决斗",
      "subtitle": "勇士之间考验荣誉与技艺的个人战斗",
      "overviewSubtitle": "浏览并搜索全部决斗",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "duels",
      "route": "/duel",
      "originalEnglish": {
        "title": "Duels",
        "subtitle": "Personal combat between champions, where honor and skill are tested",
        "overviewSubtitle": "Browse and search all duels",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Duels.vue",
      "label": "决斗",
      "en": "Duels",
      "wiki": null,
      "collectionTypes": [
        "duel"
      ]
    },
    "raids": {
      "icon": "mdi-lightning-bolt",
      "title": "袭掠",
      "subtitle": "针对聚落与资源的迅速战略袭击",
      "overviewSubtitle": "浏览并搜索全部袭掠",
      "overviewTitle": "概览",
      "wikiKeyWord": "Raid",
      "id": "raids",
      "route": "/raid",
      "originalEnglish": {
        "title": "Raids",
        "subtitle": "Swift and strategic attacks on settlements and resources",
        "overviewSubtitle": "Browse and search all raids",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "进攻方与防守方",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Attacker vs. Defender"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Raids.vue",
      "label": "袭掠",
      "en": "Raids",
      "wiki": "Raid",
      "collectionTypes": [
        "raid"
      ]
    },
    "siteconquerings": {
      "icon": "mdi-flag-variant",
      "title": "地点征服",
      "subtitle": "对重要要塞与城市的攻占和占领",
      "overviewSubtitle": "浏览并搜索全部地点征服",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "siteconquerings",
      "route": "/siteconquered",
      "originalEnglish": {
        "title": "Site Conquerings",
        "subtitle": "The capture and occupation of critical strongholds and cities",
        "overviewSubtitle": "Browse and search all site conquerings",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "结果",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Outcome"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/SiteConquerings.vue",
      "label": "地点征服",
      "en": "Site Conquerings",
      "wiki": null,
      "collectionTypes": [
        "site conquered"
      ]
    },
    "insurrections": {
      "icon": "mdi-map-marker-alert",
      "title": "起义",
      "subtitle": "挑战现有秩序的起义与叛乱",
      "overviewSubtitle": "浏览并搜索全部起义",
      "overviewTitle": "概览",
      "wikiKeyWord": "Insurrection",
      "id": "insurrections",
      "route": "/insurrection",
      "originalEnglish": {
        "title": "Insurrections",
        "subtitle": "Uprisings and rebellions challenging the established order",
        "overviewSubtitle": "Browse and search all insurrections",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Insurrections.vue",
      "label": "起义",
      "en": "Insurrections",
      "wiki": "Insurrection",
      "collectionTypes": [
        "insurrection"
      ]
    },
    "persecutions": {
      "icon": "mdi-gavel",
      "title": "迫害",
      "subtitle": "对个人或群体的系统性压迫",
      "overviewSubtitle": "浏览并搜索全部迫害",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "persecutions",
      "route": "/persecution",
      "originalEnglish": {
        "title": "Persecutions",
        "subtitle": "The systematic oppression of individuals or groups",
        "overviewSubtitle": "Browse and search all persecutions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Persecutions.vue",
      "label": "迫害",
      "en": "Persecutions",
      "wiki": null,
      "collectionTypes": [
        "persecution"
      ]
    },
    "purges": {
      "icon": "mdi-skull-crossbones-outline",
      "title": "清洗",
      "subtitle": "暴力清除政治对手和被视为威胁者",
      "overviewSubtitle": "浏览并搜索全部清洗",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "purges",
      "route": "/purge",
      "originalEnglish": {
        "title": "Purges",
        "subtitle": "The violent removal of political rivals and perceived threats",
        "overviewSubtitle": "Browse and search all purges",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Purges.vue",
      "label": "清洗",
      "en": "Purges",
      "wiki": null,
      "collectionTypes": [
        "purge"
      ]
    },
    "coups": {
      "icon": "mdi-map-marker-alert",
      "title": "政变",
      "subtitle": "权力斗争中领袖与政治实体的倒台",
      "overviewSubtitle": "浏览并搜索全部政变",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "coups",
      "route": "/coup",
      "originalEnglish": {
        "title": "Coups",
        "subtitle": "The fall of leaders and political entities in power struggles",
        "overviewSubtitle": "Browse and search all coups",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Coups.vue",
      "label": "政变",
      "en": "Coups",
      "wiki": null,
      "collectionTypes": [
        "entity overthrown"
      ]
    },
    "rampages": {
      "icon": "mdi-weather-hurricane",
      "title": "肆虐",
      "subtitle": "野兽或肆虐团体发动的毁灭性袭击",
      "overviewSubtitle": "浏览并搜索全部肆虐",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "rampages",
      "route": "/beastattack",
      "originalEnglish": {
        "title": "Rampages",
        "subtitle": "Devastating attacks led by wild beasts or rampaging entities",
        "overviewSubtitle": "Browse and search all rampages",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/BeastAttacks.vue",
      "label": "肆虐",
      "en": "Rampages",
      "wiki": null,
      "collectionTypes": [
        "beast attack"
      ]
    },
    "abductions": {
      "icon": "mdi-map-marker-alert",
      "title": "绑架",
      "subtitle": "强行掳获个人，通常为了赎金或政治利益",
      "overviewSubtitle": "浏览并搜索全部绑架",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "abductions",
      "route": "/abduction",
      "originalEnglish": {
        "title": "Abductions",
        "subtitle": "Forcible capture of individuals, often for ransom or political gain",
        "overviewSubtitle": "Browse and search all abductions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Abductions.vue",
      "label": "绑架",
      "en": "Abductions",
      "wiki": null,
      "collectionTypes": [
        "abduction"
      ]
    },
    "thefts": {
      "icon": "mdi-handcuffs",
      "title": "盗窃",
      "subtitle": "秘密窃取财产，从普通物品到无价神器",
      "overviewSubtitle": "浏览并搜索全部盗窃",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "thefts",
      "route": "/theft",
      "originalEnglish": {
        "title": "Thefts",
        "subtitle": "Stealthy acts of taking property, from common goods to priceless artifacts",
        "overviewSubtitle": "Browse and search all thefts",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "进攻方与防守方",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Attacker vs. Defender"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Thefts.vue",
      "label": "盗窃",
      "en": "Thefts",
      "wiki": null,
      "collectionTypes": [
        "theft"
      ]
    },
    "processions": {
      "icon": "mdi-human-queue",
      "title": "游行",
      "subtitle": "人群或人物的盛大行进，庆祝传统、宗教或胜利",
      "overviewSubtitle": "浏览并搜索全部游行",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "processions",
      "route": "/procession",
      "originalEnglish": {
        "title": "Processions",
        "subtitle": "A grand march of people or figures, celebrating tradition, religion, or victory",
        "overviewSubtitle": "Browse and search all processions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "文明",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Civilization"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Processions.vue",
      "label": "游行",
      "en": "Processions",
      "wiki": null,
      "collectionTypes": [
        "procession"
      ]
    },
    "performances": {
      "icon": "mdi-drama-masks",
      "title": "演出",
      "subtitle": "从音乐到戏剧，用艺术展示文化与创造力",
      "overviewSubtitle": "浏览并搜索全部演出",
      "overviewTitle": "概览",
      "wikiKeyWord": "Performance",
      "id": "performances",
      "route": "/performance",
      "originalEnglish": {
        "title": "Performances",
        "subtitle": "An artistic display, from music to theater, bringing culture and creativity to life",
        "overviewSubtitle": "Browse and search all performances",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "文明",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Civilization"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Performances.vue",
      "label": "演出",
      "en": "Performances",
      "wiki": "Performance",
      "collectionTypes": [
        "performance"
      ]
    },
    "journeys": {
      "icon": "mdi-map-marker-path",
      "title": "旅程",
      "subtitle": "为了探索、发现或精神成长而进行的远行",
      "overviewSubtitle": "浏览并搜索全部旅程",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "journeys",
      "route": "/journey",
      "originalEnglish": {
        "title": "Journeys",
        "subtitle": "An expedition undertaken for exploration, discovery, or spiritual growth",
        "overviewSubtitle": "Browse and search all journeys",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Journeys.vue",
      "label": "旅程",
      "en": "Journeys",
      "wiki": null,
      "collectionTypes": [
        "journey"
      ]
    },
    "competitions": {
      "icon": "mdi-trophy-outline",
      "title": "竞赛",
      "subtitle": "对技艺、力量或智慧的考验，竞争者争夺优胜",
      "overviewSubtitle": "浏览并搜索全部竞赛",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "competitions",
      "route": "/competition",
      "originalEnglish": {
        "title": "Competitions",
        "subtitle": "A test of skill, strength, or intellect, where rivals vie for supremacy",
        "overviewSubtitle": "Browse and search all competitions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "文明",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Civilization"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Competitions.vue",
      "label": "竞赛",
      "en": "Competitions",
      "wiki": null,
      "collectionTypes": [
        "competition"
      ]
    },
    "ceremonies": {
      "icon": "mdi-human-greeting-variant",
      "title": "典礼",
      "subtitle": "纪念重要社会、文化或宗教里程碑的正式活动",
      "overviewSubtitle": "浏览并搜索全部典礼",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "ceremonies",
      "route": "/ceremony",
      "originalEnglish": {
        "title": "Ceremonies",
        "subtitle": "A formal event marking significant social, cultural, or religious milestones",
        "overviewSubtitle": "Browse and search all ceremonies",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "文明",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Civilization"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Ceremonies.vue",
      "label": "典礼",
      "en": "Ceremonies",
      "wiki": null,
      "collectionTypes": [
        "ceremony"
      ]
    },
    "occasions": {
      "icon": "mdi-calendar-star",
      "title": "庆典",
      "subtitle": "庆祝重要里程碑或欢乐聚会的盛大活动",
      "overviewSubtitle": "浏览并搜索全部庆典",
      "overviewTitle": "概览",
      "wikiKeyWord": null,
      "id": "occasions",
      "route": "/occasion",
      "originalEnglish": {
        "title": "Occasions",
        "subtitle": "A momentous event, celebrating important milestones or joyous gatherings",
        "overviewSubtitle": "Browse and search all occasions",
        "overviewTitle": "Overview"
      },
      "tableHeaders": [
        {
          "title": "开始",
          "key": "startDate",
          "align": "center",
          "originalEnglish": "Start"
        },
        {
          "title": "结束",
          "key": "endDate",
          "align": "center",
          "originalEnglish": "End"
        },
        {
          "title": "名称",
          "key": "html",
          "align": "start",
          "originalEnglish": "Name"
        },
        {
          "title": "类型",
          "key": "type",
          "align": "start",
          "originalEnglish": "Type"
        },
        {
          "title": "文明",
          "key": "subtype",
          "align": "start",
          "originalEnglish": "Civilization"
        },
        {
          "title": "纪事",
          "key": "eventCollectionCount",
          "align": "end",
          "originalEnglish": "Chronicles"
        },
        {
          "title": "事件",
          "key": "eventCount",
          "align": "end",
          "originalEnglish": "Events"
        }
      ],
      "showFilters": false,
      "sourceView": "src/views/Occasions.vue",
      "label": "庆典",
      "en": "Occasions",
      "wiki": null,
      "collectionTypes": [
        "occasion"
      ]
    }
  },
  "routeToKind": {
    "/hf": "figures",
    "/entity": "entities",
    "/site": "sites",
    "/artifact": "artifacts",
    "/region": "regions",
    "/uregion": "undergroundregions",
    "/landmass": "landmasses",
    "/river": "rivers",
    "/mountainpeak": "mountainpeaks",
    "/structure": "structures",
    "/construction": "constructions",
    "/danceform": "danceforms",
    "/musicalform": "musicalforms",
    "/poeticform": "poeticforms",
    "/writtencontent": "writtencontents",
    "/era": "eras",
    "/war": "wars",
    "/battle": "battles",
    "/duel": "duels",
    "/raid": "raids",
    "/siteconquered": "siteconquerings",
    "/insurrection": "insurrections",
    "/persecution": "persecutions",
    "/purge": "purges",
    "/coup": "coups",
    "/beastattack": "rampages",
    "/abduction": "abductions",
    "/theft": "thefts",
    "/procession": "processions",
    "/performance": "performances",
    "/journey": "journeys",
    "/competition": "competitions",
    "/ceremony": "ceremonies",
    "/occasion": "occasions"
  },
  "collectionSelectors": {
    "wars": "war",
    "battles": "battle",
    "duels": "duel",
    "raids": "raid",
    "siteconquerings": "site conquered",
    "insurrections": "insurrection",
    "persecutions": "persecution",
    "purges": "purge",
    "coups": "entity overthrown",
    "rampages": "beast attack",
    "abductions": "abduction",
    "thefts": "theft",
    "processions": "procession",
    "performances": "performance",
    "journeys": "journey",
    "competitions": "competition",
    "ceremonies": "ceremony",
    "occasions": "occasion"
  },
  "eventTableHeaders": [
    {
      "title": "日期",
      "key": "date",
      "originalEnglish": "Date"
    },
    {
      "title": "类型",
      "key": "type",
      "originalEnglish": "Type"
    },
    {
      "title": "事件",
      "key": "html",
      "originalEnglish": "Event",
      "sortable": false
    }
  ],
  "chronicleTableHeaders": [
    {
      "title": "开始",
      "key": "startDate",
      "align": "center",
      "originalEnglish": "Start"
    },
    {
      "title": "结束",
      "key": "endDate",
      "align": "center",
      "originalEnglish": "End"
    },
    {
      "title": "名称",
      "key": "html",
      "align": "start",
      "originalEnglish": "Name",
      "sortable": false
    },
    {
      "title": "类型",
      "key": "type",
      "align": "start",
      "originalEnglish": "Type"
    },
    {
      "title": "子类型",
      "key": "subtype",
      "align": "start",
      "originalEnglish": "Subtype"
    },
    {
      "title": "纪事",
      "key": "eventCollectionCount",
      "align": "end",
      "originalEnglish": "Chronicles"
    },
    {
      "title": "事件",
      "key": "eventCount",
      "align": "end",
      "originalEnglish": "Events"
    }
  ],
  "detailCards": {
    "figures": [
      {
        "title": "人物概览",
        "originalEnglish": {
          "title": "Profile Overview",
          "subtitle": "A summary of significant details and personal traits"
        },
        "field": "miscList",
        "icon": "mdi-account-details-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "相关派系与团体",
        "originalEnglish": {
          "title": "Related Factions and Groups",
          "subtitle": "The organizations and groups connected to this figure"
        },
        "field": "relatedEntityList",
        "icon": "mdi-account-group",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "相关地点",
        "originalEnglish": {
          "title": "Related Sites",
          "subtitle": "The locations tied to this figure, from settlements to strongholds of power"
        },
        "field": "relatedSiteList",
        "icon": "mdi-home-switch-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "亲密关系",
        "originalEnglish": {
          "title": "Close Relationships",
          "subtitle": "The personal and familial bonds that define the life of the historical figure"
        },
        "field": "relatedHistoricalFigureList",
        "icon": "mdi-heart-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "模糊关系",
        "originalEnglish": {
          "title": "Vague Relationships",
          "subtitle": "The uncertain and loosely documented associations in the figure’s life, from distant friends to comrades-in-arms"
        },
        "field": "vagueRelationshipList",
        "icon": "mdi-account-question-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "崇拜的神祇",
        "originalEnglish": {
          "title": "Worshipped Deities",
          "subtitle": "The divine beings revered by the historical figure, shaping their beliefs and actions"
        },
        "field": "worshippedDeities",
        "icon": "mdi-hand-heart-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "旅行宠物",
        "originalEnglish": {
          "title": "Journey Pets",
          "subtitle": "Trusted animal companions that accompanied this figure on their travels"
        },
        "field": "journeyPets",
        "icon": "mdi-paw",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "贵族职位",
        "originalEnglish": {
          "title": "Noble Positions",
          "subtitle": "The ruling elite, guiding the fate of realms and people"
        },
        "field": "positionList",
        "icon": "mdi-seal",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "崇拜者",
        "originalEnglish": {
          "title": "Worshipping Figures",
          "subtitle": "Historical figures who revere this creature, deity or force of nature"
        },
        "field": "worshippingFiguresList",
        "icon": "mdi-meditation",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "崇拜团体",
        "originalEnglish": {
          "title": "Worshipping Entities",
          "subtitle": "Groups or organizations that hold this deity in reverence"
        },
        "field": "worshippingEntitiesList",
        "icon": "mdi-crowd",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "著名击杀",
        "originalEnglish": {
          "title": "Notable Kills",
          "subtitle": "A record of the most significant and renowned kills achieved by this figure"
        },
        "field": "notableKillList",
        "icon": "mdi-skull-crossbones-outline",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "神器",
        "originalEnglish": {
          "title": "Artifacts",
          "subtitle": "Currently held artifacts"
        },
        "field": "holdingArtifactLinks",
        "icon": "mdi-diamond",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "受献建筑",
        "originalEnglish": {
          "title": "Dedicated Structures",
          "subtitle": "Structures dedicated to "
        },
        "field": "dedicatedStructuresLinks",
        "icon": "mdi-home-silo",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "绑架的对象",
        "originalEnglish": {
          "title": "Snatcher Of",
          "subtitle": "Victims snatched by "
        },
        "field": "snatchedHfLinks",
        "icon": "mdi-chess-bishop",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "战役",
        "originalEnglish": {
          "title": "Battles",
          "subtitle": "Battles fought by "
        },
        "field": "battleLinks",
        "icon": "mdi-chess-bishop",
        "sourceView": "src/views/HistoricalFigure.vue"
      },
      {
        "title": "巨兽袭击",
        "originalEnglish": {
          "title": "Beast Attacks",
          "subtitle": "Beast attacks recorded"
        },
        "field": "beastAttackLinks",
        "icon": "mdi-chess-knight",
        "sourceView": "src/views/HistoricalFigure.vue"
      }
    ],
    "sites": [
      {
        "title": "建筑",
        "originalEnglish": {
          "title": "Structures",
          "subtitle": "Notable buildings at this site"
        },
        "field": "structuresLinks",
        "icon": "mdi-home-silo",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "Related Historical Figures",
        "originalEnglish": {
          "title": "Related Historical Figures",
          "subtitle": "Famous figures tied to this site"
        },
        "field": "relatedHistoricalFigureLinks",
        "icon": "mdi-account-star",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "Notable Deaths",
        "originalEnglish": {
          "title": "Notable Deaths",
          "subtitle": "Key figures who died here"
        },
        "field": "notableDeathLinks",
        "icon": "mdi-grave-stone",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "战役",
        "originalEnglish": {
          "title": "Battles",
          "subtitle": "Battles fought at this site"
        },
        "field": "battleLinks",
        "icon": "mdi-chess-bishop",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "Conquerings",
        "originalEnglish": {
          "title": "Conquerings",
          "subtitle": "Conquests that took place here"
        },
        "field": "conqueringLinks",
        "icon": "mdi-chess-pawn",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "袭掠",
        "originalEnglish": {
          "title": "Raids",
          "subtitle": "Raids carried out at this site"
        },
        "field": "raidLinks",
        "icon": "mdi-lightning-bolt",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "决斗",
        "originalEnglish": {
          "title": "Duels",
          "subtitle": "Duels fought at this site"
        },
        "field": "duelLinks",
        "icon": "mdi-sword-cross",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "迫害",
        "originalEnglish": {
          "title": "Persecutions",
          "subtitle": "Acts of persecution at this site"
        },
        "field": "persecutionLinks",
        "icon": "mdi-map-marker-alert",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "起义",
        "originalEnglish": {
          "title": "Insurrections",
          "subtitle": "Revolts and uprisings here"
        },
        "field": "insurrectionLinks",
        "icon": "mdi-map-marker-alert",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "绑架",
        "originalEnglish": {
          "title": "Abductions",
          "subtitle": "Kidnappings that happened here"
        },
        "field": "abductionLinks",
        "icon": "mdi-map-marker-alert",
        "sourceView": "src/views/Site.vue"
      },
      {
        "title": "巨兽袭击",
        "originalEnglish": {
          "title": "Beast Attacks",
          "subtitle": "Beast attacks recorded here"
        },
        "field": "beastAttackLinks",
        "icon": "mdi-chess-knight",
        "sourceView": "src/views/Site.vue"
      }
    ],
    "entities": [
      {
        "title": "战争",
        "originalEnglish": {
          "title": "Wars",
          "subtitle": "Wars shaping the realm’s history"
        },
        "field": "warList",
        "icon": "mdi-sword-cross",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "贵族职位",
        "originalEnglish": {
          "title": "Noble Positions",
          "subtitle": "The ruling elite, guiding the fate of realms and people"
        },
        "field": "entityPositionAssignmentsList",
        "icon": "mdi-seal",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "相关派系与团体",
        "originalEnglish": {
          "title": "Related Factions and Groups",
          "subtitle": "The organizations and groups connected to this entity"
        },
        "field": "entityEntityLinkList",
        "icon": "mdi-account-group",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "Current Sites",
        "originalEnglish": {
          "title": "Current Sites",
          "subtitle": "The sites held by this entity, from settlements to strongholds of power"
        },
        "field": "currentSiteList",
        "icon": "mdi-home-outline",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "Lost Sites",
        "originalEnglish": {
          "title": "Lost Sites",
          "subtitle": "Former strongholds and settlements once under the control of this entity"
        },
        "field": "lostSiteList",
        "icon": "mdi-home-off-outline",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "崇拜的神祇",
        "originalEnglish": {
          "title": "Worshipped Deities",
          "subtitle": "The divine beings revered across the lands"
        },
        "field": "worshippedLinks",
        "icon": "mdi-weather-sunset",
        "sourceView": "src/views/Entity.vue"
      },
      {
        "title": "相关地点",
        "originalEnglish": {
          "title": "Related Sites",
          "subtitle": "The locations tied to this entity, from settlements to strongholds of power"
        },
        "field": "entitySiteLinkList",
        "icon": "mdi-home-switch-outline",
        "sourceView": "src/views/Entity.vue"
      }
    ],
    "regions": [
      {
        "title": "相关地点",
        "originalEnglish": {
          "title": "Related Sites",
          "subtitle": "Settlements, fortresses, and sites located in this region"
        },
        "field": "siteLinks",
        "icon": "mdi-home-switch-outline",
        "sourceView": "src/views/Region.vue"
      },
      {
        "title": "河流",
        "originalEnglish": {
          "title": "Rivers",
          "subtitle": "Rivers flowing through this region"
        },
        "field": "riverLinks",
        "icon": "mdi-waves",
        "sourceView": "src/views/Region.vue"
      },
      {
        "title": "Mountain Peaks & Volcanoes",
        "originalEnglish": {
          "title": "Mountain Peaks & Volcanoes",
          "subtitle": "Mountain summits and volcanoes in this region"
        },
        "field": "mountainPeakLinks",
        "icon": "mdi-summit",
        "sourceView": "src/views/Region.vue"
      },
      {
        "title": "Constructions & Bridges",
        "originalEnglish": {
          "title": "Constructions & Bridges",
          "subtitle": "Bridges, roads, and structures built in this region"
        },
        "field": "constructionLinks",
        "icon": "mdi-bridge",
        "sourceView": "src/views/Region.vue"
      },
      {
        "title": "Battles & Conflicts",
        "originalEnglish": {
          "title": "Battles & Conflicts",
          "subtitle": "Historic battles and sieges fought in this region"
        },
        "field": "battleLinks",
        "icon": "mdi-chess-bishop",
        "sourceView": "src/views/Region.vue"
      },
      {
        "title": "Notable Deaths",
        "originalEnglish": {
          "title": "Notable Deaths",
          "subtitle": "Historical figures who met their end in this region"
        },
        "field": "notableDeathLinks",
        "icon": "mdi-grave-stone",
        "sourceView": "src/views/Region.vue"
      }
    ]
  },
  "pageSize": 10,
  "pageSizeOptions": [
    10,
    25,
    50,
    100
  ],
  "assets": {
    "logo": "LegendsViewer.Frontend/legends-viewer-frontend/public/ceretelina.png",
    "logoFile": "assets/ceretelina.png",
    "upstreamIconPackage": "@mdi/font",
    "upstreamTheme": "Vuetify dark"
  },
  "labels": {
    "Explore Worlds": "探索世界",
    "Overview": "概览",
    "World Records": "世界纪录",
    "Map": "地图",
    "Eras": "时代",
    "Favorites": "收藏",
    "Society": "社会",
    "Geography": "地理",
    "Infrastructure": "基础设施",
    "Art and Craft": "艺术与工艺",
    "Warfare": "战争",
    "Conflicts": "冲突",
    "Calamities": "灾难",
    "Rituals": "仪式",
    "Factions and Groups": "派系与团体",
    "Historical Figures": "历史人物",
    "Regions": "区域",
    "Underground": "地下",
    "Underground Regions": "地下区域",
    "Landmasses": "陆块",
    "Rivers": "河流",
    "Mountain Peaks": "山峰",
    "Mountain Peaks and Volcanos": "山峰与火山",
    "Sites": "地点",
    "Structures": "建筑",
    "Constructions": "工程",
    "Artifacts": "神器",
    "Dance Forms": "舞蹈形式",
    "Musical Forms": "音乐形式",
    "Poetic Forms": "诗歌形式",
    "Written Content": "书面作品",
    "Wars": "战争",
    "Battles": "战役",
    "Duels": "决斗",
    "Raids": "袭掠",
    "Site Conquerings": "地点征服",
    "Insurrections": "起义",
    "Persecutions": "迫害",
    "Purges": "清洗",
    "Coups": "政变",
    "Rampages": "肆虐",
    "Abductions": "绑架",
    "Thefts": "盗窃",
    "Processions": "游行",
    "Performances": "演出",
    "Journeys": "旅程",
    "Competitions": "竞赛",
    "Ceremonies": "典礼",
    "Occasions": "庆典",
    "Id": "编号",
    "Name": "名称",
    "Type": "类型",
    "Subtype": "子类型",
    "Chronicles": "纪事",
    "Events": "事件",
    "Caste": "种姓",
    "Race": "种族",
    "Region": "区域",
    "Biome": "生物群系",
    "Evilness": "邪恶程度",
    "Size": "面积",
    "Depth": "深度",
    "Length": "长度",
    "Height": "高度",
    "World Rank": "世界排名",
    "Start": "开始",
    "End": "结束",
    "Attacker vs. Defender": "进攻方与防守方",
    "Civilization": "文明",
    "Outcome": "结果",
    "Duration": "时长",
    "From - To": "起止时间",
    "Author": "作者",
    "Date": "日期",
    "Event": "事件",
    "Search": "搜索",
    "Search DF Wiki": "搜索矮人要塞维基",
    "Filter Settings": "筛选设置",
    "Cancel": "取消",
    "Apply": "应用",
    "Close Dialog": "关闭对话框",
    "Location": "位置",
    "Profile Overview": "人物概览",
    "Family Tree": "家族树",
    "Skills": "技能",
    "Related Factions and Groups": "相关派系与团体",
    "Related Sites": "相关地点",
    "Close Relationships": "亲密关系",
    "Vague Relationships": "模糊关系",
    "Worshipped Deities": "崇拜的神祇",
    "Journey Pets": "旅行宠物",
    "Noble Positions": "贵族职位",
    "Worshipping Figures": "崇拜者",
    "Worshipping Entities": "崇拜团体",
    "Notable Kills": "著名击杀",
    "Dedicated Structures": "受献建筑",
    "Snatcher Of": "绑架的对象",
    "Beast Attacks": "巨兽袭击",
    "World Overview Map": "世界概览地图",
    "Population by Race": "各族人口",
    "Area by Overworld Regions": "地表区域面积",
    "Active Civilizations": "现存文明",
    "Lost Civilizations": "消亡文明",
    "Heroic Ties": "冒险关联",
    "Explore a new world": "探索新世界",
    "Select an exported legends XML file": "选择导出的传说 XML 文件",
    "Select": "选择",
    "Select World Export": "选择世界导出文件",
    "Current Folder": "当前文件夹",
    "File Name": "文件名",
    "Directories": "文件夹",
    "World Exports": "世界导出文件",
    "Close": "关闭",
    "Load World": "载入世界",
    "Load": "载入",
    "Explore": "探索",
    "Delete Bookmark": "删除书签"
  },
  "worldCardOrder": [
    "World Overview Map",
    "Population by Race",
    "Area by Overworld Regions",
    "Active Civilizations",
    "Lost Civilizations",
    "Events",
    "Chronicles",
    "Heroic Ties"
  ],
  "detailLayout": [
    "headerWithFavoriteAndPreviousNext",
    "locationAndTypeSpecificBefore",
    "events",
    "chronicles",
    "typeSpecificAfter"
  ],
  "worldObjectDetailTabs": []
});
})(window);
