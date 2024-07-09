# Copyright 2024 Camptocamp (https://www.camptocamp.com).
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import api, models
from odoo.osv import expression


class LoyaltyRule(models.Model):
    _inherit = "loyalty.rule"

    @api.depends("product_ids", "product_category_id", "product_tag_id")
    def _compute_valid_product_ids(self):
        super()._compute_valid_product_ids()
        # exclude product when no config in loyalty rule
        for rule in self:
            if not (
                rule.product_ids
                or rule.product_category_id
                or rule.product_tag_id
                or rule.product_domain not in ("[]", "[['sale_ok', '=', True]]")
            ):
                rule.any_product = False
                rule.valid_product_ids = self.env["product.product"].search(
                    [("loyalty_exclude", "=", False)]
                )
        return True

    def _get_valid_product_domain(self):
        domain = super()._get_valid_product_domain()
        domain = expression.AND([domain, [("loyalty_exclude", "=", False)]])
        return domain
