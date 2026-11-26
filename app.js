/* «Умножаю по шагам». Все задания и проверки выполняются локально. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const INPUT_IDS = ['field-tens', 'field-units', 'field-tens-product', 'field-units-product', 'field-total'];
  const inputs = INPUT_IDS.map($);
  const LEVEL_NAMES = {1:'Начинаю',2:'Тренируюсь',3:'Могу больше'};
  let session = null;

  function generatePool(level) {
    const pool = [];
    for (let a=11;a<=99;a++) {
      const tens = Math.floor(a/10)*10;
      const units = a%10;
      if (units===0) continue; // нужны два осмысленных разрядных слагаемых
      for (let b=2;b<=9;b++) {
        const total=a*b;
        if (total>150) continue;
        const unitsProduct=units*b;
        const isLevel1=total<=100 && unitsProduct<10;
        const isLevel2=total<=100 && unitsProduct>=10;
        const isLevel3=total>=101 && total<=150;
        if ((level===1&&isLevel1)||(level===2&&isLevel2)||(level===3&&isLevel3)) {
          pool.push({a,b,answers:[tens,units,tens*b,unitsProduct,total]});
        }
      }
    }
    return pool;
  }

  function sampleUnique(pool, count) {
    if (pool.length < count) throw new Error('Недостаточно уникальных примеров');
    // Перемешивание Фишера — Йетса
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    return pool.slice(0,count);
  }

  function display(view) {
    ['setup','exercise','result'].forEach(x => $(x+'-view').classList.toggle('is-hidden',x!==view));
    window.scrollTo({top:0,behavior:'instant'});
  }

  function newSession() {
    const level=Number(document.querySelector('input[name="difficulty"]:checked').value);
    const count=Number(document.querySelector('input[name="count"]:checked').value);
    session={level,count,tasks:sampleUnique(generatePool(level),count),index:0,stats:{first:0,fixed:0,hints:0},answered:0,attempts:0,hintUsed:false,success:false};
    $('session-level').textContent=LEVEL_NAMES[level];
    display('exercise');
    showTask();
  }

  function clearFieldStates(){ inputs.forEach(e=>e.parentElement.classList.remove('is-error','is-correct')); }
  function currentTask(){ return session.tasks[session.index]; }
  function showTask(){
    const t=currentTask();
    $('factor-a').textContent=t.a;
    $('factor-b').textContent=t.b;
    $('field-tens').setAttribute('aria-label',`Разрядное слагаемое: десятки числа ${t.a}`);
    $('field-units').setAttribute('aria-label',`Разрядное слагаемое: единицы числа ${t.a}`);
    inputs.forEach(e=>{e.value='';e.disabled=false;});
    clearFieldStates();
    session.attempts=0;session.hintUsed=false;session.success=false;
    $('hint-panel').classList.add('is-hidden');
    $('hint-btn').disabled=false;
    $('hint-btn').textContent='💡 Подсказка';
    $('check-btn').classList.remove('is-hidden');
    $('next-btn').classList.add('is-hidden');
    $('next-btn').textContent=session.index===session.count-1?'Посмотреть результат →':'Следующий пример →';
    setFeedback('', '');
    $('progress-label').textContent=`Задание ${session.index+1} из ${session.count}`;
    const pct=Math.round(session.answered/session.count*100);
    $('progress-percent').textContent=pct+'%';
    $('progress-fill').style.width=pct+'%';
    $('progressbar').setAttribute('aria-valuenow',pct);
    $('equation-scroller').scrollLeft=0;
    inputs[0].focus({preventScroll:true});
  }

  function setFeedback(message,type){
    const el=$('feedback');
    el.textContent=message;
    el.className='feedback'+(message?' '+type:' is-hidden');
  }
  function readValues(){
    return inputs.map(e=>{const raw=e.value.trim();return /^\d+$/.test(raw)?Number(raw):null;});
  }
  function checkAnswer(){
    if (!session || session.success) return;
    const values=readValues();
    clearFieldStates();
    const invalid=values.some(v=>v===null);
    if(invalid){
      inputs.forEach((e,i)=>{if(values[i]===null)e.parentElement.classList.add('is-error');});
      setFeedback('Заполни все пять окошек числами, а затем проверь решение.','notice');
      return;
    }
    const answers=currentTask().answers;
    const mistakes=values.map((n,i)=>n!==answers[i]);
    session.attempts++;
    if(mistakes.some(Boolean)){
      inputs.forEach((e,i)=>e.parentElement.classList.add(mistakes[i]?'is-error':'is-correct'));
      const count=mistakes.filter(Boolean).length;
      setFeedback(count===1?'Есть одна неточность. Посмотри на выделенное окошко.':'Пока есть неточности. Проверь выделенные окошки и попробуй ещё раз.','error');
      return;
    }
    inputs.forEach(e=>{e.parentElement.classList.add('is-correct');e.disabled=true;});
    session.success=true;
    session.answered++;
    if(session.hintUsed) session.stats.hints++;
    else if(session.attempts===1) session.stats.first++;
    else session.stats.fixed++;
    $('hint-btn').disabled=true;
    $('check-btn').classList.add('is-hidden');
    $('next-btn').classList.remove('is-hidden');
    const pct=Math.round(session.answered/session.count*100);
    $('progress-percent').textContent=pct+'%';
    $('progress-fill').style.width=pct+'%';
    $('progressbar').setAttribute('aria-valuenow',pct);
    setFeedback('Верно! Ты правильно разложил число и выполнил вычисления.','success');
    $('next-btn').focus();
  }
  function hintMessage(){
    const t=currentTask(), read=readValues(), answers=t.answers;
    let focus=read.findIndex((v,i)=>v!==answers[i]);
    if(focus<0) focus=0;
    if(focus===0) return `Посмотри на десятки числа ${t.a}. Сколько их? Запиши их значение круглым числом.`;
    if(focus===1) return `Какая цифра стоит в разряде единиц числа ${t.a}? Запиши её как второе разрядное слагаемое.`;
    if(focus===2) return `Умножь количество десятков числа ${t.a} на ${t.b}. Помни: результат будет выражен в десятках.`;
    if(focus===3) return `Вспомни таблицу умножения: умножь единицы числа ${t.a} на ${t.b}.`;
    return 'Сложи два полученных произведения. Удобно сначала сложить круглые десятки, а затем единицы.';
  }
  function showHint(){
    if(!session||session.success)return;
    session.hintUsed=true;
    $('hint-text').textContent=hintMessage();
    $('hint-panel').classList.remove('is-hidden');
    $('hint-btn').textContent='💡 Подсказка';
  }
  function nextTask(){
    if(!session || !session.success)return;
    if(session.index===session.count-1){showResults();return;}
    session.index++;
    showTask();
  }
  function showResults(){
    $('result-total').textContent=session.count;
    $('result-first').textContent=session.stats.first;
    $('result-fixed').textContent=session.stats.fixed;
    $('result-hints').textContent=session.stats.hints;
    display('result');
    $('result-title').focus?.();
  }
  function goBack(){
    if(session && session.answered>0 && !session.success && !window.confirm('Вернуться к выбору заданий? Текущий результат тренировки не сохранится.'))return;
    if(session && session.success && session.answered<session.count && !window.confirm('Вернуться к выбору заданий? Текущий результат тренировки не сохранится.'))return;
    session=null;display('setup');
  }
  inputs.forEach((e,i)=>{
    e.addEventListener('input',()=>{
      // Сохраняем выбранное поле, не проверяем автоматически.
      e.parentElement.classList.remove('is-error','is-correct');
      if(session&&!session.success) setFeedback('','');
    });
    e.addEventListener('keydown',(ev)=>{if(ev.key==='Enter'){ev.preventDefault();checkAnswer();}});
  });
  $('start-btn').addEventListener('click',newSession);
  $('check-btn').addEventListener('click',checkAnswer);
  $('hint-btn').addEventListener('click',showHint);
  $('next-btn').addEventListener('click',nextTask);
  $('back-btn').addEventListener('click',goBack);
  $('again-btn').addEventListener('click',()=>{session=null;display('setup');});
})();
