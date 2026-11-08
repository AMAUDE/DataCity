# -*- coding: utf-8 -*-
"""
Vaku — connecteurs "institutions internationales" (BAD, FMI, ONU, UNICEF).

AVERTISSEMENT DE FIABILITÉ — à lire avant d'utiliser ces connecteurs :
ces quatre API publiques ne sont pas sous le contrôle de Vaku ni de DataCity,
changent périodiquement de forme, et n'ont pas pu être vérifiées par un appel
réel depuis cet environnement de développement (accès réseau restreint ici).
Les URLs ci-dessous reflètent la documentation publique la plus fiable
trouvée au moment de l'écriture, mais DOIVENT être testées par l'utilisateur
(bouton « Tester la connexion » de l'onglet International) avant tout usage :

  - FMI (IMF)  : service SDMX hérité "dataservices.imf.org". Le FMI migre
                 vers une nouvelle API SDMX 3.0 (data.imf.org / api.imf.org) ;
                 certains jeux de données hérités (ex. IFS) peuvent être
                 partiellement retirés.
  - UNICEF     : SDMX REST "sdmx.data.unicef.org" — doc. officielle :
                 https://data.unicef.org/sdmx-api-documentation/
  - ONU (SDG)  : API officielle "unstats.un.org/SDGAPI" — explicitement
                 documentée par l'ONU comme une API de TEST, sujette à
                 changement ; utilise des codes de zone M49 (pas ISO3).
  - BAD (AfDB) : aucun endpoint stable et documenté publiquement n'a pu être
                 confirmé. Un mode « URL personnalisée » est fourni :
                 l'utilisateur colle l'URL de requête/export BAD trouvée sur
                 le portail (souvent exportable en CSV/JSON depuis l'UI web).

Chaque fonction renvoie les octets bruts de la réponse : c'est à l'appelant
(UI) de décider de l'interpréter comme JSON/SDMX-JSON/CSV, ou de l'enregistrer
tel quel pour inspection manuelle en cas d'échec de parsing.
"""

import json
import urllib.parse

from . import network

CIV_ISO3 = "CIV"
CIV_M49 = "384"  # Côte d'Ivoire — code de zone M49 des Nations Unies


class InternationalError(Exception):
    pass


# ---------------------------------------------------------------------
# FMI / IMF
# ---------------------------------------------------------------------

IMF_LEGACY_BASE = "http://dataservices.imf.org/REST/SDMX_JSON.svc"


def imf_fetch(dataset, indicator, country_code="CI", frequency="A",
              start_period=None, end_period=None, feedback=None):
    """
    Service SDMX hérité du FMI (CompactData).
    `dataset` ex. 'IFS' (International Financial Statistics) — peut être
    retiré/scindé côté FMI ; vérifier avec `imf_list_dataflows()` d'abord.
    `country_code` : code pays à 2 lettres attendu par ce service
    (ex. 'CI' pour la Côte d'Ivoire) — PAS le code ISO3.
    """
    key = f"{frequency}.{country_code}.{indicator}"
    url = f"{IMF_LEGACY_BASE}/CompactData/{dataset}/{key}"
    params = {}
    if start_period:
        params["startPeriod"] = start_period
    if end_period:
        params["endPeriod"] = end_period
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return network.blocking_get(url, feedback=feedback)


def imf_list_dataflows(feedback=None):
    """Liste les jeux de données disponibles sur le service hérité du FMI."""
    return network.blocking_get(f"{IMF_LEGACY_BASE}/Dataflow", feedback=feedback)


# ---------------------------------------------------------------------
# UNICEF
# ---------------------------------------------------------------------

UNICEF_BASE = "https://sdmx.data.unicef.org/ws/public/sdmxapi/rest"


def unicef_fetch(dataflow, indicator_code, country_iso3=CIV_ISO3, feedback=None):
    """
    SDMX REST UNICEF : GET /data/UNICEF,{dataflow},/{key}?format=sdmx-json
    `key` typique : {PAYS}.{INDICATEUR}. Si la requête échoue, l'ordre des
    dimensions dépend du dataflow : vérifier via `unicef_list_dataflows()`.
    """
    key = f"{country_iso3}.{indicator_code}"
    url = f"{UNICEF_BASE}/data/UNICEF,{dataflow},/{key}?format=sdmx-json"
    return network.blocking_get(url, feedback=feedback)


def unicef_list_dataflows(feedback=None):
    return network.blocking_get(f"{UNICEF_BASE}/dataflow/UNICEF", feedback=feedback)


# ---------------------------------------------------------------------
# ONU — SDG API (unstats.un.org)
# ---------------------------------------------------------------------

UN_SDG_BASE = "https://unstats.un.org/SDGAPI/v1/sdg"


def un_sdg_fetch(indicator_code, area_code=CIV_M49, page_size=100, feedback=None):
    """
    API officielle des indicateurs ODD (SDG) de l'ONU. `area_code` est un
    code de zone M49 (384 = Côte d'Ivoire), PAS un code ISO3.
    """
    params = {"indicator": indicator_code, "areaCode": area_code, "pageSize": page_size}
    url = f"{UN_SDG_BASE}/Indicator/Data?{urllib.parse.urlencode(params)}"
    return network.blocking_get(url, feedback=feedback)


def un_sdg_list_indicators(feedback=None):
    return network.blocking_get(f"{UN_SDG_BASE}/Indicator/List", feedback=feedback)


# ---------------------------------------------------------------------
# BAD / AfDB — aucun endpoint confirmé : mode URL personnalisée uniquement
# ---------------------------------------------------------------------

def bad_fetch_custom_url(url, feedback=None):
    """
    Aucun endpoint BAD stable n'a pu être vérifié au moment de l'écriture.
    L'utilisateur fournit l'URL de requête/export exacte trouvée sur
    https://dataportal.opendataforafrica.org (ou un portail pays, ex.
    https://cotedivoire.opendataforafrica.org) — généralement exportable en
    CSV/Excel/JSON depuis l'interface web du portail, parfois via une URL
    d'API SDMX si la DSD du jeu de données est publiée.
    """
    if not url or not url.strip():
        raise InternationalError("URL BAD personnalisée requise (voir docstring bad_fetch_custom_url).")
    return network.blocking_get(url.strip(), feedback=feedback)


def try_parse_json(raw_bytes):
    try:
        return json.loads(raw_bytes.decode("utf-8")), None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)
