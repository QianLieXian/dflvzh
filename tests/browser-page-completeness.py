#!/usr/bin/env python3
"""Native table references, shrinking pages and retained-summary completeness.

Uses ordinary file://, real small generated XML, 885 explicit figure relations,
and a temporary Chromium profile. No application server or Node is used.
"""
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
ELEMENT='element-6066-11e4-a52e-4f735466cecf'
enemies=''.join(f'<hf_link><hfid>{number}</hfid><link_type>enemy</link_type></hf_link>'for number in range(1000,1885))
figures=f'<historical_figure><id>1</id><name>Urist Copperhammer</name><race>DWARF</race><birth_year>1</birth_year><death_year>-1</death_year>{enemies}</historical_figure><historical_figure><id>2</id><name>Domas Silverspear</name><race>ELF</race></historical_figure>'+''.join(f'<historical_figure><id>{number}</id><name>Enemy Copperhammer</name><race>DWARF</race></historical_figure>'for number in range(1000,1885))
events=''.join(f'<historical_event><id>{number}</id><year>{number}</year><type>'+('hf travel</type><group_hfid>2</group_hfid>'if number<25 else'hf died</type><hfid>2</hfid><slayer_hf>1</slayer_hf>')+'</historical_event>'for number in range(30))
XML='<df_world><name>The Golden World</name><year>200</year><width>4</width><height>4</height><historical_figures>'+figures+'</historical_figures><entities><entity><id>1</id><name>The Copper Spears</name><type>civilization</type><race>DWARF</race></entity><entity><id>2</id><name>The Silver Axes</name><type>civilization</type><race>ELF</race></entity><entity><id>3</id><name>The Copper Spears</name><type>sitegovernment</type><entity_link><type>PARENT</type><target>1</target></entity_link></entity></entities><sites><site><id>1</id><name>The Golden Mountain</name><type>fortress</type><coords>0,0</coords><region_id>1</region_id><cur_owner_id>1</cur_owner_id><civ_id>1</civ_id></site><site><id>2</id><name>The Silver Mountain</name><type>forestretreat</type><coords>1,1</coords><region_id>2</region_id><cur_owner_id>2</cur_owner_id><civ_id>2</civ_id></site></sites><regions><region><id>1</id><name>The Golden Forest</name><type>Forest</type><coords>0,0</coords></region><region><id>2</id><name>The Silver Desert</name><type>Desert</type><coords>1,1</coords></region></regions><entity_populations><entity_population><id>1</id><civ_id>1</civ_id><race>DWARF:100</race></entity_population><entity_population><id>2</id><civ_id>2</civ_id><race>ELF:200</race></entity_population></entity_populations><historical_events>'+events+'</historical_events><historical_event_collections><historical_event_collection><id>1</id><name>The Battle of Gold</name><type>battle</type><start_year>100</start_year><end_year>100</end_year><attacking_enid>1</attacking_enid><defending_enid>2</defending_enid><site_id>1</site_id>'+''.join(f'<attacking_hfid>{number}</attacking_hfid>'for number in range(1000,1885))+'</historical_event_collection><historical_event_collection><id>2</id><type>journey</type><ordinal>1</ordinal><hfid>1</hfid><site_id>2</site_id><start_year>100</start_year><end_year>101</end_year></historical_event_collection></historical_event_collections><written_contents><written_content><id>1</id><title>The Golden Book</title><type>essay</type><author>1</author></written_content></written_contents></df_world>'

XML=XML.replace('</df_world>','<mountain_peaks><mountain_peak><id>1</id><name>The Golden Peak</name><height>10</height></mountain_peak><mountain_peak><id>3</id><name>The Silver Peak</name><height>30</height></mountain_peak><mountain_peak><id>7</id><name>The Copper Peak</name><height>20</height></mountain_peak></mountain_peaks></df_world>')
XML=XML.replace('</historical_events>',''.join(f'<historical_event><id>{number}</id><year>{number-100}</year><type>hf travel</type><group_hfid>1</group_hfid></historical_event>'for number in range(100,130))+'</historical_events>')
XML=XML.replace('</historical_event_collections>',''.join(f'<historical_event_collection><id>{number}</id><type>duel</type><start_year>{number-100}</start_year><end_year>{number-100}</end_year><attacking_hfid>1</attacking_hfid><defending_hfid>2</defending_hfid></historical_event_collection>'for number in range(100,155))+'</historical_event_collections>')
XML=XML.replace('</df_world>','<musical_forms><musical_form><id>1</id><description>The Aquamarine Sheens is a form of music.  [B]First technique.  [B]Second technique.  &lt;img src=x onerror=alert(1)&gt;'+(' Full description.'*300)+'</description></musical_form></musical_forms></df_world>')

