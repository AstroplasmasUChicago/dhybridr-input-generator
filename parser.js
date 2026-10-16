// Parse ordered sections before changing application state.
function maskNamelistText(text, hideStrings = false) {
  let output = '', quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      output += hideStrings && ch !== '\n' ? ' ' : ch;
      if (ch === quote) {
        if (text[i + 1] === quote) { output += hideStrings ? ' ' : text[++i]; if (hideStrings) i++; }
        else quote = '';
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch; output += hideStrings ? ' ' : ch;
    } else if (ch === '!') {
      while (i < text.length && text[i] !== '\n') { output += ' '; i++; }
      if (i < text.length) output += '\n';
    } else output += ch;
  }
  if (quote) throw new Error('Unterminated quoted value.');
  return output;
}

function scanInputSections(text) {
  text = text.replace(/\r\n?/g, '\n');
  const clean = maskNamelistText(text), masked = maskNamelistText(text, true);
  const sections = [];
  let position = 0;
  while (position < masked.length) {
    const rest = masked.slice(position);
    if (!rest.trim()) break;
    const match = rest.match(/^\s*(\w+)\s*\{/);
    const line = 1 + text.slice(0, position + (match ? match[0].search(/\w/) : 0)).split('\n').length - 1;
    if (!match) throw new Error(`Line ${line}: expected a section name and {.`);
    const start = position + match[0].length;
    const end = masked.indexOf('}', start);
    if (end < 0 || masked.slice(start, end).includes('{')) throw new Error(`Line ${line}: unmatched section braces.`);
    const body = clean.slice(start, end), bodyMask = masked.slice(start, end);
    const assignments = [];
    const re = /\b([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*=/g;
    let entry;
    while ((entry = re.exec(bodyMask))) {
      assignments.push({ name: entry[1], indices: entry[2], start: entry.index + entry[0].length,
        offset: entry.index, line: 1 + text.slice(0, start + entry.index).split('\n').length - 1 });
    }
    if (bodyMask.slice(0, assignments[0]?.offset ?? bodyMask.length).trim()) throw new Error(`Line ${line}: unsupported section syntax.`);
    assignments.forEach((a, i) => { a.raw = body.slice(a.start, assignments[i + 1]?.offset ?? body.length).trim().replace(/,\s*$/, ''); });
    sections.push({ name: match[1].toLowerCase(), assignments, line });
    position = end + 1;
  }
  return sections;
}

function splitInputValues(raw) {
  const values = [];
  let i = 0, afterComma = false;
  while (i < raw.length) {
    while (/\s/.test(raw[i] || '') && i < raw.length) i++;
    if (i === raw.length) break;
    if (raw[i] === ',') throw new Error('Empty value between commas.');
    const repeat = raw.slice(i).match(/^(\d+)\s*\*\s*/);
    const count = repeat ? Number(repeat[1]) : 1;
    if (repeat) i += repeat[0].length;
    if (!Number.isSafeInteger(count) || count < 1) throw new Error('Repeat count must be a positive integer.');
    let value = '', quoted = false;
    if (raw[i] === '"' || raw[i] === "'") {
      const quote = raw[i++]; quoted = true;
      let closed = false;
      while (i < raw.length) {
        if (raw[i] === quote) {
          i++;
          if (raw[i] === quote) { value += quote; i++; }
          else { closed = true; break; }
        } else value += raw[i++];
      }
      if (!closed) throw new Error('Unterminated quoted value.');
    } else {
      const match = raw.slice(i).match(/^[^,\s]+/);
      if (!match) throw new Error('Missing value.');
      value = match[0]; i += value.length;
    }
    for (let n = 0; n < count; n++) values.push({ value, quoted });
    if (i < raw.length && raw[i] !== ',' && !/\s/.test(raw[i])) throw new Error('Expected a comma or whitespace after value.');
    while (i < raw.length && /\s/.test(raw[i])) i++;
    afterComma = raw[i] === ',';
    if (afterComma) i++;
  }
  if (afterComma) throw new Error('Missing value after comma.');
  return values;
}

function inputField(section, name) {
  return SCHEMA[section]?.fields.find(f => f.key.toLowerCase() === name.toLowerCase());
}

function inputName(section, name) {
  const lower = name.toLowerCase();
  for (const entry of INPUT_NAMES.keys) {
    if (entry.section === section && entry.name.toLowerCase() === lower) return { section, name: entry.name };
    if ((entry.old || []).some(old => old.section === section && old.name.toLowerCase() === lower)) return { section: entry.section, name: entry.name };
  }
  return null;
}

function parseInputFile(text, options = {}) {
  return convertInputSections(scanInputSections(text), options);
}

function convertInputSections(sections, options = {}) {
  const report = [], result = { _dim: options.dim || null, _build: options.build || null, _report: report };
  let species = -1;
  const counts = {}, globals = new Set();
  for (const section of sections) {
    const schema = SCHEMA[section.name];
    if (!schema) throw new Error(`Line ${section.line}: unknown section ${section.name}.`);
    if (section.name === 'species') species++;
    if (schema.perSpecies && species < 0) throw new Error(`Line ${section.line}: ${section.name} must follow its species block.`);
    section.species = schema.perSpecies ? species : undefined;
    const scope = `${section.name}:${section.species ?? ''}`;
    counts[scope] = (counts[scope] || 0) + 1;
    if (!schema.multiPerSpecies && counts[scope] > 1) throw new Error(`Line ${section.line}: duplicate ${section.name} section.`);
    section.injector = schema.multiPerSpecies ? counts[scope] - 1 : undefined;
    section.context = schema.perSpecies ? `Species ${species + 1}${schema.multiPerSpecies ? `, injector ${section.injector + 1}` : ` ${section.name}`}` : section.name;
    if (!schema.perSpecies) globals.add(section.name);
    const shapes = section.assignments.filter(a => ['ranks','node_number','n_cells','ncells'].includes(a.name.toLowerCase()));
    for (const shape of shapes) {
      const start = Number(shape.indices?.match(/^\s*(\d+)/)?.[1] || 1);
      const extent = start + splitInputValues(shape.raw).length - 1;
      if (extent > 3 || extent < 1 || (options.dim && extent > options.dim)) throw new Error(`Line ${shape.line}: inconsistent simulation dimension.`);
      result._dim = Math.max(result._dim || 0, extent);
    }
  }
  result._dim ||= 2;
  const electron = sections.find(s => s.name === 'fluid_electrons');
  const closureValue = electron?.assignments.find(a => a.name.toLowerCase() === 'closure');
  const closure = closureValue ? splitInputValues(closureValue.raw)[0]?.value.toLowerCase() : 'polytropic';
  const distributions = sections.filter(s => s.name === 'species').map(s => {
    const a = s.assignments.find(a => ['dist','distribution'].includes(a.name.toLowerCase()));
    return a ? splitInputValues(a.raw)[0]?.value.toLowerCase() : 'thermal';
  });
  const destinations = new Map();
  function blockFor(section, sp, inj) {
    const schema = SCHEMA[section];
    if (!schema.perSpecies) return result[section] ||= { _present: [], _indices: {}, _included: true, ...(schema.enabled === false ? { _enabled: true } : {}) };
    const blocks = result[section] ||= [];
    if (schema.multiPerSpecies) return (blocks[sp] ||= [])[inj] ||= { _present: [], _indices: {}, _included: true, _enabled: true };
    return blocks[sp] ||= { _present: [], _indices: {}, _included: true };
  }
  for (const section of sections) {
    blockFor(section.name, section.species, section.injector);
    const legacyCounts = section.assignments.filter(a => a.name.toLowerCase() === 'n_constants');
    if (legacyCounts.length > 1) throw new Error(`${section.context}: duplicate n_constants.`);
    for (const assignment of section.assignments) {
      const old = assignment.name.toLowerCase(), where = `${section.context}, line ${assignment.line}`;
      const splitElectronDump = section.name === 'field_diag' && old === 'dmp_pefld';
      if (splitElectronDump && section.assignments.some(a => a.name.toLowerCase() === 'dump_te')) throw new Error(`${where}: dmp_pefld conflicts with dump_Te; it controls both electron dumps.`);
      if (old === 'n_constants' && ['species','ext_emf','raw_diag'].includes(section.name)) continue;
      let target;
      if (old === 'vth' && ['species','plasma_injector'].includes(section.name)) {
        target = { section: section.name, name: INPUT_NAMES.thermal[distributions[section.species]] };
        if (!target.name) throw new Error(`${where}: unknown distribution for vth.`);
      } else if (old === 'te' && section.name === 'fluid_electrons' && closure === 'polytropic') {
        target = { section: section.name, name: 'Ke' };
      } else target = inputName(section.name, assignment.name);
      if (!target) {
        const removed = INPUT_NAMES.removed.find(r => r.section === section.name && r.name.toLowerCase() === old);
        throw new Error(`${where}: ${assignment.name} ${removed ? `was removed. ${removed.message}` : 'is unknown.'}`);
      }
      if (target.section !== section.name && closure !== 'polytropic') throw new Error(`${where}: ${assignment.name} requires polytropic electrons.`);
      const field = inputField(target.section, target.name);
      if (!field) throw new Error(`${where}: unsupported field ${target.name}.`);
      const data = blockFor(target.section, section.species, section.injector);
      const dest = `${target.section}:${section.species ?? ''}:${section.injector ?? ''}:${field.key}`;
      const source = `${section.name}.${old}`;
      if (destinations.has(dest) && destinations.get(dest) !== source) throw new Error(`${where}: conflicting spellings target ${target.section}.${field.key}.`);
      destinations.set(dest, source);
      const moved = target.section !== section.name;
      if (moved || old !== field.key.toLowerCase()) report.push({ kind: moved ? 'move' : 'rename', message: `${where}: ${assignment.name} -> ${moved ? target.section + '.' : ''}${field.key}${splitElectronDump ? ', dump_Te' : ''}` });
      let values;
      try { values = splitInputValues(assignment.raw); } catch (error) { throw new Error(`${where}, ${assignment.name}: ${error.message}`); }
      if (!values.length) throw new Error(`${where}: ${assignment.name} requires a value.`);
      let converted = values.map(({value, quoted}) => {
        if (field.type === 'str' || field.type === 'strarr') {
          if (!quoted && !(field.key === 'Te' && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?$/.test(value))) throw new Error(`${where}: ${assignment.name} requires a quoted string.`);
          if (field.fparser) {
            const current = value.replace(/\bct\s*\(/gi, 'constants(');
            if (current !== value) report.push({ kind: 'expression', message: `${where}, ${field.key}: ct(...) -> constants(...)` });
            value = current;
            if (value.length > 4095) throw new Error(`${where}: ${field.key} expression exceeds 4095 characters after conversion.`);
          }
          if (field.key === 'phase_spaces' || field.key === 'outputs') {
            value = value.split(',').map(token => {
              if (!token.trim()) return '';
              const parts = token.trim().split(':');
              const mapped = INPUT_NAMES.phases[parts[0].toLowerCase()];
              if (mapped) { report.push({ kind: 'phase', message: `${where}: ${parts[0]} -> ${mapped}` }); parts[0] = mapped; }
              const allowed = field.phaseOptions.find(p => p.name.toLowerCase() === parts[0].toLowerCase());
              if (!allowed) throw new Error(`${where}: unknown phase/output ${parts[0]}.`);
              if (field.key === 'phase_spaces' && parts.length > 1) throw new Error(`${where}: phase_spaces does not accept qualifiers; use an exact phase name.`);
              parts[0] = allowed.name;
              return parts.join(':');
            }).join(',');
          }
          return value;
        }
        if (field.type === 'bool') {
          if (!/^(?:\.true\.|\.false\.|true|false|t|f)$/i.test(value) || quoted) throw new Error(`${where}: invalid Boolean for ${field.key}.`);
          return /^(?:\.true\.|true|t)$/i.test(value);
        }
        const number = Number(value.replace(/d/gi, 'e'));
        if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?$/.test(value) || !Number.isFinite(number) || (field.type === 'int' && !Number.isInteger(number))) throw new Error(`${where}: invalid ${field.type} for ${field.key}.`);
        if (quoted && !(field.key === 'Ke' && old === 'te')) throw new Error(`${where}: ${field.key} must be numeric, without quotes.`);
        if (field.min !== undefined && number < field.min) throw new Error(`${where}: ${field.key} must be at least ${field.min}.`);
        return number;
      });
      const listed = field.key === 'phase_spaces' || field.quotedList;
      if (listed) converted = converted.flatMap(value => value.split(','));
      const size = listed ? (field.key === 'outputs' ? 32 : 22) : (field.inputSize || getArraySize(field.dim, result._dim));
      if (field.dim === 'VARIABLE' || size > 0) {
        const indices = assignment.indices?.replace(/\s/g, '').match(/^([1-9]\d*)(?::([1-9]\d*))?$/);
        if (assignment.indices !== undefined && !indices) throw new Error(`${where}: ${field.key} indices must be positive integers or lo:hi.`);
        const start = indices ? Number(indices[1]) : 1, end = start + converted.length - 1;
        if (!Number.isSafeInteger(end) || (size && end > size) || (indices?.[2] && Number(indices[2]) !== end)) throw new Error(`${where}: ${field.key} indices do not match its values or size.`);
        data[field.key] ||= [];
        const supplied = data._indices[field.key] ||= [];
        converted.forEach((value, n) => {
          const index = start + n;
          if (supplied.includes(index)) throw new Error(`${where}: ${field.key}(${index}) is assigned more than once.`);
          supplied.push(index); data[field.key][index - 1] = value;
        });
      } else {
        if (data._present.includes(field.key)) throw new Error(`${where}: ${field.key} is assigned more than once.`);
        if (assignment.indices || (converted.length !== 1 && field.key !== 'phase_spaces' && !field.quotedList)) throw new Error(`${where}: ${field.key} is a scalar.`);
        data[field.key] = field.key === 'phase_spaces' || field.quotedList ? converted.join(',') : converted[0];
      }
      if (!data._present.includes(field.key)) data._present.push(field.key);
      if (splitElectronDump) {
        data.dump_Te = data.dump_Pe;
        data._present.push('dump_Te');
      }
      if (old === 'selectrule' && !/^1(?:\.0*)?$/.test(String(data[field.key]).trim())) report.push({ kind: 'notice', message: `${where}: raw filter now combines with bounds, speed and sampling.` });
    }
    const data = blockFor(section.name, section.species, section.injector);
    if (legacyCounts.length) {
      const raw = splitInputValues(legacyCounts[0].raw);
      const count = raw.length === 1 && /^\d+$/.test(raw[0].value) ? Number(raw[0].value) : NaN;
      if (!Number.isSafeInteger(count) || count < 0) throw new Error(`${section.context}: invalid n_constants.`);
      const values = data.constants || [], indices = data._indices.constants || [];
      for (let i = 1; i <= count; i++) if (!indices.includes(i)) throw new Error(`${section.context}: active constants(${i}) is missing.`);
      const discarded = indices.filter(i => i > count).length;
      if (count) { data.constants = values.slice(0, count); data._indices.constants = Array.from({length: count}, (_, i) => i + 1); }
      else { delete data.constants; delete data._indices.constants; data._present = data._present.filter(k => k !== 'constants'); }
      report.push({ kind: 'count', message: `${section.context}: removed n_constants; kept ${count} constants${discarded ? `, discarded ${discarded} inactive values` : ''}.` });
    }
    if (data.constants) for (let i = 1; i <= data.constants.length; i++) if (!data._indices.constants.includes(i)) throw new Error(`${section.context}: constants(${i}) is missing.`);
  }
  for (const [section, schema] of Object.entries(SCHEMA)) {
    const blocks = schema.perSpecies ? (result[section] || []).flat().filter(Boolean) : [result[section]].filter(Boolean);
    for (const data of blocks) for (const field of schema.fields) {
      if ((field.key === 'phase_spaces' || field.quotedList) && data[field.key]) data[field.key] = data[field.key].join(',');
      if (field.layout === 'minmax' && data[field.key]) {
        const size = getArraySize(field.dim, result._dim);
        const values = Array.from({length: size}, (_, i) => data[field.key][i]);
        data[field.key] = minMaxToPairs(values);
      }
      if (field.build && data._present.includes(field.key)) {
        if (result._build && result._build !== field.build) throw new Error(`Input mixes CPU-only and GPU-only settings (${field.key}).`);
        result._build = field.build;
      }
    }
  }
  if (result.fluid_electrons && !globals.has('fluid_electrons')) {
    result.fluid_electrons.closure = 'polytropic'; result.fluid_electrons._present.push('closure');
  }
  validateImportedState(result);
  return result;
}

function validateImportedState(state) {
  const closure = (state.fluid_electrons?.closure || 'polytropic').toLowerCase();
  if (!['polytropic','evolved'].includes(closure)) throw new Error(`Unknown electron closure ${closure}.`);
  const count = state.particles?.n_species;
  if (count !== undefined && (!Number.isInteger(count) || count < 1 || (state.species || []).length !== count)) throw new Error('n_species must match the number of species blocks.');
  for (const [section, schema] of Object.entries(SCHEMA)) {
    const rows = schema.perSpecies ? (state[section] || []).flatMap((block, sp) => schema.multiPerSpecies ? (block || []).map(data => ({data, sp})) : [{data: block, sp}]) : [{data: state[section]}];
    for (const {data, sp} of rows) {
      if (!data) continue;
      for (const field of schema.fields) {
        if (!data._present.includes(field.key)) continue;
        if (!fieldRequirementMet(field, state, sp)) throw new Error(`${section}.${field.key} does not apply to the selected closure/distribution.`);
        if (field.options && !Array.isArray(data[field.key]) && !field.options.some(v => v.toLowerCase() === String(data[field.key]).toLowerCase())) throw new Error(`${section}.${field.key}: unsupported value ${data[field.key]}.`);
      }
      if (data.buffer_headroom < 0) throw new Error('species.buffer_headroom must be nonnegative; remove the retired GPU sentinel.');
      if (data.u_drift_profile && data.u_drift_profile.some(v => String(v || '').trim()) && (data.u_drift_profile.length !== 3 || Array.from({length: 3}, (_, i) => data.u_drift_profile[i]).some(v => !String(v || '').trim()))) throw new Error('u_drift_profile requires all three expressions.');
      if (section === 'ascent' && data.actions_file) state._report.push({kind: 'notice', message: 'ascent.actions_file: review external action fields for renamed phases.'});
    }
  }
}

// Saved dictionaries use the same conversion rules as files.
function parseSavedPreset(preset) {
  const sections = [];
  const dim = preset.dim || 2;
  const applicability = { ...preset.values, species: (preset.values.species || []).map(data => ({ ...data, distribution: data.distribution ?? data.dist ?? 'thermal' })) };
  function add(section, data, speciesIndex) {
    if (!data || data._included === false || data._enabled === false) return;
    const assignments = [];
    for (const [name, value] of Object.entries(data)) {
      if (name.startsWith('_') || (data._present && !data._present.includes(name))) continue;
      const oldElectronTe = section === 'fluid_electrons' && name.toLowerCase() === 'te' && !Object.hasOwn(data, 'Ke') && String(data.closure || 'polytropic').toLowerCase() === 'polytropic';
      const target = oldElectronTe ? { section, name: 'Ke' } : inputName(section, name);
      const field = inputField(target?.section || section, target?.name || name);
      if (field?.build && preset.build && field.build !== preset.build) continue;
      if (field && !fieldRequirementMet(field, applicability, speciesIndex)) continue;
      const listed = field?.key === 'phase_spaces' || field?.quotedList;
      let values = listed ? String(value).split(',') : Array.isArray(value) ? value : [value];
      if (!values.length) continue;
      if (field?.layout === 'minmax') values = pairsToMinMax(values.slice(0, getArraySize(field.dim, dim)));
      if (Array.isArray(value) && field && field.dim !== 'VARIABLE') values = values.slice(0, field.inputSize || getArraySize(field.dim, dim));
      const literal = value => field && ['int','real'].includes(field.type) && typeof value === 'string' ? value : typeof value === 'boolean' ? (value ? '.true.' : '.false.') : typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value);
      if (data._indices?.[name] && (Array.isArray(value) || listed)) {
        for (const index of data._indices[name]) assignments.push({name, indices: String(index), raw: literal(values[index - 1]), line: 0});
      } else assignments.push({name, raw: values.map(literal).join(','), line: 0});
    }
    sections.push({name: section, assignments, line: 0});
  }
  for (const key of Object.keys(preset.values)) if (!SCHEMA[key] && !key.startsWith('_')) throw new Error(`Unknown preset section ${key}.`);
  for (const [key, schema] of Object.entries(SCHEMA)) if (!schema.perSpecies) add(key, preset.values[key]);
  for (let sp = 0; sp < (preset.values.species || []).length; sp++) {
    for (const [key, schema] of Object.entries(SCHEMA)) if (schema.perSpecies) {
      const block = preset.values[key]?.[sp];
      if (schema.multiPerSpecies) (block || []).forEach(data => add(key, data, sp));
      else add(key, block, sp);
    }
  }
  return convertInputSections(sections, {dim, build: preset.build});
}

function stripNamelistComments(body) { return maskNamelistText(body); }
function minMaxToPairs(arr) {
  if (arr.length % 2) return arr;
  const d = arr.length / 2, out = [];
  for (let i = 0; i < d; i++) out.push(arr[i], arr[d + i]);
  return out;
}
