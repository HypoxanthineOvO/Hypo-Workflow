QV100_300K = {
    "temperature_k": 300,
    "core_frequency_mhz": 1200,
    "l1_cache_kib": 128,
    "l2_cache_kib": 6144,
}


def cryogenic_profile(temperature_k, frequency_mhz, l1_cache_kib, l2_cache_kib):
    return {
        "temperature_k": temperature_k,
        "core_frequency_mhz": frequency_mhz,
        "l1_cache_kib": l1_cache_kib,
        "l2_cache_kib": l2_cache_kib,
    }
