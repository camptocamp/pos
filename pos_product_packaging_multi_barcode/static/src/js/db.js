odoo.define("pos_product_packaging_multi_barcode.db", function (require) {
    "use strict";

    var PosDB = require("point_of_sale.DB");

    PosDB.include({
        add_packagings: function (packagings) {
            var res = this._super(packagings);
            var self = this;
            packagings.forEach(function (packaging) {
                var barcodes = JSON.parse(packaging.barcodes_json);
                barcodes.forEach(function (barcode) {
                    self.product_packaging_by_barcode[barcode] = packaging;
                });
            });
            return res;
        },
    });
});
