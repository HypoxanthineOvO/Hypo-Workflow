import math


def peak_signal_to_noise_ratio(mse, maximum=1.0):
    """Return PSNR in decibels; higher values mean lower reconstruction error."""
    return 10.0 * math.log10((maximum * maximum) / mse)
