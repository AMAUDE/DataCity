# -*- coding: utf-8 -*-
"""Vaku — ajout de couches dans le projet QGIS courant."""

from qgis.core import QgsProject, QgsRasterLayer, QgsVectorLayer


class VakuLoadError(Exception):
    pass


def add_vector(path, name, provider="ogr"):
    layer = QgsVectorLayer(path, name, provider)
    if not layer.isValid():
        raise VakuLoadError(f"Couche vectorielle invalide : {name} ({path})")
    QgsProject.instance().addMapLayer(layer)
    return layer


def add_raster(path_or_uri, name, provider="gdal"):
    layer = QgsRasterLayer(path_or_uri, name, provider)
    if not layer.isValid():
        raise VakuLoadError(f"Couche raster invalide : {name}")
    QgsProject.instance().addMapLayer(layer)
    return layer
