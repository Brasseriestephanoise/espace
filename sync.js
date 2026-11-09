/* Synchro Super G → Espace brasserie (lecture seule côté Super G).
   Lancée sur une page app.superg.fr connectée : par l'extension « Espace brasserie » (bouton de l'espace) ou par le favori « Synchro espace ».
   Avancement dans window.__esProg (lu par l'extension pour le décompte de l'espace). */
(function () {
  if (location.hostname !== 'app.superg.fr') { alert('Ouvrez d’abord Super G (app.superg.fr).'); return; }
  if (window.__esSync) return;
  const KEY = window.__ESK || ''; if (!KEY) { alert('Synchro incomplète : relancez-la depuis l’espace brasserie.'); return; }
  window.__esSync = 1;
  const ESP = 'https://script.google.com/macros/s/AKfycbyzmQ_9y0Sc7fpRuOF4htqSDNCDkZUMUy-HAKTikw7ORMpiltBntdZKg_3fpkgictI/exec';
  const P = window.__esProg = { pct: 0, msg: 'Démarrage…', done: false, ok: false, err: '', t0: Date.now(), log: [] };
  const box = document.createElement('div'); box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#1D2420;color:#fff;font:15px/1.4 system-ui,sans-serif;padding:14px 18px;border-radius:10px;width:340px;box-shadow:0 6px 24px rgba(0,0,0,.3)';
  box.innerHTML = '<b>Synchro espace brasserie</b><div id="es-st" style="margin:6px 0">Démarrage…</div><div style="height:8px;background:#3a463f;border-radius:4px;overflow:hidden"><i id="es-bar" style="display:block;height:100%;width:0;background:#17936F"></i></div>';
  document.body.appendChild(box);
  const show = () => { box.querySelector('#es-st').textContent = P.msg; box.querySelector('#es-bar').style.width = Math.round(P.pct) + '%'; };
  const step = (pct, msg) => { P.pct = pct; P.msg = msg; show(); };
  const finish = (ok, msg) => { P.done = true; P.ok = ok; P.pct = ok ? 100 : P.pct; P.msg = msg; if (!ok) P.err = msg; show(); window.__esSync = 0;
    const b = document.createElement('button'); b.textContent = 'Fermer'; b.style.cssText = 'margin-top:8px;font:inherit;padding:4px 10px;border-radius:6px;border:0;cursor:pointer'; b.onclick = () => box.remove(); box.appendChild(b); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const J = async (p, b) => { for (let k = 0; k < 7; k++) { const r = await fetch('/api/v1/' + p, { method: b === undefined ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) });
      if (r.status === 429) { await sleep(4000 * (k + 1)); continue; } if (r.status === 401 || r.status === 403) throw new Error('Super G demande de se reconnecter : connectez-vous puis relancez.');
      const t = await r.text(); try { return JSON.parse(t); } catch (e) { throw new Error('Super G ne répond pas comme prévu (' + p + ', ' + r.status + '). Êtes-vous bien connecté ?'); } } throw new Error('Super G est saturé (' + p + '), réessayez dans une minute.'); };
  const pool = async (items, n, fn, onEach) => { const out = new Array(items.length); let i = 0, done = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); done++; if (onEach) onEach(done, items.length); await sleep(80); } })); return out; };
  const post = async (fn, args) => { const r = await fetch(ESP, { method: 'POST', body: JSON.stringify({ fn, args }) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
    if (!j || !j.ok) throw new Error('L’espace a refusé l’envoi (' + fn + ') : ' + ((j && j.err) || t.slice(0, 120))); return j.r; };
  const gz64 = async obj => { const gz = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u8 = new Uint8Array(gz); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(bin); };
  const d10 = s => s ? String(s).slice(0, 10) : '';
  const nm = s => String(s || '').trim();
  const DASH = o => J('dashboard/show', Object.assign({ Per: 'month', CreatedDateAfter: '2024-01-01', CreatedDateBefore: '2027-01-01', FinancialYearEndMonth: 12, Split: 'ContactAll', Categories: [], RecipeIds: [], PriceGroupIds: [], PackageIds: [], SalesPersonIds: [], TagIds: [[]], NullContact: false, ContactId: 0 }, o));

  (async () => {
    step(1, 'Préparation…'); const prep = await post('syncPrep', [KEY]);
    const SG = prep.sg, PK = prep.pkg; const R2P = {}; Object.keys(SG).forEach(k => { R2P[SG[k]] = k; }); const K2F = {}; Object.keys(PK).forEach(f => { K2F[PK[f]] = f; });
    // 1. Ventes par client, par bière, par format (depuis 2024)
    step(3, 'Ventes par client…'); const cli = {}, name2id = {};
    (await DASH({})).forEach(m => { if (!m.Date || m.Date < '2024') return; const ym = m.Date.slice(0, 7);
      m.Splits.forEach(s => { if (!s.Id) return; const c = cli[s.Id] = cli[s.Id] || { n: nm(s.Label), m: {} }; c.m[ym] = [s.TotalExcludingVat, s.TotalVolume]; name2id[c.n] = s.Id; }); });
    const recN = {}, pkgN = {}, rec = {}, pkg = {};
    (await DASH({ Split: 'Recipe' })).forEach(m => { if (m.Date && m.Date >= '2024') m.Splits.forEach(s => { if (s.Id) recN[s.Id] = s.Label; }); });
    (await DASH({ Split: 'Package' })).forEach(m => { if (m.Date && m.Date >= '2024') m.Splits.forEach(s => { if (s.Id) pkgN[s.Id] = s.Label; }); });
    const fill = (dst, key, rows) => rows.forEach(m => { if (!m.Date || m.Date < '2024') return; const ym = m.Date.slice(0, 7);
      m.Splits.forEach(s => { if (!s.Id) return; const a = dst[s.Id] = dst[s.Id] || {}; const o = a[key] = a[key] || {}; o[ym] = [s.TotalExcludingVat, s.TotalVolume]; }); });
    const rk = Object.keys(recN), pk = Object.keys(pkgN); let n = 0;
    for (const id of rk) { fill(rec, id, await DASH({ RecipeIds: [+id] })); step(3 + 17 * (++n) / (rk.length + pk.length), 'Ventes par bière et par format…'); await sleep(120); }
    for (const id of pk) { fill(pkg, id, await DASH({ PackageIds: [+id] })); step(3 + 17 * (++n) / (rk.length + pk.length), 'Ventes par bière et par format…'); await sleep(120); }
    // 2. Factures et commandes
    step(21, 'Factures et commandes…'); const L = await J('invoices/list', {}); const lim = new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10);
    const recent = {}, dates = {};
    L.forEach(x => { const cid = name2id[nm(x.ContactComputedName)]; if (!cid) return; const c = d10(x.CreatedAt);
      if (x.Kind === 'Invoice' && c >= '2024') (dates[cid] = dates[cid] || []).push(c);
      if (c >= lim) (recent[cid] = recent[cid] || []).push([x.Kind === 'Order' ? 'O' : 'I', x.Ref, c, d10(x.DeliverAfter), x.TotalExcludingVat / 100]); });
    const unpaid = L.filter(x => x.Kind === 'Invoice' && !x.IsReconciled && x.TotalIncludingVat > 0 && nm(x.ContactComputedName) !== 'Client de passage');
    for (const x of unpaid) { const k = nm(x.ContactComputedName); if (!name2id[k]) { const s = await J('invoices/show/' + x.Id); if (s && s.Contact && s.Contact.Id) name2id[k] = s.Contact.Id; await sleep(120); } }
    // 3. Fiches clients : base clients + clients avec impayés (coordonnées, grille, prix perso, adresses)
    const unpaidIds = unpaid.map(x => String(name2id[nm(x.ContactComputedName)] || '')).filter(Boolean);
    const ids = [...new Set(prep.ids.map(String).concat(unpaidIds))]; const C = {};
    await pool(ids, 3, async id => { C[id] = await J('contacts/show/' + id); }, (d, t) => step(24 + 46 * d / t, 'Fiches clients ' + d + '/' + t + '…'));
    const info = {}; [...new Set(unpaidIds)].forEach(id => { const c = C[id]; if (!c) return; const E = c.Emails || [];
      info[id] = { ph: (c.Phones || []).map(p => ({ v: p.Value, l: p.Label || '' })), em: (E.some(e => e.Invoicing) ? E.filter(e => e.Invoicing) : E).map(e => e.Value), sp: c.SalespersonId || 0, dd: c.DirectDebitStatus || '' }; });
    // 4. Grilles tarifaires et prix personnalisés
    step(71, 'Grilles tarifaires…'); const toPrices = g => { const o = {}; (g && g.Prices || []).forEach(p => { const pr = R2P[p.RecipeId], f = K2F[p.PackageId]; if (!pr || !f) return; const v = p.Price / 1e6; o[pr + '|' + f] = Math.round((g.IncludesVat ? v / 1.2 : v) * 100) / 100; }); return o; };
    const gids = [...new Set([1, 2, 3, 4, 20, 1026].concat(prep.ids.map(id => (C[id] || {}).PriceGroupId).filter(Boolean)))]; const grids = {};
    for (const g of gids) { try { grids[g] = toPrices(await J('price_groups/show/' + g)); } catch (e) {} await sleep(100); }
    Object.keys(grids).forEach(g => { if (!Object.keys(grids[g]).length) delete grids[g]; }); // grille vide → grille pro par défaut
    const clients = {}; const ovs = prep.ids.filter(id => C[id] && C[id].PriceGroupOverride && C[id].PriceGroupOverride.Id); let o = 0;
    const perso = {}; for (const id of ovs) { try { perso[id] = toPrices(await J('price_groups/show/' + C[id].PriceGroupOverride.Id)); } catch (e) {} step(71 + 8 * (++o) / ovs.length, 'Prix personnalisés ' + o + '/' + ovs.length + '…'); await sleep(100); }
    prep.ids.forEach(id => { const c = C[id]; if (!c) return; clients[id] = { nom: nm(c.CompanyName) || nm((c.FirstName || '') + ' ' + (c.LastName || '')), adr: [nm(c.Address), nm((c.Postcode || '') + ' ' + (c.City || ''))].filter(Boolean).join(' '),
      grille: grids[c.PriceGroupId] ? c.PriceGroupId : 2, emails: (c.Emails || []).map(e => ({ v: e.Value, s: !!e.Sales, i: !!e.Invoicing, l: !!e.Supply })), perso: perso[id] || {} }; });
    // 5. Stock et commandes en attente de livraison
    step(80, 'Stocks…'); const stock = {}; (await J('stock_movements/list_aggregate')).forEach(e => { const pr = R2P[e.RecipeId], f = K2F[e.PackageId]; if (!pr || !f) return; (stock[pr] = stock[pr] || {})[f] = (stock[pr][f] || 0) + e.Quantity; });
    const open = L.filter(x => x.Kind === 'Order' && x.DeliverAfter && x.DeliveryStatus !== 'Delivered'); const res = {}; let q = 0;
    for (const x of open) { const s = await J('invoices/show/' + x.Id); (s.Entries || []).forEach(e => { const pr = R2P[e.RecipeId], f = K2F[e.PackageId]; if (!pr || !f) return; (res[pr] = res[pr] || {})[f] = (res[pr][f] || 0) + (e.Quantity || 0); });
      step(80 + 8 * (++q) / Math.max(1, open.length), 'Commandes en attente ' + q + '/' + open.length + '…'); await sleep(100); }
    if (Object.keys(stock).length < 8 || !grids[2] || Object.keys(grids[2]).length < 20 || Object.keys(clients).length < prep.ids.length * 0.8) throw new Error('Données Super G incomplètes : rien n’a été remplacé.');
    // 6. Envoi
    const now = new Date(); const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + now.getHours() + ' h ' + String(now.getMinutes()).padStart(2, '0');
    step(89, 'Envoi des stocks et des prix…'); await post('setSnap', [KEY, await gz64({ stock, res, grids, clients, date })]);
    const pay = unpaid.map(x => ({ id: x.Id, ref: x.Ref, cid: String(name2id[nm(x.ContactComputedName)] || ''), nom: nm(x.ContactComputedName), date: d10(x.CreatedAt), due: d10(x.DueAt), ttc: x.TotalIncludingVat / 100, ht: x.TotalExcludingVat / 100, pm: x.PaymentMethod || '' }));
    step(94, 'Envoi des impayés et des ventes…'); const dur = Math.round((Date.now() - P.t0) / 1000);
    await post('setSnap2', [KEY, await gz64({ at: now.toISOString(), dur, pay, info, rec: recent, rep: { cli, rec, pkg, recN, pkgN, dates } })]);
    P.log = [Object.keys(clients).length + ' clients', Object.keys(stock).length + ' bières en stock', open.length + ' commandes en attente', pay.length + ' factures non réglées'];
    finish(true, '✅ Terminé en ' + Math.round((Date.now() - P.t0) / 1000) + ' s : ' + P.log.join(', ') + '.');
  })().catch(e => finish(false, '❌ ' + (e && e.message || e)));
})();
