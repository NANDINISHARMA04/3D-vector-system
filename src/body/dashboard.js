// Teacher dashboard: class roster, quiz results over time, printable report, CSV export.
import { getRoster, saveRoster, addStudent, removeStudent, getResults, clearResults, summarize, toCSV } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (v) => `${Math.round(v * 100)}%`;
const day = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const time = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function initDashboard({ toast }) {
  const root = $('#dashboard');
  const body = $('#dash-body');
  let tab = 'overview';
  let filter = 'all';

  function open(startTab = 'overview') {
    tab = startTab;
    root.hidden = false;
    render();
  }
  const close = () => (root.hidden = true);
  $('#dash-done').onclick = close;
  root.addEventListener('click', (e) => e.target === root && close());

  root.querySelectorAll('#dash-tabs button').forEach((b) => {
    b.onclick = () => {
      tab = b.dataset.tab;
      render();
    };
  });

  $('#dash-print').onclick = () => {
    tab = 'report';
    render();
    setTimeout(() => window.print(), 50);
  };
  $('#dash-csv').onclick = () => {
    const blob = new Blob([toCSV(getResults())], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `body-explorer-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  function render() {
    root.querySelectorAll('#dash-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab || (tab === 'report' && b.dataset.tab === 'overview')));
    const results = getResults();
    const s = summarize(results);
    if (tab === 'students') body.innerHTML = studentsView(s);
    else if (tab === 'history') body.innerHTML = historyView(results);
    else body.innerHTML = overviewView(s, results, tab === 'report');
    wire();
  }

  function overviewView(s, results, report) {
    if (!results.length && !report) {
      return `<div class="empty"><div class="empty-icon">📊</div><h4>No quizzes yet</h4><p>Play a quiz with a student or two teams and the results will appear here.</p></div>`;
    }
    const top = s.players[0];
    const maxGames = Math.max(1, ...s.models.map((m) => m.games));
    return `
      ${report ? `<div class="report-head"><h2>Body Explorer: Class Report</h2><p>${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</p></div>` : ''}
      <div class="tiles">
        <div class="tile"><span>Quizzes played</span><b>${s.games}</b></div>
        <div class="tile"><span>Class average</span><b>${pct(s.average)}</b></div>
        <div class="tile"><span>Top scorer</span><b class="small">${esc(top?.player?.name ?? '—')}</b><em>${top ? pct(top.score / (top.total || 1)) : ''}</em></div>
        <div class="tile"><span>Players</span><b>${s.players.length}</b></div>
      </div>
      <h4 class="section-header">Average score by body system</h4>
      <div class="bars" role="table" aria-label="Average score by body system">
        ${s.models.map((m) => {
          const avg = m.total ? m.score / m.total : 0;
          return `<div class="bar-row" role="row" title="${esc(m.title)}: ${pct(avg)} average over ${m.games} quiz${m.games === 1 ? '' : 'zes'}">
            <span role="cell" class="bar-label">${esc(m.title)}</span>
            <span role="cell" class="bar-track"><i style="width:${Math.max(2, avg * 100)}%"></i></span>
            <span role="cell" class="bar-value">${pct(avg)}</span>
            <span role="cell" class="bar-meta">${m.games} quiz${m.games === 1 ? '' : 'zes'}</span>
          </div>`;
        }).join('')}
      </div>
      ${s.missed.length ? `<h4 class="section-header">Parts to revise (most often missed)</h4>
      <ul class="inset-group list">${s.missed.map(([k, n]) => `<li><span>${esc(k)}</span><span class="muted">${n}×</span></li>`).join('')}</ul>` : ''}
      ${report ? `<h4 class="section-header">Students and teams</h4>${playersTable(s)}` : ''}
      <p class="footnote">Results are saved on this device only. ${maxGames ? '' : ''}</p>`;
  }

  function playersTable(s) {
    if (!s.players.length) return '<p class="footnote">No players yet.</p>';
    return `<table class="table"><thead><tr><th>Name</th><th>Quizzes</th><th>Average</th><th>Best</th><th>Last played</th></tr></thead><tbody>
      ${s.players.map((p) => `<tr><td>${esc(p.player?.name)}${p.player?.type === 'team' ? ' <span class="chip">team</span>' : ''}</td><td>${p.games}</td><td>${pct(p.score / (p.total || 1))}</td><td>${pct(p.best)}</td><td>${day(p.last)}</td></tr>`).join('')}
    </tbody></table>`;
  }

  function studentsView(s) {
    const roster = getRoster();
    const stats = new Map(s.players.map((p) => [p.player?.id, p]));
    return `
      <h4 class="section-header">Students</h4>
      <form class="add-row" id="add-student"><input id="student-name" placeholder="Add a student’s name" maxlength="40" autocomplete="off" /><button class="btn-tinted" type="submit">Add</button></form>
      <ul class="inset-group list">
        ${roster.students.length ? roster.students.map((st) => {
          const p = stats.get(st.id);
          return `<li><span><b>${esc(st.name)}</b><small>${p ? `${p.games} quiz${p.games === 1 ? '' : 'zes'} · average ${pct(p.score / (p.total || 1))}` : 'No quizzes yet'}</small></span>
            <button class="text-btn danger" data-remove="${st.id}" aria-label="Remove ${esc(st.name)}">Remove</button></li>`;
        }).join('') : '<li><span class="muted">No students yet. Add names to track their quiz scores.</span></li>'}
      </ul>
      <h4 class="section-header">Teams</h4>
      <ul class="inset-group list">
        ${roster.teams.map((t) => `<li><span class="team-dot" style="background:${t.color}"></span><input class="team-name" data-team="${t.id}" value="${esc(t.name)}" maxlength="30" aria-label="Team name" />
          <span class="muted">${stats.get(t.id) ? `${stats.get(t.id).games} games · ${pct(stats.get(t.id).score / (stats.get(t.id).total || 1))}` : ''}</span></li>`).join('')}
      </ul>
      <p class="footnote">Team names are used in team quizzes.</p>`;
  }

  function historyView(results) {
    const players = [...new Map(results.map((r) => [r.player?.id, r.player])).values()].filter(Boolean);
    const rows = results.filter((r) => filter === 'all' || r.player?.id === filter).slice().reverse();
    return `
      <div class="filter-row"><label for="hist-filter">Show</label>
        <select id="hist-filter"><option value="all">Everyone</option>${players.map((p) => `<option value="${esc(p.id)}" ${filter === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <span class="spacer"></span>
        ${results.length ? '<button class="text-btn danger" id="clear-results">Clear all results</button>' : ''}
      </div>
      ${rows.length ? `<table class="table"><thead><tr><th>When</th><th>Player</th><th>System</th><th>Score</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${time(r.date)}</td><td>${esc(r.player?.name)}</td><td>${esc(r.modelTitle)}</td><td><b>${r.score}</b> / ${r.total}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty"><h4>No results</h4><p>Quiz results will be listed here.</p></div>'}`;
  }

  function wire() {
    $('#add-student', body)?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#student-name', body);
      if (addStudent(input.value)) {
        toast('Student added');
        render();
        $('#student-name', body)?.focus();
      }
    });
    body.querySelectorAll('[data-remove]').forEach((b) => (b.onclick = () => {
      removeStudent(b.dataset.remove);
      render();
    }));
    body.querySelectorAll('.team-name').forEach((input) => (input.onchange = () => {
      const r = getRoster();
      const t = r.teams.find((x) => x.id === input.dataset.team);
      if (t && input.value.trim()) t.name = input.value.trim();
      saveRoster(r);
      toast('Team renamed');
    }));
    $('#hist-filter', body)?.addEventListener('change', (e) => {
      filter = e.target.value;
      render();
    });
    $('#clear-results', body)?.addEventListener('click', () => {
      if (confirm('Delete all saved quiz results on this device?')) {
        clearResults();
        render();
      }
    });
  }

  return { open, close };
}
