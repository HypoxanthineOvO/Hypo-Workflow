# NeRF Fixture Notes

Volume rendering integrates color and density samples along camera rays. The
fixture's RE acceleration uses occupancy-guided ray marching to skip empty
space, then compacts live rays before the next iteration.

PSNR is a logarithmic reconstruction-fidelity metric measured in decibels.
Higher is better when images use the same value range.
