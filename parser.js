// Parse a dHybridR Fortran namelist input file into form state

function parseInputFile(text) {
  const result = { _dim: null, _speciesData: {} };
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');

  // Extract all sections: name { ... }
  const sectionRegex = /^\s*(\w+)\s*\n\s*\{([^}]*)\}/gm;
  const sections = [];
  let m;
  while ((m = sectionRegex.exec(text)) !== null) {
    sections.push({ name: m[1].toLowerCase(), body: m[2] });
  }

  // Map input section names to schema keys
  const nameToKey = {};
  for (const [key, sec] of Object.entries(SCHEMA)) {
    const inputName = sec.namelist.replace('nl_', '');
    nameToKey[inputName] = key;
  }

  // Detect dimension from node_number or ncells
  let detectedDim = null;
  for (const sec of sections) {
    if (sec.name === 'node_conf' || sec.name === 'grid_space') {
      const arrMatch = sec.body.match(/(?:node_number|ncells)\s*\(\s*1\s*:\s*(\d+)/);
      if (arrMatch) {
        detectedDim = parseInt(arrMatch[1]);
        break;
      }
      // Also detect from count of values
      const valMatch = sec.body.match(/(?:node_number|ncells)\s*(?:\([^)]*\))?\s*=\s*([^!\n]+)/);
      if (valMatch) {
        const vals = valMatch[1].split(',').filter(v => v.trim());
        detectedDim = vals.length;
        break;
      }
    }
  }
  result._dim = detectedDim || 2;

  // Detect build target from the deck. gpu_mem_frac (nl_particles) is GPU-only;
  // a non-negative spare_size (nl_species) is CPU-only. They are mutually exclusive
  // in a valid deck, so either one pins the build. Leave null if neither appears
  // (the caller keeps the current selection).
  // Match an actual `key =` assignment, ignoring `!` comments (a hint comment may
  // name the other build's knob, e.g. gpu_mem_frac's comment mentions spare_size).
  const stripComments = (body) => body.split('\n').map(l => l.replace(/!.*$/, '')).join('\n');
  const assigns = (body, key) => new RegExp('(^|[^a-z_])' + key + '\\s*=', 'i').test(stripComments(body));
  // First numeric value assigned to `key` in a section body (null if absent/non-numeric).
  const assignedNumber = (body, key) => {
    const m = stripComments(body).match(new RegExp('(?:^|[^a-z_])' + key + '\\s*=\\s*([-+0-9.eEdD]+)', 'i'));
    return m ? Number(m[1].replace(/d/gi, 'e')) : null;
  };
  let detectedBuild = null;
  for (const sec of sections) {
    if (sec.name === 'particles' && assigns(sec.body, 'gpu_mem_frac')) {
      detectedBuild = 'GPU';
      break;
    }
  }
  if (!detectedBuild) {
    for (const sec of sections) {
      if (sec.name === 'species' && assigns(sec.body, 'spare_size')) {
        // spare_size is the CPU-only headroom knob. Legacy GPU decks used the now-dead
        // sentinel spare_size=-1 ("GPU auto-tune"), so a negative value marks a legacy
        // GPU deck, not a CPU one: the current GPU build rejects spare_size as an unknown
        // namelist key, and the CPU build aborts on spare_size<0. Only spare_size>=0 pins CPU.
        const s = assignedNumber(sec.body, 'spare_size');
        detectedBuild = (s !== null && s < 0) ? 'GPU' : 'CPU';
        break;
      }
    }
  }
  result._build = detectedBuild;

  // Per-species section counters
  const perSpeciesKeys = Object.keys(SCHEMA).filter(k => SCHEMA[k].perSpecies);
  const perSpeciesCounts = {};
  perSpeciesKeys.forEach(k => perSpeciesCounts[k] = 0);

  for (const sec of sections) {
    const schemaKey = nameToKey[sec.name];
    if (!schemaKey) continue;
    const schema = SCHEMA[schemaKey];
    const parsed = parseNamelistBody(sec.body, schema, result._dim);

    if (schema.multiPerSpecies) {
      // Track which species we're on based on order of appearance
      // Injectors are grouped under each species
      if (!result[schemaKey]) result[schemaKey] = [];
      // Figure out which species this belongs to by counting how many
      // species blocks have appeared before this
      const spIdx = (perSpeciesCounts['species'] || 1) - 1;
      if (!result[schemaKey][spIdx]) result[schemaKey][spIdx] = [];
      result[schemaKey][spIdx].push(parsed);
    } else if (schema.perSpecies) {
      const idx = perSpeciesCounts[schemaKey]++;
      if (!result[schemaKey]) result[schemaKey] = [];
      result[schemaKey][idx] = parsed;
    } else {
      result[schemaKey] = parsed;
    }
  }

  return result;
}

