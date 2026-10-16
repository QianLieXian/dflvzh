/* Add explicit ownership history to the upstream base/Plus test world so both
 * World.vue civilization columns and all four DTO chips can be seen together.
 * Test data only; this file is never loaded by the application. */
window.installCompleteOverviewFixture=async function () {
  const world=structuredClone(LegendsApp.state.world);
  if(!world||world.disk)throw new Error('Load the small upstream base/Plus fixture first.');
  world.id='overview-source-complete-fixture';
  const base=world.entities.find(entity=>entity.id===10);
  if(!base)throw new Error('Expected upstream fixture civilization #10.');
  world.entities.push(
    {id:9000,name:'The Lost Spears',type:'civilization',race:'human',entity_position:{id:0,name:'monarch',name_male:'king',name_female:'queen'},entity_position_assignment:{id:0,position_id:0,histfig:9000}},
    {id:9002,name:'The Ruin Government',type:'site government',entity_link:{type:'PARENT',target:9000}},
    {id:9003,name:'The Old Outpost Government',type:'site government',entity_link:{type:'PARENT',target:10}}
  );
  world.figures.push({id:9000,name:'Urist Goldhammer',race:'human',caste:'Male',birth_year:-20,death_year:-1,ent_pop_id:9000});
  world.extra.entity_populations.push({id:9000,civ_id:9000,race:'human:40'});
  world.sites.push(
    {id:9000,name:'The Lost Stronghold',type:'town',coords:'14,14',cur_owner_id:-1,civ_id:9000},
    {id:9001,name:'The Old Outpost',type:'fortress',coords:'7,8',cur_owner_id:-1,civ_id:10}
  );
  world.events.push(
    {id:90000,type:'created site',year:1,site_id:9000,civ_id:9000,site_civ_id:9002},
    {id:90001,type:'site abandoned',year:3,site_id:9000,site_civ_id:9002},
    {id:90002,type:'created site',year:1,site_id:9001,civ_id:10,site_civ_id:9003},
    {id:90003,type:'site abandoned',year:3,site_id:9001,site_civ_id:9003}
  );
  delete world.aggregates;
  LegendsData.normalizeWorld(world);
  await LegendsApp.setWorld(world,{navigate:true});
  return true;
};
