# -*- coding: utf-8 -*-
"""
Vaku — couche réseau.

Toutes les requêtes HTTP passent par QgsBlockingNetworkRequest, exécutées à
l'intérieur d'un QgsTask (thread d'arrière-plan géré par QGIS). C'est le point
clé de fiabilité du plugin : un appel réseau synchrone (urllib, requests...)
lancé depuis le thread principal gèlerait l'interface de QGIS pendant toute
la durée de la requête (quelques secondes à plusieurs minutes pour Overpass).

QgsBlockingNetworkRequest s'appuie sur QgsNetworkAccessManager, qui conserve
un pot de cookies partagé pour tout QGIS : une connexion DataCity réussie
(POST /api/auth/login) laisse donc le cookie de session disponible pour les
requêtes suivantes (ex. /api/download), sans gestion manuelle de cookies.
"""

import json

from qgis.PyQt.QtCore import QUrl, QByteArray
from qgis.PyQt.QtNetwork import QNetworkRequest
from qgis.core import QgsBlockingNetworkRequest, QgsTask

USER_AGENT = "Vaku-QGIS-Plugin/0.1 (+https://github.com/amaude/datacity)"


class VakuNetworkError(Exception):
    """Erreur réseau générique (timeout, hôte injoignable, DNS...)."""


class VakuHttpError(VakuNetworkError):
    """Réponse HTTP reçue mais en erreur (4xx/5xx)."""

    def __init__(self, status_code, message, body=b""):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


def _base_request(url, extra_headers=None):
    request = QNetworkRequest(QUrl(url))
    request.setRawHeader(b"User-Agent", USER_AGENT.encode("utf-8"))
    for key, value in (extra_headers or {}).items():
        request.setRawHeader(key.encode("utf-8"), str(value).encode("utf-8"))
    return request


def _run(blocking_request, request, method, payload=None, feedback=None):
    kwargs = {"forceRefresh": True}
    if feedback is not None:
        kwargs["feedback"] = feedback

    if method == "GET":
        error_code = blocking_request.get(request, **kwargs)
    elif method == "POST":
        error_code = blocking_request.post(request, QByteArray(payload or b""), **kwargs)
    else:
        raise ValueError("Méthode HTTP non supportée : %s" % method)

    reply = blocking_request.reply()
    status = reply.attribute(QNetworkRequest.HttpStatusCodeAttribute)
    body = bytes(reply.content())

    if error_code != QgsBlockingNetworkRequest.ErrorCode.NoError:
        if status and status >= 400:
            raise VakuHttpError(status, blocking_request.errorMessage() or "Erreur HTTP %s" % status, body)
        raise VakuNetworkError(blocking_request.errorMessage() or "Erreur réseau inconnue.")

    if status and status >= 400:
        raise VakuHttpError(status, "Erreur HTTP %s" % status, body)

    return body


def blocking_get(url, headers=None, feedback=None):
    """Exécute un GET. À appeler uniquement depuis le thread d'un QgsTask."""
    request = _base_request(url, headers)
    return _run(QgsBlockingNetworkRequest(), request, "GET", feedback=feedback)


def blocking_post(url, data, headers=None, feedback=None):
    """Exécute un POST avec un corps brut (bytes). Thread QgsTask uniquement."""
    request = _base_request(url, headers)
    return _run(QgsBlockingNetworkRequest(), request, "POST", payload=data, feedback=feedback)


def blocking_post_json(url, obj, headers=None, feedback=None):
    body = json.dumps(obj).encode("utf-8")
    full_headers = {"Content-Type": "application/json"}
    full_headers.update(headers or {})
    return blocking_post(url, body, headers=full_headers, feedback=feedback)


def blocking_post_form(url, fields, headers=None, feedback=None):
    """POST x-www-form-urlencoded (utilisé par Overpass)."""
    from urllib.parse import urlencode

    body = urlencode(fields).encode("utf-8")
    full_headers = {"Content-Type": "application/x-www-form-urlencoded"}
    full_headers.update(headers or {})
    return blocking_post(url, body, headers=full_headers, feedback=feedback)


def get_json(url, headers=None, feedback=None):
    return json.loads(blocking_get(url, headers=headers, feedback=feedback).decode("utf-8"))


class VakuTask(QgsTask):
    """
    Enveloppe générique : exécute `work_fn(task)` en arrière-plan et rapporte
    le résultat ou l'exception au thread principal via les signaux Qt
    standard de QgsTask (taskCompleted / taskTerminated).

    `work_fn` doit être pure fonction réseau/IO ; ne jamais manipuler
    QgsProject ou l'interface QGIS depuis ce thread — seulement depuis le
    callback appelé après complétion, dans le thread principal.
    """

    def __init__(self, description, work_fn):
        super().__init__(description, QgsTask.CanCancel)
        self._work_fn = work_fn
        self.result = None
        self.error = None

    def run(self):
        try:
            self.result = self._work_fn(self)
            return True
        except Exception as exc:  # noqa: BLE001 - on relaie l'erreur à l'UI
            self.error = exc
            return False

    def finished(self, ok):
        # Ne rien faire ici : l'appelant branche ses propres callbacks sur
        # taskCompleted()/taskTerminated() pour mettre à jour l'UI, afin de
        # garder cette classe générique et réutilisable par tous les
        # connecteurs (DataCity, OSM, geoBoundaries, HDX, international...).
        pass
