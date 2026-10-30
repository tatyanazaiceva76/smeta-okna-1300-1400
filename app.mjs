export const ITEMS = Object.freeze([
  ['measure','Замер'],['install','Монтаж'],['remove','Демонтаж'],
  ['sill','Подоконник'],['flashing','Отлив'],['slopes','Отделка откосов'],
  ['net','Москитные сетки'],['delivery','Доставка и подъём'],
  ['waste','Вынос и вывоз мусора'],['other','Другие обязательные доплаты'],
]);
export const STATES = Object.freeze({unknown:'Не уточнено',included:'В исходной сумме',extra:'Доплата',notNeeded:'Не требуется'});
export function money(raw) {
  let s=String(raw??'').trim().replace(/[\u00a0\u202f]/g,' ');
  if (!s) return {kind:'empty',cents:null};
  if (/^\d{1,3}(?: \d{3})+(?:[,.]\d{1,2})?$/.test(s)) s=s.replaceAll(' ','');
  if (!/^\d{1,8}(?:[,.]\d{1,2})?$/.test(s)) return {kind:'invalid',cents:null};
  const [rub,frac='']=s.replace(',','.').split('.');
  return {kind:'value',cents:Number(rub)*100+Number(frac.padEnd(2,'0'))};
}
export const formatMoney = cents => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
export function printExtraValue(status,amount) {
  if(status==='included') return 'уже в исходной сумме';
  if(status==='notNeeded') return 'не требуется';
  if(status!=='extra') return 'уточнить';
  const value=money(amount);
  return value.kind==='value'?formatMoney(value.cents):'уточнить';
}
export function evaluateQuote(quote) {
  const base=money(quote.base),issues=[];
  let knownCents=base.cents;
  if (base.kind!=='value') issues.push({id:'base',message:base.kind==='empty'?'Исходная сумма не указана':'Исходная сумма: проверьте запись числа'});
  for(const [id,label] of ITEMS) {
    const row=quote.items?.[id]??{status:'unknown',amount:''};
    if(!Object.hasOwn(STATES,row.status)||row.status==='unknown') issues.push({id,message:label+': состав не уточнён'});
    else if(row.status==='extra') {
      const value=money(row.amount);
      if(value.kind!=='value') issues.push({id,message:label+(value.kind==='empty'?': сумма доплаты не указана':': проверьте запись суммы')});
      else if(knownCents!==null) knownCents+=value.cents;
    }
  }
  return {base,knownCents,totalCents:issues.length?null:knownCents,complete:issues.length===0,issues};
}
export function comparison(a,b,sameScope) {
  const x=evaluateQuote(a),y=evaluateQuote(b);
  if(!x.complete||!y.complete) return 'Сравнение итогов пока невозможно: заполните исходные суммы и уточните все позиции. Неизвестные доплаты не считаются нулём.';
  if(!sameScope) return 'Оба итога заполнены. Сначала подтвердите одинаковые размеры, количество, комплектацию и объём работ — без этого разница сумм не означает сопоставимые предложения.';
  const d=x.totalCents-y.totalCents;
  return d===0?'Записанные итоги A и B совпадают. Это не проверка качества или пригодности окна.':`Записанный итог ${d<0?'A':'B'} меньше на ${formatMoney(Math.abs(d))}. Это арифметическая разница, а не рекомендация подрядчика или окна.`;
}
export const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function packet(a,b,sameScope,example=false) {
  const esc=escapeHtml;
  const table=(q,letter)=>{
    const result=evaluateQuote(q);
    return `<section><h2>Предложение ${letter}${q.ref?' · '+esc(q.ref):''}</h2><p>Исходная сумма: ${result.base.kind==='value'?esc(formatMoney(result.base.cents)):'не определена — уточнить'}</p><table><thead><tr><th>Позиция</th><th>Как учтена</th><th>Доплата за весь заказ</th></tr></thead><tbody>${ITEMS.map(([id,label])=>{const row=q.items?.[id]??{},m=money(row.amount);return `<tr><td>${esc(label)}</td><td>${esc(STATES[row.status]??STATES.unknown)}</td><td>${row.status==='extra'?(m.kind==='value'?esc(formatMoney(m.cents)):'уточнить'):row.status==='included'?'уже в исходной сумме':row.status==='notNeeded'?'не требуется':'уточнить'}</td></tr>`;}).join('')}</tbody></table><p><strong>${result.complete?'Итог записанных сумм: '+esc(formatMoney(result.totalCents)):'Итог не определён'}</strong></p>${result.issues.length?'<ul>'+result.issues.map(x=>'<li>'+esc(x.message)+'</li>').join('')+'</ul>':''}</section>`;
  };
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Сравнение смет — окно 1300×1400</title><style>@page{size:A4;margin:14mm}body{font:14px/1.5 system-ui;max-width:900px;margin:24px auto;padding:0 14px;color:#111}h1{font-size:25px}h2{font-size:19px}table{border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed}th,td{border:1px solid #aaa;text-align:left;padding:6px;overflow-wrap:anywhere}section{margin:24px 0}tr{break-inside:avoid}@media print{body{margin:0;padding:0;font-size:10pt}}</style></head><body><h1>Сравнение двух смет на окно 1300×1400</h1>${example?'<p><strong>УЧЕБНЫЙ ПРИМЕР: цифры вымышлены, не рыночные цены.</strong></p>':''}<p>Суммы введены пользователем за весь заказ. Это не рыночная оценка, предложение продавца или размер для изготовления. Включённые позиции повторно не прибавляются; неизвестные суммы не равны нулю.</p><p>Одинаковый состав проверен пользователем: ${sameScope?'да':'нет'}.</p>${table(a,'A')}${table(b,'B')}<p><strong>${esc(comparison(a,b,sameScope))}</strong></p><p>Перед заказом согласуйте финальный замер, состав, скидки, применимые к предложению налоги, исключения и срок действия письменной сметы. Лист не проверяет безопасность, качество или соответствие нормам.</p><p>Создано локально: <a href="https://tatyanazaiceva76.github.io/smeta-okna-1300-1400/">лист сравнения</a>. В документе нет скриптов, аналитики или внешних ресурсов.</p></body></html>`;
}

if(typeof document!=='undefined') {
  const byId=id=>document.getElementById(id);
  let example=false;
  const printSpan=input=>{const span=document.createElement('span');span.className='print-value';span.textContent=input.id.endsWith('-amount')?printExtraValue(byId(input.id.slice(0,-7)+'-status').value,input.value):input.type==='checkbox'?(input.checked?'Подтверждено':'Не подтверждено'):input.tagName==='SELECT'?input.options[input.selectedIndex].text:input.value||'Не указано';input.after(span);};
  for(const side of ['a','b']) for(const [id,label] of ITEMS) {
    const row=document.createElement('div');row.className='item';
    const statusLabel=document.createElement('label');statusLabel.textContent=label+' '+side.toUpperCase();
    const select=document.createElement('select');select.id=`${side}-${id}-status`;
    for(const [value,text]of Object.entries(STATES)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
    statusLabel.append(select);
    const amountLabel=document.createElement('label');amountLabel.textContent='Доплата: '+label.toLowerCase()+' '+side.toUpperCase()+', ₽';
    const amount=document.createElement('input');amount.id=`${side}-${id}-amount`;amount.type='text';amount.inputMode='decimal';amount.placeholder='Уточнить сумму';amount.disabled=true;amountLabel.append(amount);
    row.append(statusLabel,amountLabel);byId(`${side}-items`).append(row);
  }
  const read=side=>({ref:byId(`${side}-ref`).value,base:byId(`${side}-base`).value,items:Object.fromEntries(ITEMS.map(([id])=>[id,{status:byId(`${side}-${id}-status`).value,amount:byId(`${side}-${id}-amount`).value}]))});
  const summary=(side,quote)=>{
    const result=evaluateQuote(quote),out=byId(`${side}-summary`);out.replaceChildren();
    const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=result.complete?'Итог записанных сумм: '+formatMoney(result.totalCents):'Итог пока не определён';p.append(strong);out.append(p);
    if(!result.complete&&result.knownCents!==null){const known=document.createElement('p');known.textContent='Сумма только известных строк: '+formatMoney(result.knownCents)+'. Это не полный итог и не гарантированный бюджет.';out.append(known);}
    if(result.issues.length){const ul=document.createElement('ul');for(const issue of result.issues){const li=document.createElement('li');li.textContent=issue.message;ul.append(li);}out.append(ul);}
    byId(`${side}-base`).setAttribute('aria-invalid',String(result.base.kind==='invalid'));
    for(const[id]of ITEMS){const status=byId(`${side}-${id}-status`).value,input=byId(`${side}-${id}-amount`);input.disabled=status!=='extra';input.setAttribute('aria-invalid',String(status==='extra'&&money(input.value).kind==='invalid'));}
  };
  const update=()=>{
    const a=read('a'),b=read('b');summary('a',a);summary('b',b);byId('comparison').textContent=comparison(a,b,byId('same-scope').checked);byId('example-note').hidden=!example;
    for(const span of document.querySelectorAll('.print-value'))span.remove();
    for(const input of document.querySelectorAll('#quotes input,#quotes select'))printSpan(input);
  };
  byId('quotes').addEventListener('submit',event=>event.preventDefault());
  byId('quotes').addEventListener('input',()=>{byId('download-status').textContent='';update();});
  byId('quotes').addEventListener('change',()=>{byId('download-status').textContent='';update();});
  byId('reset').addEventListener('click',()=>{byId('quotes').reset();example=false;byId('download-status').textContent='';update();});
  byId('example').addEventListener('click',()=>{
    byId('quotes').reset();example=true;byId('a-ref').value='Учебная A';byId('b-ref').value='Учебная B';byId('a-base').value='10000';byId('b-base').value='12400';
    for(const side of ['a','b'])for(const[id]of ITEMS)byId(`${side}-${id}-status`).value='included';
    byId('a-install-status').value='extra';byId('a-install-amount').value='2000';byId('a-delivery-status').value='extra';byId('a-delivery-amount').value='300';byId('download-status').textContent='';update();
  });
  byId('download').addEventListener('click',()=>{
    const html=packet(read('a'),read('b'),byId('same-scope').checked,example),url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='smeta-okna-1300-1400.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);byId('download-status').textContent='Подготовлен HTML-файл текущего листа. Проверьте его в загрузках браузера; для PDF используйте печать в своём браузере.';
  });
  byId('print').addEventListener('click',()=>{update();window.print();});
  update();
}
