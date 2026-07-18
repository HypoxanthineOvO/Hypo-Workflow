def march_active_rays(ray_state, occupancy_grid):
    """Advance live rays across occupied cells and skip empty space."""
    active = occupancy_grid.lookup(ray_state.position)
    return ray_state.advance(active.step_size)


def compact_alive(ray_states):
    """Remove terminated rays before the next rendering iteration."""
    return [ray for ray in ray_states if ray.alive]
