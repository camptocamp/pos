# Copyright 2024 Camptocamp
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).

from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    pos_bypass_global_discount = fields.Boolean(
        string="Bypass Global Discount (POS)",
        help=(
            "If ticking, this product will not be taken "
            "into account when calculating the global discounts."
        ),
        compute="_compute_pos_bypass_global_discount",
        inverse="_inverse_pos_bypass_global_discount",
    )

    @api.depends("product_variant_ids.pos_bypass_global_discount")
    def _compute_pos_bypass_global_discount(self):
        for template in self:
            template.pos_bypass_global_discount = False
            if len(template.product_variant_ids) == 1:
                template.pos_bypass_global_discount = (
                    template.product_variant_ids.pos_bypass_global_discount
                )

    def _inverse_pos_bypass_global_discount(self):
        if len(self.product_variant_ids) == 1:
            self.product_variant_ids.pos_bypass_global_discount = (
                self.pos_bypass_global_discount
            )
