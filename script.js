const RAW = JSON.parse(document.getElementById('dataStore').textContent);
const DAYS = Object.keys(RAW);
let activeDay = DAYS[0];
let dirty = false;
let canEdit = true;
let artifactApi = null;
let statusFilter = 'TODOS';

const STATUS_ORDER = ["ADIANTADO","EM DIA","ATRASADO","CONCLUÍDO"];
const FILTERS = [
  {key:'TODOS', label:'Todos', cls:''},
  {key:'ADIANTADO', label:'Adiantados', cls:'adv'},
  {key:'EM DIA', label:'Em dia', cls:'ok'},
  {key:'ATRASADO', label:'Atrasados', cls:'late'},
  {key:'CONCLUÍDO', label:'Concluídos', cls:''},
  {key:'FALTANTE', label:'Faltantes', cls:'miss'}
];
function badgeClass(s){
  if(s==="ATRASADO") return "late";
  if(s==="ADIANTADO") return "adv";
  if(s==="CONCLUÍDO") return "done";
  return "ok";
}

function renderFilters(){
  const box = document.getElementById('filters');
  box.innerHTML = '';
  FILTERS.forEach(f=>{
    const chip = document.createElement('div');
    chip.className = 'chip' + (statusFilter===f.key?' active '+f.cls:'');
    chip.textContent = f.label;
    chip.onclick = ()=>{ statusFilter = f.key; renderFilters(); renderContent(); };
    box.appendChild(chip);
  });
}

function computeStats(){
  let total=0, ok=0, late=0, adv=0, miss=0;
  DAYS.forEach(d=>{
    Object.values(RAW[d]).forEach(list=>{
      list.forEach(r=>{
        total++;
        const s=r[4];
        if(s==="ATRASADO") late++;
        else if(s==="ADIANTADO") adv++;
        else ok++;
        if(r[5]==='SIM') miss++;
      });
    });
  });
  document.getElementById('st-total').textContent = total;
  document.getElementById('st-adv').textContent = adv;
  document.getElementById('st-ok').textContent = ok;
  document.getElementById('st-late').textContent = late;
  document.getElementById('st-miss').textContent = miss;
}

function renderTabs(){
  const tabs = document.getElementById('tabs');
  tabs.innerHTML = '';
  DAYS.forEach(d=>{
    const count = Object.values(RAW[d]).reduce((a,l)=>a+l.length,0);
    const btn = document.createElement('div');
    btn.className = 'tab' + (d===activeDay ? ' active':'');
    btn.innerHTML = d.replace('-FEIRA','') + ' <span class="n">'+count+'</span>';
    btn.onclick = () => { activeDay = d; document.getElementById('search').value=''; render(); };
    tabs.appendChild(btn);
  });
}

function markDirty(){
  dirty = true;
  document.getElementById('saveMsg').textContent = canEdit ? 'Alterações não salvas' : '';
}

