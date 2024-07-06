# Copyright 2024 Camptocamp
# License AGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).

from odoo import fields, models


class ProductProduct(models.Model):
    _inherit = "product.product"

    pos_bypass_global_discount = fields.Boolean(
        string="Bypass Global Discount (POS)",
        help=(
            "If ticking, this product will not be taken "
            "into account when calculating the global discounts."
        ),
    )
