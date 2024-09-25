# Copyright 2024 Camptocamp
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import models


class POSSession(models.Model):
    _inherit = "pos.session"

    def get_pos_ui_partner_pricelist(self, partner_id):
        pricelist = (
            self.env["res.partner"].browse(partner_id).property_product_pricelist
        )
        return self.get_pos_ui_product_pricelist(
            {"search_params": {"domain": [["id", "in", [pricelist.id]]]}}
        )

    def get_pos_ui_product_pricelist(self, params):
        return self._get_pos_ui_product_pricelist(params)

    def get_pos_ui_pricelist_product_product(self, pricelist_id):
        product_ids = (
            self.env["product.pricelist.item"]
            .search([("pricelist_id", "=", pricelist_id)])
            .mapped("product_id")
            .ids
        )

        return self.get_pos_ui_product_product_by_params(
            {"domain": [["id", "in", product_ids]]}
        )
