/* Copyright 2022 Camptocamp
   License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl). */

odoo.define('point_of_sale.CustomOrderWidget', function(require) {
'use strict';
    const Registries = require('point_of_sale.Registries');
    const OrderWidget = require('point_of_sale.OrderWidget');
    const CustomOrderWidget = (OrderWidget) => class extends OrderWidget{
            async _editPackLotLines(event) {
                const orderline = event.detail.orderline;
                const isAllowOnlyOneLot = orderline.product.isAllowOnlyOneLot();
                const packLotLinesToEdit = orderline.getPackLotLinesToEdit(isAllowOnlyOneLot);
                const { confirmed, payload } = await this.showPopup('ProductLotPopup', {
                   title: this.env._t('Lot/Serial Number'),
                   'lot_data': orderline.product.get_product_lot(),
                   'selected_lot':packLotLinesToEdit && packLotLinesToEdit[0].text || '',
            });
                if (confirmed) {
                    // Segregate the old and new packlot lines
                    const modifiedPackLotLines = Object.fromEntries(
                        payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                    );
                    const newPackLotLines = payload.newArray
                        .filter(item => !item.id)
                        .map(item => ({ lot_name: item.text }));

                    orderline.setPackLotLines({ modifiedPackLotLines, newPackLotLines });
                }
                this.order.select_orderline(event.detail.orderline);
            };
        };
    Registries.Component.extend(OrderWidget, CustomOrderWidget)
    return OrderWidget
});