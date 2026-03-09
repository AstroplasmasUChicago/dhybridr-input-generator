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
        const nums = rawVal.split(',').map(v => {
          v = v.trim().replace(/d/gi, 'e');
          return Number(v) || 0;
        });
        data[field.key] = nums;
      }
    } else {
      // Scalar
      if (field.type === 'bool') {
        const v = rawVal.trim().toLowerCase();
        data[field.key] = v === '.true.' || v === 'true' || v === 't';
      } else if (field.type === 'str') {
        // Special: phasespaces stores multiple quoted strings as comma-separated
        if (field.key === 'phasespaces') {
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
        data[field.key] = Number(rawVal.replace(/d/gi, 'e')) || 0;
      }
    }
  }

  return data;
}
