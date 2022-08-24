odoo.define('pos_lot_selection.LotProductScreen', function(require) {
'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const Registries = require('point_of_sale.Registries');

    const LotProductScreen = (ProductScreen) =>
          class extends ProductScreen {
            async _clickProduct(event) {
                if (!this.currentOrder) {
                    this.env.pos.add_new_order();
                }
                const product = event.detail;
                let price_extra = 0.0;
                let draftPackLotLines, weight, description, packLotLinesToEdit;
                if (this.env.pos.config.product_configurator && _.some(product.attribute_line_ids, (id) => id in this.env.pos.attributes_by_ptal_id)) {
                let attributes = _.map(product.attribute_line_ids, (id) => this.env.pos.attributes_by_ptal_id[id])
                                  .filter((attr) => attr !== undefined);
                let { confirmed, payload } = await this.showPopup('ProductConfiguratorPopup', {
                    product: product,
                    attributes: attributes,
                });

                if (confirmed) {
                    description = payload.selected_attributes.join(', ');
                    price_extra += payload.price_extra;
                } else {
                    return;
                }
            }
                if (['serial', 'lot'].includes(product.tracking) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                    var product_lot_data = product.get_product_lot()
                    if(Object.keys(product_lot_data).length){
                        const { confirmed, payload } = await this.showPopup('ProductLotPopup', {
                            'title': 'Lot/Serial',
                            'lot_data': product_lot_data,
                            'selected_lot': ''
                        })
                        if (confirmed) {
                            // Segregate the old and new packlot lines
                            const modifiedPackLotLines = Object.fromEntries(
                                payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                            );
                            const newPackLotLines = payload.newArray
                                .filter(item => !item.id)
                                .map(item => ({ lot_name: item.text }));

                            draftPackLotLines = { modifiedPackLotLines, newPackLotLines };
                        }else{
                            return;
                        }
                    }
                    else{
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t('No Lots available for this product.'),
                        });
                        return;
                    }
                }
                if (product.to_weight && this.env.pos.config.iface_electronic_scale) {
                // Show the ScaleScreen to weigh the product.
                if (this.isScaleAvailable) {
                    const { confirmed, payload } = await this.showTempScreen('ScaleScreen', {
                        product,
                    });
                    if (confirmed) {
                        weight = payload.weight;
                    } else {
                        // do not add the product;
                        return;
                    }
                } else {
                    await this._onScaleNotAvailable();
                }
            }
                this.currentOrder.add_product(product, {
                draftPackLotLines,
                description: description,
                price_extra: price_extra,
                quantity: weight,
            });
                NumberBuffer.reset();
            }
          }
    Registries.Component.extend(ProductScreen, LotProductScreen)
    return ProductScreen
});
