# Copyright 2018 Tecnativa S.L. - David Vidal
# Copyright 2022 Camptocampt
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "POS Lot Selection",
    "version": "15.0.1.0.0",
    "category": "Point of Sale",
    "author": "Tecnativa," "Camptocamp," "Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/pos",
    "license": "AGPL-3",
    "depends": [
        "web",
        "point_of_sale",
    ],
    "qweb": ["static/src/xml/pos.xml"],
    'assets': {
        'point_of_sale.assets': [
            'pos_lot_selection/static/src/js/product_lot.js',
            'pos_lot_selection/static/src/js/product_screen.js',
            'pos_lot_selection/static/src/js/order_widget.js',
            'pos_lot_selection/static/src/js/product_lot_popup.js',
            'pos_lot_selection/static/src/css/pos.css',
        ]},
    "application": False,
    "installable": True,
}
