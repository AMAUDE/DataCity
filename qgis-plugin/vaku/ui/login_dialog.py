# -*- coding: utf-8 -*-
"""Vaku — fenêtre de connexion DataCity (mot de passe jamais écrit sur disque)."""

from qgis.PyQt.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QLabel,
    QLineEdit,
    QVBoxLayout,
)


class VakuLoginDialog(QDialog):
    def __init__(self, parent=None, remembered_email=""):
        super().__init__(parent)
        self.setWindowTitle("Connexion DataCity")
        self.setMinimumWidth(360)

        layout = QVBoxLayout(self)

        info = QLabel(
            "La connexion débloque l'export complet et le miroir local intégral "
            "(/api/download). Le mot de passe n'est jamais enregistré sur disque : "
            "une reconnexion est nécessaire à chaque session QGIS."
        )
        info.setWordWrap(True)
        layout.addWidget(info)

        form = QFormLayout()
        self.email_input = QLineEdit(remembered_email)
        self.email_input.setPlaceholderText("vous@example.com")
        self.password_input = QLineEdit()
        self.password_input.setEchoMode(QLineEdit.Password)
        form.addRow("Email :", self.email_input)
        form.addRow("Mot de passe :", self.password_input)
        layout.addLayout(form)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def credentials(self):
        return self.email_input.text().strip(), self.password_input.text()
