odoo.define("pos_partner_pricelist_load_background.ProductScreen", function (require) {
    "use strict";

    const ProductScreen = require("point_of_sale.ProductScreen");
    const Registries = require("point_of_sale.Registries");

    const PosPartnerPricelistLoadBackgroundScreen = (ProductScreen) =>
        class extends ProductScreen {
            async onClickPartner() {
                await super.onClickPartner();
                if (this.partner && this.partner.property_product_pricelist) {
                    if (this.partner && this.partner.property_product_pricelist) {
                        // Block the UI while loading the partner pricelist
                        this.env.services.ui.block();
                        try {
                            await this.env.pos._loadPartnerPricelistBackground(
                                this.partner.id
                            );
                        } finally {
                            this.env.services.ui.unblock();
                        }
                    }
                }
            }
        };

    Registries.Component.extend(ProductScreen, PosPartnerPricelistLoadBackgroundScreen);
    return ProductScreen;
});