function renderContent(){
  const content = document.getElementById('content');
  content.innerHTML = '';
  const q = document.getElementById('search').value.trim().toUpperCase();

  let daysToShow = q ? DAYS : [activeDay];
  let any = false;

  daysToShow.forEach(day=>{
    const turmas = RAW[day];
    Object.keys(turmas).forEach(turmaName=>{
      const alunos = turmas[turmaName];
      let filtered = q ? alunos.filter(a=>a[0].toUpperCase().includes(q)) : alunos;
      if(statusFilter === 'FALTANTE') filtered = filtered.filter(a=>a[5]==='SIM');
      else if(statusFilter !== 'TODOS') filtered = filtered.filter(a=>a[4]===statusFilter);
      if(filtered.length===0) return;
      any = true;

      const nAdv = alunos.filter(a=>a[4]==='ADIANTADO').length;
      const nOk = alunos.filter(a=>a[4]!=='ADIANTADO'&&a[4]!=='ATRASADO').length;
      const nLate = alunos.filter(a=>a[4]==='ATRASADO').length;
      const nMiss = alunos.filter(a=>a[5]==='SIM').length;

      const box = document.createElement('div');
      box.className = 'turma';
      const head = document.createElement('div');
      head.className = 'turma-head';
      head.innerHTML = '<span>'+turmaName+(q?' · '+day.replace('-FEIRA',''):'')+'</span>'+
        '<div class="turma-stats">'+
        (nAdv?'<span class="tadv">'+nAdv+' adi.</span>':'')+
        (nOk?'<span class="tok">'+nOk+' ok</span>':'')+
        (nLate?'<span class="tlate">'+nLate+' atr.</span>':'')+
        (nMiss?'<span class="tmiss">'+nMiss+' falt.</span>':'')+
        '</div>';
      box.appendChild(head);

      filtered.forEach(rec=>{
        const idx = alunos.indexOf(rec);
        const row = document.createElement('div');
        row.className = 'aluno' + (rec[5]==='SIM' ? ' faltante' : '');
        const top = document.createElement('div');
        top.className = 'aluno-top';

        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = '<div class="aluno-nome">'+rec[0]+'</div>'+
          '<div class="aluno-datas">Início: '+(rec[2]||'—')+' · Previsão: '+(rec[3]||'—')+'</div>';
        const modInput = document.createElement('input');
        modInput.className = 'aluno-mod';
        modInput.type = 'text';
        modInput.placeholder = 'Módulo / curso atual...';
        modInput.value = rec[1] || '';
        modInput.readOnly = !canEdit;
        modInput.oninput = ()=>{ rec[1] = modInput.value; markDirty(); };
        info.insertBefore(modInput, info.children[1]);

        const flagRow = document.createElement('div');
        flagRow.className = 'flagrow';
        const flagCb = document.createElement('input');
        flagCb.type = 'checkbox';
        flagCb.id = 'flag_'+day+'_'+turmaName+'_'+idx;
        flagCb.checked = rec[5] === 'SIM';
        flagCb.disabled = !canEdit;
        const flagLbl = document.createElement('label');
        flagLbl.htmlFor = flagCb.id;
        flagLbl.textContent = 'Aluno faltante';
        flagCb.onchange = ()=>{
          rec[5] = flagCb.checked ? 'SIM' : 'NAO';
          row.className = 'aluno' + (rec[5]==='SIM' ? ' faltante' : '');
          computeStats();
          renderFilters();
          markDirty();
        };
        flagRow.appendChild(flagCb);
        flagRow.appendChild(flagLbl);
        info.appendChild(flagRow);
        top.appendChild(info);

        const sel = document.createElement('select');
        sel.className = 'status-select ' + badgeClass(rec[4]);
        STATUS_ORDER.forEach(s=>{
          const opt = document.createElement('option');
          opt.value = s; opt.textContent = s;
          if(s===rec[4]) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.disabled = !canEdit;
        sel.onchange = ()=>{
          rec[4] = sel.value;
          sel.className = 'status-select ' + badgeClass(rec[4]);
          computeStats();
          renderFilters();
          markDirty();
        };
        top.appendChild(sel);
        row.appendChild(top);

        const obs = document.createElement('textarea');
        obs.className = 'obs';
        obs.rows = 1;
        obs.placeholder = 'Observação (clique para adicionar)...';
        obs.value = rec[6] || '';
        obs.readOnly = !canEdit;
        obs.oninput = ()=>{ rec[6] = obs.value; markDirty(); };
        row.appendChild(obs);

        box.appendChild(row);
      });
      content.appendChild(box);
    });
  });

  if(!any){
    content.innerHTML = '<div class="empty">Nenhum aluno encontrado.</div>';
  }
}

function render(){
  renderTabs();
  renderFilters();
  renderContent();
  computeStats();
}

document.getElementById('search').addEventListener('input', renderContent);

document.getElementById('saveBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('saveMsg');
  if(!canEdit || !artifactApi){
    msg.textContent = 'Edição indisponível nesta visualização.';
    return;
  }
  msg.textContent = 'Salvando...';
  try{
    await persistAll();
    dirty = false;
    msg.textContent = 'Salvo! Todos que abrirem a página verão essa versão.';
  }catch(e){
    msg.textContent = 'Não foi possível salvar agora. Tente novamente.';
  }
});

async function persistAll(){
  document.getElementById('dataStore').textContent = JSON.stringify(RAW);
  document.getElementById('accountsStore').textContent = JSON.stringify(ACCOUNTS);
  const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  await artifactApi.publish(html);
}

const ACCOUNTS = JSON.parse(document.getElementById('accountsStore').textContent);
let currentUser = null;
const gate = document.getElementById('gate');
const logoutBtn = document.getElementById('logoutBtn');
const userChip = document.getElementById('userChip');
const userAv = document.getElementById('userAv');
const userLabel = document.getElementById('userLabel');
const profileModal = document.getElementById('profileModal');
const modalAvatar = document.getElementById('modalAvatar');

document.getElementById('userlist').innerHTML =
  Object.keys(ACCOUNTS).map(n=>'<option value="'+n+'">').join('');

function avatarHTML(name){
  const photo = ACCOUNTS[name] && ACCOUNTS[name].photo;
  if(photo) return '<img src="'+photo+'">';
  const initials = name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
  return initials;
}

function showLoggedIn(name){
  currentUser = name;
  userAv.innerHTML = avatarHTML(name);
  userLabel.textContent = name.split(' ')[0];
  userChip.style.display = 'flex';
  logoutBtn.style.display = 'block';
  gate.style.display = 'none';
}

function checkLogin(){
  const saved = localStorage.getItem('idealiza_user');
  if(saved && ACCOUNTS[saved]){
    showLoggedIn(saved);
  }
}

document.getElementById('gateBtn').addEventListener('click', ()=>{
  const name = document.getElementById('gateUser').value.trim();
  const pass = document.getElementById('gatePass').value;
  const err = document.getElementById('gateErr');
  const acc = ACCOUNTS[name];
  if(acc && acc.password === pass){
    localStorage.setItem('idealiza_user', name);
    showLoggedIn(name);
    err.textContent = '';
  } else {
    err.textContent = 'Nome ou senha incorretos.';
  }
});
document.getElementById('gatePass').addEventListener('keydown', e=>{
  if(e.key === 'Enter') document.getElementById('gateBtn').click();
});
logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('idealiza_user');
  currentUser = null;
  userChip.style.display = 'none';
  gate.style.display = 'flex';
  logoutBtn.style.display = 'none';
  document.getElementById('gatePass').value = '';
});

