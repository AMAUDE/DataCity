# -*- coding: utf-8 -*-
"""
Vaku — connecteur OpenStreetMap / Overpass API.

Interroge l'emprise visible du canevas QGIS (reprojetée en EPSG:4326) et
convertit la réponse Overpass (nœuds/chemins) en GeoJSON. Plusieurs miroirs
Overpass sont essayés dans l'ordre jusqu'à succès.
"""

import json

from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsProject,
)

from . import network

DEFAULT_OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# (type d'élément Overpass, clé, valeur ; valeur "*" = n'importe laquelle)
CATEGORIES = {
    "Bâtiments": ("way", "building", "*"),
    "Routes": ("way", "highway", "*"),
    "Écoles": ("nwr", "amenity", "school"),
    "Hôpitaux": ("nwr", "amenity", "hospital"),
    "Centres de santé": ("nwr", "amenity", "clinic"),
    "Marchés": ("nwr", "amenity", "marketplace"),
    "Commerces": ("nwr", "shop", "*"),
    "Cours d'eau": ("way", "waterway", "*"),
    "Plans d'eau": ("way", "natural", "water"),
    "Zones résidentielles": ("way", "landuse", "residential"),
    "Équipements publics": ("nwr", "amenity", "*"),
    "Tous les objets": ("nwr", None, None),
}

MAX_BBOX_DEGREES = 5


class OsmError(Exception):
    pass


def get_bbox_from_canvas(iface):
    """Emprise visible du canevas, reprojetée en EPSG:4326 -> (south, west, north, east)."""
    canvas = iface.mapCanvas()
    source_crs = canvas.mapSettings().destinationCrs()
    target_crs = QgsCoordinateReferenceSystem("EPSG:4326")
    transform = QgsCoordinateTransform(source_crs, target_crs, QgsProject.instance())
    extent = transform.transformBoundingBox(canvas.extent())
    return extent.yMinimum(), extent.xMinimum(), extent.yMaximum(), extent.xMaximum()


def _selector_for(category, bbox):
    south, west, north, east = bbox
    box = f"({south},{west},{north},{east})"
    element_type, key, value = CATEGORIES[category]

    if key is None:
        return f"node{box};way{box};"

    tag = f'["{key}"]' if value == "*" else f'["{key}"="{value}"]'

    if element_type == "nwr":
        return f"node{tag}{box};way{tag}{box};"
    return f"{element_type}{tag}{box};"


def build_query(category, bbox):
    south, west, north, east = bbox
    if abs(north - south) > MAX_BBOX_DEGREES or abs(east - west) > MAX_BBOX_DEGREES:
        raise OsmError("Emprise trop grande (> %s°). Zoomez sur une zone plus petite." % MAX_BBOX_DEGREES)
    selector = _selector_for(category, bbox)
    return f"[out:json][timeout:90];({selector});out body geom;"


def _osm_to_geojson(elements):
    features = []
    for element in elements:
        tags = element.get("tags") or {}
        if not tags:
            continue

        element_type = element.get("type")
        properties = dict(tags)
        properties["osm_id"] = element.get("id")
        properties["osm_type"] = element_type

        geometry = None
        if element_type == "node":
            geometry = {"type": "Point", "coordinates": [element["lon"], element["lat"]]}
        elif element_type == "way":
            coords = [[pt["lon"], pt["lat"]] for pt in element.get("geometry", []) if "lon" in pt and "lat" in pt]
            if len(coords) < 2:
                continue
            if len(coords) >= 4 and coords[0] == coords[-1]:
                geometry = {"type": "Polygon", "coordinates": [coords]}
            else:
                geometry = {"type": "LineString", "coordinates": coords}

        if geometry is None:
            continue
        features.append({"type": "Feature", "properties": properties, "geometry": geometry})

    return {"type": "FeatureCollection", "features": features}


def download(category, bbox, output_path, endpoints=None, feedback=None):
    """Exécute la requête Overpass (bloquant — à appeler depuis un QgsTask) et écrit le GeoJSON."""
    query = build_query(category, bbox)
    last_error = None

    for endpoint in endpoints or DEFAULT_OVERPASS_ENDPOINTS:
        try:
            raw = network.blocking_post_form(endpoint, {"data": query}, feedback=feedback)
            data = json.loads(raw.decode("utf-8"))
            geojson = _osm_to_geojson(data.get("elements", []))
            if not geojson["features"]:
                raise OsmError("Aucun objet trouvé dans cette emprise pour « %s »." % category)
            with open(output_path, "w", encoding="utf-8") as fh:
                json.dump(geojson, fh, ensure_ascii=False)
            return output_path, len(geojson["features"])
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue

    raise OsmError("Tous les miroirs Overpass ont échoué : %s" % last_error)
