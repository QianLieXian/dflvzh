#!/usr/bin/env python3
"""Exercise every upstream list/detail route in native Chromium file://.

Python stdlib and ChromeDriver only. --profile PATH --saved checks an imported
world without changing its XML or database. The default uses a small local model.
"""
import argparse
import base64
import json
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--profile', type=Path)
parser.add_argument('--saved', action='store_true')
parser.add_argument('--screenshots', type=Path, help='Write source-layout desktop and mobile screenshots')
parser.add_argument('--timeout', type=int, default=180)
args = parser.parse_args()

FIXTURE = r"""
const world={id:'page-regression',name:'The World of Mountains',year:200,width:4,height:4,sourceFiles:[],
figures:[{id:1,name:'Urist Goldhammer',race:'DWARF',caste:'MALE',birth_year:1,death_year:-1,hf_link:[{hfid:2,link_type:'spouse',link_strength:100},{hfid:5,link_type:'mother'},{hfid:6,link_type:'child'},{hfid:3,link_type:'deity',link_strength:90}],site_link:{site_id:1,link_type:'home'},entity_link:{entity_id:1,link_type:'member'},entity_position_link:{entity_id:1,position_id:0,start_year:100,end_year:-1},hf_skill:[{skill:'MINING',total_ip:18000}],sphere:['metals'],journey_pet:['DOG'],goal:'rule the world',holds_artifact:1},
{id:2,name:'Domas Silverspear',race:'DWARF',caste:'FEMALE',birth_year:5,death_year:150,hf_link:[{hfid:1,link_type:'spouse'}],site_link:{site_id:1,link_type:'home'},entity_position_link:{entity_id:1,position_id:0,start_year:20,end_year:100}},
{id:3,name:'The Silver One',race:'DWARF',deity:'',sphere:['mountains']},
{id:4,name:'Kogan Copperaxe',race:'GOBLIN',birth_year:20,death_year:120},{id:5,name:'Nil Silverbow',race:'DWARF',caste:'FEMALE',birth_year:-80,death_year:40,hf_link:{hfid:1,link_type:'child'}},{id:6,name:'Zasit Copperhammer',race:'DWARF',caste:'MALE',birth_year:150,death_year:-1,hf_link:{hfid:1,link_type:'father'},entity_position_link:{entity_id:1,position_id:1,start_year:170,end_year:-1}}],
sites:[{id:1,name:'Boatmurdered',type:'fortress',coords:'1,1',region_id:1,cur_owner_id:1,civ_id:1,structure:[{local_id:0,name:'The Silver Temple',type:'temple',worship_hfid:3,inhabitant:1},{local_id:1,name:'The Golden Library',type:'library',copied_artifact_id:1}]},{id:2,name:'The Silver Town',type:'town',coords:'3,3',region_id:1,cur_owner_id:2,civ_id:2}],
entities:[{id:1,name:'The Copper Spears',type:'civilization',race:'DWARF',worship_id:3,entity_position:[{id:0,name:'monarch',name_male:'king',name_female:'queen'},{id:1,name:'general'},{id:2,name:'baron'}],entity_position_assignment:[{id:0,position_id:0,histfig:1},{id:1,position_id:1,histfig:6}]},{id:2,name:'The Silver Axes',type:'civilization',race:'GOBLIN'}],
regions:[{id:1,name:'The Gold Mountains',type:'Mountains',coords:'0,0|1,1|2,1|2,2',evilness:'good',force_id:3}],
artifacts:[{id:1,name:'The Bronze Book',type:'book',item_type:'book',item_subtype:'codex',holder_hfid:1,site_id:1,creator_hfid:1,mat:'gold',page_count:10,writing:1,item:{name_string:'gold-bound codex',page_written_content_id:1},item_description:'This is a book.'}],
eras:[{id:0,name:'The Age of Heroes',start_year:0,end_year:-1}],
events:[{id:1,year:20,seconds72:1200,type:'add hf entity link',hfid:2,civ_id:1,link:'position',position_id:0},{id:2,year:100,seconds72:1200,type:'remove hf entity link',hfid:2,civ_id:1,link:'position',position_id:0},{id:3,year:100,seconds72:2400,type:'add hf entity link',hfid:1,civ_id:1,link:'position',position_id:0},{id:4,year:120,seconds72:0,type:'hf died',hfid:4,slayer_hf:1,site_id:1,subregion_id:1,cause:'struck down'},
{id:5,year:130,seconds72:1200,type:'entity breach feature layer',civ_id:1,site_id:1,feature_layer_id:1},{id:6,year:50,seconds72:0,type:'written content composed',hfid:1,wc_id:1,site_id:1},{id:7,year:10,seconds72:0,type:'artifact created',hfid:1,artifact_id:1,site_id:1},{id:8,year:170,type:'add hf entity link',hfid:6,civ_id:1,link:'position',position_id:1},{id:9,year:50,type:'add hf entity link',hfid:2,civ_id:1,link:'position',position_id:2},{id:10,year:100,type:'remove hf entity link',hfid:2,civ_id:1,link:'position',position_id:2}],
collections:[{id:1,type:'war',name:'The War of Copper',start_year:100,end_year:-1,aggressor_ent_id:1,defender_ent_id:2,eventcol:[2]},
{id:2,type:'battle',name:'The Battle of Gold',start_year:120,end_year:120,site_id:1,subregion_id:1,attacking_enid:1,defending_enid:2,attacking_hfid:[1],defending_hfid:[4],attacking_squad_race:['DWARF'],attacking_squad_number:[20],attacking_squad_deaths:[2],defending_squad_race:['GOBLIN'],defending_squad_number:[30],defending_squad_deaths:[20],event:[4],war_eventcol:1}],
extra:{underground_regions:[{id:1,name:'The First Cavern',type:'cavern',depth:1,coords:'1,1|2,1'}],landmasses:[{id:1,name:'The Golden Continent',coords:'0,0|1,1'}],rivers:[{id:1,name:'The Silver River',path:'0,0|1,1',end_pos:'2,1'}],mountain_peaks:[{id:1,name:'The Golden Peak',height:100,coords:'2,1',region_id:1,is_volcano:''}],world_constructions:[{id:1,name:'The Golden Road',type:'road',coords:'1,1|2,1',site_id1:1}],dance_forms:[{id:1,name:'The Copper Dance',description:'A dance.'}],musical_forms:[{id:1,name:'The Silver Music',description:'A musical form.'}],poetic_forms:[{id:1,name:'The Gold Verse',description:'A poetic form.'}],written_contents:[{id:1,title:'The Golden World',type:'essay',author:1,page_start:0,page_end:9,style:'serious'}],entity_populations:[{id:1,civ_id:1,race:'DWARF:200'}]}};
let next=3;for(const [kind,def]of Object.entries(LegendsUI.categories))for(const type of def.collectionTypes||[])if(!world.collections.some(row=>row.type===type))world.collections.push({id:next++,type,ordinal:1,start_year:120,end_year:120,site_id:1,civ_id:1,event:[4]});
world.events.push({id:11,year:110,seconds72:0,type:'created structure',site_id:1,structure_id:0,civ_id:1,builder_hfid:1});
LegendsData.normalizeWorld(world);await LegendsApp.setWorld(world,{navigate:true});return true;
"""

