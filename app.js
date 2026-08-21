const STORAGE_KEY = 'make-a-scene-event-studio-v1';
const defaults = {
  theme: 'night', eventName: 'Community Play Night', eventDate: '2026-09-12', eventVenue: 'Saturday Night Venue',
  modelType: 'PER_PERSON', ratePerHead: 35, minPax: 50, flatFee: 1500, percentage: 30,
  tickets: [
    {name:'Early Bird Single',price:60,guests:1,sold:20},
    {name:'Final Run Single',price:80,guests:1,sold:25},
    {name:'Couples Pass',price:160,guests:2,sold:10}
  ],
  expenses: [
    {name:'Door & host staff',date:'2026-09-12',amount:0},
    {name:'Sound & DJ equipment',date:'2026-09-05',amount:0},
    {name:'Theme decor & supplies',date:'2026-08-28',amount:0}
  ],
  deposits: [
    {name:'Date lock-in deposit',date:'2026-07-20',amount:500},
    {name:'Pre-event milestone',date:'2026-09-05',amount:500}
  ]
};
let state = load();
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD',maximumFractionDigits:0}).format(Number(value)||0);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const num = value => Math.max(0, Number(value)||0);

function load(){try{return {...structuredClone(defaults),...JSON.parse(localStorage.getItem(STORAGE_KEY))}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));$('saveState').innerHTML='<span></span> Saved in this browser'}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}

function venueFeeFor(attendees,gross){
  if(state.modelType==='PER_PERSON')return Math.max(num(state.ratePerHead)*num(state.minPax),attendees*num(state.ratePerHead));
  if(state.modelType==='FLAT_FEE')return num(state.flatFee);
  if(state.modelType==='PERCENTAGE_SHARE')return gross*(num(state.percentage)/100);
  if(state.modelType==='HYBRID')return num(state.flatFee)+attendees*num(state.ratePerHead);
  return 0;
}

function breakEvenForTicketMix(expenses){
  const soldTickets=state.tickets.reduce((sum,t)=>sum+num(t.sold),0);
  const soldRevenue=state.tickets.reduce((sum,t)=>sum+num(t.sold)*num(t.price),0);
  const soldGuests=state.tickets.reduce((sum,t)=>sum+num(t.sold)*Math.max(1,num(t.guests)),0);
  const pricedOptions=state.tickets.filter(t=>num(t.price)>0);
  let averagePrice=0,averageGuests=1,basis='equal blend of ticket tiers';
  if(soldTickets>0&&soldRevenue>0){
    averagePrice=soldRevenue/soldTickets;averageGuests=soldGuests/soldTickets;basis='current sales mix';
  }else if(pricedOptions.length){
    averagePrice=pricedOptions.reduce((sum,t)=>sum+num(t.price),0)/pricedOptions.length;
    averageGuests=pricedOptions.reduce((sum,t)=>sum+Math.max(1,num(t.guests)),0)/pricedOptions.length;
  }
  if(averagePrice<=0)return {target:null,soldTickets,remaining:null,averagePrice,averageGuests,basis};
  let target=null;
  for(let tickets=0;tickets<=100000;tickets++){
    const projectedGross=tickets*averagePrice;
    const projectedAttendees=tickets*averageGuests;
    if(projectedGross>=venueFeeFor(projectedAttendees,projectedGross)+expenses){target=tickets;break}
  }
  return {target,soldTickets,remaining:target===null?null:Math.max(0,target-soldTickets),averagePrice,averageGuests,basis};
}

function calculations(){
  const attendees=state.tickets.reduce((s,t)=>s+num(t.sold)*Math.max(1,num(t.guests)),0);
  const gross=state.tickets.reduce((s,t)=>s+num(t.sold)*num(t.price),0);
  const expenses=state.expenses.reduce((s,e)=>s+num(e.amount),0);
  const deposits=state.deposits.reduce((s,d)=>s+num(d.amount),0);
  let minimum=0;
  if(state.modelType==='PER_PERSON')minimum=num(state.ratePerHead)*num(state.minPax);
  if(state.modelType==='FLAT_FEE'||state.modelType==='HYBRID')minimum=num(state.flatFee);
  const venue=venueFeeFor(attendees,gross);
  const profit=gross-venue-expenses,day=Math.max(0,venue-deposits),margin=gross?profit/gross*100:0;
  const breakEven=breakEvenForTicketMix(expenses);
  return {attendees,gross,expenses,deposits,minimum,venue,profit,day,margin,breakEven};
}

