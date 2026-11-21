const encoder = new TextEncoder();
const decoder = new TextDecoder();

const DEFAULT_SETTINGS = {
  submissionDeadline: '2026-11-27T22:59:59.000Z',
  voteStart: '2026-11-28T09:00:00.000Z',
  voteEnd: '2026-11-29T17:00:00.000Z',
  runoffStart: '2026-11-29T17:15:00.000Z',
  runoffEnd: '2026-11-29T19:00:00.000Z',
  runoffEntries: [],
  podium: null,
  resultsPublished: false
};

const MAX_SUBMISSION_IMAGES = 5;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_FINAL_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_SETTING_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

class HttpError extends Error {
  constructor(status, message, code = 'request_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

function normalizeName(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return new Uint8Array(signature);
}

async function safeEqual(first, second) {
  const [a, b] = await Promise.all([sha256(String(first)), sha256(String(second))]);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function createToken(payload, secret) {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await hmac(secret, body));
  return `${body}.${signature}`;
}

async function readToken(token, secret, expectedType) {
  if (!token || !secret) throw new HttpError(401, 'Accès non autorisé.', 'unauthorized');
  const [body, signature, extra] = String(token).split('.');
  if (!body || !signature || extra) throw new HttpError(401, 'Session invalide.', 'invalid_session');
  const expected = toBase64Url(await hmac(secret, body));
  if (!(await safeEqual(signature, expected))) throw new HttpError(401, 'Session invalide.', 'invalid_session');
  let payload;
  try {
    payload = JSON.parse(decoder.decode(fromBase64Url(body)));
  } catch {
    throw new HttpError(401, 'Session invalide.', 'invalid_session');
  }
  if (payload.type !== expectedType || Number(payload.exp) < Date.now()) {
    throw new HttpError(401, 'La session a expiré.', 'expired_session');
  }
  return payload;
}

function bearerToken(request) {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function queryToken(url) {
  return url.searchParams.get('token') ?? '';
}

function requireBindings(env, needsUploads = false) {
  if (!env.CONTEST_DB) throw new HttpError(503, 'La base du concours n’est pas encore activée.', 'database_unavailable');
  if (needsUploads && !env.CONTEST_UPLOADS) {
    throw new HttpError(503, 'Le stockage des images n’est pas encore activé.', 'storage_unavailable');
  }
  if (!env.SESSION_SECRET) throw new HttpError(503, 'La sécurité du concours n’est pas encore configurée.', 'security_unavailable');
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Le formulaire envoyé est invalide.', 'invalid_json');
  }
}

async function getSettings(db) {
  const settings = { ...DEFAULT_SETTINGS };
  const result = await db.prepare('SELECT key, value FROM contest_settings').all();
  for (const row of result.results ?? []) {
    if (!ALLOWED_SETTING_KEYS.has(row.key)) continue;
    if (['runoffEntries', 'podium', 'resultsPublished'].includes(row.key)) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = DEFAULT_SETTINGS[row.key];
      }
    } else {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

async function saveSetting(db, key, value) {
  if (!ALLOWED_SETTING_KEYS.has(key)) throw new HttpError(400, 'Réglage inconnu.', 'invalid_setting');
  const serialized = typeof value === 'string' && !['runoffEntries', 'podium', 'resultsPublished'].includes(key)
    ? value
    : JSON.stringify(value);
  await db.prepare(`
    INSERT INTO contest_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(key, serialized).run();
}

function contestPhase(settings, now = Date.now()) {
  if (settings.resultsPublished) return 'results';
  if (now <= Date.parse(settings.submissionDeadline)) return 'submissions';
  if (now < Date.parse(settings.voteStart)) return 'preparing';
  if (now <= Date.parse(settings.voteEnd)) return 'voting';
  if ((settings.runoffEntries?.length ?? 0) > 1 && now >= Date.parse(settings.runoffStart) && now <= Date.parse(settings.runoffEnd)) {
    return 'runoff';
  }
  if ((settings.runoffEntries?.length ?? 0) > 1 && now < Date.parse(settings.runoffStart)) return 'runoff_pending';
  return 'closed';
}

function randomCode(length = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let value = '';
  for (const byte of bytes) value += alphabet[byte % alphabet.length];
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

async function memberVoteCode(member, secret) {
  if (!secret) throw new HttpError(503, 'Les codes de vote ne sont pas encore configurés.', 'vote_codes_unavailable');
  const bytes = await hmac(secret, `${member.id}:${member.normalized_name}`);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let index = 0; index < 10; index += 1) value += alphabet[bytes[index] % alphabet.length];
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

async function requireAdmin(request, env, url = new URL(request.url)) {
  const token = bearerToken(request) || queryToken(url);
  return readToken(token, env.SESSION_SECRET, 'admin');
}

async function requireSubmission(request, env, url = new URL(request.url)) {
  const token = bearerToken(request) || queryToken(url);
  return readToken(token, env.SESSION_SECRET, 'submission');
}

async function requireVoter(request, env, url = new URL(request.url)) {
  const token = bearerToken(request) || queryToken(url);
  return readToken(token, env.SESSION_SECRET, 'voter');
}

function imageResponse(object, isPublic = false) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set('etag', object.httpEtag ?? '');
  headers.set('cache-control', isPublic ? 'public, max-age=3600' : 'private, no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
}

async function getSubmissionForMember(db, memberId) {
  return db.prepare(`
    SELECT s.*, m.name AS member_name, m.rank AS member_rank
    FROM contest_submissions s
    JOIN contest_members m ON m.id = s.member_id
    WHERE s.member_id = ?
  `).bind(memberId).first();
}

async function listSubmissionImages(db, submissionId) {
  const result = await db.prepare(`
    SELECT id, original_name, mime_type, size_bytes, sort_order, created_at
    FROM contest_submission_images
    WHERE submission_id = ?
    ORDER BY sort_order, created_at
  `).bind(submissionId).all();
  return result.results ?? [];
}

async function publishedEntries(db) {
  const result = await db.prepare(`
    SELECT s.id, s.member_id, s.display_label, s.final_image_key, s.final_image_mime, m.name AS member_name
    FROM contest_submissions s
    JOIN contest_members m ON m.id = s.member_id
    WHERE s.published = 1 AND s.final_image_key IS NOT NULL
    ORDER BY s.display_label, s.created_at
  `).all();
  return result.results ?? [];
}

async function calculateResults(db) {
  const firstRound = await db.prepare(`
    SELECT submission_id, SUM(points) AS points
    FROM (
      SELECT first_submission_id AS submission_id, 3 AS points FROM contest_votes WHERE round = 1
      UNION ALL
      SELECT second_submission_id AS submission_id, 2 AS points FROM contest_votes WHERE round = 1 AND second_submission_id IS NOT NULL
      UNION ALL
      SELECT third_submission_id AS submission_id, 1 AS points FROM contest_votes WHERE round = 1 AND third_submission_id IS NOT NULL
    ) ranked_votes
    GROUP BY submission_id
    ORDER BY points DESC, submission_id
  `).all();
  const secondRound = await db.prepare(`
    SELECT first_submission_id AS submission_id, COUNT(*) AS votes
    FROM contest_votes
    WHERE round = 2
    GROUP BY first_submission_id
    ORDER BY votes DESC, submission_id
  `).all();
  const ballotCounts = await db.prepare(`
    SELECT round, COUNT(*) AS ballots FROM contest_votes GROUP BY round ORDER BY round
  `).all();
  return {
    firstRound: firstRound.results ?? [],
    secondRound: secondRound.results ?? [],
    ballots: ballotCounts.results ?? []
  };
}

async function publicState(env) {
  const settings = await getSettings(env.CONTEST_DB);
  const counts = await env.CONTEST_DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM contest_members) AS members,
      (SELECT COUNT(*) FROM contest_submissions) AS submissions,
      (SELECT COUNT(*) FROM contest_submissions WHERE published = 1) AS published,
      (SELECT COUNT(*) FROM contest_votes WHERE round = 1) AS ballots
  `).first();
  const response = {
    configured: true,
    phase: contestPhase(settings),
    dates: {
      submissionDeadline: settings.submissionDeadline,
      voteStart: settings.voteStart,
      voteEnd: settings.voteEnd,
      runoffStart: settings.runoffStart,
      runoffEnd: settings.runoffEnd
    },
    counts
  };
  if (settings.resultsPublished && settings.podium) {
    const entries = await publishedEntries(env.CONTEST_DB);
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const tokenless = entry => entry ? {
      id: entry.id,
      label: entry.display_label,
      memberName: entry.member_name,
      imageUrl: `/api/contest/media/final/${entry.id}`
    } : null;
    response.results = {
      podium: {
        first: tokenless(byId.get(settings.podium.first)),
        second: tokenless(byId.get(settings.podium.second)),
        third: tokenless(byId.get(settings.podium.third))
      },
      creations: entries.map(tokenless)
    };
  }
  return response;
}

async function handleAdminLogin(request, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    throw new HttpError(503, 'L’accès administrateur n’est pas encore configuré.', 'admin_unavailable');
  }
  const body = await requestBody(request);
  if (!(await safeEqual(body.password ?? '', env.ADMIN_PASSWORD))) {
    throw new HttpError(401, 'Mot de passe incorrect.', 'invalid_admin_password');
  }
  const token = await createToken({ type: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 }, env.SESSION_SECRET);
  return json({ token, expiresIn: 8 * 60 * 60 });
}

async function handleMemberImport(request, env) {
  await requireAdmin(request, env);
  const body = await requestBody(request);
  if (!Array.isArray(body.members) || body.members.length < 1 || body.members.length > 300) {
    throw new HttpError(400, 'La liste des membres doit contenir entre 1 et 300 joueurs.', 'invalid_members');
  }
  const seen = new Set();
  const statements = [];
  for (const member of body.members) {
    const name = String(member.name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
    const normalized = normalizeName(name);
    const rank = String(member.rank ?? '').toUpperCase();
    if (!name || name.length > 80 || !/^R[1-5]$/.test(rank) || seen.has(normalized)) {
      throw new HttpError(400, `Membre invalide ou en double : ${name || 'sans nom'}.`, 'invalid_member');
    }
    seen.add(normalized);
    statements.push(env.CONTEST_DB.prepare(`
      INSERT INTO contest_members (name, normalized_name, rank, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(normalized_name) DO UPDATE SET
        name = excluded.name,
        rank = excluded.rank,
        updated_at = CURRENT_TIMESTAMP
    `).bind(name, normalized, rank));
  }
  await env.CONTEST_DB.batch(statements);
  return json({ imported: statements.length });
}

async function handleAdminMembers(request, env) {
  await requireAdmin(request, env);
  const result = await env.CONTEST_DB.prepare(`
    SELECT id, name, rank, created_at, updated_at
    FROM contest_members
    ORDER BY name COLLATE NOCASE
  `).all();
  return json({ members: result.results ?? [] });
}

async function handleVoteCodes(request, env) {
  await requireAdmin(request, env);
  const result = await env.CONTEST_DB.prepare(`
    SELECT id, name, normalized_name, rank
    FROM contest_members
    ORDER BY name COLLATE NOCASE
  `).all();
  const rows = [['Nom du joueur', 'Grade', 'Code personnel']];
  for (const member of result.results ?? []) {
    rows.push([member.name, member.rank, await memberVoteCode(member, env.VOTE_CODE_SECRET)]);
  }
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  return new Response(`\uFEFF${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="codes-vote-us4a.csv"',
      'cache-control': 'no-store'
    }
  });
}

async function handleAdminEntries(request, env) {
  const admin = await requireAdmin(request, env);
  const entriesResult = await env.CONTEST_DB.prepare(`
    SELECT s.id, s.member_id, s.display_label, s.published, s.final_image_key, s.final_image_mime,
           s.created_at, s.updated_at, m.name AS member_name, m.rank AS member_rank
    FROM contest_submissions s
    JOIN contest_members m ON m.id = s.member_id
    ORDER BY s.created_at
  `).all();
  const entries = entriesResult.results ?? [];
  if (!entries.length) return json({ entries: [], settings: await getSettings(env.CONTEST_DB) });
  const imagesResult = await env.CONTEST_DB.prepare(`
    SELECT id, submission_id, original_name, mime_type, size_bytes, sort_order, created_at
    FROM contest_submission_images
    ORDER BY submission_id, sort_order, created_at
  `).all();
  const token = bearerToken(request) || await createToken(admin, env.SESSION_SECRET);
  const imagesByEntry = new Map();
  for (const image of imagesResult.results ?? []) {
    if (!imagesByEntry.has(image.submission_id)) imagesByEntry.set(image.submission_id, []);
    imagesByEntry.get(image.submission_id).push({
      ...image,
      url: `/api/contest/media/admin/image/${image.id}?token=${encodeURIComponent(token)}`
    });
  }
  return json({
    entries: entries.map(entry => ({
      ...entry,
      images: imagesByEntry.get(entry.id) ?? [],
      finalImageUrl: entry.final_image_key
        ? `/api/contest/media/admin/final/${entry.id}?token=${encodeURIComponent(token)}`
        : null
    })),
    settings: await getSettings(env.CONTEST_DB),
    results: await calculateResults(env.CONTEST_DB)
  });
}

async function handleAdminFinalUpload(request, env) {
  await requireAdmin(request, env);
  const form = await request.formData();
  const submissionId = String(form.get('submissionId') ?? '');
  const file = form.get('file');
  if (!submissionId || !file || typeof file.arrayBuffer !== 'function') {
    throw new HttpError(400, 'Le montage final est manquant.', 'missing_final_image');
  }
  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_FINAL_BYTES) {
    throw new HttpError(400, 'Le montage doit être une image JPG, PNG ou WebP de 10 Mo maximum.', 'invalid_final_image');
  }
  const submission = await env.CONTEST_DB.prepare('SELECT * FROM contest_submissions WHERE id = ?').bind(submissionId).first();
  if (!submission) throw new HttpError(404, 'Participation introuvable.', 'submission_not_found');
  const key = `contest/finals/${submissionId}/${crypto.randomUUID()}`;
  await env.CONTEST_UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { submissionId }
  });
  try {
    await env.CONTEST_DB.prepare(`
      UPDATE contest_submissions
      SET final_image_key = ?, final_image_mime = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(key, file.type, submissionId).run();
  } catch (error) {
    await env.CONTEST_UPLOADS.delete(key);
    throw error;
  }
  if (submission.final_image_key) await env.CONTEST_UPLOADS.delete(submission.final_image_key);
  return json({ uploaded: true });
}

async function handleAdminEntryPublish(request, env) {
  await requireAdmin(request, env);
  const body = await requestBody(request);
  const submissionId = String(body.submissionId ?? '');
  const label = String(body.label ?? '').trim().slice(0, 40);
  const published = Boolean(body.published);
  const submission = await env.CONTEST_DB.prepare('SELECT final_image_key FROM contest_submissions WHERE id = ?').bind(submissionId).first();
  if (!submission) throw new HttpError(404, 'Participation introuvable.', 'submission_not_found');
  if (published && !submission.final_image_key) {
    throw new HttpError(400, 'Ajoutez d’abord le montage final.', 'final_image_required');
  }
  if (published && !label) throw new HttpError(400, 'Indiquez un nom anonyme, par exemple « Château A ».', 'label_required');
  await env.CONTEST_DB.prepare(`
    UPDATE contest_submissions
    SET published = ?, display_label = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(published ? 1 : 0, label || null, submissionId).run();
  return json({ updated: true });
}

async function handleAdminSettings(request, env) {
  await requireAdmin(request, env);
  const body = await requestBody(request);
  if (!body.settings || typeof body.settings !== 'object') {
    throw new HttpError(400, 'Aucun réglage fourni.', 'missing_settings');
  }
  for (const [key, value] of Object.entries(body.settings)) {
    if (!ALLOWED_SETTING_KEYS.has(key)) throw new HttpError(400, `Réglage inconnu : ${key}.`, 'invalid_setting');
    if (['submissionDeadline', 'voteStart', 'voteEnd', 'runoffStart', 'runoffEnd'].includes(key) && Number.isNaN(Date.parse(value))) {
      throw new HttpError(400, `Date invalide : ${key}.`, 'invalid_date');
    }
    if (key === 'runoffEntries' && (!Array.isArray(value) || value.length > 20)) {
      throw new HttpError(400, 'La sélection du second tour est invalide.', 'invalid_runoff');
    }
    await saveSetting(env.CONTEST_DB, key, value);
  }
  return json({ settings: await getSettings(env.CONTEST_DB) });
}

async function handleAdminPodium(request, env) {
  await requireAdmin(request, env);
  const body = await requestBody(request);
  const podium = { first: body.first, second: body.second, third: body.third };
  const ids = Object.values(podium).filter(Boolean);
  if (ids.length !== 3 || new Set(ids).size !== 3) {
    throw new HttpError(400, 'Sélectionnez trois créations différentes.', 'invalid_podium');
  }
  const placeholders = ids.map(() => '?').join(',');
  const found = await env.CONTEST_DB.prepare(`
    SELECT COUNT(*) AS count FROM contest_submissions
    WHERE published = 1 AND id IN (${placeholders})
  `).bind(...ids).first();
  if (Number(found?.count) !== 3) throw new HttpError(400, 'Une création du podium n’est pas publiée.', 'invalid_podium');
  await saveSetting(env.CONTEST_DB, 'podium', podium);
  await saveSetting(env.CONTEST_DB, 'resultsPublished', true);
  return json({ published: true, podium });
}

async function handleSubmissionStart(request, env) {
  const settings = await getSettings(env.CONTEST_DB);
  if (Date.now() > Date.parse(settings.submissionDeadline)) {
    throw new HttpError(403, 'Les participations sont maintenant closes.', 'submissions_closed');
  }
  const body = await requestBody(request);
  if (!(await safeEqual(String(body.accessCode ?? '').trim().toUpperCase(), String(env.ALLIANCE_ACCESS_CODE ?? 'US4A').trim().toUpperCase()))) {
    throw new HttpError(401, 'Le code de l’alliance est incorrect.', 'invalid_alliance_code');
  }
  const normalized = normalizeName(body.name);
  const member = await env.CONTEST_DB.prepare(`
    SELECT id, name, normalized_name, rank FROM contest_members WHERE normalized_name = ?
  `).bind(normalized).first();
  if (!member) throw new HttpError(404, 'Ce nom ne figure pas dans la liste des membres.', 'member_not_found');
  const existing = await getSubmissionForMember(env.CONTEST_DB, member.id);
  if (existing) throw new HttpError(409, 'Une participation existe déjà. Utilisez votre code personnel pour la modifier.', 'submission_exists');
  const submissionId = crypto.randomUUID();
  const editCode = randomCode();
  await env.CONTEST_DB.prepare(`
    INSERT INTO contest_submissions (id, member_id, edit_code_hash)
    VALUES (?, ?, ?)
  `).bind(submissionId, member.id, await sha256(editCode)).run();
  const token = await createToken({
    type: 'submission',
    memberId: member.id,
    submissionId,
    exp: Date.parse(settings.submissionDeadline) + 24 * 60 * 60 * 1000
  }, env.SESSION_SECRET);
  return json({ token, editCode, member: { name: member.name, rank: member.rank }, submissionId }, 201);
}

async function handleSubmissionLogin(request, env) {
  const body = await requestBody(request);
  const member = await env.CONTEST_DB.prepare(`
    SELECT id, name, normalized_name, rank FROM contest_members WHERE normalized_name = ?
  `).bind(normalizeName(body.name)).first();
  if (!member) throw new HttpError(404, 'Participation introuvable.', 'submission_not_found');
  const submission = await getSubmissionForMember(env.CONTEST_DB, member.id);
  if (!submission || !(await safeEqual(await sha256(String(body.editCode ?? '').trim().toUpperCase()), submission.edit_code_hash))) {
    throw new HttpError(401, 'Nom ou code personnel incorrect.', 'invalid_edit_code');
  }
  const settings = await getSettings(env.CONTEST_DB);
  const token = await createToken({
    type: 'submission',
    memberId: member.id,
    submissionId: submission.id,
    exp: Date.parse(settings.submissionDeadline) + 24 * 60 * 60 * 1000
  }, env.SESSION_SECRET);
  return json({ token, member: { name: member.name, rank: member.rank }, submissionId: submission.id });
}

async function handleSubmissionGet(request, env) {
  const session = await requireSubmission(request, env);
  const submission = await getSubmissionForMember(env.CONTEST_DB, session.memberId);
  if (!submission || submission.id !== session.submissionId) throw new HttpError(404, 'Participation introuvable.', 'submission_not_found');
  const token = bearerToken(request);
  const images = (await listSubmissionImages(env.CONTEST_DB, submission.id)).map(image => ({
    ...image,
    url: `/api/contest/media/submission/${image.id}?token=${encodeURIComponent(token)}`
  }));
  return json({
    submission: {
      id: submission.id,
      memberName: submission.member_name,
      memberRank: submission.member_rank,
      updatedAt: submission.updated_at,
      locked: Date.now() > Date.parse((await getSettings(env.CONTEST_DB)).submissionDeadline),
      images
    }
  });
}

async function handleSubmissionImageUpload(request, env) {
  const session = await requireSubmission(request, env);
  const settings = await getSettings(env.CONTEST_DB);
  if (Date.now() > Date.parse(settings.submissionDeadline)) {
    throw new HttpError(403, 'La date limite est dépassée.', 'submissions_closed');
  }
  const count = await env.CONTEST_DB.prepare(`
    SELECT COUNT(*) AS count FROM contest_submission_images WHERE submission_id = ?
  `).bind(session.submissionId).first();
  if (Number(count?.count) >= MAX_SUBMISSION_IMAGES) {
    throw new HttpError(400, 'Vous avez déjà déposé cinq images.', 'image_limit_reached');
  }
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || !IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, 'Utilisez une image JPG, PNG ou WebP de 3 Mo maximum.', 'invalid_image');
  }
  const imageId = crypto.randomUUID();
  const key = `contest/submissions/${session.submissionId}/${imageId}`;
  const nextOrder = Number(count?.count ?? 0) + 1;
  await env.CONTEST_UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { submissionId: session.submissionId, memberId: String(session.memberId) }
  });
  try {
    await env.CONTEST_DB.prepare(`
      INSERT INTO contest_submission_images
        (id, submission_id, object_key, original_name, mime_type, size_bytes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(imageId, session.submissionId, key, String(file.name ?? 'capture'), file.type, file.size, nextOrder).run();
    await env.CONTEST_DB.prepare(`
      UPDATE contest_submissions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(session.submissionId).run();
  } catch (error) {
    await env.CONTEST_UPLOADS.delete(key);
    throw error;
  }
  return json({ uploaded: true, imageId }, 201);
}

async function handleSubmissionImageDelete(request, env, imageId) {
  const session = await requireSubmission(request, env);
  const settings = await getSettings(env.CONTEST_DB);
  if (Date.now() > Date.parse(settings.submissionDeadline)) {
    throw new HttpError(403, 'La date limite est dépassée.', 'submissions_closed');
  }
  const image = await env.CONTEST_DB.prepare(`
    SELECT * FROM contest_submission_images WHERE id = ? AND submission_id = ?
  `).bind(imageId, session.submissionId).first();
  if (!image) throw new HttpError(404, 'Image introuvable.', 'image_not_found');
  await env.CONTEST_UPLOADS.delete(image.object_key);
  await env.CONTEST_DB.prepare('DELETE FROM contest_submission_images WHERE id = ?').bind(imageId).run();
  return json({ deleted: true });
}

async function handleVoteLogin(request, env) {
  const body = await requestBody(request);
  const member = await env.CONTEST_DB.prepare(`
    SELECT id, name, normalized_name, rank FROM contest_members WHERE normalized_name = ?
  `).bind(normalizeName(body.name)).first();
  if (!member) throw new HttpError(401, 'Nom ou code de vote incorrect.', 'invalid_vote_login');
  const expected = await memberVoteCode(member, env.VOTE_CODE_SECRET);
  if (!(await safeEqual(String(body.code ?? '').trim().toUpperCase(), expected))) {
    throw new HttpError(401, 'Nom ou code de vote incorrect.', 'invalid_vote_login');
  }
  const settings = await getSettings(env.CONTEST_DB);
  const ownSubmission = await getSubmissionForMember(env.CONTEST_DB, member.id);
  const token = await createToken({
    type: 'voter',
    memberId: member.id,
    ownSubmissionId: ownSubmission?.id ?? null,
    exp: Math.max(Date.now() + 60 * 60 * 1000, Date.parse(settings.runoffEnd) + 60 * 60 * 1000)
  }, env.SESSION_SECRET);
  return json({
    token,
    member: { name: member.name, rank: member.rank },
    phase: contestPhase(settings),
    ownSubmissionId: ownSubmission?.id ?? null
  });
}

async function handleVoteGallery(request, env) {
  const voter = await requireVoter(request, env);
  const settings = await getSettings(env.CONTEST_DB);
  const phase = contestPhase(settings);
  if (!['voting', 'runoff', 'runoff_pending', 'closed', 'results'].includes(phase)) {
    throw new HttpError(403, 'La galerie de vote n’est pas encore ouverte.', 'gallery_closed');
  }
  const token = bearerToken(request);
  let entries = await publishedEntries(env.CONTEST_DB);
  if (phase === 'runoff' || phase === 'runoff_pending') {
    const allowed = new Set(settings.runoffEntries ?? []);
    entries = entries.filter(entry => allowed.has(entry.id));
  }
  const currentRound = phase === 'runoff' || phase === 'runoff_pending' ? 2 : 1;
  const ballot = await env.CONTEST_DB.prepare(`
    SELECT first_submission_id, second_submission_id, third_submission_id
    FROM contest_votes WHERE member_id = ? AND round = ?
  `).bind(voter.memberId, currentRound).first();
  return json({
    phase,
    round: currentRound,
    ownSubmissionId: voter.ownSubmissionId,
    entries: entries.map(entry => ({
      id: entry.id,
      label: entry.display_label,
      imageUrl: `/api/contest/media/final/${entry.id}?token=${encodeURIComponent(token)}`,
      canVote: entry.id !== voter.ownSubmissionId
    })),
    ballot: ballot ? {
      first: ballot.first_submission_id,
      second: ballot.second_submission_id,
      third: ballot.third_submission_id
    } : null
  });
}

async function handleVoteCast(request, env) {
  const voter = await requireVoter(request, env);
  const settings = await getSettings(env.CONTEST_DB);
  const phase = contestPhase(settings);
  const body = await requestBody(request);
  const entries = await publishedEntries(env.CONTEST_DB);
  const publishedIds = new Set(entries.map(entry => entry.id));
  if (phase === 'voting') {
    const picks = [body.first, body.second, body.third].map(String);
    if (new Set(picks).size !== 3 || picks.some(id => !publishedIds.has(id))) {
      throw new HttpError(400, 'Classez trois créations différentes.', 'invalid_ballot');
    }
    if (voter.ownSubmissionId && picks.includes(voter.ownSubmissionId)) {
      throw new HttpError(400, 'Vous ne pouvez pas voter pour votre propre château.', 'self_vote');
    }
    await env.CONTEST_DB.prepare(`
      INSERT INTO contest_votes
        (member_id, round, first_submission_id, second_submission_id, third_submission_id)
      VALUES (?, 1, ?, ?, ?)
      ON CONFLICT(member_id, round) DO UPDATE SET
        first_submission_id = excluded.first_submission_id,
        second_submission_id = excluded.second_submission_id,
        third_submission_id = excluded.third_submission_id,
        updated_at = CURRENT_TIMESTAMP
    `).bind(voter.memberId, ...picks).run();
    return json({ saved: true, round: 1 });
  }
  if (phase === 'runoff') {
    const choice = String(body.first ?? '');
    const allowed = new Set(settings.runoffEntries ?? []);
    if (!allowed.has(choice) || !publishedIds.has(choice)) {
      throw new HttpError(400, 'Choisissez une création du second tour.', 'invalid_runoff_ballot');
    }
    if (voter.ownSubmissionId && choice === voter.ownSubmissionId) {
      throw new HttpError(400, 'Vous ne pouvez pas voter pour votre propre château.', 'self_vote');
    }
    await env.CONTEST_DB.prepare(`
      INSERT INTO contest_votes (member_id, round, first_submission_id)
      VALUES (?, 2, ?)
      ON CONFLICT(member_id, round) DO UPDATE SET
        first_submission_id = excluded.first_submission_id,
        second_submission_id = NULL,
        third_submission_id = NULL,
        updated_at = CURRENT_TIMESTAMP
    `).bind(voter.memberId, choice).run();
    return json({ saved: true, round: 2 });
  }
  throw new HttpError(403, 'Le vote n’est pas ouvert.', 'voting_closed');
}

async function handleSubmissionMedia(request, env, url, imageId) {
  const session = await requireSubmission(request, env, url);
  const image = await env.CONTEST_DB.prepare(`
    SELECT * FROM contest_submission_images WHERE id = ? AND submission_id = ?
  `).bind(imageId, session.submissionId).first();
  if (!image) throw new HttpError(404, 'Image introuvable.', 'image_not_found');
  const object = await env.CONTEST_UPLOADS.get(image.object_key);
  if (!object) throw new HttpError(404, 'Fichier introuvable.', 'file_not_found');
  return imageResponse(object);
}

async function handleAdminImageMedia(request, env, url, imageId) {
  await requireAdmin(request, env, url);
  const image = await env.CONTEST_DB.prepare('SELECT object_key FROM contest_submission_images WHERE id = ?').bind(imageId).first();
  if (!image) throw new HttpError(404, 'Image introuvable.', 'image_not_found');
  const object = await env.CONTEST_UPLOADS.get(image.object_key);
  if (!object) throw new HttpError(404, 'Fichier introuvable.', 'file_not_found');
  return imageResponse(object);
}

async function handleFinalMedia(request, env, url, submissionId, adminOnly = false) {
  let isPublic = false;
  if (adminOnly) {
    await requireAdmin(request, env, url);
  } else {
    const settings = await getSettings(env.CONTEST_DB);
    isPublic = Boolean(settings.resultsPublished);
    if (!isPublic) {
      const token = queryToken(url);
      let authorized = false;
      try {
        await readToken(token, env.SESSION_SECRET, 'voter');
        authorized = true;
      } catch {
        try {
          await readToken(token, env.SESSION_SECRET, 'admin');
          authorized = true;
        } catch {
          authorized = false;
        }
      }
      if (!authorized) throw new HttpError(401, 'Accès non autorisé.', 'unauthorized');
    }
  }
  const submission = await env.CONTEST_DB.prepare(`
    SELECT final_image_key, published FROM contest_submissions WHERE id = ?
  `).bind(submissionId).first();
  if (!submission?.final_image_key || (!adminOnly && !submission.published)) {
    throw new HttpError(404, 'Montage introuvable.', 'final_not_found');
  }
  const object = await env.CONTEST_UPLOADS.get(submission.final_image_key);
  if (!object) throw new HttpError(404, 'Fichier introuvable.', 'file_not_found');
  return imageResponse(object, isPublic);
}

function routePath(url) {
  const prefix = '/api/contest';
  const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  return path.replace(/^\/+|\/+$/g, '');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = routePath(url);
  const segments = path ? path.split('/').map(decodeURIComponent) : [];
  const method = request.method.toUpperCase();

  try {
    if (method === 'OPTIONS') return new Response(null, { status: 204 });

    if (method === 'GET' && (path === '' || path === 'public')) {
      if (!env.CONTEST_DB) {
        return json({
          configured: false,
          phase: 'setup',
          dates: {
            submissionDeadline: DEFAULT_SETTINGS.submissionDeadline,
            voteStart: DEFAULT_SETTINGS.voteStart,
            voteEnd: DEFAULT_SETTINGS.voteEnd,
            runoffStart: DEFAULT_SETTINGS.runoffStart,
            runoffEnd: DEFAULT_SETTINGS.runoffEnd
          }
        });
      }
      return json(await publicState(env));
    }

    requireBindings(env, path.includes('image') || path.includes('final') || path.startsWith('media/'));

    if (method === 'POST' && path === 'admin/login') return handleAdminLogin(request, env);
    if (method === 'POST' && path === 'admin/members/import') return handleMemberImport(request, env);
    if (method === 'GET' && path === 'admin/members') return handleAdminMembers(request, env);
    if (method === 'GET' && path === 'admin/vote-codes') return handleVoteCodes(request, env);
    if (method === 'GET' && path === 'admin/entries') return handleAdminEntries(request, env);
    if (method === 'POST' && path === 'admin/final') return handleAdminFinalUpload(request, env);
    if (method === 'POST' && path === 'admin/publish-entry') return handleAdminEntryPublish(request, env);
    if (method === 'POST' && path === 'admin/settings') return handleAdminSettings(request, env);
    if (method === 'POST' && path === 'admin/podium') return handleAdminPodium(request, env);

    if (method === 'POST' && path === 'submission/start') return handleSubmissionStart(request, env);
    if (method === 'POST' && path === 'submission/login') return handleSubmissionLogin(request, env);
    if (method === 'GET' && path === 'submission') return handleSubmissionGet(request, env);
    if (method === 'POST' && path === 'submission/image') return handleSubmissionImageUpload(request, env);
    if (method === 'DELETE' && segments[0] === 'submission' && segments[1] === 'image' && segments[2]) {
      return handleSubmissionImageDelete(request, env, segments[2]);
    }

    if (method === 'POST' && path === 'vote/login') return handleVoteLogin(request, env);
    if (method === 'GET' && path === 'vote/gallery') return handleVoteGallery(request, env);
    if (method === 'POST' && path === 'vote') return handleVoteCast(request, env);

    if (method === 'GET' && segments[0] === 'media' && segments[1] === 'submission' && segments[2]) {
      return handleSubmissionMedia(request, env, url, segments[2]);
    }
    if (method === 'GET' && segments[0] === 'media' && segments[1] === 'admin' && segments[2] === 'image' && segments[3]) {
      return handleAdminImageMedia(request, env, url, segments[3]);
    }
    if (method === 'GET' && segments[0] === 'media' && segments[1] === 'admin' && segments[2] === 'final' && segments[3]) {
      return handleFinalMedia(request, env, url, segments[3], true);
    }
    if (method === 'GET' && segments[0] === 'media' && segments[1] === 'final' && segments[2]) {
      return handleFinalMedia(request, env, url, segments[2]);
    }

    throw new HttpError(404, 'Adresse inconnue.', 'not_found');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
    console.error('Alliance contest error', error);
    return json({ error: 'Une erreur inattendue est survenue.', code: 'internal_error' }, 500);
  }
}