with tempfile.TemporaryDirectory(prefix='legends-pages-') as temporary:
    profile = args.profile or Path(temporary) / 'profile'
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    driver = subprocess.Popen([shutil.which('chromedriver'), f'--port={port}'], stdout=open(Path(temporary) / 'driver.log', 'w'), stderr=subprocess.STDOUT)
    session = None

    def request(method, path, data=None):
        req = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=args.timeout) as result:
                value = json.load(result)['value']
        except urllib.error.HTTPError as error:
            raise RuntimeError(error.read().decode()) from error
        if isinstance(value, dict) and value.get('error'):
            raise RuntimeError(value)
        return value

    def command(path, data=None, method='POST'):
        return request(method, '/session/' + session + path, data)

    def js(script, *values):
        return command('/execute/sync', {'script': script, 'args': list(values)})

    def async_js(script):
        return command('/execute/async', {'script': 'const done=arguments[arguments.length-1];(async()=>{' + script + '})().then(done,error=>done({error:String(error),stack:error.stack}));', 'args': []})

    def wait(script):
        deadline = time.monotonic() + args.timeout
        while time.monotonic() < deadline:
            value = js(script)
            if value:
                return value
            time.sleep(.05)
        raise AssertionError('Timed out: ' + script)

    try:
        for _ in range(100):
            try:
                request('GET', '/status')
                break
            except OSError:
                time.sleep(.05)
        response = request('POST', '/session', {'capabilities': {'alwaysMatch': {'browserName': 'chrome', 'goog:chromeOptions': {'binary': shutil.which('chromium'), 'args': ['--headless', '--no-sandbox', '--disable-gpu', '--window-size=1512,1100', '--user-data-dir=' + str(profile)]}, 'goog:loggingPrefs': {'browser': 'ALL'}}}})
        session = response['sessionId']
        command('/timeouts', {'script': args.timeout * 1000})
        command('/url', {'url': (ROOT / 'index.html').as_uri()})
        wait('return !!window.LegendsApp&&!!window.LegendsDetails&&!!window.DFTranslate?.skill')
        js("window.__pageRegressionErrors=[];window.addEventListener('error',event=>__pageRegressionErrors.push({message:event.message,stack:event.error?.stack,route:location.hash}));for(const key of ['_onZoomTransitionEnd','_animateZoom']){const original=L.Map.prototype[key];L.Map.prototype[key]=function(...args){try{return original.apply(this,args);}catch(error){__pageRegressionErrors.push({message:error.message,stack:error.stack,method:key,route:location.hash});throw error;}}}")
        if not args.saved:
            assert async_js(FIXTURE) is True
            reference_kinds=js("return {figure:LegendsLocalStore.references({type:'artifact created',reason:'glorify hf',reason_id:3},LegendsApp.state.world),entity:LegendsLocalStore.references({type:'artifact possessed',reason:'artifact is symbol of entity position',reason_id:1},LegendsApp.state.world)}")
            assert any(ref['kind']=='figures' and ref['id']==3 for ref in reference_kinds['figure']), reference_kinds
            assert any(ref['kind']=='entities' and ref['id']==1 for ref in reference_kinds['entity']), reference_kinds
            print(json.dumps({'reasonReferences': reference_kinds}, ensure_ascii=False), flush=True)
        else:
            wait('return !!LegendsApp.state.world')
        routes = js('return Object.entries(LegendsUI.categories).map(([kind,def])=>({kind,path:def.route}));')
        report = []
        for route in routes:
            command('/url', {'url': (ROOT / 'index.html').as_uri() + '#' + route['path']})
            wait("return LegendsApp.state.route===arguments[0]&&!document.querySelector('.loading')&&!document.querySelector('[aria-busy=\"true\"]')".replace('arguments[0]', json.dumps(route['kind'])))
            entry = js("const table=document.querySelector('.data-table');return {kind:LegendsApp.state.route,rows:table?.tBodies[0]?.rows.length,alert:document.querySelector('[role=alert]:not([hidden])')?.textContent,first:table?.querySelector('tbody a[href]')?.getAttribute('href')};")
            assert not entry.get('alert'), entry
            if entry.get('first'):
                js('location.hash=arguments[0].slice(1)', entry['first'])
                wait('return !!LegendsApp.state.detailModel&&!document.querySelector(".loading")')
                entry['detail'] = js('return {title:document.querySelector(".page-title h2")?.textContent,cards:[...document.querySelectorAll(".section-heading h3")].map(el=>el.textContent),charts:LegendsApp.state.charts.length,graphs:LegendsApp.state.graphs.length,brokenImages:[...document.images].filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.src)}')
                assert entry['detail']['title'], entry
                assert not entry['detail']['brokenImages'], entry
                if args.saved and args.screenshots:
                    args.screenshots.mkdir(parents=True,exist_ok=True)
                    js('window.scrollTo(0,0)');time.sleep(.1)
                    (args.screenshots/(route['kind']+'-detail.png')).write_bytes(base64.b64decode(command('/screenshot',method='GET')))
            report.append(entry)
            print(json.dumps(entry, ensure_ascii=False), flush=True)
        if not args.saved:
            js('location.hash="/world"')
            wait('return LegendsApp.state.route==="overview"&&!!document.querySelector("[data-page-size=events]")')
            js('const select=document.querySelector("[data-page-size=events]");select.value="100";select.dispatchEvent(new Event("change",{bubbles:true}));')
            structure_links=wait('const links=[...document.querySelectorAll("[data-table=events] [data-object-kind=structures]")].map(element=>({id:element.dataset.objectId,href:element.querySelector("a")?.getAttribute("href")}));return links.length?links:null;')
            expected=js('return (LegendsApp.state.world.disk?.aggregates||LegendsApp.state.world.aggregates).structureLookup["1:0"]')
            assert any(link['id']==str(expected) and link.get('href','').endswith('/'+str(expected)) for link in structure_links), structure_links
            assert all('NaN' not in (link.get('href') or '') and ':' not in (link.get('href') or '') for link in structure_links), structure_links
            print(json.dumps({'siteLocalStructureLinks': structure_links}, ensure_ascii=False), flush=True)
        for path in ['/world', '/map', '/records']:
            js('location.hash=arguments[0]', path)
            wait('return !document.querySelector(".loading")&&!document.querySelector("[aria-busy=true]")')
            print(json.dumps({'path': path, 'title': js('return document.querySelector("#main")?.textContent.slice(0,160)')}, ensure_ascii=False), flush=True)
        if not args.saved:
            def detail(kind, record_id):
                js('LegendsApp.openRecord(arguments[0],arguments[1])', kind, record_id)
                wait('return LegendsApp.state.route===' + json.dumps(kind) + '&&LegendsApp.state.recordId===' + str(record_id) + '&&LegendsApp.state.detailModel?.record.id===' + str(record_id) + '&&!document.querySelector(".loading")')
            def screenshot(label):
                if args.screenshots:
                    args.screenshots.mkdir(parents=True, exist_ok=True)
                    js('window.scrollTo(0,0)')
                    time.sleep(.15)
                    (args.screenshots / (label + '.png')).write_bytes(base64.b64decode(command('/screenshot', method='GET')))
            js("const wf=LegendsWarfare.mount,ff=LegendsFamily.mount;window.LegendsWarfare={...LegendsWarfare,mount:(...a)=>window.__warfare=wf(...a)};window.LegendsFamily={...LegendsFamily,mount:(...a)=>window.__family=ff(...a)};")
            detail('figures',1)
            translation_checks=js('''
const cards=[...LegendsApp.state.detailModel.before,...LegendsApp.state.detailModel.after],deity=cards.find(card=>card.title==='崇拜的神祇');
const deityText=deity?.items.map(row=>typeof row==='string'?row:row.subtitle).join(' '),skill=document.querySelector('.skill-row')?.textContent;
const terrain=DFTranslate.term('Mountain','terrain'),checks={deity:deityText,terrain,skill,creature:DFTranslate.term('DWARF','creature'),strict:[]};
for(const [kind,key] of [['figures','BirthYear'],['regions','SquareTiles']]){
 const rules=[{propertyName:key,operator:'Equals',value:'1'}],before=JSON.stringify(rules);let error;
 try{LegendsFilters.matches({id:999},kind,rules,{world:LegendsApp.state.world,strictFilters:true});}catch(value){error=value;}
 checks.strict.push({kind,key,message:error?.message,properties:error?.properties,label:LegendsFilters.label(key),unchanged:before===JSON.stringify(rules),chip:LegendsFilters.chip(rules[0])});
}
return checks;''')
            assert translation_checks['deity']=='山峦',translation_checks
            assert translation_checks['terrain']!='山峦' and 'Mountain' not in translation_checks['terrain'],translation_checks
            assert translation_checks['skill'] and 'MINING' not in translation_checks['skill'],translation_checks
            for check in translation_checks['strict']:
                assert check['label'] in check['message'] and check['key'] not in check['message'],check
                assert check['properties']==[check['key']] and check['unchanged'] and check['key'] not in check['chip'],check
            print(json.dumps({'sharedTranslation':translation_checks},ensure_ascii=False),flush=True)
            assert js('return LegendsApp.state.graphs.some(graph=>graph.cy?.nodes().length>=3)')
            assert js('const content=getComputedStyle(document.querySelector(".page-title>.mdi"),"::before").content;return content!=="none"&&content!=="normal"&&content.length>2')
            screenshot('figure-desktop')
            js("document.querySelector('[data-expand-family]').click()")
            wait('return document.querySelector("#expanded-dialog").open&&document.querySelectorAll("#expanded-family canvas").length===3')
            assert js('return __family.cy.nodes().length>=3&&getComputedStyle(document.querySelector("#expanded-family")).height==="720px"')
            screenshot('family-fullscreen')
            js("window.__closedFamily=__family.cy;__family.cy.$id('6').emit('tap')")
            wait('return LegendsApp.state.recordId===6&&!document.querySelector("#expanded-dialog").open')
            wait('return __closedFamily.destroyed()')
            detail('entities',1)
            assert js("return LegendsApp.state.detailModel.warfare.edges.length===1&&LegendsApp.state.detailModel.warfare.edges[0].data.kind==='wars'")
            assert js('return document.querySelector("#timeline-otherPositions select")?.options.length===2')
            screenshot('entity-desktop')
            for mode in ['primaryOnly','otherPositions']:
                js("document.querySelector('[data-expand-timeline='+arguments[0]+']').click()",mode)
                wait('return document.querySelector("#expanded-dialog").open&&!!document.querySelector("#expanded-timeline .bubble-card")')
                if mode=='primaryOnly':
                    assert js('return document.querySelector("#expanded-content h3").textContent.includes("君主")')
                else:
                    assert js('return document.querySelector("#expanded-timeline select").options.length===2')
                    js("const select=document.querySelector('#expanded-timeline select');select.selectedIndex=1;select.dispatchEvent(new Event('change'));")
                    assert js('return document.querySelector("#expanded-timeline .timeline-name").getAttribute("href")==="#/hf/2"')
                screenshot('timeline-'+mode)
                js("document.querySelector('[data-action=close-expanded]').click()")
                wait('return !document.querySelector("#expanded-dialog").open')
            js("document.querySelector('[data-expand-warfare]').click()")
            wait('return document.querySelector("#expanded-dialog").open&&document.querySelectorAll("#expanded-warfare canvas").length===3')
            assert js('return __warfare.cy.edges().length===1&&getComputedStyle(document.querySelector("#expanded-warfare")).height==="780px"')
            screenshot('warfare-fullscreen')
            js("window.__closedWarfare=__warfare.cy;__warfare.cy.edges()[0].emit('tap')")
            wait('return LegendsApp.state.route==="wars"&&LegendsApp.state.recordId===1&&!document.querySelector("#expanded-dialog").open')
            wait('return __closedWarfare.destroyed()')
            wait('return LegendsApp.state.detailModel?.warfare?.edges.length===1&&!document.querySelector(".loading")')
            screenshot('war-desktop')
            js("document.querySelector('[data-expand-warfare]').click()")
            wait('return document.querySelector("#expanded-dialog").open&&document.querySelectorAll("#expanded-warfare canvas").length===3')
            assert js("return __warfare.cy.edges()[0].data('kind')==='battles'")
            js("__warfare.cy.edges()[0].emit('tap')")
            wait('return LegendsApp.state.route==="battles"&&LegendsApp.state.recordId===2&&!document.querySelector(".loading")')
            screenshot('battle-desktop')
            assert js('return !!document.querySelector("#detail-deaths")')
            before=js('return LegendsApp.state.charts.find(chart=>chart.canvas.id==="detail-deaths").data.datasets[0].data.reduce((a,b)=>a+b,0)')
            assert before==23,before
            js('location.hash="/world"');wait('return !!document.querySelector("#chart-events")')
            overview_translation=js('''const labels=LegendsApp.state.charts.filter(chart=>['population-chart','area-chart'].includes(chart.canvas.id)).map(chart=>({id:chart.canvas.id,labels:chart.data.labels}));return{labels,text:document.querySelector('.civilization-grid').textContent};''')
            assert {entry['id'] for entry in overview_translation['labels']}=={'population-chart','area-chart'},overview_translation
            assert all(not any(raw in label for raw in ['DWARF','Mountains']) for entry in overview_translation['labels'] for label in entry['labels']),overview_translation
            assert 'DWARF' not in overview_translation['text'] and 'GOBLIN' not in overview_translation['text'],overview_translation
            print(json.dumps({'overviewTranslation':overview_translation},ensure_ascii=False),flush=True)
            screenshot('world-desktop')
            js("document.querySelector('[data-expand-events]').click()")
            wait('return document.querySelector("#expanded-dialog").open&&!!document.querySelector("[data-event-type]")')
            assert js('return Chart.getChart(document.querySelector("#expanded-event-chart")).options.indexAxis==="y"')
            js("const input=document.querySelector('[data-event-type]');input.click();")
            assert js('return LegendsApp.state.excludedEventTypes.size===1')
            assert js('return Chart.getChart(document.querySelector("#expanded-event-chart")).data.datasets[0].backgroundColor.includes("rgba(120,120,120,0.2)")')
            screenshot('events-fullscreen')
            js("document.querySelector('[data-action=close-expanded]').click()")
            wait('return !document.querySelector("#expanded-dialog").open')
            js('location.hash="/map"')
            wait('return LegendsApp.state.route==="map"&&!!LegendsApp.state.map&&!!document.querySelector(".leaflet-control-layers-toggle")')
            js("const control=document.querySelector('.leaflet-control-layers');control.dispatchEvent(new MouseEvent('mouseenter'));document.querySelector('.leaflet-control-layers-toggle').click();")
            wait("return [...document.querySelectorAll('[data-map-owner-link]')].length===2&&[...document.querySelectorAll('[data-map-owner-link]')].every(link=>/[\\u3400-\\u9fff]/.test(link.textContent)&&link.textContent!=='…')")
            map_translation=js('''const world=LegendsApp.state.world,map=LegendsApp.state.map.map;return{height:getComputedStyle(document.querySelector('.lm-map')).height,minZoom:map.getMinZoom(),maxZoom:map.getMaxZoom(),simpleCRS:map.options.crs===L.CRS.Simple,owners:[...document.querySelectorAll('[data-map-owner]')].map(row=>{const id=Number(row.querySelector('a').dataset.mapOwnerLink),color=document.createElement('span');color.style.backgroundColor=LegendsMap.entityColor(world.entities.find(entity=>Number(entity.id)===id),world,1);return{id,name:row.querySelector('a').textContent,href:row.querySelector('a').getAttribute('href'),chip:row.querySelector('.v-chip')?.textContent,color:row.querySelector('.v-chip')?.style.backgroundColor,checked:row.closest('label').querySelector('input').checked,expectedColor:color.style.backgroundColor};})};''')
            assert map_translation['height']=='880px' and map_translation['minZoom']==-2 and map_translation['maxZoom']==2 and map_translation['simpleCRS'],map_translation
            assert all(owner['chip'] and owner['color']==owner['expectedColor'] and owner['checked'] and owner['href']=='#/entity/'+str(owner['id']) for owner in map_translation['owners']),map_translation
            assert all(raw not in owner['name'] for owner in map_translation['owners'] for raw in ['The Copper Spears','The Silver Axes']),map_translation
            screenshot('map-layers-translated')
            js("document.querySelector('.leaflet-control-custom a:last-child').click()")
            assert js("return [...document.querySelectorAll('.leaflet-control-layers-overlays input')].every(input=>!input.checked)")
            js("document.querySelector('.leaflet-control-custom a:first-child').click()")
            assert js("return [...document.querySelectorAll('.leaflet-control-layers-overlays input')].every(input=>input.checked)&&[...document.querySelectorAll('[data-map-owner-link]')].every(link=>/[\\u3400-\\u9fff]/.test(link.textContent))")
            js("document.querySelector('[data-map-owner-link=\"1\"]').click()")
            wait('return LegendsApp.state.route==="entities"&&LegendsApp.state.recordId===1&&LegendsApp.state.detailModel?.record.id===1&&!document.querySelector(".loading")')
            js('location.hash="/map?type=site&id=1"')
            wait('return !!document.querySelector(".leaflet-popup-content .site-picker")')
            map_translation['popup']=js("return document.querySelector('.leaflet-popup-content').textContent")
            assert all(raw not in map_translation['popup'] for raw in ['Boatmurdered','The Copper Spears','fortress']),map_translation
            assert '要塞' in map_translation['popup'],map_translation
            screenshot('map-site-popup-translated')
            print(json.dumps({'mapTranslation':map_translation},ensure_ascii=False),flush=True)
            js('location.hash="/map?type=war&id=1"')
            wait('return !!document.querySelector(".target-highlight-pulse")')
            assert js('return !!document.querySelector(".war-arrow-head")&&!!document.querySelector(".battle-marker-icon")')
            screenshot('map-war-focus')
            for _ in range(3):
                js('location.hash="/map?type=site&id=1"')
                wait('return !!document.querySelector(".leaflet-popup-content .site-picker")')
                time.sleep(.1)
                js('location.hash="/world"')
                wait('return LegendsApp.state.route==="overview"&&!!document.querySelector("#chart-events")')
                time.sleep(.3)
            command('/window/rect', {'width':390,'height':844})
            detail('figures',1);screenshot('figure-mobile')
            assert js('return document.documentElement.scrollWidth<=window.innerWidth+1')
            print(json.dumps({'components':'family, entity-war, war-battle, both timeline fullscreen, event bar/filter, map focus, mobile overflow passed'},ensure_ascii=False),flush=True)
        errors = command('/log', {'type': 'browser'})
        page_errors=js('return window.__pageRegressionErrors')
        assert not page_errors,page_errors
        assert not [error for error in errors if error['level'] == 'SEVERE'], errors
        print(json.dumps({'passed': len(report), 'console': errors}, ensure_ascii=False), flush=True)
    finally:
        if session:
            try:
                command('', method='DELETE')
            except Exception:
                pass
        driver.terminate()