with tempfile.TemporaryDirectory(prefix='legends-page-completeness-')as temporary:
    temporary=Path(temporary);original=temporary/'same-legends.xml';original.write_text(XML,encoding='utf-8')
    with socket.socket()as listener:listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
    endpoint=f'http://127.0.0.1:{port}';log=(temporary/'driver.log').open('w');session=None;checks=0
    driver=subprocess.Popen([shutil.which('chromedriver'),f'--port={port}'],stdout=log,stderr=subprocess.STDOUT)
    def check(condition,message):
        global checks
        assert condition,message
        checks+=1
    def request(method,path,data=None):
        req=urllib.request.Request(endpoint+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'},method=method)
        try:
            with urllib.request.urlopen(req,timeout=90)as response:value=json.load(response)['value']
        except urllib.error.HTTPError as error:raise RuntimeError(error.read().decode())from error
        if isinstance(value,dict)and value.get('error')and 'stacktrace'in value:raise RuntimeError(value)
        return value
    def command(path,data=None,method='POST'):return request(method,'/session/'+session+path,data)
    def js(script,*values):return command('/execute/sync',{'script':script,'args':list(values)})
    def async_js(script):
        result=command('/execute/async',{'script':'const done=arguments[arguments.length-1];(async()=>{'+script+'})().then(done,error=>done({error:String(error),stack:error.stack}));','args':[]})
        assert not isinstance(result,dict)or not result.get('error'),result
        return result
    def wait(script):
        deadline=time.monotonic()+40
        while time.monotonic()<deadline:
            result=js(script)
            if result:return result
            time.sleep(.025)
        raise AssertionError({'timeout':script,'state':js('return {route:location.hash,text:document.querySelector("#main").textContent,logs:window.__pageProbe}')})
    def route(path,kind):
        js('location.hash=arguments[0]',path)
        wait('return LegendsApp.state.route==='+json.dumps(kind)+'&&!document.querySelector("#main [aria-busy=true]")&&!!document.querySelector("[data-table=list] tbody a")')
    try:
        for _ in range(100):
            try:request('GET','/status');break
            except OSError:time.sleep(.05)
        session=request('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'binary':shutil.which('chromium'),'args':['--headless','--no-sandbox','--disable-gpu','--window-size=1512,1100','--user-data-dir='+str(temporary/'profile')]},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
        command('/timeouts',{'script':90000,'pageLoad':30000});command('/url',{'url':(ROOT/'index.html').as_uri()});wait('return !!window.LegendsApp&&!document.querySelector("#main .loading")')
        js('window.__nativeData=LegendsData;window.LegendsData={...LegendsData,parseFiles:(files,progress,options)=>__nativeData.parseFiles(files,progress,{...options,storage:"disk"})};LegendsApp.showImport();')
        element=command('/element',{'using':'css selector','value':'#file-input'})[ELEMENT];command('/element/'+element+'/value',{'text':str(original)});js('document.querySelector("#start-import").click()')
        wait('return !!LegendsApp.state.world?.disk?.sourcesPersisted&&!LegendsApp.state.pendingSaves?.size&&!LegendsApp.state.importing&&!document.querySelector("#main [aria-busy=true]")')
        js('''window.__pageProbe={phase:'list',prefetch:[],queries:[],fullReads:[]};const p=__pageProbe,local=LegendsLocalStore;window.LegendsLocalStore={...local,prefetchRefs(world,rows,options={}){p.prefetch.push({phase:p.phase,references:options.references||null,rows:rows.length});return local.prefetchRefs(world,rows,options)},query(world,kind,options={}){p.queries.push({kind,headersOnly:options.headersOnly===true});return local.query(world,kind,options)},getRecord(world,kind,id,options){p.fullReads.push({phase:p.phase,kind,id});return local.getRecord(world,kind,id,options)}};''')
        route('/hf','figures')
        figure_list=js('return {rows:document.querySelector("[data-table=list] tbody").rows.length,logs:__pageProbe,headerOnly:LegendsApp.state.diskPages.get("figures").rows.find(row=>row.id===1)?.__headerOnly===true}')
        check(figure_list['rows']==10 and figure_list['headerOnly'],{'rows':figure_list['rows']})
        check(not figure_list['logs']['prefetch']and figure_list['logs']['queries'][-1]['headersOnly'],'Figure table should not prefetch 885 enemies or parse source records: '+str(figure_list['logs']))
        js('__pageProbe.phase="detail";LegendsApp.openRecord("figures",1)')
        wait('return LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("#main .loading")')
        relationships=js('const section=[...document.querySelectorAll("#main .section-card")].find(section=>section.querySelector("h3")?.textContent==="亲密关系");return {model:LegendsApp.state.detailModel.before.find(card=>card.title==="亲密关系")?.items.length,dom:section?.querySelectorAll(".related-list-item").length,first:section?.querySelector("a")?.textContent,last:[...section?.querySelectorAll("a")||[]].at(-1)?.textContent}')
        check(relationships['model']==885 and relationships['dom']==885 and relationships['first']and relationships['last'],relationships)
        js('document.querySelector("[data-expand-events=object-events]").click();document.querySelector("[data-event-type=\\"hf died\\"]").click()')
        wait('return LegendsApp.state.tableSources.get("object-events").total===30&&!document.querySelector("[data-table=object-events][aria-busy=true]")')
        js('document.querySelector("#expanded-dialog [data-action=close-expanded]").click();const select=document.querySelector("[data-page-size=object-chronicles]");select.value="25";select.dispatchEvent(new Event("change",{bubbles:true}))')
        wait('return document.querySelector("[data-table=object-chronicles] tbody").rows.length===25&&!document.querySelector("[data-table=object-chronicles][aria-busy=true]")')
        js('document.querySelector("[data-page-table=object-chronicles][aria-label=下一页]").click();document.querySelector("[data-page-table=object-events][aria-label=下一页]").click()')
        wait('return LegendsApp.state.tables.get("object-chronicles").page===2&&LegendsApp.state.tables.get("object-events").page===2&&!document.querySelector("#main [aria-busy=true]")')
        js('document.querySelector("[data-clear-event-filters=object-events]").click()')
        wait('return LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("#main .loading")')
        detail_pages=js('return Object.fromEntries(["object-events","object-chronicles"].map(id=>{const host=document.querySelector(`[data-table="${id}"]`),settings=LegendsApp.state.tables.get(id);return [id,{page:settings.page,size:settings.pageSize,rows:host.querySelector("tbody").rows.length,range:host.querySelector(".pagination").textContent,ids:LegendsApp.state.tableSources.get(id).rows.map(row=>row.id)}]}))')
        check(detail_pages['object-events']['page']==2 and detail_pages['object-events']['rows']==10 and detail_pages['object-events']['ids']==list(range(110,120)),detail_pages)
        check(detail_pages['object-chronicles']['page']==2 and detail_pages['object-chronicles']['size']==25 and detail_pages['object-chronicles']['rows']==25 and detail_pages['object-chronicles']['ids']==list(range(125,150)),detail_pages)
        js('LegendsApp.state.tables.get("object-events").page=99;LegendsApp.state.tables.get("object-chronicles").page=99;dispatchEvent(new HashChangeEvent("hashchange"))')
        wait('return LegendsApp.state.detailModel?.record.id===1&&!document.querySelector("#main .loading")')
        shrunk_detail=js('return Object.fromEntries(["object-events","object-chronicles"].map(id=>[id,{page:LegendsApp.state.tables.get(id).page,ids:LegendsApp.state.tableSources.get(id).rows.map(row=>row.id),rows:document.querySelector(`[data-table="${id}"] tbody`).rows.length}]))')
        check(shrunk_detail['object-events']['page']==4 and shrunk_detail['object-events']['rows']==5 and shrunk_detail['object-chronicles']['page']==3 and shrunk_detail['object-chronicles']['ids']==list(range(150,155)),shrunk_detail)
        js('__pageProbe.phase="collections";__pageProbe.prefetch=[]')
        route('/battle','battles')
        battle_refs=js('return __pageProbe.prefetch.flatMap(row=>row.references||[])')
        check(all(ref['kind']!='figures'for ref in battle_refs),battle_refs)
        check({ref['id']for ref in battle_refs if ref['kind']=='entities'}=={1,2},battle_refs)
        route('/journey','journeys')
        journey=js('return {refs:__pageProbe.prefetch.flatMap(row=>row.references||[]),text:document.querySelector("[data-table=list] tbody").textContent,targets:[...document.querySelectorAll("[data-table=list] tbody [data-object-kind]")].map(el=>({kind:el.dataset.objectKind,id:Number(el.dataset.objectId),name:el.querySelector("a")?.textContent}))}')
        check(any(ref['kind']=='figures'and ref['id']==1 for ref in journey['refs'])and any(ref['kind']=='sites'and ref['id']==2 for ref in journey['refs']),journey)
        check(all(target.get('name')and not target['name'].startswith('#')for target in journey['targets']),journey)
        js('__pageProbe.phase="sites";__pageProbe.prefetch=[];LegendsApp.state.indexes.regions.clear()')
        route('/site','sites')
        sites=js('return {refs:__pageProbe.prefetch.flatMap(row=>row.references||[]),regions:[...document.querySelectorAll("[data-table=list] tbody tr")].map(row=>row.cells[3].textContent)}')
        check({ref['id']for ref in sites['refs']if ref['kind']=='regions'}=={1,2}and all(value!='-'for value in sites['regions']),sites)
        js('__pageProbe.phase="peaks";LegendsApp.state.world.mountainpeaks=[];LegendsApp.state.world.extra.mountain_peaks=[];LegendsApp.state.indexes.mountainpeaks.clear()')
        route('/mountainpeak','mountainpeaks')
        peaks=js('return {count:LegendsApp.state.world.mountainpeaks.length,ranks:[...document.querySelectorAll("[data-table=list] tbody tr")].map(row=>({id:Number(row.cells[0].textContent),rank:Number(row.cells[4].textContent)}))}')
        check(peaks['count']==3 and {row['id']:row['rank']for row in peaks['ranks']}=={1:3,3:1,7:2},peaks)
        route('/musicalform','musicalforms')
        art_list=js('const row=LegendsApp.state.diskPages.get("musicalforms").rows[0];return {name:row.name,type:row.type,headerOnly:row.__headerOnly===true,rawName:row.raw.name??null,rawDescription:row.raw.description,visible:document.querySelector("[data-table=list] tbody").textContent}')
        check(art_list['name']=='The Aquamarine Sheens'and art_list['type']=='Musical'and not art_list['headerOnly']and art_list['rawName']is None and art_list['rawDescription'].startswith('The Aquamarine Sheens is a '),art_list)
        js('LegendsApp.openRecord("musicalforms",1)');wait('return LegendsApp.state.detailModel?.kind==="musicalforms"&&!document.querySelector("#main .loading")')
        description=js('const element=document.querySelector(".description-content"),section=element.closest(".section-card"),prose=LegendsApp.state.detailModel.before.find(card=>card.description).description;return {title:section.querySelector("h3")?.textContent,subtitle:section.querySelector(".section-heading p")?.textContent,bullets:element.querySelectorAll("li").length,breaks:element.querySelectorAll("br").length,hasImage:!!element.querySelector("img"),complete:element.textContent===prose.replace(/ {2}/g,"").replace(/\\[B\\]/g,""),maxHeight:getComputedStyle(element).maxHeight,scrollable:element.scrollHeight>element.clientHeight}')
        check(description['title']=='描述'and description['subtitle']and description['bullets']==2 and description['breaks']>=3 and not description['hasImage']and description['maxHeight']=='300px'and description['scrollable']and description['complete'],description)
        art_names=js('return [{description:"The Amber Dances is a group celebration dance."},{name:"THE GOLDEN DANCES",description:"The Silver Dances is a group dance."},{description:"This export has no naming sentence."}].map((row,id)=>{const value=LegendsData.normalizeRecord({...row,id},"dance_forms",id);return {name:value.name,type:value.type,raw:value.raw}})')
        check([row['name']for row in art_names]==['The Amber Dances','The Golden Dances','Untitled']and all(row['type']=='Dance'for row in art_names)and art_names[1]['raw']['name']=='THE GOLDEN DANCES',art_names)
        js('__pageProbe.phase="overview"')
        truncated=async_js('''const source=await LegendsLocalStore.getWorld(LegendsApp.state.world.id);source.entities=source.entities.slice(0,1);source.sites=source.sites.slice(0,1);source.regions=source.regions.slice(0,1);source.extra.entity_populations=source.extra.entity_populations.slice(0,1);if(source.entity_populations)source.entity_populations=source.extra.entity_populations;await LegendsApp.setWorld(source,{navigate:true});return true;''')
        check(truncated,'Install a saved-world model with counts larger than its retained summaries')
        wait('return LegendsApp.state.route==="overview"&&document.querySelectorAll("[data-civilization]").length===2&&!document.querySelector("#main [aria-busy=true]")')
        overview=js('const s=LegendsApp.state;return {entities:s.world.entities.length,sites:s.world.sites.length,regions:s.world.regions.length,populations:s.world.extra.entity_populations.length,civilizations:[...document.querySelectorAll("[data-civilization]")].map(el=>Number(el.dataset.civilization)),baseSites:s.diskBaseIndexes.get("sites").size,indexSites:s.indexes.sites.size,separate:s.diskBaseIndexes.get("sites")!==s.indexes.sites,siteGroups:[...s.sitesByCivilization].map(([id,rows])=>({id,sites:rows.map(row=>row.id)})),populationChart:!!document.querySelector("#population-chart"),areaChart:!!document.querySelector("#area-chart")}')
        check(overview['entities']==3 and overview['sites']==2 and overview['regions']==2 and overview['populations']==2,overview)
        check(set(overview['civilizations'])=={1,2}and overview['populationChart']and overview['areaChart'],overview)
        check(overview['baseSites']==2 and overview['indexSites']==2 and overview['separate']and len(overview['siteGroups'])==2,overview)
        js('document.querySelector("[data-page-table=events][aria-label=末页]").click()')
        wait('return LegendsApp.state.tables.get("events").page===Math.ceil(LegendsApp.state.tableSources.get("events").total/10)&&!document.querySelector("[data-table=events][aria-busy=true]")')
        js('document.querySelector("[data-expand-events=events]").click();document.querySelectorAll("[data-event-type]").forEach(input=>{if(input.dataset.eventType!=="hf died"&&input.checked)input.click()})')
        wait('return LegendsApp.state.excludedEventTypes.has("hf travel")&&!document.querySelector("[data-table=events][aria-busy=true]")')
        pagination=js('const host=document.querySelector("[data-table=events]");return {page:LegendsApp.state.tables.get("events").page,rows:host.querySelector("tbody").rows.length,empty:!!host.querySelector(".no-data"),range:host.querySelector(".pagination").textContent,total:LegendsApp.state.tableSources.get("events").total}')
        check(pagination['page']==1 and pagination['rows']==5 and pagination['total']==5 and not pagination['empty'],pagination)
        errors=[entry for entry in command('/log',{'type':'browser'})if entry.get('level')=='SEVERE'];check(not errors,errors)
        print(json.dumps({'ok':True,'checks':checks,'sourceBytes':original.stat().st_size,'figureList':figure_list['logs'],'relationships':relationships,'battleReferences':battle_refs,'journey':journey,'overview':overview,'sites':sites,'pagination':pagination,'browserErrors':errors},ensure_ascii=False,indent=2))
    finally:
        if session:
            try:command('',method='DELETE')
            except Exception:pass
        driver.terminate();driver.wait(timeout=10);log.close()
