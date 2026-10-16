# Available Phase Space Diagnostics in dHybridR

Source: `specdiag.f90`, line 69. Total: 22 phase spaces (`PHNUMBER = 22`).

## Charge Density (spatial histogram)
| Name     | Description                    | Min DIM | Notes |
|----------|--------------------------------|---------|-------|
| x3x2x1  | Charge density on grid (1D/2D/3D depending on DIM) | 0 (always) | Deposits particle positions onto the simulation grid via OutputSpecies3D; dimensionality matches DIM, not always 3D despite the name |

## 2D Position-Position
| Name | Description      | Min DIM |
|------|------------------|---------|
| x2x1 | x2 vs x1        | 2       |
| x3x1 | x3 vs x1        | 3       |
| x3x2 | x3 vs x2        | 3       |

## 2D Proper velocity-Proper velocity
| Name | Description      | Min DIM |
|------|------------------|---------|
| u2u1 | u2 vs u1         | 0 (always) |
| u3u1 | u3 vs u1         | 0 (always) |
| u3u2 | u3 vs u2         | 0 (always) |

## 2D Mixed Position-Proper velocity
| Name | Description      | Min DIM |
|------|------------------|---------|
| u1x1 | u1 vs x1         | 1 (always) |
| u2x2 | u2 vs x2         | 2       |
| u3x3 | u3 vs x3         | 3       |
| u1x2 | u1 vs x2         | 2       |
| u1x3 | u1 vs x3         | 3       |
| u2x1 | u2 vs x1         | 1 (always) |
| u2x3 | u2 vs x3         | 3       |
| u3x1 | u3 vs x1         | 1 (always) |
| u3x2 | u3 vs x2         | 2       |

## 2D Total proper velocity vs Position
| Name | Description      | Min DIM |
|------|------------------|---------|
| utx1 | \|u\| vs x1        | 1 (always) |
| utx2 | \|u\| vs x2        | 2       |
| utx3 | \|u\| vs x3        | 3       |

## 2D ln(E) vs Position
| Name | Description      | Min DIM |
|------|------------------|---------|
| etx1 | ln(E) vs x1    | 1 (always) |
| etx2 | ln(E) vs x2    | 2       |
| etx3 | ln(E) vs x3    | 3       |

## Dimension Rules

From `specdiag.f90` line 1836:
```fortran
if ((ptype(1) == SPACETP .and. dir(1) > DIM) .or. (ptype(2) == SPACETP .and. dir(2) > DIM)) then
    ! ERROR: invalid for this DIM
```

- Proper velocity dimensions (u1, u2, u3, ut, et) are ALWAYS available (VDIM=3 always)
- Space dimensions: x1 always, x2 needs DIM≥2, x3 needs DIM≥3
- Exception: x3x2x1 is always available (separate 3D output routine)

Here u = γv is proper velocity. The et* axes contain ln(E), the natural logarithm of normalized kinetic energy.
