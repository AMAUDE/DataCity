# -*- coding: utf-8 -*-
"""
Vaku — réglages persistants (QgsSettings) et état de session en mémoire.

Choix de fiabilité/sécurité assumé : le mot de passe DataCity n'est JAMAIS
écrit sur disque. Seul l'email est mémorisé (confort de saisie) ; la session
HTTP (cookie) vit dans le pot de cookies de QgsNetworkAccessManager et ne
survit donc pas à la fermeture de QGIS — l'utilisateur doit se reconnecter à
chaque session QGIS pour les actions authentifiées (export complet /
téléchargement tracé). Le mode de consultation publique (/api/features) ne
nécessite aucune connexion.
"""

from qgis.core import QgsSettings

GROUP = "Vaku"

DEFAULT_DATACITY_URL = ""  # volontairement vide : voir qgis-plugin/vaku/README.md


def _settings():
    s = QgsSettings()
    s.beginGroup(GROUP)
    return s


def get_datacity_url():
    s = _settings()
    try:
        return s.value("datacity_url", DEFAULT_DATACITY_URL, type=str)
    finally:
        s.endGroup()


def set_datacity_url(url):
    s = _settings()
    try:
        s.setValue("datacity_url", url.strip())
    finally:
        s.endGroup()


def get_remembered_email():
    s = _settings()
    try:
        return s.value("datacity_email", "", type=str)
    finally:
        s.endGroup()


def set_remembered_email(email):
    s = _settings()
    try:
        s.setValue("datacity_email", email.strip())
    finally:
        s.endGroup()


def get_output_folder(default_path):
    s = _settings()
    try:
        return s.value("output_folder", default_path, type=str)
    finally:
        s.endGroup()


def set_output_folder(path):
    s = _settings()
    try:
        s.setValue("output_folder", path)
    finally:
        s.endGroup()


def get_overpass_endpoints(defaults):
    s = _settings()
    try:
        value = s.value("overpass_endpoints", None)
        return value if value else list(defaults)
    finally:
        s.endGroup()
