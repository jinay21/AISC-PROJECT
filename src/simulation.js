/* Shared movement rules: both schedulers use exactly the same simulation. */
const Simulation = (() => {
  const create = () => ({time:0, elevators:[0,4,9].map((floor,i)=>({id:`E${i+1}`,floor,direction:0,lastDirection:0,load:0,distance:0,turns:0,stops:[]})),requests:[],decision:null});
  const clone = s => JSON.parse(JSON.stringify(s));
  function add(s,from,to){
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>9||to<0||from>9||from===to) throw Error('Choose two different floors between Ground and 9.');
    s.requests.push({id:`P${s.requests.length+1}`,from,to,direction:Math.sign(to-from),created:s.time,picked:null,completed:null,assigned:null});
  }
  function targets(s,i){return s.requests.filter(p=>p.assigned===i&&p.completed===null).map(p=>p.picked===null?p.from:p.to);}
  function service(s,i){
    const e=s.elevators[i];
    for(const p of s.requests) if(p.assigned===i&&p.picked!==null&&p.completed===null&&p.to===e.floor){p.completed=s.time;e.load--;}
    for(const p of s.requests) if(p.assigned===i&&p.picked===null&&p.from===e.floor&&(e.load===0||e.direction===p.direction)) {if(e.load===0)e.direction=p.direction;p.picked=s.time;e.load++;}
  }
  function tick(s){
    for(let i=0;i<3;i++) service(s,i);
    for(let i=0;i<3;i++){
      const e=s.elevators[i];
      const active=s.requests.filter(p=>p.assigned===i&&p.completed===null);
      // Deliver onboard passengers first; collect compatible passengers en route.
      const onboard=active.filter(p=>p.picked!==null);
      const floors=(onboard.length?onboard:active).map(p=>p.picked===null?p.from:p.to).filter(f=>f!==e.floor);
      let forward=floors.filter(f=>Math.sign(f-e.floor)===e.direction);
      const choices=forward.length?forward:floors;
      const target=choices.sort((a,b)=>Math.abs(a-e.floor)-Math.abs(b-e.floor))[0];
      const direction=target===undefined?0:Math.sign(target-e.floor);
      if(direction){if(e.lastDirection&&direction!==e.lastDirection)e.turns++;e.lastDirection=direction;e.floor+=direction;e.distance++;}
      e.direction=direction;
    }
    s.time++;
    for(let i=0;i<3;i++){service(s,i);s.elevators[i].stops=[...new Set(targets(s,i))];if(!s.elevators[i].stops.length)s.elevators[i].direction=0;}
  }
  function metrics(s){const picked=s.requests.filter(p=>p.picked!==null);return {wait:picked.length?picked.reduce((a,p)=>a+p.picked-p.created,0)/picked.length:0,distance:s.elevators.reduce((a,e)=>a+e.distance,0),turns:s.elevators.reduce((a,e)=>a+e.turns,0),completed:s.requests.filter(p=>p.completed!==null).length,picked:picked.length};}
  return {create,clone,add,tick,metrics};
})();
