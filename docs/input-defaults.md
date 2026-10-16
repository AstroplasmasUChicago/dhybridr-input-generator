# Input defaults

Editor defaults are written directly in `schema.js`. Solver defaults are assigned
in the Fortran input readers in dHybridR's `src/` directory. Neither project reads
a defaults JSON file or runs a defaults-generation script.

To change a default for future inputs, edit the field's `default` in `schema.js`
and reload the editor. To change the solver fallback for omitted inputs, edit the
assignment before the corresponding namelist read and rebuild dHybridR. Update
both projects manually when they should agree. Existing input files keep their
explicit values.

- `default` supplies an optional field's initial value and the editor's value for
  an omitted assignment in an imported file.
- `editor_initial_value` prefills a required field in a new input. For example,
  `time.dt` starts at `0.0025`, but importing a file without `dt` leaves it missing;
  the solver rejects that omission.
- `inherit` makes an omitted value follow another input. Injector particle counts
  and thermal scales follow the species values while **Use species value** is
  selected. Clear it to set an override, including `u_th=0` for a cold injector.

New files record the selected settings explicitly. Imported files preserve
omitted assignments until edited. Input-name compatibility mappings in
`input_names.js` do not define defaults. They convert historical names when
importing files and presets. Update these JavaScript mappings by hand when solver
input names change. The corresponding solver checks are in `src/input_compatibility.f90`.
