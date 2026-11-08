# -*- coding: utf-8 -*-
"""Vaku — fonds de carte XYZ, services WMS/WFS, et téléchargement de fichiers distants."""

import urllib.parse

from qgis.core import QgsProject, QgsRasterLayer, QgsVectorLayer

from . import network

BASEMAPS = {
    "OpenStreetMap": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "Esri World Imagery": (
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ),
    "Esri World Topographic": (
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
    ),
    "CartoDB Positron": "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "CartoDB Dark Matter": "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    "OpenTopoMap": "https://tile.opentopomap.org/{z}/{x}/{y}.png",
}


class BasemapError(Exception):
    pass


def add_xyz(name, url, zmin=0, zmax=19):
    uri = f"type=xyz&url={urllib.parse.quote(url, safe=':/{}')}&zmin={zmin}&zmax={zmax}"
    layer = QgsRasterLayer(uri, name, "wms")
    if not layer.isValid():
        raise BasemapError("Impossible de créer le fond cartographique XYZ.")
    QgsProject.instance().addMapLayer(layer)
    return layer


def add_wms(url, name, layers="", crs="EPSG:3857", image_format="image/png"):
    uri = (
        f"contextualWMSLegend=0&crs={crs}&format={image_format}&layers={urllib.parse.quote(layers)}"
        f"&styles=&url={urllib.parse.quote(url, safe=':/?=&')}"
    )
    layer = QgsRasterLayer(uri, name, "wms")
    if not layer.isValid():
        raise BasemapError("Connexion WMS invalide. Vérifiez l'URL et le nom de couche.")
    QgsProject.instance().addMapLayer(layer)
    return layer


def add_wfs(url, typename, name, version="2.0.0"):
    uri = (
        f"url={urllib.parse.quote(url, safe=':/?=&')}"
        f"&typename={urllib.parse.quote(typename)}&version={version}"
    )
    layer = QgsVectorLayer(uri, name, "WFS")
    if not layer.isValid():
        raise BasemapError("Connexion WFS invalide ou couche inaccessible.")
    QgsProject.instance().addMapLayer(layer)
    return layer


def download_remote_file(url, destination, feedback=None):
    """Télécharge un fichier distant (GeoJSON / GeoPackage / GeoTIFF...) vers `destination`."""
    data = network.blocking_get(url, feedback=feedback)
    with open(destination, "wb") as fh:
        fh.write(data)
    return destination
