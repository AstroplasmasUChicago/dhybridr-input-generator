// Historical input names used when importing old files and presets.
// Update these mappings by hand when solver input names change.
const INPUT_NAMES = {
  "keys": [
    {
      "section": "node_conf",
      "name": "ranks",
      "old": [
        {
          "section": "node_conf",
          "name": "node_number"
        }
      ]
    },
    {
      "section": "time",
      "name": "dt",
      "old": []
    },
    {
      "section": "time",
      "name": "n_steps",
      "old": [
        {
          "section": "time",
          "name": "niter"
        }
      ]
    },
    {
      "section": "time",
      "name": "t_end",
      "old": [
        {
          "section": "time",
          "name": "tend"
        }
      ]
    },
    {
      "section": "time",
      "name": "c",
      "old": []
    },
    {
      "section": "grid_space",
      "name": "n_cells",
      "old": [
        {
          "section": "grid_space",
          "name": "ncells"
        }
      ]
    },
    {
      "section": "grid_space",
      "name": "box_size",
      "old": [
        {
          "section": "grid_space",
          "name": "boxsize"
        }
      ]
    },
    {
      "section": "grid_space",
      "name": "boundary_types",
      "old": [
        {
          "section": "grid_space",
          "name": "bdtype"
        }
      ]
    },
    {
      "section": "fluid_electrons",
      "name": "closure",
      "old": []
    },
    {
      "section": "fluid_electrons",
      "name": "Ke",
      "old": [
        {
          "section": "grid_space",
          "name": "K"
        }
      ]
    },
    {
      "section": "fluid_electrons",
      "name": "Te",
      "old": []
    },
    {
      "section": "fluid_electrons",
      "name": "gamma_e",
      "old": [
        {
          "section": "fluid_electrons",
          "name": "gamma"
        },
        {
          "section": "grid_space",
          "name": "gamma"
        }
      ]
    },
    {
      "section": "fluid_electrons",
      "name": "kappa",
      "old": []
    },
    {
      "section": "particles",
      "name": "n_species",
      "old": [
        {
          "section": "particles",
          "name": "num_species"
        }
      ]
    },
    {
      "section": "particles",
      "name": "gpu_memory_fraction",
      "old": [
        {
          "section": "particles",
          "name": "gpu_mem_frac"
        }
      ]
    },
    {
      "section": "particles",
      "name": "gpu_min_headroom",
      "old": [
        {
          "section": "particles",
          "name": "gpu_min_spare_frac"
        }
      ]
    },
    {
      "section": "species",
      "name": "name",
      "old": []
    },
    {
      "section": "species",
      "name": "ppc",
      "old": [
        {
          "section": "species",
          "name": "num_par"
        }
      ]
    },
    {
      "section": "species",
      "name": "charge",
      "old": [
        {
          "section": "species",
          "name": "ir"
        }
      ]
    },
    {
      "section": "species",
      "name": "mass_to_charge_ratio",
      "old": []
    },
    {
      "section": "species",
      "name": "distribution",
      "old": [
        {
          "section": "species",
          "name": "dist"
        }
      ]
    },
    {
      "section": "species",
      "name": "u_drift",
      "old": [
        {
          "section": "species",
          "name": "vdrift"
        }
      ]
    },
    {
      "section": "species",
      "name": "u_drift_profile",
      "old": [
        {
          "section": "species",
          "name": "vsp"
        }
      ]
    },
    {
      "section": "species",
      "name": "u_th_parallel",
      "old": [
        {
          "section": "species",
          "name": "vth_par"
        }
      ]
    },
    {
      "section": "species",
      "name": "number_density",
      "old": [
        {
          "section": "species",
          "name": "nsp"
        }
      ]
    },
    {
      "section": "species",
      "name": "mask",
      "old": [
        {
          "section": "species",
          "name": "nsp_domain"
        }
      ]
    },
    {
      "section": "species",
      "name": "initial_bounds",
      "old": [
        {
          "section": "species",
          "name": "domain_boundary"
        }
      ]
    },
    {
      "section": "species",
      "name": "buffer_headroom",
      "old": [
        {
          "section": "species",
          "name": "spare_size"
        }
      ]
    },
    {
      "section": "species",
      "name": "pl_slope",
      "old": []
    },
    {
      "section": "species",
      "name": "pl_min_factor",
      "old": [
        {
          "section": "species",
          "name": "pl_min"
        }
      ]
    },
    {
      "section": "species",
      "name": "pl_max_factor",
      "old": [
        {
          "section": "species",
          "name": "pl_max"
        }
      ]
    },
    {
      "section": "species",
      "name": "constants",
      "old": [
        {
          "section": "species",
          "name": "ct"
        }
      ]
    },
    {
      "section": "species",
      "name": "follow_particles",
      "old": [
        {
          "section": "species",
          "name": "follow"
        }
      ]
    },
    {
      "section": "species",
      "name": "check_duplicate_ids",
      "old": [
        {
          "section": "species",
          "name": "chk_dup"
        }
      ]
    },
    {
      "section": "species",
      "name": "check_particle_exchange",
      "old": [
        {
          "section": "species",
          "name": "chk_mpi_balance"
        }
      ]
    },
    {
      "section": "species",
      "name": "test_boundaries",
      "old": [
        {
          "section": "species",
          "name": "chk_test_boundaries"
        }
      ]
    },
    {
      "section": "boundary_conditions",
      "name": "boundary_types",
      "old": [
        {
          "section": "boundary_conditions",
          "name": "bdtype"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "plane",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "transverse_bounds",
      "old": [
        {
          "section": "plasma_injector",
          "name": "boundary"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "plane_position",
      "old": [
        {
          "section": "plasma_injector",
          "name": "planepos"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "ppc",
      "old": [
        {
          "section": "plasma_injector",
          "name": "num_par"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "u_drift",
      "old": [
        {
          "section": "plasma_injector",
          "name": "vdrift"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "number_density",
      "old": [
        {
          "section": "plasma_injector",
          "name": "inj_dens"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "t_start",
      "old": [
        {
          "section": "plasma_injector",
          "name": "sttime"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "t_end",
      "old": [
        {
          "section": "plasma_injector",
          "name": "endtime"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "no_boost",
      "old": [
        {
          "section": "plasma_injector",
          "name": "nodrift"
        }
      ]
    },
    {
      "section": "plasma_injector",
      "name": "hemisphere",
      "old": [
        {
          "section": "plasma_injector",
          "name": "halfsphere"
        },
        {
          "section": "plasma_injector",
          "name": "inward_hemisphere"
        }
      ]
    },
    {
      "section": "algorithm",
      "name": "E_max_iter",
      "old": [
        {
          "section": "algorithm",
          "name": "subniter"
        }
      ]
    },
    {
      "section": "algorithm",
      "name": "moment_filter_passes",
      "old": [
        {
          "section": "algorithm",
          "name": "filternpass"
        }
      ]
    },
    {
      "section": "algorithm",
      "name": "smooth_fields",
      "old": [
        {
          "section": "algorithm",
          "name": "ifsmoothfields"
        }
      ]
    },
    {
      "section": "algorithm",
      "name": "smooth_external_fields",
      "old": [
        {
          "section": "algorithm",
          "name": "ifsmoothextfields"
        }
      ]
    },
    {
      "section": "algorithm",
      "name": "E_rtol",
      "old": []
    },
    {
      "section": "algorithm",
      "name": "E_atol",
      "old": []
    },
    {
      "section": "loadbalance",
      "name": "enabled",
      "old": [
        {
          "section": "loadbalance",
          "name": "loadbalance"
        }
      ]
    },
    {
      "section": "loadbalance",
      "name": "dynamic",
      "old": [
        {
          "section": "loadbalance",
          "name": "ifdynamicloadbalance"
        }
      ]
    },
    {
      "section": "loadbalance",
      "name": "every_steps",
      "old": [
        {
          "section": "loadbalance",
          "name": "dynamicloadbalancestep"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "Bx",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "By",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Bz",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Ex",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Ey",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Ez",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Bx_init",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "By_init",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "Bz_init",
      "old": []
    },
    {
      "section": "ext_emf",
      "name": "J_ext",
      "old": [
        {
          "section": "ext_emf",
          "name": "Jext"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "B_noise_rms",
      "old": [
        {
          "section": "ext_emf",
          "name": "NoiseLevel"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "add_loop",
      "old": [
        {
          "section": "ext_emf",
          "name": "adddipole"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "loop_radius",
      "old": [
        {
          "section": "ext_emf",
          "name": "a_dipole"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "loop_center",
      "old": [
        {
          "section": "ext_emf",
          "name": "pos_dipole"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "loop_current",
      "old": [
        {
          "section": "ext_emf",
          "name": "curr_dipole"
        }
      ]
    },
    {
      "section": "ext_emf",
      "name": "constants",
      "old": [
        {
          "section": "ext_emf",
          "name": "ct"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "drive_type",
      "old": [
        {
          "section": "ext_force",
          "name": "ftype"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "mode_amp",
      "old": [
        {
          "section": "ext_force",
          "name": "amplitude"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "omega",
      "old": [
        {
          "section": "ext_force",
          "name": "frequency"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "t_decay",
      "old": []
    },
    {
      "section": "ext_force",
      "name": "k_min",
      "old": [
        {
          "section": "ext_force",
          "name": "kmin"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "k_max",
      "old": [
        {
          "section": "ext_force",
          "name": "kmax"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "t_drive_end",
      "old": [
        {
          "section": "ext_force",
          "name": "tend"
        }
      ]
    },
    {
      "section": "ext_force",
      "name": "B_noise_rms",
      "old": [
        {
          "section": "ext_force",
          "name": "init_b_amp"
        }
      ]
    },
    {
      "section": "global_output",
      "name": "dump_grid",
      "old": [
        {
          "section": "global_output",
          "name": "dodump"
        }
      ]
    },
    {
      "section": "global_output",
      "name": "dump_every",
      "old": [
        {
          "section": "global_output",
          "name": "ndump"
        }
      ]
    },
    {
      "section": "global_output",
      "name": "dump_dt",
      "old": [
        {
          "section": "global_output",
          "name": "tdump"
        }
      ]
    },
    {
      "section": "global_output",
      "name": "output_folder",
      "old": []
    },
    {
      "section": "global_output",
      "name": "io_mode",
      "old": [
        {
          "section": "global_output",
          "name": "filemode"
        }
      ]
    },
    {
      "section": "field_diag",
      "name": "dump_E",
      "old": [
        {
          "section": "field_diag",
          "name": "dmp_efld"
        }
      ]
    },
    {
      "section": "field_diag",
      "name": "dump_B",
      "old": [
        {
          "section": "field_diag",
          "name": "dmp_bfld"
        }
      ]
    },
    {
      "section": "field_diag",
      "name": "dump_J",
      "old": [
        {
          "section": "field_diag",
          "name": "dmp_jfld"
        }
      ]
    },
    {
      "section": "field_diag",
      "name": "dump_Pe",
      "old": [
        {
          "section": "field_diag",
          "name": "dmp_pefld",
          "message": "Use field_diag.dump_Pe and field_diag.dump_Te to select the outputs separately."
        }
      ]
    },
    {
      "section": "field_diag",
      "name": "dump_Te",
      "old": []
    },
    {
      "section": "diag_species",
      "name": "dump_bulk_velocity",
      "old": [
        {
          "section": "diag_species",
          "name": "dmp_vfld"
        }
      ]
    },
    {
      "section": "diag_species",
      "name": "dump_pressure",
      "old": [
        {
          "section": "diag_species",
          "name": "dmp_pfld"
        }
      ]
    },
    {
      "section": "diag_species",
      "name": "phase_spaces",
      "old": [
        {
          "section": "diag_species",
          "name": "phasespaces"
        }
      ]
    },
    {
      "section": "diag_species",
      "name": "u_bins",
      "old": [
        {
          "section": "diag_species",
          "name": "pres"
        }
      ]
    },
    {
      "section": "diag_species",
      "name": "x_bins",
      "old": [
        {
          "section": "diag_species",
          "name": "xres"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "enabled",
      "old": [
        {
          "section": "raw_diag",
          "name": "raw_dump"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "dump_every",
      "old": [
        {
          "section": "raw_diag",
          "name": "raw_ndump"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "dump_dt",
      "old": [
        {
          "section": "raw_diag",
          "name": "raw_tdump"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "bounds",
      "old": [
        {
          "section": "raw_diag",
          "name": "raw_volume"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "sample_fraction",
      "old": [
        {
          "section": "raw_diag",
          "name": "raw_dump_fraction"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "speed_min",
      "old": [
        {
          "section": "raw_diag",
          "name": "v_min"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "filter",
      "old": [
        {
          "section": "raw_diag",
          "name": "selectrule"
        }
      ]
    },
    {
      "section": "raw_diag",
      "name": "constants",
      "old": [
        {
          "section": "raw_diag",
          "name": "ct"
        }
      ]
    },
    {
      "section": "track_diag",
      "name": "enabled",
      "old": [
        {
          "section": "track_diag",
          "name": "track_dump"
        }
      ]
    },
    {
      "section": "track_diag",
      "name": "include_fields",
      "old": [
        {
          "section": "track_diag",
          "name": "track_fields"
        }
      ]
    },
    {
      "section": "track_diag",
      "name": "dump_every",
      "old": [
        {
          "section": "track_diag",
          "name": "track_ndump"
        }
      ]
    },
    {
      "section": "track_diag",
      "name": "sample_every",
      "old": [
        {
          "section": "track_diag",
          "name": "track_nstore"
        }
      ]
    },
    {
      "section": "track_diag",
      "name": "track_ids_file",
      "old": [
        {
          "section": "track_diag",
          "name": "track_info_file"
        }
      ]
    },
    {
      "section": "restart",
      "name": "do_restart",
      "old": []
    },
    {
      "section": "restart",
      "name": "save_restart",
      "old": []
    },
    {
      "section": "restart",
      "name": "save_every",
      "old": [
        {
          "section": "restart",
          "name": "restart_step"
        }
      ]
    },
    {
      "section": "restart",
      "name": "save_every_seconds",
      "old": [
        {
          "section": "restart",
          "name": "restart_time"
        }
      ]
    },
    {
      "section": "restart",
      "name": "check_every",
      "old": [
        {
          "section": "restart",
          "name": "restart_time_step"
        }
      ]
    },
    {
      "section": "restart",
      "name": "restart_dir",
      "old": []
    },
    {
      "section": "ascent",
      "name": "enabled",
      "old": []
    },
    {
      "section": "ascent",
      "name": "dump_every",
      "old": [
        {
          "section": "ascent",
          "name": "ndump"
        }
      ]
    },
    {
      "section": "ascent",
      "name": "dump_dt",
      "old": [
        {
          "section": "ascent",
          "name": "tdump"
        }
      ]
    },
    {
      "section": "ascent",
      "name": "default_field_type",
      "old": []
    },
    {
      "section": "ascent",
      "name": "outputs",
      "old": []
    },
    {
      "section": "ascent",
      "name": "actions_file",
      "old": []
    },
    {
      "section": "species",
      "name": "u_th",
      "old": []
    },
    {
      "section": "species",
      "name": "u_th_perp",
      "old": []
    },
    {
      "section": "species",
      "name": "u_shell",
      "old": []
    },
    {
      "section": "species",
      "name": "u_scale",
      "old": []
    },
    {
      "section": "species",
      "name": "theta",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "u_th",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "u_th_perp",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "u_shell",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "u_scale",
      "old": []
    },
    {
      "section": "plasma_injector",
      "name": "theta",
      "old": []
    }
  ],
  "phases": {
    "p1x1": "u1x1",
    "p1x2": "u1x2",
    "p1x3": "u1x3",
    "p2x1": "u2x1",
    "p2x2": "u2x2",
    "p2x3": "u2x3",
    "p3x1": "u3x1",
    "p3x2": "u3x2",
    "p3x3": "u3x3",
    "p2p1": "u2u1",
    "p3p1": "u3u1",
    "p3p2": "u3u2",
    "ptx1": "utx1",
    "ptx2": "utx2",
    "ptx3": "utx3"
  },
  "removed": [
    {
      "section": "time",
      "name": "stiter",
      "message": "Remove stiter; use restart.do_restart with a restart file to resume a run."
    },
    {
      "section": "time",
      "name": "adaptive_dt",
      "message": "Adaptive timestepping was removed; dt stays at the input value."
    },
    {
      "section": "time",
      "name": "cfl_factor",
      "message": "Adaptive timestepping was removed; dt stays at the input value."
    },
    {
      "section": "boundary_conditions",
      "name": "vth",
      "message": "The thermal-bath particle boundary was removed."
    },
    {
      "section": "boundary_conditions",
      "name": "vsh",
      "message": "The faux-shock particle boundary was removed; this parameter has no effect on supported boundaries."
    },
    {
      "section": "boundary_conditions",
      "name": "compress_ratio",
      "message": "The faux-shock particle boundary was removed; this parameter has no effect on supported boundaries."
    },
    {
      "section": "algorithm",
      "name": "ifsmooth",
      "message": "Smoothing is always on; moment_filter_passes, smooth_fields and smooth_external_fields control it."
    },
    {
      "section": "algorithm",
      "name": "compensate",
      "message": "The key had no effect: n and V use the binomial filter, E and B the compensated one."
    },
    {
      "section": "time",
      "name": "t0",
      "message": "The key had no effect; simulation time starts at zero unless restored from a restart file."
    },
    {
      "section": "species",
      "name": "vnorm",
      "message": "The key had no effect; vnorm does not set the particle velocity direction."
    },
    {
      "section": "algorithm",
      "name": "allowederror",
      "message": "Use E_rtol and E_atol to set the electric-field solver tolerances."
    },
    {
      "section": "particles",
      "name": "xnmin",
      "message": "The key had no effect; the field solver computes its minimum-density floor automatically."
    },
    {
      "section": "particles",
      "name": "part_sort_step",
      "message": "The key had no effect."
    },
    {
      "section": "species",
      "name": "rqm",
      "message": "Use mass_to_charge_ratio (a positive magnitude); set charge < 0 for negative charge."
    },
    {
      "section": "global_output",
      "name": "units",
      "message": "Output uses normalized units; unit conversion is no longer supported."
    },
    {
      "section": "global_output",
      "name": "n0",
      "message": "Output uses normalized units; unit conversion is no longer supported."
    },
    {
      "section": "global_output",
      "name": "b0",
      "message": "Output uses normalized units; unit conversion is no longer supported."
    },
    {
      "section": "algorithm",
      "name": "resistivity",
      "message": "Resistivity was removed; Ohm's law has no resistive term."
    },
    {
      "section": "plasma_injector",
      "name": "vboost",
      "message": "The faux-shock injector was removed; vboost no longer selects an injection mode."
    },
    {
      "section": "species",
      "name": "n_constants",
      "message": "The constant count is inferred from constants. Supply consecutive entries starting at constants(1)."
    },
    {
      "section": "ext_emf",
      "name": "n_constants",
      "message": "The constant count is inferred from constants. Supply consecutive entries starting at constants(1)."
    },
    {
      "section": "raw_diag",
      "name": "n_constants",
      "message": "The constant count is inferred from constants. Supply consecutive entries starting at constants(1)."
    }
  ],
  "thermal": {
    "thermal": "u_th",
    "bimaxwellian": "u_th_perp",
    "iso": "u_shell",
    "powerlaw": "u_scale",
    "juttner": "theta"
  }
};
