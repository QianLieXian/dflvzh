/* Offline adaptation of LegendsViewer-Next's Map.vue and RegionTypeColors.cs.
 * The source map uses an image overlay, owner layers, and geometric site markers.
 * See THIRD_PARTY_NOTICES.md for upstream attribution. */
(function () {
  'use strict';

  var SITE_MARKERS = {
    unknown: ['circle', 3], hillocks: ['square', 2], fortress: ['pentagon', 3],
    mountainhalls: ['hexagon', 4], forestretreat: ['pentagon', 3], hamlet: ['square', 2],
    town: ['pentagon', 3], castle: ['hexagon', 4], darkpits: ['pentagon', 3],
    darkfortress: ['hexagon', 3], monastery: ['triangle', 3], fort: ['triangle', 3],
    tomb: ['triangle', 3], mysteriouslair: ['square', 2, '#AAAAFF'],
    mysteriousdungeon: ['pentagon', 3, '#AAAAFF'], mysteriouspalace: ['hexagon', 4, '#AAAAFF'],
    cave: ['circle', 3], lair: ['circle', 2], vault: ['star', 3], labyrinth: ['star', 3],
    shrine: ['star', 3], tower: ['star', 4], camp: ['circle', 3], importantlocation: ['star', 3]
  };
  // Values copied from LegendsViewer.Backend/Legends/Maps/RegionTypeColors.cs.
  var REGION_COLORS = {
    mountains: [139,137,137], forest: [34,139,34], desert: [255,223,186], ocean: [0,105,148],
    wetland: [47,79,79], tundra: [224,255,255], glacier: [240,248,255], grassland: [124,252,0],
    hills: [85,107,47], lake: [70,130,180], cavern: [105,105,105], underworld: [128,0,128], magma: [255,69,0]
  };
  function key(value) { return String(value || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function asArray(value) { return Array.isArray(value) ? value : ArrayBuffer.isView(value) ? Array.from(value) : value && typeof value === 'object' ? ('id' in value || 'type' in value || 'target' in value || 'link_type' in value || 'entity_id' in value ? [value] : Object.values(value)) : []; }
  function numeric(value) { return value === undefined || value === null || value === '' ? NaN : Number(value); }
  function getCoordinates(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      var match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;:]\s*(-?\d+(?:\.\d+)?)/);
      return match ? { x: +match[1], y: +match[2] } : null;
    }
    if (Array.isArray(value)) {
      if (value.length > 1 && Number.isFinite(numeric(value[0])) && Number.isFinite(numeric(value[1]))) return { x: +value[0], y: +value[1] };
      return getCoordinates(value[0]);
    }
    if (typeof value !== 'object') return null;
    if (Number.isFinite(numeric(value.x)) && Number.isFinite(numeric(value.y))) return { x: +value.x, y: +value.y };
    if (Number.isFinite(numeric(value.coord_x)) && Number.isFinite(numeric(value.coord_y))) return { x: +value.coord_x, y: +value.coord_y };
    return getCoordinates(value.coords || value.coordinates || value.coord || value.location);
  }
  function coordinates(record) {
    var raw = record.coords || record.coordinates || record.coord || record.path || [record.coord_1,record.coord_2].filter(function(value){return value!==undefined&&value!==null&&value!=='';}).join('|');
    var result;
    if (typeof raw === 'string') result = raw.split('|').map(getCoordinates).filter(Boolean);
    else if (Array.isArray(raw) && raw.length && typeof raw[0] !== 'number') result = raw.map(getCoordinates).filter(Boolean);
    else { var one = getCoordinates(record); result = one ? [one] : []; }
    if(record.end_pos){var end=getCoordinates(record.end_pos);if(end&&!result.some(function(p){return p.x===end.x&&p.y===end.y;}))result.push(end);}
    return result.filter(function (p) { return p.x >= 0 && p.y >= 0; });
  }

  // The seeded .NET Random sequence used by the source region color variation.
  function seededRandom(seed) {
    var slots = new Array(56).fill(0), max = 2147483647;
    var mj = 161803398 - (seed === -2147483648 ? max : Math.abs(seed | 0));
    slots[55] = mj; var mk = 1;
    for (var i = 1; i < 55; i++) {
      var ii = 21 * i % 55; slots[ii] = mk; mk = mj - mk;
      if (mk < 0) mk += max; mj = slots[ii];
    }
    for (var k = 1; k < 5; k++) for (var j = 1; j < 56; j++) { slots[j] -= slots[1 + (j + 30) % 55]; if (slots[j] < 0) slots[j] += max; }
    var next = 0, nextp = 21;
    return function () {
      if (++next >= 56) next = 1; if (++nextp >= 56) nextp = 1;
      var ret = slots[next] - slots[nextp]; if (ret === max) ret--; if (ret < 0) ret += max;
      slots[next] = ret; return ret / max;
    };
  }
  function regionColor(region) {
    var rgb = REGION_COLORS[key(region.type || region.biome)];
    if (!rgb) return null;
    if (Number.isFinite(numeric(region.id))) {
      var random = seededRandom(+region.id);
      rgb = rgb.map(function (c) { return Math.max(0, Math.min(255, c + Math.floor(random() * 30) - 15)); });
    }
    return 'rgb(' + rgb.join(',') + ')';
  }
  function hsv(hue, saturation, value, opacity) {
    var h = hue / 60, chroma = value * saturation, x = chroma * (1 - Math.abs(h % 2 - 1));
    var rgb = h < 1 ? [chroma,x,0] : h < 2 ? [x,chroma,0] : h < 3 ? [0,chroma,x] : h < 4 ? [0,x,chroma] : h < 5 ? [x,0,chroma] : [chroma,0,x];
    var channels=rgb.map(function (c) { return Math.trunc((c + value - chroma) * 255); }).join(',');
    return opacity===1?'rgb('+channels+')':'rgba('+channels+',0.69)';
  }
  function isMainCivilization(entity,world) {if(!entity)return false;var a=world?.disk?.aggregates||world?.aggregates;if(Array.isArray(a?.civilizations))return a.civilizations.includes(Number(entity.id));if(entity.IsCiv!==undefined)return entity.IsCiv===true;if(entity.is_civ!==undefined)return entity.is_civ===true;return/^(civilization|civ)$/i.test(String(entity.type||''));}
  function raceColors(world) {
    var civs=asArray(world?.entities).filter(function(e){return isMainCivilization(e,world);});
    var races=Array.from(new Set(civs.map(function(e){return String(e.race||'');}))).sort(function(a,b){return String(a||'Unknown').localeCompare(String(b||'Unknown'),'en',{sensitivity:'base'});});
    var variance=races.length<=1?0:races.length<=6?Math.floor(300/(races.length-1)):races.length>18?Math.floor(300/(Math.ceil(races.length/3)-1)):60;
    return new Map(races.map(function(race,index){var hue=index*variance;return[race,hue<360?hsv(hue,1,1,1):hue<720?hsv(hue-360,.4,1,1):hue<1080?hsv(hue-720,1,.4,1):'rgb(143,188,143)'];}));
  }
  function regionBaseColor(type) {var color=REGION_COLORS[key(type)];return color?color.slice():null;}
  var colorWorldCache=new WeakMap();
  function colorContext(world){var cached=colorWorldCache.get(world);if(cached)return cached;cached={index:new Map(asArray(world?.entities).map(function(item){return[+item.id,item];})),races:raceColors(world),civilizations:new Map(),colors:new Map()};colorWorldCache.set(world,cached);return cached;}
  function civilizationFor(entity, world) {
    if(!entity)return null;var context=colorContext(world);if(context.civilizations.has(+entity.id))return context.civilizations.get(+entity.id);var original=entity,index=context.index,seen=new Set();
    while(entity&&!seen.has(+entity.id)){seen.add(+entity.id);if(isMainCivilization(entity,world))break;var parent=asArray(entity.entity_link).find(function(link){return/^parent$/i.test(String(link.type||link.link_type||''));});if(!parent||!index.has(+(parent.target??parent.entity_id)))break;entity=index.get(+(parent.target??parent.entity_id));}if(!isMainCivilization(entity,world))entity=null;context.civilizations.set(+original.id,entity);return entity;
  }
  function entityColor(entity, world, opacity) {
    if(!entity)return '#666666';
    var context=colorContext(world),civ=civilizationFor(entity,world),color=String(entity?.color||civ?.color||context.races.get(String((civ||entity)?.race||''))||'rgb(102,102,102)'),rgb=/^#[a-f\d]{6}$/i.test(color)?[1,3,5].map(function(i){return parseInt(color.slice(i,i+2),16);}):color.match(/[\d.]+/g);
    // ColorExtensions.ToRgbaString defaults to alpha=1, independent of Color.A.
    if(!rgb||rgb.length<3)return '#666666';return 'rgba('+rgb.slice(0,3).join(',')+','+(opacity===undefined?1:opacity)+')';
  }
  function ownerForSite(site,world){return numeric(world?.disk?.aggregates?.siteOwnership?.[site.id]?.owner??site.cur_owner_id??site.current_owner_id??site.owner_id??site.civ_id);}
  function objectIcon(record, kind) {
    kind=key(kind);var type=key(record?.type),icons={cave:'ocarina',fortress:'wall',forestretreat:'tree',darkfortress:'temple-hindu',town:'home-group',hamlet:'barn',vault:'treasure-chest',darkpits:'bacteria',hillocks:'hoop-house',tomb:'grave-stone',tower:'chess-rook',mountainhalls:'stadium-variant',camp:'tent',lair:'liquid-spot',labyrinth:'floor-plan',shrine:'pillar',fort:'toy-brick',monastery:'mosque',castle:'castle',mysteriouspalace:'shield-crown',mysteriousdungeon:'checkbox-multiple-blank',mysteriouslair:'checkbox-multiple-blank-circle'};
    if(kind==='sites'||kind==='site')return 'mdi-'+(icons[type]||'home-modern');
    if(kind==='figures'||kind==='hf'){if(flag(record?.force)||flag(record?.force_of_nature))return'mdi-leaf';if(flag(record?.deity)||flag(record?.is_deity))return'mdi-weather-sunset';return /^female$/i.test(record?.caste)?'mdi-gender-female':/^male$/i.test(record?.caste)?'mdi-gender-male':/^default$/i.test(record?.caste)?'mdi-gender-non-binary':'';}
    if(kind==='regions'||kind==='region')return'mdi-'+({mountains:'image-filter-hdr',ocean:'tsunami',tundra:'weather-snowy-heavy',glacier:'snowflake',forest:'forest-outline',wetland:'home-flood',grassland:'grass',desert:'cactus',hills:'image-filter-hdr-outline',lake:'weather-hazy'}[type]||'map-legend');
    if(kind==='entities'||kind==='entity')return'mdi-account-group';
    if(kind==='structures'||kind==='structure')return'mdi-'+({meadhall:'glass-mug-variant',market:'scale-balance',keep:'castle',temple:'temple-buddhist',dungeon:'tunnel',inntavern:'food-turkey',tomb:'grave-stone',underworldspire:'star-three-points',library:'library',tower:'chess-rook',countinghouse:'bank-outline',guildhall:'town-hall',hospital:'medication-outline'}[type]||'home-silo');
    return'mdi-'+({artifacts:'diamond-stone',writtencontents:'bookshelf',worldconstructions:type==='road'?'road':type==='bridge'?'bridge':type==='tunnel'?'tunnel-outline':'sign-caution',constructions:type==='road'?'road':type==='bridge'?'bridge':type==='tunnel'?'tunnel-outline':'sign-caution',mountainpeaks:(flag(record?.volcano)||flag(record?.is_volcano))?'volcano-outline':'summit',rivers:'waves',landmasses:'island-variant',undergroundregions:'tunnel',wars:'sword-cross',battles:'chess-bishop',poeticforms:'account-voice',musicalforms:'music-clef-treble',danceforms:'dance-ballroom'}[kind]||{war:'sword-cross',battle:'chess-bishop',raid:'lightning-bolt',siteconquered:'flag-variant',duel:'fencing',abduction:'map-marker-alert',beastattack:'weather-hurricane',insurrection:'map-marker-alert',entityoverthrown:'alert-decagram-outline',theft:'handcuffs',purge:'skull-crossbones-outline',persecution:'gavel',occasion:'calendar-star',competition:'trophy-outline',ceremony:'human-greeting-variant',procession:'human-queue',performance:'drama-masks',journey:'map-marker-path'}[type]||'information-outline');
  }
  function flag(value){return value!==undefined&&value!==null&&value!==false&&!/^(0|false|no)$/i.test(String(value));}
  function objectIconHTML(record,kind,world){
    function escape(value){return String(value??'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
    var normalized=key(kind),icon=objectIcon(record,kind),color='';
    if(normalized==='entities'||normalized==='entity'){
      if(isMainCivilization(record,world)){var initials=String(record.name||'').split(/\s+/).filter(function(word){return word&&!/^(the|of|and|a|an|in)$/i.test(word);}).slice(0,10).map(function(word){return word[0].toUpperCase();}).join(''),bg=entityColor(record,world,1),rgb=bg.match(/[\d.]+/g).slice(0,3).map(Number),fg=(.299*rgb[0]+.587*rgb[1]+.114*rgb[2])/255>.5?'#000000':'#FFFFFF';return'<span style="background-color:'+bg+';color:'+fg+'" class="v-chip v-chip--label v-theme--dark v-chip--density-compact v-chip--size-default v-chip--variant-tonal soc" draggable="false"><span class="v-chip__underlay"></span><span class="v-chip__content">'+escape(initials)+'</span></span>';}
      if(colorContext(world).races.has(String(record?.race||'')))color=entityColor(record,world,1);else icon='mdi-account-multiple';
    }
    return icon?'<i '+(color?'style="color:'+escape(color)+'" ':'')+'class="'+icon+' mdi v-icon notranslate v-theme--dark v-icon--size-default" aria-hidden="true"></i>':'';
  }
  function geometry(world) {
    var sites=asArray(world.sites),regions=asArray(world.regions),maxX=0,maxY=0;
    var tiles=regions.map(function(region){var points=coordinates(region);points.forEach(function(p){maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});return{region:region,points:points};});
    sites.forEach(function(site){coordinates(site).forEach(function(p){maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});});
    return{sites:sites,tiles:tiles,width:Math.max(1,+world.width||+world.world_width||maxX+1),height:Math.max(1,+world.height||+world.world_height||maxY+1)};
  }
  var imageCache=new WeakMap();
  function invalidate(world){if(world&&typeof world==='object'){imageCache.delete(world);colorWorldCache.delete(world);}}
  function imageForWorld(world) {
    if(!world||typeof world!=='object')return null;
    if(imageCache.has(world))return imageCache.get(world);
    var geo=geometry(world);
    // The source paints region-type colors over an exported bitmap when region
    // coordinates are available. Keep the bitmap itself when no such tiles exist.
    if(!geo.tiles.some(function(tile){return tile.points.length&&regionColor(tile.region);})){if(world.mapImage||world.generatedMapImage)return world.mapImage||world.generatedMapImage;}
    if(!geo.tiles.some(function(tile){return tile.points.length;})&&!geo.sites.some(function(site){return coordinates(site).length;})&&!world.width&&!world.world_width)return null;
    var canvas=document.createElement('canvas'),factor=Math.min(8,4096/Math.max(geo.width,geo.height));
    canvas.width=Math.max(1,Math.round(geo.width*factor));canvas.height=Math.max(1,Math.round(geo.height*factor));
    var ctx=canvas.getContext('2d');
    // WorldMapImageGenerator.DrawGrid: 4-tile lines and 16-tile major lines.
    ctx.lineWidth=1;for(var x=4;x<geo.width;x+=4){ctx.strokeStyle=x%16===0?'#483d8b':'#2f4f4f';ctx.beginPath();ctx.moveTo(x*factor,0);ctx.lineTo(x*factor,canvas.height);ctx.stroke();}for(var y=4;y<geo.height;y+=4){ctx.strokeStyle=y%16===0?'#483d8b':'#2f4f4f';ctx.beginPath();ctx.moveTo(0,y*factor);ctx.lineTo(canvas.width,y*factor);ctx.stroke();}
    geo.tiles.forEach(function(tile){var color=regionColor(tile.region);if(!color)return;ctx.fillStyle=color;tile.points.forEach(function(p){ctx.fillRect(p.x*factor,p.y*factor,factor+.1,factor+.1);});});
    var result=canvas.toDataURL('image/png');imageCache.set(world,result);return result;
  }
  function objectCoordinates(world,kind,record,options) {
    options=options||{};var result=coordinates(record||{});
    if(/^(entities|entity)$/.test(kind)){result=[];var entityIndex=colorContext(world).index;asArray(options.sites||world.sites).forEach(function(site){var owner=entityIndex.get(ownerForSite(site,world)),civ=civilizationFor(owner,world);if(+owner?.id===+record.id||+civ?.id===+record.id)coordinates(site).forEach(function(p){result.push(p);});});}
    if(!result.length&&record?.site_id!==undefined){var site=asArray(world.sites).find(function(site){return+site.id===+record.site_id;});if(site)result=coordinates(site);}
    return result;
  }
  async function locationImage(world,kind,record,options) {
    var points=objectCoordinates(world,kind,record,options);if(!points.length)return null;
    var geo=geometry(world),factor=Math.min(options?.tileSize||4,4096/Math.max(geo.width,geo.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(geo.width*factor));canvas.height=Math.max(1,Math.round(geo.height*factor));var ctx=canvas.getContext('2d'),base=imageForWorld(world);
    if(base){var image=await new Promise(function(resolve){var image=new Image();image.onload=function(){resolve(image);};image.onerror=function(){resolve(null);};image.src=base;});if(image)ctx.drawImage(image,0,0,canvas.width,canvas.height);}
    var depth=/^(undergroundregions|undergroundregion)$/.test(key(kind))?record.depth:null;
    if(depth!==null&&depth!==undefined){ctx.clearRect(0,0,canvas.width,canvas.height);asArray(world.underground_regions||world.extra?.underground_regions).filter(function(region){return+region.depth===+depth;}).forEach(function(region){ctx.fillStyle=regionColor(region)||'#696969';coordinates(region).forEach(function(p){ctx.fillRect(p.x*factor,p.y*factor,factor+.1,factor+.1);});});}
    ctx.fillStyle='#ff00ff';points.forEach(function(p){ctx.fillRect(p.x*factor,p.y*factor,factor+.1,factor+.1);});
    var minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;points.forEach(function(p){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});var cx=((minX+maxX)/2+.5)*factor,cy=((minY+maxY)/2+.5)*factor,rx=Math.max((maxX-minX)*factor/2+factor*3,16,canvas.width*.035),ry=Math.max((maxY-minY)*factor/2+factor*3,16,canvas.width*.035),stroke=Math.max(3,factor*.8);
    function ring(radiusX,radiusY,color,width,dashed){ctx.beginPath();ctx.ellipse(cx,cy,radiusX,radiusY,0,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashed?[8,6]:[]);ctx.stroke();}
    ring(rx*1.7,ry*1.7,'#000',stroke+3,true);ring(rx*1.7,ry*1.7,'#ffff00',stroke,true);ring(rx,ry,'#000',stroke+4);ring(rx,ry,'#ffff00',stroke+1);ring(rx,ry,'#f00',stroke*.6);
    function cross(color,width){ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,Math.max(0,cy-ry-4));ctx.moveTo(cx,Math.min(canvas.height,cy+ry+4));ctx.lineTo(cx,canvas.height);ctx.moveTo(0,cy);ctx.lineTo(Math.max(0,cx-rx-4),cy);ctx.moveTo(Math.min(canvas.width,cx+rx+4),cy);ctx.lineTo(canvas.width,cy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    cross('#000',stroke+3);cross('#ff0',stroke);ctx.beginPath();ctx.arc(cx,cy,Math.max(2.5,stroke*.8),0,Math.PI*2);ctx.fillStyle='#f00';ctx.fill();ctx.strokeStyle='#ff0';ctx.lineWidth=1.5;ctx.stroke();return canvas.toDataURL('image/png');
  }
  function installStyles() {
    if(document.getElementById('legends-map-styles'))return;
    var style=document.createElement('style');style.id='legends-map-styles';
    // Map.vue's scoped rules, with readable 16px control/popup text requested by the user.
    style.textContent=`
.lm-map{height:880px;width:100%;position:relative}
.lm-map .leaflet-image-layer{max-width:none!important;max-height:none!important;image-rendering:pixelated;image-rendering:crisp-edges}
.lm-map .leaflet-control-layers,.lm-map.leaflet-container{background:#121212;color:rgba(255,255,255,.87);font-family:Roboto,"Noto Sans SC","Microsoft YaHei",Arial,sans-serif;font-size:16px}
.lm-map .leaflet-control-zoom-in,.lm-map .leaflet-control-zoom-out,.lm-map .leaflet-control-attribution,.lm-map .leaflet-popup{filter:invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)}
.lm-map .leaflet-control-layers-overlays label{margin-top:4px;font-size:16px;line-height:1.5}
.lm-map .leaflet-control-layers-selector{width:16px;height:16px;padding:0;margin:0 5px 0 0}
.lm-map .leaflet-popup-content{font-size:16px;line-height:1.5}
.lm-map .leaflet-control-custom a{font-size:14px}
.lm-map .leaflet-control-attribution{font-size:14px}
.lm-map .site-picker__heading{display:block;margin-bottom:10px}
.lm-map .site-picker--multiple .site-picker__item{padding:8px 0}
.lm-map .site-picker--multiple .site-picker__item+.site-picker__item{border-top:1px solid rgba(127,127,127,.35)}
.lm-map .site-count-marker{pointer-events:none}
.lm-map .site-count-marker span{display:flex;min-width:18px;height:18px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:rgba(25,25,25,.72);box-shadow:0 1px 2px rgba(0,0,0,.45);color:rgba(255,255,255,.9);font-size:14px;font-weight:600;line-height:1}
.lm-map .target-highlight-pulse{animation:lm-target-pulse 1.5s ease-in-out infinite}.lm-map .warfare-popup-title{font-size:16px;font-weight:700;margin-bottom:8px}.lm-map .warfare-popup-row{margin:4px 0}.lm-map .warfare-active{background:#b71c1c;color:#fff;padding:2px 6px;border-radius:4px;font-size:14px;margin-left:8px}.lm-map .warfare-stats{margin-top:8px;border-top:1px solid #555;padding-top:8px}@keyframes lm-target-pulse{0%,100%{opacity:1;stroke-width:4}50%{opacity:.5;stroke-width:6}}
`;
    document.head.appendChild(style);
  }
  function mount(container,world,options) {
    if(!container)throw new Error('Map container is required');
    if(!window.L)throw new Error('Leaflet is required; load assets/vendor/leaflet/leaflet.js before js/map.js');
    installStyles();world=world||{};options=options||{};
    var geo=geometry(world),entities=asArray(world.entities),entityIndex=new Map(entities.map(function(e){return[+e.id,e];}));
    function civilization(entity){return civilizationFor(entity,world);}
    function translated(record,kind){var name=String(record.name||record.translated_name||'Unknown');if(options.translate){try{return options.translate(name,kind,record)||name;}catch(_){}}if(window.DFTranslate){try{return DFTranslate.name(record.translated_name||name,{kind:kind==='entities'?'entity':'site',type:record.type})||name;}catch(_){}}return name;}
    function term(type){return window.DFTranslate?.term(String(type||'Unknown'))||String(type||'Unknown');}
    function escape(text){return String(text).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
    var root=document.createElement('div');root.className='lm-map';root.setAttribute('aria-label','地图');container.appendChild(root);
    var vectorRenderer=L.canvas(),nativeRedraw=vectorRenderer._redraw;
    // Leaflet can retain a redraw callback when a map is removed between two
    // animation frames. A disposed canvas must not draw after its context is
    // deleted (for example when immediately leaving a focused map route).
    vectorRenderer._redraw=function(){if(this._ctx&&this._container&&this._map)nativeRedraw.call(this);else this._redrawRequest=null;};
    var map=L.map(root,{crs:L.CRS.Simple,zoom:0,minZoom:-2,maxZoom:2,zoomControl:false,preferCanvas:true,renderer:vectorRenderer});L.control.zoom({zoomInTitle:'放大',zoomOutTitle:'缩小'}).addTo(map);
    var bounds=[[0,0],[8*geo.height,8*geo.width]],image=imageForWorld(world);
    if(world.mapImage&&image!==world.mapImage)L.imageOverlay(world.mapImage,bounds,{pane:'tilePane',interactive:false}).addTo(map);
    if(image)L.imageOverlay(image,bounds,{pane:'tilePane',interactive:false}).addTo(map);
    map.setMaxBounds(bounds);
    var owners=new Map(),tileItems=new Map(),markerEntries=[],warfare=L.layerGroup(),warfareEntries=new Map(),highlight=L.layerGroup().addTo(map),highlightRenderer=L.svg({pane:'overlayPane'}),destroyed=false,changingLayers=false;
    function toLatLng(x,y){return[(geo.height-y)*8-4,x*8+4];}
    function polygon(center,sides,size,color,star){var points=[],count=star?sides*2:sides;for(var i=0;i<count;i++){var angle=i/count*Math.PI*2+Math.PI/2,radius=star&&i%2?size/2:size;points.push([center[0]+radius*Math.sin(angle),center[1]+radius*Math.cos(angle)]);}return L.polygon(points,{pane:'overlayPane',color:color});}
    function markerFor(type,color,latlng){var config=SITE_MARKERS[key(type)]||SITE_MARKERS.unknown;var size=config[1];color=config[2]||color||'#666';if(config[0]==='circle')return L.circle(latlng,{pane:'overlayPane',color:color,radius:size});if(config[0]==='star')return polygon(latlng,5,size,color,true);return polygon(latlng,{triangle:3,square:4,pentagon:5,hexagon:6}[config[0]],size,color,false);}
    function recordLink(record,kind){var wrapper=document.createElement('span');wrapper.className='lm-object-link';var template=document.createElement('template');template.innerHTML=objectIconHTML(record,kind,world);wrapper.append(template.content,document.createTextNode(' '));var link=document.createElement('a');link.href='#'+kind+'/'+record.id;link.textContent=translated(record,kind);link.onclick=function(event){event.preventDefault();if(options.onSelect)options.onSelect(kind,record.id);};wrapper.append(link);return wrapper;}
    function picker(items){var active=items.filter(function(item){return map.hasLayer(item.layer);});var box=document.createElement('div');box.className='site-picker';if(active.length>1){box.classList.add('site-picker--multiple');var heading=document.createElement('strong');heading.className='site-picker__heading';heading.textContent='此处有 '+active.length+' 项';box.appendChild(heading);}active.forEach(function(item){var row=document.createElement('div');row.className='site-picker__item';if(item.popup){row.append(item.popup());}else{row.append(recordLink(item.site,'sites'),document.createElement('br'),document.createTextNode(term(item.site.type)),document.createElement('br'),document.createElement('br'));row.append(item.owner?recordLink(item.owner,'entities'):document.createTextNode('其他'));}box.appendChild(row);});return box;}
    geo.sites.forEach(function(site){
      var owner=entityIndex.get(ownerForSite(site,world)),civ=civilization(owner),ownerText=civ?String(civ.name):'Others';
      if(!owners.has(ownerText))owners.set(ownerText,{owner:civ,layer:L.layerGroup()});
      var group=owners.get(ownerText).layer,color=site.color||entityColor(owner,world);
      coordinates(site).forEach(function(p){var marker=markerFor(site.type,color,toLatLng(p.x,p.y));var item={site:site,owner:civ,layer:group,marker:marker,x:p.x,y:p.y};var coord=p.x+','+p.y;if(!tileItems.has(coord))tileItems.set(coord,[]);tileItems.get(coord).push(item);marker.bindPopup(function(){return picker(tileItems.get(coord));},{minWidth:220});group.addLayer(marker);markerEntries.push(item);});
    });
    function warfarePopup(item){var box=document.createElement('div'),title=document.createElement('div');title.className='warfare-popup-title';title.append(recordLink(item.record,item.kind));if(item.active){var badge=document.createElement('span');badge.className='warfare-active';badge.textContent='进行中';title.append(badge);}box.append(title);if(item.kind==='battles'){var parent=warfareEntries.get('wars:'+item.parentId)?.item.record;if(parent){var warRow=document.createElement('div');warRow.className='warfare-popup-row';var warLabel=document.createElement('strong');warLabel.textContent='战争：';warRow.append(warLabel,recordLink(parent,'wars'));box.append(warRow);}}[['进攻方',item.attacker,item.record.attacker_death_count??item.record.attackerDeathCount??item.record.AttackerDeathCount],['防守方',item.defender,item.record.defender_death_count??item.record.defenderDeathCount??item.record.DefenderDeathCount],['胜方',item.victor]].forEach(function(pair){if(!pair[1])return;var row=document.createElement('div');row.className='warfare-popup-row';var label=document.createElement('strong');label.textContent=pair[0]+'：';row.append(label,recordLink(pair[1],'entities'));if(item.kind==='battles'&&pair[2]!==undefined)row.append(document.createTextNode('（'+Number(pair[2]).toLocaleString()+' 人死亡）'));box.append(row);});var stats=document.createElement('div');stats.className='warfare-stats';var start=item.record.start_year??item.record.startYear??'?',end=item.record.end_year??item.record.endYear??-1;stats.append(document.createTextNode('年份：'+start+(item.kind==='wars'?' – '+(+end===-1?'现在':end):'')));if(item.deaths!==null&&item.deaths!==undefined)stats.append(document.createElement('br'),document.createTextNode('总死亡：'+Number(item.deaths).toLocaleString()));box.append(stats);return box;}
    function registerWarfare(item,p,marker){var coord=p.x+','+p.y,entry={layer:warfare,marker:marker,x:p.x,y:p.y,popup:function(){return warfarePopup(item);},warfare:true};if(!tileItems.has(coord))tileItems.set(coord,[]);tileItems.get(coord).push(entry);marker.bindPopup(function(){return picker(tileItems.get(coord));},{minWidth:240});}
    function swordIcon(color,battle){return L.divIcon({className:battle?'battle-marker-icon':'war-single-marker',html:'<div style="background:rgba(18,18,18,.95);border:3px solid '+escape(color)+';border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.85)"><i class="mdi mdi-sword-cross" style="font-size:20px;color:'+(battle?'#ffffff':escape(color))+';line-height:1"></i></div>',iconSize:[32,32],iconAnchor:[16,16]});}
    function setWarfare(records){
      warfare.clearLayers();warfareEntries.clear();tileItems.forEach(function(items,coord){var sites=items.filter(function(item){return!item.warfare;});if(sites.length)tileItems.set(coord,sites);else tileItems.delete(coord);});
      // Every battle at the same tile has the same 32px symbol. The source's
      // later marker completely covers earlier ones; keep that exact visible
      // symbol and the complete tile picker, without thousands of hidden DOM
      // copies. All records still have entries for focus and navigation.
      var battleTiles=new Map();
      warfareFor(records,world).forEach(function(item){var points=[],marker,color=item.color&&item.color!=='#666666'?item.color:'#E53935';
        if(item.kind==='wars'){
          if(item.start&&item.end){var start=toLatLng(item.start.x,item.start.y),end=toLatLng(item.end.x,item.end.y);points.push(start,end);L.polyline([start,end],{color:color,weight:7,opacity:.9,dashArray:item.active?undefined:'10, 10',pane:'overlayPane'}).bindPopup(function(){return warfarePopup(item);}).addTo(warfare);var angle=Math.atan2(end[1]-start[1],end[0]-start[0])*180/Math.PI,arrow=L.divIcon({className:'war-arrow-head',html:'<div style="transform:rotate('+angle+'deg);color:'+escape(color)+';width:38px;height:38px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,.85))"><svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" stroke="#000" stroke-width="1.2"><path d="M12 2L2 22l2 1L12 18l8 5 2-1z"/></svg></div>',iconSize:[38,38],iconAnchor:[19,19]});marker=L.marker(end,{icon:arrow}).addTo(warfare);registerWarfare(item,item.end,marker);if(Math.hypot(end[0]-start[0],end[1]-start[1])>80)L.marker([(start[0]+end[0])/2,(start[1]+end[1])/2],{icon:arrow}).bindPopup(function(){return warfarePopup(item);}).addTo(warfare);
          }else if(item.start||item.end){var point=item.end||item.start;points.push(toLatLng(point.x,point.y));marker=L.marker(points[0],{icon:swordIcon(color,false)}).addTo(warfare);registerWarfare(item,point,marker);}
        }else if(item.point){points.push(toLatLng(item.point.x,item.point.y));var tile=item.point.x+','+item.point.y,existing=battleTiles.get(tile);if(existing){marker=existing.marker;existing.color=color;}else{marker=L.marker(points[0],{icon:swordIcon(color,true)}).addTo(warfare);battleTiles.set(tile,{marker:marker,color:color});}registerWarfare(item,item.point,marker);}
        warfareEntries.set(item.kind+':'+item.record.id,{item:item,points:points,marker:marker});
      });battleTiles.forEach(function(tile){tile.marker.setIcon(swordIcon(tile.color,true));});syncCounts();
    }
    function pulse(p,radius){L.circle(toLatLng(p.x,p.y),{renderer:highlightRenderer,color:'#ffcc00',fillColor:'#ff3300',fillOpacity:.4,radius:radius||18,weight:4,interactive:false,className:'target-highlight-pulse'}).addTo(highlight);}
    function focus(target){if(!target||destroyed)return;highlight.clearLayers();var kind=target.kind||target.type,record=target.record||asArray(world[kind]||world.extra?.[kind]).find(function(record){return+record.id===+target.id;}),points=[];
      if(/^(wars|battles|war|battle)$/.test(kind)){kind=/^war/.test(kind)?'wars':'battles';if(record||target.collections?.length){var available=new Map();warfareEntries.forEach(function(entry){available.set(entry.item.kind+':'+entry.item.record.id,entry.item.record);});asArray(target.collections).forEach(function(item){available.set((/^war$/i.test(item.type)?'wars':'battles')+':'+item.id,item);});if(record)available.set(kind+':'+record.id,record);setWarfare(Array.from(available.values()));}if(!map.hasLayer(warfare))warfare.addTo(map);var entry=warfareEntries.get(kind+':'+(record?.id??target.id));if(entry){points=entry.points;[kind==='wars'?entry.item.start:null,kind==='wars'?entry.item.end:null,kind==='battles'?entry.item.point:null].filter(Boolean).forEach(function(p){pulse(p,kind==='wars'?20:22);});if(kind==='wars')warfareEntries.forEach(function(battle){if(+battle.item.parentId===+(record?.id??target.id)){points=points.concat(battle.points);if(battle.item.point)pulse(battle.item.point,16);}});if(points.length===1)map.setView(points[0],1);else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[80,80]});entry.marker?.openPopup();}return;}
      if(!record)return;var coords=objectCoordinates(world,kind,record,target);coords.forEach(function(p){points.push(toLatLng(p.x,p.y));pulse(p,kind==='sites'||kind==='entities'?16:18);});markerEntries.forEach(function(entry){if(kind==='sites'&&+entry.site.id===+record.id||kind==='entities'&&(+entry.owner?.id===+record.id||ownerForSite(entry.site,world)===+record.id)){if(!map.hasLayer(entry.layer))entry.layer.addTo(map);if(points.length===1)entry.marker.openPopup();}});if(points.length===1)map.setView(points[0],1);else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[80,80]});
    }
    // The collapsed chooser keeps placeholders until it is opened; translate
    // names between frames without exposing raw XML names during that work.
    function ownerLabel(group,index,label){return '<span data-map-owner="'+index+'">'+objectIconHTML(group.owner,'entities',world)+' <a href="#/entity/'+Number(group.owner.id)+'" data-map-owner-link="'+Number(group.owner.id)+'">'+escape(label)+'</a></span>';}
    var overlays={},ownerLabels=[];owners.forEach(function(group){var index=ownerLabels.length;ownerLabels.push(group);overlays[group.owner?ownerLabel(group,index,'…'):'其他']=group.layer;group.layer.addTo(map);});overlays['战争与战役']=warfare;
    var layerControl=L.control.layers(undefined,overlays),layerIds=new Map();
    // Leaflet 1.9.4 checks all existing inputs after EACH added row, and its
    // default _getLayer then scans all layers. Thousands of factions turn that
    // into cubic startup work. Keep its exact DOM and checkbox behavior while
    // indexing IDs and checking disabled states once after the complete update.
    layerControl._layers.forEach(function(entry){layerIds.set(L.stamp(entry.layer),entry);});
    layerControl._getLayer=function(id){return layerIds.get(id);};
    var nativeUpdate=layerControl._update,nativeDisabled=layerControl._checkDisabledLayers;
    layerControl._checkDisabledLayers=function(){if(!this._buildingRows)nativeDisabled.call(this);};
    layerControl._update=function(){this._buildingRows=true;var result;try{result=nativeUpdate.call(this);}finally{this._buildingRows=false;}if(this._map)nativeDisabled.call(this);return result;};
    layerControl.addTo(map);var layerToggle=layerControl.getContainer().querySelector('.leaflet-control-layers-toggle');if(layerToggle){layerToggle.title='图层';layerToggle.setAttribute('aria-label','图层');}map.on('popupopen',function(event){var close=event.popup.getElement()?.querySelector('.leaflet-popup-close-button');if(close){close.title='关闭弹出窗口';close.setAttribute('aria-label','关闭弹出窗口');}});
    var labelTask=null,labelsComplete=false;
    function translateOwnerLabels(){if(labelTask||labelsComplete||destroyed)return;labelTask=(async function(){var labels=layerControl.getContainer().querySelectorAll('[data-map-owner]');for(var i=0;i<labels.length;i++){if(destroyed)return;var index=+labels[i].dataset.mapOwner,group=ownerLabels[index];if(group?.owner){var value=translated(group.owner,'entities'),entry=layerIds.get(L.stamp(group.layer));if(entry)entry.name=ownerLabel(group,index,value);var current=layerControl.getContainer().querySelector('[data-map-owner="'+index+'"] [data-map-owner-link]');if(current)current.textContent=value;}if(i%4===0)await new Promise(function(resolve){setTimeout(resolve,0);});}labelsComplete=true;})().finally(function(){labelTask=null;});}
    layerControl.getContainer().addEventListener('mouseenter',translateOwnerLabels);layerControl.getContainer().addEventListener('focusin',translateOwnerLabels);layerToggle?.addEventListener('click',translateOwnerLabels);
    layerControl.getContainer().addEventListener('click',function(event){var link=event.target.closest('[data-map-owner-link]');if(!link)return;event.preventDefault();event.stopPropagation();if(options.onSelect)options.onSelect('entities',+link.dataset.mapOwnerLink);});
    var counts=L.layerGroup();
    function syncCounts(){if(changingLayers)return;counts.clearLayers();if(map.getZoom()===map.getMaxZoom()){tileItems.forEach(function(items){var active=items.filter(function(item){return map.hasLayer(item.layer);});if(active.length>1){var item=active[0];L.marker(toLatLng(item.x,item.y),{icon:L.divIcon({className:'site-count-marker',html:'<span>'+active.length+'</span>',iconSize:[18,18],iconAnchor:[9,9]}),interactive:false,keyboard:false,zIndexOffset:1000}).addTo(counts);}});if(!map.hasLayer(counts))counts.addTo(map);}else if(map.hasLayer(counts))map.removeLayer(counts);}
    map.on('zoomend overlayadd overlayremove',syncCounts);
    var AllControl=L.Control.extend({options:{position:'topright'},onAdd:function(){var box=L.DomUtil.create('div','leaflet-bar leaflet-control leaflet-control-custom');function button(label,enabled){var anchor=L.DomUtil.create('a','',box);anchor.href='#';anchor.textContent=label;anchor.style.cssText='width:56px;cursor:pointer;padding:0;background:#333;color:#fff;border:2px solid #ccc;'+(enabled?'':'margin-top:5px;margin-right:0;');L.DomEvent.on(anchor,'click',function(event){L.DomEvent.stop(event);changingLayers=true;layerControl._handlingClick=true;try{owners.forEach(function(group){if(enabled)map.addLayer(group.layer);else map.removeLayer(group.layer);});if(enabled)map.addLayer(warfare);else map.removeLayer(warfare);}finally{layerControl._handlingClick=false;changingLayers=false;layerControl._update();}syncCounts();});}button('全部',true);button('全不选',false);L.DomEvent.disableClickPropagation(box);return box;}});
    map.addControl(new AllControl());
    // fitBounds establishes the first view and emits each queued layer's add
    // event. Treat those thousands of notifications as one chooser update.
    changingLayers=true;layerControl._handlingClick=true;try{map.fitBounds(bounds);}finally{layerControl._handlingClick=false;changingLayers=false;}layerControl._update();syncCounts();
    var observer=typeof ResizeObserver==='function'?new ResizeObserver(function(){map.invalidateSize();}):null;
    function resize(){map.invalidateSize();}if(observer)observer.observe(root);else window.addEventListener('resize',resize);
    var timer=setTimeout(resize,100);setWarfare(options.warfare||world.warfare||asArray(world.collections).filter(function(record){return+record.end_year===-1;}));if(options.focus)focus(options.focus);
    // Leaflet's zoom transition also has a fallback timeout. Disarm it before
    // removing panes so a pending callback cannot move a disposed map.
    return{map:map,focus:focus,setWarfare:setWarfare,reset:function(){highlight.clearLayers();map.fitBounds(bounds);},fit:function(){map.invalidateSize();map.fitBounds(bounds);},destroy:function(){if(destroyed)return;destroyed=true;clearTimeout(timer);if(observer)observer.disconnect();else window.removeEventListener('resize',resize);map.stop();map._animatingZoom=false;warfare.clearLayers();owners.forEach(function(group){group.layer.clearLayers();});highlight.clearLayers();counts.clearLayers();map.remove();root.remove();}};
  }
  function warfareFor(records,world){
    var raw=records?.wars?asArray(records.wars).concat(asArray(records.battles)):asArray(records),entities=new Map(asArray(world.entities).map(function(record){return[+record.id,record];})),wars=new Map(raw.filter(function(record){return/^war$/i.test(record.type||'')||record.attackerCoordinates||record.defenderCoordinates;}).map(function(record){return[+record.id,record];}));
    var capitals=new Map(),sitePoints=new Map();asArray(world.sites).forEach(function(site){var owner=ownerForSite(site,world),point=getCoordinates(site);if(!point)return;sitePoints.set(+site.id,point);if(!capitals.has(owner))capitals.set(owner,point);var civ=civilizationFor(entities.get(owner),world);if(civ&&!capitals.has(+civ.id))capitals.set(+civ.id,point);});
    function capital(entity){return entity?(capitals.get(+entity.id)||getCoordinates(entity)):null;}
    var items=raw.map(function(record){var isWar=/^war$/i.test(record.type||'')||!!(record.attackerCoordinates||record.defenderCoordinates),parentId=numeric(record.war_eventcol??record.war_id??record.warId),parent=wars.get(parentId),attacker=entities.get(numeric(record.aggressor_ent_id??record.attacker_ent_id??record.attacker_civ_id??record.attacker_enid??record.attacking_enid??record.attacker_id??record.attackerId??parent?.aggressor_ent_id)),defender=entities.get(numeric(record.defender_ent_id??record.defender_civ_id??record.defender_enid??record.defending_enid??record.defender_id??record.defenderId??parent?.defender_ent_id)),death=window.LegendsWarfare?.deaths(record);return{kind:isWar?'wars':'battles',record:record,attacker:attacker,defender:defender,victor:entities.get(numeric(record.victor_id??record.victorId))||(/attacker.?won/i.test(record.outcome||'')?attacker:/defender.?won/i.test(record.outcome||'')?defender:null),color:record.attackerColor||entityColor(attacker,world),active:record.isActive??(+(record.end_year??record.endYear)===-1||!isWar&&+parent?.end_year===-1),start:getCoordinates(record.attackerCoordinates)||capital(attacker),end:getCoordinates(record.defenderCoordinates)||capital(defender),point:getCoordinates(record.coordinates)||getCoordinates(record)||sitePoints.get(+record.site_id),parentId:parentId,deaths:death};}).filter(function(item){return item.kind==='wars'||/^battle$/i.test(item.record.type||'')||item.record.warId!==undefined;});
    var battlesByParent=new Map(),battlesById=new Map();items.forEach(function(item){if(item.kind!=='battles'||!item.point)return;battlesById.set(+item.record.id,item);if(!battlesByParent.has(item.parentId))battlesByParent.set(item.parentId,[]);battlesByParent.get(item.parentId).push(item);});
    items.forEach(function(item){if(item.kind!=='wars')return;var battles=battlesByParent.get(+item.record.id)||[];if(!battles.length)asArray(item.record.eventcol||item.record.children).forEach(function(id){var child=battlesById.get(+id);if(child)battles.push(child);});if(!item.start&&battles.length)item.start=battles[0].point;if(!item.end&&battles.length)item.end=battles[battles.length-1].point;});return items;
  }
  window.LegendsMap={mount:mount,getCoordinates:getCoordinates,imageForWorld:imageForWorld,invalidate:invalidate,locationImage:locationImage,objectCoordinates:objectCoordinates,raceColors:raceColors,regionBaseColor:regionBaseColor,entityColor:entityColor,objectIcon:objectIcon,objectIconHTML:objectIconHTML,warfareFor:warfareFor};
}());
