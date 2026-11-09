/* Synchro Super G → Espace brasserie (lecture seule côté Super G). Lancée par le favori « Synchro espace » sur app.superg.fr. */
(function () {
  if (location.hostname !== 'app.superg.fr') { alert('Ouvrez d’abord Super G (app.superg.fr), puis cliquez à nouveau sur le favori « Synchro espace ».'); return; }
  if (window.__esSync) return; if (!window.__ESK) { alert('Favori incomplet : recréez-le depuis l’onglet Paiements de l’espace.'); return; } window.__esSync = 1;
  const box = document.createElement('div'); box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#1D2420;color:#fff;font:15px/1.4 system-ui,sans-serif;padding:14px 18px;border-radius:10px;max-width:360px;box-shadow:0 6px 24px rgba(0,0,0,.3)';
  box.innerHTML = '<b>Synchro espace brasserie</b><div id="es-st" style="margin-top:6px">Démarrage…</div>'; document.body.appendChild(box);
  const show = (m, end) => { box.querySelector('#es-st').innerHTML = m + (end ? '<div style="margin-top:8px"><button style="font:inherit;padding:4px 10px;border-radius:6px;border:0;cursor:pointer" onclick="this.closest(\'div\').parentNode.remove()">Fermer</button></div>' : ''); if (end) window.__esSync = 0; };
  (async () => {
  const ESP = 'https://script.google.com/macros/s/AKfycbyzmQ_9y0Sc7fpRuOF4htqSDNCDkZUMUy-HAKTikw7ORMpiltBntdZKg_3fpkgictI/exec', KEY = window.__ESK || '';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const J = async (p, b) => { for (let k = 0; k < 6; k++) { const r = await fetch('/api/v1/' + p, { method: b === undefined ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) });
    if (r.status === 429) { await sleep(6000 * (k + 1)); continue; } const t = await r.text(); try { return JSON.parse(t); } catch (e) { throw new Error(p + ' ' + r.status); } } throw new Error(p + ' 429 répété'); };
  const d10 = s => s ? String(s).slice(0, 10) : '';
  const DASH = o => J('dashboard/show', Object.assign({ Per: 'month', CreatedDateAfter: '2024-01-01', CreatedDateBefore: '2027-01-01', FinancialYearEndMonth: 12, Split: 'ContactAll', Categories: [], RecipeIds: [], PriceGroupIds: [], PackageIds: [], SalesPersonIds: [], TagIds: [[]], NullContact: false, ContactId: 0 }, o));
  const t0 = Date.now(), log = []; const st = m => show('En cours : ' + m + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)…');
  try {
    // 1. CA / volume par client et par mois
    st('ventes par client'); const cli = {}, name2id = {};
    (await DASH({})).forEach(m => { if (!m.Date || m.Date < '2024') return; const ym = m.Date.slice(0, 7);
      m.Splits.forEach(s => { if (!s.Id) return; const c = cli[s.Id] = cli[s.Id] || { n: String(s.Label || '').trim(), m: {} }; c.m[ym] = [s.TotalExcludingVat, s.TotalVolume]; name2id[c.n] = s.Id; }); });
    // 2. Par bière et par conditionnement : une requête par bière / par format, ventilée par client
    const recN = {}, pkgN = {}, rec = {}, pkg = {};
    (await DASH({ Split: 'Recipe' })).forEach(m => { if (m.Date && m.Date >= '2024') m.Splits.forEach(s => { if (s.Id) recN[s.Id] = s.Label; }); });
    (await DASH({ Split: 'Package' })).forEach(m => { if (m.Date && m.Date >= '2024') m.Splits.forEach(s => { if (s.Id) pkgN[s.Id] = s.Label; }); });
    const fill = (dst, key, rows) => rows.forEach(m => { if (!m.Date || m.Date < '2024') return; const ym = m.Date.slice(0, 7);
      m.Splits.forEach(s => { if (!s.Id) return; const a = dst[s.Id] = dst[s.Id] || {}; const o = a[key] = a[key] || {}; o[ym] = [s.TotalExcludingVat, s.TotalVolume]; }); });
    let i = 0; for (const id of Object.keys(recN)) { st('ventes par bière ' + (++i) + '/' + Object.keys(recN).length); fill(rec, id, await DASH({ RecipeIds: [+id] })); await sleep(150); }
    for (const id of Object.keys(pkgN)) { st('ventes par format'); fill(pkg, id, await DASH({ PackageIds: [+id] })); await sleep(150); }
    log.push('clients ' + Object.keys(cli).length + ', bières ' + Object.keys(recN).length + ', formats ' + Object.keys(pkgN).length + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
    // 3. Factures et commandes
    st('factures'); const L = await J('invoices/list', {}); const lim = new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10);
    const recent = {}, dates = {};
    L.forEach(x => { const cid = name2id[String(x.ContactComputedName || '').trim()]; if (!cid) return; const c = d10(x.CreatedAt);
      if (x.Kind === 'Invoice' && c >= '2024') (dates[cid] = dates[cid] || []).push(c);
      if (c >= lim) (recent[cid] = recent[cid] || []).push([x.Kind === 'Order' ? 'O' : 'I', x.Ref, c, d10(x.DeliverAfter), x.TotalExcludingVat / 100]); });
    const unpaid = L.filter(x => x.Kind === 'Invoice' && !x.IsReconciled && x.TotalIncludingVat > 0 && String(x.ContactComputedName || '').trim() !== 'Client de passage');
    // Facture sans client connu (avant 2024) : on lit la facture pour retrouver le client
    for (const x of unpaid) { const n = String(x.ContactComputedName || '').trim(); if (!name2id[n]) { const s = await J('invoices/show/' + x.Id); if (s && s.Contact && s.Contact.Id) name2id[n] = s.Contact.Id; await sleep(150); } }
    // 4. Coordonnées des clients avec impayés
    const info = {}; const cids = [...new Set(unpaid.map(x => name2id[String(x.ContactComputedName || '').trim()]).filter(Boolean))];
    let n = 0; for (const cid of cids) { st('fiches clients ' + (++n) + '/' + cids.length); const C = await J('contacts/show/' + cid); const E = C.Emails || [];
      info[cid] = { ph: (C.Phones || []).map(p => ({ v: p.Value, l: p.Label || '' })), em: (E.some(e => e.Invoicing) ? E.filter(e => e.Invoicing) : E).map(e => e.Value), sp: C.SalespersonId || 0, dd: C.DirectDebitStatus || '' }; await sleep(150); }
    const pay = unpaid.map(x => ({ id: x.Id, ref: x.Ref, cid: String(name2id[String(x.ContactComputedName || '').trim()] || ''), nom: String(x.ContactComputedName || '').trim(), date: d10(x.CreatedAt), due: d10(x.DueAt), ttc: x.TotalIncludingVat / 100, ht: x.TotalExcludingVat / 100, pm: x.PaymentMethod || '' }));
    log.push('impayés ' + pay.length + ' (' + cids.length + ' clients, ' + pay.filter(p => !p.cid).length + ' sans fiche)');
    // 5. Envoi compressé
    const js = JSON.stringify({ at: new Date().toISOString(), pay, info, rec: recent, rep: { cli, rec, pkg, recN, pkgN, dates } });
    const gz = await new Response(new Blob([js]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u8 = new Uint8Array(gz); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    st('envoi à l’espace'); const rr = await fetch(ESP, { method: 'POST', body: JSON.stringify({ fn: 'setSnap2', args: [KEY, btoa(bin)] }) }); const tx = await rr.text();
    let ok = false; try { ok = JSON.parse(tx).ok && JSON.parse(tx).r.ok; } catch (e) {} if (!ok) throw new Error('réponse de l’espace : ' + tx.slice(0, 200)); log.push('Durée ' + Math.round((Date.now() - t0) / 1000) + ' s');
  } catch (e) { show('❌ ' + e, true); return; }
  
    show('✅ Terminé : ' + log.join('<br>'), true);
  })().catch(e => show('❌ ' + e, true));
})();
