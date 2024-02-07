# Copyright 2024 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import api, fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    trigram = fields.Char(compute="_compute_trigram")

    @api.depends("firstname", "lastname")
    def _compute_trigram(self):
        for user in self:
            user.trigram = ""
            if user.firstname:
                user.trigram += user.firstname[:1]
            if user.lastname:
                user.trigram += user.lastname[:2]
