# -*- coding: utf-8 -*-
"""Vaku — fenêtre principale : un onglet par source de données."""

import os

from qgis.core import QgsApplication
from qgis.PyQt.QtCore import Qt
from qgis.PyQt.QtWidgets import (
    QComboBox,
    QDialog,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QStackedWidget,
    QTabWidget,
    QVBoxLayout,
    QWidget,
)

from ..core import (
    basemap_connector,
    geoboundaries_connector,
    hdx_connector,
    international_connector,
    local_db,
    loader,
    osm_connector,
    settings as vaku_settings,
)
from ..core.datacity_client import DataCityClient, DataCityError
from ..core.network import VakuTask
from .login_dialog import VakuLoginDialog


class VakuMainDialog(QDialog):
    def __init__(self, iface, parent=None):
        super().__init__(parent)
        self.iface = iface
        self.setWindowTitle("Vaku — Gestionnaire Open Data")
        self.setMinimumSize(760, 620)

        self.mirror = local_db.LocalMirror()
        self.client = None  # DataCityClient, créé à la demande (URL requise)

        self._themes_cache = []
        self._datasets_cache = []
        self._hdx_results = []
        # Référence forte sur les tâches en cours : QgsTaskManager prend
        # possession de l'objet C++, mais sans cette liste le wrapper Python
        # peut être libéré prématurément et les callbacks ne plus jamais
        # s'exécuter (symptôme classique en PyQGIS : rien ne se passe après
        # un clic). Nettoyée au fur et à mesure dans _run_task.
        self._active_tasks = []

        self._build_ui()
        self._load_settings_into_ui()
        self._refresh_datacity_status()

    # ------------------------------------------------------------------
    # Construction de l'UI
    # ------------------------------------------------------------------

    def _build_ui(self):
        root = QVBoxLayout(self)

        title = QLabel("<h2>VAKU</h2><p>Données Open Data, sans quitter QGIS</p>")
        title.setAlignment(Qt.AlignCenter)
        root.addWidget(title)

        self.tabs = QTabWidget()
        root.addWidget(self.tabs)

        self.tabs.addTab(self._build_datacity_tab(), "DataCity (CIV)")
        self.tabs.addTab(self._build_osm_tab(), "OpenStreetMap")
        self.tabs.addTab(self._build_geoboundaries_tab(), "geoBoundaries")
        self.tabs.addTab(self._build_basemap_tab(), "Fonds de carte / WMS / WFS / URL")
        self.tabs.addTab(self._build_hdx_tab(), "HDX")
        self.tabs.addTab(self._build_international_tab(), "International (BAD/FMI/ONU/UNICEF)")
        self.tabs.addTab(self._build_settings_tab(), "Paramètres")

        self.progress = QProgressBar()
        self.progress.setRange(0, 100)
        root.addWidget(self.progress)

        self.log = QPlainTextEdit()
        self.log.setReadOnly(True)
        self.log.setMaximumHeight(130)
        root.addWidget(self.log)

        close_row = QHBoxLayout()
        close_row.addStretch()
        close_button = QPushButton("Fermer")
        close_button.clicked.connect(self.close)
        close_row.addWidget(close_button)
        root.addLayout(close_row)

    # -- Onglet DataCity ------------------------------------------------

    def _build_datacity_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        auth_box = QGroupBox("Compte DataCity")
        auth_layout = QHBoxLayout(auth_box)
        self.dc_status_label = QLabel("Non connecté — consultation publique active.")
        self.dc_login_button = QPushButton("Se connecter")
        self.dc_login_button.clicked.connect(self._on_datacity_login_clicked)
        auth_layout.addWidget(self.dc_status_label)
        auth_layout.addStretch()
        auth_layout.addWidget(self.dc_login_button)
        layout.addWidget(auth_box)

        browse_box = QGroupBox("Parcourir et ajouter une couche")
        form = QFormLayout(browse_box)

        self.dc_theme_combo = QComboBox()
        self.dc_theme_combo.addItem("Toutes les thématiques", None)
        self.dc_theme_combo.currentIndexChanged.connect(self._on_datacity_theme_changed)
        form.addRow("Thématique :", self.dc_theme_combo)

        self.dc_dataset_combo = QComboBox()
        form.addRow("Jeu de données :", self.dc_dataset_combo)

        refresh_button = QPushButton("Rafraîchir la liste (en ligne)")
        refresh_button.clicked.connect(self._load_datacity_catalog)
        form.addRow("", refresh_button)

        add_button = QPushButton("Ajouter la couche à QGIS")
        add_button.clicked.connect(self._on_datacity_add_layer)
        form.addRow("", add_button)

        layout.addWidget(browse_box)

        mirror_box = QGroupBox("Miroir local complet (hors-ligne)")
        mirror_layout = QVBoxLayout(mirror_box)
        self.dc_mirror_status = QLabel("Jamais synchronisé.")
        mirror_layout.addWidget(self.dc_mirror_status)

        mirror_buttons = QHBoxLayout()
        sync_button = QPushButton("Synchroniser le miroir local")
        sync_button.clicked.connect(self._on_sync_mirror_clicked)
        offline_button = QPushButton("Ajouter depuis le miroir local (sans réseau)")
        offline_button.clicked.connect(self._on_datacity_add_layer_offline)
        mirror_buttons.addWidget(sync_button)
        mirror_buttons.addWidget(offline_button)
        mirror_layout.addLayout(mirror_buttons)

        layout.addWidget(mirror_box)
        layout.addStretch()
        return widget

    # -- Onglet OpenStreetMap --------------------------------------------

    def _build_osm_tab(self):
        widget = QWidget()
        form = QFormLayout(widget)

        self.osm_category = QComboBox()
        self.osm_category.addItems(list(osm_connector.CATEGORIES.keys()))
        form.addRow("Thème OSM :", self.osm_category)

        self.osm_bbox_label = QLabel("Emprise non lue. Cliquez sur « Lire l'emprise de la carte ».")
        self.osm_bbox_label.setWordWrap(True)
        form.addRow("Emprise (EPSG:4326) :", self.osm_bbox_label)

        read_bbox_button = QPushButton("Lire l'emprise visible de la carte")
        read_bbox_button.clicked.connect(self._on_osm_read_bbox)
        form.addRow("", read_bbox_button)

        self.osm_name = QLineEdit("osm_export")
        form.addRow("Nom de la couche :", self.osm_name)

        download_button = QPushButton("Télécharger et ajouter à QGIS")
        download_button.clicked.connect(self._on_osm_download)
        form.addRow("", download_button)

        self._osm_bbox = None
        return widget

    # -- Onglet geoBoundaries --------------------------------------------

    def _build_geoboundaries_tab(self):
        widget = QWidget()
        form = QFormLayout(widget)

        self.gb_country = QLineEdit("CIV")
        form.addRow("Code pays (ISO3) :", self.gb_country)

        self.gb_level = QComboBox()
        self.gb_level.addItems(geoboundaries_connector.LEVELS)
        self.gb_level.setCurrentText("ADM1")
        form.addRow("Niveau administratif :", self.gb_level)

        download_button = QPushButton("Télécharger et ajouter à QGIS")
        download_button.clicked.connect(self._on_geoboundaries_download)
        form.addRow("", download_button)
        return widget

    # -- Onglet Fonds de carte / WMS / WFS / URL -------------------------

    def _build_basemap_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        selector_row = QHBoxLayout()
        selector_row.addWidget(QLabel("Type de source :"))
        self.bm_source_combo = QComboBox()
        self.bm_source_combo.addItems(["Fond de carte XYZ", "Service WMS", "Service WFS", "Téléchargement URL directe"])
        self.bm_source_combo.currentIndexChanged.connect(self._on_basemap_source_changed)
        selector_row.addWidget(self.bm_source_combo)
        layout.addLayout(selector_row)

        self.bm_stack = QStackedWidget()
        layout.addWidget(self.bm_stack)

        # XYZ
        xyz_widget = QWidget()
        xyz_form = QFormLayout(xyz_widget)
        self.bm_xyz_combo = QComboBox()
        self.bm_xyz_combo.addItems(list(basemap_connector.BASEMAPS.keys()))
        xyz_form.addRow("Fond prédéfini :", self.bm_xyz_combo)
        xyz_button = QPushButton("Ajouter le fond de carte")
        xyz_button.clicked.connect(self._on_add_xyz)
        xyz_form.addRow("", xyz_button)
        self.bm_stack.addWidget(xyz_widget)

        # WMS
        wms_widget = QWidget()
        wms_form = QFormLayout(wms_widget)
        self.bm_wms_url = QLineEdit()
        self.bm_wms_url.setPlaceholderText("https://.../wms")
        self.bm_wms_layers = QLineEdit()
        self.bm_wms_layers.setPlaceholderText("nom:de:la:couche")
        wms_form.addRow("URL WMS :", self.bm_wms_url)
        wms_form.addRow("Couche(s) :", self.bm_wms_layers)
        wms_button = QPushButton("Connecter le service WMS")
        wms_button.clicked.connect(self._on_add_wms)
        wms_form.addRow("", wms_button)
        self.bm_stack.addWidget(wms_widget)

        # WFS
        wfs_widget = QWidget()
        wfs_form = QFormLayout(wfs_widget)
        self.bm_wfs_url = QLineEdit()
        self.bm_wfs_url.setPlaceholderText("https://.../wfs")
        self.bm_wfs_typename = QLineEdit()
        self.bm_wfs_typename.setPlaceholderText("nom de la couche WFS (typename)")
        wfs_form.addRow("URL WFS :", self.bm_wfs_url)
        wfs_form.addRow("Nom de couche :", self.bm_wfs_typename)
        wfs_button = QPushButton("Connecter le service WFS")
        wfs_button.clicked.connect(self._on_add_wfs)
        wfs_form.addRow("", wfs_button)
        self.bm_stack.addWidget(wfs_widget)

        # URL directe
        url_widget = QWidget()
        url_form = QFormLayout(url_widget)
        self.bm_direct_url = QLineEdit()
        self.bm_direct_url.setPlaceholderText("https://.../donnees.geojson")
        self.bm_direct_name = QLineEdit("couche_distante")
        url_form.addRow("URL du fichier :", self.bm_direct_url)
        url_form.addRow("Nom de la couche :", self.bm_direct_name)
        url_button = QPushButton("Télécharger et ajouter à QGIS")
        url_button.clicked.connect(self._on_add_direct_url)
        url_form.addRow("", url_button)
        self.bm_stack.addWidget(url_widget)

        layout.addStretch()
        return widget

    # -- Onglet HDX -------------------------------------------------------

    def _build_hdx_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        search_row = QHBoxLayout()
        self.hdx_query = QLineEdit("Côte d'Ivoire")
        search_button = QPushButton("Rechercher sur HDX")
        search_button.clicked.connect(self._on_hdx_search)
        search_row.addWidget(self.hdx_query)
        search_row.addWidget(search_button)
        layout.addLayout(search_row)

        self.hdx_results_list = QListWidget()
        self.hdx_results_list.currentRowChanged.connect(self._on_hdx_dataset_selected)
        layout.addWidget(self.hdx_results_list)

        self.hdx_resources_combo = QComboBox()
        layout.addWidget(self.hdx_resources_combo)

        download_button = QPushButton("Télécharger la ressource sélectionnée")
        download_button.clicked.connect(self._on_hdx_download)
        layout.addWidget(download_button)
        return widget

    # -- Onglet International ---------------------------------------------

    def _build_international_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)

        warning = QLabel(
            "⚠ Les API du FMI, de l'ONU, de l'UNICEF et de la BAD évoluent fréquemment et "
            "n'ont pas pu être vérifiées en direct depuis l'environnement de développement de "
            "Vaku. Utilisez « Tester la connexion » avant toute utilisation réelle, et consultez "
            "le README du plugin pour le détail de chaque source."
        )
        warning.setWordWrap(True)
        layout.addWidget(warning)

        selector_row = QHBoxLayout()
        selector_row.addWidget(QLabel("Institution :"))
        self.intl_combo = QComboBox()
        self.intl_combo.addItems(["FMI (IMF)", "UNICEF", "ONU (SDG)", "BAD (AfDB) — URL personnalisée"])
        self.intl_combo.currentIndexChanged.connect(self._on_intl_source_changed)
        selector_row.addWidget(self.intl_combo)
        layout.addLayout(selector_row)

        self.intl_stack = QStackedWidget()
        layout.addWidget(self.intl_stack)

        # FMI
        imf_widget = QWidget()
        imf_form = QFormLayout(imf_widget)
        self.imf_dataset = QLineEdit("IFS")
        self.imf_indicator = QLineEdit()
        self.imf_indicator.setPlaceholderText("ex. NGDP_D (code indicateur FMI)")
        self.imf_country = QLineEdit("CI")
        imf_form.addRow("Dataset :", self.imf_dataset)
        imf_form.addRow("Indicateur :", self.imf_indicator)
        imf_form.addRow("Code pays FMI :", self.imf_country)
        self.intl_stack.addWidget(imf_widget)

        # UNICEF
        unicef_widget = QWidget()
        unicef_form = QFormLayout(unicef_widget)
        self.unicef_dataflow = QLineEdit()
        self.unicef_dataflow.setPlaceholderText("ex. CME (mortalité infantile)")
        self.unicef_indicator = QLineEdit()
        self.unicef_indicator.setPlaceholderText("ex. CME_MRY0T4")
        unicef_form.addRow("Dataflow :", self.unicef_dataflow)
        unicef_form.addRow("Indicateur :", self.unicef_indicator)
        self.intl_stack.addWidget(unicef_widget)

        # ONU
        un_widget = QWidget()
        un_form = QFormLayout(un_widget)
        self.un_indicator = QLineEdit()
        self.un_indicator.setPlaceholderText("ex. 1.1.1")
        un_form.addRow("Code indicateur ODD :", self.un_indicator)
        un_form.addRow("Zone (M49) :", QLabel(f"{international_connector.CIV_M49} (Côte d'Ivoire)"))
        self.intl_stack.addWidget(un_widget)

        # BAD
        bad_widget = QWidget()
        bad_form = QFormLayout(bad_widget)
        self.bad_url = QLineEdit()
        self.bad_url.setPlaceholderText("Collez ici l'URL d'export/API trouvée sur le portail BAD")
        bad_form.addRow("URL personnalisée :", self.bad_url)
        self.intl_stack.addWidget(bad_widget)

        buttons_row = QHBoxLayout()
        test_button = QPushButton("Tester la connexion")
        test_button.clicked.connect(self._on_intl_test)
        save_button = QPushButton("Récupérer et enregistrer la réponse")
        save_button.clicked.connect(self._on_intl_fetch_and_save)
        buttons_row.addWidget(test_button)
        buttons_row.addWidget(save_button)
        layout.addLayout(buttons_row)

        layout.addStretch()
        return widget

    # -- Onglet Paramètres -------------------------------------------------

    def _build_settings_tab(self):
        widget = QWidget()
        form = QFormLayout(widget)

        self.settings_url = QLineEdit()
        self.settings_url.setPlaceholderText("http://localhost:3000 (dev) ou https://votre-projet.vercel.app")
        save_url_button = QPushButton("Enregistrer l'URL")
        save_url_button.clicked.connect(self._on_save_datacity_url)
        url_row = QHBoxLayout()
        url_row.addWidget(self.settings_url)
        url_row.addWidget(save_url_button)
        form.addRow("URL DataCity :", url_row)

        self.settings_output = QLineEdit()
        browse_button = QPushButton("Parcourir")
        browse_button.clicked.connect(self._on_browse_output_folder)
        output_row = QHBoxLayout()
        output_row.addWidget(self.settings_output)
        output_row.addWidget(browse_button)
        form.addRow("Dossier de sortie :", output_row)

        self.settings_db_path_label = QLabel(self.mirror.path)
        self.settings_db_path_label.setWordWrap(True)
        form.addRow("Miroir local DataCity :", self.settings_db_path_label)

        return widget

    # ------------------------------------------------------------------
    # Chargement des réglages
    # ------------------------------------------------------------------

    def _load_settings_into_ui(self):
        self.settings_url.setText(vaku_settings.get_datacity_url())
        default_output = os.path.join(os.path.expanduser("~"), "Documents", "Vaku")
        os.makedirs(default_output, exist_ok=True)
        self.settings_output.setText(vaku_settings.get_output_folder(default_output))
        self._refresh_mirror_status()

    def _output_folder(self):
        folder = self.settings_output.text().strip() or vaku_settings.get_output_folder(
            os.path.join(os.path.expanduser("~"), "Documents", "Vaku")
        )
        os.makedirs(folder, exist_ok=True)
        return folder

    # ------------------------------------------------------------------
    # Utilitaires communs
    # ------------------------------------------------------------------

    def _log(self, message):
        self.log.appendPlainText(message)

    def _run_task(self, description, work_fn, on_success=None, on_error=None):
        self._log(f"… {description}")
        task = VakuTask(description, work_fn)
        self._active_tasks.append(task)

        def handle_done():
            if task in self._active_tasks:
                self._active_tasks.remove(task)
            if task.error is not None:
                message = str(task.error)
                self._log(f"✗ {description} — {message}")
                if on_error is not None:
                    on_error(task.error)
                else:
                    QMessageBox.warning(self, "Vaku", message)
            else:
                self._log(f"✓ {description}")
                if on_success is not None:
                    on_success(task.result)

        task.taskCompleted.connect(handle_done)
        task.taskTerminated.connect(handle_done)
        QgsApplication.taskManager().addTask(task)
        return task

    def _get_client(self):
        url = self.settings_url.text().strip() or vaku_settings.get_datacity_url()
        if not url:
            raise DataCityError("Renseignez l'URL DataCity dans l'onglet Paramètres.")
        if self.client is None or self.client.base_url != url.rstrip("/"):
            self.client = DataCityClient(url)
        return self.client

    # ------------------------------------------------------------------
    # DataCity
    # ------------------------------------------------------------------

    def _refresh_datacity_status(self):
        if self.client is not None and self.client.logged_in:
            email = (self.client.user or {}).get("email", "?")
            self.dc_status_label.setText(f"Connecté en tant que {email}.")
            self.dc_login_button.setText("Se déconnecter")
        else:
            self.dc_status_label.setText("Non connecté — consultation publique active (plafond 20000 entités/dataset).")
            self.dc_login_button.setText("Se connecter")

    def _on_datacity_login_clicked(self):
        if self.client is not None and self.client.logged_in:
            def work(_task):
                self.client.logout()
                return True

            self._run_task("Déconnexion DataCity", work, on_success=lambda _r: self._refresh_datacity_status())
            return

        dialog = VakuLoginDialog(self, vaku_settings.get_remembered_email())
        if dialog.exec_() != QDialog.Accepted:
            return
        email, password = dialog.credentials()
        if not email or not password:
            QMessageBox.warning(self, "Vaku", "Email et mot de passe requis.")
            return

        try:
            client = self._get_client()
        except DataCityError as exc:
            QMessageBox.warning(self, "Vaku", str(exc))
            return

        def work(_task):
            client.login(email, password)
            return True

        def on_success(_result):
            vaku_settings.set_remembered_email(email)
            self._refresh_datacity_status()

        def on_error(exc):
            QMessageBox.warning(self, "Vaku", f"Connexion refusée : {exc}")

        self._run_task("Connexion DataCity", work, on_success=on_success, on_error=on_error)

    def _load_datacity_catalog(self):
        try:
            client = self._get_client()
        except DataCityError as exc:
            QMessageBox.warning(self, "Vaku", str(exc))
            return

        def work(_task):
            return client.themes(), client.datasets()

        def on_success(result):
            themes, datasets = result
            self._themes_cache = themes
            self._datasets_cache = datasets
            self.dc_theme_combo.clear()
            self.dc_theme_combo.addItem("Toutes les thématiques", None)
            for theme in themes:
                self.dc_theme_combo.addItem(theme["name"], theme["slug"])
            self._populate_dataset_combo(None)

        self._run_task("Chargement du catalogue DataCity", work, on_success=on_success)

    def _populate_dataset_combo(self, theme_slug):
        self.dc_dataset_combo.clear()
        for dataset in self._datasets_cache:
            if theme_slug and (dataset.get("theme") or {}).get("slug") != theme_slug:
                continue
            count = (dataset.get("_count") or {}).get("features", 0)
            self.dc_dataset_combo.addItem(f"{dataset['name']} ({count})", dataset["slug"])

    def _on_datacity_theme_changed(self, _index):
        self._populate_dataset_combo(self.dc_theme_combo.currentData())

    def _on_datacity_add_layer(self):
        slug = self.dc_dataset_combo.currentData()
        if not slug:
            QMessageBox.information(self, "Vaku", "Chargez d'abord le catalogue, puis choisissez un jeu de données.")
            return
        try:
            client = self._get_client()
        except DataCityError as exc:
            QMessageBox.warning(self, "Vaku", str(exc))
            return

        output_path = os.path.join(self._output_folder(), f"datacity_{slug}.geojson")

        def work(_task):
            geojson = client.features(dataset=slug, geometry=True, limit=20000, as_geojson=True)
            import json

            with open(output_path, "w", encoding="utf-8") as fh:
                json.dump(geojson, fh, ensure_ascii=False)
            return output_path

        def on_success(path):
            loader.add_vector(path, f"DataCity — {slug}")

        self._run_task(f"Ajout de la couche DataCity « {slug} »", work, on_success=on_success)

    def _on_datacity_add_layer_offline(self):
        slug = self.dc_dataset_combo.currentData()
        if not slug:
            datasets = self.mirror.list_datasets()
            if not datasets:
                QMessageBox.information(self, "Vaku", "Le miroir local est vide. Synchronisez-le d'abord.")
                return
            slug = datasets[0]["slug"]

        output_path = os.path.join(self._output_folder(), f"datacity_mirror_{slug}.geojson")
        try:
            self.mirror.export_dataset_geojson(slug, output_path)
            loader.add_vector(output_path, f"DataCity (miroir local) — {slug}")
            self._log(f"✓ Couche ajoutée depuis le miroir local : {slug}")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Vaku", str(exc))

    def _refresh_mirror_status(self):
        info = self.mirror.last_sync()
        if not info:
            self.dc_mirror_status.setText("Jamais synchronisé.")
        else:
            self.dc_mirror_status.setText(
                f"Dernière synchronisation : {info['last_synced_at']} — "
                f"{info['record_count']} jeux de données ({info['status']})."
            )

    def _on_sync_mirror_clicked(self):
        try:
            client = self._get_client()
        except DataCityError as exc:
            QMessageBox.warning(self, "Vaku", str(exc))
            return

        def work(task):
            def log_cb(msg):
                self._log(msg)

            def progress_cb(done, total):
                if total:
                    task.setProgress(done / total * 100)

            return self.mirror.sync_all(client, log=log_cb, progress=progress_cb, task=task)

        def on_success(_result):
            self._refresh_mirror_status()

        self._run_task("Synchronisation du miroir local DataCity", work, on_success=on_success)

    def _on_save_datacity_url(self):
        url = self.settings_url.text().strip()
        vaku_settings.set_datacity_url(url)
        self.client = None
        QMessageBox.information(self, "Vaku", "URL DataCity enregistrée.")

    def _on_browse_output_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "Dossier de sortie", self.settings_output.text())
        if folder:
            self.settings_output.setText(folder)
            vaku_settings.set_output_folder(folder)

    # ------------------------------------------------------------------
    # OpenStreetMap
    # ------------------------------------------------------------------

    def _on_osm_read_bbox(self):
        try:
            self._osm_bbox = osm_connector.get_bbox_from_canvas(self.iface)
            south, west, north, east = self._osm_bbox
            self.osm_bbox_label.setText(f"S={south:.4f}  O={west:.4f}  N={north:.4f}  E={east:.4f}")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Vaku", str(exc))

    def _on_osm_download(self):
        if self._osm_bbox is None:
            QMessageBox.information(self, "Vaku", "Lisez d'abord l'emprise visible de la carte.")
            return
        category = self.osm_category.currentText()
        name = self.osm_name.text().strip() or "osm_export"
        output_path = os.path.join(self._output_folder(), f"{name}.geojson")
        endpoints = vaku_settings.get_overpass_endpoints(osm_connector.DEFAULT_OVERPASS_ENDPOINTS)

        def work(task):
            return osm_connector.download(category, self._osm_bbox, output_path, endpoints=endpoints, feedback=None)

        def on_success(result):
            path, count = result
            loader.add_vector(path, name)
            self._log(f"  {count} objets ajoutés.")

        self._run_task(f"Téléchargement OSM « {category} »", work, on_success=on_success)

    # ------------------------------------------------------------------
    # geoBoundaries
    # ------------------------------------------------------------------

    def _on_geoboundaries_download(self):
        country = self.gb_country.text().strip() or "CIV"
        level = self.gb_level.currentText()
        output_path = os.path.join(self._output_folder(), f"geoboundaries_{country}_{level}.geojson")

        def work(_task):
            geoboundaries_connector.download(country, level, output_path)
            return output_path

        def on_success(path):
            loader.add_vector(path, f"{country} {level}")

        self._run_task(f"Téléchargement geoBoundaries {country}/{level}", work, on_success=on_success)

    # ------------------------------------------------------------------
    # Fonds de carte / WMS / WFS / URL directe
    # ------------------------------------------------------------------

    def _on_basemap_source_changed(self, index):
        self.bm_stack.setCurrentIndex(index)

    def _on_add_xyz(self):
        name = self.bm_xyz_combo.currentText()
        url = basemap_connector.BASEMAPS[name]
        try:
            basemap_connector.add_xyz(name, url)
            self._log(f"✓ Fond de carte ajouté : {name}")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Vaku", str(exc))

    def _on_add_wms(self):
        url = self.bm_wms_url.text().strip()
        layers = self.bm_wms_layers.text().strip()
        if not url:
            QMessageBox.information(self, "Vaku", "URL WMS requise.")
            return
        try:
            basemap_connector.add_wms(url, "WMS — " + (layers or url), layers=layers)
            self._log("✓ Service WMS connecté.")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Vaku", str(exc))

    def _on_add_wfs(self):
        url = self.bm_wfs_url.text().strip()
        typename = self.bm_wfs_typename.text().strip()
        if not url or not typename:
            QMessageBox.information(self, "Vaku", "URL WFS et nom de couche requis.")
            return
        try:
            basemap_connector.add_wfs(url, typename, "WFS — " + typename)
            self._log("✓ Service WFS connecté.")
        except Exception as exc:  # noqa: BLE001
            QMessageBox.warning(self, "Vaku", str(exc))

    def _on_add_direct_url(self):
        url = self.bm_direct_url.text().strip()
        name = self.bm_direct_name.text().strip() or "couche_distante"
        if not url:
            QMessageBox.information(self, "Vaku", "URL du fichier requise.")
            return
        ext = os.path.splitext(url)[1] or ".geojson"
        output_path = os.path.join(self._output_folder(), name + ext)

        def work(_task):
            basemap_connector.download_remote_file(url, output_path)
            return output_path

        def on_success(path):
            lower = path.lower()
            if lower.endswith((".tif", ".tiff")):
                loader.add_raster(path, name)
            else:
                loader.add_vector(path, name)

        self._run_task(f"Téléchargement du fichier distant « {name} »", work, on_success=on_success)

    # ------------------------------------------------------------------
    # HDX
    # ------------------------------------------------------------------

    def _on_hdx_search(self):
        query = self.hdx_query.text().strip()
        if not query:
            return

        def work(_task):
            return hdx_connector.search_datasets(query)

        def on_success(results):
            self._hdx_results = results
            self.hdx_results_list.clear()
            for ds in results:
                self.hdx_results_list.addItem(f"{ds['name']} — {ds.get('organization') or ''}")

        self._run_task(f"Recherche HDX « {query} »", work, on_success=on_success)

    def _on_hdx_dataset_selected(self, row):
        self.hdx_resources_combo.clear()
        if row is None or row < 0 or row >= len(self._hdx_results):
            return
        for res in self._hdx_results[row]["resources"]:
            self.hdx_resources_combo.addItem(f"{res['name']} [{res['format']}]", res)

    def _on_hdx_download(self):
        data = self.hdx_resources_combo.currentData()
        if not data or not data.get("url"):
            QMessageBox.information(self, "Vaku", "Sélectionnez une ressource HDX avec une URL valide.")
            return
        fmt = (data.get("format") or "").lower()
        ext = "." + fmt if fmt else ""
        name = data.get("name") or "hdx_resource"
        output_path = os.path.join(self._output_folder(), f"hdx_{name}{ext}")

        def work(_task):
            hdx_connector.download_resource(data["url"], output_path)
            return output_path

        def on_success(path):
            lower = path.lower()
            if lower.endswith((".geojson", ".json", ".csv", ".gpkg", ".shp")):
                try:
                    loader.add_vector(path, name)
                    return
                except Exception:  # noqa: BLE001
                    pass
            self._log(f"  Fichier enregistré : {path} (format non reconnu automatiquement, ouvrez-le manuellement).")

        self._run_task(f"Téléchargement HDX « {name} »", work, on_success=on_success)

    # ------------------------------------------------------------------
    # International (BAD / FMI / ONU / UNICEF)
    # ------------------------------------------------------------------

    def _on_intl_source_changed(self, index):
        self.intl_stack.setCurrentIndex(index)

    def _intl_fetch(self):
        index = self.intl_combo.currentIndex()
        if index == 0:
            return international_connector.imf_fetch(
                self.imf_dataset.text().strip() or "IFS",
                self.imf_indicator.text().strip(),
                country_code=self.imf_country.text().strip() or "CI",
            )
        if index == 1:
            return international_connector.unicef_fetch(
                self.unicef_dataflow.text().strip(),
                self.unicef_indicator.text().strip(),
            )
        if index == 2:
            return international_connector.un_sdg_fetch(self.un_indicator.text().strip())
        return international_connector.bad_fetch_custom_url(self.bad_url.text().strip())

    def _on_intl_test(self):
        def work(_task):
            raw = self._intl_fetch()
            return raw[:500]

        def on_success(preview_bytes):
            try:
                preview = preview_bytes.decode("utf-8", errors="replace")
            except Exception:  # noqa: BLE001
                preview = str(preview_bytes)
            self._log("Réponse (500 premiers octets) :")
            self._log(preview)

        self._run_task("Test de connexion international", work, on_success=on_success)

    def _on_intl_fetch_and_save(self):
        source_name = self.intl_combo.currentText().split(" ")[0].lower()
        output_path = os.path.join(self._output_folder(), f"international_{source_name}.json")

        def work(_task):
            raw = self._intl_fetch()
            parsed, error = international_connector.try_parse_json(raw)
            if parsed is not None:
                import json

                with open(output_path, "w", encoding="utf-8") as fh:
                    json.dump(parsed, fh, ensure_ascii=False, indent=2)
            else:
                raw_path = output_path.rsplit(".", 1)[0] + ".raw"
                with open(raw_path, "wb") as fh:
                    fh.write(raw)
                return raw_path, error
            return output_path, None

        def on_success(result):
            path, error = result
            if error:
                self._log(f"  Réponse non JSON, enregistrée brute : {path} ({error})")
            else:
                self._log(f"  Réponse enregistrée : {path}")

        self._run_task("Récupération internationale", work, on_success=on_success)