function renderRows(type){
  const list=$(type+'List');
  const rows=state[type];
  list.innerHTML=rows.map((row,index)=>type==='tickets'?`
    <div class="data-row"><label>Tier name<input data-type="${type}" data-index="${index}" data-key="name" value="${escapeHtml(row.name)}"></label><label>Price<input type="number" min="0" data-type="${type}" data-index="${index}" data-key="price" value="${num(row.price)}"></label><label>Guests<input type="number" min="1" data-type="${type}" data-index="${index}" data-key="guests" value="${num(row.guests)}"></label><label>Sold<input type="number" min="0" data-type="${type}" data-index="${index}" data-key="sold" value="${num(row.sold)}"></label><button class="remove no-print" type="button" data-remove="${type}" data-index="${index}" aria-label="Remove ${escapeHtml(row.name)}">×</button></div>`:`
    <div class="data-row expense"><label>Description<input data-type="${type}" data-index="${index}" data-key="name" value="${escapeHtml(row.name)}"></label><label>Due date<input type="date" data-type="${type}" data-index="${index}" data-key="date" value="${escapeHtml(row.date)}"></label><label>Amount<input type="number" min="0" data-type="${type}" data-index="${index}" data-key="amount" value="${num(row.amount)}"></label><button class="remove no-print" type="button" data-remove="${type}" data-index="${index}" aria-label="Remove ${escapeHtml(row.name)}">×</button></div>`).join('');
}

function updateVisibility(){
  const type=state.modelType;
  document.querySelector('[data-field="perHead"]').hidden=type==='FLAT_FEE'||type==='PERCENTAGE_SHARE';
  document.querySelector('[data-field="minPax"]').hidden=type!=='PER_PERSON';
  document.querySelector('[data-field="flatFee"]').hidden=type==='PER_PERSON'||type==='PERCENTAGE_SHARE';
  document.querySelector('[data-field="percentage"]').hidden=type!=='PERCENTAGE_SHARE';
}

function renderSummary(){
  const c=calculations();
  $('grossSales').textContent=money(c.gross);$('attendees').textContent=`${c.attendees} attendees`;
  $('venueFee').textContent=money(c.venue);$('expensesTotal').textContent=money(c.expenses);
  $('netProfit').textContent=money(c.profit);$('profitMargin').textContent=`${c.margin.toFixed(1)}% margin`;
  $('dayBalance').textContent=money(c.day);$('minimumCommitment').textContent=money(c.minimum);$('depositSummary').textContent=money(c.deposits);
  $('sumGross').textContent=money(c.gross);$('sumVenue').textContent='−'+money(c.venue);$('sumExpenses').textContent='−'+money(c.expenses);$('sumProfit').textContent=money(c.profit);
  const be=c.breakEven;
  $('breakEvenTickets').textContent=be.target===null?'—':be.target.toLocaleString();
  if(be.target===null){
    $('breakEvenDetail').textContent='Add ticket prices, or adjust a model whose costs can be covered, to calculate a target.';
    $('breakEvenStatus').textContent='Target unavailable';$('breakEvenPercent').textContent='0%';$('breakEvenProgress').style.width='0%';
    $('breakEvenProgress').parentElement.setAttribute('aria-valuenow','0');
  }else{
    const progress=be.target===0?100:Math.min(100,(be.soldTickets/be.target)*100);
    $('breakEvenDetail').textContent=`Based on your ${be.basis}: ${money(be.averagePrice)} average revenue and ${be.averageGuests.toFixed(2)} guests per ticket.`;
    $('breakEvenStatus').textContent=be.remaining===0?'Break-even reached':`${be.remaining.toLocaleString()} more needed`;
    $('breakEvenPercent').textContent=`${Math.round(progress)}%`;$('breakEvenProgress').style.width=`${progress}%`;
    $('breakEvenProgress').parentElement.setAttribute('aria-valuenow',String(Math.round(progress)));
  }
  const labels={PER_PERSON:'Per person',FLAT_FEE:'Flat hire',PERCENTAGE_SHARE:'Revenue share',HYBRID:'Hybrid fee'};$('venueModeLabel').textContent=labels[state.modelType];
  if(c.profit<0){$('signalTitle').textContent='Costs outrun sales';$('signalText').textContent=`You are ${money(Math.abs(c.profit))} short. Raise sales or trim costs before committing.`}
  else if(c.margin<20){$('signalTitle').textContent='A narrow landing';$('signalText').textContent=`The event is positive, but its ${c.margin.toFixed(1)}% margin leaves little room for surprises.`}
  else{$('signalTitle').textContent='A healthy runway';$('signalText').textContent=`The model retains ${c.margin.toFixed(1)}% of ticket revenue after venue and production costs.`}
}

