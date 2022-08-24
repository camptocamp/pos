odoo.define('pos_lot_selection.product_lot', function (require) {
"use strict";
    const models = require('point_of_sale.models');
    const lot_fields = [
    'id','display_name','product_id','product_uom_id','quant_ids', 'product_qty'
    ]
    // Load the products used for creating program reward lines.
    var existing_models = models.PosModel.prototype.models;
    var product_index = _.findIndex(existing_models, function (model) {
        return model.model === 'product.product';
    });
    /**
     * This is to load all the availables lots with the quantity when the POS is loaded or refreshed.
     */
    var product_model = existing_models[product_index];
    models.load_models([
        {
            model: 'stock.production.lot',
            fields: lot_fields,
            domain: function (self) {
                return [['product_qty', '>', 0]];
            },
            loaded: function(self, lots){
                var lot_by_product_id = {}
                var db = self.db
                _.map(_.filter(lots, function(el, indx){return el.product_qty > 0}), function(lot, index){
                    var product_index = lot.product_id[0]
                    if(Object.keys(lot_by_product_id).indexOf(String(product_index)) != -1){
                        lot_by_product_id[product_index].push(lot)
                    }
                    else{
                        lot_by_product_id[product_index] = [lot]
                    }
                })
                _.extend(self.db, {'lot_by_product_id':lot_by_product_id})
            }
        }
    ]);


    models.Product = models.Product.extend({
        /**
         * This is to get product lot based on id.
         * 
        */
        get_product_lot: function(){
            return _.extend({}, posmodel.db.lot_by_product_id[this.id] && posmodel.db.lot_by_product_id[this.id] || {})
        }
    });

    var _orderline_super = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        /**
         * To Prepare orderline information with product lot for order reciept.
        */
        export_for_printing: function () {
            var self = this
            let result = _orderline_super.export_for_printing.apply(this, arguments);
            var pack_lot_lines_name = ''
            var order_line_product_lot = self.pack_lot_lines.models
            _.map(self.pack_lot_lines.models, function(el, index){
                 pack_lot_lines_name += el.attributes.lot_name + ' '
            });
            result.pack_product_lot = pack_lot_lines_name
            return result
        }
    });
});