function parseNamelistBody(body, schema, dim) {
  const data = {};
  // Build field lookup
  const fieldMap = {};
  for (const f of schema.fields) {
    fieldMap[f.key.toLowerCase()] = f;
  }

  // Remove comment lines and join continuation
  const lines = body.split('\n')
    .map(l => l.replace(/!.*$/, '').trim())
    .filter(l => l.length > 0);
  const joined = lines.join(' ');

  // Split on assignments: key=value or key(...)=value
  // Match patterns like: name="value", key(1:3)=1,2,3
  const assignRegex = /(\w+)\s*(?:\([^)]*\))?\s*=\s*/g;
  const assignments = [];
  let am;
  while ((am = assignRegex.exec(joined)) !== null) {
    assignments.push({ key: am[1].toLowerCase(), start: am.index + am[0].length, matchStart: am.index });
  }

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const end = i + 1 < assignments.length ? assignments[i+1].matchStart : joined.length;
    let rawVal = joined.slice(a.start, end);
    rawVal = rawVal.replace(/,\s*$/, '').trim();

    const field = fieldMap[a.key];
    if (!field) continue;

    const arrSize = getArraySize(field.dim, dim);

    if (arrSize > 0) {
      // Array value
      if (field.type === 'strarr' || (field.type === 'str' && arrSize > 0)) {
        const strVals = [];
        const strRegex = /"([^"]*)"/g;
        let sm;
        while ((sm = strRegex.exec(rawVal)) !== null) strVals.push(sm[1]);
        data[field.key] = strVals;
      } else if (field.type === 'bool') {
        const bools = rawVal.split(',').map(v => {
          v = v.trim().toLowerCase();
          return v === '.true.' || v === 'true' || v === 't';
        });
        data[field.key] = bools;
      } else {
        let nums = rawVal.split(',').map(v => {
          v = v.trim().replace(/d/gi, 'e');
          return Number(v) || 0;
        });
        // layout 'minmax': the file holds all mins then all maxs, the form holds
        // per-axis (min,max) pairs (see schema.js).
        if (field.layout === 'minmax') nums = minMaxToPairs(nums);
        data[field.key] = nums;
      }
    } else {
      // Scalar
      if (field.type === 'bool') {
        const v = rawVal.trim().toLowerCase();
        data[field.key] = v === '.true.' || v === 'true' || v === 't';
      } else if (field.type === 'str') {
        // Special: a quoted-list field (phasespaces, ascent outputs) stores multiple
        // quoted strings joined as one comma-separated string.
        if (field.key === 'phasespaces' || field.quotedList) {
          const all = [];
          const re = /"([^"]*)"/g;
          let sm;
          while ((sm = re.exec(rawVal)) !== null) all.push(sm[1]);
          data[field.key] = all.length > 0 ? all.join(',') : rawVal.trim();
        } else {
          const sm = rawVal.match(/"([^"]*)"/);
          data[field.key] = sm ? sm[1] : rawVal.trim();
        }
      } else if (field.type === 'int') {
        data[field.key] = parseInt(rawVal) || 0;
      } else {
        const num = Number(rawVal.replace(/d/gi, 'e')) || 0;
        // Drop a negative spare_size: it is the dead legacy "GPU auto-tune" sentinel
        // (spare_size=-1), invalid in both current builds. Leaving it unset lets the
        // schema default (0.2) apply, so the generator never round-trips spare_size=-1.
        if (!(field.key === 'spare_size' && num < 0)) {
          data[field.key] = num;
        }
      }
    }
  }

  return data;
}

// (min0,min1,...,max0,max1,...) -> (min0,max0,min1,max1,...); an odd count is left as is
function minMaxToPairs(arr) {
  if (arr.length % 2 !== 0) return arr;
  const d = arr.length / 2;
  const out = [];
  for (let i = 0; i < d; i++) out.push(arr[i], arr[d + i]);
  return out;
}
