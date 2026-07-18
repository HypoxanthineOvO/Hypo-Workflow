# AceSim Fixture Notes

AceSim replays GPU traces against a selected hardware profile. QV100 at 300 K
is the broad comparison baseline; a plain 77 K profile can also be the local
baseline for optimized 77 K variants.

IPC is simulated committed instructions divided by simulated GPU cycles.
Trace peak memory is host memory pressure, not simulated device capacity.
