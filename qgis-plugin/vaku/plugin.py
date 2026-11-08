# -*- coding: utf-8 -*-
"""Vaku — point d'entrée du plugin QGIS (menu, barre d'outils, cycle de vie)."""

import os

from qgis.PyQt.QtGui import QIcon
from qgis.PyQt.QtWidgets import QAction


class VakuPlugin:
    def __init__(self, iface):
        self.iface = iface
        self.action = None
        self.dialog = None

    def initGui(self):
        icon_path = os.path.join(os.path.dirname(__file__), "icon.svg")
        self.action = QAction(QIcon(icon_path), "Vaku — Open Data Manager", self.iface.mainWindow())
        self.action.setWhatsThis("Ouvre le gestionnaire de données Open Data Vaku")
        self.action.triggered.connect(self.run)

        self.iface.addPluginToWebMenu("&Vaku", self.action)
        self.iface.addToolBarIcon(self.action)

    def unload(self):
        self.iface.removePluginWebMenu("&Vaku", self.action)
        self.iface.removeToolBarIcon(self.action)
        if self.dialog is not None:
            self.dialog.close()
            self.dialog = None

    def run(self):
        from .ui.main_dialog import VakuMainDialog

        if self.dialog is None:
            self.dialog = VakuMainDialog(self.iface, self.iface.mainWindow())
        self.dialog.show()
        self.dialog.raise_()
        self.dialog.activateWindow()
