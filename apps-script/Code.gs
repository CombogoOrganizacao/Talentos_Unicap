// ============================================
// Google Apps Script - Backend API
// TalentoUNICAP - Currículos de Alunos
// ============================================

const SPREADSHEET_ID = '1x1m0qsWd8kFae3TkvtFEcoSrTZ_4EBSBkLMIG04ahEM';

const SHEETS = {
  users: 'Usuarios',
  profile: 'Perfil',
  experiences: 'Experiencias',
  educations: 'Formacao',
  skills: 'Habilidades',
  projects: 'Projetos',
  certificates: 'Certificados'
};

// ============================================
// CONFIGURAÇÃO INICIAL - Rode uma vez
// ============================================
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configs = {
    [SHEETS.users]: ['id', 'uid_firebase', 'nome', 'email', 'slug', 'criado_em'],
    [SHEETS.profile]: ['id', 'uid_firebase', 'telefone', 'endereco', 'cidade', 'estado', 'curso', 'periodo', 'bio', 'foto_url', 'linkedin', 'github', 'portfolio'],
    [SHEETS.experiences]: ['id', 'uid_firebase', 'empresa', 'cargo', 'descricao', 'data_inicio', 'data_fim', 'atual'],
    [SHEETS.educations]: ['id', 'uid_firebase', 'instituicao', 'grau', 'area_estudo', 'data_inicio', 'data_fim', 'atual'],
    [SHEETS.skills]: ['id', 'uid_firebase', 'nome', 'categoria', 'nivel'],
    [SHEETS.projects]: ['id', 'uid_firebase', 'nome', 'descricao', 'url', 'data_inicio', 'data_fim'],
    [SHEETS.certificates]: ['id', 'uid_firebase', 'nome', 'emissor', 'data_emissao', 'data_validade', 'sem_validade', 'url', 'carga_horaria']
  };
  for (const [sheetName, headers] of Object.entries(configs)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
  return 'Abas criadas com sucesso!';
}

function generateId() { return Utilities.getUuid(); }

function findRowByUid(sheetName, uid) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === uid) return { row: i + 1, data: data[i] };
  }
  return null;
}

function findRowById(sheetName, id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) return { row: i + 1, data: data[i] };
  }
  return null;
}

function createUser(uid, nome, email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.users);
  const existing = findRowByUid(SHEETS.users, uid);
  if (existing) return JSON.stringify({ success: true, message: 'Ja existe' });
  const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let finalSlug = slug, counter = 1;
  const allData = sheet.getDataRange().getValues();
  while (allData.some(row => row[4] === finalSlug)) { finalSlug = slug + '-' + counter; counter++; }
  sheet.appendRow([generateId(), uid, nome, email, finalSlug, new Date().toISOString()]);
  const profileSheet = ss.getSheetByName(SHEETS.profile);
  profileSheet.appendRow([generateId(), uid, '', '', '', '', '', '', '', '', '', '', '']);
  return JSON.stringify({ success: true, slug: finalSlug });
}

function getProfile(uid) {
  const row = findRowByUid(SHEETS.profile, uid);
  if (!row) return JSON.stringify({ error: 'Perfil nao encontrado' });
  const d = row.data;
  const profile = { id: d[0], telefone: d[2], endereco: d[3], cidade: d[4], estado: d[5], curso: d[6], periodo: d[7], bio: d[8], foto_url: d[9], linkedin: d[10], github: d[11], portfolio: d[12] };
  const userRow = findRowByUid(SHEETS.users, uid);
  if (userRow) { profile.nome = userRow.data[2]; profile.email = userRow.data[3]; profile.slug = userRow.data[4]; }
  profile.experiencias = getAllByUid(SHEETS.experiences, uid, parseExperience);
  profile.formacao = getAllByUid(SHEETS.educations, uid, parseEducation);
  profile.habilidades = getAllByUid(SHEETS.skills, uid, parseSkill);
  profile.projetos = getAllByUid(SHEETS.projects, uid, parseProject);
  profile.certificados = getAllByUid(SHEETS.certificates, uid, parseCertificate);
  return JSON.stringify(profile);
}

function updateProfile(uid, data) {
  const row = findRowByUid(SHEETS.profile, uid);
  if (!row) return JSON.stringify({ error: 'Perfil nao encontrado' });
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.profile);
  const values = [row.data[0], uid, data.telefone||'', data.endereco||'', data.cidade||'', data.estado||'', data.curso||'', data.periodo||'', data.bio||'', data.foto_url||'', data.linkedin||'', data.github||'', data.portfolio||''];
  sheet.getRange(row.row, 1, 1, values.length).setValues([values]);
  if (data.nome) { const u = findRowByUid(SHEETS.users, uid); if (u) ss.getSheetByName(SHEETS.users).getRange(u.row, 3).setValue(data.nome); }
  return JSON.stringify({ success: true });
}

