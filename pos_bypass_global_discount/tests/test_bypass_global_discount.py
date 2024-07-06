# Copyright 2024 Camptocamp (<https://www.camptocamp.com>).
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo.tests import tagged

from odoo.addons.base.tests.common import DISABLED_MAIL_CONTEXT
from odoo.addons.point_of_sale.tests.test_frontend import TestPointOfSaleHttpCommon


@tagged("post_install", "-at_install")
class TestPosBypassGlobalDiscount(TestPointOfSaleHttpCommon):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.env = cls.env["base"].with_context(**DISABLED_MAIL_CONTEXT).env

    def test_bypass_global_discount(self):

        self.discount_product = self.env["product.product"].create(
            {
                "name": "Discount Product",
                "type": "service",
                "list_price": 0,
                "available_in_pos": True,
                "taxes_id": False,
            }
        )
        self.main_pos_config.write(
            {
                "module_pos_discount": True,
                "discount_product_id": self.discount_product.id,
                "discount_pc": 10,
            }
        )
        self.product01 = self.env["product.product"].create(
            {
                "name": "Product 1",
                "type": "product",
                "list_price": 100,
                "available_in_pos": True,
                "pos_bypass_global_discount": True,
                "taxes_id": False,
            }
        )
        self.product02 = self.env["product.product"].create(
            {
                "name": "Product 2",
                "type": "product",
                "list_price": 100,
                "available_in_pos": True,
                "pos_bypass_global_discount": False,
                "taxes_id": False,
            }
        )
        self.main_pos_config.open_ui()
        self.start_tour(
            "/pos/web?config_id=%d" % self.main_pos_config.id,
            "PosBypassGlobalDiscount",
            login="accountman",
            watch=True,
        )
