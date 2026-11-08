# -*- coding: utf-8 -*-
"""Vaku — connecteur geoBoundaries (limites administratives officielles)."""

import json

from . import network

LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"]


class GeoBoundariesError(Exception):
    pass


def download(country_iso3, level, output_path, feedback=None):
    country = country_iso3.strip().upper()
    url = f"https://www.geoboundaries.org/api/current/gbOpen/{country}/{level}/"
    raw = network.blocking_get(url, feedback=feedback)
    metadata = json.loads(raw.decode("utf-8"))
    if isinstance(metadata, list):
        if not metadata:
            raise GeoBoundariesError(f"Aucune limite trouvée pour {country} / {level}.")
        metadata = metadata[0]

    download_url = metadata.get("gjDownloadURL")
    if not download_url:
        raise GeoBoundariesError("URL de téléchargement geoBoundaries introuvable dans la réponse.")

    data = network.blocking_get(download_url, feedback=feedback)
    with open(output_path, "wb") as fh:
        fh.write(data)
    return output_path