function render(){
  applyTheme(state.theme || 'night');
  ['eventName','eventDate','eventVenue','modelType','ratePerHead','minPax','flatFee','percentage'].forEach(id=>$(id).value=state[id]);
  renderRows('tickets');renderRows('expenses');renderRows('deposits');updateVisibility();renderSummary();
}
function changeState(event){
  const target=event.target;
  if(target.dataset.type){const value=target.type==='number'?num(target.value):target.value;state[target.dataset.type][Number(target.dataset.index)][target.dataset.key]=value}
  else if(target.id in state){state[target.id]=target.type==='number'?num(target.value):target.value}
  else return;
  updateVisibility();renderSummary();save();
}
document.addEventListener('input',changeState);document.addEventListener('change',changeState);
document.addEventListener('click',event=>{
  const add=event.target.dataset.add,remove=event.target.dataset.remove;
  if(add){state[add].push(add==='tickets'?{name:'New ticket tier',price:60,guests:1,sold:10}:{name:add==='expenses'?'New production cost':'New venue deposit',date:state.eventDate,amount:add==='expenses'?100:500});renderRows(add);renderSummary();save()}
  if(remove){state[remove].splice(Number(event.target.dataset.index),1);renderRows(remove);renderSummary();save()}
});
function applyTheme(theme){
  state.theme=theme;document.documentElement.dataset.theme=theme;
  const daylight=theme==='daylight';$('themeButton').textContent=daylight?'Night mode':'Daylight';
  $('themeButton').setAttribute('aria-label',daylight?'Switch to night mode':'Switch to daylight mode');
  document.querySelector('meta[name="theme-color"]').content=daylight?'#FDF8F3':'#050308';
}
$('themeButton').addEventListener('click',()=>{applyTheme(state.theme==='daylight'?'night':'daylight');save();toast(`${state.theme==='daylight'?'Daylight':'Night'} mode on`)});
$('clearButton').addEventListener('click',()=>$('clearDialog').showModal());
$('closeClearButton').addEventListener('click',()=>$('clearDialog').close());
$('clearDialog').addEventListener('click',event=>{if(event.target===$('clearDialog'))$('clearDialog').close()});
$('clearDialog').addEventListener('click',event=>{
  const action=event.target.closest('[data-clear]')?.dataset.clear;if(!action)return;
  if(action==='sales')state.tickets.forEach(t=>t.sold=0);
  if(action==='costs'){state.expenses.forEach(e=>e.amount=0);state.deposits.forEach(d=>d.amount=0)}
  if(action==='all'){state.ratePerHead=0;state.minPax=0;state.flatFee=0;state.percentage=0;state.tickets.forEach(t=>{t.price=0;t.sold=0;t.guests=1});state.expenses.forEach(e=>e.amount=0);state.deposits.forEach(d=>d.amount=0)}
  if(action==='restore'){const theme=state.theme;state=structuredClone(defaults);state.theme=theme}
  save();render();$('clearDialog').close();
  const messages={sales:'Ticket sales cleared',costs:'Costs and deposits cleared',all:'Example numbers cleared',restore:'Example model restored'};toast(messages[action]);
});
$('pdfButton').addEventListener('click',()=>window.print());
$('copyButton').addEventListener('click',async()=>{const c=calculations();const text=`${state.eventName}\n${state.eventDate} · ${state.eventVenue}\n\nGross sales: ${money(c.gross)}\nVenue fee: ${money(c.venue)}\nProduction costs: ${money(c.expenses)}\nNet retained: ${money(c.profit)}\nEvent-day venue balance: ${money(c.day)}`;await navigator.clipboard.writeText(text);toast('Settlement copied')});
$('csvButton').addEventListener('click',()=>{
  const c=calculations(),q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
  const rows=[["LET'S MAKE A SCENE! — EVENT SETTLEMENT"],["Event",state.eventName],["Date",state.eventDate],["Venue",state.eventVenue],[],["TICKET TIERS","Price","Guests / ticket","Sold","Gross"],...state.tickets.map(t=>[t.name,t.price,t.guests,t.sold,num(t.price)*num(t.sold)]),[],["EXPENSES","Due","Amount"],...state.expenses.map(e=>[e.name,e.date,e.amount]),[],["DEPOSITS","Due","Amount"],...state.deposits.map(d=>[d.name,d.date,d.amount]),[],["SUMMARY","Amount"],["Gross sales",c.gross],["Venue fee",-c.venue],["Production costs",-c.expenses],["Net retained",c.profit],["Event-day venue balance",c.day]];
  const blob=new Blob([rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(state.eventName||'event').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-settlement.csv';a.click();URL.revokeObjectURL(url);toast('CSV downloaded');
});
render();
