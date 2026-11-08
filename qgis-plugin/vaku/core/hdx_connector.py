# -*- coding: utf-8 -*-
"""
Vaku — connecteur HDX (Humanitarian Data Exchange), via l'API CKAN publique.

HDX est lui-même un portail CKAN (data.humdata.org). On recherche les jeux de
données (package_search), puis on liste leurs ressources téléchargeables.
Aucune clé d'API n'est nécessaire pour la lecture publique.
"""

import json
import urllib.parse

from . import network

HDX_BASE = "https://data.humdata.org"


class HdxError(Exception):
    pass


def search_datasets(query, rows=20, feedback=None):
    """Recherche de jeux de données HDX (ex: query='Côte d'Ivoire health')."""
    url = f"{HDX_BASE}/api/3/action/package_search?q={urllib.parse.quote(query)}&rows={rows}"
    raw = network.blocking_get(url, feedback=feedback)
    payload = json.loads(raw.decode("utf-8"))
    if not payload.get("success"):
        raise HdxError("La recherche HDX a échoué.")
    results = payload["result"]["results"]
    return [
        {
            "id": ds["id"],
            "name": ds.get("title") or ds.get("name"),
            "organization": (ds.get("organization") or {}).get("title"),
            "resources": [
                {
                    "id": r["id"],
                    "name": r.get("name") or r.get("format"),
                    "format": (r.get("format") or "").upper(),
                    "url": r.get("url"),
                }
                for r in ds.get("resources", [])
            ],
        }
        for ds in results
    ]


def download_resource(resource_url, destination, feedback=None):
    data = network.blocking_get(resource_url, feedback=feedback)
    with open(destination, "wb") as fh:
        fh.write(data)
    return destination
