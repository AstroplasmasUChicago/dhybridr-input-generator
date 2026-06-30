# dHybridR Input Generator

A browser-based input file generator for the **dHybridR** hybrid particle-in-cell plasma code. Build, edit, and download Fortran namelist input files with nothing to install.

## Use it

- **Online:** [astroplasmasuchicago.github.io/dhybridr-input-generator](https://astroplasmasuchicago.github.io/dhybridr-input-generator/)
- **Offline:** download this repo and open `index.html` in your browser.

It is a static page (HTML, CSS, and JavaScript), so there is no server or build step.

## What it does

- Covers all 17 dHybridR namelists and 100+ parameters.
- CPU or GPU build target: a header selector shows only the fields that build accepts (for example `gpu_mem_frac` on GPU, `spare_size` on CPU). Loading a file auto-detects the build.
- 1D / 2D / 3D switching, with fields that adapt automatically.
- Live preview of the generated input file as you edit.
- Load an existing input file to populate every field.
- Built-in presets (periodic box, shock, Alfven wave) to start from.
- Up to 10 species, each with its own boundaries, diagnostics, injectors, and tracking.
- Copy to clipboard or download a ready-to-run input file.

## License

MIT, see [LICENSE](LICENSE).