userChip.addEventListener('click', ()=>{
  modalAvatar.innerHTML = avatarHTML(currentUser);
  document.getElementById('newPass1').value = '';
  document.getElementById('newPass2').value = '';
  document.getElementById('profileMsg').textContent = '';
  document.getElementById('profileMsg').className = 'modal-msg';
  profileModal.classList.add('show');
});
document.getElementById('profileCancel').addEventListener('click', ()=>{
  profileModal.classList.remove('show');
});
document.getElementById('photoInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    ACCOUNTS[currentUser].photo = reader.result;
    modalAvatar.innerHTML = avatarHTML(currentUser);
  };
  reader.readAsDataURL(file);
});
document.getElementById('profileSave').addEventListener('click', async ()=>{
  const p1 = document.getElementById('newPass1').value;
  const p2 = document.getElementById('newPass2').value;
  const msg = document.getElementById('profileMsg');
  if(p1 || p2){
    if(p1.length < 3){ msg.textContent='A nova senha é muito curta.'; msg.className='modal-msg err'; return; }
    if(p1 !== p2){ msg.textContent='As senhas não coincidem.'; msg.className='modal-msg err'; return; }
    ACCOUNTS[currentUser].password = p1;
  }
  if(!canEdit || !artifactApi){
    msg.textContent = 'Sem permissão de edição nesta visualização.';
    msg.className = 'modal-msg err';
    return;
  }
  msg.textContent = 'Salvando...';
  msg.className = 'modal-msg';
  try{
    await persistAll();
    userAv.innerHTML = avatarHTML(currentUser);
    msg.textContent = 'Perfil atualizado!';
    msg.className = 'modal-msg ok';
  }catch(e){
    msg.textContent = 'Não foi possível salvar agora.';
    msg.className = 'modal-msg err';
  }
});

checkLogin();

render();

(async ()=>{
  try{
    if(window.claude && window.claude.use){
      artifactApi = await window.claude.use('artifact');
      if(!artifactApi){
        canEdit = false;
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('saveMsg').textContent = 'Modo somente leitura.';
      }
    } else {
      canEdit = false;
      document.getElementById('saveBtn').disabled = true;
    }
  }catch(e){
    canEdit = false;
    document.getElementById('saveBtn').disabled = true;
  }
})();