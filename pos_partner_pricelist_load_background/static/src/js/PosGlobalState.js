odoo.define("pos_partner_pricelist_load_background.PosGlobalState", function (require) {
    "use strict";

    const {PosGlobalState} = require("point_of_sale.models");
    const Registries = require("point_of_sale.Registries");

    const PosPartnerPricelistLoadBackgroundSPosGlobalState = (PosGlobalState) =>
        class PosPartnerPricelistLoadBackgroundSPosGlobalState extends PosGlobalState {
            async getPartnerPricelists(partnerId) {
                return await this.env.services.rpc({
                    model: "pos.session",
                    method: "get_pos_ui_partner_pricelist",
                    args: [this.pos_session_id, partnerId],
                });
            }
            async _loadPartnerPricelistBackground(partnerId) {
                const partnerPricelists = await this.getPartnerPricelists(partnerId);
                const availablePricelistIds = Object.values(
                    this.env.pos.config.available_pricelist_ids
                );

                const partnerAvailablePricelists = [];
                for (const i in this.pricelists) {
                    if (availablePricelistIds.includes(this.pricelists[i].id)) {
                        partnerAvailablePricelists.push(
                            Object.assign({}, this.pricelists[i])
                        );
                    }
                }
                this.pricelists = this.pricelists.filter((p) =>
                    availablePricelistIds.includes(p.id)
                );
                for (const pricelist of partnerPricelists) {
                    if (!this.pricelists.find((p) => p.id === pricelist.id)) {
                        this.pricelists.push(pricelist);
                        const products = await this.env.services.rpc({
                            model: "pos.session",
                            method: "get_pos_ui_pricelist_product_product",
                            args: [this.pos_session_id, pricelist.id],
                        });
                        await this._loadMissingPricelistItems(products);
                    }
                }
            }
        };

    Registries.Model.extend(
        PosGlobalState,
        PosPartnerPricelistLoadBackgroundSPosGlobalState
    );
});
