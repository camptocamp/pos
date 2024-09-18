odoo.define("pos_product_pricelist_alternative.models", function (require) {
    "use strict";

    const {Product} = require("point_of_sale.models");
    const Registries = require("point_of_sale.Registries");

    const ProductPatch = (Product) =>
        class ProductPatch extends Product {
            /**  @override **/
            get_price(pricelist, quantity, price_extra, get_pricelist_rule = false) {
                const {price, pricelist_item} = super.get_price(
                    pricelist,
                    quantity,
                    price_extra,
                    true
                );
                var best_price = price;
                var best_price_item = pricelist_item;
                if (this.display_name.includes("ttt")) {
                    if (
                        pricelist_item.alternative_pricelist_policy ===
                        "use_lower_price"
                    ) {
                        for (const alternative_pricelist_id of pricelist.alternative_pricelist_ids) {
                            var alternative_pricelist = _.find(
                                this.pos.pricelists,
                                function (pricelist) {
                                    return pricelist.id === alternative_pricelist_id;
                                }
                            );
                            if (!alternative_pricelist) {
                                continue;
                            }
                            var alternative_price_rule = this.get_price(
                                alternative_pricelist,
                                quantity,
                                price_extra,
                                true
                            );
                            // Take the lower price
                            if (alternative_price_rule.price < best_price) {
                                best_price = alternative_price_rule.price;
                                best_price_item = alternative_price_rule.pricelist_item;
                            }
                        }
                    }
                }
                return get_pricelist_rule
                    ? {price: best_price, pricelist_item: best_price_item}
                    : best_price;
            }
        };
    Registries.Model.extend(Product, ProductPatch);
});
