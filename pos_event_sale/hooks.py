# Copyright 2022 Moka Tourisme (https://www.mokatourisme.fr).
# @author Iván Todorovich <ivan.todorovich@gmail.com>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

import logging

from odoo import SUPERUSER_ID, api
from odoo.tools.sql import column_exists, create_column

_logger = logging.getLogger(__name__)


def pre_init_hook(cr):
    """Store currency_id in database for each existing pos_order_line"""
    if not column_exists(cr, "pos_order_line", "currency_id"):
        create_column(cr, "pos_order_line", "currency_id", "int4")
        cr.execute(
            """
        WITH pos_order_line_currency AS (
            SELECT
                pol.id AS id,
                COALESCE(aj.currency_id, rc.currency_id) AS currency_id
            FROM pos_order_line pol
            JOIN pos_order po ON pol.order_id = po.id
            JOIN pos_session ps ON po.session_id = ps.id
            JOIN pos_config pc ON ps.config_id = pc.id
            LEFT JOIN account_journal aj ON pc.journal_id = aj.id
            JOIN res_company rc ON pc.company_id = rc.id
        )
        UPDATE pos_order_line
        SET currency_id = pos_order_line_currency.currency_id
        FROM pos_order_line_currency
        WHERE pos_order_line.id = pos_order_line_currency.id
        """
        )


def post_init_hook(cr, __):
    """Set the Event Registration product available for POS"""
    env = api.Environment(cr, SUPERUSER_ID, {})
    product = env.ref("event_sale.product_product_event", raise_if_not_found=False)
    if product:
        product.available_in_pos = True
