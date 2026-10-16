// dHybridR input file schema — every parameter from every Read* subroutine
// dim: 0=scalar, 'DIM'=DIM-dependent, 'DIM2'=DIM*2, 'BDIM'=2*(DIM-1), 'VDIM'=always 3, 'VARIABLE'=supplied length, N=fixed
// layout: 'minmax' = the code reads this DIM2 array as all mins then all maxs (xmin,ymin,zmin,xmax,ymax,zmax);
//   the form keeps per-axis (min,max) pairs and generator.js/parser.js permute at the file boundary
// type: 'int','real','bool','str','strarr'
// perSpecies sections repeat n_species times

const SCHEMA = {
  node_conf: {
    namelist: 'nl_node_conf',
    label: 'Node Configuration',
    desc: 'MPI process decomposition. Product of ranks must equal mpirun -np N.',
    required: true,
    fields: [
      { key: 'ranks', label: 'Ranks', type: 'int', dim: 'DIM',
        default: [1,1,1], hint: 'Processes per dimension',
        dimLabels: ['x','y','z'] },
    ]
  },

  time: {
    namelist: 'nl_time',
    label: 'Time',
    desc: 'Simulation time stepping parameters.',
    required: true,
    fields: [
      { key: 'dt', label: 'dt', type: 'real', dim: 0, default: 0.0025, hint: 'Time step' },
      { key: 'n_steps', label: 'n_steps', type: 'int', dim: 0, default: 2000, hint: 'Number of iterations (-1=use t_end)' },
      { key: 't_end', label: 't_end', type: 'real', dim: 0, default: -1.0, hint: 'End time (-1=use n_steps)' },
      { key: 'stiter', label: 'stiter', type: 'int', dim: 0, default: 0, hint: 'Starting iteration number' },
      { key: 'c', label: 'c', type: 'real', dim: 0, default: 100.0, hint: 'Speed of light' },
    ]
  },

  grid_space: {
    namelist: 'nl_grid_space',
    label: 'Grid & Space',
    desc: 'Computational grid size, physical box size, and boundary types.',
    required: true,
    fields: [
      { key: 'n_cells', label: 'n_cells', type: 'int', dim: 'DIM',
        default: [128,128,128], hint: 'Grid cells per dimension',
        dimLabels: ['Nx','Ny','Nz'] },
      { key: 'box_size', label: 'box_size', type: 'real', dim: 'DIM',
        default: [64,64,64], hint: 'Box size in normalized units',
        dimLabels: ['Lx','Ly','Lz'] },
      { key: 'boundary_types', label: 'boundary_types', type: 'strarr', dim: 'DIM2',
        default: ['per','per','per','per','per','per'],
        options: ['per','reflect','open','pec','pmc','mirror'],
        hint: 'Field boundary types: xl, xr, yl, yr, zl, zr (pec: perfect electric conductor; pmc or mirror: perfect magnetic conductor)',
        dimLabels: ['x\u2097','x\u1d63','y\u2097','y\u1d63','z\u2097','z\u1d63'] },
    ]
  },

  fluid_electrons: {
    namelist: 'nl_fluid_electrons',
    label: 'Fluid Electrons',
    desc: 'Electron closure: polytropic P_e = Ke n^gamma_e from the density, or P_e advanced by the electron pressure evolution equation with heat conduction.',
    required: true,
    fields: [
      { key: 'closure', label: 'closure', type: 'str', dim: 0, default: 'polytropic', options: ['polytropic','evolved'],
        hint: 'polytropic: P_e = Ke n^gamma_e in normalized units with n the electron density; evolved: P_e advanced by the electron pressure evolution equation' },
      { key: 'Ke', label: 'Ke', type: 'real', dim: 0, default: 1, requires: { section: 'fluid_electrons', key: 'closure', value: 'polytropic' },
        hint: 'Polytropic coefficient: P_e = Ke * n_e^gamma_e' },
      { key: 'Te', label: 'Te', type: 'str', dim: 0, default: '1.', fparser: true, requires: { section: 'fluid_electrons', key: 'closure', value: 'evolved' },
        hint: 'Initial and inflow electron temperature in code units; expression in x, y, z and electron density n' },
      { key: 'gamma_e', label: 'gamma_e', type: 'real', dim: 0, default: 1.67, hint: 'Adiabatic index of the electrons (both closures)' },
      { key: 'kappa', label: 'kappa', type: 'real', dim: 0, default: 0, requires: { section: 'fluid_electrons', key: 'closure', value: 'evolved' },
        hint: 'Electron heat conductivity (evolved closure only; 0 = no conduction)' },
    ]
  },

  global_output: {
    namelist: 'nl_global_output',
    label: 'Output',
    desc: 'Global diagnostic output settings.',
    required: true,
    fields: [
      { key: 'dump_grid', label: 'dump_grid', type: 'bool', dim: 0, default: true, hint: 'Enable diagnostic dumps' },
      { key: 'dump_every', label: 'dump_every', type: 'int', dim: 0, default: 100, hint: 'Iterations between dumps' },
      { key: 'dump_dt', label: 'dump_dt', type: 'real', dim: 0, default: -1.0, hint: 'Time between dumps (-1=use dump_every)', advanced: true },
      { key: 'output_folder', label: 'output_folder', type: 'str', dim: 0, default: 'Output', hint: 'Output directory' },
      { key: 'io_mode', label: 'io_mode', type: 'str', dim: 0, default: 'PARALLEL',
        options: ['PARALLEL','SERIAL'], hint: 'HDF5 file mode' },
    ]
  },

  ascent: {
    namelist: 'nl_ascent',
    label: 'Ascent In-Situ Visualization',
    desc: 'Render fields, moments, and phase-space plots as PNG files while the simulation runs, with no data dumped to disk. Requires a build linked against Ascent. See <a href="https://ascent.readthedocs.io" target="_blank" rel="noopener noreferrer">ascent.readthedocs.io</a>.',
    required: false,
    enabled: false,
    groups: [
      { title: 'Cadence', keys: ['enabled','dump_every','dump_dt'] },
      { title: 'What to render',
        desc: 'Pick quantities by their dhybridrpy names.',
        keys: ['default_field_type','outputs'] },
      { title: 'Advanced', keys: ['actions_file'] },
    ],
    fields: [
      { key: 'enabled', label: 'enabled', type: 'bool', dim: 0, default: true,
        hint: 'Enable Ascent rendering.' },
      { key: 'dump_every', label: 'dump_every', type: 'int', dim: 0, default: 50,
        hint: 'Render every N steps (step cadence).' },
      { key: 'dump_dt', label: 'dump_dt', type: 'real', dim: 0, default: -1.0, advanced: true,
        hint: 'Render every N time units (physical-time cadence; survives restarts and takes precedence over dump_every). -1 = use dump_every.' },
      { key: 'default_field_type', label: 'default_field_type', type: 'str', dim: 0, default: 'Total',
        options: ['Total','Self','External'],
        hint: 'Type used for any B/E name without an explicit :Type qualifier. Total = full field, Self = self-consistent part (B − Be), External = imposed background (Be/Ee). Case-insensitive; unknown falls back to Total.' },
      { key: 'outputs', label: 'outputs', type: 'str', dim: 0, quotedList: true, default: 'Bmagnitude',
        hint: 'Quantities to render (dhybridrpy naming conventions).',
        phaseCheckboxes: true,
        phaseOptions: [
          { name: 'Bmagnitude', minDim: 0, group: 'Magnetic Field', typed: true },
          { name: 'Bx',         minDim: 0, group: 'Magnetic Field', typed: true },
          { name: 'By',         minDim: 0, group: 'Magnetic Field', typed: true },
          { name: 'Bz',         minDim: 0, group: 'Magnetic Field', typed: true },
          { name: 'Emagnitude', minDim: 0, group: 'Electric Field', typed: true },
          { name: 'Ex',         minDim: 0, group: 'Electric Field', typed: true },
          { name: 'Ey',         minDim: 0, group: 'Electric Field', typed: true },
          { name: 'Ez',         minDim: 0, group: 'Electric Field', typed: true },
          { name: 'Vmagnitude', minDim: 0, group: 'Fluid Velocity (per species)' },
          { name: 'Vx',         minDim: 0, group: 'Fluid Velocity (per species)' },
          { name: 'Vy',         minDim: 0, group: 'Fluid Velocity (per species)' },
          { name: 'Vz',         minDim: 0, group: 'Fluid Velocity (per species)' },
          { name: 'P',          minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pxx',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pyy',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pzz',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pxy',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pyz',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'Pzx',        minDim: 0, group: 'Pressure (per species)' },
          { name: 'x3x2x1',     minDim: 0, group: 'Number Density (per species)' },
          { name: 'x2x1',       minDim: 2, group: 'Position-Position' },
          { name: 'x3x1',       minDim: 3, group: 'Position-Position' },
          { name: 'x3x2',       minDim: 3, group: 'Position-Position' },
          { name: 'u2u1',       minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u3u1',       minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u3u2',       minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u1x1',       minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u2x2',       minDim: 2, group: 'Position-Proper velocity' },
          { name: 'u3x3',       minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u1x2',       minDim: 2, group: 'Position-Proper velocity' },
          { name: 'u1x3',       minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u2x1',       minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u2x3',       minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u3x1',       minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u3x2',       minDim: 2, group: 'Position-Proper velocity' },
          { name: 'utx1',       minDim: 1, group: '|u| vs Position' },
          { name: 'utx2',       minDim: 2, group: '|u| vs Position' },
          { name: 'utx3',       minDim: 3, group: '|u| vs Position' },
          { name: 'etx1',       minDim: 1, group: 'ln(E) vs Position' },
          { name: 'etx2',       minDim: 2, group: 'ln(E) vs Position' },
          { name: 'etx3',       minDim: 3, group: 'ln(E) vs Position' },
        ] },
      { key: 'actions_file', label: 'actions_file', type: 'str', dim: 0, default: '', advanced: true,
        hint: 'Path to a custom ascent_actions.yaml file. Empty = auto-read ascent_actions.yaml from the run directory.' },
    ]
  },

  restart: {
    namelist: 'nl_restart',
    label: 'Restart',
    desc: 'Checkpoint / restart configuration.',
    required: true,
    fields: [
      { key: 'do_restart', label: 'do_restart', type: 'bool', dim: 0, default: false, hint: 'Restarting a previous simulation?' },
      { key: 'save_restart', label: 'save_restart', type: 'bool', dim: 0, default: true, hint: 'Save restart files?' },
      { key: 'save_every', label: 'save_every', type: 'int', dim: 0, default: -1, hint: 'Iterations between restart dumps (-1=disabled)' },
      { key: 'save_every_seconds', label: 'save_every_seconds', type: 'int', dim: 0, default: 7200, hint: 'Wall-time restart (seconds, -1=disabled)' },
      { key: 'check_every', label: 'check_every', type: 'int', dim: 0, default: 100, hint: 'Steps between wall-clock checkpoint checks; does not set the save interval' },
      { key: 'restart_dir', label: 'restart_dir', type: 'str', dim: 0, default: 'Restart', hint: 'Directory for restart checkpoint files (CLI --restart-dir overrides this)' },
    ]
  },

  ext_emf: {
    namelist: 'nl_ext_emf',
    label: 'External EM Fields',
    desc: 'External electromagnetic field expressions (function parser syntax).',
    required: true,
    groups: [
      { title: 'Magnetic Field', keys: ['Bx','By','Bz'] },
      { title: 'Initial B Perturbation (t=0)',
        desc: 'A one-time perturbation added to the self-consistent B at t=0 (applied at the end of StartUpAlgorithm; not on restart). It perturbs the evolving field rather than imposing a constant external field. Shares the supplied constants with the fields above. Default "0." means none.',
        keys: ['Bx_init','By_init','Bz_init'] },
      { title: 'Electric Field', keys: ['Ex','Ey','Ez'] },
      { title: 'Constants & Extras', keys: ['constants','J_ext','B_noise_rms','add_loop','loop_radius','loop_center','loop_current'] },
    ],
    fields: [
      { key: 'Bx', label: 'Bx', type: 'str', dim: 0, default: '0.', hint: 'B_x expression', fparser: true },
      { key: 'By', label: 'By', type: 'str', dim: 0, default: '0.', hint: 'B_y expression', fparser: true },
      { key: 'Bz', label: 'Bz', type: 'str', dim: 0, default: '0.', hint: 'B_z expression', fparser: true },
      { key: 'Bx_init', label: 'Bx_init', type: 'str', dim: 0, default: '0.', fparser: true, advanced: true, hint: 'δB_x expression' },
      { key: 'By_init', label: 'By_init', type: 'str', dim: 0, default: '0.', fparser: true, advanced: true, hint: 'δB_y expression' },
      { key: 'Bz_init', label: 'Bz_init', type: 'str', dim: 0, default: '0.', fparser: true, advanced: true, hint: 'δB_z expression' },
      { key: 'Ex', label: 'Ex', type: 'str', dim: 0, default: '0.', hint: 'E_x expression', fparser: true },
      { key: 'Ey', label: 'Ey', type: 'str', dim: 0, default: '0.', hint: 'E_y expression', fparser: true },
      { key: 'Ez', label: 'Ez', type: 'str', dim: 0, default: '0.', hint: 'E_z expression', fparser: true },
      { key: 'constants', label: 'constants', type: 'real', dim: 'VARIABLE', default: [], textarea: true, hint: 'Comma-separated values for constants(1), constants(2), ... for B/E expressions; blank = none', advanced: true },
      { key: 'J_ext', label: 'J_ext', type: 'real', dim: 'VDIM', default: [0,0,0], hint: 'External current J(x,y,z)',
        dimLabels: ['Jx','Jy','Jz'] },
      { key: 'B_noise_rms', label: 'B_noise_rms', type: 'real', dim: 'VDIM', default: [0,0,0], hint: 'Noise added to B components',
        dimLabels: ['x','y','z'] },
      { key: 'add_loop', label: 'add_loop', type: 'bool', dim: 0, default: false, hint: 'Add a current-loop field' },
      { key: 'loop_radius', label: 'loop_radius', type: 'real', dim: 0, default: 0, hint: 'Current-loop radius' },
      { key: 'loop_center', label: 'loop_center', type: 'real', dim: 'DIM', default: [0,0,0], hint: 'Current-loop center',
        dimLabels: ['x','y','z'] },
      { key: 'loop_current', label: 'loop_current', type: 'real', dim: 0, default: 0, hint: 'Current-loop current' },
    ]
  },

  ext_force: {
    namelist: 'nl_ext_force',
    label: 'External Force',
    desc: 'Langevin antenna driver for turbulence (optional).',
    required: false,
    enabled: false,
    fields: [
      { key: 'drive_type', label: 'drive_type', type: 'str', dim: 0, default: 'TURB',
        options: ['','TURB'], hint: 'Force type (blank=none; TURB=Langevin antenna)' },
      { key: 'k_min', label: 'k_min', type: 'real', dim: 0, default: 4 * Math.PI / 64, hint: 'TURB: minimum |k| of driven shell (default 4π/Lx → drive at L/2)', advanced: true },
      { key: 'k_max', label: 'k_max', type: 'real', dim: 0, default: 6 * Math.PI / 64, hint: 'TURB: maximum |k| of driven shell (default 6π/Lx → drive at L/3)', advanced: true },
      { key: 'mode_amp', label: 'mode_amp', type: 'real', dim: 0, default: 1, hint: 'TURB: forcing mode_amp', advanced: true },
      { key: 'omega', label: 'omega', type: 'real', dim: 0, default: 0, hint: 'TURB: Langevin oscillation omega', advanced: true },
      { key: 't_decay', label: 't_decay', type: 'real', dim: 0, default: 1, hint: 'TURB: Langevin correlation/decay time', advanced: true },
      { key: 't_drive_end', label: 't_drive_end', type: 'real', dim: 0, default: -1, hint: 'TURB: stop driving at this sim time (-1 = drive for full run)', advanced: true },
      { key: 'B_noise_rms', label: 'B_noise_rms', type: 'real', dim: 0, default: 0, hint: 'TURB: paper-style in-plane delta B RMS kick at t=0 (0=disabled)', advanced: true },
    ]
  },

  field_diag: {
    namelist: 'nl_field_diag',
    label: 'Field Diagnostics',
    desc: 'Which field components to dump.',
    required: true,
    fields: [
      { key: 'dump_E', label: 'dump_E', type: 'bool', dim: 4,
        default: [false,false,true,true],
        hint: 'E-field: self-int, self-vec, total-int, total-vec',
        dimLabels: ['Self |E|','Self E\u20d7','Total |E|','Total E\u20d7'] },
      { key: 'dump_B', label: 'dump_B', type: 'bool', dim: 4,
        default: [false,false,true,true],
        hint: 'B-field: self-int, self-vec, total-int, total-vec',
        dimLabels: ['Self |B|','Self B\u20d7','Total |B|','Total B\u20d7'] },
      { key: 'dump_J', label: 'dump_J', type: 'bool', dim: 2,
        default: [false,false],
        hint: 'Current: intensity, vector',
        dimLabels: ['|J|','J\u20d7'] },
      { key: 'dump_Pe', label: 'dump_Pe', type: 'bool', dim: 0, default: false, requires: { section: 'fluid_electrons', key: 'closure', value: 'evolved' },
        hint: 'Electron pressure and temperature dumps (P_e, T_e); evolved closure only' },
    ]
  },

  algorithm: {
    namelist: 'nl_algorithm',
    label: 'Algorithm',
    desc: 'Numerical algorithm settings.',
    required: false,
    fields: [
      { key: 'smooth_external_fields', label: 'smooth_external_fields', type: 'bool', dim: 0, default: false, hint: 'Smooth external/analytic fields at init' },
      { key: 'smooth_fields', label: 'smooth_fields', type: 'bool', dim: 0, default: false, hint: 'Smooth E/B inside per-step field solver' },
      { key: 'moment_filter_passes', label: 'moment_filter_passes', type: 'int', dim: 0, default: 0, hint: 'Number of smoothing passes applied to the deposited density and velocity each step to reduce particle noise' },
      { key: 'E_max_iter', label: 'E_max_iter', type: 'int', dim: 0, default: 4, hint: 'Sub-iterations for the field solver' },
      { key: 'E_rtol', label: 'E_rtol', type: 'real', dim: 0, default: 0.001, hint: 'Electric-field solver tolerance: the sub-iterations stop when max|dE| <= E_atol + E_rtol max|E|' },
      { key: 'E_atol', label: 'E_atol', type: 'real', dim: 0, default: 0, hint: 'Absolute part of the electric-field solver tolerance (0 = relative only)' },
    ]
  },

  loadbalance: {
    namelist: 'nl_loadbalance',
    label: 'Load Balancing',
    desc: 'Balance the simulation workload across processors so none sits idle while another is overloaded.',
    required: false,
    fields: [
      { key: 'enabled', label: 'enabled', type: 'bool', dim: 0, default: true, hint: 'Master on/off switch for load balancing.' },
      { key: 'dynamic', label: 'dynamic', type: 'bool', dim: 0, default: true, hint: 'Re-balance periodically as the run evolves and the busy region moves, instead of balancing only once at startup.' },
      { key: 'every_steps', label: 'every_steps', type: 'int', dim: 0, default: 35, hint: 'How often (in timesteps) to check whether to re-balance. Lower is more responsive but adds overhead.' },
    ]
  },

  particles: {
    namelist: 'nl_particles',
    label: 'Particles',
    desc: 'Global particle settings.',
    required: true,
    fields: [
      { key: 'n_species', label: 'n_species', type: 'int', dim: 0, default: 1, hint: 'Number of ion species (\u22651)', min: 1 },
      { key: 'gpu_memory_fraction', label: 'gpu_memory_fraction', type: 'real', dim: 0, default: 0.75, build: 'GPU',
        hint: 'GPU only: global VRAM fill target, the fraction of free GPU memory the auto-tuned particle buffers grow to (0 < x \u2264 1, default 0.75). Replaces the per-species over-allocation headroom on GPU builds.' },
      { key: 'gpu_min_headroom', label: 'gpu_min_headroom', type: 'real', dim: 0, default: 0, build: 'GPU', advanced: true,
        hint: 'GPU only: minimum per-rank particle-buffer headroom the run must be able to reserve before it starts (>= 0, default 0 = off). May raise the buffers above the gpu_memory_fraction target when capacity allows; the run aborts at startup if no rank can meet it.' },
    ]
  },

  // --- Per-species sections ---
  species: {
    namelist: 'nl_species',
    label: 'Species',
    desc: 'Ion species definition.',
    required: true, perSpecies: true,
    groups: [
      { title: 'Basic', keys: ['name','distribution','ppc','buffer_headroom','charge','mass_to_charge_ratio'] },
      { title: 'Velocity (γ*v)', keys: ['u_drift','u_th','u_th_perp','u_shell','u_scale','theta','u_th_parallel','u_drift_profile','pl_slope','pl_min_factor','pl_max_factor'] },
      { title: 'Density', keys: ['number_density','mask','initial_bounds','constants'] },
      { title: 'Tracking', keys: ['follow_particles','check_duplicate_ids','check_particle_exchange','test_boundaries'] },
    ],
    fields: [
      { key: 'name', label: 'name', type: 'str', dim: 0, default: 'H+', hint: 'Species name' },
      { key: 'distribution', label: 'distribution', type: 'str', dim: 0, default: 'THERMAL',
        options: ['THERMAL','ISO','POWERLAW','JUTTNER','BIMAXWELLIAN'], hint: 'Velocity distribution' },
      { key: 'ppc', label: 'ppc', type: 'int', dim: 'DIM',
        default: [4,4,4], hint: 'Particles per cell', dimLabels: ['x','y','z'] },
      { key: 'buffer_headroom', label: 'buffer_headroom', type: 'real', dim: 0, default: 0.2, build: 'CPU', hint: 'CPU only: particle-buffer over-alloc fraction (≥0). On GPU builds this is auto-tuned from the global gpu_memory_fraction.' },
      { key: 'charge', label: 'charge', type: 'int', dim: 0, default: 1, hint: 'Ionization state of the species (elementary charges per ion); scales the charge density it deposits. Default 1 = singly charged.' },
      { key: 'mass_to_charge_ratio', label: 'mass_to_charge_ratio', type: 'real', dim: 0, default: 1.0, hint: 'Mass-to-charge ratio relative to protons (1 = proton)' },
      { key: 'u_drift', label: 'u_drift', type: 'real', dim: 'VDIM',
        default: [0,0,0], hint: 'Drift velocity (γ*v)', dimLabels: ['u_x','u_y','u_z'] },
      { key: 'u_th', label: 'u_th', type: 'real', dim: 0, default: 1.0, distribution: 'thermal', hint: 'Thermal proper velocity' },
      { key: 'u_th_perp', label: 'u_th_perp', type: 'real', dim: 0, default: 1.0, distribution: 'bimaxwellian', hint: 'Perpendicular thermal proper velocity' },
      { key: 'u_shell', label: 'u_shell', type: 'real', dim: 0, default: 1.0, distribution: 'iso', hint: 'Shell proper velocity' },
      { key: 'u_scale', label: 'u_scale', type: 'real', dim: 0, default: 1.0, distribution: 'powerlaw', hint: 'Power-law proper-velocity scale' },
      { key: 'theta', label: 'theta', type: 'real', dim: 0, default: 1.0, distribution: 'juttner', hint: 'Dimensionless Jüttner temperature' },
      { key: 'u_th_parallel', label: 'u_th_parallel', type: 'real', dim: 0, default: 0, distribution: 'bimaxwellian', hint: 'Parallel thermal velocity (γ*v) (BIMAXWELLIAN only; <=0 falls back to u_th_perp = isotropic)', advanced: true },
      { key: 'u_drift_profile', label: 'u_drift_profile', type: 'strarr', dim: 'VDIM_STR',
        default: ['','',''], fparser: true, hint: 'Velocity (γ*v) expressions. Overrides u_drift when set. Empty = use u_drift.',
        dimLabels: ['u_x','u_y','u_z'] },
      { key: 'pl_slope', label: 'pl_slope', type: 'real', dim: 0, default: -4.0, hint: 'Power-law slope (only for distribution=POWERLAW)' },
      { key: 'pl_min_factor', label: 'pl_min_factor', type: 'real', dim: 0, default: 1.0, hint: 'Minimum proper velocity as a multiple of u_scale (POWERLAW only; requires 0 < pl_min_factor < pl_max_factor)', advanced: true },
      { key: 'pl_max_factor', label: 'pl_max_factor', type: 'real', dim: 0, default: 1000.0, hint: 'Maximum proper velocity as a multiple of u_scale (POWERLAW only; requires 0 < pl_min_factor < pl_max_factor)', advanced: true },
      { key: 'number_density', label: 'number_density', type: 'str', dim: 0, default: '1.', fparser: true, hint: 'Density profile — controls particle charge weight. Use for smooth gradients. e.g. "0.5*(1-htan((x-constants(1))/constants(2)))"' },
      { key: 'mask', label: 'mask', type: 'str', dim: 0, default: '', fparser: true, hint: 'Binary mask: particles only where > 0. Does NOT scale density. Empty = full box. e.g. "if(sqrt((x-constants(5))^2+(y-constants(6))^2)<constants(8),1.,0.)"' },
      { key: 'initial_bounds', label: 'initial_bounds', type: 'real', dim: 'DIM2', layout: 'minmax',
        default: [-1,-1,-1,-1,-1,-1], hint: 'Hard rectangular clip on particle placement (-1 = use full box). Applied before mask. File order: all mins then all maxs (xmin,ymin,zmin,xmax,ymax,zmax).',
        dimLabels: ['x\u2098\u1d62\u2099','x\u2098\u2090\u2093','y\u2098\u1d62\u2099','y\u2098\u2090\u2093','z\u2098\u1d62\u2099','z\u2098\u2090\u2093'] },
      { key: 'constants', label: 'constants', type: 'real', dim: 'VARIABLE', default: [], textarea: true, hint: 'Comma-separated values for constants(1), constants(2), ... for number_density/mask/u_drift_profile; blank = none', advanced: true },
      { key: 'follow_particles', label: 'follow_particles', type: 'bool', dim: 0, default: false, hint: 'Follow/tag particles' },
      { key: 'check_duplicate_ids', label: 'check_duplicate_ids', type: 'bool', dim: 0, default: false, hint: 'Check for duplicate particles' },
      { key: 'check_particle_exchange', label: 'check_particle_exchange', type: 'bool', dim: 0, default: false, hint: 'Warn each step if the MPI particle exchange sent and received counts disagree (debug)', advanced: true },
      { key: 'test_boundaries', label: 'test_boundaries', type: 'bool', dim: 0, default: false, hint: 'Run boundary-treatment sanity checks and inject sentinel particles that get verified each step (debug)', advanced: true },
    ]
  },

  boundary_conditions: {
    namelist: 'nl_boundary_conditions',
    label: 'Boundary Conditions',
    desc: 'Particle boundary conditions per species.',
    required: false, perSpecies: true,
    fields: [
      { key: 'boundary_types', label: 'boundary_types', type: 'strarr', dim: 'DIM2',
        default: ['per','per','per','per','per','per'],
        options: ['per','reflect','open'],
        hint: 'Boundary types',
        dimLabels: ['x\u2097','x\u1d63','y\u2097','y\u1d63','z\u2097','z\u1d63'] },
      { key: 'vsh', label: 'vsh', type: 'real', dim: 0, default: 0, hint: 'Shift velocity (v)' },
      { key: 'compress_ratio', label: 'compress_ratio', type: 'real', dim: 0, default: 1.0, hint: 'Shock compression ratio for the thermal boundary' },
    ]
  },

  plasma_injector: {
    namelist: 'nl_plasma_injector',
    label: 'Plasma Injectors',
    desc: 'Particle injection planes (optional, up to 10 per species).',
    required: false, perSpecies: true, multiPerSpecies: true, maxCount: 10, enabled: false,
    fields: [
      { key: 'plane', label: 'plane', type: 'str', dim: 0, default: 'yz',
        options: ['xy','xz','yz'], hint: 'Injection plane' },
      { key: 'plane_position', label: 'plane_position', type: 'real', dim: 0, default: 0, hint: 'Position of injection plane' },
      { key: 'transverse_bounds', label: 'transverse_bounds', type: 'real', dim: 'BDIM', inputSize: 4, default: [0,0,0,0], hint: 'Bounds along the injection plane',
        dimLabels: ['st1','st2','end1','end2'] },
      { key: 'ppc', label: 'ppc', type: 'int', dim: 'DIM',
        default: [4,4,4], hint: 'Particles per cell', dimLabels: ['x','y','z'] },
      { key: 'u_drift', label: 'u_drift', type: 'real', dim: 'VDIM',
        default: [0,0,0], hint: 'Drift velocity (γ*v)', dimLabels: ['u_x','u_y','u_z'] },
      { key: 'u_th', label: 'u_th', type: 'real', dim: 0, default: 0, distribution: 'thermal', hint: 'Thermal proper velocity' },
      { key: 'u_th_perp', label: 'u_th_perp', type: 'real', dim: 0, default: 0, distribution: 'bimaxwellian', hint: 'Perpendicular thermal proper velocity' },
      { key: 'u_shell', label: 'u_shell', type: 'real', dim: 0, default: 0, distribution: 'iso', hint: 'Shell proper velocity' },
      { key: 'u_scale', label: 'u_scale', type: 'real', dim: 0, default: 0, distribution: 'powerlaw', hint: 'Power-law proper-velocity scale' },
      { key: 'theta', label: 'theta', type: 'real', dim: 0, default: 0, distribution: 'juttner', hint: 'Dimensionless Jüttner temperature' },
      { key: 't_start', label: 't_start', type: 'real', dim: 0, default: 0, hint: 'Start time' },
      { key: 't_end', label: 't_end', type: 'real', dim: 0, default: 1e30, hint: 'End time' },
      { key: 'number_density', label: 'number_density', type: 'real', dim: 0, default: -1, hint: 'Injection density (-1=use species)' },
      { key: 'no_boost', label: 'no_boost', type: 'bool', dim: 0, default: false, hint: 'Disable the sampler boost; drift still sets injection direction and particle supply' },
      { key: 'inward_hemisphere', label: 'inward_hemisphere', type: 'bool', dim: 0, default: false, hint: 'Half-sphere velocity distribution' },
    ]
  },

  diag_species: {
    namelist: 'nl_diag_species',
    label: 'Species Diagnostics',
    desc: 'Phase space and fluid diagnostics per species.',
    required: false, perSpecies: true,
    fields: [
      { key: 'dump_bulk_velocity', label: 'dump_bulk_velocity', type: 'bool', dim: 2,
        default: [false,false], hint: 'Fluid velocity (v): intensity, vector',
        dimLabels: ['|v|','v\u20d7'] },
      { key: 'dump_pressure', label: 'dump_pressure', type: 'bool', dim: 2,
        default: [false,false], hint: 'Pressure tensor',
        dimLabels: ['trace','components'] },
      { key: 'phase_spaces', label: 'phase_spaces', type: 'str', dim: 0, default:
        'x3x2x1,x2x1,u2u1,u3u1,u3u2,u1x1,u2x2,u1x2,u2x1,u3x1,u3x2,utx1,utx2,etx1,etx2',
        hint: 'Phase space diagnostics', phaseCheckboxes: true,
        phaseOptions: [
          { name: 'x3x2x1', minDim: 0, group: 'Charge Density' },
          { name: 'x2x1',   minDim: 2, group: 'Position-Position' },
          { name: 'x3x1',   minDim: 3, group: 'Position-Position' },
          { name: 'x3x2',   minDim: 3, group: 'Position-Position' },
          { name: 'u2u1',   minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u3u1',   minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u3u2',   minDim: 0, group: 'Proper velocity-Proper velocity' },
          { name: 'u1x1',   minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u2x2',   minDim: 2, group: 'Position-Proper velocity' },
          { name: 'u3x3',   minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u1x2',   minDim: 2, group: 'Position-Proper velocity' },
          { name: 'u1x3',   minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u2x1',   minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u2x3',   minDim: 3, group: 'Position-Proper velocity' },
          { name: 'u3x1',   minDim: 1, group: 'Position-Proper velocity' },
          { name: 'u3x2',   minDim: 2, group: 'Position-Proper velocity' },
          { name: 'utx1',   minDim: 1, group: '|u| vs Position' },
          { name: 'utx2',   minDim: 2, group: '|u| vs Position' },
          { name: 'utx3',   minDim: 3, group: '|u| vs Position' },
          { name: 'etx1',   minDim: 1, group: 'ln(E) vs Position' },
          { name: 'etx2',   minDim: 2, group: 'ln(E) vs Position' },
          { name: 'etx3',   minDim: 3, group: 'ln(E) vs Position' },
        ] },
      { key: 'u_bins', label: 'u_bins', type: 'int', dim: 'VDIM',
        default: [512,512,512], hint: 'Proper-velocity resolution',
        dimLabels: ['u1','u2','u3'] },
      { key: 'x_bins', label: 'x_bins', type: 'int', dim: 'DIM',
        default: [256,256,256], hint: 'Spatial resolution',
        dimLabels: ['x','y','z'] },
    ]
  },

  raw_diag: {
    namelist: 'nl_raw_diag',
    label: 'Raw Diagnostics',
    desc: 'Raw particle data dumps per species.',
    required: false, perSpecies: true,
    fields: [
      { key: 'enabled', label: 'enabled', type: 'bool', dim: 0, default: false, hint: 'Enable raw dumps' },
      { key: 'dump_every', label: 'dump_every', type: 'int', dim: 0, default: -1, hint: 'Iterations between raw dumps' },
      { key: 'dump_dt', label: 'dump_dt', type: 'real', dim: 0, default: -1.0, hint: 'Time between raw dumps (-1=use dump_every)', advanced: true },
      { key: 'bounds', label: 'bounds', type: 'real', dim: 'DIM2', layout: 'minmax',
        default: [-1,-1,-1,-1,-1,-1], hint: 'Spatial volume filter: dumps particles with min <= coordinate < max on every axis. Leave all -1 for the whole box, otherwise set every value (the code takes a lone -1 literally). File order: all mins then all maxs (xmin,ymin,zmin,xmax,ymax,zmax).',
        dimLabels: ['x\u2098\u1d62\u2099','x\u2098\u2090\u2093','y\u2098\u1d62\u2099','y\u2098\u2090\u2093','z\u2098\u1d62\u2099','z\u2098\u2090\u2093'] },
      { key: 'sample_fraction', label: 'sample_fraction', type: 'real', dim: 0, default: 1.0, hint: 'Fraction of particles to dump' },
      { key: 'speed_min', label: 'speed_min', type: 'real', dim: 0, default: 0, hint: 'Minimum velocity filter (v)' },
      { key: 'filter', label: 'filter', type: 'str', dim: 0, default: '1.', fparser: true, hint: 'Particle filter expression: result > 0, combined with bounds, speed_min, and sample_fraction. Uses x,y,z and ordinary velocity vx,vy,vz.' },
      { key: 'constants', label: 'constants', type: 'real', dim: 'VARIABLE', default: [], textarea: true, hint: 'Comma-separated values for constants(1), constants(2), ... for filter; blank = none', advanced: true },
    ]
  },

  track_diag: {
    namelist: 'nl_track_diag',
    label: 'Track Diagnostics',
    desc: 'Particle tracking diagnostics per species.',
    required: false, perSpecies: true,
    fields: [
      { key: 'enabled', label: 'enabled', type: 'bool', dim: 0, default: false, hint: 'Enable track dumps' },
      { key: 'include_fields', label: 'include_fields', type: 'bool', dim: 0, default: false, hint: 'Track fields at particle positions' },
      { key: 'dump_every', label: 'dump_every', type: 'int', dim: 0, default: -1, hint: 'Iterations between track writes' },
      { key: 'sample_every', label: 'sample_every', type: 'int', dim: 0, default: -1, hint: 'Store every N iterations' },
      { key: 'track_ids_file', label: 'track_ids_file', type: 'str', dim: 0, default: './input/tags', hint: 'File containing two-part particle IDs to track' },
    ]
  },
};

// Section ordering for the UI sidebar
const SECTION_ORDER = [
  { header: 'Simulation' },
  'node_conf', 'time', 'grid_space',
  { header: 'Physics' },
  'fluid_electrons', 'ext_emf', 'ext_force', 'algorithm',
  { header: 'Output' },
  'global_output', 'ascent', 'field_diag', 'restart',
  { header: 'Particles' },
  'particles', 'loadbalance',
  { header: 'Per Species' },
  'species', 'boundary_conditions', 'plasma_injector',
  'diag_species', 'raw_diag', 'track_diag',
];

// Presets
const PRESETS = [
  {
    name: '2D Periodic Box',
    desc: 'Simple 2D periodic test with 1 species',
    dim: 2,
    values: {
      node_conf: { ranks: [1,1] },
      time: { dt: 0.001768, n_steps: 2000, c: 100 },
      grid_space: { n_cells: [20,20], box_size: [10,10], boundary_types: ['per','per','per','per'] },
      ext_emf: { Bx: '0.6', By: '0.33', Bz: '-.25' },
      species: [{ ppc: [2,2], u_th: 1 }],
      boundary_conditions: [{ boundary_types: ['per','per','per','per'] }],
      diag_species: [{ x_bins: [20,20] }],
      restart: { save_every: -1, save_every_seconds: 7200, check_every: 100 },
    }
  },
  {
    name: '3D Periodic Box',
    desc: 'Simple 3D periodic test with 1 species',
    dim: 3,
    values: {
      node_conf: { ranks: [1,1,1] },
      time: { dt: 0.001443, n_steps: 2000, c: 100 },
      grid_space: { n_cells: [20,20,20], box_size: [10,10,10], boundary_types: ['per','per','per','per','per','per'] },
      ext_emf: { Bx: '0.6', By: '0.33', Bz: '-.25' },
      species: [{ ppc: [2,2,2], u_th: 1 }],
      boundary_conditions: [{ boundary_types: ['per','per','per','per','per','per'] }],
      diag_species: [{ x_bins: [20,20,20] }],
      restart: { save_every: -1, save_every_seconds: 7200, check_every: 100 },
    }
  },
  {
    name: '2D Shock',
    desc: 'Parallel shock with conducting/open boundaries',
    dim: 2,
    values: {
      node_conf: { ranks: [1,1] },
      time: { dt: 0.001768, n_steps: 1024, c: 100 },
      grid_space: { n_cells: [128,128], box_size: [64,64], boundary_types: ['reflect','open','per','per'] },
      global_output: { dump_every: 256, output_folder: 'Output' },
      ext_emf: { Bx: '1.', By: '0.', Bz: '0.' },
      algorithm: { moment_filter_passes: 1, smooth_external_fields: true },
      species: [{ u_drift: [-220,0,0], u_th: 1, ppc: [2,2] }],
      boundary_conditions: [{ boundary_types: ['reflect','open','per','per'] }],
      plasma_injector: [[{ plane: 'yz', plane_position: 64, transverse_bounds: [0,64], u_drift: [-30,0,0], u_th: 1, ppc: [2,2] }]],
      diag_species: [{ x_bins: [128,128] }],
      restart: { save_every: -1, save_every_seconds: 7200, check_every: 100 },
    }
  },
  {
    name: '3D Shock',
    desc: 'Parallel shock with conducting/open boundaries',
    dim: 3,
    values: {
      node_conf: { ranks: [1,1,1] },
      time: { dt: 0.0009623, n_steps: 1024, c: 100 },
      grid_space: { n_cells: [64,64,64], box_size: [32,32,32], boundary_types: ['reflect','open','per','per','per','per'] },
      global_output: { dump_every: 256, output_folder: 'Output' },
      ext_emf: { Bx: '1.', By: '0.', Bz: '0.' },
      algorithm: { moment_filter_passes: 1, smooth_external_fields: true },
      species: [{ u_drift: [-220,0,0], u_th: 1, ppc: [2,2,2] }],
      boundary_conditions: [{ boundary_types: ['reflect','open','per','per','per','per'] }],
      plasma_injector: [[{ plane: 'yz', plane_position: 32, transverse_bounds: [0,0,32,32], u_drift: [-30,0,0], u_th: 1, ppc: [2,2,2] }]],
      diag_species: [{ x_bins: [64,64,64] }],
      restart: { save_every: -1, save_every_seconds: 7200, check_every: 100 },
    }
  },
  {
    name: '2D Alfven Wave',
    desc: 'Small-amplitude Alfven wave propagating along x. Tests wave dispersion and energy conservation.',
    dim: 2,
    values: {
      node_conf: { ranks: [1,1] },
      time: { dt: 0.001768, n_steps: -1, t_end: 256, c: 100 },
      grid_space: { n_cells: [256,32], box_size: [128,16], boundary_types: ['per','per','per','per'] },
      global_output: { dump_every: -1, dump_dt: 1.0, output_folder: 'Output' },
      ext_emf: { Bx: '1.', By: '0.', Bz: '0.' },
      algorithm: { moment_filter_passes: 4, smooth_external_fields: true },
      species: [{ ppc: [8,8], u_th: 0.1, constants: [0.01,0.04908739], u_drift_profile: ['0.','constants(1)*sin(constants(2)*x)','0.'] }],
      boundary_conditions: [{ boundary_types: ['per','per','per','per'] }],
      diag_species: [{ x_bins: [256,32] }],
      field_diag: { dump_B: [false,true,false,true] },
      restart: { save_every: -1, save_every_seconds: 7200, check_every: 100 },
    }
  },
];
