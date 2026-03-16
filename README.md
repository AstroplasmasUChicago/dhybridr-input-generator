# dHybridR Input Generator

A web-based input file generator for the **dHybridR** hybrid particle-in-cell plasma simulation code. Build, edit, and export Fortran namelist input files entirely in the browser — no server, no build step, no dependencies.

## Features

- **Full schema coverage** — all 17 namelists and 101+ parameters from the dHybridR Fortran source
- **1D / 2D / 3D dimension switching** — fields automatically adapt (vector lengths, boundary pairs, grid axes)
- **Live preview** — the generated Fortran namelist text updates in real time as you edit
- **3 built-in presets** — 2D Periodic Box, 3D Periodic Box, 2D Shock
- **File load & parse** — drag-and-drop or browse to load an existing dHybridR input file; the parser populates every field
- **Multi-species support** — add up to 10 particle species, each with their own boundary conditions, diagnostics, injectors, and tracking
- **Validation** — integer enforcement on integer fields, `planepos` must fall within `boxsize`, boundary type consistency checks
- **Responsive layout** — three-panel desktop view (sidebar navigation · form · live preview) collapses to a mobile-friendly layout with a hamburger menu
- **Dark theme** — easy on the eyes for long editing sessions
- **Copy & download** — one-click copy to clipboard or download as a ready-to-use input file

## Quick Start

This is a **pure static site** — just HTML, CSS, and JavaScript.

### Option 1: Local file server

```bash
cd web-tool
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Open directly

Most browsers will work if you simply open `index.html` as a local file, though the file-load feature may require a server due to browser security policies.

### Option 3: Any static web host

Upload the files to any static hosting service (GitHub Pages, Nginx, Apache, Caddy, etc.).

## UI Overview

```
┌─────────────────────────────────────────────────────────┐
│  dHybridR Input File Generator     [1D|2D|3D]  📂 📋 ⬇ │
├──────────┬─────────────────────────┬────────────────────┤
│ Sidebar  │  Form (active section)  │  Live Preview      │
│          │                         │                    │
│ • Node   │  Parameter fields with  │  !---- nl_time     │
│ • Time   │  labels, hints, and     │  dt = 0.0025       │
│ • Grid   │  defaults. Species      │  niter = 2000      │
│ • Output │  sections repeat per    │  ...               │
│ • EMF    │  num_species.           │  /                 │
│ • ...    │                         │                    │
│ (17 sec) │                         │                    │
└──────────┴─────────────────────────┴────────────────────┘
```

On mobile, the sidebar becomes a slide-out drawer triggered by the ☰ hamburger button.

## File Structure

| File             | Description |
|------------------|-------------|
| `index.html`     | Main HTML page — minimal markup; the UI is built dynamically by `app.js` |
| `style.css`      | All styles — dark theme, responsive breakpoints, hamburger menu, modals |
| `schema.js`      | Complete schema of all 17 namelists with field definitions, types, defaults, dimension rules, and 4 presets |
| `generator.js`   | Converts the in-memory form state into a valid Fortran namelist input file string |
| `parser.js`      | Parses an existing dHybridR input file back into the form state object |
| `app.js`         | Application logic — state management, DOM rendering, event handling, validation, presets, file I/O |

## Namelists Covered

| # | Namelist | Description |
|---|----------|-------------|
| 1 | `nl_node_conf` | MPI process decomposition |
| 2 | `nl_time` | Time stepping (dt, niter, c) |
| 3 | `nl_grid_space` | Grid cells, box size, boundary types |
| 4 | `nl_global_output` | Output folder, dump frequency |
| 5 | `nl_restart` | Restart file configuration |
| 6 | `nl_ext_emf` | External electromagnetic fields |
| 7 | `nl_ext_force` | External force terms |
| 8 | `nl_field_diag` | Field diagnostic output |
| 9 | `nl_algorithm` | Smoothing, filtering, sub-cycling |
| 10 | `nl_loadbalance` | Dynamic load balancing |
| 11 | `nl_particles` | Global particle settings (num_species) |
| 12 | `nl_species` | Per-species parameters (×N) |
| 13 | `nl_boundary_conditions` | Per-species boundary conditions (×N) |
| 14 | `nl_plasma_injector` | Per-species plasma injection (×N, up to 10 injectors each) |
| 15 | `nl_diag_species` | Per-species diagnostics (×N) |
| 16 | `nl_raw_diag` | Per-species raw particle dumps (×N) |
| 17 | `nl_track_diag` | Per-species particle tracking (×N) |

## License

MIT — see [LICENSE](LICENSE).
