def instructions_per_cycle(committed_instructions, simulated_cycles):
    """Return simulated instructions completed per modeled GPU cycle."""
    return committed_instructions / simulated_cycles


def trace_memory_peak_bytes(samples):
    """Return peak host memory used while replaying a trace."""
    return max(samples, default=0)
