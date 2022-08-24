odoo.define('point_of_sale.ProductLotPopup', function(require) {
    'use strict';

    const { useState } = owl.hooks;
    const AbstractAwaitablePopup = require('point_of_sale.AbstractAwaitablePopup');
    const Registries = require('point_of_sale.Registries');
//    const { useAutoFocusToLast } = require('point_of_sale.custom_hooks');

    // formerly ConfirmPopupWidget
    class ProductLotPopup extends AbstractAwaitablePopup {
        constructor() {
            super(...arguments);
//            useAutoFocusToLast();
        }
        async confirm() {
            var lot_value = $('#product_lot_select').val()
            if(lot_value.length){
                this.props.resolve({ confirmed: true, payload: await this.getPayload() });
                this.trigger('close-popup');
            }
        }
        getPayload(){
            return{
                newArray:[Object.assign({},{'text':$('#product_lot_select').val()})]
            };
        }
    }
    ProductLotPopup.template = 'ProductLotPopup';
    ProductLotPopup.defaultProps = {
        confirmText: 'Ok',
        cancelText: 'Cancel',
        title: 'Lot/Serial',
        body: '',
    };

    Registries.Component.add(ProductLotPopup);

    return ProductLotPopup;
});