function addItem(sheetName, uid, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const id = generateId();
  let values;
  switch(sheetName) {
    case SHEETS.experiences: values = [id, uid, data.empresa||'', data.cargo||'', data.descricao||'', data.data_inicio||'', data.data_fim||'', data.atual||'false']; break;
    case SHEETS.educations: values = [id, uid, data.instituicao||'', data.grau||'', data.area_estudo||'', data.data_inicio||'', data.data_fim||'', data.atual||'false']; break;
    case SHEETS.skills: values = [id, uid, data.nome||'', data.categoria||'Tecnica', data.nivel||'Intermediario']; break;
    case SHEETS.projects: values = [id, uid, data.nome||'', data.descricao||'', data.url||'', data.data_inicio||'', data.data_fim||'']; break;
    case SHEETS.certificates: values = [id, uid, data.nome||'', data.emissor||'', data.data_emissao||'', data.data_validade||'', data.sem_validade||'false', data.url||'', data.carga_horaria||'']; break;
  }
  sheet.appendRow(values);
  return JSON.stringify({ success: true, id: id });
}

function updateItem(sheetName, id, data) {
  const row = findRowById(sheetName, id);
  if (!row) return JSON.stringify({ error: 'Item nao encontrado' });
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const uid = row.data[1];
  // Monta as colunas na mesma ordem/estrutura usada em addItem, evitando
  // gravar campos soltos (action, uid, sheet, id) que vinham junto no payload.
  let values;
  switch (sheetName) {
    case SHEETS.experiences: values = [id, uid, data.empresa||'', data.cargo||'', data.descricao||'', data.data_inicio||'', data.data_fim||'', data.atual||'false']; break;
    case SHEETS.educations: values = [id, uid, data.instituicao||'', data.grau||'', data.area_estudo||'', data.data_inicio||'', data.data_fim||'', data.atual||'false']; break;
    case SHEETS.skills: values = [id, uid, data.nome||'', data.categoria||'Tecnica', data.nivel||'Intermediario']; break;
    case SHEETS.projects: values = [id, uid, data.nome||'', data.descricao||'', data.url||'', data.data_inicio||'', data.data_fim||'']; break;
    case SHEETS.certificates: values = [id, uid, data.nome||'', data.emissor||'', data.data_emissao||'', data.data_validade||'', data.sem_validade||'false', data.url||'', data.carga_horaria||'']; break;
    default: return JSON.stringify({ error: 'Aba invalida' });
  }
  sheet.getRange(row.row, 1, 1, values.length).setValues([values]);
  return JSON.stringify({ success: true });
}

function deleteItem(sheetName, id) {
  const row = findRowById(sheetName, id);
  if (!row) return JSON.stringify({ error: 'Item nao encontrado' });
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ss.getSheetByName(sheetName).deleteRow(row.row);
  return JSON.stringify({ success: true });
}

function getAllByUid(sheetName, uid, parser) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) { if (data[i][1] === uid) results.push(parser(data[i])); }
  return results;
}

function parseExperience(d) { return { id: d[0], empresa: d[2], cargo: d[3], descricao: d[4], data_inicio: d[5], data_fim: d[6], atual: d[7] === 'true' || d[7] === true }; }
function parseEducation(d) { return { id: d[0], instituicao: d[2], grau: d[3], area_estudo: d[4], data_inicio: d[5], data_fim: d[6], atual: d[7] === 'true' || d[7] === true }; }
function parseSkill(d) { return { id: d[0], nome: d[2], categoria: d[3], nivel: d[4] }; }
function parseProject(d) { return { id: d[0], nome: d[2], descricao: d[3], url: d[4], data_inicio: d[5], data_fim: d[6] }; }
function parseCertificate(d) { return { id: d[0], nome: d[2], emissor: d[3], data_emissao: d[4], data_validade: d[5], sem_validade: d[6] === 'true' || d[6] === true, url: d[7], carga_horaria: d[8] }; }

function getPublicProfile(slug) {
  const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEETS.users);
  if (!usersSheet) return JSON.stringify({ error: 'Nao encontrado' });
  const data = usersSheet.getDataRange().getValues();
  let uid = null;
  for (let i = 1; i < data.length; i++) { if (data[i][4] === slug) { uid = data[i][1]; break; } }
  if (!uid) return JSON.stringify({ error: 'Perfil nao encontrado' });
  // Perfil publico nao deve expor o email do usuario (ver Regras de Negocio)
  const profile = JSON.parse(getProfile(uid));
  delete profile.email;
  return JSON.stringify(profile);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  let result;
  switch(data.action) {
    case 'createUser': result = createUser(data.uid, data.nome, data.email); break;
    case 'getProfile': result = getProfile(data.uid); break;
    case 'updateProfile': result = updateProfile(data.uid, data); break;
    case 'addItem': result = addItem(data.sheet, data.uid, data); break;
    case 'updateItem': result = updateItem(data.sheet, data.id, data); break;
    case 'deleteItem': result = deleteItem(data.sheet, data.id); break;
    default: result = JSON.stringify({ error: 'Acao invalida' });
  }
  return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (e.parameter.action === 'getPublicProfile') {
    const result = getPublicProfile(e.parameter.slug);
    return ContentService.createTextOutput(result).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: 'Parametros invalidos' })).setMimeType(ContentService.MimeType.JSON);
}
